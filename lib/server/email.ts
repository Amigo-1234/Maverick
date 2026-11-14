/** Transactional email through Resend (server only). Docs: https://resend.com/docs/api-reference */
import { config, emailReady } from "./config";
import { readSettings } from "./store";
import { trackingUrl } from "./security";
import { FULFILMENT_LABELS, type FulfilmentStatus, type OrderView } from "../order";
import { formatPrice, normalisePhone } from "../site";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function resend(path: string, body: unknown) {
  const res = await fetch(`${config.email.apiBase}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.email.resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Email service error ${res.status}: ${await res.text().catch(() => "")}`);
  return res.json().catch(() => ({}));
}

export async function sendEmail(msg: { to: string | string[]; subject: string; html: string; replyTo?: string }) {
  if (!emailReady()) throw new Error("Email is not set up yet (RESEND_API_KEY or EMAIL_FROM is missing).");
  return resend("/emails", { from: config.email.from, to: msg.to, subject: msg.subject, html: msg.html, reply_to: msg.replyTo });
}

/** The shop's inbox: Settings → Order notification email, or ORDER_NOTIFY_EMAIL. */
export async function shopInbox() {
  const s = await readSettings();
  return s.orderNotifyEmail || config.email.ordersTo || null;
}

/** Sends to the shop's inbox if both email and an inbox are configured. Returns false when skipped. */
export async function notifyShop(subject: string, html: string, replyTo?: string) {
  const to = await shopInbox();
  if (!emailReady() || !to) return false;
  await sendEmail({ to, subject, html, replyTo });
  return true;
}

/** Adds a subscriber to the Resend audience if one is configured; otherwise emails the shop. */
export async function addSubscriber(email: string, source: string) {
  if (config.email.audienceId && config.email.resendKey) {
    return resend(`/audiences/${config.email.audienceId}/contacts`, { email, unsubscribed: false });
  }
  return notifyShop(`New subscriber: ${email}`, layout(`<p><strong>${esc(email)}</strong> joined the list (${esc(source)}).</p>`));
}

function layout(inner: string, footer = "DIFFERENT BY CHOICE.") {
  return `<!doctype html><html><body style="margin:0;background:#ecebe7;font-family:Arial,Helvetica,sans-serif;color:#0b0b0c">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#0b0b0c;color:#f7f6f3;padding:18px 22px;font-weight:800;letter-spacing:3px;font-size:20px">MAVERICK</div>
<div style="background:#f7f6f3;padding:22px;font-size:15px;line-height:1.55">${inner}</div>
<p style="font-size:11px;letter-spacing:2px;color:#64635f;text-transform:uppercase;padding:12px 2px">${esc(footer)}</p>
</div></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:18px 0 0"><a href="${esc(href)}" style="display:inline-block;background:#0b0b0c;color:#f7f6f3;text-decoration:none;padding:12px 20px;font-weight:700;letter-spacing:2px;font-size:12px;text-transform:uppercase">${esc(label)}</a></p>`;

function itemsTable(o: OrderView) {
  const rows = o.items.map((i) => `<tr><td style="padding:6px 0">${i.qty}× ${esc(i.name)} <span style="color:#64635f">(${esc(i.colour)}, size ${esc(i.size)})</span></td><td style="padding:6px 0;text-align:right">${formatPrice(i.total)}</td></tr>`).join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
<tr><td style="padding:6px 0;border-top:1px solid #d3d1cb">Subtotal</td><td style="padding:6px 0;border-top:1px solid #d3d1cb;text-align:right">${formatPrice(o.subtotal)}</td></tr>
${o.discountAmount ? `<tr><td style="padding:6px 0">Discount (${esc(o.discountCode)})</td><td style="padding:6px 0;text-align:right">−${formatPrice(o.discountAmount)}</td></tr>` : ""}
<tr><td style="padding:6px 0">Delivery (${esc(o.deliveryLabel)})</td><td style="padding:6px 0;text-align:right">${o.deliveryFee === 0 ? "Free" : formatPrice(o.deliveryFee)}</td></tr>
<tr><td style="padding:6px 0;font-weight:700">Total</td><td style="padding:6px 0;text-align:right;font-weight:700">${formatPrice(o.total)}</td></tr></table>`;
}

const address = (o: OrderView) => esc([o.address.address1, o.address.address2, o.address.city, o.address.state, o.address.postcode, o.address.country].filter(Boolean).join(", "));

export function orderAlertEmail(o: OrderView) {
  return {
    subject: `New order ${o.number}: ${formatPrice(o.total)}`,
    html: layout(`<h2 style="margin:0 0 12px">New paid order ${esc(o.number)}</h2>
${o.needsAttention ? `<p style="background:#fde8e7;padding:10px;margin:0 0 12px"><strong>Needs attention:</strong> ${esc(o.needsAttention)}</p>` : ""}
${itemsTable(o)}
<h3 style="margin:18px 0 6px">Customer</h3>
<p style="margin:0">${esc(o.firstName)} ${esc(o.lastName)}<br>${esc(o.email)}<br>${esc(o.phone)} · <a href="https://wa.me/${normalisePhone(o.phone)}">WhatsApp</a></p>
<h3 style="margin:18px 0 6px">Deliver to</h3><p style="margin:0">${address(o)}<br>${esc(o.deliveryLabel)} (${esc(o.deliveryEta)})</p>
${button(`${config.siteUrl}/admin/orders/${o.id}`, "Open in admin")}`),
  };
}

export function receiptEmail(o: OrderView, whatsappDisplay: string) {
  return {
    subject: `Your MAVERICK order ${o.number} is confirmed`,
    html: layout(`<h2 style="margin:0 0 12px">Thanks, ${esc(o.firstName)}. Your order is confirmed.</h2>
<p style="margin:0 0 14px">Order <strong>${esc(o.number)}</strong>. We'll email you as it moves along.</p>
${itemsTable(o)}
<h3 style="margin:18px 0 6px">Delivering to</h3><p style="margin:0">${address(o)}<br>${esc(o.deliveryLabel)}: ${esc(o.deliveryEta)}</p>
${button(trackingUrl(o.number), "Track your order")}
<p style="margin:18px 0 0">Questions? Reply to this email or WhatsApp us on ${esc(whatsappDisplay)}.</p>`),
  };
}

const STATUS_COPY: Partial<Record<FulfilmentStatus, { subject: string; body: string }>> = {
  processing: { subject: "We're working on your order", body: "Your order is being processed." },
  preparing: { subject: "Your order is being packed", body: "Your order is being packed and prepared for dispatch." },
  shipped: { subject: "Your order is on its way", body: "Your order has been shipped. The rider will call before delivery." },
  delivered: { subject: "Your order has been delivered", body: "Your order has been delivered. We hope you love it. Tag us on TikTok when you wear it." },
  cancelled: { subject: "Your order has been cancelled", body: "Your order has been cancelled. If you've paid, we'll be in touch about your refund." },
  on_hold: { subject: "Your order is on hold", body: "Your order is on hold for now. We'll contact you shortly about the next step." },
  refund_requested: { subject: "We've received your refund request", body: "We've noted your refund request and will update you once it's processed." },
};

export function statusEmail(o: OrderView, status: FulfilmentStatus, note: string, whatsappDisplay: string) {
  const copy = STATUS_COPY[status];
  if (!copy) return null;
  const tracking = status === "shipped" && (o.carrier || o.trackingRef) ? `<p style="margin:12px 0 0">Tracking: <strong>${esc([o.carrier, o.trackingRef].filter(Boolean).join(" · "))}</strong></p>` : "";
  return {
    subject: `${copy.subject} (${o.number})`,
    html: layout(`<p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#1c3fff">Order ${esc(o.number)} · ${esc(FULFILMENT_LABELS[status])}</p>
<h2 style="margin:0 0 12px">${esc(copy.subject)}</h2><p style="margin:0">${esc(copy.body)}</p>${note ? `<p style="margin:12px 0 0">${esc(note)}</p>` : ""}${tracking}
${button(trackingUrl(o.number), "Track your order")}
<p style="margin:18px 0 0">Questions? WhatsApp us on ${esc(whatsappDisplay)}.</p>`),
  };
}

export function refundEmail(o: OrderView, amount: number, full: boolean) {
  return {
    subject: `Refund for order ${o.number}`,
    html: layout(`<h2 style="margin:0 0 12px">Your ${full ? "refund" : "partial refund"} is on its way</h2>
<p style="margin:0">We've refunded <strong>${formatPrice(amount)}</strong> for order ${esc(o.number)} to your original payment method. Banks usually take 5–10 working days to show it.</p>
${button(trackingUrl(o.number), "View your order")}`),
  };
}

export function inquiryAlertEmail(i: { name: string; email: string; phone: string; product: string; size: string; colour: string; message: string; id: number }) {
  return {
    subject: `Product question: ${i.product || "general"} (from ${i.name})`,
    html: layout(`<h2 style="margin:0 0 12px">New product inquiry</h2>
<p style="margin:0">${esc(i.name)} · ${esc(i.email)}${i.phone ? ` · ${esc(i.phone)}` : ""}</p>
<p style="margin:8px 0 0"><strong>${esc(i.product)}</strong>${i.size ? ` · size ${esc(i.size)}` : ""}${i.colour ? ` · ${esc(i.colour)}` : ""}</p>
<p style="white-space:pre-wrap;margin:14px 0 0">${esc(i.message)}</p>
${button(`${config.siteUrl}/admin/inquiries?id=${i.id}`, "Open in admin")}`),
  };
}

export function contactEmail(m: { name: string; email: string; order?: string; message: string }) {
  return {
    subject: `Website message from ${m.name}`,
    html: layout(`<h2 style="margin:0 0 12px">New message from the website</h2>
<p style="margin:0">${esc(m.name)} · ${esc(m.email)}${m.order ? ` · order ${esc(m.order)}` : ""}</p>
<p style="white-space:pre-wrap;margin:14px 0 0">${esc(m.message)}</p>`),
  };
}

export function lowStockEmail(lines: string[]) {
  return {
    subject: `Low stock: ${lines.length} size${lines.length === 1 ? "" : "s"} running out`,
    html: layout(`<h2 style="margin:0 0 12px">Running low</h2><ul style="margin:0;padding-left:18px">${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
${button(`${config.siteUrl}/admin/inventory`, "Open inventory")}`),
  };
}
