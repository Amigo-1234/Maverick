import type { MetadataRoute } from "next";
import { getStorefront } from "@/lib/server/store";

const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { catalog } = await getStorefront();
  const pages = ["", "/track-order", "/lookbook", "/about", "/contact", "/size-guide", "/shipping-returns", "/faq", "/terms", "/privacy"];
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.5 })),
    ...catalog.collections.map(({ handle: h }) => ({ url: `${base}/collections/${h}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...catalog.products.map((p) => ({ url: `${base}/products/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.9, images: [`${base}${p.photos[0]?.src ?? p.front}`] })),
  ];
}
