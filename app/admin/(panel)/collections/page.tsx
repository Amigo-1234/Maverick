import { Suspense } from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/server/admin";
import { listCategories, listCollections } from "@/lib/server/admin-data";
import { sql } from "@/lib/server/db";
import { AdminLoading, Flash, PageHead } from "@/components/admin/ui";
import { Submit } from "@/components/admin/submit";
import { deleteCategory, deleteCollection, saveCategory, saveCollection } from "../../actions";

export const metadata: Metadata = { title: "Collections" };

export default function CollectionsPage(props: PageProps<"/admin/collections">) {
  return <Suspense fallback={<AdminLoading />}><Body sp={props.searchParams} /></Suspense>;
}

async function Body({ sp: spP }: { sp: PageProps<"/admin/collections">["searchParams"] }) {
  await requireAdmin();
  const sp = await spP;
  const [cols, cats, products, members] = await Promise.all([
    listCollections(), listCategories(),
    sql<{ id: number; name: string; colour_label: string; status: string }>("select id, name, colour_label, status from products where status <> 'archived' order by sort, id"),
    sql<{ collection_id: number; product_id: number }>("select collection_id, product_id from collection_products"),
  ]);
  const editor = (c?: (typeof cols)[number]) => (
    <form action={saveCollection} className="grid gap-3 sm:grid-cols-2">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="field"><label htmlFor={`t-${c?.id ?? "new"}`}>Title</label><input id={`t-${c?.id ?? "new"}`} name="title" required defaultValue={c?.title} placeholder="e.g. Limited Edition" /></div>
      <div className="field"><label htmlFor={`h-${c?.id ?? "new"}`}>Web address</label><input id={`h-${c?.id ?? "new"}`} name="handle" defaultValue={c?.handle} placeholder="made from the title if empty" /></div>
      <div className="field sm:col-span-2"><label htmlFor={`b-${c?.id ?? "new"}`}>Description</label><input id={`b-${c?.id ?? "new"}`} name="blurb" defaultValue={c?.blurb} /></div>
      <fieldset className="sm:col-span-2"><legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em]">Products</legend>
        <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">{products.map((p) => <label key={p.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="products" value={p.id} defaultChecked={Boolean(c && members.some((m) => m.collection_id === c.id && m.product_id === p.id))} className="size-4" /> {p.name} <span className="text-muted-foreground">{p.colour_label}{p.status === "draft" ? " (draft)" : ""}</span></label>)}</div>
      </fieldset>
      <div className="field"><label htmlFor={`s-${c?.id ?? "new"}`}>Position</label><input id={`s-${c?.id ?? "new"}`} name="sort" type="number" defaultValue={c?.sort ?? 0} /></div>
      <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="visible" defaultChecked={c ? c.visible : true} className="size-4" /> Visible in the shop</label>
      <div className="sm:col-span-2"><Submit>{c ? "Save collection" : "Create collection"}</Submit></div>
    </form>
  );

  return (
    <>
      <PageHead code="05 / Collections" title="Collections" intro="Collections are hand-picked groups (New In, Best Sellers, Limited Edition). Categories group products by type (Tees, Ringers). Both get their own page in the shop." />
      <Flash sp={sp} />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4">
          {cols.map((c) => (
            <details key={c.id} className="panel group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <span><span className="font-display text-2xl uppercase">{c.title}</span> <span className="font-mono text-[11px] text-muted-foreground">/collections/{c.handle} · {c.products} products{!c.visible && " · hidden"}</span></span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] underline">Edit</span>
              </summary>
              <div className="mt-4 border-t border-border pt-4">{editor(c)}
                <form action={deleteCollection} className="mt-3"><input type="hidden" name="id" value={c.id} /><Submit className="btn-ghost btn-sm" pendingText="…" confirm={`Delete the ${c.title} collection? Products stay in the shop.`}>Delete collection</Submit></form>
              </div>
            </details>
          ))}
          <section className="panel border-t-4 border-accent-blue"><h2 className="panel-title">New collection</h2>{editor()}</section>
        </div>

        <section className="panel self-start" aria-labelledby="cat-h">
          <h2 id="cat-h" className="panel-title">Categories</h2>
          <ul className="flex flex-col divide-y divide-border">
            {cats.map((c) => (
              <li key={c.id} className="py-3">
                <form action={saveCategory} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <div className="field"><label htmlFor={`ct-${c.id}`}>Title</label><input id={`ct-${c.id}`} name="title" defaultValue={c.title} required /></div>
                  <div className="field"><label htmlFor={`ch-${c.id}`}>Address</label><input id={`ch-${c.id}`} name="handle" defaultValue={c.handle} /></div>
                  <Submit className="btn btn-sm" pendingText="…">Save</Submit>
                  <input type="hidden" name="blurb" value={c.blurb} /><input type="hidden" name="sort" value={c.sort} />
                </form>
                <div className="mt-1 flex items-center justify-between text-[12px] text-muted-foreground"><span>{c.products} products</span>
                  <form action={deleteCategory}><input type="hidden" name="id" value={c.id} /><Submit className="underline" pendingText="…" confirm={`Delete ${c.title}? Its products become uncategorised.`}>Delete</Submit></form></div>
              </li>
            ))}
          </ul>
          <form action={saveCategory} className="mt-4 grid grid-cols-[1fr_auto] items-end gap-2 border-t-2 border-foreground pt-4">
            <div className="field"><label htmlFor="newcat">New category</label><input id="newcat" name="title" required placeholder="e.g. Hoodies" /></div>
            <Submit className="btn btn-sm" pendingText="…">Add</Submit>
          </form>
        </section>
      </div>
    </>
  );
}
