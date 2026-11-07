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
// with result.
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
	reply, err := json.Marshal(map[string]any{"type": "tool.result", "id": call.ID, "result": result})
	if err != nil {
		return err
	}
	return conn.Write(ctx, websocket.MessageText, reply)
}

func jsonString(t *testing.T, n int) json.RawMessage {
	t.Helper()
	b, err := json.Marshal(strings.Repeat("x", n))
	if err != nil {
		t.Fatal(err)
	}
	return b
}

func TestToolResultOverDefaultReadLimitReachesControlClient(t *testing.T) {
	b := newBridge(0, false)
	lf := startBridge(t, b)
	browser := connectBrowser(t, b, lf, "tab-1")

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	conn, err := dialBridge(ctx, lf)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.CloseNow()
	cli := &controlClient{conn: conn, ctx: ctx, pending: map[string]chan controlReply{}}
	go cli.readLoop()

	want := jsonString(t, 4<<20)
	answered := make(chan error, 1)
	go func() { answered <- answerNextCall(ctx, browser, want) }()

	got, berr := cli.callTool("", "aegis_snapshot", nil)
	if berr != nil {
		t.Fatalf("callTool: [%s] %s", berr.Code, berr.Message)
	}
	if err := <-answered; err != nil {
		t.Fatalf("browser reply: %v", err)
	}
	if !bytes.Equal(got, want) {
		t.Fatalf("result has %d bytes, want %d", len(got), len(want))
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
				return answerNextCall(ctx, conn, jsonString(t, browserReadLimit))
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
