"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FULFILMENT_LABELS, PAYMENT_LABELS, timeline, type OrderView } from "@/lib/order";
import { formatPrice } from "@/lib/site";
import { useSettings, useWhatsApp } from "@/components/store-provider";
import { WhatsAppIcon } from "@/components/icons";

const dateTime = (iso: string) => new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });
const dateOnly = (iso: string) => new Date(iso).toLocaleDateString("en-NG", { dateStyle: "medium", timeZone: "Africa/Lagos" });

export function TrackOrder() {
  const params = useSearchParams();
  const [order, setOrder] = React.useState<OrderView | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const lookup = React.useCallback(async (body: Record<string, string>) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { order?: OrderView; error?: string };
      if (!res.ok || !data.order) throw new Error(data.error || "We couldn't find that order.");
      setOrder(data.order);
    } catch (e) {
      setOrder(null);
      setError(e instanceof Error ? e.message : "We couldn't find that order.");
    } finally { setBusy(false); }
  }, []);

  // Signed link from an email: open the order straight away.
  React.useEffect(() => {
    const o = params.get("order"), t = params.get("t");
    if (o && t) lookup({ order: o, token: t });
  }, [params, lookup]);

  if (order) return <OrderTracking order={order} onBack={() => { setOrder(null); window.history.replaceState(null, "", "/track-order"); }} />;

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); lookup({ order: String(f.get("order") ?? ""), contact: String(f.get("contact") ?? "") }); }}
      className="grid max-w-2xl gap-4 sm:grid-cols-2"
    >
      <div className="field"><label htmlFor="track-order">Order number</label><input id="track-order" name="order" required placeholder="MV-XXXXXX-XXXXXXXX" defaultValue={params.get("order") ?? ""} autoCapitalize="characters" className="font-mono uppercase" /></div>
      <div className="field"><label htmlFor="track-contact">Email or phone</label><input id="track-contact" name="contact" required placeholder="you@example.com or 0803…" autoComplete="email" /></div>
      {error && <p role="alert" className="border-l-4 border-accent-red bg-paper px-4 py-3 text-sm sm:col-span-2">{error}</p>}
      <button type="submit" disabled={busy} className="btn sm:col-span-2 sm:justify-self-start disabled:opacity-60">{busy ? "Looking…" : "Track order"}</button>
    </form>
  );
}

const SIDE_BANNERS: Record<string, { tone: string; text: string }> = {
  cancelled: { tone: "border-accent-red", text: "This order was cancelled." },
  on_hold: { tone: "border-accent-red", text: "This order is on hold. We'll contact you about the next step." },
  refund_requested: { tone: "border-accent-blue", text: "Your refund request has been received." },
};

function OrderTracking({ order, onBack }: { order: OrderView; onBack: () => void }) {
  const settings = useSettings();
  const wa = useWhatsApp();
  const steps = timeline(order);
  const side = SIDE_BANNERS[order.fulfilmentStatus];
  const refunded = order.paymentStatus === "refunded" || order.paymentStatus === "partially_refunded";
  const unpaid = !["paid", "refunded", "partially_refunded"].includes(order.paymentStatus);
  const updates = [...order.events].filter((e) => e.kind !== "email").reverse();

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Placed {dateOnly(order.createdAt)}</p>
          <h2 className="font-display text-4xl uppercase sm:text-5xl" data-testid="track-number">{order.number}</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.14em]">
          <span className={`px-2.5 py-1.5 ${unpaid ? "bg-accent-red text-paper" : "bg-ink text-paper"}`}>Payment: {PAYMENT_LABELS[order.paymentStatus]}</span>
          <span className="bg-paper px-2.5 py-1.5 ring-1 ring-inset ring-foreground/20">Order: {FULFILMENT_LABELS[order.fulfilmentStatus]}</span>
        </div>
      </header>

      {(side || refunded) && (
        <p role="status" className={`border-l-4 bg-paper px-4 py-3 text-sm ${side?.tone ?? "border-accent-blue"}`}>
          {side?.text} {refunded && <>Refunded {formatPrice(order.refundedAmount)} to your original payment method.</>}
        </p>
      )}
      {unpaid && <p role="status" className="border-l-4 border-accent-red bg-paper px-4 py-3 text-sm">We haven&apos;t received payment for this order. If you were charged, WhatsApp us with your order number.</p>}

      <section aria-labelledby="timeline-h">
        <h3 id="timeline-h" className="sr-only">Order progress</h3>
        <ol className="grid gap-0 sm:grid-cols-6">
          {steps.map((s, i) => (
            <li key={s.key} data-state={s.state} className="relative flex gap-4 pb-6 sm:flex-col sm:gap-3 sm:pb-0 sm:pr-2">
              {/* connector */}
              {i < steps.length - 1 && <span aria-hidden="true" className={`absolute left-[11px] top-6 h-full w-0.5 sm:left-6 sm:top-[11px] sm:h-0.5 sm:w-full ${s.state === "done" ? "bg-foreground" : "bg-foreground/15"}`} />}
              <span aria-hidden="true" className={`relative z-10 grid size-6 shrink-0 place-items-center ${s.state === "upcoming" ? "border-2 border-foreground/20 bg-background" : s.state === "current" ? "bg-accent-blue ring-4 ring-accent-blue/20" : "bg-foreground"}`}>
                {s.state === "done" && <svg viewBox="0 0 12 12" className="size-3 text-paper"><path d="M2 6.5l2.5 2.5L10 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>}
              </span>
              <div className="min-w-0">
                <p className={`text-[13px] font-semibold uppercase tracking-[0.08em] ${s.state === "upcoming" ? "text-muted-foreground" : ""}`}>
                  {s.label}{s.state === "current" && <span className="sr-only"> (current step)</span>}
                </p>
                {s.at && <p className="font-mono text-[11px] text-muted-foreground">{dateTime(s.at)}</p>}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="items-h" className="flex flex-col gap-4">
          <h3 id="items-h" className="font-display text-3xl uppercase">What you ordered</h3>
          <ul className="flex flex-col divide-y divide-border border-y border-border">
            {order.items.map((i) => (
              <li key={`${i.slug}-${i.size}-${i.colour}`} className="flex items-center gap-4 py-4">
                <div className="relative w-16 shrink-0 bg-studio" style={{ aspectRatio: "4 / 5" }}>{i.image && <Image src={i.image} alt="" fill sizes="64px" className="object-contain p-1" />}</div>
                <div className="min-w-0 flex-1 text-sm">
                  <Link href={`/products/${i.slug}`} className="font-semibold uppercase hover:text-accent-blue">{i.name}</Link>
                  <p className="text-muted-foreground">{i.colour} · Size {i.size} · Qty {i.qty}</p>
                </div>
                <span className="price text-sm">{formatPrice(i.total)}</span>
              </li>
            ))}
          </ul>
          <dl className="ml-auto flex w-full max-w-xs flex-col gap-1.5 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="price">{formatPrice(order.subtotal)}</dd></div>
            {order.discountAmount > 0 && <div className="flex justify-between"><dt>Discount</dt><dd className="price">−{formatPrice(order.discountAmount)}</dd></div>}
            <div className="flex justify-between"><dt>Delivery</dt><dd className="price">{order.deliveryFee === 0 ? "Free" : formatPrice(order.deliveryFee)}</dd></div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold"><dt>Total</dt><dd className="price" data-testid="track-total">{formatPrice(order.total)}</dd></div>
          </dl>
        </section>

        <aside className="flex flex-col gap-6 self-start bg-paper p-6 text-sm">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Delivering to</p>
            <p className="mt-1">{order.firstName} {order.lastName}<br />{[order.address.address1, order.address.address2, order.address.city, order.address.state].filter(Boolean).join(", ")}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Delivery method</p>
            <p className="mt-1">{order.deliveryLabel} · {order.deliveryEta}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Tracking</p>
            <p className="mt-1" data-testid="track-ref">{order.carrier || order.trackingRef ? [order.carrier, order.trackingRef].filter(Boolean).join(" · ") : "We'll add tracking details when your order ships."}</p>
          </div>
          <a href={wa(`Hi ${settings.name}, I have a question about my order ${order.number}.`)} target="_blank" rel="noopener noreferrer" className="btn w-full"><WhatsAppIcon size={18} /> Ask about this order</a>
          <Link href="/contact" className="text-center text-[12px] uppercase tracking-[0.14em] underline underline-offset-4">Or send us a message</Link>
        </aside>
      </div>

      {updates.length > 0 && (
        <section aria-labelledby="updates-h" className="flex flex-col gap-3">
          <h3 id="updates-h" className="font-display text-3xl uppercase">Updates</h3>
          <ol className="flex flex-col border-l-2 border-foreground/15 pl-5">
            {updates.map((e, k) => (
              <li key={k} className="relative py-2 text-sm">
                <span aria-hidden="true" className="absolute -left-[27px] top-3.5 size-2.5 bg-foreground" />
                <p className="font-mono text-[11px] text-muted-foreground">{dateTime(e.createdAt)}</p>
                <p>{e.kind === "fulfilment" && e.toStatus ? FULFILMENT_LABELS[e.toStatus as keyof typeof FULFILMENT_LABELS] : e.note}{e.kind === "fulfilment" && e.note ? `: ${e.note}` : ""}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <button type="button" onClick={onBack} className="self-start text-[12px] uppercase tracking-[0.14em] underline underline-offset-4">Track a different order</button>
    </div>
  );
}
