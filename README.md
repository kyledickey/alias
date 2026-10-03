# Alias

A party game about fake names and wrong guesses. Live at [alias.party](https://alias.party).

## Stack

- **Frontend:** React SPA built with [Vite+](https://viteplus.dev) (`src/`)
- **Backend:** [Convex](https://convex.dev) for game state, [Better Auth](https://better-auth.com) (Google) running inside Convex (`convex/`)
- **Server:** a small Go binary (`server/`) that embeds the built SPA and reverse-proxies `/api/auth/*` to the Convex site URL, so auth cookies stay first-party

## Development

Requires [Bun](https://bun.sh), Node 22+, and Go 1.25+.

```bash
bun install
bun run dev   # Vite on :3000 + convex dev
```

`.env.local`:

```bash
CONVEX_DEPLOYMENT=...
VITE_CONVEX_URL=https://<deployment>.convex.cloud
CONVEX_SITE_URL=https://<deployment>.convex.site   # used by the Vite dev proxy and the Go server
VITE_VISITORS_TOKEN=...
```

In dev, Vite proxies `/api/auth` to `CONVEX_SITE_URL`, same as the Go server does in production.

Other scripts: `bun run check` (format + lint + type-check), `bun run format`, `bun run build`.

## Production

```bash
bun run build                 # builds the SPA into server/dist
cd server && go build -o alias .
CONVEX_SITE_URL=https://<deployment>.convex.site ./alias
```

Or with Docker:

```bash
docker build \
  --build-arg VITE_CONVEX_URL=https://<deployment>.convex.cloud \
  --build-arg VITE_VISITORS_TOKEN=... \
  -t alias .
docker run -p 8080:8080 -e CONVEX_SITE_URL=https://<deployment>.convex.site alias
```

Server env: `CONVEX_SITE_URL` (required), `SITE_URL` (public origin used in game-link previews, default `https://alias.party`), `PORT` (default `8080`), `LOG_LEVEL` (default `info`).

## SEO

- Page copy (tagline, description, how-to-play, FAQ) lives in `src/content.ts`. The Vite build turns it into the meta description, JSON-LD structured data, and crawler-readable HTML in `index.html`.
- The Go server swaps the `<!-- seo:start -->` block for per-game metadata on `/game/{code}`, so shared links preview as "Join my Alias game · CODE" (and aren't indexed).
- `public/og.png` and the PNG icons are rendered from `scripts/og/og.html`: `npx playwright install chromium && node scripts/og/render.mjs`.

The Convex deployment needs `SITE_URL` set to the public origin (e.g. `https://alias.party`), plus `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
