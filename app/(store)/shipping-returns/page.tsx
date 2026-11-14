import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { formatPrice } from "@/lib/site";
import { getStorefront } from "@/lib/server/store";

export const metadata: Metadata = { title: "Shipping & Returns" };

export default async function ShippingReturns() {
  const { settings, zones } = await getStorefront();
  void zones;
  return (
    <div className="mx-auto max-w-7xl gutter pb-24 pt-10">
      <PageHeader title="Shipping & returns" />
      <div className="prose-mv">
        <h2 className="!mt-0">Delivery</h2>
        <ul className="flex flex-col gap-2">
          {zones.map((s) => <li key={s.id}><strong>{s.name}:</strong> {s.eta}, {s.fee === 0 ? "free" : formatPrice(s.fee)}.{s.instructions ? ` ${s.instructions}` : ""}</li>)}
        </ul>
        <p>{settings.freeDeliveryOver > 0 && <>Delivery is free on orders over {formatPrice(settings.freeDeliveryOver)}. </>}{settings.deliveryInstructions}  Orders are packed and dispatched on working days, and you&apos;ll get tracking by email once your order ships.</p>
        <h2>Returns</h2>
        <p>Changed your mind? Send pieces back within {settings.returnsDays} days of delivery. They need to be unworn and unwashed, with the tags still on.</p>
        <p>To start a return, email <span className="font-mono">{settings.email}</span> with your order number. We&apos;ll refund to your original payment method once the return reaches us.</p>
        <h2>Exchanges</h2>
        <p>Need a different size? Return the original and place a new order. It&apos;s the quickest way to get the size you want before it sells out.</p>
      </div>
    </div>
  );
}
