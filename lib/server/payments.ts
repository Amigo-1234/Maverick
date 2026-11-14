/**
 * Payment confirmation and customer notifications (server only).
 * Both /checkout/verify and the Paystack webhook call confirmPayment(); whichever runs first does the work.
 */
import { revalidateTag } from "next/cache";
import { verifyTransaction } from "./paystack";
import { claimStatusEmail, markPaid, orderById, orderByNumber, releaseOrder, unclaimStatusEmail } from "./orders";
import { addSubscriber, lowStockEmail, notifyShop, orderAlertEmail, receiptEmail, sendEmail, statusEmail } from "./email";
import { emailReady } from "./config";
import { readSettings, CATALOG_TAG } from "./store";
import { sql } from "./db";
import type { FulfilmentStatus } from "../order";

export type PaymentOutcome =
  | { state: "paid"; number: string }
  | { state: "failed" | "abandoned"; number: string }
  | { state: "pending"; number: string }
  | { state: "mismatch"; number: string }
  | { state: "unknown" };

const warn = (where: string) => (e: unknown) => console.error(`[${where}]`, e);

/**
 * `revalidate: false` when called while rendering a page (Next.js only allows cache invalidation
 * from route handlers and actions); that page then asks /api/catalog/refresh to do it.
 */
export async function confirmPayment(reference: string, opts: { revalidate?: boolean } = {}): Promise<PaymentOutcome> {
  const refresh = () => { if (opts.revalidate !== false) revalidateTag(CATALOG_TAG, "max"); };
  const order = await orderByNumber(reference);
  if (!order) return { state: "unknown" };
  if (order.paymentStatus === "paid" || order.paymentStatus === "refunded" || order.paymentStatus === "partially_refunded") return { state: "paid", number: order.number };

  const tx = await verifyTransaction(reference);
  if (tx.status === "success") {
    const r = await markPaid(reference, { amountKobo: tx.amount, currency: tx.currency, paidAt: tx.paid_at, channel: tx.channel ?? null });
    if (r.found && "mismatch" in r && r.mismatch) return { state: "mismatch", number: reference };
    if (r.found && r.first) {
      refresh(); // stock changed
      await afterPaid(r.id).catch(warn("after-paid"));
    }
    return { state: "paid", number: reference };
  }
  if (tx.status === "failed" || tx.status === "abandoned") {
    if (await releaseOrder(reference, tx.status)) refresh();
    return { state: tx.status, number: reference };
  }
  return { state: "pending", number: reference };
}

/** Emails the shop and the customer, signs up opted-in customers, and warns about low stock. */
async function afterPaid(orderId: string) {
  const o = await orderById(orderId);
  if (!o) return;
  const settings = await readSettings();
  if (!emailReady()) { console.warn("[order] paid", o.number, "but email isn't set up"); return; }
  const alert = orderAlertEmail(o);
  const receipt = receiptEmail(o, settings.whatsappDisplay);
  await Promise.allSettled([
    notifyShop(alert.subject, alert.html, o.email),
    claimStatusEmail(o.id, "paid").then((first) => first && sendEmail({ to: o.email, subject: receipt.subject, html: receipt.html })),
    o.items.length && (await sql("select marketing from orders where id = $1", [o.id]))[0]?.marketing ? addSubscriber(o.email, "checkout") : null,
  ]).then((rs) => rs.forEach((r) => r.status === "rejected" && console.error("[order email]", r.reason)));

  const low = await sql<{ name: string; size: string; colour: string; stock: number }>(
    `select p.name, v.size, v.colour, v.stock from order_items i join variants v on v.id = i.variant_id join products p on p.id = v.product_id
     where i.order_id = $1 and v.stock <= v.low_stock_at`, [o.id]);
  if (low.length) {
    const m = lowStockEmail(low.map((l) => `${l.name} ${l.colour ? `(${l.colour}) ` : ""}size ${l.size}: ${l.stock === 0 ? "SOLD OUT" : `${l.stock} left`}`));
    await notifyShop(m.subject, m.html).catch(warn("low-stock"));
  }
}

/** Emails the customer about a fulfilment change, once per status. */
export async function notifyStatusChange(orderId: string, status: FulfilmentStatus, note: string) {
  if (!emailReady()) return "email-off" as const;
  const o = await orderById(orderId);
  if (!o) return "missing" as const;
  const settings = await readSettings();
  const msg = statusEmail(o, status, note, settings.whatsappDisplay);
  if (!msg) return "no-template" as const;
  if (!(await claimStatusEmail(orderId, status))) return "already-sent" as const;
  try { await sendEmail({ to: o.email, subject: msg.subject, html: msg.html }); return "sent" as const; }
  catch (e) { await unclaimStatusEmail(orderId, status); throw e; }
}

/** Sends the order confirmation again (staff action, paid orders only). */
export async function resendReceipt(orderId: string) {
  const o = await orderById(orderId);
  if (!o || !["paid", "partially_refunded"].includes(o.paymentStatus)) throw new Error("Only paid orders have a confirmation to resend.");
  const settings = await readSettings();
  const r = receiptEmail(o, settings.whatsappDisplay);
  await sendEmail({ to: o.email, subject: r.subject, html: r.html });
  await sql("insert into order_events (order_id, kind, note) values ($1, 'note', 'Confirmation email re-sent')", [orderId]);
}
