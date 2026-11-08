package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/coder/websocket"
)

// startBridge serves b on a loopback test server and returns the lock
// file the mcp subcommand would read for it.
func startBridge(t *testing.T, b *bridge) *lockFile {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(b.handleBrowserWS))
	t.Cleanup(srv.Close)
	u, err := url.Parse(srv.URL)
	if err != nil {
		t.Fatal(err)
	}
	port, err := strconv.Atoi(u.Port())
	if err != nil {
		t.Fatal(err)
	}
	return &lockFile{Port: port, WSPath: bridgeWSPath, AuthToken: b.controlToken}
}

func connectBrowser(t *testing.T, b *bridge, lf *lockFile, id string) *websocket.Conn {
	t.Helper()
	ctx := context.Background()
	conn, _, err := websocket.Dial(ctx, fmt.Sprintf("ws://127.0.0.1:%d%s", lf.Port, lf.WSPath), nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = conn.CloseNow() })
	hello, err := json.Marshal(map[string]string{
		"type":      "session.hello",
		"sessionId": id,
		"authToken": b.browserToken,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := conn.Write(ctx, websocket.MessageText, hello); err != nil {
		t.Fatal(err)
	}
	for deadline := time.Now().Add(5 * time.Second); time.Now().Before(deadline); time.Sleep(5 * time.Millisecond) {
		b.mu.Lock()
		_, ok := b.sessions[id]
		b.mu.Unlock()
		if ok {
			return conn
		}
	}
	t.Fatalf("session %s never registered", id)
	return nil
}

// answerNextCall reads one tool.call from the browser side and replies
// with result, unescaped, as the browser's JSON.stringify sends it.
func answerNextCall(ctx context.Context, conn *websocket.Conn, result json.RawMessage) error {
	_, data, err := conn.Read(ctx)
	if err != nil {
		return err
	}
	var call struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(data, &call); err != nil {
		return err
	}
	reply := fmt.Sprintf(`{"type":"tool.result","id":%q,"result":%s}`, call.ID, result)
	return conn.Write(ctx, websocket.MessageText, []byte(reply))
}

// jsonString is a JSON string of n bytes of content; with ampEvery > 0,
// every ampEvery-th byte is a raw '&'.
func jsonString(n, ampEvery int) json.RawMessage {
	b := make([]byte, 0, n+2)
	b = append(b, '"')
	for i := 0; i < n; i++ {
		if ampEvery > 0 && i%ampEvery == 0 {
			b = append(b, '&')
		} else {
			b = append(b, 'x')
		}
	}
	return append(b, '"')
}

func newTestControlClient(t *testing.T, ctx context.Context, lf *lockFile, dials *atomic.Int32) *controlClient {
	t.Helper()
	cli := &controlClient{
		ctx: ctx,
		dial: func(ctx context.Context) (*websocket.Conn, error) {
			dials.Add(1)
			return dialBridge(ctx, lf)
		},
		pending: map[string]chan controlReply{},
	}
	t.Cleanup(cli.close)
	return cli
}

func TestToolResultOverDefaultReadLimitReachesControlClient(t *testing.T) {
	cases := []struct {
		name   string
		result json.RawMessage
	}{
		{"4 MiB", jsonString(4<<20, 0)},
		// json.Marshal would grow each & to &, past controlReadLimit.
		{"12 MiB, 10% ampersands", jsonString(12<<20, 10)},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			b := newBridge(0, false)
			lf := startBridge(t, b)
			browser := connectBrowser(t, b, lf, "tab-1")
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			cli := newTestControlClient(t, ctx, lf, &atomic.Int32{})

			answered := make(chan error, 1)
			go func() { answered <- answerNextCall(ctx, browser, tc.result) }()

			got, berr := cli.callTool("", "aegis_snapshot", nil)
			if berr != nil {
				t.Fatalf("callTool: [%s] %s", berr.Code, berr.Message)
			}
			if err := <-answered; err != nil {
				t.Fatalf("browser reply: %v", err)
			}
			if !bytes.Equal(got, tc.result) {
				t.Fatalf("result has %d bytes, want the %d the browser sent", len(got), len(tc.result))
			}
		})
	}
}

func TestControlClientReportsCloseAndRedials(t *testing.T) {
	b := newBridge(0, false)
	lf := startBridge(t, b)
	browser := connectBrowser(t, b, lf, "tab-1")
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	var dials atomic.Int32
	cli := newTestControlClient(t, ctx, lf, &dials)
	if err := cli.connect(); err != nil {
		t.Fatal(err)
	}

	// The browser never answers this call; the control connection drops
	// while it waits.
	go func() {
		if _, _, err := browser.Read(ctx); err != nil {
			return
		}
		cli.mu.Lock()
		conn := cli.conn
		cli.mu.Unlock()
		_ = conn.CloseNow()
	}()
	start := time.Now()
	_, berr := cli.callTool("", "aegis_snapshot", nil)
	if berr == nil || berr.Code != "bridge_closed" {
		t.Fatalf("call during the drop: got %+v, want bridge_closed", berr)
	}
	if elapsed := time.Since(start); elapsed > 5*time.Second {
		t.Fatalf("drop reported after %v, want at once", elapsed)
	}

	want := jsonString(16, 0)
	answered := make(chan error, 1)
	go func() { answered <- answerNextCall(ctx, browser, want) }()
	got, berr := cli.callTool("", "aegis_snapshot", nil)
	if berr != nil {
		t.Fatalf("call after the drop: [%s] %s", berr.Code, berr.Message)
	}
	if err := <-answered; err != nil {
		t.Fatalf("browser reply: %v", err)
	}
	if !bytes.Equal(got, want) {
		t.Fatalf("result %s, want %s", got, want)
	}
	if n := dials.Load(); n != 2 {
		t.Fatalf("dialed %d times, want 2", n)
	}
}

func TestPendingCallFailsWhenSessionCloses(t *testing.T) {
	cases := []struct {
		name    string
		browser func(ctx context.Context, conn *websocket.Conn) error
		wantMsg string
	}{
		{
			name: "connection drops",
			browser: func(ctx context.Context, conn *websocket.Conn) error {
				if _, _, err := conn.Read(ctx); err != nil {
					return err
				}
				return conn.CloseNow()
			},
			wantMsg: "closed before replying",
		},
		{
			name: "reply over the message limit",
			browser: func(ctx context.Context, conn *websocket.Conn) error {
				return answerNextCall(ctx, conn, jsonString(browserReadLimit, 0))
			},
			wantMsg: "message limit",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			b := newBridge(0, false)
			lf := startBridge(t, b)
			browser := connectBrowser(t, b, lf, "tab-1")
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			// The browser side errors once the bridge drops it; that is the
			// point of the case, so its error is not checked.
			go func() { _ = tc.browser(ctx, browser) }()

			start := time.Now()
			_, berr := b.callTool("tab-1", "aegis_snapshot", nil)
			elapsed := time.Since(start)
			if berr == nil {
				t.Fatal("callTool succeeded, want session_closed")
			}
			if berr.Code != "session_closed" || !strings.Contains(berr.Message, tc.wantMsg) {
				t.Fatalf("got [%s] %s, want session_closed mentioning %q", berr.Code, berr.Message, tc.wantMsg)
			}
			if elapsed > 5*time.Second {
				t.Fatalf("failed after %v, want well before the %v call timeout", elapsed, browserCallTimeout)
			}
		})
	}
}
