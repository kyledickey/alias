// Command server serves the Alias SPA from an embedded build and proxies
// Better Auth requests to the Convex HTTP actions site.
package main

import (
	"context"
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

//go:embed all:dist
var distFS embed.FS

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel(os.Getenv("LOG_LEVEL"))}))
	slog.SetDefault(logger)

	if err := run(logger); err != nil {
		logger.Error("server exited with error", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	target, err := parseConvexSiteURL(os.Getenv("CONVEX_SITE_URL"))
	if err != nil {
		return fmt.Errorf("invalid CONVEX_SITE_URL: %w", err)
	}

	dist, err := fs.Sub(distFS, "dist")
	if err != nil {
		return err
	}
	siteURL, err := parseSiteURL(os.Getenv("SITE_URL"))
	if err != nil {
		return fmt.Errorf("invalid SITE_URL: %w", err)
	}
	static, err := newStaticHandler(dist, siteURL)
	if err != nil {
		return err
	}

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           newHandler(logger, target, static),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
		ErrorLog:          slog.NewLogLogger(logger.Handler(), slog.LevelWarn),
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	errCh := make(chan error, 1)
	go func() {
		logger.Info("server starting", "addr", srv.Addr, "convex_site_url", target.String())
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
		close(errCh)
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
	}

	logger.Info("shutdown signal received, draining connections")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown: %w", err)
	}
	logger.Info("server stopped")
	return nil
}

// newHandler wires up routes and middleware.
func newHandler(logger *slog.Logger, target *url.URL, static http.Handler) http.Handler {
	mux := http.NewServeMux()
	mux.Handle("/api/auth/", newAuthProxy(logger, target))
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write([]byte("ok"))
	})
	mux.Handle("/", static)
	return logRequests(logger, securityHeaders(mux))
}

// parseConvexSiteURL validates CONVEX_SITE_URL: an https *.convex.site origin,
// or an http(s) localhost / 127.0.0.1 origin for local development.
func parseConvexSiteURL(raw string) (*url.URL, error) {
	if raw == "" {
		return nil, errors.New("must be set")
	}
	u, err := url.Parse(strings.TrimSuffix(raw, "/"))
	if err != nil {
		return nil, err
	}
	if u.Path != "" || u.RawQuery != "" || u.Fragment != "" || u.User != nil {
		return nil, fmt.Errorf("%q must be a bare origin (no path, query, or credentials)", raw)
	}
	host := u.Hostname()
	switch {
	case u.Scheme == "https" && strings.HasSuffix(host, ".convex.site") && host != ".convex.site":
	case (u.Scheme == "http" || u.Scheme == "https") && (host == "localhost" || host == "127.0.0.1"):
	default:
		return nil, fmt.Errorf("%q must be https://<deployment>.convex.site or http://localhost[:port] / http://127.0.0.1[:port]", raw)
	}
	return u, nil
}

func logLevel(s string) slog.Level {
	var l slog.Level
	if err := l.UnmarshalText([]byte(s)); err != nil {
		return slog.LevelInfo
	}
	return l
}

// parseSiteURL validates the public origin used in link previews. Defaults to
// https://alias.party.
func parseSiteURL(raw string) (string, error) {
	if raw == "" {
		return "https://alias.party", nil
	}
	u, err := url.Parse(raw)
	if err != nil {
		return "", err
	}
	if (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" || (u.Path != "" && u.Path != "/") {
		return "", errors.New("must be an origin like https://alias.party")
	}
	return u.Scheme + "://" + u.Host, nil
}
