// Renders the OG image and app icons into public/.
// Needs Playwright with Chromium: `npx playwright install chromium`, then
// `node scripts/og/render.mjs` from the repo root.
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const root = new URL("../../", import.meta.url);
const browser = await chromium.launch();

const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await og.goto(new URL("scripts/og/og.html", root).href, { waitUntil: "networkidle" });
await og.evaluate(() => document.fonts.ready);
await og.screenshot({ path: new URL("public/og.png", root).pathname });

// PNG icons: full-bleed cobalt square (iOS fills transparency with black),
// with the favicon's cookie inside the maskable safe zone
const cookiePath = readFileSync(new URL("public/favicon.svg", root), "utf8").match(
    / d="([^"]+)"/,
)[1];
const iconHtml = `<!doctype html><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wdth,wght,ROND@125,900,100&display=block">
<body style="margin:0;width:100vw;height:100vh;display:grid;place-items:center;background:#2f5ea8">
<svg viewBox="0 0 64 64" style="width:68%"><path fill="#84efba" d="${cookiePath}"/>
<text x="32" y="45" text-anchor="middle" font-family="Google Sans Flex" font-size="38" font-weight="900" fill="#05438d">?</text></svg>`;
for (const size of [180, 192, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(iconHtml, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const name = size === 180 ? "apple-touch-icon.png" : `icon-${size}.png`;
    await page.screenshot({ path: new URL(`public/${name}`, root).pathname });
}

await browser.close();
