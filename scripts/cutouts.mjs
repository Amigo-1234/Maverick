// Cuts the client's garments out of their studio backgrounds and places each
// front/back pair on matching 200x310 (x4) transparent canvases for ClothingRailHero.
// Usage: node scripts/cutouts.mjs
import sharp from "sharp";
import path from "node:path";

const SRC = path.resolve("source-images");
const OUT = path.resolve("public/garments");
const CW = 800, CH = 1240;           // 200 x 310 at 4x
const TOL = 70;                      // colour distance treated as background
const MIN_AREA = 0.002;              // drop specks smaller than this share of the image

async function load(file) {
  const { data, info } = await sharp(path.join(SRC, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function cutout(img, crop, largest = false, tol = TOL) {
  const { data, w } = img;
  const [x0, y0, cw, ch] = crop ?? [0, 0, img.w, img.h];
  const px = (x, y) => ((y0 + y) * w + (x0 + x)) * 4;
  // background colour = median of border samples
  const samples = [];
  for (let x = 0; x < cw; x += 7) samples.push(px(x, 0), px(x, ch - 1));
  for (let y = 0; y < ch; y += 7) samples.push(px(0, y), px(cw - 1, y));
  const med = [0, 1, 2].map((c) => samples.map((i) => data[i + c]).sort((a, b) => a - b)[samples.length >> 1]);
  const dist = (i) => Math.hypot(data[i] - med[0], data[i + 1] - med[1], data[i + 2] - med[2]);
  // flood fill background from every border pixel
  const bg = new Uint8Array(cw * ch);
  const stack = [];
  const push = (x, y) => { const k = y * cw + x; if (!bg[k] && dist(px(x, y)) < tol) { bg[k] = 1; stack.push(k); } };
  for (let x = 0; x < cw; x++) { push(x, 0); push(x, ch - 1); }
  for (let y = 0; y < ch; y++) { push(0, y); push(cw - 1, y); }
  while (stack.length) {
    const k = stack.pop(); const x = k % cw, y = (k / cw) | 0;
    if (x > 0) push(x - 1, y); if (x < cw - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1); if (y < ch - 1) push(x, y + 1);
  }
  // keep only sizeable foreground components
  const lab = new Int32Array(cw * ch); let n = 0; const keep = new Set(); let big = 0, bigArea = 0;
  for (let s = 0; s < cw * ch; s++) {
    if (bg[s] || lab[s]) continue;
    n++; const q = [s]; lab[s] = n; let area = 0;
    while (q.length) {
      const k = q.pop(); area++; const x = k % cw, y = (k / cw) | 0;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
        const j = ny * cw + nx; if (!bg[j] && !lab[j]) { lab[j] = n; q.push(j); }
      }
    }
    if (area > cw * ch * MIN_AREA) keep.add(n);
    if (area > bigArea) { bigArea = area; big = n; }
  }
  if (largest) { keep.clear(); keep.add(big); }
  const out = Buffer.alloc(cw * ch * 4);
  let bx0 = cw, by0 = ch, bx1 = 0, by1 = 0;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const k = y * cw + x, o = k * 4, i = px(x, y);
    out[o] = data[i]; out[o + 1] = data[i + 1]; out[o + 2] = data[i + 2];
    const on = !bg[k] && keep.has(lab[k]);
    out[o + 3] = on ? 255 : 0;
    if (on) { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); }
  }
  return { buf: out, w: cw, h: ch, box: [bx0, by0, bx1 - bx0 + 1, by1 - by0 + 1] };
}

async function trimmed(c) {
  // soften the cut edge by 0.6px, then crop to the garment
  const [x, y, w, h] = c.box;
  const png = await sharp(c.buf, { raw: { width: c.w, height: c.h, channels: 4 } }).extract({ left: x, top: y, width: w, height: h }).png().toBuffer();
  const alpha = await sharp(png).extractChannel(3).blur(0.6).toBuffer();
  const rgb = await sharp(png).removeAlpha().toBuffer();
  return { png: await sharp(rgb).joinChannel(alpha).png().toBuffer(), w, h };
}

async function place(piece, scale, name) {
  const w = Math.round(piece.w * scale), h = Math.round(piece.h * scale);
  const resized = await sharp(piece.png).resize(w, h).toBuffer();
  await sharp({ create: { width: CW, height: CH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: resized, left: Math.round((CW - w) / 2), top: Math.round(CH * 0.035) }])
    .png({ compressionLevel: 9 }).toFile(path.join(OUT, name));
  // tightly cropped copy for product cards and galleries
  await sharp(piece.png).resize({ width: Math.min(1000, piece.w) }).png({ compressionLevel: 9 }).toFile(path.join(OUT, name.replace(".png", "-tight.png")));
  console.log("wrote", name, `${w}x${h}`);
}

/** Removes the photographed hanger hook: clears every row above the first one where the
 *  garment is at least `minShare` of its widest row (the hook is a thin stem). */
/** Shrinks the cut-out by `n` px to strip a thin halo left by an unevenly lit backdrop. */
function erode(c, n = 2) {
  for (let pass = 0; pass < n; pass++) {
    const a = new Uint8Array(c.w * c.h);
    for (let i = 0; i < a.length; i++) a[i] = c.buf[i * 4 + 3];
    for (let y = 1; y < c.h - 1; y++) for (let x = 1; x < c.w - 1; x++) {
      const k = y * c.w + x;
      if (a[k] && (!a[k - 1] || !a[k + 1] || !a[k - c.w] || !a[k + c.w])) c.buf[k * 4 + 3] = 0;
    }
  }
  return c;
}

/** Fills each row solid between the garment's outermost pixels. Restores print outlines that
 *  match the backdrop colour (e.g. a black outline on a white tee shot against black). */
function rowFill(c) {
  for (let y = 0; y < c.h; y++) {
    let x0 = -1, x1 = -1;
    for (let x = 0; x < c.w; x++) if (c.buf[(y * c.w + x) * 4 + 3]) { if (x0 < 0) x0 = x; x1 = x; }
    for (let x = x0; x0 >= 0 && x <= x1; x++) c.buf[(y * c.w + x) * 4 + 3] = 255;
  }
  return c;
}

function dropHanger(c, minShare = 0.2) {
  const rowW = new Array(c.h).fill(0);
  for (let y = 0; y < c.h; y++) {
    let x0 = -1, x1 = -1;
    for (let x = 0; x < c.w; x++) if (c.buf[(y * c.w + x) * 4 + 3]) { if (x0 < 0) x0 = x; x1 = x; }
    rowW[y] = x0 < 0 ? 0 : x1 - x0 + 1;
  }
  const max = Math.max(...rowW);
  const top = rowW.findIndex((w) => w >= max * minShare);
  for (let y = 0; y < top; y++) for (let x = 0; x < c.w; x++) c.buf[(y * c.w + x) * 4 + 3] = 0;
  let bx0 = c.w, by0 = c.h, bx1 = 0, by1 = 0;
  for (let y = top; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.buf[(y * c.w + x) * 4 + 3]) {
    bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y);
  }
  c.box = [bx0, by0, bx1 - bx0 + 1, by1 - by0 + 1];
  return c;
}

// One scale per product so front and back match in size as the piece turns.
// The side view is scaled so its collar-to-hem length matches the front's.
async function product(slug, front, back, side) {
  const pieces = [front, back].filter(Boolean);
  const maxW = Math.max(...pieces.map((p) => p.w));
  const maxH = Math.max(...pieces.map((p) => p.h));
  const scale = Math.min((CW * 0.96) / maxW, (CH * 0.9) / maxH);
  await place(front, scale, `${slug}-front.png`);
  if (back) await place(back, scale, `${slug}-back.png`);
  if (side) await place(side, (front.h * scale) / side.h, `${slug}-side.png`);
}

const sideCut = async (file, { tol = TOL, shrink = 0, fill = false } = {}) => {
  let c = erode(cutout(await load(file), null, true, tol), shrink);
  if (fill) c = rowFill(c);
  return trimmed(dropHanger(c));
};

const r = async (n, crop) => trimmed(cutout(await load(`reference_${String(n).padStart(2, "0")}.jpeg`), crop));
const ref1 = await load("reference_01.jpeg");
const half = Math.round(ref1.h * 0.5);

await product("layered-longsleeve", await trimmed(cutout(ref1, [0, 0, ref1.w, half], true)), await trimmed(cutout(ref1, [0, half, ref1.w, ref1.h - half], true)));
await product("strike-black", await r(4), await r(2), await sideCut("sides/strike-black-side-front.jpg", { tol: 40, shrink: 2 }));
await product("strike-white", await r(8), await r(3), await sideCut("sides/strike-white-side-front.jpg", { fill: true }));
await product("peel", await r(5));
await product("horned-ringer", await r(7));
await product("star-ringer", await r(9), await r(6));
