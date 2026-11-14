import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/server/admin";
import { orderById } from "@/lib/server/orders";
import { FULFILMENT_FLOW, FULFILMENT_LABELS, FULFILMENT_SIDE, NEEDS_PAYMENT, timeline } from "@/lib/order";
import { formatPrice, normalisePhone } from "@/lib/site";
import { paymentsReady } from "@/lib/server/config";
import { AdminLoading, Flash, FulfilmentPill, Money, PageHead, PaymentPill, when } from "@/components/admin/ui";
import { Submit } from "@/components/admin/submit";
import { addNote, refundOrder, resendConfirmation, saveTracking, setOrderStatus } from "../../../actions";

export const metadata: Metadata = { title: "Order" };

export default function OrderPage(props: PageProps<"/admin/orders/[id]">) {
  return <Suspense fallback={<AdminLoading />}><Body params={props.params} sp={props.searchParams} /></Suspense>;
}

async function Body({ params, sp: spP }: { params: PageProps<"/admin/orders/[id]">["params"]; sp: PageProps<"/admin/orders/[id]">["searchParams"] }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, spP]);
  const o = await orderById(id);
  if (!o) notFound();
  const paid = ["paid", "partially_refunded"].includes(o.paymentStatus);
  const refundable = o.total - o.refundedAmount;
  const steps = timeline(o);
  const wa = `https://wa.me/${normalisePhone(o.phone)}?text=${encodeURIComponent(`Hi ${o.firstName}, it's MAVERICK about your order ${o.number}.`)}`;
  const back = `/admin/orders/${o.id}`;

  return (
    <>
      <PageHead code={`02 / Orders / ${o.number}`} title={`${o.firstName} ${o.lastName}`}
        intro={<>Placed {when(o.createdAt)}{o.paidAt && <> · Paid {when(o.paidAt)}{o.paystackChannel && ` by ${o.paystackChannel}`}</>}</>}
        actions={<><PaymentPill s={o.paymentStatus} /><FulfilmentPill s={o.fulfilmentStatus} /><Link href="/admin/orders" className="btn-ghost btn-sm">All orders</Link></>} />
      <Flash sp={sp} />
      {o.needsAttention && <p role="alert" className="mb-6 border-l-4 border-accent-red bg-[#fbe9e8] px-4 py-3 text-sm font-semibold text-[#8a1510]">Needs attention: {o.needsAttention}</p>}
      {!paid && o.paymentStatus === "pending" && <p className="mb-6 border-l-4 border-foreground/30 bg-paper px-4 py-3 text-sm">Not paid yet. Stock is held {o.stockState === "reserved" ? "until the payment window closes" : "no longer"}. Payment can only be confirmed by Paystack, not from here.</p>}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-6">
          <section className="panel" aria-labelledby="items-h">
            <h2 id="items-h" className="panel-title">Items</h2>
            <ul className="flex flex-col divide-y divide-border">
              {o.items.map((i) => (
                <li key={`${i.slug}-${i.size}-${i.colour}`} className="flex items-center gap-4 py-3">
                  <div className="relative w-14 shrink-0 bg-studio" style={{ aspectRatio: "4 / 5" }}>{i.image && <Image src={i.image} alt="" fill sizes="56px" className="object-contain p-1" />}</div>
                  <div className="min-w-0 flex-1 text-sm"><p className="font-semibold">{i.name}</p><p className="text-muted-foreground">{i.colour} · Size <strong className="text-foreground">{i.size}</strong> · Qty <strong className="text-foreground">{i.qty}</strong> · {i.code}</p></div>
                  <Money n={i.total} />
                </li>
              ))}
            </ul>
            <dl className="ml-auto mt-3 flex max-w-xs flex-col gap-1 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd><Money n={o.subtotal} /></dd></div>
              {o.discountAmount > 0 && <div className="flex justify-between"><dt>Discount {o.discountCode}</dt><dd>−<Money n={o.discountAmount} /></dd></div>}
              <div className="flex justify-between"><dt>Delivery</dt><dd><Money n={o.deliveryFee} /></dd></div>
              <div className="flex justify-between border-t border-border pt-1.5 font-semibold"><dt>Total</dt><dd><Money n={o.total} /></dd></div>
              {o.refundedAmount > 0 && <div className="flex justify-between text-accent-blue"><dt>Refunded</dt><dd>−<Money n={o.refundedAmount} /></dd></div>}
            </dl>
          </section>

          <section className="panel" aria-labelledby="status-h">
            <h2 id="status-h" className="panel-title">Fulfilment</h2>
            <ol className="mb-5 flex flex-wrap gap-x-1 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.08em]">
              {steps.map((st) => <li key={st.key} className={`px-2 py-1 ${st.state === "done" ? "bg-ink text-paper" : st.state === "current" ? "bg-accent-blue text-paper" : "bg-background text-muted-foreground"}`}>{st.label}</li>)}
            </ol>
            <form action={setOrderStatus} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="back" value={back} />
              <div className="field"><label htmlFor="status">New status</label>
                <select id="status" name="status" defaultValue="">
                  <option value="" disabled>Choose…</option>
                  <optgroup label="Progress">{FULFILMENT_FLOW.map((sv) => <option key={sv} value={sv} disabled={!paid && NEEDS_PAYMENT.includes(sv)}>{FULFILMENT_LABELS[sv]}{!paid && NEEDS_PAYMENT.includes(sv) ? " (needs payment)" : ""}</option>)}</optgroup>
                  <optgroup label="Other">{FULFILMENT_SIDE.map((sv) => <option key={sv} value={sv}>{FULFILMENT_LABELS[sv]}</option>)}</optgroup>
                </select>
              </div>
              <div className="field"><label htmlFor="note">Note to customer (optional)</label><input id="note" name="note" placeholder="e.g. Rider: Tunde, 0803…" /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify" value="off" className="size-4" /> Don&apos;t email the customer</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="restock" className="size-4" /> If cancelling, return items to stock</label>
              <div className="sm:col-span-2"><Submit>Update status</Submit></div>
            </form>
          </section>

          <section className="panel" aria-labelledby="hist-h">
            <h2 id="hist-h" className="panel-title">History &amp; notes</h2>
            <form action={addNote} className="mb-4 flex gap-2">
              <input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="back" value={back} />
              <label htmlFor="note-text" className="sr-only">Internal note</label>
              <input id="note-text" name="note" required placeholder="Internal note (customers don't see this)" className="min-w-0 flex-1 border-[1.5px] border-foreground/20 bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
              <Submit className="btn btn-sm" pendingText="Adding…">Add note</Submit>
            </form>
            <ol className="flex flex-col border-l-2 border-foreground/15 pl-4">
              {[...o.events].reverse().map((e, k) => (
                <li key={k} className="relative py-2 text-sm">
                  <span aria-hidden="true" className={`absolute -left-[23px] top-3.5 size-2.5 ${e.kind === "note" ? "bg-[#ffd36b]" : e.kind === "payment" ? "bg-ink" : e.kind === "refund" ? "bg-accent-blue" : "bg-foreground/40"}`} />
                  <p className="font-mono text-[11px] text-muted-foreground">{when(e.createdAt)} · {e.actor}{e.visibleToCustomer ? " · shown to customer" : ""}</p>
                  <p><span className="font-semibold capitalize">{e.kind}</span>{e.toStatus ? `: ${e.fromStatus ? `${e.fromStatus} → ` : ""}${e.toStatus}` : ""}{e.note ? ` — ${e.note}` : ""}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="panel text-sm" aria-labelledby="cust-h">
            <h2 id="cust-h" className="panel-title">Customer</h2>
            <p className="font-semibold">{o.firstName} {o.lastName}</p>
            <p><a className="underline" href={`mailto:${o.email}`}>{o.email}</a></p>
            <p><a className="underline" href={`tel:${o.phone}`}>{o.phone}</a></p>
            <div className="mt-3 flex flex-wrap gap-2"><a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-sm bg-[#25D366] text-ink">WhatsApp customer</a>{o.customerId && <Link href={`/admin/customers/${o.customerId}`} className="btn-ghost btn-sm">Profile</Link>}</div>
            <h3 className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Deliver to</h3>
            <p>{[o.address.address1, o.address.address2, o.address.city, o.address.state, o.address.postcode].filter(Boolean).join(", ")}</p>
            <p className="text-muted-foreground">{o.deliveryLabel} · {o.deliveryEta}</p>
            <h3 className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Payment reference</h3>
            <p className="font-mono">{o.number}</p>
            {paid && <a className="text-[12px] underline" href={`https://dashboard.paystack.com/#/search?model=transactions&query=${encodeURIComponent(o.number)}`} target="_blank" rel="noopener noreferrer">Find in Paystack ↗</a>}
          </section>

          <section className="panel" aria-labelledby="track-h">
            <h2 id="track-h" className="panel-title">Shipping</h2>
            <form action={saveTracking} className="flex flex-col gap-3">
              <input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="back" value={back} />
              <div className="field"><label htmlFor="carrier">Courier</label><input id="carrier" name="carrier" defaultValue={o.carrier} placeholder="e.g. GIG Logistics, own rider" /></div>
              <div className="field"><label htmlFor="trackingRef">Tracking reference</label><input id="trackingRef" name="trackingRef" defaultValue={o.trackingRef} /></div>
              <Submit className="btn btn-sm self-start">Save shipping details</Submit>
            </form>
          </section>

          <section className="panel" aria-labelledby="refund-h">
            <h2 id="refund-h" className="panel-title">Refund</h2>
            {paid && refundable > 0 ? (
              <form action={refundOrder} className="flex flex-col gap-3">
                <input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="back" value={back} />
                <div className="field"><label htmlFor="amount">Amount (₦, up to {formatPrice(refundable)})</label><input id="amount" name="amount" type="number" min={1} max={refundable} defaultValue={refundable} required /></div>
                <div className="field"><label htmlFor="reason">Reason</label><input id="reason" name="reason" placeholder="e.g. Wrong size, returned" /></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="viaPaystack" defaultChecked={paymentsReady()} disabled={!paymentsReady()} className="size-4" /> Refund through Paystack{!paymentsReady() && " (not connected)"}</label>
                <Submit className="btn btn-sm self-start" pendingText="Refunding…" confirm="Refund this amount to the customer?">Refund</Submit>
              </form>
            ) : <p className="text-sm text-muted-foreground">{o.refundedAmount > 0 ? `Fully refunded (${formatPrice(o.refundedAmount)}).` : "Refunds are available once an order is paid."}</p>}
          </section>

          {paid && (
            <form action={resendConfirmation} className="panel flex items-center justify-between gap-3">
              <input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="back" value={back} />
              <p className="text-sm">Customer didn&apos;t get their receipt?</p>
              <Submit className="btn-ghost btn-sm" pendingText="Sending…">Resend confirmation</Submit>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
