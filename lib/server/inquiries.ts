/** Product inquiries (server only). Kept separate from orders. */
import { one, sql } from "./db";
import { fingerprint } from "./security";
import { logActivity, type Admin } from "./admin";

export type InquiryStatus = "new" | "in_progress" | "answered" | "closed";
export const INQUIRY_LABELS: Record<InquiryStatus, string> = { new: "New", in_progress: "In progress", answered: "Answered", closed: "Closed" };

export type Inquiry = {
  id: number; name: string; email: string; phone: string; productId: number | null; productName: string; productSlug: string | null;
  size: string; colour: string; message: string; status: InquiryStatus; notes: string; createdAt: string; updatedAt: string;
};

type Row = { id: number; name: string; email: string; phone: string; product_id: number | null; product_name: string; slug: string | null; size: string; colour: string; message: string; status: InquiryStatus; notes: string; created_at: Date; updated_at: Date };
const map = (r: Row): Inquiry => ({ id: r.id, name: r.name, email: r.email, phone: r.phone, productId: r.product_id, productName: r.product_name, productSlug: r.slug,
  size: r.size, colour: r.colour, message: r.message, status: r.status, notes: r.notes, createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString() });

export async function createInquiry(i: { name: string; email: string; phone: string; productSlug: string; size: string; colour: string; message: string }) {
  const product = i.productSlug ? await one<{ id: number; name: string; colour_label: string }>("select id, name, colour_label from products where slug = $1 and status = 'published'", [i.productSlug]) : null;
  const productName = product ? `${product.name}${product.colour_label ? ` — ${product.colour_label}` : ""}` : "";
  const fp = fingerprint(i.email.toLowerCase(), i.productSlug, i.message.toLowerCase().replace(/\s+/g, " ").trim());
  const dupe = await one("select id from inquiries where fingerprint = $1 and created_at > now() - interval '24 hours'", [fp]);
  if (dupe) return { duplicate: true as const };
  const row = await one<{ id: number }>(
    "insert into inquiries (name, email, phone, product_id, product_name, size, colour, message, fingerprint) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id",
    [i.name, i.email, i.phone, product?.id ?? null, productName, i.size, i.colour, i.message, fp]);
  return { duplicate: false as const, id: row!.id, productName };
}

export async function listInquiries(f: { q?: string; status?: string; product?: string }) {
  const where: string[] = []; const p: unknown[] = [];
  if (f.q?.trim()) { p.push(`%${f.q.trim()}%`); where.push(`(i.name ilike $${p.length} or i.email ilike $${p.length} or i.phone ilike $${p.length} or i.message ilike $${p.length})`); }
  if (f.status) { p.push(f.status); where.push(`i.status = $${p.length}`); }
  if (f.product) { p.push(Number(f.product)); where.push(`i.product_id = $${p.length}`); }
  const rows = await sql<Row>(`select i.*, p.slug from inquiries i left join products p on p.id = i.product_id ${where.length ? `where ${where.join(" and ")}` : ""} order by i.created_at desc limit 200`, p);
  return rows.map(map);
}

export async function getInquiry(id: number) {
  const r = await one<Row>("select i.*, p.slug from inquiries i left join products p on p.id = i.product_id where i.id = $1", [id]);
  return r ? map(r) : null;
}

export async function updateInquiry(admin: Admin, id: number, status: InquiryStatus, notes: string) {
  if (!(status in INQUIRY_LABELS)) throw new Error("Unknown status.");
  await sql("update inquiries set status = $2, notes = $3, updated_at = now() where id = $1", [id, status, notes.slice(0, 5000)]);
  await logActivity(admin, "inquiry_update", "inquiry", String(id), { status });
}
