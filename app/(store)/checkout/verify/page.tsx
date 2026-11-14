import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { formatPrice, whatsappLink } from "@/lib/site";
import { confirmPayment } from "@/lib/server/payments";
import { orderByNumber } from "@/lib/server/orders";
import { readSettings } from "@/lib/server/store";
import { trackingToken } from "@/lib/server/security";
import { OrderPlaced } from "./order-placed";
import { CatalogRefresh } from "./catalog-refresh";

export const metadata: Metadata = { title: "Order status", robots: { index: false } };

export default function VerifyPage(props: PageProps<"/checkout/verify">) {
  return (
    <Suspense fallback={<Checking />}>
      <Result searchParams={props.searchParams} />
    </Suspense>
  );
}

function Checking() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-7xl flex-col justify-center gap-3 gutter py-20" role="status">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Checking with Paystack…</p>
      <h1 className="font-display text-6xl uppercase">Confirming your payment</h1>
    </div>
  );
}

function Problem({ title, body, reference, wa }: { title: string; body: string; reference?: string; wa: string }) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col items-start gap-5 gutter py-20">
      {reference && <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Reference {reference}</p>}
      <h1 className="font-display text-[clamp(3rem,9vw,6rem)] uppercase leading-[0.85]">{title}</h1>
      <p className="max-w-[56ch] text-muted-foreground">{body}</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/checkout" className="btn">Back to checkout</Link>
        <a href={whatsappLink(wa, `Hi, I need help with my payment${reference ? ` (reference ${reference})` : ""}.`)} target="_blank" rel="noopener noreferrer" className="btn-ghost">WhatsApp us</a>
      </div>
    </div>
  );
}

async function Result({ searchParams }: { searchParams: PageProps<"/checkout/verify">["searchParams"] }) {
  const sp = await searchParams;
  await connection(); // payment confirmation always runs per request
  const settings = await readSettings();
  const reference = String(sp.reference ?? sp.trxref ?? "").slice(0, 80);
  if (!reference) return <Problem wa={settings.whatsapp} title="No payment found" body="We couldn't find a payment to check. If you were charged, WhatsApp us and we'll sort it out." />;

  let outcome;
  try { outcome = await confirmPayment(reference, { revalidate: false }); }
  catch (e) {
    console.error("[verify]", e);
    return <Problem wa={settings.whatsapp} reference={reference} title="We couldn't confirm yet" body="Paystack didn't answer just now. Refresh this page in a minute. If money left your account, your order is safe: WhatsApp us with the reference above." />;
  }
  if (outcome.state === "unknown") return <Problem wa={settings.whatsapp} reference={reference} title="We couldn't confirm yet" body="We don't recognise that payment reference. If money left your account, WhatsApp us with the reference above." />;
  if (outcome.state === "failed" || outcome.state === "abandoned") {
    return <><CatalogRefresh /><Problem wa={settings.whatsapp} reference={reference} title="Payment not completed" body={outcome.state === "abandoned" ? "The payment was cancelled before it finished. Your bag is still saved, so you can try again." : "Your bank didn't approve the payment. Your bag is still saved, so you can try again or use another method."} /></>;
  }
  if (outcome.state === "pending") return <Problem wa={settings.whatsapp} reference={reference} title="Payment processing" body="Paystack is still processing this payment (bank transfers can take a few minutes). Refresh this page shortly. We'll also email you once it's confirmed." />;
  if (outcome.state === "mismatch") return <Problem wa={settings.whatsapp} reference={reference} title="Payment needs a check" body="We received a payment but it doesn't match the order total. We'll check it by hand. WhatsApp us with the reference above." />;

  const order = (await orderByNumber(reference))!;
  const trackHref = `/track-order?order=${encodeURIComponent(order.number)}&t=${trackingToken(order.number)}`;
  return (
    <div className="mx-auto grid max-w-7xl gap-10 gutter pb-24 pt-12 lg:grid-cols-[1.3fr_1fr]">
      <CatalogRefresh />
      <OrderPlaced reference={reference} total={order.total} items={order.items.map((i) => ({ id: i.slug, qty: i.qty, price: i.unitPrice }))} />
      <div className="flex flex-col gap-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent-blue">Order {order.number} · Paid</p>
        <h1 className="font-display text-[clamp(3.5rem,10vw,7rem)] uppercase leading-[0.85]">Order placed.</h1>
        <p className="max-w-[52ch] text-muted-foreground">Thanks, {order.firstName}. Your payment went through and your order is confirmed. A receipt is on its way to <span className="text-foreground">{order.email}</span>, and we&apos;ll keep you posted as it moves.</p>
        <dl className="grid gap-4 border-t border-border pt-5 text-sm sm:grid-cols-2">
          <div><dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Delivering to</dt><dd className="mt-1">{[order.address.address1, order.address.address2, order.address.city, order.address.state].filter(Boolean).join(", ")}</dd></div>
          <div><dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Delivery</dt><dd className="mt-1">{order.deliveryLabel}, {order.deliveryEta}</dd></div>
        </dl>
        <div className="flex flex-wrap gap-3">
          <Link href={trackHref} className="btn">Track your order</Link>
          <Link href="/collections/all" className="btn-ghost">Keep shopping</Link>
        </div>
      </div>
      <aside className="flex flex-col gap-4 self-start bg-paper p-6">
        <ul className="flex flex-col gap-4">
          {order.items.map((l) => (
            <li key={`${l.slug}-${l.size}-${l.colour}`} className="flex items-center gap-3 text-sm">
              <div className="relative w-14 shrink-0 bg-studio" style={{ aspectRatio: "4 / 5" }}>{l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-contain p-1" />}</div>
              <div className="flex-1"><p className="font-semibold uppercase">{l.name}</p><p className="text-muted-foreground">{l.colour} · {l.size} · ×{l.qty}</p></div>
              <span className="price">{formatPrice(l.total)}</span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="price">{formatPrice(order.subtotal)}</dd></div>
          {order.discountAmount > 0 && <div className="flex justify-between"><dt>Discount ({order.discountCode})</dt><dd className="price">−{formatPrice(order.discountAmount)}</dd></div>}
          <div className="flex justify-between"><dt>Delivery</dt><dd className="price">{order.deliveryFee === 0 ? "Free" : formatPrice(order.deliveryFee)}</dd></div>
          <div className="flex justify-between border-t border-border pt-3 font-semibold"><dt>Total paid</dt><dd className="price">{formatPrice(order.total)}</dd></div>
        </dl>
        <p className="text-[12px] text-muted-foreground">Paid securely with Paystack. {settings.name} never sees your card details.</p>
      </aside>
    </div>
  );
}
