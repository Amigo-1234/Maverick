import { randomBytes } from "node:crypto";
import { priceCart, readCustomer, toKobo, type CartLine, type OrderRecord } from "@/lib/order";
import { config, paymentsReady } from "@/lib/server/config";
import { initializeTransaction, PaystackError } from "@/lib/server/paystack";

/** Starts a Paystack payment for the bag. Prices are recomputed here from the catalog. */
export async function POST(request: Request) {
  if (!paymentsReady()) {
    return Response.json({ error: "Card payments aren't switched on yet. Please order on WhatsApp for now." }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as { customer?: Record<string, unknown>; lines?: CartLine[]; shipping?: string } | null;
  if (!body) return Response.json({ error: "Something went wrong reading your order. Please try again." }, { status: 400 });

  const { customer, errors: customerErrors } = readCustomer(body.customer ?? {});
  const priced = priceCart(body.lines ?? [], String(body.shipping ?? ""));
  const errors = [...customerErrors, ...priced.errors];
  if (errors.length || !customer || !priced.shipping) return Response.json({ error: errors[0] ?? "Check your details.", errors }, { status: 422 });

  const reference = `MV-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const order: OrderRecord = {
    orderId: reference,
    customer,
    shipping: { id: priced.shipping.id, label: priced.shipping.label, eta: priced.shipping.eta, price: priced.delivery },
    items: priced.items,
    subtotal: priced.subtotal,
    delivery: priced.delivery,
    total: priced.total,
    currency: "NGN",
  };
  const origin = request.headers.get("origin") || new URL(request.url).origin || config.siteUrl;

  try {
    const tx = await initializeTransaction({
      email: customer.email,
      amountKobo: toKobo(order.total),
      reference,
      callbackUrl: `${origin}/checkout/verify`,
      order,
    });
    return Response.json({ url: tx.authorization_url, reference: tx.reference });
  } catch (e) {
    console.error("[checkout] Paystack initialize failed:", e);
    const msg = e instanceof PaystackError ? "We couldn't reach the payment provider. Please try again in a moment." : "Something went wrong. Please try again.";
    return Response.json({ error: msg }, { status: 502 });
  }
}
