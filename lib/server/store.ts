/** Storefront data from the database (server only). Cached under the "catalog" tag. */
import { cacheLife, cacheTag } from "next/cache";
import { sql, type Q } from "./db";
import type { Catalog, CollectionInfo, Product } from "../catalog";
import { SIZE_ORDER } from "../catalog";
import { DEFAULT_SETTINGS, type DeliveryZone, type PrivateSettings, type StoreSettings } from "../site";

export const CATALOG_TAG = "catalog";

type ProductRow = {
  id: number; slug: string; code: string; name: string; colour_label: string; category: string | null; category_title: string | null;
  price: number; compare_at: number | null; is_new: boolean; featured: boolean; tag: string; summary: string; description: string;
  details: string[]; materials: string; care: string; extra_info: string;
  front: string | null; front_tight: string | null; back: string | null; back_tight: string | null; side: string | null;
};

const sizeRank = (s: string) => { const i = SIZE_ORDER.indexOf(s); return i < 0 ? 99 : i; };

/** Loads products (optionally including drafts, for admin previews) in storefront shape. */
export async function loadProducts(opts: { includeUnpublished?: boolean; ids?: number[] } = {}): Promise<Product[]> {
  const where = [opts.includeUnpublished ? "p.status <> 'archived'" : "p.status = 'published'"];
  const params: unknown[] = [];
  if (opts.ids) { params.push(opts.ids); where.push(`p.id = any($${params.length}::int[])`); }
  const rows = await sql<ProductRow>(`
    select p.*, c.handle as category, c.title as category_title
    from products p left join categories c on c.id = p.category_id
    where ${where.join(" and ")} order by p.sort, p.id`, params);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [variants, images, cols] = await Promise.all([
    sql<{ id: number; product_id: number; size: string; colour: string; stock: number; low_stock_at: number }>(
      "select id, product_id, size, colour, stock, low_stock_at from variants where product_id = any($1::int[]) order by sort, id", [ids]),
    sql<{ product_id: number; url: string; alt: string }>("select product_id, url, alt from product_images where product_id = any($1::int[]) order by sort, id", [ids]),
    sql<{ product_id: number; handle: string }>(
      "select cp.product_id, c.handle from collection_products cp join collections c on c.id = cp.collection_id where cp.product_id = any($1::int[])", [ids]),
  ]);
  return rows.map((r) => {
    const vs = variants.filter((v) => v.product_id === r.id)
      .map((v) => ({ id: v.id, size: v.size, colour: v.colour, stock: v.stock, lowStockAt: v.low_stock_at }));
    const sizes = [...new Set(vs.map((v) => v.size))].sort((a, b) => sizeRank(a) - sizeRank(b));
    const colours = [...new Set(vs.map((v) => v.colour).filter(Boolean))];
    const front = r.front ?? "/brand/maverick-m.svg";
    return {
      id: r.id, slug: r.slug, code: r.code, name: r.name, colour: r.colour_label || colours.join(" / "),
      category: r.category ?? "", categoryTitle: r.category_title ?? "",
      price: r.price, compareAt: r.compare_at && r.compare_at > r.price ? r.compare_at : null,
      sizes, colours, variants: vs, isNew: r.is_new, featured: r.featured,
      front, frontTight: r.front_tight ?? front, back: r.back ?? undefined, backTight: r.back_tight ?? r.back ?? undefined, side: r.side ?? undefined,
      photos: images.filter((i) => i.product_id === r.id).map((i) => ({ src: i.url, alt: i.alt || r.name })),
      tag: r.tag, summary: r.summary, description: r.description, details: r.details ?? [],
      materials: r.materials, care: r.care, extraInfo: r.extra_info,
      collections: cols.filter((c) => c.product_id === r.id).map((c) => c.handle),
    } satisfies Product;
  });
}

export async function readSettings(q?: Q): Promise<PrivateSettings> {
  const run = q ? q.query.bind(q) : sql;
  const row = (await run<{ value: Partial<PrivateSettings> }>("select value from store_settings where key = 'store'"))[0];
  const v = row?.value ?? {};
  return { ...DEFAULT_SETTINGS, orderNotifyEmail: "", ...v, socials: { ...DEFAULT_SETTINGS.socials, ...(v.socials ?? {}) }, legal: { ...DEFAULT_SETTINGS.legal, ...(v.legal ?? {}) } };
}

export const publicSettings = (s: PrivateSettings): StoreSettings => { const { orderNotifyEmail: _hidden, ...pub } = s; void _hidden; return pub; };

export async function readZones(activeOnly = true, q?: Q): Promise<(DeliveryZone & { active: boolean; sort: number })[]> {
  const run = q ? q.query.bind(q) : sql;
  const rows = await run<{ id: number; name: string; states: string[]; fee: number; eta: string; is_pickup: boolean; instructions: string; active: boolean; sort: number }>(
    `select * from delivery_zones ${activeOnly ? "where active" : ""} order by sort, id`);
  return rows.map((z) => ({ id: z.id, name: z.name, states: z.states ?? [], fee: z.fee, eta: z.eta, isPickup: z.is_pickup, instructions: z.instructions, active: z.active, sort: z.sort }));
}

/** Everything the storefront needs, cached until an admin edit or a sale invalidates the "catalog" tag. */
export async function getStorefront(): Promise<{ catalog: Catalog; settings: StoreSettings; zones: DeliveryZone[] }> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours"); // safety net; sales and admin edits refresh it straight away
  const [products, cats, cols, settings, zones] = await Promise.all([
    loadProducts(),
    sql<{ handle: string; title: string; blurb: string }>("select handle, title, blurb from categories order by sort, id"),
    sql<{ id: number; handle: string; title: string; blurb: string }>("select id, handle, title, blurb from collections where visible order by sort, id"),
    readSettings(),
    readZones(true),
  ]);
  const members = await sql<{ handle: string; slug: string }>(
    "select c.handle, p.slug from collection_products cp join collections c on c.id = cp.collection_id join products p on p.id = cp.product_id order by cp.sort");
  const published = new Set(products.map((p) => p.slug));
  const collections: CollectionInfo[] = [
    { handle: "all", title: "Shop All", blurb: "Every piece in the store.", slugs: products.map((p) => p.slug), kind: "all" },
    ...cols.map((c) => ({ handle: c.handle, title: c.title, blurb: c.blurb, kind: "collection" as const,
      slugs: members.filter((m) => m.handle === c.handle && published.has(m.slug)).map((m) => m.slug) })),
    ...cats.map((c) => ({ handle: c.handle, title: c.title, blurb: c.blurb, kind: "category" as const,
      slugs: products.filter((p) => p.category === c.handle).map((p) => p.slug) })),
  ];
  return {
    catalog: { products, categories: cats, collections },
    settings: publicSettings(settings),
    zones: zones.map(({ active: _a, sort: _s, ...z }) => { void _a; void _s; return z; }),
  };
}
