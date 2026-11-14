import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { formatPrice } from "@/lib/site";
import { getStorefront } from "@/lib/server/store";

export const metadata: Metadata = { title: "Terms of Sale" };

export default async function Terms() {
  const { settings, zones } = await getStorefront();
  void zones;
  const L = settings.legal;
  return (
    <div className="mx-auto max-w-7xl gutter pb-24 pt-10">
      <PageHeader title="Terms of Sale" intro={`Last updated ${L.updated}. These terms apply when you buy from ${L.businessName} through this website.`} />
      <div className="prose-mv">
        <h2 className="!mt-0">1. Who we are</h2>
        <p>This store is run by {L.businessName}{L.registration ? ` (registration ${L.registration})` : ""}, {L.address}. You can reach us on WhatsApp at {settings.whatsappDisplay} or by email at {settings.email}.</p>

        <h2>2. Orders</h2>
        <p>When you pay, you make an offer to buy the pieces in your bag. Your order is accepted when your payment is confirmed and we email you a receipt. If a piece turns out to be unavailable after you&apos;ve paid, we&apos;ll tell you and refund that piece in full.</p>

        <h2>3. Prices and payment</h2>
        <p>Prices are in Nigerian naira (₦) and include any applicable taxes. Delivery is shown separately at checkout. Payments are processed securely by Paystack by card, bank transfer or USSD. We never see or store your card details.</p>

        <h2>4. Delivery</h2>
        <p>We deliver within Nigeria. {zones.map((s) => `${s.name} takes ${s.eta} and costs ${s.fee === 0 ? "nothing" : formatPrice(s.fee)}`).join("; ")}. Delivery is free on orders over {formatPrice(settings.freeDeliveryOver)}. Delivery times start when your order is dispatched and are estimates, not guarantees. Please make sure your address and phone number are correct, because the rider will call you.</p>

        <h2>5. Returns and refunds</h2>
        <p>You can return pieces within {settings.returnsDays} days of delivery if they&apos;re unworn, unwashed and have their tags on. Message us with your order number to start a return. Once we receive and check the return, we refund the price of the returned pieces to your original payment method. Delivery charges are refunded only if the piece was faulty or we sent the wrong item. See <Link href="/shipping-returns" className="underline underline-offset-2">Shipping &amp; Returns</Link>.</p>

        <h2>6. Faulty or wrong items</h2>
        <p>If something arrives damaged, faulty or isn&apos;t what you ordered, tell us within 48 hours of delivery with a photo. We&apos;ll replace it or refund you in full, including delivery.</p>

        <h2>7. Product images and sizing</h2>
        <p>We show our pieces as accurately as we can, but colours can look slightly different on different screens. Check the <Link href="/size-guide" className="underline underline-offset-2">size guide</Link> before you order.</p>

        <h2>8. Our designs</h2>
        <p>The MAVERICK name, logo, artwork and photos on this site belong to {L.businessName}. You may not copy or reuse them without our written permission.</p>

        <h2>9. Liability</h2>
        <p>Nothing in these terms limits your rights as a consumer under Nigerian law, including the Federal Competition and Consumer Protection Act. Beyond those rights, our liability for an order is limited to the amount you paid for it.</p>

        <h2>10. Changes and governing law</h2>
        <p>We may update these terms from time to time. The version on this page when you place your order applies to that order. These terms are governed by the laws of the Federal Republic of Nigeria.</p>
      </div>
    </div>
  );
}
