# syntax=docker/dockerfile:1

# --- Stage 1: build the Vite SPA into server/dist ---
FROM oven/bun:1 AS web
# vp (Vite+) runs on Node, which the bun image doesn't ship
COPY --from=node:24-slim /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG VITE_CONVEX_URL
ARG VITE_VISITORS_TOKEN
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL \
    VITE_VISITORS_TOKEN=$VITE_VISITORS_TOKEN
RUN bun run build

# --- Stage 2: build the Go server with the SPA embedded ---
FROM golang:1.25-alpine AS server
WORKDIR /src
COPY server/ ./
COPY --from=web /app/server/dist ./dist
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /alias .

# --- Stage 3: minimal runtime ---
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=server /alias /alias
ENV PORT=8080
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/alias"]
