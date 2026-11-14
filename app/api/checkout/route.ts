import { readCustomer, toKobo, type CartLine } from "@/lib/order";
import { config, paymentsReady } from "@/lib/server/config";
import { createOrder, OrderError, releaseOrder, orderByNumber } from "@/lib/server/orders";
import { initializeTransaction } from "@/lib/server/paystack";
import { clientIp, rateLimit } from "@/lib/server/security";
import { readSettings, CATALOG_TAG } from "@/lib/server/store";
import { revalidateTag } from "next/cache";

/** Creates the order (reserving stock) and starts a Paystack payment for it. All prices are computed here. */
export async function POST(request: Request) {
  const settings = await readSettings();
  if (settings.maintenance) return Response.json({ error: "The shop is closed for maintenance. Please check back soon." }, { status: 503 });
  if (!paymentsReady()) return Response.json({ error: "Card payments aren't switched on yet. Please order on WhatsApp for now." }, { status: 503 });
  if (!(await rateLimit("checkout", await clientIp(request), 15, 600))) return Response.json({ error: "Too many attempts. Please wait a few minutes." }, { status: 429 });

  const body = (await request.json().catch(() => null)) as { customer?: Record<string, unknown>; lines?: CartLine[]; zoneId?: number; discountCode?: string } | null;
  if (!body) return Response.json({ error: "Something went wrong reading your order. Please try again." }, { status: 400 });
  const { customer, errors } = readCustomer(body.customer ?? {});
  if (!customer) return Response.json({ error: errors[0], errors }, { status: 422 });

  let order;
  try {
    order = await createOrder({ customer, lines: body.lines ?? [], zoneId: Number(body.zoneId), discountCode: String(body.discountCode ?? "") });
  } catch (e) {
    if (e instanceof OrderError) return Response.json({ error: e.message }, { status: e.status });
    console.error("[checkout] create failed", e);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  revalidateTag(CATALOG_TAG, "max"); // stock was reserved
  const origin = request.headers.get("origin") || new URL(request.url).origin || config.siteUrl;
  try {
    const full = await orderByNumber(order.number);
    const tx = await initializeTransaction({
      email: order.email, amountKobo: toKobo(order.total), reference: order.number,
      callbackUrl: `${origin}/checkout/verify`, cancelUrl: `${origin}/checkout?cancelled=1`,
      summary: {
        customer: `${customer.firstName} ${customer.lastName}`, phone: customer.phone,
        items: full?.items.map((i) => `${i.qty}× ${i.name} (${i.colour}, ${i.size})`).join("; ") ?? "",
        delivery: `${full?.deliveryLabel}: ${[customer.address1, customer.city, customer.state].join(", ")}`,
      },
    });
    return Response.json({ url: tx.authorization_url, reference: order.number });
  } catch (e) {
    console.error("[checkout] Paystack initialize failed", e);
    await releaseOrder(order.number, "failed").catch(() => {});
    return Response.json({ error: "We couldn't reach the payment provider. Please try again in a moment." }, { status: 502 });
  }
}
