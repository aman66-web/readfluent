#!/usr/bin/env node
// Renders Pluto, the mascot, from its three.js model (scripts/mascot/pluto.js) into the images the app layers
// (components/mascot/pluto/*.webp). Needs the Chromium that Playwright uses (software WebGL is fine) and `three` (a dev
// dependency). Run after changing the model:
//
//   node scripts/mascot/render.mjs                 (writes components/mascot/pluto/*.webp)
//   CHROMIUM=/path/to/chrome node scripts/mascot/render.mjs
//
// If an arm's shoulder moves, update scripts/mascot/pivots.json and PIVOT in components/mascot/Mascot.tsx.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "components/mascot/pluto");
export const ASSETS = ["hello-base", "hello-arm", "hello-blink", "hello-talk", "reading", "reading-blink", "cheer-base", "cheer-arm-l", "cheer-arm-r", "sleepy", "ready", "ready-blink", "ready-talk"];

let chromium;
try { ({ chromium } = await import("playwright-core")); } catch { ({ chromium } = await import("/opt/node-tools/node_modules/playwright-core/index.mjs")); }

const TYPES = { ".js": "text/javascript", ".mjs": "text/javascript", ".html": "text/html" };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(p)] ?? "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 720, height: 720 } });
page.on("pageerror", (e) => console.error("page:", e.message));
await page.goto(`${base}/scripts/mascot/harness.html`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
fs.mkdirSync(OUT, { recursive: true });
let total = 0;
for (const name of ASSETS) {
  const webp = await page.evaluate(async ([u, n]) => {
    const png = await window.renderAsset(u, n);
    const img = new Image(); img.src = png; await img.decode();
    const c = document.createElement("canvas"); c.width = c.height = 720;
    c.getContext("2d").drawImage(img, 0, 0);
    return c.toDataURL("image/webp", 0.86);
  }, [`/scripts/mascot/pluto.js?v=${Date.now()}`, name]);
  const buf = Buffer.from(webp.split(",")[1], "base64");
  fs.writeFileSync(path.join(OUT, `${name}.webp`), buf);
  total += buf.length;
  console.log(`${name}.webp`, Math.round(buf.length / 1024), "KB");
}
await browser.close();
server.close();
console.log("total", Math.round(total / 1024), "KB ->", path.relative(ROOT, OUT));
