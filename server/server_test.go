package main

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
)

var testFS = fstest.MapFS{
	"index.html":           {Data: []byte("<!doctype html><title>alias</title>")},
	"favicon.svg":          {Data: []byte("<svg></svg>")},
	"robots.txt":           {Data: []byte("User-agent: *")},
	"assets/index-abc1.js": {Data: []byte("console.log(1)")},
	".gitkeep":             {Data: []byte{}},
}

func newTestServer(t *testing.T, convex *httptest.Server) http.Handler {
	t.Helper()
	target, err := parseConvexSiteURL(convex.URL)
	if err != nil {
		t.Fatal(err)
	}
	static, err := newStaticHandler(testFS, "https://alias.party")
	if err != nil {
		t.Fatal(err)
	}
	return newHandler(slog.New(slog.DiscardHandler), target, static)
}

func do(h http.Handler, method, target string) *http.Response {
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(method, target, nil))
	return rr.Result()
}

func TestAuthProxy(t *testing.T) {
	var got *http.Request
	convex := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = r.Clone(r.Context())
		switch r.URL.Path {
		case "/api/auth/callback/google":
			w.Header().Set("Location", "https://alias.party/")
			w.Header().Add("Set-Cookie", "a=1; Path=/; HttpOnly")
			w.Header().Add("Set-Cookie", "b=2; Path=/")
			w.WriteHeader(http.StatusFound)
		default:
			w.Header().Add("Set-Cookie", "session=xyz; Path=/")
			_, _ = io.WriteString(w, `{"ok":true}`)
		}
	}))
	defer convex.Close()
	h := newTestServer(t, convex)
	convexHost := strings.TrimPrefix(convex.URL, "http://")

	tests := []struct {
		name       string
		method     string
		target     string
		wantStatus int
		wantPath   string
		wantQuery  string
		wantCookie []string
		wantLoc    string
	}{
		{"get session", "GET", "/api/auth/get-session?disableCookieCache=true", 200, "/api/auth/get-session", "disableCookieCache=true", []string{"session=xyz; Path=/"}, ""},
		{"post sign-in", "POST", "/api/auth/sign-in/social", 200, "/api/auth/sign-in/social", "", []string{"session=xyz; Path=/"}, ""},
		{"redirect not followed", "GET", "/api/auth/callback/google?code=abc&state=s", 302, "/api/auth/callback/google", "code=abc&state=s", []string{"a=1; Path=/; HttpOnly", "b=2; Path=/"}, "https://alias.party/"},
		{"method not allowed", "DELETE", "/api/auth/session", 405, "", "", nil, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got = nil
			resp := do(h, tt.method, tt.target)
			if resp.StatusCode != tt.wantStatus {
				t.Fatalf("status = %d, want %d", resp.StatusCode, tt.wantStatus)
			}
			if tt.wantPath == "" {
				if got != nil {
					t.Fatal("request unexpectedly reached upstream")
				}
				return
			}
			if got == nil {
				t.Fatal("request never reached upstream")
			}
			if got.URL.Path != tt.wantPath || got.URL.RawQuery != tt.wantQuery {
				t.Errorf("upstream URL = %s?%s, want %s?%s", got.URL.Path, got.URL.RawQuery, tt.wantPath, tt.wantQuery)
			}
			if got.Method != tt.method {
				t.Errorf("upstream method = %s, want %s", got.Method, tt.method)
			}
			if got.Host != convexHost {
				t.Errorf("upstream Host = %q, want %q", got.Host, convexHost)
			}
			if ae := got.Header.Get("Accept-Encoding"); ae != "application/json" {
				t.Errorf("upstream Accept-Encoding = %q", ae)
			}
			if got.Header.Get("X-Forwarded-For") == "" {
				t.Error("X-Forwarded-For not set")
			}
			if c := resp.Header.Values("Set-Cookie"); strings.Join(c, "|") != strings.Join(tt.wantCookie, "|") {
				t.Errorf("Set-Cookie = %q, want %q", c, tt.wantCookie)
			}
			if loc := resp.Header.Get("Location"); loc != tt.wantLoc {
				t.Errorf("Location = %q, want %q", loc, tt.wantLoc)
			}
			if resp.Header.Get("X-Frame-Options") != "DENY" {
				t.Error("missing security headers on proxied response")
			}
		})
	}
}

func TestAuthProxyUpstreamDown(t *testing.T) {
	convex := httptest.NewServer(http.NotFoundHandler())
	h := newTestServer(t, convex)
	convex.Close()
	if resp := do(h, "GET", "/api/auth/get-session"); resp.StatusCode != http.StatusBadGateway {
		t.Fatalf("status = %d, want 502", resp.StatusCode)
	}
}

func TestStatic(t *testing.T) {
	convex := httptest.NewServer(http.NotFoundHandler())
	defer convex.Close()
	h := newTestServer(t, convex)

	tests := []struct {
		name       string
		method     string
		path       string
		wantStatus int
		wantCache  string
		wantBody   string
	}{
		{"root", "GET", "/", 200, cacheNoCache, "<!doctype html>"},
		{"index.html", "GET", "/index.html", 200, cacheNoCache, "<!doctype html>"},
		{"spa route", "GET", "/game/ABC123", 200, cacheNoCache, "<!doctype html>"},
		{"spa route head", "HEAD", "/lobby/XYZ", 200, cacheNoCache, ""},
		{"hashed asset", "GET", "/assets/index-abc1.js", 200, cacheImmutable, "console.log(1)"},
		{"missing asset", "GET", "/assets/missing.js", 404, "", "404 page not found"},
		{"assets dir", "GET", "/assets/", 404, "", "404 page not found"},
		{"public file", "GET", "/favicon.svg", 200, cachePublic, "<svg>"},
		{"robots", "GET", "/robots.txt", 200, cachePublic, "User-agent"},
		{"gitkeep hidden", "GET", "/.gitkeep", 200, cacheNoCache, "<!doctype html>"},
		{"healthz", "GET", "/healthz", 200, "no-store", "ok"},
		{"post not allowed", "POST", "/game/ABC123", 405, "", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := do(h, tt.method, tt.path)
			body, _ := io.ReadAll(resp.Body)
			if resp.StatusCode != tt.wantStatus {
				t.Fatalf("status = %d, want %d", resp.StatusCode, tt.wantStatus)
			}
			if cc := resp.Header.Get("Cache-Control"); cc != tt.wantCache {
				t.Errorf("Cache-Control = %q, want %q", cc, tt.wantCache)
			}
			if !strings.HasPrefix(string(body), tt.wantBody) {
				t.Errorf("body = %q, want prefix %q", body, tt.wantBody)
			}
			if resp.Header.Get("X-Content-Type-Options") != "nosniff" {
				t.Error("missing nosniff header")
			}
		})
	}
}

func TestIndexETag(t *testing.T) {
	h, err := newStaticHandler(testFS, "https://alias.party")
	if err != nil {
		t.Fatal(err)
	}
	etag := do(h, "GET", "/").Header.Get("ETag")
	req := httptest.NewRequest("GET", "/game/1", nil)
	req.Header.Set("If-None-Match", etag)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusNotModified {
		t.Fatalf("status = %d, want 304", rr.Code)
	}
}

func TestParseConvexSiteURL(t *testing.T) {
	tests := []struct {
		in   string
		want string // "" means error expected
	}{
		{"https://happy-otter-123.convex.site", "https://happy-otter-123.convex.site"},
		{"https://happy-otter-123.convex.site/", "https://happy-otter-123.convex.site"},
		{"http://localhost:3211", "http://localhost:3211"},
		{"http://127.0.0.1:3211", "http://127.0.0.1:3211"},
		{"", ""},
		{"http://happy-otter-123.convex.site", ""},
		{"https://happy-otter-123.convex.cloud", ""},
		{"https://evil.com/.convex.site", ""},
		{"https://convex.site.evil.com", ""},
		{"https://x.convex.site/api", ""},
		{"not a url", ""},
	}
	for _, tt := range tests {
		u, err := parseConvexSiteURL(tt.in)
		switch {
		case tt.want == "" && err == nil:
			t.Errorf("parseConvexSiteURL(%q) = %v, want error", tt.in, u)
		case tt.want != "" && err != nil:
			t.Errorf("parseConvexSiteURL(%q) error: %v", tt.in, err)
		case tt.want != "" && u.String() != tt.want:
			t.Errorf("parseConvexSiteURL(%q) = %q, want %q", tt.in, u, tt.want)
		}
	}
}

func TestClientIP(t *testing.T) {
	r := httptest.NewRequest("GET", "/", nil)
	r.RemoteAddr = "10.0.0.1:1234"
	if got := clientIP(r); got != "10.0.0.1" {
		t.Errorf("clientIP = %q", got)
	}
	r.Header.Set("X-Forwarded-For", "203.0.113.7, 10.0.0.2")
	if got := clientIP(r); got != "203.0.113.7" {
		t.Errorf("clientIP = %q", got)
	}
}

func TestGameMeta(t *testing.T) {
	fsys := fstest.MapFS{"index.html": {Data: []byte(
		"<head><!-- seo:start --><title>Alias</title><!-- seo:end --><meta property=\"og:image\" content=\"x\" /></head>",
	)}}
	h, err := newStaticHandler(fsys, "https://alias.party")
	if err != nil {
		t.Fatal(err)
	}
	read := func(target string) (string, string) {
		resp := do(h, "GET", target)
		b, _ := io.ReadAll(resp.Body)
		return string(b), resp.Header.Get("ETag")
	}

	home, homeTag := read("/")
	if !strings.Contains(home, "<title>Alias</title>") || strings.Contains(home, "noindex") {
		t.Errorf("home page metadata changed: %s", home)
	}

	game, gameTag := read("/game/AB_12C")
	for _, want := range []string{
		"<title>Join my Alias game · AB_12C</title>",
		`content="https://alias.party/game/AB_12C"`,
		`name="robots" content="noindex"`,
		`property="og:image"`, // untouched tags outside the markers survive
	} {
		if !strings.Contains(game, want) {
			t.Errorf("game page missing %q", want)
		}
	}
	if strings.Contains(game, "<title>Alias</title>") {
		t.Error("home title not replaced")
	}
	if gameTag == homeTag {
		t.Error("game page should have its own ETag")
	}

	// Anything that isn't a plain code gets the normal page, never injected markup
	for _, target := range []string{"/game/%3Cscript%3E", "/game/a/b", "/game/"} {
		if body, _ := read(target); body != home {
			t.Errorf("%s: expected unmodified index", target)
		}
	}
}

func TestParseSiteURL(t *testing.T) {
	tests := []struct{ in, want string }{
		{"", "https://alias.party"},
		{"https://alias.party/", "https://alias.party"},
		{"http://localhost:3000", "http://localhost:3000"},
		{"alias.party", ""},
		{"https://alias.party/foo", ""},
	}
	for _, tt := range tests {
		got, err := parseSiteURL(tt.in)
		if (err != nil) != (tt.want == "") || got != tt.want {
			t.Errorf("parseSiteURL(%q) = %q, %v; want %q", tt.in, got, err, tt.want)
		}
	}
}

// Convex's site is behind Cloudflare and rejects requests carrying our zone's
// CF-* headers ("error code: 1000"), so the proxy must drop them.
func TestAuthProxyStripsCloudflareHeaders(t *testing.T) {
	var got http.Header
	convex := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = r.Header.Clone()
	}))
	defer convex.Close()

	req := httptest.NewRequest("GET", "/api/auth/get-session", nil)
	for k, v := range map[string]string{
		"CF-Connecting-IP": "203.0.113.7",
		"CF-Ray":           "abc-DEN",
		"CF-Visitor":       `{"scheme":"https"}`,
		"CF-IPCountry":     "US",
		"CDN-Loop":         "cloudflare",
		"True-Client-IP":   "203.0.113.7",
		"X-Forwarded-For":  "203.0.113.7",
		"Cookie":           "session=xyz",
	} {
		req.Header.Set(k, v)
	}
	newTestServer(t, convex).ServeHTTP(httptest.NewRecorder(), req)

	for name := range got {
		lower := strings.ToLower(name)
		if strings.HasPrefix(lower, "cf-") || lower == "cdn-loop" || lower == "true-client-ip" {
			t.Errorf("forwarded Cloudflare header %s", name)
		}
	}
	if got.Get("Cookie") != "session=xyz" {
		t.Error("cookie not forwarded")
	}
	if xff := got.Get("X-Forwarded-For"); !strings.HasPrefix(xff, "203.0.113.7") {
		t.Errorf("X-Forwarded-For = %q, want the real client first", xff)
	}
}
