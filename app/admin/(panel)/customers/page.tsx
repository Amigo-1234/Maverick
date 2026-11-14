import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/server/admin";
import { listCustomers } from "@/lib/server/admin-data";
import { AdminLoading, Empty, Flash, Money, PageHead, day } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage(props: PageProps<"/admin/customers">) {
  return <Suspense fallback={<AdminLoading />}><Body sp={props.searchParams} /></Suspense>;
}

async function Body({ sp: spP }: { sp: PageProps<"/admin/customers">["searchParams"] }) {
  await requireAdmin();
  const sp = await spP;
  const q = typeof sp.q === "string" ? sp.q : "";
  const rows = await listCustomers(q);
  return (
    <>
      <PageHead code="06 / Customers" title="Customers" intro="Everyone who has checked out. Spending counts paid orders minus refunds. Treat this information as private." />
      <Flash sp={sp} />
      <form className="mb-6 flex gap-2 bg-paper p-4" role="search"><label htmlFor="q" className="sr-only">Search customers</label><input id="q" name="q" defaultValue={q} placeholder="Name, email or phone" className="min-w-0 flex-1 border-[1.5px] border-foreground/20 bg-background px-3 py-2 text-sm" /><button className="btn" type="submit">Search</button></form>
      {rows.length === 0 ? <Empty title="No customers yet">Customers appear here after their first checkout.</Empty> : (
        <div className="overflow-x-auto bg-paper">
          <table className="atable">
            <thead><tr><th>Customer</th><th>Phone</th><th className="num">Orders</th><th className="num">Spent</th><th>Last purchase</th><th>Emails</th></tr></thead>
            <tbody>{rows.map((c) => (
              <tr key={c.id}>
                <td><Link className="rowlink" href={`/admin/customers/${c.id}`}>{c.name || "—"}</Link><div className="text-[12px] text-muted-foreground">{c.email}</div></td>
                <td className="text-[13px]">{c.phone}</td>
                <td className="num">{c.orders}</td>
                <td className="num"><Money n={c.spent} /></td>
                <td className="text-muted-foreground">{day(c.last_order)}</td>
                <td className="text-[12px]">{c.marketing ? "Subscribed" : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
