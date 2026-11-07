// `aegis-console mcp` subcommand — stdio JSON-RPC MCP server that
// forwards tool calls to a running aegis-console bridge over WebSocket.
package main

import (
	"bufio"
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/coder/websocket"
)

// Generated from packages/ui/src/transports/mcpTools.ts by the root
// scripts/emit-mcp-tools.mjs, which the console's bundle:prepare runs
// (or `pnpm gen:mcp-tools`); do NOT hand-edit.
//
//go:embed mcp_tools.generated.json
var mcpToolsJSON []byte

type mcpToolsFile struct {
	Generated bool             `json:"_generated"`
	Tools     []map[string]any `json:"tools"`
}

var (
	mcpToolsCache    []map[string]any
	mcpToolNamesSet  map[string]struct{}
	mcpToolsInitErr  error
	mcpToolsInitOnce sync.Once
)

func mcpToolsInit() {
	var f mcpToolsFile
	if err := json.Unmarshal(mcpToolsJSON, &f); err != nil {
		mcpToolsInitErr = fmt.Errorf("parse embedded mcp_tools.generated.json: %w", err)
		return
	}
	if !f.Generated {
		mcpToolsInitErr = errors.New("mcp_tools.generated.json: _generated marker missing or false — file may have been hand-edited")
		return
	}
	if len(f.Tools) == 0 {
		mcpToolsInitErr = errors.New("mcp_tools.generated.json: tools list is empty")
		return
	}
	mcpToolsCache = f.Tools
	mcpToolNamesSet = make(map[string]struct{}, len(f.Tools))
	for _, t := range f.Tools {
		name, _ := t["name"].(string)
		if name == "" {
			mcpToolsInitErr = errors.New("mcp_tools.generated.json: tool entry missing name")
			return
		}
		mcpToolNamesSet[name] = struct{}{}
	}
}

func mcpToolsLoad() ([]map[string]any, error) {
	mcpToolsInitOnce.Do(mcpToolsInit)
	if mcpToolsInitErr != nil {
		return nil, mcpToolsInitErr
	}
	return mcpToolsCache, nil
}

const mcpProtocolVersion = "2024-11-05"

type rpcRequest struct {
	Jsonrpc string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id,omitempty"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

type rpcResponse struct {
	Jsonrpc string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id,omitempty"`
	Result  any             `json:"result,omitempty"`
	Error   *rpcError       `json:"error,omitempty"`
}

type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

func runMcpSubcommand(args []string) error {
	fs := flag.NewFlagSet("mcp", flag.ExitOnError)
	var lockPath, sessionID string
	var listSessions bool
	fs.StringVar(&lockPath, "lock", "", "Lock file path (default: auto-pick newest from ~/.aegis/ide)")
	fs.StringVar(&sessionID, "session", "", "Browser session id (default: most recent on the picked bridge)")
	fs.BoolVar(&listSessions, "list-sessions", false, "Print sessions on the picked bridge and exit")
	if err := fs.Parse(args); err != nil {
		return err
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	cli := &controlClient{
		ctx: ctx,
		dial: func(ctx context.Context) (*websocket.Conn, error) {
			lf, err := findLockFile(lockPath)
			if err != nil {
				return nil, err
			}
			return dialBridge(ctx, lf)
		},
		pending: map[string]chan controlReply{},
	}
	// Connect now so a missing bridge fails at startup; later calls redial
	// on their own when the connection drops.
	if err := cli.connect(); err != nil {
		return err
	}
	defer cli.close()

	if listSessions {
		sessions, err := cli.listSessions()
		if err != nil {
			return err
		}
		body, _ := json.MarshalIndent(sessions, "", "  ")
		fmt.Fprintln(os.Stdout, string(body))
		return nil
	}

	// Without --session the ID stays empty and the bridge picks the most
	// recently active session on every call, so a reloaded or replaced
	// tab keeps working.
	srv := &mcpServer{
		client:    cli,
		sessionID: sessionID,
		out:       bufio.NewWriter(os.Stdout),
	}
	return srv.serve(os.Stdin)
}

// findLockFile reads the lock file at path, or the most recently active
// one in ~/.aegis/ide when path is empty.
func findLockFile(path string) (*lockFile, error) {
	if path != "" {
		lf, err := loadLockFile(path)
		if err != nil {
			return nil, fmt.Errorf("load lock %q: %w", path, err)
		}
		return lf, nil
	}
	lf, _, err := pickLockFile()
	if err != nil {
		return nil, fmt.Errorf("scan lock dir: %w", err)
	}
	if lf == nil {
		return nil, errors.New("no aegis-console bridge running (no lock file in ~/.aegis/ide)")
	}
	return lf, nil
}

func dialBridge(ctx context.Context, lf *lockFile) (*websocket.Conn, error) {
	bridgeURL := fmt.Sprintf("ws://127.0.0.1:%d%s?as=mcp&token=%s",
		lf.Port, lf.WSPath, lf.AuthToken)
	conn, _, err := websocket.Dial(ctx, bridgeURL, &websocket.DialOptions{
		HTTPHeader: http.Header{"Authorization": []string{"Bearer " + lf.AuthToken}},
	})
	if err != nil {
		return nil, fmt.Errorf("dial bridge: %w", err)
	}
	conn.SetReadLimit(controlReadLimit)
	return conn, nil
}

type controlReply struct {
	Result json.RawMessage
	Err    *bridgeError
}

// controlClient holds one control connection at a time. When it closes,
// the calls waiting on it fail with bridge_closed and the next call dials
// again; dial re-reads the lock file, so a restarted console, which has a
// new control token, is picked up.
type controlClient struct {
	ctx  context.Context
	dial func(context.Context) (*websocket.Conn, error)

	mu        sync.Mutex
	conn      *websocket.Conn
	pending   map[string]chan controlReply
	sessionsC chan []session
}

func (c *controlClient) connect() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	_, err := c.connLocked()
	return err
}

func (c *controlClient) connLocked() (*websocket.Conn, error) {
	if c.conn != nil {
		return c.conn, nil
	}
	conn, err := c.dial(c.ctx)
	if err != nil {
		return nil, err
	}
	c.conn = conn
	go c.readLoop(conn)
	return conn, nil
}

func (c *controlClient) close() {
	c.mu.Lock()
	conn := c.conn
	c.mu.Unlock()
	if conn != nil {
		_ = conn.Close(websocket.StatusNormalClosure, "")
	}
}

func (c *controlClient) readLoop(conn *websocket.Conn) {
	for {
		_, data, err := conn.Read(c.ctx)
		if err != nil {
			_ = conn.CloseNow()
			closed := &bridgeError{
				Code:    "bridge_closed",
				Message: "the connection to the aegis-console bridge closed: " + err.Error(),
			}
			c.mu.Lock()
			if c.conn == conn {
				c.conn = nil
			}
			for id, ch := range c.pending {
				delete(c.pending, id)
				select {
				case ch <- controlReply{Err: closed}:
				default:
				}
			}
			if c.sessionsC != nil {
				close(c.sessionsC)
				c.sessionsC = nil
			}
			c.mu.Unlock()
			return
		}
		var env struct {
			Type     string          `json:"type"`
			ID       string          `json:"id"`
			Result   json.RawMessage `json:"result"`
			Error    *bridgeError    `json:"error"`
			Sessions []session       `json:"sessions"`
		}
		if err := json.Unmarshal(data, &env); err != nil {
			continue
		}
		switch env.Type {
		case "control.tool.result", "control.tool.error":
			c.mu.Lock()
			ch, ok := c.pending[env.ID]
			if ok {
				delete(c.pending, env.ID)
			}
			c.mu.Unlock()
			if !ok {
				continue
			}
			rep := controlReply{}
			if env.Type == "control.tool.error" {
				rep.Err = env.Error
				if rep.Err == nil {
					rep.Err = &bridgeError{Code: "thrown", Message: "unknown"}
				}
			} else {
				rep.Result = env.Result
			}
			ch <- rep
		case "control.sessions":
			c.mu.Lock()
			ch := c.sessionsC
			c.sessionsC = nil
			c.mu.Unlock()
			if ch != nil {
				ch <- env.Sessions
				close(ch)
			}
		}
	}
}

func (c *controlClient) listSessions() ([]session, error) {
	ch := make(chan []session, 1)
	c.mu.Lock()
	conn, err := c.connLocked()
	if err != nil {
		c.mu.Unlock()
		return nil, err
	}
	c.sessionsC = ch
	c.mu.Unlock()
	body, _ := json.Marshal(map[string]any{"type": "control.sessions.list"})
	if err := conn.Write(c.ctx, websocket.MessageText, body); err != nil {
		return nil, err
	}
	select {
	case s, ok := <-ch:
		if !ok {
			return nil, errors.New("bridge closed before sessions reply")
		}
		return s, nil
	case <-time.After(5 * time.Second):
		return nil, errors.New("timeout listing sessions")
	}
}

func (c *controlClient) callTool(sessionID, tool string, params json.RawMessage) (json.RawMessage, *bridgeError) {
	id := fmt.Sprintf("rpc-%d", time.Now().UnixNano())
	ch := make(chan controlReply, 1)
	c.mu.Lock()
	conn, err := c.connLocked()
	if err != nil {
		c.mu.Unlock()
		return nil, &bridgeError{Code: "bridge_unavailable", Message: err.Error()}
	}
	c.pending[id] = ch
	c.mu.Unlock()
	defer func() {
		c.mu.Lock()
		delete(c.pending, id)
		c.mu.Unlock()
	}()
	msg := map[string]any{
		"type":      "control.tool.call",
		"id":        id,
		"sessionId": sessionID,
		"tool":      tool,
		"params":    params,
	}
	if len(params) == 0 {
		msg["params"] = map[string]any{}
	}
	body, err := marshalControl(msg)
	if err != nil {
		return nil, &bridgeError{Code: "thrown", Message: err.Error()}
	}
	if err := conn.Write(c.ctx, websocket.MessageText, body); err != nil {
		return nil, &bridgeError{Code: "bridge_closed", Message: "write to the aegis-console bridge: " + err.Error()}
	}
	select {
	case rep := <-ch:
		if rep.Err != nil {
			return nil, rep.Err
		}
		return rep.Result, nil
	case <-time.After(browserCallTimeout + 5*time.Second):
		return nil, &bridgeError{Code: "timeout", Message: "control call timed out"}
	}
}

type mcpServer struct {
	client    *controlClient
	sessionID string
	out       *bufio.Writer
	outMu     sync.Mutex
}

func (s *mcpServer) serve(stdin *os.File) error {
	scanner := bufio.NewScanner(stdin)
	scanner.Buffer(make([]byte, 0, 64*1024), 16*1024*1024)
	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}
		var req rpcRequest
		if err := json.Unmarshal(line, &req); err != nil {
			s.writeErr(nil, -32700, "parse error: "+err.Error())
			continue
		}
		s.handle(&req)
	}
	return scanner.Err()
}

func (s *mcpServer) writeMsg(v any) {
	body, err := json.Marshal(v)
	if err != nil {
		return
	}
	s.outMu.Lock()
	defer s.outMu.Unlock()
	_, _ = s.out.Write(body)
	_, _ = s.out.WriteString("\n")
	_ = s.out.Flush()
}

func (s *mcpServer) writeErr(id json.RawMessage, code int, msg string) {
	s.writeMsg(rpcResponse{
		Jsonrpc: "2.0",
		ID:      id,
		Error:   &rpcError{Code: code, Message: msg},
	})
}

func (s *mcpServer) handle(req *rpcRequest) {
	switch req.Method {
	case "initialize":
		s.writeMsg(rpcResponse{
			Jsonrpc: "2.0",
			ID:      req.ID,
			Result: map[string]any{
				"protocolVersion": mcpProtocolVersion,
				"capabilities":    map[string]any{"tools": map[string]any{}},
				"serverInfo": map[string]any{
					"name":    "aegis-console",
					"version": version,
				},
			},
		})
	case "notifications/initialized":
		// no response — it's a notification
	case "tools/list":
		tools, err := mcpToolsLoad()
		if err != nil {
			s.writeErr(req.ID, -32603, err.Error())
			return
		}
		s.writeMsg(rpcResponse{
			Jsonrpc: "2.0",
			ID:      req.ID,
			Result: map[string]any{
				"tools": tools,
			},
		})
	case "tools/call":
		s.handleToolCall(req)
	case "ping":
		s.writeMsg(rpcResponse{Jsonrpc: "2.0", ID: req.ID, Result: map[string]any{}})
	default:
		if req.ID != nil {
			s.writeErr(req.ID, -32601, "method not found: "+req.Method)
		}
	}
}

func (s *mcpServer) handleToolCall(req *rpcRequest) {
	var p struct {
		Name      string          `json:"name"`
		Arguments json.RawMessage `json:"arguments"`
	}
	if err := json.Unmarshal(req.Params, &p); err != nil {
		s.writeErr(req.ID, -32602, "invalid params: "+err.Error())
		return
	}
	if !validToolName(p.Name) {
		s.writeMsg(rpcResponse{
			Jsonrpc: "2.0",
			ID:      req.ID,
			Result: map[string]any{
				"isError": true,
				"content": []map[string]any{{
					"type": "text",
					"text": "unknown tool: " + p.Name,
				}},
			},
		})
		return
	}
	result, callErr := s.client.callTool(s.sessionID, p.Name, p.Arguments)
	if callErr != nil {
		s.writeMsg(rpcResponse{
			Jsonrpc: "2.0",
			ID:      req.ID,
			Result: map[string]any{
				"isError": true,
				"content": []map[string]any{{
					"type": "text",
					"text": fmt.Sprintf("[%s] %s", callErr.Code, callErr.Message),
				}},
			},
		})
		return
	}
	s.writeMsg(rpcResponse{
		Jsonrpc: "2.0",
		ID:      req.ID,
		Result: map[string]any{
			"content": []map[string]any{{
				"type": "text",
				"text": string(result),
			}},
		},
	})
}

func validToolName(name string) bool {
	if _, err := mcpToolsLoad(); err != nil {
		return false
	}
	_, ok := mcpToolNamesSet[name]
	return ok
}
