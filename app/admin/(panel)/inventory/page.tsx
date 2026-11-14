import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/server/admin";
import { inventory, stockHistory } from "@/lib/server/admin-data";
import { AdminLoading, Empty, Flash, PageHead, when } from "@/components/admin/ui";
import { StockControls } from "@/components/admin/stock-controls";

export const metadata: Metadata = { title: "Inventory" };

export default function InventoryPage(props: PageProps<"/admin/inventory">) {
  return <Suspense fallback={<AdminLoading />}><Body sp={props.searchParams} /></Suspense>;
}

const REASONS: Record<string, string> = { reserve: "Held for checkout", release: "Returned (unpaid)", sale: "Sold", restock: "Restocked", correction: "Removed", set: "Set", sold_out: "Marked sold out", return: "Returned to stock", created: "Opening stock" };

async function Body({ sp: spP }: { sp: PageProps<"/admin/inventory">["searchParams"] }) {
  await requireAdmin();
  const sp = await spP;
  const filter = typeof sp.filter === "string" ? sp.filter : "";
  const q = typeof sp.q === "string" ? sp.q : "";
  const [rows, history] = await Promise.all([inventory(filter, q), stockHistory(40)]);
  const back = `/admin/inventory${filter || q ? `?${new URLSearchParams({ ...(filter && { filter }), ...(q && { q }) })}` : ""}`;
  const tabs = [["", "All sizes"], ["low", "Low stock"], ["sold-out", "Sold out"]] as const;

  return (
    <>
      <PageHead code="04 / Inventory" title="Inventory" intro="Stock is tracked per size and colour. When a size reaches 0 it can't be bought. Checkouts hold stock for 30 minutes while the customer pays; unpaid holds are returned automatically." />
      <Flash sp={sp} />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <nav aria-label="Filter" className="flex gap-2">{tabs.map(([k, l]) => <Link key={k} href={k ? `/admin/inventory?filter=${k}` : "/admin/inventory"} aria-current={filter === k ? "page" : undefined} className={`btn-sm ${filter === k ? "btn" : "btn-ghost"}`}>{l}</Link>)}</nav>
        <form className="flex gap-2" role="search"><input type="hidden" name="filter" value={filter} /><label htmlFor="q" className="sr-only">Search products</label><input id="q" name="q" defaultValue={q} placeholder="Search products" className="border-[1.5px] border-foreground/20 bg-paper px-3 py-2 text-sm" /><button className="btn btn-sm" type="submit">Search</button></form>
      </div>
      {rows.length === 0 ? <Empty title={filter === "low" ? "Nothing running low" : filter === "sold-out" ? "Nothing sold out" : "No sizes yet"}>{filter ? "Good news." : "Add sizes to products to track stock."}</Empty> : (
        <div className="overflow-x-auto bg-paper">
          <table className="atable">
            <thead><tr><th>Product</th><th>Size</th><th>Colour</th><th className="num">Held</th><th>Stock</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Link className="rowlink" href={`/admin/products/${r.product_id}`}>{r.name}</Link><div className="text-[12px] text-muted-foreground">{r.code}{r.status !== "published" && ` · ${r.status}`}</div></td>
                  <td className="font-semibold">{r.size}</td>
                  <td className="text-muted-foreground">{r.colour || r.colour_label}</td>
                  <td className="num text-muted-foreground" title="Reserved by checkouts awaiting payment">{r.reserved || "—"}</td>
                  <td><StockControls variantId={r.id} stock={r.stock} lowAt={r.low_stock_at} back={back} label={`${r.name} ${r.size}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="panel mt-8" aria-labelledby="hist-h">
        <h2 id="hist-h" className="panel-title">Adjustment history</h2>
        <div className="overflow-x-auto">
          <table className="atable">
            <thead><tr><th>When</th><th>Item</th><th>Change</th><th className="num">After</th><th>Why</th><th>Who</th></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="whitespace-nowrap font-mono text-[12px] text-muted-foreground">{when(h.created_at)}</td>
                  <td>{h.product_name} · <strong>{h.size}</strong>{h.colour ? ` · ${h.colour}` : ""}</td>
                  <td className={`font-mono font-semibold ${h.delta > 0 ? "text-[#1f7a3a]" : h.delta < 0 ? "text-accent-red" : ""}`}>{h.delta > 0 ? `+${h.delta}` : h.delta}</td>
                  <td className="num">{h.stock_after}</td>
                  <td>{REASONS[h.reason] ?? h.reason}{h.order_number && <span className="text-muted-foreground"> · {h.order_number}</span>}{h.note && <span className="text-muted-foreground"> · {h.note}</span>}</td>
                  <td className="text-[12px]">{h.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
