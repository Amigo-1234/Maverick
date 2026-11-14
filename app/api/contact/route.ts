import { emailReady } from "@/lib/server/config";
import { contactEmail, notifyShop } from "@/lib/server/email";
import { validEmail } from "@/lib/order";
import { clientIp, rateLimit } from "@/lib/server/security";

export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as Record<string, string> | null;
  if (!b) return Response.json({ error: "Something went wrong. Please try again." }, { status: 400 });
  if (b.company) return Response.json({ ok: true }); // honeypot: bots fill hidden fields
  const name = String(b.name ?? "").trim().slice(0, 80);
  const email = String(b.email ?? "").trim().slice(0, 160);
  const message = String(b.message ?? "").trim().slice(0, 4000);
  const order = String(b.order ?? "").trim().slice(0, 60) || undefined;
  if (!name || !validEmail(email) || message.length < 2) return Response.json({ error: "Add your name, a valid email and a message." }, { status: 422 });
  if (!(await rateLimit("contact", await clientIp(request), 5, 3600))) return Response.json({ error: "You've sent a few messages already. Please WhatsApp us." }, { status: 429 });
  if (!emailReady()) return Response.json({ error: "Our inbox isn't connected yet. Please message us on WhatsApp." }, { status: 503 });
  try {
    const m = contactEmail({ name, email, order, message });
    if (!(await notifyShop(m.subject, m.html, email))) return Response.json({ error: "Our inbox isn't connected yet. Please message us on WhatsApp." }, { status: 503 });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[contact]", e);
    return Response.json({ error: "We couldn't send that. Please message us on WhatsApp." }, { status: 502 });
  }
}
