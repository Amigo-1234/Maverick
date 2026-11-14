import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/server/admin";
import { listOrders } from "@/lib/server/orders";
import { FULFILMENT_LABELS, PAYMENT_LABELS } from "@/lib/order";
import { AdminLoading, Empty, Flash, FulfilmentPill, Money, PageHead, PaymentPill, when } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage(props: PageProps<"/admin/orders">) {
  return <Suspense fallback={<AdminLoading />}><Body sp={props.searchParams} /></Suspense>;
}

const s = (v: unknown) => (typeof v === "string" ? v : "");

async function Body({ sp: spP }: { sp: PageProps<"/admin/orders">["searchParams"] }) {
  await requireAdmin();
  const sp = await spP;
  const f = { q: s(sp.q), payment: s(sp.payment), fulfilment: s(sp.fulfilment), from: s(sp.from), to: s(sp.to), page: Number(s(sp.page)) || 1 };
  const { orders, total, page, pages } = await listOrders(f);
  const qs = (p: number) => `?${new URLSearchParams({ ...Object.fromEntries(Object.entries(f).filter(([k, v]) => v && k !== "page")), page: String(p) })}`;

  return (
    <>
      <PageHead code="02 / Orders" title="Orders" intro="Payment status comes only from Paystack. Fulfilment is what your team updates as orders are packed and delivered." />
      <Flash sp={sp} />
      <form className="mb-6 grid gap-3 bg-paper p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]" role="search" aria-label="Filter orders">
        <div className="field"><label htmlFor="q">Search</label><input id="q" name="q" defaultValue={f.q} placeholder="Order no., name, email or phone" /></div>
        <div className="field"><label htmlFor="payment">Payment</label><select id="payment" name="payment" defaultValue={f.payment}><option value="">Any</option>{Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label htmlFor="fulfilment">Fulfilment</label><select id="fulfilment" name="fulfilment" defaultValue={f.fulfilment}><option value="">Any</option>{Object.entries(FULFILMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label htmlFor="from">From</label><input id="from" name="from" type="date" defaultValue={f.from} /></div>
        <div className="field"><label htmlFor="to">To</label><input id="to" name="to" type="date" defaultValue={f.to} /></div>
        <div className="flex items-end gap-2"><button className="btn" type="submit">Filter</button><Link href="/admin/orders" className="btn-ghost">Clear</Link></div>
      </form>

      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{total} order{total === 1 ? "" : "s"}</p>
      {orders.length === 0 ? <Empty title="No orders match">Try clearing the filters. New orders appear here as soon as customers check out.</Empty> : (
        <div className="overflow-x-auto bg-paper">
          <table className="atable">
            <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Payment</th><th>Fulfilment</th><th className="num">Total</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><Link className="rowlink font-mono" href={`/admin/orders/${o.id}`}>{o.number}</Link>{o.needsAttention && <span className="ml-2 bg-accent-red px-1.5 py-0.5 font-mono text-[9px] uppercase text-paper">Check</span>}</td>
                  <td className="whitespace-nowrap text-muted-foreground">{when(o.createdAt)}</td>
                  <td><div className="font-semibold">{o.firstName} {o.lastName}</div><div className="text-[12px] text-muted-foreground">{o.email}</div></td>
                  <td className="text-[12px]">{o.items.map((i) => `${i.qty}× ${i.name} (${i.size})`).join(", ")}</td>
                  <td><PaymentPill s={o.paymentStatus} /></td>
                  <td><FulfilmentPill s={o.fulfilmentStatus} /></td>
                  <td className="num"><Money n={o.total} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center gap-3 text-sm">
          {page > 1 && <Link className="btn-ghost btn-sm" href={qs(page - 1)}>Previous</Link>}
          <span className="font-mono text-[11px]">Page {page} of {pages}</span>
          {page < pages && <Link className="btn-ghost btn-sm" href={qs(page + 1)}>Next</Link>}
        </nav>
      )}
    </>
  );
}
