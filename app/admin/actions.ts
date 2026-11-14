"use server";
/**
 * Admin server actions. Every action checks the signed-in admin on the server first
 * (requireAdmin), validates its input, and logs sensitive changes to the activity log.
 */
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { requireAdmin, createAdmin, changePassword, logActivity } from "@/lib/server/admin";
import * as data from "@/lib/server/admin-data";
import { addOrderNote, orderById, OrderError, recordRefund, setFulfilment, setTracking } from "@/lib/server/orders";
import { notifyStatusChange, resendReceipt } from "@/lib/server/payments";
import { refundTransaction } from "@/lib/server/paystack";
import { paymentsReady, emailReady } from "@/lib/server/config";
import { refundEmail, sendEmail } from "@/lib/server/email";
import { updateInquiry, type InquiryStatus } from "@/lib/server/inquiries";
import { CATALOG_TAG } from "@/lib/server/store";
import type { FulfilmentStatus } from "@/lib/order";

const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").trim().slice(0, max);
const num = (f: FormData, k: string) => Math.round(Number(f.get(k) ?? NaN));

/** Where to send the admin back to (only paths inside /admin). */
function backTo(f: FormData, fallback: string) {
  const b = str(f, "back", 300);
  return b.startsWith("/admin") && !b.startsWith("//") ? b : fallback;
}
function go(path: string, kind: "ok" | "error", msg: string): never {
  const url = new URL(path, "http://x");
  url.searchParams.delete("ok"); url.searchParams.delete("error");
  url.searchParams.set(kind, msg);
  redirect(`${url.pathname}${url.search}`);
}
/** Runs a change and redirects back with a message. Errors become friendly messages, never crashes. */
async function run(path: string, fn: () => Promise<string | void>, ok: string, catalog = false): Promise<never> {
  let message: string;
  try {
    message = (await fn()) || ok;
  } catch (e) {
    const msg = e instanceof OrderError || e instanceof Error ? e.message : "Something went wrong.";
    console.error("[admin action]", e);
    go(path, "error", msg.length > 220 ? "Something went wrong. Try again." : msg);
  }
  if (catalog) updateTag(CATALOG_TAG);
  go(path, "ok", message);
}

// ───────────── Orders ─────────────
export async function setOrderStatus(f: FormData) {
  const admin = await requireAdmin();
  const id = str(f, "orderId", 40), to = str(f, "status", 30) as FulfilmentStatus, note = str(f, "note", 500);
  const path = backTo(f, `/admin/orders/${id}`);
  return run(path, async () => {
    const r = await setFulfilment(admin, id, to, { note, restock: f.get("restock") === "on" });
    if (!r.changed) return "Status unchanged, so no email was sent.";
    if (f.get("notify") === "off") return "Status updated (customer not emailed).";
    try {
      const sent = await notifyStatusChange(id, to, note);
      return sent === "sent" ? "Status updated and the customer was emailed." : sent === "already-sent" ? "Status updated. The customer was already emailed about this status." : sent === "email-off" ? "Status updated. Email isn't set up, so no email was sent." : "Status updated.";
    } catch { return "Status updated, but the email failed to send. Try 'Resend confirmation' or contact the customer."; }
  }, "Status updated.", to === "cancelled");
}

export async function addNote(f: FormData) {
  const admin = await requireAdmin();
  const id = str(f, "orderId", 40);
  return run(backTo(f, `/admin/orders/${id}`), () => addOrderNote(admin, id, str(f, "note", 2000)), "Note added.");
}

export async function saveTracking(f: FormData) {
  const admin = await requireAdmin();
  const id = str(f, "orderId", 40);
  return run(backTo(f, `/admin/orders/${id}`), () => setTracking(admin, id, str(f, "carrier", 80), str(f, "trackingRef", 120)), "Tracking saved.");
}

export async function refundOrder(f: FormData) {
  const admin = await requireAdmin();
  const id = str(f, "orderId", 40);
  const amount = num(f, "amount");
  return run(backTo(f, `/admin/orders/${id}`), async () => {
    const o = await orderById(id);
    if (!o) throw new Error("Order not found.");
    if (!["paid", "partially_refunded"].includes(o.paymentStatus)) throw new Error("Only paid orders can be refunded.");
    if (!Number.isInteger(amount) || amount <= 0 || amount > o.total - o.refundedAmount) throw new Error(`Refund between ₦1 and ₦${(o.total - o.refundedAmount).toLocaleString("en-NG")}.`);
    let via = "recorded only";
    if (f.get("viaPaystack") === "on") {
      if (!paymentsReady()) throw new Error("Paystack isn't connected, so it can't send the refund. Untick 'Refund through Paystack' to record a refund you made another way.");
      await refundTransaction(o.number, amount * 100, str(f, "reason", 200) || undefined);
      via = "sent through Paystack";
    }
    const r = await recordRefund(admin, id, amount, `${str(f, "reason", 200)}${via === "recorded only" ? " (recorded manually)" : ""}`);
    if (emailReady()) { const m = refundEmail(o, amount, r.status === "refunded"); await sendEmail({ to: o.email, subject: m.subject, html: m.html }).catch(() => {}); }
    return `Refund of ₦${amount.toLocaleString("en-NG")} ${via}.`;
  }, "Refund recorded.");
}

export async function resendConfirmation(f: FormData) {
  const admin = await requireAdmin();
  const id = str(f, "orderId", 40);
  return run(backTo(f, `/admin/orders/${id}`), async () => { await resendReceipt(id); await logActivity(admin, "order_resend_receipt", "order", id); }, "Confirmation email re-sent.");
}

// ───────────── Products ─────────────
export async function saveProduct(f: FormData) {
  const admin = await requireAdmin();
  const id = num(f, "id") || null;
  const parsed = data.readProductForm(f);
  const path = id ? `/admin/products/${id}` : "/admin/products/new";
  if (!parsed.data) go(path, "error", parsed.error ?? "Check the form.");
  let savedId: number;
  try {
    savedId = await data.saveProduct(admin, id, parsed.data!);
  } catch (e) {
    console.error("[admin action]", e);
    go(path, "error", e instanceof Error ? e.message : "Couldn't save the product.");
  }
  updateTag(CATALOG_TAG);
  go(`/admin/products/${savedId}`, "ok", id ? "Saved. The shop is updated." : "Product created. Add sizes, stock and images below, then publish.");
}

export async function deleteProduct(f: FormData) {
  const admin = await requireAdmin();
  return run("/admin/products", async () => ((await data.deleteProduct(admin, num(f, "id"))) === "archived" ? "This product has orders, so it was archived instead of deleted." : "Product deleted."), "Done.", true);
}

export async function setProductStatus(f: FormData) {
  const admin = await requireAdmin();
  const id = num(f, "id"), status = str(f, "status", 20);
  return run(backTo(f, "/admin/products"), async () => {
    if (!["draft", "published", "archived"].includes(status)) throw new Error("Unknown status.");
    const { sql } = await import("@/lib/server/db");
    await sql("update products set status = $2, updated_at = now() where id = $1", [id, status]);
    await logActivity(admin, `product_${status}`, "product", String(id));
  }, status === "published" ? "Published. It's live in the shop." : status === "draft" ? "Unpublished. It's hidden from the shop." : "Archived.", true);
}

export async function clearImage(f: FormData) {
  const admin = await requireAdmin();
  const id = num(f, "id"), slot = str(f, "slot", 10) as "front" | "back" | "side";
  return run(`/admin/products/${id}`, async () => { if (!["front", "back", "side"].includes(slot)) throw new Error("Unknown slot."); await data.setProductImage(admin, id, slot, null, null); }, "Image removed.", true);
}
export async function removeImage(f: FormData) {
  const admin = await requireAdmin();
  return run(backTo(f, "/admin/products"), () => data.removeGalleryImage(admin, num(f, "imageId")), "Photo removed.", true);
}
export async function moveImage(f: FormData) {
  const admin = await requireAdmin();
  return run(backTo(f, "/admin/products"), () => data.moveGalleryImage(admin, num(f, "imageId"), num(f, "dir") < 0 ? -1 : 1), "Order updated.", true);
}
export async function saveImageAlt(f: FormData) {
  await requireAdmin();
  return run(backTo(f, "/admin/products"), () => data.updateGalleryAlt(num(f, "imageId"), str(f, "alt", 200)), "Description saved.", true);
}

// ───────────── Stock ─────────────
export async function addVariant(f: FormData) {
  const admin = await requireAdmin();
  const pid = num(f, "productId");
  return run(backTo(f, `/admin/products/${pid}`), () => data.addVariant(admin, pid, str(f, "size", 10), str(f, "colour", 40), Math.max(0, num(f, "stock") || 0), Math.max(0, num(f, "lowAt") || 3)), "Size added.", true);
}
export async function changeStock(f: FormData) {
  const admin = await requireAdmin();
  const mode = str(f, "mode", 10) as "add" | "remove" | "set";
  const amount = mode === "set" && f.get("soldOut") === "1" ? 0 : num(f, "amount");
  return run(backTo(f, "/admin/inventory"), async () => {
    if (!["add", "remove", "set"].includes(mode)) throw new Error("Unknown stock change.");
    const after = await data.changeStock(admin, num(f, "variantId"), mode, amount, str(f, "note", 200));
    return after === 0 ? "Marked sold out. Customers can't buy this size now." : `Stock is now ${after}.`;
  }, "Stock updated.", true);
}
export async function setLowStockLevel(f: FormData) {
  const admin = await requireAdmin();
  return run(backTo(f, "/admin/inventory"), () => data.updateVariant(admin, num(f, "variantId"), num(f, "lowAt")), "Alert level saved.", true);
}
export async function removeVariant(f: FormData) {
  const admin = await requireAdmin();
  return run(backTo(f, "/admin/products"), () => data.removeVariant(admin, num(f, "variantId")), "Size removed.", true);
}

// ───────────── Collections & categories ─────────────
export async function saveCollection(f: FormData) {
  const admin = await requireAdmin();
  const id = num(f, "id") || null;
  return run("/admin/collections", () => data.saveCollection(admin, id, { handle: str(f, "handle", 60), title: str(f, "title", 80), blurb: str(f, "blurb", 300), visible: f.get("visible") === "on", sort: num(f, "sort") || 0, productIds: f.getAll("products").map(Number).filter(Boolean) }), "Collection saved.", true);
}
export async function deleteCollection(f: FormData) {
  const admin = await requireAdmin();
  return run("/admin/collections", () => data.deleteCollection(admin, num(f, "id")), "Collection deleted.", true);
}
export async function saveCategory(f: FormData) {
  const admin = await requireAdmin();
  return run("/admin/collections", () => data.saveCategory(admin, num(f, "id") || null, { handle: str(f, "handle", 60), title: str(f, "title", 80), blurb: str(f, "blurb", 300), sort: num(f, "sort") || 0 }), "Category saved.", true);
}
export async function deleteCategory(f: FormData) {
  const admin = await requireAdmin();
  return run("/admin/collections", () => data.deleteCategory(admin, num(f, "id")), "Category deleted. Its products are now uncategorised.", true);
}

// ───────────── Inquiries ─────────────
export async function saveInquiry(f: FormData) {
  const admin = await requireAdmin();
  const id = num(f, "id");
  return run(backTo(f, `/admin/inquiries?id=${id}`), () => updateInquiry(admin, id, str(f, "status", 20) as InquiryStatus, str(f, "notes", 5000)), "Inquiry updated.");
}

// ───────────── Discounts ─────────────
export async function createDiscount(f: FormData) {
  const admin = await requireAdmin();
  return run("/admin/discounts", () => data.createDiscount(admin, f), "Discount code created.");
}
export async function toggleDiscount(f: FormData) {
  const admin = await requireAdmin();
  return run("/admin/discounts", () => data.toggleDiscount(admin, num(f, "id")), "Discount updated.");
}
export async function deleteDiscount(f: FormData) {
  const admin = await requireAdmin();
  return run("/admin/discounts", () => data.deleteDiscount(admin, num(f, "id")), "Discount removed.");
}

// ───────────── Delivery & settings ─────────────
export async function saveZone(f: FormData) {
  const admin = await requireAdmin();
  return run("/admin/delivery", () => data.saveZone(admin, num(f, "id") || null, f), "Delivery option saved.", true);
}
export async function deleteZone(f: FormData) {
  const admin = await requireAdmin();
  return run("/admin/delivery", () => data.deleteZone(admin, num(f, "id")), "Delivery option deleted.", true);
}
export async function saveDeliverySettings(f: FormData) {
  const admin = await requireAdmin();
  return run("/admin/delivery", () => data.saveSettings(admin, { freeDeliveryOver: Math.max(0, num(f, "freeDeliveryOver") || 0), deliveryInstructions: str(f, "deliveryInstructions", 400) }), "Delivery settings saved.", true);
}

export async function saveStoreSettings(f: FormData) {
  const admin = await requireAdmin();
  return run("/admin/settings", async () => {
    const wa = str(f, "whatsapp", 20).replace(/\D/g, "");
    if (wa && wa.length < 10) throw new Error("Enter the WhatsApp number in full, with the country code (e.g. 2347025244302).");
    const notify = str(f, "orderNotifyEmail", 160);
    if (notify && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(notify)) throw new Error("The order notification email doesn't look right.");
    await data.saveSettings(admin, {
      name: str(f, "name", 60) || "MAVERICK", slogan: str(f, "slogan", 80), email: str(f, "email", 160), whatsapp: wa,
      whatsappDisplay: str(f, "whatsappDisplay", 30) || `+${wa}`, supportContact: str(f, "supportContact", 120), address: str(f, "address", 200),
      socials: { tiktok: str(f, "tiktok", 200), snapchat: str(f, "snapchat", 200), instagram: str(f, "instagram", 200) },
      announcement: str(f, "announcement", 120), maintenance: f.get("maintenance") === "on", orderNotifyEmail: notify,
      returnsDays: Math.max(0, num(f, "returnsDays") || 0), currency: "NGN",
      legal: { businessName: str(f, "businessName", 120), registration: str(f, "registration", 40), address: str(f, "legalAddress", 200), updated: str(f, "legalUpdated", 40) },
    });
  }, "Settings saved. The shop is updated.", true);
}

export async function addAdmin(f: FormData) {
  const admin = await requireAdmin("owner");
  return run("/admin/settings#team", () => createAdmin(admin, str(f, "email", 160), str(f, "name", 80), String(f.get("password") ?? ""), f.get("role") === "owner" ? "owner" : "staff"), "Admin added. Share the password with them privately.");
}
export async function toggleAdmin(f: FormData) {
  const admin = await requireAdmin("owner");
  return run("/admin/settings#team", () => data.setAdminActive(admin, num(f, "id"), f.get("active") === "1"), "Team updated.");
}
export async function updatePassword(f: FormData) {
  const admin = await requireAdmin();
  const next = String(f.get("next") ?? "");
  if (next !== String(f.get("confirm") ?? "")) go("/admin/settings#password", "error", "The new passwords don't match.");
  return run("/admin/login", () => changePassword(admin, String(f.get("current") ?? ""), next), "Password changed. Sign in again.");
}
