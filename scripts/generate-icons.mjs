// Generates PWA icons from an inline SVG. Run: npm run icons
// Mark: a hairline progress ring on black — the same motif the app uses for milestones.
import sharp from "sharp";

const mark = (scale) => {
  const r = 150 * scale;
  const c = 2 * Math.PI * r;
  return `
  <circle cx="256" cy="256" r="${r}" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="${22 * scale}"/>
  <circle cx="256" cy="256" r="${r}" fill="none" stroke="#0070d1" stroke-width="${22 * scale}" stroke-linecap="round"
    stroke-dasharray="${c * 0.72} ${c}" transform="rotate(-90 256 256)"/>
  <circle cx="256" cy="256" r="${18 * scale}" fill="#ffffff"/>`;
};
const svg = (rounded, scale) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="#000000"/>${mark(scale)}</svg>`;

const out = [
  ["public/icons/icon-192.png", 192, svg(true, 1)],
  ["public/icons/icon-512.png", 512, svg(true, 1)],
  ["public/icons/icon-maskable-512.png", 512, svg(false, 0.72)],
  ["public/icons/apple-touch-icon.png", 180, svg(false, 0.85)],
  ["app/icon.png", 192, svg(true, 1)],
  ["app/apple-icon.png", 180, svg(false, 0.85)],
];
for (const [file, size, s] of out) await sharp(Buffer.from(s)).resize(size, size).png().toFile(file);
console.log("icons written");
