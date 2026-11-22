// Makes every app icon from the one drawing, src/app/icon.svg:
//   node scripts/make-icons.mjs
// src/app/apple-icon.png (180, iPad and iPhone home screen), public/icons/*.png
// (the install icons in app/manifest.ts) and src/app/favicon.ico (16, 32, 48).
// iPhone/iPad and Android's maskable icon get a full-bleed square, because the
// phone cuts its own rounded shape; the others keep the drawing's rounded corners.
// Uses the preinstalled Playwright Chromium, so it needs no image library.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Playwright is preinstalled outside the project, so it is found the CommonJS way (as in android-check.mjs).
const { chromium } = createRequire(import.meta.url)("playwright");
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const rounded = fs.readFileSync(path.join(root, "src/app/icon.svg"), "utf8");
const square = rounded.replace(/ rx="\d+"/, "");

const browser = await chromium.launch();
const page = await browser.newPage();
async function png(svg, size, transparent) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body>`);
  return page.screenshot({ omitBackground: transparent });
}
const write = (rel, data) => fs.writeFileSync(path.join(root, rel), data);
fs.mkdirSync(path.join(root, "public/icons"), { recursive: true });
write("src/app/apple-icon.png", await png(square, 180, false));
write("public/icons/icon-192.png", await png(rounded, 192, true));
write("public/icons/icon-512.png", await png(rounded, 512, true));
write("public/icons/icon-maskable-512.png", await png(square, 512, false));

// An .ico that holds PNG images, which every current browser reads.
const sizes = [16, 32, 48];
const images = [];
for (const s of sizes) images.push(await png(rounded, s, true));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const at = 6 + 16 * i;
  header.writeUInt8(s, at);
  header.writeUInt8(s, at + 1);
  header.writeUInt16LE(1, at + 4);
  header.writeUInt16LE(32, at + 6);
  header.writeUInt32LE(images[i].length, at + 8);
  header.writeUInt32LE(offset, at + 12);
  offset += images[i].length;
});
write("src/app/favicon.ico", Buffer.concat([header, ...images]));
await browser.close();
console.log("Icons written.");
