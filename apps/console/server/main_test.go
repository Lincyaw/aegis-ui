package main

import (
	"context"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
	"time"
)

func TestHostAllowlist(t *testing.T) {
	br := newBridge(0, false)
	cfg := config{Host: "0.0.0.0", AllowedHosts: []string{"Console.Example.com"}}
	h, err := newHandler(cfg, br, fstest.MapFS{"index.html": {Data: []byte("<!doctype html>")}})
	if err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		host string
		want int
	}{
		{"127.0.0.1:3323", http.StatusOK},
		{"localhost:3323", http.StatusOK},
		{"[::1]:3323", http.StatusOK},
		{"192.168.1.20:3323", http.StatusOK},
		{"tab.localhost:3323", http.StatusOK},
		{"console.example.com", http.StatusOK},
		{"console.example.com.:443", http.StatusOK},
		{"attacker.example:3323", http.StatusForbidden},
		{"localhost.attacker.example", http.StatusForbidden},
		{"", http.StatusForbidden},
	}
	for _, tc := range cases {
		req := httptest.NewRequest(http.MethodGet, "/config.js", nil)
		req.Host = tc.host
		req.Header.Set("Sec-Fetch-Site", "same-origin")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != tc.want {
			t.Errorf("Host %q: status %d, want %d", tc.host, rec.Code, tc.want)
		}
		if tc.want == http.StatusForbidden && strings.Contains(rec.Body.String(), br.browserToken) {
			t.Errorf("Host %q: response carries the bridge token", tc.host)
		}
	}
}

func TestCheckClickhouseExposure(t *testing.T) {
	cases := []struct {
		name    string
		cfg     config
		wantErr bool
	}{
		{"loopback with credentials", config{Host: "127.0.0.1", Clickhouse: "http://ch:8123", ClickhouseUser: "u"}, false},
		{"localhost with credentials", config{Host: "localhost", Clickhouse: "http://ch:8123", ClickhousePassword: "p"}, false},
		{"lan without credentials", config{Host: "0.0.0.0", Clickhouse: "http://ch:8123"}, false},
		{"lan with credentials", config{Host: "0.0.0.0", Clickhouse: "http://ch:8123", ClickhouseUser: "u"}, true},
		{"all interfaces with credentials", config{Host: "", Clickhouse: "http://ch:8123", ClickhousePassword: "p"}, true},
		{"lan with credentials, opted in", config{Host: "0.0.0.0", Clickhouse: "http://ch:8123", ClickhouseUser: "u", ClickhouseAllowRemote: true}, false},
	}
	for _, tc := range cases {
		if err := checkClickhouseExposure(tc.cfg); (err != nil) != tc.wantErr {
			t.Errorf("%s: err = %v, wantErr %t", tc.name, err, tc.wantErr)
		}
	}
}

func TestShutdownDrainsRequestsAndEndsStreams(t *testing.T) {
	started := make(chan struct{}, 2)
	slowFinished := make(chan struct{})
	h := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/stream" {
			w.Header().Set("Content-Type", "text/event-stream")
			w.WriteHeader(http.StatusOK)
			w.(http.Flusher).Flush()
			started <- struct{}{}
			<-r.Context().Done()
			return
		}
		started <- struct{}{}
		time.Sleep(500 * time.Millisecond)
		_, _ = w.Write([]byte("done"))
		close(slowFinished)
	})
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	base := "http://" + ln.Addr().String()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	runErr := make(chan error, 1)
	go func() { runErr <- run(ctx, newServer(h), ln) }()

	go func() {
		req, err := http.NewRequest(http.MethodGet, base+"/stream", nil)
		if err != nil {
			return
		}
		req.Header.Set("Accept", "text/event-stream")
		if resp, err := http.DefaultClient.Do(req); err == nil {
			_, _ = io.Copy(io.Discard, resp.Body)
			_ = resp.Body.Close()
		}
	}()
	type result struct {
		body string
		err  error
	}
	slow := make(chan result, 1)
	go func() {
		resp, err := http.Get(base + "/slow")
		if err != nil {
			slow <- result{err: err}
			return
		}
		defer resp.Body.Close()
		body, err := io.ReadAll(resp.Body)
		slow <- result{string(body), err}
	}()
	<-started
	<-started

	start := time.Now()
	cancel()
	select {
	case err := <-runErr:
		if err != nil {
			t.Fatalf("run: %v", err)
		}
	case <-time.After(shutdownTimeout):
		t.Fatal("run did not return; the event stream held up shutdown")
	}
	select {
	case <-slowFinished:
	default:
		t.Fatal("run returned before the request in flight finished")
	}
	if elapsed := time.Since(start); elapsed > 3*time.Second {
		t.Fatalf("shutdown took %v; the event stream should end when it begins", elapsed)
	}
	if res := <-slow; res.err != nil || res.body != "done" {
		t.Fatalf("request in flight got body %q, err %v; want %q", res.body, res.err, "done")
	}
}
