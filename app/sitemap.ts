import type { MetadataRoute } from "next";
import { COLLECTIONS, products } from "@/lib/catalog";

const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/lookbook", "/about", "/contact", "/size-guide", "/shipping-returns", "/faq", "/terms", "/privacy"];
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.5 })),
    ...Object.keys(COLLECTIONS).map((h) => ({ url: `${base}/collections/${h}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: `${base}/products/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.9, images: [`${base}${p.photos[0]?.src ?? p.front}`] })),
  ];
}
