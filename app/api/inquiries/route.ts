import { validEmail } from "@/lib/order";
import { createInquiry } from "@/lib/server/inquiries";
import { inquiryAlertEmail, notifyShop } from "@/lib/server/email";
import { clientIp, rateLimit, refundRateLimit } from "@/lib/server/security";
import { sendPush } from "@/lib/server/push";

/** "Ask about this product": saves the question, then emails the shop. */
export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as Record<string, string> | null;
  if (!b) return Response.json({ error: "Something went wrong. Please try again." }, { status: 400 });
  if (b.company) return Response.json({ ok: true }); // honeypot: bots fill hidden fields
  const s = (k: string, max: number) => String(b[k] ?? "").trim().slice(0, max);
  const data = { name: s("name", 80), email: s("email", 160).toLowerCase(), phone: s("phone", 30), productSlug: s("product", 80), size: s("size", 10), colour: s("colour", 40), message: s("message", 3000) };
  if (!data.name || !validEmail(data.email) || data.message.length < 3) return Response.json({ error: "Add your name, a valid email and your question." }, { status: 422 });

  const ip = await clientIp(request);
  const ipBucket = "inquiry-v2-ip", emailBucket = "inquiry-v2-email";
  const ipAllowed = await rateLimit(ipBucket, ip, 8, 3600);
  const emailAllowed = ipAllowed && await rateLimit(emailBucket, data.email, 6, 3600);
  if (!ipAllowed || !emailAllowed) {
    return Response.json({ error: "You've sent a few questions already. We'll reply soon, or WhatsApp us for a faster answer." }, { status: 429 });
  }
  let saved: Awaited<ReturnType<typeof createInquiry>>;
  try {
    saved = await createInquiry(data);
  } catch (error) {
    await Promise.all([refundRateLimit(ipBucket, ip), refundRateLimit(emailBucket, data.email)]).catch(() => {});
    console.error("[inquiry create]", error);
    return Response.json({ error: "We couldn't start the chat just now. Please try again." }, { status: 503 });
  }
  if (saved.duplicate) return Response.json({ error: "We've already got this question from you. We'll reply soon." }, { status: 409 });

  const m = inquiryAlertEmail({ ...data, product: saved.productName, id: saved.id });
  await notifyShop(m.subject, m.html, data.email).catch((e) => console.error("[inquiry email]", e)); // saved either way
  await sendPush("admin", null, { title: `New message from ${data.name}`, body: `${saved.productName || "Product question"}: ${data.message.slice(0, 120)}`, url: `/admin/inquiries?id=${saved.id}`, tag: `inquiry-${saved.id}` }).catch((e) => console.error("[inquiry push]", e));
  return Response.json({ ok: true, id: saved.id, token: saved.token });
}
