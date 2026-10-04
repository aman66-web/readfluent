#!/usr/bin/env node
// The app icon: Pluto waving, on a deep-to-bright cyan sky with a soft glow, an orbit ring and a few stars (owner, 4 Oct 2026:
// "too bland, doesn't stand out, something with Pluto in"). Renders Pluto's head and waving arm from the 3D model at high
// resolution, and writes public/icon.svg and public/icon-maskable.svg with the picture inside. Then run
// ./scripts/make-icons.sh to make every PNG (web, iOS, Android) from them.
//
//   node scripts/mascot/icon.mjs && ./scripts/make-icons.sh
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
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

const SIZE = 2048;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
page.on("pageerror", (e) => console.error("page:", e.message));
await page.goto(`${base}/scripts/mascot/harness.html?size=${SIZE}`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
const mod = `/scripts/mascot/pluto.js?v=${Date.now()}`;
const bodyPng = await page.evaluate(([u]) => window.renderAsset(u, "hello-base"), [mod]);
const armPng = await page.evaluate(([u]) => window.renderAsset(u, "hello-arm"), [mod]);

// The head and the waving hand: a square of the 240 box around them, at 840 px. The icon shows the head and shoulders; the
// maskable one (which phones cut to a circle or a squircle) a wider square, so all of the head stays inside the safe zone.
const OUT = 840;
const crop = (u, v, side) => page.evaluate(async ([a, b, size, out, u, v, side]) => {
  const load = async (src) => { const i = new Image(); i.src = src; await i.decode(); return i; };
  const [body, arm] = await Promise.all([load(a), load(b)]);
  const k = size / 240;
  const c = document.createElement("canvas"); c.width = c.height = out;
  const x = c.getContext("2d");
  x.imageSmoothingQuality = "high";
  for (const im of [body, arm]) x.drawImage(im, u * k, v * k, side * k, side * k, 0, 0, out, out);
  return c.toDataURL("image/webp", 0.9);
}, [bodyPng, armPng, SIZE, OUT, u, v, side]);
const head = await crop(46, 25, 150);
const wide = await crop(28, 22, 186);
const whole = await crop(14, 18, 212);
await browser.close();
server.close();

const sparkle = (x, y, r, o = 1) => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="#fff" opacity="${o}"/>`;
// Background lines each carry `<rect` so make-icons.sh can strip them to get the mark alone (the splash).
// The picture runs to the bottom edge, so the body is never cut short inside the icon.
const svg = ({ img, at, size, ring }) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-label="ReadFluent">
<defs><linearGradient id="bg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#075E77"/><stop offset=".55" stop-color="#0FA5C6"/><stop offset="1" stop-color="#4FE3F7"/></linearGradient><radialGradient id="glow" cx=".5" cy=".46" r=".5"><stop offset="0" stop-color="#E9FDFF" stop-opacity=".75"/><stop offset=".55" stop-color="#9BEFFB" stop-opacity=".22"/><stop offset="1" stop-color="#9BEFFB" stop-opacity="0"/></radialGradient></defs>
<rect width="1024" height="1024" fill="url(#bg)"/>
<rect width="1024" height="1024" fill="url(#glow)"/>
<g>${[[170, 190, 22, 0.95], [860, 230, 16, 0.9], [150, 760, 14, 0.7], [880, 700, 24, 0.95], [800, 120, 9, 0.7], [250, 100, 8, 0.6]].map(([x, y, r, o]) => sparkle(x, y, r, o)).join("")}</g>
${ring}
<image href="${img}" x="${at[0]}" y="${at[1]}" width="${size}" height="${size}"/>
</svg>
`;
const ringFull = `<ellipse cx="512" cy="600" rx="440" ry="130" transform="rotate(-14 512 600)" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="16"/>`;
const ringMask = `<ellipse cx="512" cy="590" rx="350" ry="104" transform="rotate(-14 512 590)" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="13"/>`;
fs.writeFileSync(path.join(ROOT, "public/icon.svg"), svg({ img: head, at: [62, 1024 - 900], size: 900, ring: ringFull }));
fs.writeFileSync(path.join(ROOT, "public/icon-maskable.svg"), svg({ img: wide, at: [102, 1024 - 820], size: 820, ring: ringMask }));
// The whole of Pluto on nothing, for the splash screens and Android's adaptive icon (make-icons.sh centres it).
fs.writeFileSync(path.join(ROOT, "public/icon-mark.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><image href="${whole}" x="0" y="0" width="1024" height="1024"/></svg>\n`);
console.log("wrote public/icon.svg and public/icon-maskable.svg", Math.round(head.length / 1024), "KB of picture each");
