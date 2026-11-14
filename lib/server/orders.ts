/**
 * Orders, stock reservation, payment confirmation and fulfilment (server only).
 *
 * Stock lifecycle (prevents overselling):
 *   checkout  → reserve: `stock = stock - qty WHERE stock >= qty` (atomic; fails if not enough)
 *   paid      → commit:  reserved stock becomes a sale (once, even if the webhook repeats)
 *   failed / abandoned / expired (STOCK_RESERVATION_MINUTES) → release: stock added back
 */
import { randomBytes } from "node:crypto";
import { one, sql, tx, type Q } from "./db";
import { config } from "./config";
import { readSettings, readZones } from "./store";
import { deliveryFee, normalisePhone, zonesForState } from "../site";
import type { Admin } from "./admin";
import { logActivity } from "./admin";
import {
  FULFILMENT_LABELS, NEEDS_PAYMENT, type CartLine, type Customer, type FulfilmentStatus, type OrderView, type PaymentStatus,
} from "../order";

export class OrderError extends Error { constructor(message: string, public status = 422) { super(message); } }

type DiscountRow = { id: number; code: string; kind: "percent" | "fixed"; value: number; min_order: number; starts_at: Date | null; expires_at: Date | null; usage_limit: number | null; used_count: number; active: boolean };

/** Validates a discount code against a merchandise subtotal. Never trusts amounts from the browser. */
export async function checkDiscount(q: Q, codeRaw: string, subtotal: number) {
  const code = codeRaw.trim().toUpperCase();
  if (!code) return null;
  const d = (await q.query<DiscountRow>("select * from discounts where code = $1", [code]))[0];
  const now = Date.now();
  if (!d || !d.active) throw new OrderError("That discount code isn't valid.");
  if (d.starts_at && new Date(d.starts_at).getTime() > now) throw new OrderError("That discount code isn't active yet.");
  if (d.expires_at && new Date(d.expires_at).getTime() < now) throw new OrderError("That discount code has expired.");
  if (d.usage_limit !== null && d.used_count >= d.usage_limit) throw new OrderError("That discount code has been fully used.");
  if (subtotal < d.min_order) throw new OrderError(`That code needs an order of at least ₦${d.min_order.toLocaleString("en-NG")}.`);
  const amount = d.kind === "percent" ? Math.floor((subtotal * d.value) / 100) : Math.min(d.value, subtotal);
  return { id: d.id, code: d.code, amount };
}

type VariantRow = { variant_id: number; size: string; colour: string; stock: number; product_id: number; slug: string; code: string; name: string; price: number; colour_label: string; front_tight: string | null; front: string | null; status: string };

/** Prices a bag from the database. Used for the checkout preview and inside createOrder. */
export async function priceBag(q: Q, lines: CartLine[], opts: { state?: string; zoneId?: number; discountCode?: string }) {
  if (!Array.isArray(lines) || lines.length === 0) throw new OrderError("Your bag is empty.");
  if (lines.length > 30) throw new OrderError("Too many items in one order.");
  const slugs = [...new Set(lines.map((l) => String(l?.slug)))];
  const rows = await q.query<VariantRow>(`
    select v.id as variant_id, v.size, v.colour, v.stock, p.id as product_id, p.slug, p.code, p.name, p.price, p.colour_label, p.front_tight, p.front, p.status
    from variants v join products p on p.id = v.product_id where p.slug = any($1::text[])`, [slugs]);
  const items = lines.map((l) => {
    const qty = Number(l?.qty);
    const v = rows.find((r) => r.slug === l.slug && r.size === String(l.size) && (!l.colour || r.colour === l.colour));
    if (!v || v.status !== "published") throw new OrderError("A piece in your bag is no longer available.");
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) throw new OrderError(`Check the quantity for ${v.name}.`);
    return { variantId: v.variant_id, productId: v.product_id, slug: v.slug, code: v.code, name: v.name, colour: v.colour || v.colour_label, size: v.size, qty, unitPrice: v.price, total: v.price * qty, image: v.front_tight ?? v.front, stock: v.stock };
  });
  // Stock check on the combined quantity per variant (final enforcement happens in reserveStock).
  const want = new Map<number, number>();
  for (const i of items) want.set(i.variantId, (want.get(i.variantId) ?? 0) + i.qty);
  for (const i of items) if ((want.get(i.variantId) ?? 0) > i.stock) throw new OrderError(i.stock === 0 ? `${i.name} in size ${i.size} is sold out.` : `Only ${i.stock} left of ${i.name} in size ${i.size}.`, 409);

  const subtotal = items.reduce((n, i) => n + i.total, 0);
  const discount = opts.discountCode ? await checkDiscount(q, opts.discountCode, subtotal) : null;
  const afterDiscount = subtotal - (discount?.amount ?? 0);

  const settings = await readSettings(q);
  let zone = null;
  if (opts.state) {
    const options = zonesForState(await readZones(true, q), opts.state);
    zone = opts.zoneId ? options.find((z) => z.id === Number(opts.zoneId)) ?? null : null;
    if (opts.zoneId && !zone) throw new OrderError("That delivery option isn't available for your state.");
  }
  const fee = zone ? deliveryFee(zone, afterDiscount, settings.freeDeliveryOver) : 0;
  return { items, subtotal, discount, delivery: zone ? { zone, fee } : null, total: afterDiscount + fee };
}

const newNumber = () => `MV-${Date.now().toString(36).toUpperCase().slice(-6)}-${randomBytes(4).toString("hex").toUpperCase()}`;

async function adjust(q: Q, v: { variantId: number; name: string; size: string; colour: string }, delta: number, reason: string, orderId: string | null, actor: string, note = "") {
  const row = (await q.query<{ stock: number }>("select stock from variants where id = $1", [v.variantId]))[0];
  await q.query("insert into inventory_adjustments (variant_id, product_name, size, colour, delta, stock_after, reason, order_id, actor, note) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
    [v.variantId, v.name, v.size, v.colour, delta, row?.stock ?? 0, reason, orderId, actor, note]);
}

/** Atomically takes stock for each item, or throws without taking any. */
async function reserveStock(q: Q, items: { variantId: number; name: string; size: string; colour: string; qty: number }[], orderId: string, reason: "reserve" | "sale", actor = "checkout") {
  for (const i of items) {
    const ok = await q.query("update variants set stock = stock - $1 where id = $2 and stock >= $1 returning stock", [i.qty, i.variantId]);
    if (!ok.length) {
      const left = (await q.query<{ stock: number }>("select stock from variants where id = $1", [i.variantId]))[0]?.stock ?? 0;
      throw new OrderError(left === 0 ? `${i.name} in size ${i.size} just sold out.` : `Only ${left} left of ${i.name} in size ${i.size}.`, 409);
    }
    await adjust(q, i, -i.qty, reason, orderId, actor);
  }
}

export async function createOrder(input: { customer: Customer; lines: CartLine[]; zoneId: number; discountCode?: string }) {
  await releaseExpiredReservations();
  const c = input.customer;
  return tx(async (q) => {
    const priced = await priceBag(q, input.lines, { state: c.state, zoneId: input.zoneId, discountCode: input.discountCode });
    if (!priced.delivery) throw new OrderError("Choose a delivery option.");
    if (priced.total < 100) throw new OrderError("This order total is too low to pay online. Message us on WhatsApp.");
    const customer = (await q.query<{ id: number }>(
      `insert into customers (email, name, phone, marketing) values ($1, $2, $3, $4)
       on conflict (email) do update set name = excluded.name, phone = excluded.phone, marketing = customers.marketing or excluded.marketing
       returning id`, [c.email, `${c.firstName} ${c.lastName}`, c.phone, Boolean(c.marketing)]))[0]!;
    const number = newNumber();
    const order = (await q.query<{ id: string }>(
      `insert into orders (number, customer_id, email, phone, first_name, last_name, address, delivery_zone_id, delivery_label, delivery_eta,
         subtotal, discount_code, discount_amount, delivery_fee, total, marketing, reserved_until)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, now() + make_interval(mins => $17)) returning id`,
      [number, customer.id, c.email, c.phone, c.firstName, c.lastName,
        JSON.stringify({ address1: c.address1, address2: c.address2 ?? "", city: c.city, state: c.state, postcode: c.postcode ?? "", country: c.country }),
        priced.delivery.zone.id, priced.delivery.zone.name, priced.delivery.zone.eta,
        priced.subtotal, priced.discount?.code ?? null, priced.discount?.amount ?? 0, priced.delivery.fee, priced.total, Boolean(c.marketing), config.reservationMinutes]))[0]!;
    for (const i of priced.items) {
      await q.query("insert into order_items (order_id, product_id, variant_id, slug, code, name, colour, size, qty, unit_price, total, image) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
        [order.id, i.productId, i.variantId, i.slug, i.code, i.name, i.colour, i.size, i.qty, i.unitPrice, i.total, i.image]);
    }
    await reserveStock(q, priced.items, order.id, "reserve");
    await q.query("insert into order_events (order_id, kind, to_status, note, visible_to_customer) values ($1, 'placed', 'pending', 'Order placed, awaiting payment', true)", [order.id]);
    return { id: order.id, number, total: priced.total, email: c.email };
  });
}

/** Puts reserved stock back (payment failed, abandoned, expired or order cancelled before payment). Safe to repeat. */
export async function releaseOrder(number: string, reason: "failed" | "abandoned" | "expired" | "cancelled", actor = "system") {
  return tx(async (q) => {
    const o = (await q.query<{ id: string; payment_status: string }>(
      `update orders set stock_state = 'released', updated_at = now(),
         payment_status = case when payment_status = 'pending' and $2 in ('failed','abandoned') then $2 when payment_status = 'pending' and $2 = 'expired' then 'abandoned' else payment_status end
       where number = $1 and stock_state = 'reserved' and payment_status <> 'paid' returning id, payment_status`, [number, reason]))[0];
    if (!o) return false;
    const items = await q.query<{ variant_id: number | null; name: string; size: string; colour: string; qty: number }>("select variant_id, name, size, colour, qty from order_items where order_id = $1", [o.id]);
    for (const i of items) {
      if (!i.variant_id) continue;
      await q.query("update variants set stock = stock + $1 where id = $2", [i.qty, i.variant_id]);
      await adjust(q, { variantId: i.variant_id, name: i.name, size: i.size, colour: i.colour }, i.qty, "release", o.id, actor, `Payment ${reason}`);
    }
    await q.query("insert into order_events (order_id, kind, to_status, note, actor) values ($1, 'stock', 'released', $2, $3)", [o.id, `Reserved stock returned (payment ${reason})`, actor]);
    if (reason !== "cancelled") await q.query("insert into order_events (order_id, kind, to_status, note, visible_to_customer) values ($1, 'payment', $2, $3, true)", [o.id, o.payment_status, reason === "expired" ? "Payment window expired" : "Payment not completed"]);
    return true;
  });
}

/** Releases reservations whose payment window has passed. Called on checkout and admin page loads (no cron needed). */
export async function releaseExpiredReservations() {
  const expired = await sql<{ number: string }>("select number from orders where stock_state = 'reserved' and payment_status = 'pending' and reserved_until < now() limit 50");
  for (const o of expired) await releaseOrder(o.number, "expired");
  return expired.length;
}

/**
 * Marks an order paid from a VERIFIED Paystack transaction. Runs its effects once:
 * returns { first: true } only for the call that actually changed the order.
 */
export async function markPaid(number: string, paid: { amountKobo: number; currency: string; paidAt: string | null; channel: string | null }) {
  return tx(async (q) => {
    const o = (await q.query<{ id: string; total: number; stock_state: string; discount_code: string | null; payment_status: string }>(
      "select id, total, stock_state, discount_code, payment_status from orders where number = $1 for update", [number]))[0];
    if (!o) return { found: false as const };
    if (paid.currency !== "NGN" || paid.amountKobo !== o.total * 100) {
      await q.query("update orders set needs_attention = $2, updated_at = now() where id = $1",
        [o.id, `Paystack amount ₦${(paid.amountKobo / 100).toLocaleString("en-NG")} ${paid.currency} doesn't match the order total ₦${o.total.toLocaleString("en-NG")}. Check before fulfilling.`]);
      return { found: true as const, first: false, mismatch: true, id: o.id };
    }
    const updated = (await q.query<{ id: string }>(
      `update orders set payment_status = 'paid', paid_at = coalesce($2::timestamptz, now()), paystack_channel = $3, updated_at = now()
       where id = $1 and payment_status in ('pending','failed','abandoned') returning id`, [o.id, paid.paidAt, paid.channel]))[0];
    if (!updated) return { found: true as const, first: false, id: o.id }; // already processed (duplicate webhook or refresh)

    const items = await q.query<{ variant_id: number | null; name: string; size: string; colour: string; qty: number }>("select variant_id, name, size, colour, qty from order_items where order_id = $1", [o.id]);
    if (o.stock_state === "reserved") {
      for (const i of items) if (i.variant_id) await adjust(q, { variantId: i.variant_id, name: i.name, size: i.size, colour: i.colour }, 0, "sale", o.id, "payment", `Reserved ${i.qty} sold`);
    } else {
      // Paid after the reservation expired: take stock again if it's still there, otherwise flag for staff.
      const short: string[] = [];
      for (const i of items) {
        if (!i.variant_id) continue;
        const ok = await q.query("update variants set stock = stock - $1 where id = $2 and stock >= $1 returning stock", [i.qty, i.variant_id]);
        if (ok.length) await adjust(q, { variantId: i.variant_id, name: i.name, size: i.size, colour: i.colour }, -i.qty, "sale", o.id, "payment", "Paid after reservation expired");
        else short.push(`${i.qty}× ${i.name} (${i.size})`);
      }
      if (short.length) await q.query("update orders set needs_attention = $2 where id = $1", [o.id, `Paid after the payment window, but these sold out meanwhile: ${short.join(", ")}. Contact the customer.`]);
    }
    await q.query("update orders set stock_state = 'committed' where id = $1", [o.id]);
    if (o.discount_code) await q.query("update discounts set used_count = used_count + 1 where code = $1", [o.discount_code]);
    await q.query("insert into order_events (order_id, kind, from_status, to_status, note, visible_to_customer, actor) values ($1, 'payment', $2, 'paid', 'Payment confirmed by Paystack', true, 'paystack')", [o.id, o.payment_status]);
    return { found: true as const, first: true, id: o.id };
  });
}

// ───────────── Reading orders ─────────────

type OrderRow = {
  id: string; number: string; created_at: Date; paid_at: Date | null; email: string; phone: string; first_name: string; last_name: string;
  address: OrderView["address"]; delivery_label: string; delivery_eta: string; subtotal: number; discount_code: string | null; discount_amount: number;
  delivery_fee: number; total: number; payment_status: PaymentStatus; fulfilment_status: FulfilmentStatus; refunded_amount: number;
  carrier: string; tracking_ref: string; cancel_reason: string; needs_attention: string; stock_state: string; paystack_channel: string | null; customer_id: number | null;
};
const iso = (d: Date | string | null) => (d ? new Date(d).toISOString() : null);

async function hydrate(rows: OrderRow[], withEvents: boolean): Promise<OrderView[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const items = await sql<{ order_id: string; slug: string; code: string; name: string; colour: string; size: string; qty: number; unit_price: number; total: number; image: string | null }>(
    "select * from order_items where order_id = any($1::uuid[]) order by id", [ids]);
  const events = withEvents ? await sql<{ order_id: string; kind: string; from_status: string | null; to_status: string | null; note: string; created_at: Date; actor: string; visible_to_customer: boolean }>(
    "select * from order_events where order_id = any($1::uuid[]) order by created_at, id", [ids]) : [];
  return rows.map((r) => ({
    id: r.id, number: r.number, createdAt: iso(r.created_at)!, paidAt: iso(r.paid_at), email: r.email, phone: r.phone, firstName: r.first_name, lastName: r.last_name,
    address: r.address, deliveryLabel: r.delivery_label, deliveryEta: r.delivery_eta, subtotal: r.subtotal, discountCode: r.discount_code, discountAmount: r.discount_amount,
    deliveryFee: r.delivery_fee, total: r.total, paymentStatus: r.payment_status, fulfilmentStatus: r.fulfilment_status, refundedAmount: r.refunded_amount,
    carrier: r.carrier, trackingRef: r.tracking_ref, cancelReason: r.cancel_reason, needsAttention: r.needs_attention, stockState: r.stock_state,
    paystackChannel: r.paystack_channel, customerId: r.customer_id,
    items: items.filter((i) => i.order_id === r.id).map((i) => ({ slug: i.slug, code: i.code, name: i.name, colour: i.colour, size: i.size, qty: i.qty, unitPrice: i.unit_price, total: i.total, image: i.image })),
    events: events.filter((e) => e.order_id === r.id).map((e) => ({ kind: e.kind, fromStatus: e.from_status, toStatus: e.to_status, note: e.note, createdAt: iso(e.created_at)!, actor: e.actor, visibleToCustomer: e.visible_to_customer })),
  }));
}

export async function orderByNumber(number: string) {
  return (await hydrate(await sql<OrderRow>("select * from orders where number = $1", [number]), true))[0] ?? null;
}
export async function orderById(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return (await hydrate(await sql<OrderRow>("select * from orders where id = $1", [id]), true))[0] ?? null;
}

/** Strips staff-only information before an order is shown to a customer. */
export function customerView(o: OrderView): OrderView {
  return { ...o, needsAttention: "", stockState: "", customerId: null, events: o.events.filter((e) => e.visibleToCustomer).map((e) => ({ ...e, actor: "" })) };
}

/** Customer lookup: order number plus the email OR phone on the order. Both must match. */
export async function lookupOrder(numberRaw: string, contactRaw: string) {
  const number = numberRaw.trim().toUpperCase();
  const contact = contactRaw.trim();
  if (!/^MV-[A-Z0-9]{4,12}-[A-F0-9]{6,12}$/.test(number) || contact.length < 5) return null;
  const row = (await sql<OrderRow>("select * from orders where number = $1", [number]))[0];
  if (!row) return null;
  const emailOk = contact.includes("@") && row.email.toLowerCase() === contact.toLowerCase();
  const phoneOk = !contact.includes("@") && normalisePhone(contact).length >= 12 && normalisePhone(row.phone) === normalisePhone(contact);
  if (!emailOk && !phoneOk) return null;
  return customerView((await hydrate([row], true))[0]!);
}

export type OrderFilters = { q?: string; payment?: string; fulfilment?: string; from?: string; to?: string; page?: number; customerId?: number };

export async function listOrders(f: OrderFilters) {
  const where: string[] = []; const p: unknown[] = [];
  const add = (cond: string, v: unknown) => { p.push(v); where.push(cond.replaceAll("$?", `$${p.length}`)); };
  const term = f.q?.trim();
  if (term) {
    p.push(`%${term}%`);
    const t = p.length;
    const digits = term.replace(/\D/g, "").replace(/^(234|0)/, "");
    let phone = "false";
    if (digits.length >= 4) { p.push(`%${digits}%`); phone = `regexp_replace(o.phone, '\\D', '', 'g') like $${p.length}`; }
    where.push(`(o.number ilike $${t} or o.email ilike $${t} or (o.first_name || ' ' || o.last_name) ilike $${t} or ${phone})`);
  }
  if (f.payment) add("o.payment_status = $?", f.payment);
  if (f.fulfilment) add("o.fulfilment_status = $?", f.fulfilment);
  if (f.from) add("o.created_at >= $?::date", f.from);
  if (f.to) add("o.created_at < ($?::date + 1)", f.to);
  if (f.customerId) add("o.customer_id = $?", f.customerId);
  const w = where.length ? `where ${where.join(" and ")}` : "";
  const page = Math.max(1, f.page ?? 1), per = 25;
  const total = (await one<{ n: number }>(`select count(*)::int as n from orders o ${w}`, p))?.n ?? 0;
  const rows = await sql<OrderRow>(`select o.* from orders o ${w} order by o.created_at desc limit ${per} offset ${(page - 1) * per}`, p);
  return { orders: await hydrate(rows, false), total, page, pages: Math.max(1, Math.ceil(total / per)) };
}

// ───────────── Staff actions ─────────────

async function event(q: Q, orderId: string, kind: string, from: string | null, to: string | null, note: string, actor: string, visible: boolean) {
  await q.query("insert into order_events (order_id, kind, from_status, to_status, note, actor, visible_to_customer) values ($1,$2,$3,$4,$5,$6,$7)", [orderId, kind, from, to, note, actor, visible]);
}

/**
 * Moves fulfilment to a new status. No-op (and no email) if unchanged.
 * Returns the order when a customer email should go out for this status.
 */
export async function setFulfilment(admin: Admin, orderId: string, to: FulfilmentStatus, opts: { note?: string; restock?: boolean } = {}) {
  if (!(to in FULFILMENT_LABELS) || to === "unfulfilled") throw new OrderError("Unknown status.");
  const result = await tx(async (q) => {
    const o = (await q.query<{ id: string; number: string; fulfilment_status: FulfilmentStatus; payment_status: PaymentStatus; stock_state: string }>(
      "select id, number, fulfilment_status, payment_status, stock_state from orders where id = $1 for update", [orderId]))[0];
    if (!o) throw new OrderError("Order not found.", 404);
    if (o.fulfilment_status === to) return { changed: false, number: o.number };
    if (NEEDS_PAYMENT.includes(to) && !["paid", "partially_refunded"].includes(o.payment_status)) {
      throw new OrderError("This order isn't paid, so it can't be processed or shipped. Payment status only changes when Paystack confirms a payment.");
    }
    await q.query("update orders set fulfilment_status = $2, cancel_reason = case when $2 = 'cancelled' then $3 else cancel_reason end, updated_at = now() where id = $1", [o.id, to, opts.note ?? ""]);
    await event(q, o.id, "fulfilment", o.fulfilment_status, to, opts.note ?? "", admin.email, true);
    if (to === "cancelled" && opts.restock && o.stock_state === "committed") {
      const items = await q.query<{ variant_id: number | null; name: string; size: string; colour: string; qty: number }>("select variant_id, name, size, colour, qty from order_items where order_id = $1", [o.id]);
      for (const i of items) if (i.variant_id) {
        await q.query("update variants set stock = stock + $1 where id = $2", [i.qty, i.variant_id]);
        await adjust(q, { variantId: i.variant_id, name: i.name, size: i.size, colour: i.colour }, i.qty, "return", o.id, admin.email, "Order cancelled, items returned to stock");
      }
      await q.query("update orders set stock_state = 'released' where id = $1", [o.id]);
    }
    return { changed: true, number: o.number, unpaidReserved: to === "cancelled" && o.payment_status === "pending" && o.stock_state === "reserved" };
  });
  if (result.changed && "unpaidReserved" in result && result.unpaidReserved) await releaseOrder(result.number, "cancelled", admin.email);
  if (result.changed) await logActivity(admin, "order_status", "order", orderId, { to, note: opts.note ?? "" });
  return result;
}

export async function addOrderNote(admin: Admin, orderId: string, note: string) {
  if (!note.trim()) throw new OrderError("Write a note first.");
  await sql("insert into order_events (order_id, kind, note, actor) values ($1, 'note', $2, $3)", [orderId, note.trim().slice(0, 2000), admin.email]);
  await logActivity(admin, "order_note", "order", orderId);
}

export async function setTracking(admin: Admin, orderId: string, carrier: string, ref: string) {
  await tx(async (q) => {
    await q.query("update orders set carrier = $2, tracking_ref = $3, updated_at = now() where id = $1", [orderId, carrier.trim().slice(0, 80), ref.trim().slice(0, 120)]);
    await event(q, orderId, "tracking", null, null, [carrier.trim(), ref.trim()].filter(Boolean).join(" · ") || "Tracking removed", admin.email, true);
  });
  await logActivity(admin, "order_tracking", "order", orderId, { carrier, ref });
}

/** Records a refund (after Paystack has processed it). Payment status follows the amount refunded. */
export async function recordRefund(admin: Admin, orderId: string, amount: number, reason: string) {
  return tx(async (q) => {
    const o = (await q.query<{ id: string; total: number; refunded_amount: number; payment_status: PaymentStatus }>("select id, total, refunded_amount, payment_status from orders where id = $1 for update", [orderId]))[0];
    if (!o) throw new OrderError("Order not found.", 404);
    if (!["paid", "partially_refunded"].includes(o.payment_status)) throw new OrderError("Only paid orders can be refunded.");
    if (!Number.isInteger(amount) || amount <= 0 || o.refunded_amount + amount > o.total) throw new OrderError(`Refund must be between ₦1 and ₦${(o.total - o.refunded_amount).toLocaleString("en-NG")}.`);
    const refunded = o.refunded_amount + amount;
    const status: PaymentStatus = refunded >= o.total ? "refunded" : "partially_refunded";
    await q.query("update orders set refunded_amount = $2, payment_status = $3, updated_at = now() where id = $1", [o.id, refunded, status]);
    await event(q, o.id, "refund", o.payment_status, status, `₦${amount.toLocaleString("en-NG")} refunded${reason ? `: ${reason}` : ""}`, admin.email, true);
    await logActivity(admin, "order_refund", "order", orderId, { amount, reason }, q);
    return { status, refunded };
  });
}

/** Reserves the "email sent for this status" slot. Returns false if that email already went out. */
export async function claimStatusEmail(orderId: string, status: string) {
  const r = await sql("insert into order_events (order_id, kind, to_status, note) values ($1, 'email', $2, 'Customer emailed') on conflict do nothing returning id", [orderId, status]);
  return r.length > 0;
}
export const unclaimStatusEmail = (orderId: string, status: string) => sql("delete from order_events where order_id = $1 and kind = 'email' and to_status = $2", [orderId, status]);
