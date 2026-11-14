import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getProduct, tight } from "@/lib/catalog";
import { formatPrice, site, whatsappLink } from "@/lib/site";
import { amountMatches, orderFrom, verifyTransaction } from "@/lib/server/paystack";
import { OrderPlaced } from "./order-placed";

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

function Problem({ title, body, reference }: { title: string; body: string; reference?: string }) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col items-start gap-5 gutter py-20">
      {reference && <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Reference {reference}</p>}
      <h1 className="font-display text-[clamp(3rem,9vw,6rem)] uppercase leading-[0.85]">{title}</h1>
      <p className="max-w-[56ch] text-muted-foreground">{body}</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/checkout" className="btn">Back to checkout</Link>
        <a href={whatsappLink(`Hi MAVERICK, I need help with my payment${reference ? ` (reference ${reference})` : ""}.`)} target="_blank" rel="noopener noreferrer" className="btn-ghost">WhatsApp us</a>
      </div>
    </div>
  );
}

async function Result({ searchParams }: { searchParams: PageProps<"/checkout/verify">["searchParams"] }) {
  const sp = await searchParams;
  const reference = String(sp.reference ?? sp.trxref ?? "").slice(0, 80);
  if (!reference) return <Problem title="No payment found" body="We couldn't find a payment to check. If you were charged, WhatsApp us and we'll sort it out." />;

  let tx;
  try { tx = await verifyTransaction(reference); }
  catch (e) {
    console.error("[verify]", e);
    return <Problem reference={reference} title="We couldn't confirm yet" body="Paystack didn't answer just now. Refresh this page in a minute. If money left your account, your order is safe: WhatsApp us with the reference above." />;
  }
  const order = orderFrom(tx);
  if (tx.status !== "success") {
    return <Problem reference={reference} title="Payment not completed" body={tx.status === "abandoned" ? "The payment was cancelled before it finished. Your bag is still saved, so you can try again." : "Your bank didn't approve the payment. Your bag is still saved, so you can try again or use another method."} />;
  }
  if (!order || !amountMatches(tx, order)) {
    return <Problem reference={reference} title="Payment needs a check" body="We received a payment but it doesn't match the order total. We'll check it by hand. WhatsApp us with the reference above." />;
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-10 gutter pb-24 pt-12 lg:grid-cols-[1.3fr_1fr]">
      <OrderPlaced reference={reference} total={order.total} items={order.items.map((i) => ({ id: i.slug, qty: i.qty, price: i.unit }))} />
      <div className="flex flex-col gap-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent-blue">Order {order.orderId} · Paid</p>
        <h1 className="font-display text-[clamp(3.5rem,10vw,7rem)] uppercase leading-[0.85]">Order placed.</h1>
        <p className="max-w-[52ch] text-muted-foreground">Thanks, {order.customer.firstName}. Your payment went through and your order is confirmed. A receipt is on its way to <span className="text-foreground">{order.customer.email}</span>, and we&apos;ll message you on {order.customer.phone} when it ships.</p>
        <dl className="grid gap-4 border-t border-border pt-5 text-sm sm:grid-cols-2">
          <div><dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Delivering to</dt><dd className="mt-1">{[order.customer.address1, order.customer.address2, order.customer.city, order.customer.state].filter(Boolean).join(", ")}</dd></div>
          <div><dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Delivery</dt><dd className="mt-1">{order.shipping.label}, {order.shipping.eta}</dd></div>
        </dl>
        <div className="flex flex-wrap gap-3">
          <Link href="/collections/all" className="btn">Keep shopping</Link>
          <a href={whatsappLink(`Hi MAVERICK, checking on my order ${order.orderId}.`)} target="_blank" rel="noopener noreferrer" className="btn-ghost">Questions? WhatsApp us</a>
        </div>
      </div>
      <aside className="flex flex-col gap-4 self-start bg-paper p-6">
        <ul className="flex flex-col gap-4">
          {order.items.map((l) => {
            const p = getProduct(l.slug);
            return (
              <li key={`${l.slug}-${l.size}`} className="flex items-center gap-3 text-sm">
                <div className="relative w-14 shrink-0 bg-studio" style={{ aspectRatio: "4 / 5" }}>{p && <Image src={tight(p.front)} alt="" fill sizes="56px" className="object-contain p-1" />}</div>
                <div className="flex-1"><p className="font-semibold uppercase">{l.name}</p><p className="text-muted-foreground">{l.colour} · {l.size} · ×{l.qty}</p></div>
                <span className="price">{formatPrice(l.total)}</span>
              </li>
            );
          })}
        </ul>
        <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="price">{formatPrice(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Delivery</dt><dd className="price">{order.delivery === 0 ? "Free" : formatPrice(order.delivery)}</dd></div>
          <div className="flex justify-between border-t border-border pt-3 font-semibold"><dt>Total paid</dt><dd className="price">{formatPrice(order.total)}</dd></div>
        </dl>
        <p className="text-[12px] text-muted-foreground">Paid securely with Paystack. {site.name} never sees your card details.</p>
      </aside>
    </div>
  );
}
