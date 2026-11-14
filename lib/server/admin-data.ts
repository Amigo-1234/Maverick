/** Queries and mutations behind the admin dashboard (server only). Callers must have run requireAdmin(). */
import { one, sql, tx } from "./db";
import { logActivity, type Admin } from "./admin";
import type { PrivateSettings } from "../site";
import { readSettings } from "./store";

const int = (v: unknown, d = 0) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : d; };

// ───────────── Dashboard ─────────────
export async function dashboard(from: string, to: string) {
  const range = [from, to];
  const paidIn = "payment_status in ('paid','partially_refunded','refunded') and paid_at >= $1::date and paid_at < $2::date + 1";
  const [money, counts, stock, series, top, recentOrders, recentInquiries] = await Promise.all([
    one<{ sales: number; gross: number; refunds: number }>(`select count(*)::int as sales, coalesce(sum(total),0)::int as gross, coalesce(sum(refunded_amount),0)::int as refunds from orders where ${paidIn}`, range),
    one<{ all_orders: number; awaiting_payment: number; to_fulfil: number; processing: number; shipped: number; delivered: number; attention: number }>(`
      select count(*) filter (where created_at >= $1::date and created_at < $2::date + 1)::int as all_orders,
             count(*) filter (where payment_status = 'pending' and stock_state = 'reserved')::int as awaiting_payment,
             count(*) filter (where payment_status = 'paid' and fulfilment_status = 'unfulfilled')::int as to_fulfil,
             count(*) filter (where fulfilment_status in ('processing','preparing'))::int as processing,
             count(*) filter (where fulfilment_status = 'shipped')::int as shipped,
             count(*) filter (where fulfilment_status = 'delivered' and updated_at >= $1::date and updated_at < $2::date + 1)::int as delivered,
             count(*) filter (where needs_attention <> '')::int as attention
      from orders`, range),
    one<{ in_stock: number; low: number; sold_out: number; units: number }>(`
      select count(distinct p.id) filter (where v.stock > 0)::int as in_stock,
             count(*) filter (where v.stock > 0 and v.stock <= v.low_stock_at)::int as low,
             count(*) filter (where v.stock = 0)::int as sold_out,
             coalesce(sum(v.stock),0)::int as units
      from variants v join products p on p.id = v.product_id where p.status = 'published'`),
    sql<{ day: string; revenue: number; orders: number }>(`
      select to_char(d, 'YYYY-MM-DD') as day,
             coalesce((select sum(total - refunded_amount) from orders o where o.payment_status in ('paid','partially_refunded','refunded') and o.paid_at >= d and o.paid_at < d + interval '1 day'), 0)::int as revenue,
             coalesce((select count(*) from orders o where o.payment_status in ('paid','partially_refunded','refunded') and o.paid_at >= d and o.paid_at < d + interval '1 day'), 0)::int as orders
      from generate_series($1::date, $2::date, interval '1 day') d order by d`, range),
    sql<{ name: string; colour: string; units: number; revenue: number }>(`
      select i.name, i.colour, sum(i.qty)::int as units, sum(i.total)::int as revenue from order_items i join orders o on o.id = i.order_id
      where o.payment_status in ('paid','partially_refunded','refunded') and o.paid_at >= $1::date and o.paid_at < $2::date + 1
      group by i.name, i.colour order by units desc limit 5`, range),
    sql<{ id: string; number: string; first_name: string; last_name: string; total: number; payment_status: string; fulfilment_status: string; created_at: Date }>(
      "select id, number, first_name, last_name, total, payment_status, fulfilment_status, created_at from orders order by created_at desc limit 6"),
    sql<{ id: number; name: string; product_name: string; message: string; status: string; created_at: Date }>(
      "select id, name, product_name, message, status, created_at from inquiries order by created_at desc limit 5"),
  ]);
  return { money: money!, counts: counts!, stock: stock!, series, top, recentOrders, recentInquiries, net: (money?.gross ?? 0) - (money?.refunds ?? 0) };
}

export async function navCounts() {
  return one<{ inquiries: number; to_fulfil: number; low: number }>(`
    select (select count(*) from inquiries where status = 'new')::int as inquiries,
           (select count(*) from orders where payment_status = 'paid' and fulfilment_status = 'unfulfilled')::int as to_fulfil,
           (select count(*) from variants v join products p on p.id = v.product_id where p.status = 'published' and v.stock <= v.low_stock_at)::int as low`);
}

// ───────────── Products ─────────────
export type AdminProductRow = { id: number; slug: string; code: string; name: string; colour_label: string; price: number; compare_at: number | null; status: string; featured: boolean; front_tight: string | null; category: string | null; units: number; sold_out: number; low: number; sizes: number };

export async function listProducts(q: string, status: string) {
  const p: unknown[] = []; const w: string[] = [];
  if (q) { p.push(`%${q}%`); w.push(`(p.name ilike $${p.length} or p.code ilike $${p.length} or p.slug ilike $${p.length})`); }
  if (status) { p.push(status); w.push(`p.status = $${p.length}`); } else w.push("p.status <> 'archived'");
  return sql<AdminProductRow>(`
    select p.id, p.slug, p.code, p.name, p.colour_label, p.price, p.compare_at, p.status, p.featured, p.front_tight, c.title as category,
      coalesce(sum(v.stock),0)::int as units, count(v.id) filter (where v.stock = 0)::int as sold_out,
      count(v.id) filter (where v.stock > 0 and v.stock <= v.low_stock_at)::int as low, count(v.id)::int as sizes
    from products p left join categories c on c.id = p.category_id left join variants v on v.product_id = p.id
    ${w.length ? `where ${w.join(" and ")}` : ""} group by p.id, c.title order by p.sort, p.id`, p);
}

export async function productForEdit(id: number) {
  const product = await one<Record<string, unknown> & { id: number }>("select * from products where id = $1", [id]);
  if (!product) return null;
  const [variants, images, cols] = await Promise.all([
    sql<{ id: number; size: string; colour: string; stock: number; low_stock_at: number; sku: string | null }>("select id, size, colour, stock, low_stock_at, sku from variants where product_id = $1 order by sort, id", [id]),
    sql<{ id: number; url: string; alt: string; sort: number }>("select id, url, alt, sort from product_images where product_id = $1 order by sort, id", [id]),
    sql<{ collection_id: number }>("select collection_id from collection_products where product_id = $1", [id]),
  ]);
  return { product, variants, images, collectionIds: cols.map((c) => c.collection_id) };
}

export const listCategories = () => sql<{ id: number; handle: string; title: string; blurb: string; sort: number; products: number }>(
  "select c.*, (select count(*) from products p where p.category_id = c.id and p.status <> 'archived')::int as products from categories c order by sort, id");
export const listCollections = () => sql<{ id: number; handle: string; title: string; blurb: string; visible: boolean; sort: number; products: number }>(
  "select c.*, (select count(*) from collection_products cp where cp.collection_id = c.id)::int as products from collections c order by sort, id");

export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export type ProductInput = {
  name: string; slug: string; code: string; colourLabel: string; categoryId: number | null; price: number; compareAt: number | null;
  status: "draft" | "published" | "archived"; featured: boolean; isNew: boolean; tag: string; summary: string; description: string;
  details: string[]; materials: string; care: string; extraInfo: string; sort: number; collectionIds: number[];
};

export function readProductForm(f: FormData): { data?: ProductInput; error?: string } {
  const s = (k: string, max = 4000) => String(f.get(k) ?? "").trim().slice(0, max);
  const name = s("name", 120);
  const slug = slugify(s("slug", 80) || name);
  const price = int(f.get("price"), -1);
  const compareRaw = s("compareAt");
  const compareAt = compareRaw ? int(compareRaw, -1) : null;
  if (!name) return { error: "Give the product a name." };
  if (!slug) return { error: "The web address (slug) can only use letters, numbers and dashes." };
  if (price < 0) return { error: "Enter a price in naira (numbers only)." };
  if (compareAt !== null && compareAt <= price) return { error: "The 'was' price must be higher than the selling price, or left empty." };
  const status = s("status") as ProductInput["status"];
  return { data: {
    name, slug, code: s("code", 30) || slug.toUpperCase().slice(0, 12), colourLabel: s("colourLabel", 80),
    categoryId: s("categoryId") ? int(f.get("categoryId")) : null, price, compareAt,
    status: ["draft", "published", "archived"].includes(status) ? status : "draft",
    featured: f.get("featured") === "on", isNew: f.get("isNew") === "on", tag: s("tag", 30), summary: s("summary", 300),
    description: s("description"), details: s("details").split("\n").map((d) => d.trim()).filter(Boolean).slice(0, 20),
    materials: s("materials", 500), care: s("care", 1000), extraInfo: s("extraInfo", 2000), sort: int(f.get("sort")),
    collectionIds: f.getAll("collections").map((v) => int(v)).filter(Boolean),
  } };
}

export async function saveProduct(admin: Admin, id: number | null, d: ProductInput) {
  return tx(async (q) => {
    const clash = (await q.query<{ id: number }>("select id from products where (slug = $1 or code = $2) and ($3::int is null or id <> $3)", [d.slug, d.code, id]))[0];
    if (clash) throw new Error("Another product already uses that web address or code.");
    const vals = [d.name, d.slug, d.code, d.colourLabel, d.categoryId, d.price, d.compareAt, d.status, d.featured, d.isNew, d.tag, d.summary, d.description, d.details, d.materials, d.care, d.extraInfo, d.sort];
    let pid = id;
    if (id) {
      await q.query(`update products set name=$1, slug=$2, code=$3, colour_label=$4, category_id=$5, price=$6, compare_at=$7, status=$8, featured=$9, is_new=$10, tag=$11,
        summary=$12, description=$13, details=$14, materials=$15, care=$16, extra_info=$17, sort=$18, updated_at=now() where id=$19`, [...vals, id]);
    } else {
      pid = (await q.query<{ id: number }>(`insert into products (name, slug, code, colour_label, category_id, price, compare_at, status, featured, is_new, tag, summary, description, details, materials, care, extra_info, sort)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) returning id`, vals))[0]!.id;
    }
    await q.query("delete from collection_products where product_id = $1", [pid]);
    for (const c of d.collectionIds) await q.query("insert into collection_products (collection_id, product_id) values ($1, $2) on conflict do nothing", [c, pid]);
    await logActivity(admin, id ? "product_updated" : "product_created", "product", String(pid), { name: d.name, status: d.status, price: d.price }, q);
    return pid!;
  });
}

export async function deleteProduct(admin: Admin, id: number) {
  const sold = await one<{ n: number }>("select count(*)::int as n from order_items where product_id = $1", [id]);
  if (sold && sold.n > 0) {
    await sql("update products set status = 'archived', updated_at = now() where id = $1", [id]);
    await logActivity(admin, "product_archived", "product", String(id), { reason: "has orders" });
    return "archived" as const;
  }
  await sql("delete from products where id = $1", [id]);
  await logActivity(admin, "product_deleted", "product", String(id));
  return "deleted" as const;
}

// ───────────── Variants & stock ─────────────
async function writeAdjustment(q: { query: (t: string, p?: unknown[]) => Promise<unknown[]> }, admin: Admin, v: { id: number; name: string; size: string; colour: string }, delta: number, after: number, reason: string, note: string) {
  await q.query("insert into inventory_adjustments (variant_id, product_name, size, colour, delta, stock_after, reason, actor, note) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    [v.id, v.name, v.size, v.colour, delta, after, reason, admin.email, note]);
}

/** Changes stock for one size/colour. Modes: add, remove, set. Logged with who did it. */
export async function changeStock(admin: Admin, variantId: number, mode: "add" | "remove" | "set", amount: number, note: string) {
  if (!Number.isInteger(amount) || amount < 0 || amount > 100000) throw new Error("Enter a whole number.");
  return tx(async (q) => {
    const v = (await q.query<{ id: number; stock: number; size: string; colour: string; name: string }>(
      "select v.id, v.stock, v.size, v.colour, p.name from variants v join products p on p.id = v.product_id where v.id = $1 for update", [variantId]))[0];
    if (!v) throw new Error("That size no longer exists.");
    const after = mode === "add" ? v.stock + amount : mode === "remove" ? v.stock - amount : amount;
    if (after < 0) throw new Error(`Can't remove ${amount}: only ${v.stock} in stock.`);
    if (after === v.stock) return v.stock;
    await q.query("update variants set stock = $2 where id = $1", [variantId, after]);
    const reason = mode === "set" ? (after === 0 ? "sold_out" : "set") : mode === "add" ? "restock" : "correction";
    await writeAdjustment(q, admin, v, after - v.stock, after, reason, note);
    await logActivity(admin, "stock_changed", "variant", String(variantId), { product: v.name, size: v.size, from: v.stock, to: after, note }, q);
    return after;
  });
}

export async function addVariant(admin: Admin, productId: number, size: string, colour: string, stock: number, lowAt: number) {
  const s = size.trim().toUpperCase().slice(0, 10);
  if (!s) throw new Error("Enter a size.");
  return tx(async (q) => {
    const p = (await q.query<{ name: string; code: string }>("select name, code from products where id = $1", [productId]))[0];
    if (!p) throw new Error("Product not found.");
    const row = (await q.query<{ id: number }>("insert into variants (product_id, size, colour, stock, low_stock_at, sku) values ($1,$2,$3,$4,$5,$6) on conflict do nothing returning id",
      [productId, s, colour.trim().slice(0, 40), Math.max(0, stock), Math.max(0, lowAt), `${p.code}-${s}${colour ? `-${colour.slice(0, 3).toUpperCase()}` : ""}`]))[0];
    if (!row) throw new Error("That size and colour already exists.");
    await writeAdjustment(q, admin, { id: row.id, name: p.name, size: s, colour }, stock, stock, "created", "New size added");
    await logActivity(admin, "variant_added", "product", String(productId), { size: s, colour, stock }, q);
  });
}

export async function updateVariant(admin: Admin, variantId: number, lowAt: number) {
  await sql("update variants set low_stock_at = $2 where id = $1", [variantId, Math.max(0, lowAt)]);
  await logActivity(admin, "variant_updated", "variant", String(variantId), { lowAt });
}

export async function removeVariant(admin: Admin, variantId: number) {
  const v = await one<{ product_id: number; size: string; colour: string }>("select product_id, size, colour from variants where id = $1", [variantId]);
  if (!v) return;
  await sql("delete from variants where id = $1", [variantId]);
  await logActivity(admin, "variant_removed", "product", String(v.product_id), { size: v.size, colour: v.colour });
}

export async function inventory(filter: string, q: string) {
  const p: unknown[] = []; const w = ["p.status <> 'archived'"];
  if (filter === "low") w.push("v.stock > 0 and v.stock <= v.low_stock_at");
  if (filter === "sold-out") w.push("v.stock = 0");
  if (q) { p.push(`%${q}%`); w.push(`(p.name ilike $${p.length} or p.code ilike $${p.length})`); }
  return sql<{ id: number; product_id: number; name: string; code: string; colour_label: string; size: string; colour: string; stock: number; low_stock_at: number; status: string; reserved: number }>(`
    select v.id, v.product_id, p.name, p.code, p.colour_label, v.size, v.colour, v.stock, v.low_stock_at, p.status,
      coalesce((select sum(i.qty) from order_items i join orders o on o.id = i.order_id where i.variant_id = v.id and o.stock_state = 'reserved'), 0)::int as reserved
    from variants v join products p on p.id = v.product_id where ${w.join(" and ")} order by p.sort, p.id, v.sort, v.id`, p);
}

export const stockHistory = (limit = 60, variantIds?: number[]) => sql<{ id: number; product_name: string; size: string; colour: string; delta: number; stock_after: number; reason: string; actor: string; note: string; created_at: Date; order_number: string | null }>(
  `select a.*, o.number as order_number from inventory_adjustments a left join orders o on o.id = a.order_id
   ${variantIds ? "where a.variant_id = any($1::int[])" : ""} order by a.created_at desc, a.id desc limit ${limit}`, variantIds ? [variantIds] : []);

// ───────────── Images ─────────────
export async function setProductImage(admin: Admin, productId: number, slot: "front" | "back" | "side", url: string | null, tightUrl: string | null) {
  await sql(`update products set ${slot} = $2, ${slot}_tight = $3, updated_at = now() where id = $1`, [productId, url, tightUrl]);
  await logActivity(admin, "product_image", "product", String(productId), { slot, url });
}
export async function addGalleryImage(admin: Admin, productId: number, url: string, alt: string) {
  const next = await one<{ n: number }>("select coalesce(max(sort), -1)::int + 1 as n from product_images where product_id = $1", [productId]);
  await sql("insert into product_images (product_id, url, alt, sort) values ($1, $2, $3, $4)", [productId, url, alt, next?.n ?? 0]);
  await logActivity(admin, "gallery_add", "product", String(productId), { url });
}
export async function removeGalleryImage(admin: Admin, imageId: number) {
  const img = await one<{ product_id: number; url: string }>("delete from product_images where id = $1 returning product_id, url", [imageId]);
  if (img) await logActivity(admin, "gallery_remove", "product", String(img.product_id), { url: img.url });
}
export async function moveGalleryImage(admin: Admin, imageId: number, dir: -1 | 1) {
  await tx(async (q) => {
    const img = (await q.query<{ id: number; product_id: number; sort: number }>("select id, product_id, sort from product_images where id = $1", [imageId]))[0];
    if (!img) return;
    const all = await q.query<{ id: number }>("select id from product_images where product_id = $1 order by sort, id", [img.product_id]);
    const i = all.findIndex((r) => r.id === imageId), j = i + dir;
    if (j < 0 || j >= all.length) return;
    [all[i], all[j]] = [all[j]!, all[i]!];
    for (const [k, r] of all.entries()) await q.query("update product_images set sort = $2 where id = $1", [r.id, k]);
  });
  await logActivity(admin, "gallery_reorder", "image", String(imageId));
}
export async function updateGalleryAlt(imageId: number, alt: string) { await sql("update product_images set alt = $2 where id = $1", [imageId, alt.slice(0, 200)]); }

// ───────────── Collections & categories ─────────────
export async function saveCollection(admin: Admin, id: number | null, f: { handle: string; title: string; blurb: string; visible: boolean; sort: number; productIds: number[] }) {
  const handle = slugify(f.handle || f.title);
  if (!handle || !f.title.trim()) throw new Error("Give the collection a title.");
  if (["all"].includes(handle)) throw new Error("That web address is reserved.");
  const catClash = await one("select 1 from categories where handle = $1", [handle]);
  if (catClash) throw new Error("A category already uses that web address.");
  await tx(async (q) => {
    let cid = id;
    if (id) await q.query("update collections set handle=$2, title=$3, blurb=$4, visible=$5, sort=$6 where id=$1", [id, handle, f.title.trim(), f.blurb.trim(), f.visible, f.sort]);
    else cid = (await q.query<{ id: number }>("insert into collections (handle, title, blurb, visible, sort) values ($1,$2,$3,$4,$5) returning id", [handle, f.title.trim(), f.blurb.trim(), f.visible, f.sort]))[0]!.id;
    await q.query("delete from collection_products where collection_id = $1", [cid]);
    for (const [k, pid] of f.productIds.entries()) await q.query("insert into collection_products (collection_id, product_id, sort) values ($1,$2,$3) on conflict do nothing", [cid, pid, k]);
    await logActivity(admin, id ? "collection_updated" : "collection_created", "collection", String(cid), { title: f.title, visible: f.visible, products: f.productIds.length }, q);
  }).catch((e) => { if (String(e).includes("unique")) throw new Error("Another collection already uses that web address."); throw e; });
}
export async function deleteCollection(admin: Admin, id: number) {
  await sql("delete from collections where id = $1", [id]);
  await logActivity(admin, "collection_deleted", "collection", String(id));
}
export async function saveCategory(admin: Admin, id: number | null, f: { handle: string; title: string; blurb: string; sort: number }) {
  const handle = slugify(f.handle || f.title);
  if (!handle || !f.title.trim()) throw new Error("Give the category a title.");
  if (await one("select 1 from collections where handle = $1", [handle])) throw new Error("A collection already uses that web address.");
  try {
    if (id) await sql("update categories set handle=$2, title=$3, blurb=$4, sort=$5 where id=$1", [id, handle, f.title.trim(), f.blurb.trim(), f.sort]);
    else await sql("insert into categories (handle, title, blurb, sort) values ($1,$2,$3,$4)", [handle, f.title.trim(), f.blurb.trim(), f.sort]);
  } catch (e) { if (String(e).includes("unique")) throw new Error("Another category already uses that web address."); throw e; }
  await logActivity(admin, id ? "category_updated" : "category_created", "category", String(id ?? handle), { title: f.title });
}
export async function deleteCategory(admin: Admin, id: number) {
  await sql("delete from categories where id = $1", [id]);
  await logActivity(admin, "category_deleted", "category", String(id));
}

// ───────────── Customers ─────────────
export async function listCustomers(q: string) {
  const p: unknown[] = []; let w = "";
  if (q) { p.push(`%${q}%`); w = `where c.name ilike $1 or c.email ilike $1 or c.phone ilike $1`; }
  return sql<{ id: number; name: string; email: string; phone: string; orders: number; spent: number; last_order: Date | null; marketing: boolean }>(`
    select c.id, c.name, c.email, c.phone, c.marketing,
      count(o.id) filter (where o.payment_status in ('paid','partially_refunded','refunded'))::int as orders,
      coalesce(sum(o.total - o.refunded_amount) filter (where o.payment_status in ('paid','partially_refunded','refunded')), 0)::int as spent,
      max(o.paid_at) as last_order
    from customers c left join orders o on o.customer_id = c.id ${w} group by c.id order by last_order desc nulls last, c.created_at desc limit 300`, p);
}
export const getCustomer = (id: number) => one<{ id: number; name: string; email: string; phone: string; marketing: boolean; created_at: Date }>("select * from customers where id = $1", [id]);

// ───────────── Discounts ─────────────
export const listDiscounts = () => sql<{ id: number; code: string; kind: string; value: number; min_order: number; starts_at: Date | null; expires_at: Date | null; usage_limit: number | null; used_count: number; active: boolean; created_at: Date }>(
  "select * from discounts order by active desc, created_at desc");
export async function createDiscount(admin: Admin, f: FormData) {
  const code = String(f.get("code") ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30);
  const kind = f.get("kind") === "fixed" ? "fixed" : "percent";
  const value = int(f.get("value"), 0);
  if (code.length < 3) throw new Error("Codes need at least 3 letters or numbers.");
  if (value <= 0 || (kind === "percent" && value > 100)) throw new Error(kind === "percent" ? "Percent must be between 1 and 100." : "Enter an amount in naira.");
  const limit = String(f.get("usageLimit") ?? "").trim();
  try {
    await sql("insert into discounts (code, kind, value, min_order, starts_at, expires_at, usage_limit, active) values ($1,$2,$3,$4,$5,$6,$7,true)", [
      code, kind, value, Math.max(0, int(f.get("minOrder"))), String(f.get("startsAt") || "") || null, String(f.get("expiresAt") || "") ? `${f.get("expiresAt")}T23:59:59+01:00` : null, limit ? Math.max(1, int(limit)) : null]);
  } catch (e) { if (String(e).includes("unique")) throw new Error("That code already exists."); throw e; }
  await logActivity(admin, "discount_created", "discount", code, { kind, value });
}
export async function toggleDiscount(admin: Admin, id: number) {
  const d = await one<{ code: string; active: boolean }>("update discounts set active = not active where id = $1 returning code, active", [id]);
  if (d) await logActivity(admin, d.active ? "discount_enabled" : "discount_disabled", "discount", d.code);
}
export async function deleteDiscount(admin: Admin, id: number) {
  const d = await one<{ code: string; used_count: number }>("select code, used_count from discounts where id = $1", [id]);
  if (!d) return;
  if (d.used_count > 0) { await sql("update discounts set active = false where id = $1", [id]); await logActivity(admin, "discount_disabled", "discount", d.code, { reason: "used, kept for records" }); return; }
  await sql("delete from discounts where id = $1", [id]);
  await logActivity(admin, "discount_deleted", "discount", d.code);
}

// ───────────── Delivery & settings ─────────────
export async function saveZone(admin: Admin, id: number | null, f: FormData) {
  const name = String(f.get("name") ?? "").trim().slice(0, 80);
  const fee = int(f.get("fee"), -1);
  if (!name || fee < 0) throw new Error("Give the delivery option a name and a fee (0 for free).");
  const states = String(f.get("states") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const vals = [name, states, fee, String(f.get("eta") ?? "").trim().slice(0, 80) || "—", f.get("isPickup") === "on", String(f.get("instructions") ?? "").trim().slice(0, 300), f.get("active") === "on", int(f.get("sort"))];
  if (id) await sql("update delivery_zones set name=$1, states=$2, fee=$3, eta=$4, is_pickup=$5, instructions=$6, active=$7, sort=$8 where id=$9", [...vals, id]);
  else await sql("insert into delivery_zones (name, states, fee, eta, is_pickup, instructions, active, sort) values ($1,$2,$3,$4,$5,$6,$7,$8)", vals);
  await logActivity(admin, id ? "delivery_updated" : "delivery_created", "delivery", String(id ?? name), { name, fee, states });
}
export async function deleteZone(admin: Admin, id: number) {
  await sql("delete from delivery_zones where id = $1", [id]);
  await logActivity(admin, "delivery_deleted", "delivery", String(id));
}

export async function saveSettings(admin: Admin, patch: Partial<PrivateSettings>) {
  const current = await readSettings();
  const next = { ...current, ...patch, socials: { ...current.socials, ...(patch.socials ?? {}) }, legal: { ...current.legal, ...(patch.legal ?? {}) } };
  await sql("insert into store_settings (key, value, updated_at) values ('store', $1, now()) on conflict (key) do update set value = excluded.value, updated_at = now()", [JSON.stringify(next)]);
  await logActivity(admin, "settings_updated", "settings", "store", { fields: Object.keys(patch) });
}

export const listAdmins = () => sql<{ id: number; email: string; name: string; role: string; active: boolean; last_login_at: Date | null }>("select id, email, name, role, active, last_login_at from admin_users order by id");
export async function setAdminActive(by: Admin, id: number, active: boolean) {
  if (id === by.id) throw new Error("You can't deactivate your own account.");
  await sql("update admin_users set active = $2 where id = $1", [id, active]);
  if (!active) await sql("delete from admin_sessions where admin_id = $1", [id]);
  await logActivity(by, active ? "admin_enabled" : "admin_disabled", "admin", String(id));
}

export const activityLog = (limit = 150) => sql<{ id: number; admin_email: string; action: string; entity: string; entity_id: string; details: Record<string, unknown>; created_at: Date }>(
  `select * from admin_activity order by created_at desc, id desc limit ${limit}`);
