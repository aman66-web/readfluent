#!/usr/bin/env node
// Renders Pluto's wardrobe from the three.js model (scripts/mascot/pluto.js) into transparent layers the app lays
// straight over Pluto's own (components/mascot/pluto/*.webp): the same 720x720 frame, camera and light.
//
//   acc-<item>-<base>  an accessory on the head of one pose (6 items x 5 bases; blink and talk frames share their base)
//   pet-<name>         a companion on the ground to Pluto's left (u 6-78, v 160-230 of the 240 box)
//
// Needs the Chromium that Playwright uses (software WebGL is fine) and `three` (a dev dependency). Run after changing
// the model:
//
//   node scripts/mascot/wardrobe.mjs               (writes the 34 wardrobe layers; Pluto's 13 are render.mjs's)
//   CHROMIUM=/path/to/chrome node scripts/mascot/wardrobe.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "components/mascot/pluto");
export const ITEMS = ["crown", "party", "beanie", "wizard", "headphones", "shades"];
export const BASES = ["hello-base", "reading", "cheer-base", "sleepy", "ready"];
export const PETS = ["moon", "ufo", "robodog", "comet"];
export const WARDROBE = [...ITEMS.flatMap((item) => BASES.map((base) => `acc-${item}-${base}`)), ...PETS.map((p) => `pet-${p}`)];

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
for (const [i, name] of WARDROBE.entries()) {
  const mod = `/scripts/mascot/pluto.js?v=${Date.now()}-${i}`; // a fresh module per layer, as render.mjs does
  const webp = await page.evaluate(async ([u, n]) => {
    const png = await window.renderAsset(u, n);
    const img = new Image(); img.src = png; await img.decode();
    const c = document.createElement("canvas"); c.width = c.height = 720;
    c.getContext("2d").drawImage(img, 0, 0);
    return c.toDataURL("image/webp", 0.86);
  }, [mod, name]);
  const buf = Buffer.from(webp.split(",")[1], "base64");
  fs.writeFileSync(path.join(OUT, `${name}.webp`), buf);
  total += buf.length;
  console.log(`${name}.webp`, Math.round(buf.length / 1024), "KB");
}
await browser.close();
server.close();
console.log(WARDROBE.length, "layers, total", Math.round(total / 1024), "KB ->", path.relative(ROOT, OUT));
