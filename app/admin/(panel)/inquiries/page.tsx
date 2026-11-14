import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/server/admin";
import { getInquiry, INQUIRY_LABELS, listInquiries } from "@/lib/server/inquiries";
import { sql } from "@/lib/server/db";
import { normalisePhone } from "@/lib/site";
import { AdminLoading, Empty, Flash, InquiryPill, PageHead, when } from "@/components/admin/ui";
import { Submit } from "@/components/admin/submit";
import { saveInquiry } from "../../actions";

export const metadata: Metadata = { title: "Inquiries" };

export default function InquiriesPage(props: PageProps<"/admin/inquiries">) {
  return <Suspense fallback={<AdminLoading />}><Body sp={props.searchParams} /></Suspense>;
}

const s = (v: unknown) => (typeof v === "string" ? v : "");

async function Body({ sp: spP }: { sp: PageProps<"/admin/inquiries">["searchParams"] }) {
  await requireAdmin();
  const sp = await spP;
  const f = { q: s(sp.q), status: s(sp.status), product: s(sp.product) };
  const [rows, products] = await Promise.all([listInquiries(f), sql<{ id: number; name: string; colour_label: string }>("select id, name, colour_label from products order by sort, id")]);
  const openId = Number(s(sp.id)) || rows[0]?.id || 0;
  const open = openId ? await getInquiry(openId) : null;
  const keep = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
  const link = (id: number) => `/admin/inquiries?${new URLSearchParams({ ...Object.fromEntries(keep), id: String(id) })}`;

  return (
    <>
      <PageHead code="07 / Inquiries" title="Inquiries" intro="Questions customers sent from product pages. Separate from orders. Reply by email or WhatsApp, then mark it answered." />
      <Flash sp={sp} />
      <form className="mb-6 grid gap-3 bg-paper p-4 sm:grid-cols-[2fr_1fr_1fr_auto]" role="search">
        <div className="field"><label htmlFor="q">Search</label><input id="q" name="q" defaultValue={f.q} placeholder="Name, email, phone or message" /></div>
        <div className="field"><label htmlFor="status">Status</label><select id="status" name="status" defaultValue={f.status}><option value="">Any</option>{Object.entries(INQUIRY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label htmlFor="product">Product</label><select id="product" name="product" defaultValue={f.product}><option value="">Any</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} {p.colour_label}</option>)}</select></div>
        <div className="flex items-end gap-2"><button className="btn" type="submit">Filter</button><Link href="/admin/inquiries" className="btn-ghost">Clear</Link></div>
      </form>

      {rows.length === 0 ? <Empty title="No inquiries">Questions from the &ldquo;Ask about this product&rdquo; form land here.</Empty> : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <ul className="flex max-h-[75vh] flex-col overflow-y-auto bg-paper" aria-label="Inquiries">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={link(r.id)} aria-current={r.id === openId ? "true" : undefined} className={`flex flex-col gap-1 border-b border-border px-4 py-3 text-sm ${r.id === openId ? "bg-ink text-paper" : "hover:bg-background"}`}>
                  <span className="flex items-center justify-between gap-2"><span className="font-semibold">{r.name}</span><InquiryPill s={r.status} /></span>
                  <span className={`text-[12px] ${r.id === openId ? "text-paper/70" : "text-muted-foreground"}`}>{r.productName || "General"} · {when(r.createdAt)}</span>
                  <span className={`line-clamp-2 text-[13px] ${r.id === openId ? "text-paper/85" : ""}`}>{r.message}</span>
                </Link>
              </li>
            ))}
          </ul>

          {open && (
            <article className="panel flex flex-col gap-4 self-start" aria-labelledby="inq-h">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 id="inq-h" className="font-display text-3xl uppercase">{open.name}</h2><p className="text-[12px] text-muted-foreground">{when(open.createdAt)}</p></div>
                <InquiryPill s={open.status} />
              </header>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Email</dt><dd><a className="underline" href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: ${open.productName || "your question"}`)}`}>{open.email}</a></dd></div>
                <div><dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Phone</dt><dd>{open.phone || "—"}</dd></div>
                <div><dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Product</dt><dd>{open.productSlug ? <Link className="underline" href={`/products/${open.productSlug}`} target="_blank">{open.productName}</Link> : open.productName || "General"}</dd></div>
                <div><dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Size / colour</dt><dd>{[open.size, open.colour].filter(Boolean).join(" · ") || "—"}</dd></div>
              </dl>
              <blockquote className="whitespace-pre-wrap border-l-4 border-foreground bg-background p-4 text-[15px] leading-relaxed">{open.message}</blockquote>
              <div className="flex flex-wrap gap-2">
                <a className="btn btn-sm" href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: ${open.productName || "your question"}`)}&body=${encodeURIComponent(`Hi ${open.name.split(" ")[0]},\n\n`)}`}>Reply by email</a>
                {open.phone && <a className="btn btn-sm bg-[#25D366] text-ink" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${normalisePhone(open.phone)}?text=${encodeURIComponent(`Hi ${open.name.split(" ")[0]}, it's MAVERICK about your question on the ${open.productName || "website"}.`)}`}>Reply on WhatsApp</a>}
              </div>
              <form action={saveInquiry} className="flex flex-col gap-3 border-t border-border pt-4">
                <input type="hidden" name="id" value={open.id} /><input type="hidden" name="back" value={link(open.id)} />
                <div className="field"><label htmlFor="inq-status">Status</label><select id="inq-status" name="status" defaultValue={open.status}>{Object.entries(INQUIRY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="field"><label htmlFor="inq-notes">Internal notes</label><textarea id="inq-notes" name="notes" rows={3} defaultValue={open.notes} placeholder="Only staff see this" /></div>
                <Submit className="btn self-start">Save</Submit>
              </form>
            </article>
          )}
        </div>
      )}
    </>
  );
}
