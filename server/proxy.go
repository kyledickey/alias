package main

import (
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"
)

// newAuthProxy reverse-proxies /api/auth/* to the Convex site URL, preserving
// path and query. Redirects are passed through (never followed), as are
// Set-Cookie and Location headers.
func newAuthProxy(logger *slog.Logger, target *url.URL) http.Handler {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.DialContext = (&net.Dialer{Timeout: 10 * time.Second, KeepAlive: 30 * time.Second}).DialContext
	transport.TLSHandshakeTimeout = 10 * time.Second
	transport.ResponseHeaderTimeout = 25 * time.Second
	transport.IdleConnTimeout = 90 * time.Second

	proxy := &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.SetURL(target)
			pr.SetXForwarded()
			pr.Out.Host = target.Host
			// Mirrors the previous Next.js handler, which effectively disables
			// upstream compression.
			pr.Out.Header.Set("Accept-Encoding", "application/json")
		},
		Transport: transport,
		ModifyResponse: func(resp *http.Response) error {
			// Our security headers win over any upstream duplicates.
			for _, h := range securityHeaderNames {
				resp.Header.Del(h)
			}
			return nil
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			logger.Error("auth proxy error", "method", r.Method, "path", r.URL.Path, "error", err)
			http.Error(w, http.StatusText(http.StatusBadGateway), http.StatusBadGateway)
		},
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet, http.MethodPost, http.MethodOptions:
			proxy.ServeHTTP(w, r)
		default:
			w.Header().Set("Allow", "GET, POST, OPTIONS")
			http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		}
	})
}
