import { validEmail } from "@/lib/order";
import { createInquiry } from "@/lib/server/inquiries";
import { inquiryAlertEmail, notifyShop } from "@/lib/server/email";
import { clientIp, rateLimit } from "@/lib/server/security";

/** "Ask about this product": saves the question, then emails the shop. */
export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as Record<string, string> | null;
  if (!b) return Response.json({ error: "Something went wrong. Please try again." }, { status: 400 });
  if (b.company) return Response.json({ ok: true }); // honeypot: bots fill hidden fields
  const s = (k: string, max: number) => String(b[k] ?? "").trim().slice(0, max);
  const data = { name: s("name", 80), email: s("email", 160).toLowerCase(), phone: s("phone", 30), productSlug: s("product", 80), size: s("size", 10), colour: s("colour", 40), message: s("message", 3000) };
  if (!data.name || !validEmail(data.email) || data.message.length < 3) return Response.json({ error: "Add your name, a valid email and your question." }, { status: 422 });

  const ip = await clientIp(request);
  if (!(await rateLimit("inquiry-ip", ip, 6, 3600)) || !(await rateLimit("inquiry-email", data.email, 4, 3600))) {
    return Response.json({ error: "You've sent a few questions already. We'll reply soon, or WhatsApp us for a faster answer." }, { status: 429 });
  }
  const saved = await createInquiry(data);
  if (saved.duplicate) return Response.json({ error: "We've already got this question from you. We'll reply soon." }, { status: 409 });

  const m = inquiryAlertEmail({ ...data, product: saved.productName, id: saved.id });
  await notifyShop(m.subject, m.html, data.email).catch((e) => console.error("[inquiry email]", e)); // saved either way
  return Response.json({ ok: true, id: saved.id });
}
