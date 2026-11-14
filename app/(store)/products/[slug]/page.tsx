import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { anyInStock, findProduct, related } from "@/lib/catalog";
import { formatPrice, sizeChart } from "@/lib/site";
import { getStorefront } from "@/lib/server/store";
import { AddToBag, ProductGallery } from "@/components/product-purchase";
import { Price, ProductCard } from "@/components/product-card";
import { PlusIcon } from "@/components/icons";

export async function generateStaticParams() {
  const { catalog } = await getStorefront();
  return catalog.products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = findProduct((await getStorefront()).catalog, slug);
  return p ? { title: `${p.name} — ${p.colour}`, description: p.summary, openGraph: { images: [p.photos[0]?.src ?? p.front] } } : {};
}

function Section({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[12px] font-semibold uppercase tracking-[0.16em] [&::-webkit-details-marker]:hidden">
        {title}
        <PlusIcon size={18} className="transition-transform group-open:rotate-45" />
      </summary>
      <div className="pb-5 text-[14px] leading-relaxed text-muted-foreground">{children}</div>
    </details>
  );
}

export default function ProductPage(props: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto min-h-[70vh] max-w-7xl gutter pt-8" aria-busy="true"><p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Loading…</p></div>}>
      <Product params={props.params} />
    </Suspense>
  );
}

async function Product({ params }: { params: PageProps<"/products/[slug]">["params"] }) {
  const { slug } = await params;
  const { catalog, settings, zones } = await getStorefront();
  const p = findProduct(catalog, slug);
  if (!p) notFound();
  const siblings = catalog.products.filter((x) => x.name === p.name && x.slug !== p.slug);
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${p.name} — ${p.colour}`,
    sku: p.code,
    brand: { "@type": "Brand", name: settings.name },
    description: p.description,
    image: p.photos.map((ph) => `${base}${ph.src}`),
    offers: {
      "@type": "Offer",
      url: `${base}/products/${p.slug}`,
      priceCurrency: "NGN",
      price: p.price,
      availability: anyInStock(p) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-7xl gutter pb-20 pt-8">
        <nav aria-label="Breadcrumb" className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link> / {p.category && <><Link href={`/collections/${p.category}`} className="hover:text-foreground">{p.categoryTitle}</Link> / </>}<span className="text-foreground">{p.name}</span>
        </nav>
        <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
          <ProductGallery product={p} />
          <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                <span>{p.code}</span>{p.isNew && <span className="bg-ink px-1.5 py-0.5 text-paper">New</span>}
              </div>
              <h1 className="font-display text-[clamp(2.8rem,6vw,4.5rem)] uppercase leading-[0.88]">{p.name}</h1>
              <p className="text-[15px]">{p.colour}</p>
              <Price product={p} className="!justify-start text-xl" />
            </div>
            {siblings.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em]">Colourway</p>
                <div className="flex gap-2">
                  <span className="cut-sm bg-foreground px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-background">{p.colour}</span>
                  {siblings.map((s) => <Link key={s.slug} href={`/products/${s.slug}`} className="cut-sm px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] ring-1 ring-inset ring-foreground/20 hover:ring-foreground">{s.colour}</Link>)}
                </div>
              </div>
            )}
            <p className="max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">{p.summary}</p>
            <AddToBag product={p} />
            <div className="border-t border-border">
              <Section title="Description" open><p>{p.description}</p></Section>
              <Section title="Details">
                <ul className="flex flex-col gap-1.5">{p.details.map((d) => <li key={d} className="flex gap-2"><span aria-hidden="true">—</span>{d}</li>)}</ul>
              </Section>
              {(p.materials || p.care) && (
                <Section title="Materials & care">
                  {p.materials && <p><span className="font-semibold text-foreground">Materials:</span> {p.materials}</p>}
                  {p.care && <p className="mt-2 whitespace-pre-line"><span className="font-semibold text-foreground">Care:</span> {p.care}</p>}
                </Section>
              )}
              {p.extraInfo && <Section title="More information"><p className="whitespace-pre-line">{p.extraInfo}</p></Section>}
              <Section title="Size & fit">
                <p className="mb-3">Cut oversized and boxy. Take your usual size for the intended look, or size down for a closer fit.</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[320px] text-left font-mono text-[12px] tabular-nums">
                    <thead><tr>{sizeChart.columns.map((c) => <th key={c} className="border-b border-border py-2 pr-3 font-semibold text-foreground">{c}</th>)}</tr></thead>
                    <tbody>{sizeChart.rows.map((r) => <tr key={r[0]}>{r.map((v, k) => <td key={k} className="border-b border-border/60 py-2 pr-3">{v}</td>)}</tr>)}</tbody>
                  </table>
                </div>
                <Link href="/size-guide" className="mt-3 inline-block underline underline-offset-4 hover:text-foreground">Full size guide</Link>
              </Section>
              <Section title="Delivery & returns">
                <p>{settings.freeDeliveryOver > 0 && <>Free delivery on orders over {formatPrice(settings.freeDeliveryOver)}. </>}{zones.map((z) => `${z.name}: ${z.eta.toLowerCase()}`).join(". ")}. Returns accepted within {settings.returnsDays} days on unworn pieces.</p>
                <Link href="/shipping-returns" className="mt-3 inline-block underline underline-offset-4 hover:text-foreground">Shipping & returns</Link>
              </Section>
            </div>
          </div>
        </div>
      </div>
      <section className="border-t border-border" aria-labelledby="rel-h">
        <div className="mx-auto max-w-7xl gutter py-16">
          <h2 id="rel-h" className="mb-6 font-display text-5xl uppercase leading-none">Complete the look</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {related(catalog, p).map((r) => <li key={r.slug}><ProductCard product={r} /></li>)}
          </ul>
        </div>
      </section>
    </>
  );
}
