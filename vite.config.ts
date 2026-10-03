import react from "@vitejs/plugin-react";
import { defineConfig, lazyPlugins, loadEnv, type Plugin } from "vite-plus";
import { DESCRIPTION, FAQ, HOW_TO_PLAY_STEPS, SITE_URL, TAGLINE } from "./src/content.ts";

const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Bakes SEO into index.html from src/content.ts: the meta description,
 * JSON-LD structured data, and a crawler-readable copy of the page (most
 * crawlers and link unfurlers don't run JavaScript).
 */
function seo(): Plugin {
    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                "@id": `${SITE_URL}/#website`,
                url: `${SITE_URL}/`,
                name: "Alias",
                description: DESCRIPTION,
                inLanguage: "en",
            },
            {
                "@type": "WebApplication",
                name: "Alias",
                url: `${SITE_URL}/`,
                image: `${SITE_URL}/og.png`,
                description: DESCRIPTION,
                applicationCategory: "GameApplication",
                applicationSubCategory: "Party game",
                operatingSystem: "Any",
                browserRequirements: "Requires JavaScript",
                isAccessibleForFree: true,
                offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
                author: { "@type": "Person", name: "Kyle Dickey", url: "https://kyle.so" },
            },
            {
                "@type": "Game",
                name: "Alias",
                url: `${SITE_URL}/`,
                description: TAGLINE,
                genre: "Party game",
                numberOfPlayers: { "@type": "QuantitativeValue", minValue: 4 },
            },
            {
                "@type": "HowTo",
                name: "How to play Alias",
                step: HOW_TO_PLAY_STEPS.map((text, i) => ({
                    "@type": "HowToStep",
                    position: i + 1,
                    text,
                })),
            },
            {
                "@type": "FAQPage",
                mainEntity: FAQ.map(({ q, a }) => ({
                    "@type": "Question",
                    name: q,
                    acceptedAnswer: { "@type": "Answer", text: a },
                })),
            },
        ],
    };
    // "<" escaped so the JSON can never close the script tag
    const jsonLdTag = `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`;

    const content = [
        `<div class="seo-content">`,
        `<h1>Alias · The fake name party game</h1>`,
        `<p>${escapeHtml(TAGLINE)}</p>`,
        `<p>${escapeHtml(DESCRIPTION)}</p>`,
        `<h2>How to play</h2><ol>${HOW_TO_PLAY_STEPS.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`,
        `<h2>Frequently asked questions</h2><dl>${FAQ.map(({ q, a }) => `<dt>${escapeHtml(q)}</dt><dd>${escapeHtml(a)}</dd>`).join("")}</dl>`,
        `</div>`,
    ].join("");

    return {
        name: "alias-seo",
        transformIndexHtml: {
            order: "pre",
            handler: (html) =>
                html
                    .replaceAll("%SEO_DESCRIPTION%", escapeHtml(DESCRIPTION))
                    .replace("<!-- seo:jsonld -->", jsonLdTag)
                    .replace("<!-- seo:content -->", content),
        },
    };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");

    return {
        fmt: {
            tabWidth: 4,
            ignorePatterns: ["convex/_generated/**", "server/dist/**"],
        },
        lint: {
            ignorePatterns: ["convex/_generated/**", "server/dist/**"],
            plugins: ["react", "typescript", "oxc"],
            rules: {
                "react/rules-of-hooks": "error",
                "react/only-export-components": ["warn", { allowConstantExport: true }],
                "vite-plus/prefer-vite-plus-imports": "error",
            },
            options: {
                typeAware: true,
                typeCheck: true,
            },
            jsPlugins: [
                {
                    name: "vite-plus",
                    specifier: "vite-plus/oxlint-plugin",
                },
            ],
        },
        plugins: lazyPlugins(() => [react(), seo()]),
        resolve: {
            alias: {
                "@": new URL("./src", import.meta.url).pathname,
                "@convex": new URL("./convex", import.meta.url).pathname,
            },
        },
        server: {
            // Matches SITE_URL in the Convex dev deployment and the Google
            // OAuth origin, so sign-in works locally.
            port: Number(env.PORT) || 3000,
            strictPort: true,
            proxy: {
                // Same job as the Go server's auth proxy in production.
                "/api/auth": {
                    target: env.CONVEX_SITE_URL,
                    changeOrigin: true,
                },
            },
        },
        build: {
            outDir: "server/dist",
            emptyOutDir: true,
        },
    };
});
