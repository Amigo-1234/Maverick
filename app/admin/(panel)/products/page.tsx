import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/server/admin";
import { listProducts } from "@/lib/server/admin-data";
import { AdminLoading, Empty, Flash, Money, PageHead } from "@/components/admin/ui";
import { Submit } from "@/components/admin/submit";
import { setProductStatus } from "../../actions";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage(props: PageProps<"/admin/products">) {
  return <Suspense fallback={<AdminLoading />}><Body sp={props.searchParams} /></Suspense>;
}

const STATUS_TONE: Record<string, string> = { published: "bg-ink text-paper", draft: "bg-paper ring-1 ring-inset ring-foreground/30", archived: "bg-[#d9d7d2] text-muted-foreground" };

async function Body({ sp: spP }: { sp: PageProps<"/admin/products">["searchParams"] }) {
  await requireAdmin();
  const sp = await spP;
  const q = typeof sp.q === "string" ? sp.q : "", status = typeof sp.status === "string" ? sp.status : "";
  const rows = await listProducts(q, status);
  return (
    <>
      <PageHead code="03 / Products" title="Products" intro="Changes go live in the shop as soon as you save. Drafts stay hidden until you publish them." actions={<Link href="/admin/products/new" className="btn">New product</Link>} />
      <Flash sp={sp} />
      <form className="mb-6 flex flex-wrap items-end gap-3 bg-paper p-4" role="search" aria-label="Filter products">
        <div className="field min-w-[220px] flex-1"><label htmlFor="q">Search</label><input id="q" name="q" defaultValue={q} placeholder="Name or code" /></div>
        <div className="field"><label htmlFor="status">Status</label><select id="status" name="status" defaultValue={status}><option value="">Active (not archived)</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select></div>
        <button className="btn" type="submit">Filter</button>
      </form>
      {rows.length === 0 ? <Empty title="No products">Add your first product with the New product button.</Empty> : (
        <div className="overflow-x-auto bg-paper">
          <table className="atable">
            <thead><tr><th></th><th>Product</th><th>Category</th><th>Status</th><th className="num">Price</th><th className="num">Stock</th><th>Sizes</th><th></th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="w-14"><div className="relative w-12 bg-studio" style={{ aspectRatio: "4 / 5" }}>{p.front_tight && <Image src={p.front_tight} alt="" fill sizes="48px" className="object-contain p-0.5" />}</div></td>
                  <td><Link className="rowlink" href={`/admin/products/${p.id}`}>{p.name}</Link><div className="text-[12px] text-muted-foreground">{p.colour_label} · {p.code}{p.featured ? " · Featured" : ""}</div></td>
                  <td className="text-muted-foreground">{p.category ?? "—"}</td>
                  <td><span className={`px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${STATUS_TONE[p.status]}`}>{p.status}</span></td>
                  <td className="num">{p.compare_at && <s className="mr-1 text-[12px] text-muted-foreground">{p.compare_at.toLocaleString("en-NG")}</s>}<Money n={p.price} /></td>
                  <td className="num">{p.units}</td>
                  <td className="text-[12px]">{p.sold_out > 0 && <span className="mr-1 bg-accent-red px-1.5 py-0.5 text-paper">{p.sold_out} sold out</span>}{p.low > 0 && <span className="bg-[#ffd36b] px-1.5 py-0.5">{p.low} low</span>}{!p.sold_out && !p.low && <span className="text-muted-foreground">{p.sizes} sizes</span>}</td>
                  <td>
                    <form action={setProductStatus}>
                      <input type="hidden" name="id" value={p.id} /><input type="hidden" name="back" value="/admin/products" />
                      <input type="hidden" name="status" value={p.status === "published" ? "draft" : "published"} />
                      <Submit className="btn-ghost btn-sm" pendingText="…">{p.status === "published" ? "Unpublish" : "Publish"}</Submit>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
