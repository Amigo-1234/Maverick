import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/server/admin";
import { dashboard } from "@/lib/server/admin-data";
import { formatPrice } from "@/lib/site";
import { AdminLoading, BarChart, Empty, Flash, FulfilmentPill, InquiryPill, Money, PageHead, PaymentPill, Stat, when } from "@/components/admin/ui";
import type { FulfilmentStatus, PaymentStatus } from "@/lib/order";
import type { InquiryStatus } from "@/lib/server/inquiries";

export default function Overview(props: PageProps<"/admin">) {
  return <Suspense fallback={<AdminLoading />}><Body sp={props.searchParams} /></Suspense>;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const RANGES = [["7", "7 days"], ["30", "30 days"], ["90", "90 days"]] as const;

async function Body({ sp: spP }: { sp: PageProps<"/admin">["searchParams"] }) {
  await requireAdmin();
  const sp = await spP;
  const today = new Date();
  const preset = typeof sp.range === "string" && ["7", "30", "90"].includes(sp.range) ? Number(sp.range) : 30;
  const to = typeof sp.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : isoDay(today);
  const from = typeof sp.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : isoDay(new Date(today.getTime() - (preset - 1) * 86400000));
  const d = await dashboard(from, to);
  const avg = d.money.sales ? Math.round(d.net / d.money.sales) : 0;

  return (
    <>
      <PageHead code="01 / Overview" title="Store overview" intro={<>Revenue counts paid orders only, minus refunds. Showing <strong>{from}</strong> to <strong>{to}</strong>.</>}
        actions={
          <form className="flex flex-wrap items-end gap-2" aria-label="Date range">
            {RANGES.map(([v, l]) => <Link key={v} href={`/admin?range=${v}`} className={`btn-sm ${!sp.from && preset === Number(v) ? "btn" : "btn-ghost"}`}>{l}</Link>)}
            <div className="field"><label htmlFor="from" className="sr-only">From</label><input id="from" name="from" type="date" defaultValue={from} /></div>
            <div className="field"><label htmlFor="to" className="sr-only">To</label><input id="to" name="to" type="date" defaultValue={to} /></div>
            <button className="btn btn-sm" type="submit">Apply</button>
          </form>
        } />
      <Flash sp={sp} />

      <section aria-label="Sales" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="ink" label="Revenue (net)" value={formatPrice(d.net)} note={d.money.refunds ? `${formatPrice(d.money.gross)} paid − ${formatPrice(d.money.refunds)} refunded` : "Paid orders in this period"} />
        <Stat label="Sales" value={d.money.sales} note="Paid orders" />
        <Stat label="Average order" value={formatPrice(avg)} />
        <Stat label="Orders placed" value={d.counts.all_orders} note="Including unpaid" />
      </section>

      <section aria-label="Orders pipeline" className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="To fulfil" value={d.counts.to_fulfil} note="Paid, not started" href="/admin/orders?payment=paid&fulfilment=unfulfilled" tone={d.counts.to_fulfil ? "alert" : "plain"} />
        <Stat label="Awaiting payment" value={d.counts.awaiting_payment} note="Stock held" href="/admin/orders?payment=pending" />
        <Stat label="Processing" value={d.counts.processing} href="/admin/orders?fulfilment=processing" />
        <Stat label="Shipped" value={d.counts.shipped} href="/admin/orders?fulfilment=shipped" />
        <Stat label="Delivered" value={d.counts.delivered} note="In this period" href="/admin/orders?fulfilment=delivered" />
        <Stat label="Needs attention" value={d.counts.attention} href="/admin/orders?q=" tone={d.counts.attention ? "alert" : "plain"} />
      </section>

      <section aria-label="Stock" className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Products in stock" value={d.stock.in_stock} href="/admin/products" />
        <Stat label="Units in stock" value={d.stock.units} />
        <Stat label="Low-stock sizes" value={d.stock.low} href="/admin/inventory?filter=low" tone={d.stock.low ? "alert" : "plain"} />
        <Stat label="Sold-out sizes" value={d.stock.sold_out} href="/admin/inventory?filter=sold-out" />
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="panel" aria-labelledby="rev-h">
          <h2 id="rev-h" className="panel-title">Revenue by day</h2>
          <BarChart label={`Net revenue per day from ${from} to ${to}`} data={d.series.map((s) => ({ x: s.day, y: s.revenue }))} format={formatPrice} />
        </section>
        <section className="panel" aria-labelledby="top-h">
          <h2 id="top-h" className="panel-title">Top sellers</h2>
          {d.top.length === 0 ? <p className="text-sm text-muted-foreground">No sales in this period yet.</p> : (
            <ol className="flex flex-col divide-y divide-border">
              {d.top.map((t, i) => (
                <li key={`${t.name}-${t.colour}`} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="font-mono text-[11px] text-muted-foreground">0{i + 1}</span>
                  <span className="flex-1"><span className="font-semibold">{t.name}</span> <span className="text-muted-foreground">{t.colour}</span></span>
                  <span className="font-mono text-[12px]">{t.units} sold</span>
                  <Money n={t.revenue} />
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="panel" aria-labelledby="recent-h">
          <div className="mb-3 flex items-center justify-between"><h2 id="recent-h" className="panel-title !mb-0">Recent orders</h2><Link href="/admin/orders" className="text-[11px] font-semibold uppercase tracking-[0.14em] underline underline-offset-4">All orders</Link></div>
          {d.recentOrders.length === 0 ? <Empty title="No orders yet">They appear here the moment a customer checks out.</Empty> : (
            <div className="overflow-x-auto"><table className="atable"><thead><tr><th>Order</th><th>Customer</th><th>Payment</th><th>Fulfilment</th><th className="num">Total</th></tr></thead><tbody>
              {d.recentOrders.map((o) => (
                <tr key={o.id}>
                  <td><Link className="rowlink font-mono" href={`/admin/orders/${o.id}`}>{o.number}</Link><div className="text-[11px] text-muted-foreground">{when(o.created_at)}</div></td>
                  <td>{o.first_name} {o.last_name}</td>
                  <td><PaymentPill s={o.payment_status as PaymentStatus} /></td>
                  <td><FulfilmentPill s={o.fulfilment_status as FulfilmentStatus} /></td>
                  <td className="num"><Money n={o.total} /></td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </section>
        <section className="panel" aria-labelledby="inq-h">
          <div className="mb-3 flex items-center justify-between"><h2 id="inq-h" className="panel-title !mb-0">Inquiries</h2><Link href="/admin/inquiries" className="text-[11px] font-semibold uppercase tracking-[0.14em] underline underline-offset-4">Inbox</Link></div>
          {d.recentInquiries.length === 0 ? <p className="text-sm text-muted-foreground">No product questions yet.</p> : (
            <ul className="flex flex-col divide-y divide-border">
              {d.recentInquiries.map((q) => (
                <li key={q.id} className="py-3 text-sm">
                  <Link href={`/admin/inquiries?id=${q.id}`} className="flex items-start justify-between gap-3 hover:text-accent-blue">
                    <span className="min-w-0"><span className="font-semibold">{q.name}</span> <span className="text-muted-foreground">· {q.product_name || "General"}</span><span className="block truncate text-muted-foreground">{q.message}</span></span>
                    <InquiryPill s={q.status as InquiryStatus} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
