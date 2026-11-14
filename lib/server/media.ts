/**
 * Image processing and storage for admin uploads (server only).
 * Images are stored in the database (media table) and served from /media/<id>, so no extra storage service is needed.
 */
import sharp from "sharp";
import { one } from "./db";

const CW = 800, CH = 1240; // 200 x 310 rail canvas at 4x

async function store(bytes: Buffer, mime: string, filename: string, w?: number, h?: number) {
  const row = await one<{ id: string }>("insert into media (filename, mime, bytes, width, height) values ($1, $2, $3, $4, $5) returning id", [filename.slice(0, 120), mime, bytes, w ?? null, h ?? null]);
  return `/media/${row!.id}.${mime === "image/png" ? "png" : "webp"}`;
}

/** Removes a plain studio background (flood fill from the edges) and keeps the largest shape. */
async function removeBackground(input: Buffer, tolerance = 60) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, px = (x: number, y: number) => (y * W + x) * 4;
  const samples: number[] = [];
  for (let x = 0; x < W; x += 5) samples.push(px(x, 0), px(x, H - 1));
  for (let y = 0; y < H; y += 5) samples.push(px(0, y), px(W - 1, y));
  const med = [0, 1, 2].map((c) => samples.map((i) => data[i + c]!).sort((a, b) => a - b)[samples.length >> 1]!);
  const bg = new Uint8Array(W * H); const stack: number[] = [];
  const push = (x: number, y: number) => {
    const k = y * W + x, i = k * 4;
    if (!bg[k] && Math.hypot(data[i]! - med[0]!, data[i + 1]! - med[1]!, data[i + 2]! - med[2]!) < tolerance) { bg[k] = 1; stack.push(k); }
  };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
  for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
  while (stack.length) { const k = stack.pop()!, x = k % W, y = (k / W) | 0; if (x) push(x - 1, y); if (x < W - 1) push(x + 1, y); if (y) push(x, y - 1); if (y < H - 1) push(x, y + 1); }
  // keep the largest foreground shape
  const lab = new Int32Array(W * H); let best = 0, bestArea = 0, n = 0;
  for (let s = 0; s < W * H; s++) {
    if (bg[s] || lab[s]) continue;
    n++; const q = [s]; lab[s] = n; let area = 0;
    while (q.length) { const k = q.pop()!; area++; const x = k % W, y = (k / W) | 0;
      for (const [a, b] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as const) { if (a < 0 || b < 0 || a >= W || b >= H) continue; const j = b * W + a; if (!bg[j] && !lab[j]) { lab[j] = n; q.push(j); } } }
    if (area > bestArea) { bestArea = area; best = n; }
  }
  for (let k = 0; k < W * H; k++) if (lab[k] !== best) data[k * 4 + 3] = 0;
  return sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}

/** A garment cut-out: the rail canvas version plus a tightly cropped version for cards. */
export async function storeGarment(file: Buffer, filename: string, removeBg: boolean) {
  let img = await sharp(file).rotate().resize({ width: 1400, height: 1800, fit: "inside", withoutEnlargement: true }).png().toBuffer();
  if (removeBg) img = await removeBackground(img);
  const trimmed = await sharp(img).trim({ threshold: 1 }).png().toBuffer().catch(() => img);
  const meta = await sharp(trimmed).metadata();
  const scale = Math.min((CW * 0.96) / (meta.width ?? CW), (CH * 0.9) / (meta.height ?? CH));
  const w = Math.max(1, Math.round((meta.width ?? CW) * scale)), h = Math.max(1, Math.round((meta.height ?? CH) * scale));
  const resized = await sharp(trimmed).resize(w, h).png().toBuffer();
  const canvas = await sharp({ create: { width: CW, height: CH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: resized, left: Math.round((CW - w) / 2), top: Math.round(CH * 0.035) }]).png({ compressionLevel: 9 }).toBuffer();
  const tight = await sharp(trimmed).resize({ width: 1000, withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
  return { url: await store(canvas, "image/png", filename, CW, CH), tightUrl: await store(tight, "image/png", `tight-${filename}`) };
}

/** A gallery photo, resized and compressed. */
export async function storePhoto(file: Buffer, filename: string) {
  const out = await sharp(file).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
  return store(out.data, "image/webp", filename, out.info.width, out.info.height);
}

export const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"];
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
