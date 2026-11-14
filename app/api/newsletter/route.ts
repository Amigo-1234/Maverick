import { config, emailReady } from "@/lib/server/config";
import { addSubscriber } from "@/lib/server/email";
import { validEmail } from "@/lib/order";
import { clientIp, rateLimit } from "@/lib/server/security";

export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as Record<string, string> | null;
  if (!b) return Response.json({ error: "Something went wrong. Please try again." }, { status: 400 });
  if (b.company) return Response.json({ ok: true }); // honeypot
  const email = String(b.email ?? "").trim().toLowerCase().slice(0, 160);
  if (!validEmail(email)) return Response.json({ error: "Enter a valid email address." }, { status: 422 });
  if (!(await rateLimit("newsletter", await clientIp(request), 5, 3600))) return Response.json({ error: "Please try again later." }, { status: 429 });
  if (!emailReady() && !(config.email.audienceId && config.email.resendKey)) {
    return Response.json({ error: "Sign-ups open soon. Follow us on TikTok in the meantime." }, { status: 503 });
  }
  try {
    await addSubscriber(email, "newsletter");
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[newsletter]", e);
    return Response.json({ error: "We couldn't add you just now. Please try again." }, { status: 502 });
  }
}
