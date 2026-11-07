// aegis-console — single-binary local viewer for AegisLab trajectories
// + console. Embeds the SPA via go:embed and reverse-proxies the gateway
// + ClickHouse so the browser never sees a cross-origin call.
//
// The dist/ directory it embeds is a build artifact: the bundle script
// copies apps/console/dist into apps/console/server/dist before invoking
// go build. The directory is empty in source control.

package main

import (
	"bytes"
	"context"
	"embed"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/exec"
	"os/signal"
	"path"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"
)

//go:embed all:dist
var distFS embed.FS

// Replaced via -ldflags="-X main.version=..." at build time.
var version = "dev"

type config struct {
	Port                  int      `json:"port"`
	Host                  string   `json:"host"`
	AllowedHosts          []string `json:"allowedHosts"`
	Gateway               string   `json:"gateway"`
	Clickhouse            string   `json:"clickhouse"`
	ClickhouseDB          string   `json:"clickhouseDb"`
	ClickhouseTable       string   `json:"clickhouseTable"`
	ClickhouseLogsTable   string   `json:"clickhouseLogsTable"`
	ClickhouseUser        string   `json:"clickhouseUser"`
	ClickhousePassword    string   `json:"clickhousePassword"`
	ClickhouseAllowRemote bool     `json:"clickhouseAllowRemote"`
	SsoOrigin             string   `json:"ssoOrigin"`
	SsoClientID           string   `json:"ssoClientId"`
	SsoScope              string   `json:"ssoScope"`
	Open                  bool     `json:"open"`
	Bridge                bool     `json:"bridge"`
	BridgeNoAuth          bool     `json:"bridgeNoAuth"`
}

type stringList []string

func (l *stringList) String() string { return strings.Join(*l, ",") }

func (l *stringList) Set(v string) error {
	*l = append(*l, v)
	return nil
}

func main() {
	if len(os.Args) > 1 && os.Args[1] == "mcp" {
		if err := runMcpSubcommand(os.Args[2:]); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}
	cfg := config{
		Port:                3323,
		Host:                "127.0.0.1",
		Clickhouse:          "http://127.0.0.1:8123",
		ClickhouseDB:        "otel",
		ClickhouseTable:     "otel_traces",
		ClickhouseLogsTable: "otel_logs",
		SsoClientID:         "aegis-console",
		SsoScope:            "openid profile email",
	}

	var configFile string
	var showVersion, showHelp bool

	flag.IntVar(&cfg.Port, "port", cfg.Port, "Port to listen on")
	flag.StringVar(&cfg.Host, "host", cfg.Host, "Bind address (use 0.0.0.0 for LAN)")
	flag.Var((*stringList)(&cfg.AllowedHosts), "allowed-host", "Also accept requests addressed to this host name (repeatable)")
	flag.StringVar(&cfg.Gateway, "gateway", "", "Remote AegisLab gateway URL (empty disables /api proxy)")
	flag.StringVar(&cfg.Clickhouse, "clickhouse", cfg.Clickhouse, "ClickHouse HTTP endpoint")
	flag.StringVar(&cfg.ClickhouseDB, "clickhouse-db", cfg.ClickhouseDB, "ClickHouse database")
	flag.StringVar(&cfg.ClickhouseTable, "clickhouse-table", cfg.ClickhouseTable, "Traces table")
	flag.StringVar(&cfg.ClickhouseLogsTable, "clickhouse-logs-table", cfg.ClickhouseLogsTable, "Logs table")
	flag.StringVar(&cfg.ClickhouseUser, "clickhouse-user", "", "Optional CH user")
	flag.StringVar(&cfg.ClickhousePassword, "clickhouse-password", "", "Optional CH password")
	flag.BoolVar(&cfg.ClickhouseAllowRemote, "clickhouse-allow-remote", false, "Serve the ClickHouse proxy with credentials on a non-loopback --host")
	flag.StringVar(&cfg.SsoOrigin, "sso-origin", "", "SSO origin (default same as --gateway)")
	flag.StringVar(&cfg.SsoClientID, "sso-client-id", cfg.SsoClientID, "OIDC client_id")
	flag.StringVar(&cfg.SsoScope, "sso-scope", cfg.SsoScope, "OIDC scope")
	flag.StringVar(&configFile, "config", "", "Load JSON config (CLI flags override file values)")
	flag.BoolVar(&cfg.Open, "open", false, "Open the browser after starting")
	flag.BoolVar(&cfg.Bridge, "bridge", false, "Enable the MCP bridge (lock file + /aegis-bridge/ws)")
	flag.BoolVar(&cfg.BridgeNoAuth, "bridge-no-auth", false, "Skip bridge auth check (dev only)")
	flag.BoolVar(&showVersion, "version", false, "Show version and exit")
	flag.BoolVar(&showVersion, "v", false, "Show version and exit (shorthand)")
	flag.BoolVar(&showHelp, "help", false, "Show help and exit")
	flag.BoolVar(&showHelp, "h", false, "Show help and exit (shorthand)")

	flag.Usage = func() {
		fmt.Fprint(os.Stderr, helpText)
	}
	flag.Parse()

	if showVersion {
		fmt.Println(version)
		return
	}
	if showHelp {
		flag.Usage()
		return
	}

	if configFile != "" {
		if err := loadConfigFile(configFile, &cfg); err != nil {
			log.Fatalf("config: %v", err)
		}
		// Re-parse so CLI flags override the file.
		flag.Parse()
	}

	cfg.Gateway = strings.TrimRight(cfg.Gateway, "/")
	cfg.Clickhouse = strings.TrimRight(cfg.Clickhouse, "/")
	cfg.SsoOrigin = strings.TrimRight(cfg.SsoOrigin, "/")

	if err := serve(cfg); err != nil {
		log.Fatal(err)
	}
}

const helpText = `aegis-console ` + `— local viewer for AegisLab trajectories + console

Usage:
  aegis-console [flags]
  aegis-console mcp [--lock <file>] [--session <id>] [--list-sessions]

Flags:
  --port <n>                Port to listen on (default 3323)
  --host <addr>             Bind address (default 127.0.0.1; use 0.0.0.0 for LAN)
  --allowed-host <name>     Also accept requests addressed to this host name, e.g.
                            the name of a proxy in front (repeatable)
  --gateway <url>           Remote AegisLab gateway URL (empty disables /api proxy)
  --clickhouse <url>        ClickHouse HTTP endpoint (default http://127.0.0.1:8123)
  --clickhouse-db <name>    ClickHouse database (default otel)
  --clickhouse-table <name> Traces table (default otel_traces)
  --clickhouse-logs-table <name>
                            Logs table (default otel_logs)
  --clickhouse-user <name>  Optional CH user
  --clickhouse-password <p> Optional CH password
  --clickhouse-allow-remote Start even though a non-loopback --host lets other
                            machines query ClickHouse with these credentials
  --sso-origin <url>        SSO origin (default same as --gateway)
  --sso-client-id <id>      OIDC client_id (default aegis-console)
  --sso-scope <scope>       OIDC scope (default "openid profile email")
  --config <file>           Load JSON config (CLI flags override file values)
  --open                    Open the browser after starting
  --bridge                  Enable the MCP bridge (lock file + /aegis-bridge/ws)
  --bridge-no-auth          Skip the bridge auth check (dev only)
  -h, --help                Show this help and exit
  -v, --version             Show version and exit

Subcommands:
  mcp                       Run an MCP server over stdio, connected to a running
                            console started with --bridge
    --lock <file>           Bridge lock file (default: newest in ~/.aegis/ide)
    --session <id>          Browser session id (default: most recent)
    --list-sessions         Print the sessions on the bridge and exit

Config file (JSON, camelCase keys):
  { "gateway": "https://gw.example.com", "clickhouse": "http://localhost:8123" }
`

func loadConfigFile(p string, cfg *config) error {
	data, err := os.ReadFile(p)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, cfg)
}

const (
	readHeaderTimeout = 10 * time.Second
	idleTimeout       = 2 * time.Minute
	shutdownTimeout   = 10 * time.Second
)

func serve(cfg config) error {
	if err := checkClickhouseExposure(cfg); err != nil {
		return err
	}
	dist, err := fs.Sub(distFS, "dist")
	if err != nil {
		return fmt.Errorf("embed: %w", err)
	}
	if _, err := fs.Stat(dist, "index.html"); err != nil {
		return fmt.Errorf("dist/index.html missing — run `pnpm bundle:prepare` first")
	}

	var br *bridge
	if cfg.Bridge {
		br = newBridge(cfg.Port, cfg.BridgeNoAuth)
	}
	handler, err := newHandler(cfg, br, dist)
	if err != nil {
		return err
	}

	addr := net.JoinHostPort(cfg.Host, strconv.Itoa(cfg.Port))
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return err
	}
	srv := newServer(handler)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	// A second signal while draining kills the process.
	context.AfterFunc(ctx, stop)

	var lockDone <-chan struct{}
	if br != nil {
		lockDone = br.startLockWriter(ctx)
		log.Printf("  bridge       : enabled at ws://%s%s (auth=%t)", addr, bridgeWSPath, !cfg.BridgeNoAuth)
		if !cfg.BridgeNoAuth {
			log.Printf("  bridge token : in %s", br.lockPath())
		}
	}

	url := fmt.Sprintf("http://%s/", addr)
	log.Printf("aegis-console %s listening on %s", version, url)
	if cfg.Gateway != "" {
		log.Printf("  gateway      : %s", cfg.Gateway)
	} else {
		log.Printf("  gateway      : (none — auth-protected apps disabled)")
	}
	log.Printf("  clickhouse   : %s (db=%s, table=%s)", cfg.Clickhouse, cfg.ClickhouseDB, cfg.ClickhouseTable)

	if cfg.Open {
		go openBrowser(url)
	}
	err = run(ctx, srv, ln)
	if lockDone != nil {
		<-lockDone
	}
	return err
}

// checkClickhouseExposure refuses a bind that would let other machines
// run any SQL as the configured ClickHouse user: the proxy adds the
// credentials to every request, and a client that is not a browser sends
// no Sec-Fetch-Site for fromSameOrigin to refuse.
func checkClickhouseExposure(cfg config) error {
	if cfg.Clickhouse == "" || (cfg.ClickhouseUser == "" && cfg.ClickhousePassword == "") {
		return nil
	}
	if isLoopbackHost(cfg.Host) || cfg.ClickhouseAllowRemote {
		return nil
	}
	return fmt.Errorf("refusing to start: --host %q accepts connections from other machines, "+
		"and the ClickHouse proxy would run their queries with --clickhouse-user/--clickhouse-password. "+
		"Bind to 127.0.0.1, drop the credentials, or pass --clickhouse-allow-remote to accept this", cfg.Host)
}

func isLoopbackHost(host string) bool {
	if strings.EqualFold(host, "localhost") {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

func newHandler(cfg config, br *bridge, dist fs.FS) (http.Handler, error) {
	gatewayProxy, err := newProxy(cfg.Gateway)
	if err != nil {
		return nil, err
	}
	chProxy, err := newProxy(cfg.Clickhouse)
	if err != nil {
		return nil, err
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("ok\n"))
	})

	mux.HandleFunc("/config.js", func(w http.ResponseWriter, r *http.Request) {
		// It carries the bridge's browser token, which a <script> on
		// another origin could otherwise read.
		if !fromSameOrigin(r) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write(buildConfigJS(cfg, br, r.Host))
	})

	// The proxy adds the ClickHouse credentials itself, so they never
	// reach the browser, and refuses requests from a page on another
	// origin, which would otherwise run queries with them.
	serveClickhouse := func(w http.ResponseWriter, r *http.Request) {
		if chProxy == nil {
			http.Error(w, "ClickHouse not configured", http.StatusServiceUnavailable)
			return
		}
		if !fromSameOrigin(r) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		r.URL.Path = strings.TrimPrefix(r.URL.Path, "/api/v2/clickhouse")
		if r.URL.Path == "" {
			r.URL.Path = "/"
		}
		if cfg.ClickhouseUser != "" {
			r.Header.Set("X-ClickHouse-User", cfg.ClickhouseUser)
		}
		if cfg.ClickhousePassword != "" {
			r.Header.Set("X-ClickHouse-Key", cfg.ClickhousePassword)
		}
		chProxy.ServeHTTP(w, r)
	}
	mux.HandleFunc("/api/v2/clickhouse/", serveClickhouse)
	mux.HandleFunc("/api/v2/clickhouse", serveClickhouse)

	gatewayPaths := []string{"/api/", "/v1/", "/.well-known/", "/authorize", "/login", "/token", "/userinfo"}
	for _, prefix := range gatewayPaths {
		p := prefix
		mux.HandleFunc(p, func(w http.ResponseWriter, r *http.Request) {
			if gatewayProxy == nil {
				http.Error(w,
					"Gateway not configured. Pass --gateway <url> to enable "+r.URL.Path,
					http.StatusServiceUnavailable)
				return
			}
			gatewayProxy.ServeHTTP(w, r)
		})
	}

	if br != nil {
		mux.HandleFunc(bridgeWSPath, func(w http.ResponseWriter, r *http.Request) {
			br.handleBrowserWS(w, r)
		})
	}

	mux.Handle("/", newStaticHandler(dist))

	return newHostAllowlist(cfg.Host, cfg.AllowedHosts).wrap(mux), nil
}

// hostAllowlist refuses requests whose Host names this server by a name it
// was not told about. A DNS-rebinding page reaches 127.0.0.1 under its own
// hostname and would otherwise pass every same-origin check here.
type hostAllowlist map[string]struct{}

func newHostAllowlist(bindHost string, extra []string) hostAllowlist {
	a := hostAllowlist{}
	for _, h := range append([]string{bindHost}, extra...) {
		if n := normalizeHost(h); n != "" {
			a[n] = struct{}{}
		}
	}
	return a
}

// allows accepts every IP literal as well as the listed names: a hostile
// DNS record cannot rebind an address literal, and it covers the
// machine's LAN addresses when bound to 0.0.0.0. Browsers resolve
// localhost and *.localhost to loopback themselves.
func (a hostAllowlist) allows(hostport string) bool {
	host := normalizeHost(hostport)
	if host == "" {
		return false
	}
	if net.ParseIP(host) != nil || host == "localhost" || strings.HasSuffix(host, ".localhost") {
		return true
	}
	_, ok := a[host]
	return ok
}

func (a hostAllowlist) wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !a.allows(r.Host) {
			http.Error(w, "host not allowed; start aegis-console with --allowed-host to serve it", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func normalizeHost(hostport string) string {
	host := hostport
	if h, _, err := net.SplitHostPort(hostport); err == nil {
		host = h
	}
	host = strings.TrimPrefix(strings.TrimSuffix(host, "]"), "[")
	return strings.TrimSuffix(strings.ToLower(host), ".")
}

func newServer(h http.Handler) *http.Server {
	// No WriteTimeout: it would cut event streams and proxied WebSockets.
	srv := &http.Server{
		ReadHeaderTimeout: readHeaderTimeout,
		IdleTimeout:       idleTimeout,
	}
	shuttingDown, cancel := context.WithCancel(context.Background())
	srv.RegisterOnShutdown(cancel)
	srv.Handler = endStreamsOnShutdown(shuttingDown, h)
	return srv
}

// endStreamsOnShutdown ends event streams as soon as shutdown begins. They
// never go idle, so Shutdown would otherwise wait out shutdownTimeout for
// them; the browser reconnects to the next server on its own.
func endStreamsOnShutdown(shuttingDown context.Context, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.Header.Get("Accept"), "text/event-stream") {
			ctx, cancel := context.WithCancel(r.Context())
			defer cancel()
			defer context.AfterFunc(shuttingDown, cancel)()
			r = r.WithContext(ctx)
		}
		next.ServeHTTP(w, r)
	})
}

// run serves on ln until ctx ends, then stops accepting connections and
// waits up to shutdownTimeout for the requests in flight to finish.
func run(ctx context.Context, srv *http.Server, ln net.Listener) error {
	served := make(chan error, 1)
	go func() { served <- srv.Serve(ln) }()
	select {
	case err := <-served:
		return err
	case <-ctx.Done():
	}
	log.Printf("shutting down")
	shutCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(shutCtx); err != nil {
		log.Printf("shutdown: %v; closing the connections still open", err)
		if err := srv.Close(); err != nil {
			return err
		}
	}
	if err := <-served; !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

func newProxy(target string) (*httputil.ReverseProxy, error) {
	if target == "" {
		return nil, nil
	}
	u, err := url.Parse(target)
	if err != nil {
		return nil, fmt.Errorf("invalid proxy target %q: %w", target, err)
	}
	if u.Scheme == "" || u.Host == "" {
		return nil, fmt.Errorf("invalid proxy target %q: want scheme://host", target)
	}
	return &httputil.ReverseProxy{
		// The upstream gets its own name as Host, which a host-routed
		// ingress in front of the gateway needs to route the request;
		// X-Forwarded-Host and -Proto carry the origin the browser used.
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.SetURL(u)
			pr.SetXForwarded()
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			http.Error(w,
				fmt.Sprintf("Upstream unavailable: %s\n%s", target, err),
				http.StatusBadGateway)
		},
	}, nil
}

// buildConfigJS points the bridge at host, the address the browser
// loaded the page from, so the WebSocket's origin always matches it.
func buildConfigJS(cfg config, br *bridge, host string) []byte {
	payload := map[string]any{
		"gatewayUrl":            "",
		"ssoOrigin":             "",
		"ssoClientId":           cfg.SsoClientID,
		"ssoScope":              cfg.SsoScope,
		"clickhouseUrl":         "/api/v2/clickhouse",
		"clickhouseDatabase":    cfg.ClickhouseDB,
		"clickhouseTracesTable": cfg.ClickhouseTable,
		"clickhouseLogsTable":   cfg.ClickhouseLogsTable,
	}
	body, _ := json.MarshalIndent(payload, "", "  ")
	var buf bytes.Buffer
	buf.WriteString("window.__AEGIS_CONFIG__ = ")
	buf.Write(body)
	buf.WriteString(";\n")
	if br != nil {
		bridgePayload := map[string]any{
			"url": fmt.Sprintf("ws://%s%s", host, bridgeWSPath),
		}
		if !br.noAuth {
			bridgePayload["authToken"] = br.browserToken
		}
		bbody, _ := json.MarshalIndent(bridgePayload, "", "  ")
		buf.WriteString("window.__AEGIS_BRIDGE__ = ")
		buf.Write(bbody)
		buf.WriteString(";\n")
	}
	return buf.Bytes()
}

// fromSameOrigin reports whether r came from the console's own pages, the
// user typing the address, or a client that is not a browser (which sends
// no Sec-Fetch-Site). A page on another port of the same host is
// "same-site" and is refused like any other origin.
func fromSameOrigin(r *http.Request) bool {
	switch r.Header.Get("Sec-Fetch-Site") {
	case "", "same-origin", "none":
		return true
	default:
		return false
	}
}

// newStaticHandler serves embedded files; for any non-asset GET that does
// not exist on disk, falls back to index.html so the SPA router can take
// over (e.g. /trajectories/abc123).
func newStaticHandler(dist fs.FS) http.Handler {
	indexHTML, err := fs.ReadFile(dist, "index.html")
	if err != nil {
		log.Fatalf("index.html: %v", err)
	}
	fileServer := http.FileServer(http.FS(dist))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clean := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if clean == "" {
			serveIndex(w, indexHTML)
			return
		}
		// If the requested file exists in the embedded FS, serve it; else
		// fall back to the SPA index for client-side routes.
		if _, err := fs.Stat(dist, clean); err == nil {
			fileServer.ServeHTTP(w, r)
			return
		}
		if r.Method == http.MethodGet && !strings.Contains(path.Base(clean), ".") {
			serveIndex(w, indexHTML)
			return
		}
		http.NotFound(w, r)
	})
}

func serveIndex(w http.ResponseWriter, body []byte) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	_, _ = w.Write(body)
}

func openBrowser(u string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", u)
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", "", u)
	default:
		cmd = exec.Command("xdg-open", u)
	}
	_ = cmd.Start()
}
