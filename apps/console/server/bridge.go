// Aegis MCP bridge — accepts WS connections from browser sessions and
// from the local `aegis-console mcp` control client. Forwards tool calls
// from the control client to a target browser session and proxies the
// reply back. Maintains a lock file under ~/.aegis/ide/<port>.lock so
// the mcp subcommand can discover the running bridge without flags.
package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/coder/websocket"
)

const (
	bridgeWSPath           = "/aegis-bridge/ws"
	heartbeatInterval      = 15 * time.Second
	lockRefreshInterval    = 5 * time.Second
	browserCallTimeout     = 30 * time.Second
	defaultBridgeShellName = "AegisLab Console"
)

type bridgeOptions struct {
	enabled bool
	noAuth  bool
}

type session struct {
	ID           string `json:"sessionId"`
	URL          string `json:"url"`
	CurrentAppID string `json:"currentAppId"`
	Title        string `json:"title"`
	LastActivity int64  `json:"lastActivity"`
	conn         *websocket.Conn
	pending      map[string]chan replyEnvelope
	pendingMu    sync.Mutex
	cancel       context.CancelFunc
}

type replyEnvelope struct {
	Result json.RawMessage
	Err    *bridgeError
}

type bridgeError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type bridge struct {
	authToken string
	noAuth    bool
	port      int
	pid       int

	mu       sync.Mutex
	sessions map[string]*session
}

func newBridge(port int, noAuth bool) *bridge {
	tok, err := newToken()
	if err != nil {
		log.Fatalf("bridge: token: %v", err)
	}
	return &bridge{
		authToken: tok,
		noAuth:    noAuth,
		port:      port,
		pid:       os.Getpid(),
		sessions:  map[string]*session{},
	}
}

func newToken() (string, error) {
	var buf [16]byte
	if _, err := rand.Read(buf[:]); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf[:]), nil
}

func (b *bridge) checkAuth(r *http.Request) bool {
	if b.noAuth {
		return true
	}
	got := r.Header.Get("Authorization")
	expected := "Bearer " + b.authToken
	if got == expected {
		return true
	}
	if r.URL.Query().Get("token") == b.authToken {
		return true
	}
	return false
}

// handleBrowserWS handles a connection from a browser session.
func (b *bridge) handleBrowserWS(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns:     []string{"*"},
		InsecureSkipVerify: true, // local-only bridge
	})
	if err != nil {
		log.Printf("bridge: ws accept: %v", err)
		return
	}
	role := r.URL.Query().Get("as")
	if role == "mcp" {
		b.serveControl(conn)
		return
	}
	b.serveBrowser(conn)
}

func (b *bridge) serveBrowser(conn *websocket.Conn) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	defer conn.Close(websocket.StatusNormalClosure, "")

	// First message must be session.hello
	_, raw, err := conn.Read(ctx)
	if err != nil {
		return
	}
	var hello struct {
		Type         string `json:"type"`
		SessionID    string `json:"sessionId"`
		URL          string `json:"url"`
		CurrentAppID string `json:"currentAppId"`
		Title        string `json:"title"`
		AuthToken    string `json:"authToken"`
	}
	if err := json.Unmarshal(raw, &hello); err != nil || hello.Type != "session.hello" || hello.SessionID == "" {
		conn.Close(websocket.StatusPolicyViolation, "expected session.hello")
		return
	}
	if !b.noAuth && hello.AuthToken != b.authToken {
		conn.Close(websocket.StatusPolicyViolation, "auth")
		return
	}

	sess := &session{
		ID:           hello.SessionID,
		URL:          hello.URL,
		CurrentAppID: hello.CurrentAppID,
		Title:        hello.Title,
		LastActivity: time.Now().Unix(),
		conn:         conn,
		pending:      map[string]chan replyEnvelope{},
		cancel:       cancel,
	}
	b.mu.Lock()
	if existing, ok := b.sessions[sess.ID]; ok {
		existing.cancel()
	}
	b.sessions[sess.ID] = sess
	b.mu.Unlock()
	log.Printf("bridge: session up id=%s url=%s", sess.ID, sess.URL)

	defer func() {
		b.mu.Lock()
		if cur, ok := b.sessions[sess.ID]; ok && cur == sess {
			delete(b.sessions, sess.ID)
		}
		b.mu.Unlock()
		log.Printf("bridge: session down id=%s", sess.ID)
	}()

	// Heartbeat
	go func() {
		t := time.NewTicker(heartbeatInterval)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				if err := conn.Ping(ctx); err != nil {
					return
				}
			}
		}
	}()

	for {
		_, data, err := conn.Read(ctx)
		if err != nil {
			return
		}
		sess.LastActivity = time.Now().Unix()
		var env struct {
			Type   string          `json:"type"`
			ID     string          `json:"id"`
			Result json.RawMessage `json:"result"`
			Error  *bridgeError    `json:"error"`
		}
		if err := json.Unmarshal(data, &env); err != nil {
			continue
		}
		switch env.Type {
		case "tool.result", "tool.error":
			sess.pendingMu.Lock()
			ch, ok := sess.pending[env.ID]
			if ok {
				delete(sess.pending, env.ID)
			}
			sess.pendingMu.Unlock()
			if !ok {
				continue
			}
			rep := replyEnvelope{}
			if env.Type == "tool.error" {
				rep.Err = env.Error
				if rep.Err == nil {
					rep.Err = &bridgeError{Code: "thrown", Message: "unknown error"}
				}
			} else {
				rep.Result = env.Result
			}
			select {
			case ch <- rep:
			default:
			}
		}
	}
}

// callTool sends a tool.call to a browser session and waits for the reply.
func (b *bridge) callTool(sessionID, tool string, params json.RawMessage) (json.RawMessage, *bridgeError) {
	b.mu.Lock()
	sess, ok := b.sessions[sessionID]
	b.mu.Unlock()
	if !ok {
		return nil, &bridgeError{Code: "no_session", Message: "session not connected: " + sessionID}
	}
	id, err := newToken()
	if err != nil {
		return nil, &bridgeError{Code: "thrown", Message: err.Error()}
	}
	ch := make(chan replyEnvelope, 1)
	sess.pendingMu.Lock()
	sess.pending[id] = ch
	sess.pendingMu.Unlock()
	defer func() {
		sess.pendingMu.Lock()
		delete(sess.pending, id)
		sess.pendingMu.Unlock()
	}()

	msg := map[string]any{
		"type":   "tool.call",
		"id":     id,
		"tool":   tool,
		"params": json.RawMessage(params),
	}
	if len(params) == 0 {
		msg["params"] = map[string]any{}
	}
	body, err := json.Marshal(msg)
	if err != nil {
		return nil, &bridgeError{Code: "thrown", Message: err.Error()}
	}
	ctx, cancel := context.WithTimeout(context.Background(), browserCallTimeout)
	defer cancel()
	if err := sess.conn.Write(ctx, websocket.MessageText, body); err != nil {
		return nil, &bridgeError{Code: "thrown", Message: err.Error()}
	}
	select {
	case rep := <-ch:
		if rep.Err != nil {
			return nil, rep.Err
		}
		return rep.Result, nil
	case <-ctx.Done():
		return nil, &bridgeError{Code: "timeout", Message: "browser tool call timed out"}
	}
}

// serveControl handles a connection from the mcp subcommand.
func (b *bridge) serveControl(conn *websocket.Conn) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	defer conn.Close(websocket.StatusNormalClosure, "")

	for {
		_, data, err := conn.Read(ctx)
		if err != nil {
			return
		}
		var env struct {
			Type      string          `json:"type"`
			ID        string          `json:"id"`
			SessionID string          `json:"sessionId"`
			Tool      string          `json:"tool"`
			Params    json.RawMessage `json:"params"`
		}
		if err := json.Unmarshal(data, &env); err != nil {
			continue
		}
		switch env.Type {
		case "control.sessions.list":
			b.mu.Lock()
			out := make([]session, 0, len(b.sessions))
			for _, s := range b.sessions {
				out = append(out, session{
					ID:           s.ID,
					URL:          s.URL,
					CurrentAppID: s.CurrentAppID,
					Title:        s.Title,
					LastActivity: s.LastActivity,
				})
			}
			b.mu.Unlock()
			body, _ := json.Marshal(map[string]any{
				"type":     "control.sessions",
				"sessions": out,
			})
			_ = conn.Write(ctx, websocket.MessageText, body)
		case "control.tool.call":
			sessID := env.SessionID
			if sessID == "" {
				sessID = b.pickRecentSession()
			}
			result, callErr := b.callTool(sessID, env.Tool, env.Params)
			if callErr != nil {
				body, _ := json.Marshal(map[string]any{
					"type":  "control.tool.error",
					"id":    env.ID,
					"error": callErr,
				})
				_ = conn.Write(ctx, websocket.MessageText, body)
			} else {
				body, _ := json.Marshal(map[string]any{
					"type":   "control.tool.result",
					"id":     env.ID,
					"result": json.RawMessage(result),
				})
				_ = conn.Write(ctx, websocket.MessageText, body)
			}
		}
	}
}

func (b *bridge) pickRecentSession() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	var best *session
	for _, s := range b.sessions {
		if best == nil || s.LastActivity > best.LastActivity {
			best = s
		}
	}
	if best == nil {
		return ""
	}
	return best.ID
}

func (b *bridge) snapshotSessions() []session {
	b.mu.Lock()
	defer b.mu.Unlock()
	out := make([]session, 0, len(b.sessions))
	for _, s := range b.sessions {
		out = append(out, session{
			ID:           s.ID,
			URL:          s.URL,
			CurrentAppID: s.CurrentAppID,
			Title:        s.Title,
			LastActivity: s.LastActivity,
		})
	}
	return out
}

type lockFile struct {
	Port         int       `json:"port"`
	AuthToken    string    `json:"authToken"`
	Version      string    `json:"version"`
	ShellName    string    `json:"shellName"`
	PID          int       `json:"pid"`
	Transport    string    `json:"transport"`
	WSPath       string    `json:"wsPath"`
	Sessions     []session `json:"sessions"`
	LastActivity int64     `json:"lastActivity"`
}

func aegisIdeDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ".aegis/ide"
	}
	return filepath.Join(home, ".aegis", "ide")
}

func (b *bridge) lockPath() string {
	return filepath.Join(aegisIdeDir(), fmt.Sprintf("%d.lock", b.port))
}

func (b *bridge) writeLock() error {
	if err := os.MkdirAll(aegisIdeDir(), 0o755); err != nil {
		return err
	}
	lf := lockFile{
		Port:         b.port,
		AuthToken:    b.authToken,
		Version:      version,
		ShellName:    defaultBridgeShellName,
		PID:          b.pid,
		Transport:    "ws",
		WSPath:       bridgeWSPath,
		Sessions:     b.snapshotSessions(),
		LastActivity: time.Now().Unix(),
	}
	body, err := json.MarshalIndent(lf, "", "  ")
	if err != nil {
		return err
	}
	tmp := b.lockPath() + ".tmp"
	if err := os.WriteFile(tmp, body, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, b.lockPath())
}

func (b *bridge) startLockWriter(ctx context.Context) {
	go func() {
		t := time.NewTicker(lockRefreshInterval)
		defer t.Stop()
		if err := b.writeLock(); err != nil {
			log.Printf("bridge: lock write: %v", err)
		}
		for {
			select {
			case <-ctx.Done():
				_ = os.Remove(b.lockPath())
				return
			case <-t.C:
				if err := b.writeLock(); err != nil {
					log.Printf("bridge: lock write: %v", err)
				}
			}
		}
	}()
}

// loadLockFile reads and parses a lock file from disk.
func loadLockFile(p string) (*lockFile, error) {
	data, err := os.ReadFile(p)
	if err != nil {
		return nil, err
	}
	var lf lockFile
	if err := json.Unmarshal(data, &lf); err != nil {
		return nil, err
	}
	return &lf, nil
}

// pickLockFile scans aegisIdeDir, prunes stale (pid not alive), returns
// the lock with the most recent lastActivity. Returns nil with no error
// if directory empty.
func pickLockFile() (*lockFile, string, error) {
	dir := aegisIdeDir()
	entries, err := os.ReadDir(dir)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, "", nil
		}
		return nil, "", err
	}
	var best *lockFile
	var bestPath string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		p := filepath.Join(dir, e.Name())
		lf, err := loadLockFile(p)
		if err != nil {
			continue
		}
		if !pidAlive(lf.PID) {
			_ = os.Remove(p)
			continue
		}
		if best == nil || lf.LastActivity > best.LastActivity {
			best = lf
			bestPath = p
		}
	}
	return best, bestPath, nil
}

func pidAlive(pid int) bool {
	if pid <= 0 {
		return false
	}
	proc, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	// Signal 0 is portable on unix; on windows FindProcess+nil-signal is best-effort.
	err = proc.Signal(syscall0)
	return err == nil
}
