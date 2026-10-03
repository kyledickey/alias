package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"html"
	"io"
	"io/fs"
	"mime"
	"net/http"
	"path"
	"regexp"
	"strings"
	"time"
)

func init() {
	// Go's builtin MIME table is small and distroless has no /etc/mime.types.
	for ext, typ := range map[string]string{
		".ico":         "image/x-icon",
		".txt":         "text/plain; charset=utf-8",
		".webmanifest": "application/manifest+json",
		".woff":        "font/woff",
		".woff2":       "font/woff2",
		".map":         "application/json",
	} {
		_ = mime.AddExtensionType(ext, typ)
	}
}

const (
	cacheImmutable = "public, max-age=31536000, immutable"
	cachePublic    = "public, max-age=3600"
	cacheNoCache   = "no-cache"
)

type staticHandler struct {
	fsys      fs.FS
	index     []byte // nil if the frontend hasn't been built
	indexETag string
	siteURL   string // public origin, e.g. https://alias.party
}

// The page metadata in index.html sits between these markers, so game links
// can get their own title and preview when shared (chat apps and crawlers
// don't run JavaScript).
var (
	seoStart = []byte("<!-- seo:start -->")
	seoEnd   = []byte("<!-- seo:end -->")
	// nanoid's alphabet; codes are 6 characters, allow a little slack
	gamePath = regexp.MustCompile(`^game/([A-Za-z0-9_-]{1,16})$`)
)

const gameMeta = `<!-- seo:start -->
        <title>Join my Alias game · %[1]s</title>
        <meta name="description" content="%[2]s" />
        <meta name="robots" content="noindex" />
        <meta property="og:url" content="%[3]s/game/%[1]s" />
        <meta property="og:title" content="Join my Alias game · %[1]s" />
        <meta property="og:description" content="%[2]s" />
        <meta name="twitter:title" content="Join my Alias game · %[1]s" />
        <meta name="twitter:description" content="%[2]s" />
        <!-- seo:end -->`

// newStaticHandler serves files from fsys (the Vite dist directory):
// hashed /assets/* are immutable and 404 when missing, other existing files are
// cached for an hour, and every other path falls back to index.html.
// Dotfiles (e.g. .gitkeep) are never served. /game/{code} gets per-game
// metadata (and noindex) swapped into index.html.
func newStaticHandler(fsys fs.FS, siteURL string) (http.Handler, error) {
	h := &staticHandler{fsys: fsys, siteURL: strings.TrimSuffix(siteURL, "/")}
	index, err := fs.ReadFile(fsys, "index.html")
	switch {
	case err == nil:
		h.index = index
		h.indexETag = etag(index)
	case !errors.Is(err, fs.ErrNotExist):
		return nil, err
	}
	return h, nil
}

func (h *staticHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.Header().Set("Allow", "GET, HEAD")
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		return
	}

	name := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
	isAsset := name == "assets" || strings.HasPrefix(name, "assets/")

	if name != "" && name != "index.html" && !hasHiddenSegment(name) {
		if f, ok := h.open(name); ok {
			defer f.Close()
			cc := cachePublic
			if isAsset {
				cc = cacheImmutable
			}
			w.Header().Set("Cache-Control", cc)
			http.ServeContent(w, r, name, time.Time{}, f)
			return
		}
	}

	if isAsset {
		http.NotFound(w, r)
		return
	}
	h.serveIndex(w, r, name)
}

func (h *staticHandler) serveIndex(w http.ResponseWriter, r *http.Request, name string) {
	if h.index == nil {
		http.Error(w, "frontend not built", http.StatusServiceUnavailable)
		return
	}
	body, tag := h.index, h.indexETag
	if m := gamePath.FindStringSubmatch(name); m != nil {
		body = h.gameIndex(m[1])
		tag = etag(body)
	}
	w.Header().Set("Cache-Control", cacheNoCache)
	w.Header().Set("ETag", tag)
	http.ServeContent(w, r, "index.html", time.Time{}, bytes.NewReader(body))
}

// gameIndex returns index.html with the SEO block replaced by game-specific
// metadata, or the plain index if the markers are missing.
func (h *staticHandler) gameIndex(code string) []byte {
	start := bytes.Index(h.index, seoStart)
	end := bytes.Index(h.index, seoEnd)
	if start < 0 || end < start {
		return h.index
	}
	code = html.EscapeString(code)
	desc := "You're invited to a game of Alias! Join with code " + code +
		", pick a secret fake name, and see if anyone can guess who you are."
	meta := fmt.Sprintf(gameMeta, code, desc, html.EscapeString(h.siteURL))

	out := make([]byte, 0, len(h.index)+len(meta))
	out = append(out, h.index[:start]...)
	out = append(out, meta...)
	return append(out, h.index[end+len(seoEnd):]...)
}

func etag(b []byte) string {
	sum := sha256.Sum256(b)
	return `"` + hex.EncodeToString(sum[:8]) + `"`
}

// open returns a seekable regular file, or ok=false if it doesn't exist or is a directory.
func (h *staticHandler) open(name string) (io.ReadSeekCloser, bool) {
	f, err := h.fsys.Open(name)
	if err != nil {
		return nil, false
	}
	st, err := f.Stat()
	if err != nil || !st.Mode().IsRegular() {
		f.Close()
		return nil, false
	}
	rs, ok := f.(io.ReadSeekCloser)
	if !ok {
		f.Close()
		return nil, false
	}
	return rs, true
}

func hasHiddenSegment(name string) bool {
	for seg := range strings.SplitSeq(name, "/") {
		if strings.HasPrefix(seg, ".") {
			return true
		}
	}
	return false
}
