import { revalidateTag } from "next/cache";
import { adminFromRequest } from "@/lib/server/admin";
import { addGalleryImage, setProductImage } from "@/lib/server/admin-data";
import { ALLOWED_IMAGE, MAX_IMAGE_BYTES, storeGarment, storePhoto } from "@/lib/server/media";
import { CATALOG_TAG } from "@/lib/server/store";
import { one } from "@/lib/server/db";

/** Admin image upload: garment cut-outs (front/back/side) or gallery photos. */
export async function POST(request: Request) {
  const admin = await adminFromRequest(request);
  if (!admin) return Response.json({ error: "Sign in again." }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const productId = Number(form?.get("productId"));
  const slot = String(form?.get("slot") ?? "");
  if (!(file instanceof File) || !file.size) return Response.json({ error: "Choose an image." }, { status: 400 });
  if (!ALLOWED_IMAGE.includes(file.type)) return Response.json({ error: "Use a JPG, PNG, WebP or HEIC image." }, { status: 415 });
  if (file.size > MAX_IMAGE_BYTES) return Response.json({ error: "That image is over 12 MB. Export a smaller copy." }, { status: 413 });
  if (!["front", "back", "side", "gallery"].includes(slot) || !(await one("select 1 from products where id = $1", [productId]))) {
    return Response.json({ error: "Unknown product or image slot." }, { status: 400 });
  }
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    if (slot === "gallery") {
      const url = await storePhoto(buf, file.name);
      await addGalleryImage(admin, productId, url, String(form?.get("alt") ?? "").slice(0, 200));
    } else {
      const { url, tightUrl } = await storeGarment(buf, file.name, form?.get("removeBg") === "on");
      await setProductImage(admin, productId, slot as "front" | "back" | "side", url, tightUrl);
    }
    revalidateTag(CATALOG_TAG, { expire: 0 });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[media upload]", e);
    return Response.json({ error: "We couldn't process that image. Try a different file." }, { status: 422 });
  }
}
