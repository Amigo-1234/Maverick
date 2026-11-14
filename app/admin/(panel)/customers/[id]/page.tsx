import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/server/admin";
import { getCustomer } from "@/lib/server/admin-data";
import { listOrders } from "@/lib/server/orders";
import { normalisePhone } from "@/lib/site";
import { AdminLoading, Empty, FulfilmentPill, Money, PageHead, PaymentPill, Stat, day, when } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Customer" };

export default function CustomerPage(props: PageProps<"/admin/customers/[id]">) {
  return <Suspense fallback={<AdminLoading />}><Body params={props.params} /></Suspense>;
}

async function Body({ params }: { params: PageProps<"/admin/customers/[id]">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  const c = await getCustomer(Number(id));
  if (!c) notFound();
  const { orders } = await listOrders({ customerId: c.id, page: 1 });
  const paid = orders.filter((o) => ["paid", "partially_refunded", "refunded"].includes(o.paymentStatus));
  const spent = paid.reduce((n, o) => n + o.total - o.refundedAmount, 0);
  return (
    <>
      <PageHead code="06 / Customers / Profile" title={c.name || c.email} intro={<>Customer since {day(c.created_at)}{c.marketing ? " · subscribed to emails" : ""}</>} actions={<Link href="/admin/customers" className="btn-ghost btn-sm">All customers</Link>} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="ink" label="Total spent" value={<Money n={spent} />} />
        <Stat label="Paid orders" value={paid.length} />
        <Stat label="Average order" value={<Money n={paid.length ? Math.round(spent / paid.length) : 0} />} />
        <Stat label="Last purchase" value={<span className="text-xl">{day(paid[0]?.paidAt ?? null)}</span>} />
      </div>
      <section className="panel mb-6 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
        <a className="underline" href={`mailto:${c.email}`}>{c.email}</a>
        {c.phone && <a className="underline" href={`tel:${c.phone}`}>{c.phone}</a>}
        {c.phone && <a className="btn btn-sm bg-[#25D366] text-ink" href={`https://wa.me/${normalisePhone(c.phone)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
      </section>
      <h2 className="panel-title">Order history</h2>
      {orders.length === 0 ? <Empty title="No orders" /> : (
        <div className="overflow-x-auto bg-paper"><table className="atable"><thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Payment</th><th>Fulfilment</th><th className="num">Total</th></tr></thead><tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td><Link className="rowlink font-mono" href={`/admin/orders/${o.id}`}>{o.number}</Link></td>
              <td className="text-muted-foreground">{when(o.createdAt)}</td>
              <td className="text-[12px]">{o.items.map((i) => `${i.qty}× ${i.name} (${i.size})`).join(", ")}</td>
              <td><PaymentPill s={o.paymentStatus} /></td><td><FulfilmentPill s={o.fulfilmentStatus} /></td>
              <td className="num"><Money n={o.total} /></td>
            </tr>
          ))}
        </tbody></table></div>
      )}
    </>
  );
}
