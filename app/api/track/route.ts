import { lookupOrder, orderByNumber, customerView } from "@/lib/server/orders";
import { clientIp, rateLimit, trackingTokenOk } from "@/lib/server/security";

/** Customer order lookup. Needs the order number plus the email or phone on the order (or a signed email link). */
export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as { order?: string; contact?: string; token?: string } | null;
  const number = String(b?.order ?? "").trim().toUpperCase().slice(0, 40);
  const ip = await clientIp(request);
  // Limits per visitor and per order number stop guessing.
  if (!(await rateLimit("track-ip", ip, 12, 900)) || (number && !(await rateLimit("track-order", number, 8, 900)))) {
    return Response.json({ error: "Too many attempts. Please wait 15 minutes and try again, or WhatsApp us." }, { status: 429 });
  }
  let order = null;
  if (b?.token && number && trackingTokenOk(number, String(b.token))) {
    const o = await orderByNumber(number);
    order = o ? customerView(o) : null;
  } else {
    order = await lookupOrder(number, String(b?.contact ?? "").slice(0, 160));
  }
  // Same message whether the number or the contact detail was wrong, so nothing leaks.
  if (!order) return Response.json({ error: "We couldn't find an order with those details. Check the order number and the email or phone you used at checkout." }, { status: 404 });
  return Response.json({ order });
}
