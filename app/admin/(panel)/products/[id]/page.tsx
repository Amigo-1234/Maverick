import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/server/admin";
import { listCategories, listCollections, productForEdit, stockHistory } from "@/lib/server/admin-data";
import { AdminLoading, Flash, PageHead, when } from "@/components/admin/ui";
import { Submit } from "@/components/admin/submit";
import { ImageUpload } from "@/components/admin/image-upload";
import { StockControls } from "@/components/admin/stock-controls";
import { addVariant, clearImage, deleteProduct, moveImage, removeImage, removeVariant, saveImageAlt, saveProduct, setLowStockLevel } from "../../../actions";

export const metadata: Metadata = { title: "Edit product" };

export default function ProductEditPage(props: PageProps<"/admin/products/[id]">) {
  return <Suspense fallback={<AdminLoading />}><Body params={props.params} sp={props.searchParams} /></Suspense>;
}

type P = Record<string, unknown>;
const v = (p: P | null, k: string) => (p?.[k] ?? "") as string;

async function Body({ params, sp: spP }: { params: PageProps<"/admin/products/[id]">["params"]; sp: PageProps<"/admin/products/[id]">["searchParams"] }) {
  await requireAdmin();
  const [{ id: idParam }, sp] = await Promise.all([params, spP]);
  const isNew = idParam === "new";
  const id = isNew ? null : Number(idParam);
  const data = id ? await productForEdit(id) : null;
  if (!isNew && !data) notFound();
  const [cats, cols] = await Promise.all([listCategories(), listCollections()]);
  const p = (data?.product ?? null) as P | null;
  const history = id && data?.variants.length ? await stockHistory(15, data.variants.map((x) => x.id)) : [];
  const back = id ? `/admin/products/${id}` : "/admin/products";

  return (
    <>
      <PageHead code={`03 / Products / ${isNew ? "New" : v(p, "code")}`} title={isNew ? "New product" : v(p, "name")}
        actions={<>{!isNew && v(p, "status") === "published" && <Link href={`/products/${v(p, "slug")}`} target="_blank" className="btn-ghost btn-sm">View in shop ↗</Link>}<Link href="/admin/products" className="btn-ghost btn-sm">All products</Link></>} />
      <Flash sp={sp} />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <form action={saveProduct} className="panel grid gap-4 sm:grid-cols-2" aria-label="Product details">
          <h2 className="panel-title sm:col-span-2">Details</h2>
          {id && <input type="hidden" name="id" value={id} />}
          <div className="field sm:col-span-2"><label htmlFor="name">Name</label><input id="name" name="name" required defaultValue={v(p, "name")} placeholder="e.g. Strike Tee" /></div>
          <div className="field"><label htmlFor="colourLabel">Colourway</label><input id="colourLabel" name="colourLabel" defaultValue={v(p, "colour_label")} placeholder="e.g. Black / Blue" /></div>
          <div className="field"><label htmlFor="code">Product code</label><input id="code" name="code" defaultValue={v(p, "code")} placeholder="e.g. MV-07" /></div>
          <div className="field"><label htmlFor="slug">Web address</label><input id="slug" name="slug" defaultValue={v(p, "slug")} placeholder="made from the name if empty" /></div>
          <div className="field"><label htmlFor="categoryId">Category</label><select id="categoryId" name="categoryId" defaultValue={String(p?.category_id ?? "")}><option value="">None</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
          <div className="field"><label htmlFor="price">Price (₦)</label><input id="price" name="price" type="number" min={0} required defaultValue={String(p?.price ?? "")} /></div>
          <div className="field"><label htmlFor="compareAt">Was price (₦, for a sale)</label><input id="compareAt" name="compareAt" type="number" min={0} defaultValue={String(p?.compare_at ?? "")} placeholder="Leave empty if not on sale" /></div>
          <div className="field"><label htmlFor="status">Visibility</label><select id="status" name="status" defaultValue={v(p, "status") || "draft"}><option value="draft">Draft (hidden)</option><option value="published">Published (in the shop)</option><option value="archived">Archived</option></select></div>
          <div className="field"><label htmlFor="tag">Hang-tag label</label><input id="tag" name="tag" defaultValue={v(p, "tag")} placeholder="e.g. TEE" /></div>
          <div className="flex flex-wrap gap-5 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={Boolean(p?.featured)} className="size-4" /> Featured</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isNew" defaultChecked={Boolean(p?.is_new)} className="size-4" /> Mark as new</label>
          </div>
          <div className="field sm:col-span-2"><label htmlFor="summary">Short summary</label><input id="summary" name="summary" defaultValue={v(p, "summary")} maxLength={300} /></div>
          <div className="field sm:col-span-2"><label htmlFor="description">Description</label><textarea id="description" name="description" rows={4} defaultValue={v(p, "description")} /></div>
          <div className="field sm:col-span-2"><label htmlFor="details">Key details (one per line)</label><textarea id="details" name="details" rows={4} defaultValue={((p?.details as string[]) ?? []).join("\n")} /></div>
          <div className="field"><label htmlFor="materials">Materials</label><textarea id="materials" name="materials" rows={2} defaultValue={v(p, "materials")} placeholder="e.g. 100% cotton, 280 GSM" /></div>
          <div className="field"><label htmlFor="care">Care instructions</label><textarea id="care" name="care" rows={2} defaultValue={v(p, "care")} placeholder="e.g. Wash cold, inside out" /></div>
          <div className="field sm:col-span-2"><label htmlFor="extraInfo">More information</label><textarea id="extraInfo" name="extraInfo" rows={2} defaultValue={v(p, "extra_info")} /></div>
          <div className="field"><label htmlFor="sort">Position (lower shows first)</label><input id="sort" name="sort" type="number" defaultValue={String(p?.sort ?? 0)} /></div>
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em]">Collections</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">{cols.map((c) => <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="collections" value={c.id} defaultChecked={data?.collectionIds.includes(c.id)} className="size-4" /> {c.title}{!c.visible && <span className="text-muted-foreground">(hidden)</span>}</label>)}</div>
          </fieldset>
          <div className="sm:col-span-2"><Submit>{isNew ? "Create product" : "Save changes"}</Submit></div>
        </form>

        <div className="flex flex-col gap-6">
          {id && data && (
            <section className="panel" aria-labelledby="sizes-h">
              <h2 id="sizes-h" className="panel-title">Sizes &amp; stock</h2>
              {data.variants.length === 0 && <p className="mb-3 text-sm text-accent-red">No sizes yet, so customers can&apos;t buy this. Add sizes below.</p>}
              <ul className="flex flex-col divide-y divide-border">
                {data.variants.map((vr) => (
                  <li key={vr.id} className="flex flex-col gap-2 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{vr.size}{vr.colour && <span className="font-normal text-muted-foreground"> · {vr.colour}</span>}</p>
                      <div className="flex items-center gap-1">
                        <form action={setLowStockLevel} className="flex items-center gap-1"><input type="hidden" name="variantId" value={vr.id} /><input type="hidden" name="back" value={back} />
                          <label htmlFor={`low-${vr.id}`} className="text-[11px] text-muted-foreground">Warn at</label>
                          <input id={`low-${vr.id}`} name="lowAt" type="number" min={0} defaultValue={vr.low_stock_at} className="w-12 border-[1.5px] border-foreground/20 bg-background px-1.5 py-1 text-[12px]" />
                          <Submit className="btn-ghost btn-sm" pendingText="…">Set</Submit></form>
                        <form action={removeVariant}><input type="hidden" name="variantId" value={vr.id} /><input type="hidden" name="back" value={back} /><Submit className="btn-ghost btn-sm" pendingText="…" confirm={`Remove size ${vr.size}? Customers won't be able to choose it.`}>Remove</Submit></form>
                      </div>
                    </div>
                    <StockControls variantId={vr.id} stock={vr.stock} lowAt={vr.low_stock_at} back={back} label={`${v(p, "name")} ${vr.size}`} />
                  </li>
                ))}
              </ul>
              <form action={addVariant} className="mt-4 grid grid-cols-2 gap-2 border-t-2 border-foreground pt-4 sm:grid-cols-5">
                <input type="hidden" name="productId" value={id} /><input type="hidden" name="back" value={back} />
                <div className="field"><label htmlFor="new-size">Size</label><input id="new-size" name="size" required placeholder="XL" /></div>
                <div className="field"><label htmlFor="new-colour">Colour</label><input id="new-colour" name="colour" defaultValue={v(p, "colour_label")} /></div>
                <div className="field"><label htmlFor="new-stock">Stock</label><input id="new-stock" name="stock" type="number" min={0} defaultValue={0} /></div>
                <div className="field"><label htmlFor="new-low">Warn at</label><input id="new-low" name="lowAt" type="number" min={0} defaultValue={3} /></div>
                <div className="flex items-end"><Submit className="btn btn-sm w-full">Add size</Submit></div>
              </form>
            </section>
          )}

          {id && data && (
            <section className="panel" aria-labelledby="img-h">
              <h2 id="img-h" className="panel-title">Images</h2>
              <p className="mb-4 text-[13px] text-muted-foreground">Front, back and side are cut-outs used on the rail and product cards (transparent PNG is best, or tick &ldquo;Remove plain background&rdquo;). Photos are the gallery on the product page.</p>
              <div className="grid grid-cols-3 gap-3">
                {(["front", "back", "side"] as const).map((slot) => {
                  const url = p?.[`${slot}_tight`] as string | null;
                  return (
                    <div key={slot} className="flex flex-col gap-2">
                      <div className="relative bg-studio" style={{ aspectRatio: "4 / 5" }}>{url ? <Image src={url} alt={`${slot} view`} fill sizes="160px" className="object-contain p-1" /> : <span className="absolute inset-0 grid place-items-center font-mono text-[10px] uppercase text-muted-foreground">No {slot}</span>}</div>
                      {url && <form action={clearImage}><input type="hidden" name="id" value={id} /><input type="hidden" name="slot" value={slot} /><Submit className="btn-ghost btn-sm w-full" pendingText="…" confirm={`Remove the ${slot} image?`}>Remove</Submit></form>}
                      <ImageUpload productId={id} slot={slot} label={`${slot} cut-out`} />
                    </div>
                  );
                })}
              </div>
              <h3 className="mb-2 mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Gallery photos</h3>
              <ul className="flex flex-col divide-y divide-border">
                {data.images.map((img, k) => (
                  <li key={img.id} className="flex items-center gap-3 py-2">
                    <div className="relative w-14 shrink-0 bg-studio" style={{ aspectRatio: "4 / 5" }}><Image src={img.url} alt="" fill sizes="56px" className="object-cover" /></div>
                    <form action={saveImageAlt} className="flex min-w-0 flex-1 gap-1"><input type="hidden" name="imageId" value={img.id} /><input type="hidden" name="back" value={back} />
                      <label htmlFor={`alt-${img.id}`} className="sr-only">Description</label>
                      <input id={`alt-${img.id}`} name="alt" defaultValue={img.alt} className="min-w-0 flex-1 border-[1.5px] border-foreground/20 bg-background px-2 py-1.5 text-[12px]" />
                      <Submit className="btn-ghost btn-sm" pendingText="…">Save</Submit></form>
                    <form action={moveImage}><input type="hidden" name="imageId" value={img.id} /><input type="hidden" name="dir" value="-1" /><input type="hidden" name="back" value={back} /><Submit className="btn-ghost btn-sm" pendingText="…">↑</Submit></form>
                    <form action={moveImage}><input type="hidden" name="imageId" value={img.id} /><input type="hidden" name="dir" value="1" /><input type="hidden" name="back" value={back} /><Submit className="btn-ghost btn-sm" pendingText="…">↓</Submit></form>
                    <form action={removeImage}><input type="hidden" name="imageId" value={img.id} /><input type="hidden" name="back" value={back} /><Submit className="btn-ghost btn-sm" pendingText="…" confirm="Remove this photo?">✕</Submit></form>
                  </li>
                ))}
              </ul>
              <div className="mt-3"><ImageUpload productId={id} slot="gallery" label="Add a photo" /></div>
            </section>
          )}

          {id && history.length > 0 && (
            <section className="panel" aria-labelledby="hist-h">
              <h2 id="hist-h" className="panel-title">Recent stock changes</h2>
              <ul className="flex flex-col gap-1.5 text-[12px]">
                {history.map((h) => <li key={h.id}><span className="font-mono text-muted-foreground">{when(h.created_at)}</span> · {h.size}: <strong>{h.delta > 0 ? `+${h.delta}` : h.delta}</strong> → {h.stock_after} ({h.reason}{h.order_number ? ` ${h.order_number}` : ""}) · {h.actor}</li>)}
              </ul>
            </section>
          )}

          {id && (
            <form action={deleteProduct} className="panel flex items-center justify-between gap-3 border-l-4 border-accent-red">
              <input type="hidden" name="id" value={id} />
              <p className="text-sm">Delete this product. If it has orders, it&apos;s archived instead so your records stay intact.</p>
              <Submit className="btn-ghost btn-sm" pendingText="…" confirm="Delete this product?">Delete</Submit>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
