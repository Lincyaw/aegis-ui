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
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/exec"
	"path"
	"runtime"
	"strings"
)

//go:embed all:dist
var distFS embed.FS

// Replaced via -ldflags="-X main.version=..." at build time.
var version = "dev"

type config struct {
	Port               int    `json:"port"`
	Host               string `json:"host"`
	Gateway            string `json:"gateway"`
	Clickhouse         string `json:"clickhouse"`
	ClickhouseDB       string `json:"clickhouseDb"`
	ClickhouseTable    string `json:"clickhouseTable"`
	ClickhouseUser     string `json:"clickhouseUser"`
	ClickhousePassword string `json:"clickhousePassword"`
	SsoOrigin          string `json:"ssoOrigin"`
	SsoClientID        string `json:"ssoClientId"`
	SsoScope           string `json:"ssoScope"`
	Open               bool   `json:"open"`
}

func main() {
	cfg := config{
		Port:            3323,
		Host:            "127.0.0.1",
		Clickhouse:      "http://127.0.0.1:8123",
		ClickhouseDB:    "otel",
		ClickhouseTable: "otel_traces",
		SsoClientID:     "aegis-console",
		SsoScope:        "openid profile email",
	}

	var configFile string
	var showVersion, showHelp bool

	flag.IntVar(&cfg.Port, "port", cfg.Port, "Port to listen on")
	flag.StringVar(&cfg.Host, "host", cfg.Host, "Bind address (use 0.0.0.0 for LAN)")
	flag.StringVar(&cfg.Gateway, "gateway", "", "Remote AegisLab gateway URL (empty disables /api proxy)")
	flag.StringVar(&cfg.Clickhouse, "clickhouse", cfg.Clickhouse, "ClickHouse HTTP endpoint")
	flag.StringVar(&cfg.ClickhouseDB, "clickhouse-db", cfg.ClickhouseDB, "ClickHouse database")
	flag.StringVar(&cfg.ClickhouseTable, "clickhouse-table", cfg.ClickhouseTable, "Traces table")
	flag.StringVar(&cfg.ClickhouseUser, "clickhouse-user", "", "Optional CH user")
	flag.StringVar(&cfg.ClickhousePassword, "clickhouse-password", "", "Optional CH password")
	flag.StringVar(&cfg.SsoOrigin, "sso-origin", "", "SSO origin (default same as --gateway)")
	flag.StringVar(&cfg.SsoClientID, "sso-client-id", cfg.SsoClientID, "OIDC client_id")
	flag.StringVar(&cfg.SsoScope, "sso-scope", cfg.SsoScope, "OIDC scope")
	flag.StringVar(&configFile, "config", "", "Load JSON config (CLI flags override file values)")
	flag.BoolVar(&cfg.Open, "open", false, "Open the browser after starting")
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

Flags:
  --port <n>                Port to listen on (default 3323)
  --host <addr>             Bind address (default 127.0.0.1; use 0.0.0.0 for LAN)
  --gateway <url>           Remote AegisLab gateway URL (empty disables /api proxy)
  --clickhouse <url>        ClickHouse HTTP endpoint (default http://127.0.0.1:8123)
  --clickhouse-db <name>    ClickHouse database (default otel)
  --clickhouse-table <name> Traces table (default otel_traces)
  --clickhouse-user <name>  Optional CH user
  --clickhouse-password <p> Optional CH password
  --sso-origin <url>        SSO origin (default same as --gateway)
  --sso-client-id <id>      OIDC client_id (default aegis-console)
  --sso-scope <scope>       OIDC scope (default "openid profile email")
  --config <file>           Load JSON config (CLI flags override file values)
  --open                    Open the browser after starting
  -h, --help                Show this help and exit
  -v, --version             Show version and exit

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

func serve(cfg config) error {
	dist, err := fs.Sub(distFS, "dist")
	if err != nil {
		return fmt.Errorf("embed: %w", err)
	}
	if _, err := fs.Stat(dist, "index.html"); err != nil {
		return fmt.Errorf("dist/index.html missing — run `pnpm bundle:prepare` first")
	}

	configJS := buildConfigJS(cfg)

	gatewayProxy := mustProxy(cfg.Gateway)
	chProxy := mustProxy(cfg.Clickhouse)

	mux := http.NewServeMux()

	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("ok\n"))
	})

	mux.HandleFunc("/config.js", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write(configJS)
	})

	mux.HandleFunc("/api/v2/clickhouse/", func(w http.ResponseWriter, r *http.Request) {
		if chProxy == nil {
			http.Error(w, "ClickHouse not configured", http.StatusServiceUnavailable)
			return
		}
		r.URL.Path = strings.TrimPrefix(r.URL.Path, "/api/v2/clickhouse")
		if r.URL.Path == "" {
			r.URL.Path = "/"
		}
		chProxy.ServeHTTP(w, r)
	})
	mux.HandleFunc("/api/v2/clickhouse", func(w http.ResponseWriter, r *http.Request) {
		if chProxy == nil {
			http.Error(w, "ClickHouse not configured", http.StatusServiceUnavailable)
			return
		}
		r.URL.Path = "/"
		chProxy.ServeHTTP(w, r)
	})

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

	staticHandler := newStaticHandler(dist)
	mux.Handle("/", staticHandler)

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	srv := &http.Server{Addr: addr, Handler: mux}

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
	return srv.ListenAndServe()
}

func mustProxy(target string) *httputil.ReverseProxy {
	if target == "" {
		return nil
	}
	u, err := url.Parse(target)
	if err != nil || u.Scheme == "" || u.Host == "" {
		log.Fatalf("invalid proxy target %q: %v", target, err)
	}
	rp := httputil.NewSingleHostReverseProxy(u)
	rp.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		http.Error(w,
			fmt.Sprintf("Upstream unavailable: %s\n%s", target, err),
			http.StatusBadGateway)
	}
	// Default Director rewrites Host; preserve Authorization etc. transparently.
	return rp
}

func buildConfigJS(cfg config) []byte {
	payload := map[string]any{
		"gatewayUrl":            "",
		"ssoOrigin":             "",
		"ssoClientId":           cfg.SsoClientID,
		"ssoScope":              cfg.SsoScope,
		"clickhouseUrl":         "/api/v2/clickhouse",
		"clickhouseDatabase":    cfg.ClickhouseDB,
		"clickhouseTracesTable": cfg.ClickhouseTable,
	}
	if cfg.ClickhouseUser != "" {
		payload["clickhouseUser"] = cfg.ClickhouseUser
	}
	if cfg.ClickhousePassword != "" {
		payload["clickhousePassword"] = cfg.ClickhousePassword
	}
	body, _ := json.MarshalIndent(payload, "", "  ")
	var buf bytes.Buffer
	buf.WriteString("window.__AEGIS_CONFIG__ = ")
	buf.Write(body)
	buf.WriteString(";\n")
	return buf.Bytes()
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
