/** Transactional email through Resend (server only). Docs: https://resend.com/docs/api-reference */
import { config, emailReady } from "./config";
import type { OrderRecord } from "../order";
import { formatPrice, site } from "../site";

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
  if (!emailReady()) throw new Error("Email is not set up yet (RESEND_API_KEY, EMAIL_FROM or ORDER_NOTIFY_EMAIL is missing).");
  return resend("/emails", { from: config.email.from, to: msg.to, subject: msg.subject, html: msg.html, reply_to: msg.replyTo });
}

/** Adds a subscriber to the Resend audience if one is configured; otherwise emails the shop. */
export async function addSubscriber(email: string, source: string) {
  if (config.email.audienceId && config.email.resendKey) {
    return resend(`/audiences/${config.email.audienceId}/contacts`, { email, unsubscribed: false });
  }
  return sendEmail({ to: config.email.ordersTo!, subject: `New subscriber: ${email}`, html: layout(`<p><strong>${esc(email)}</strong> joined the list (${esc(source)}).</p>`) });
}

function layout(inner: string) {
  return `<!doctype html><html><body style="margin:0;background:#ecebe7;font-family:Arial,Helvetica,sans-serif;color:#0b0b0c">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#0b0b0c;color:#f7f6f3;padding:18px 22px;font-weight:800;letter-spacing:3px;font-size:20px">MAVERICK</div>
<div style="background:#f7f6f3;padding:22px;font-size:15px;line-height:1.55">${inner}</div>
<p style="font-size:11px;letter-spacing:2px;color:#64635f;text-transform:uppercase;padding:12px 2px">${esc(site.slogan)}</p>
</div></body></html>`;
}

function itemsTable(o: OrderRecord) {
  const rows = o.items.map((i) => `<tr><td style="padding:6px 0">${i.qty}× ${esc(i.name)} <span style="color:#64635f">(${esc(i.colour)}, size ${esc(i.size)})</span></td><td style="padding:6px 0;text-align:right">${formatPrice(i.total)}</td></tr>`).join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
<tr><td style="padding:6px 0;border-top:1px solid #d3d1cb">Subtotal</td><td style="padding:6px 0;border-top:1px solid #d3d1cb;text-align:right">${formatPrice(o.subtotal)}</td></tr>
<tr><td style="padding:6px 0">Delivery (${esc(o.shipping.label)})</td><td style="padding:6px 0;text-align:right">${o.delivery === 0 ? "Free" : formatPrice(o.delivery)}</td></tr>
<tr><td style="padding:6px 0;font-weight:700">Total paid</td><td style="padding:6px 0;text-align:right;font-weight:700">${formatPrice(o.total)}</td></tr></table>`;
}

const address = (o: OrderRecord) => esc([o.customer.address1, o.customer.address2, o.customer.city, o.customer.state, o.customer.postcode, o.customer.country].filter(Boolean).join(", "));

export function orderAlertEmail(o: OrderRecord, reference: string) {
  const phone = o.customer.phone.replace(/\D/g, "").replace(/^0/, "234");
  return {
    subject: `New order ${o.orderId}: ${formatPrice(o.total)}`,
    html: layout(`<h2 style="margin:0 0 12px">New paid order ${esc(o.orderId)}</h2>
<p style="margin:0 0 14px">Paystack reference: <strong>${esc(reference)}</strong></p>
${itemsTable(o)}
<h3 style="margin:18px 0 6px">Customer</h3>
<p style="margin:0">${esc(o.customer.firstName)} ${esc(o.customer.lastName)}<br>${esc(o.customer.email)}<br>${esc(o.customer.phone)} · <a href="https://wa.me/${phone}">WhatsApp</a></p>
<h3 style="margin:18px 0 6px">Deliver to</h3><p style="margin:0">${address(o)}<br>${esc(o.shipping.label)} (${esc(o.shipping.eta)})</p>`),
  };
}

export function receiptEmail(o: OrderRecord) {
  return {
    subject: `Your MAVERICK order ${o.orderId} is confirmed`,
    html: layout(`<h2 style="margin:0 0 12px">Thanks, ${esc(o.customer.firstName)}. Your order is confirmed.</h2>
<p style="margin:0 0 14px">Order <strong>${esc(o.orderId)}</strong>. We'll message you when it ships.</p>
${itemsTable(o)}
<h3 style="margin:18px 0 6px">Delivering to</h3><p style="margin:0">${address(o)}<br>${esc(o.shipping.label)}: ${esc(o.shipping.eta)}</p>
<p style="margin:18px 0 0">Questions? Reply to this email or WhatsApp us on ${esc(site.socials.whatsapp.display)}.</p>`),
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
