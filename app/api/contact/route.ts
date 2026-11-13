import { emailReady, config } from "@/lib/server/config";
import { contactEmail, sendEmail } from "@/lib/server/email";

export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as Record<string, string> | null;
  if (!b) return Response.json({ error: "Something went wrong. Please try again." }, { status: 400 });
  if (b.company) return Response.json({ ok: true }); // honeypot: bots fill hidden fields
  const name = String(b.name ?? "").trim().slice(0, 80);
  const email = String(b.email ?? "").trim().slice(0, 160);
  const message = String(b.message ?? "").trim().slice(0, 4000);
  const order = String(b.order ?? "").trim().slice(0, 60) || undefined;
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || message.length < 2) {
    return Response.json({ error: "Add your name, a valid email and a message." }, { status: 422 });
  }
  if (!emailReady()) return Response.json({ error: "Our inbox isn't connected yet. Please message us on WhatsApp." }, { status: 503 });
  try {
    const m = contactEmail({ name, email, order, message });
    await sendEmail({ to: config.email.ordersTo!, subject: m.subject, html: m.html, replyTo: email });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[contact]", e);
    return Response.json({ error: "We couldn't send that. Please message us on WhatsApp." }, { status: 502 });
  }
}
