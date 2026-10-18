#!/usr/bin/env node
// Regenerates every raster icon and splash screen from the three SVGs in public/:
//   icon.svg          the full icon (full-bleed, opaque): web, iOS, Android legacy and the Play store icon
//   icon-maskable.svg the same with the book pulled in to sit inside a maskable icon's safe circle
//   icon-mark.svg     the book on its own, no ground: Android's adaptive-icon foreground
// Edit those SVGs and rerun; web, iOS and Android all follow. Uses sharp (already a dependency), so it runs on a Mac:
//
//   node scripts/make-icons.mjs
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const at = (...p) => path.join(root, ...p);
const R = at("android/app/src/main/res");
const PAPER = "#FFFFFF";
const GROUND = "#0FA5C6"; // the icon's mid cyan, behind the adaptive foreground (values/ic_launcher_background.xml)

const master = (svg) => sharp(fs.readFileSync(at("public", svg)), { density: 72 }).resize(1024, 1024).png().toBuffer();
const [ICON, MASK, MARK] = await Promise.all([master("icon.svg"), master("icon-maskable.svg"), master("icon-mark.svg")]);

const write = async (img, out) => { fs.mkdirSync(path.dirname(out), { recursive: true }); await img.toFile(out); };
const resized = (buf, size) => sharp(buf).resize(size, size, { kernel: "lanczos3" }).png();

// Web
await write(resized(ICON, 192), at("public/icon-192.png"));
await write(resized(ICON, 512), at("public/icon-512.png"));
await write(resized(MASK, 512), at("public/icon-maskable-512.png"));
await write(resized(ICON, 180), at("public/apple-touch-icon.png"));
await write(resized(ICON, 512), at("public/store/icon-512.png"));

// favicon.ico: PNG images inside an ICO container, 16, 32 and 48 px.
{
  const sizes = [16, 32, 48];
  const pngs = await Promise.all(sizes.map((s) => resized(ICON, s).toBuffer()));
  const head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  let offset = head.length;
  sizes.forEach((s, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(s, e); head.writeUInt8(s, e + 1); head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(pngs[i].length, e + 8); head.writeUInt32LE(offset, e + 12);
    offset += pngs[i].length;
  });
  fs.writeFileSync(at("public/favicon.ico"), Buffer.concat([head, ...pngs]));
}

// iOS: the icon is full-bleed and opaque (Apple rejects an alpha channel); the splash is paper with the icon tile centred.
await write(sharp(ICON).flatten({ background: GROUND }).removeAlpha().png(), at("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"));

// The splash picture: the icon as a rounded tile on transparent, so it shows on paper.
const tile = async (size) => {
  const radius = Math.round(size * 0.225);
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#fff"/></svg>`);
  return resized(ICON, size).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
};
const onPaper = async (w, h, tileSize, out) => {
  const t = await tile(tileSize);
  await write(sharp({ create: { width: w, height: h, channels: 3, background: PAPER } }).composite([{ input: t, gravity: "center" }]).png(), out);
};
for (const f of ["splash-2732x2732", "splash-2732x2732-1", "splash-2732x2732-2"]) {
  await onPaper(2732, 2732, 640, at("ios/App/App/Assets.xcassets/Splash.imageset", `${f}.png`));
}

// Android launcher: legacy square and round icons, and the adaptive foreground (the book inside the central 66%, on transparent).
const LEGACY = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const FORE = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
for (const d of Object.keys(LEGACY)) {
  const s = LEGACY[d], fs_ = FORE[d];
  await write(resized(ICON, s), path.join(R, `mipmap-${d}`, "ic_launcher.png"));
  const circle = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${s / 2}" fill="#fff"/></svg>`);
  await write(resized(ICON, s).composite([{ input: circle, blend: "dest-in" }]).png(), path.join(R, `mipmap-${d}`, "ic_launcher_round.png"));
  const inner = Math.round((fs_ * 66) / 100);
  const mark = await resized(MARK, inner).toBuffer();
  await write(sharp({ create: { width: fs_, height: fs_, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: mark, gravity: "center" }]).png(), path.join(R, `mipmap-${d}`, "ic_launcher_foreground.png"));
}

// Android splash: paper with the tile centred, portrait and landscape.
const specs = {
  "port-mdpi": [320, 480], "port-hdpi": [480, 800], "port-xhdpi": [720, 1280], "port-xxhdpi": [960, 1600], "port-xxxhdpi": [1280, 1920],
  "land-mdpi": [480, 320], "land-hdpi": [800, 480], "land-xhdpi": [1280, 720], "land-xxhdpi": [1600, 960], "land-xxxhdpi": [1920, 1280],
};
for (const [k, [w, h]] of Object.entries(specs)) await onPaper(w, h, Math.round((Math.min(w, h) * 40) / 100), path.join(R, `drawable-${k}`, "splash.png"));
await onPaper(480, 320, Math.round((320 * 40) / 100), path.join(R, "drawable", "splash.png"));

console.log("icons regenerated");
