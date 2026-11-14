import { OrderError, priceBag } from "@/lib/server/orders";
import { tx } from "@/lib/server/db";
import type { CartLine } from "@/lib/order";

/** Live price check for the checkout page: stock, delivery fee and discount, all computed on the server. */
export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as { lines?: CartLine[]; state?: string; zoneId?: number; discountCode?: string } | null;
  if (!b) return Response.json({ error: "Bad request" }, { status: 400 });
  try {
    const priced = await tx((q) => priceBag(q, b.lines ?? [], { state: b.state, zoneId: b.zoneId ? Number(b.zoneId) : undefined, discountCode: b.discountCode }));
    return Response.json({
      subtotal: priced.subtotal,
      discount: priced.discount ? { code: priced.discount.code, amount: priced.discount.amount } : null,
      delivery: priced.delivery ? { zoneId: priced.delivery.zone.id, fee: priced.delivery.fee } : null,
      total: priced.total,
    });
  } catch (e) {
    if (e instanceof OrderError) return Response.json({ error: e.message, field: /discount|code/i.test(e.message) ? "discount" : "bag" }, { status: e.status });
    console.error("[quote]", e);
    return Response.json({ error: "Couldn't check prices." }, { status: 500 });
  }
}
