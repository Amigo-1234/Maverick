import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { COLLECTIONS, products } from "@/lib/catalog";
import { CollectionGrid, CollectionGridFallback } from "@/components/collection-grid";

export function generateStaticParams() {
  return Object.keys(COLLECTIONS).map((handle) => ({ handle }));
}

export async function generateMetadata(props: PageProps<"/collections/[handle]">): Promise<Metadata> {
  const { handle } = await props.params;
  const c = COLLECTIONS[handle];
  return c ? { title: c.title, description: c.blurb } : {};
}

export default async function CollectionPage(props: PageProps<"/collections/[handle]">) {
  const { handle } = await props.params;
  const c = COLLECTIONS[handle];
  if (!c) notFound();
  const slugs = products.filter(c.filter).map((p) => p.slug);
  const tabs = Object.entries(COLLECTIONS);
  return (
    <div className="mx-auto max-w-7xl gutter pb-24 pt-10">
      <nav aria-label="Breadcrumb" className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link> / <span className="text-foreground">{c.title}</span>
      </nav>
      <header className="mb-8 flex flex-col gap-3">
        <h1 className="font-display text-[clamp(3.5rem,10vw,8rem)] uppercase leading-[0.85]">{c.title}</h1>
        <p className="max-w-[56ch] text-muted-foreground">{c.blurb}</p>
      </header>
      <nav aria-label="Collections" className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {tabs.map(([h, t]) => (
          <Link key={h} href={`/collections/${h}`} aria-current={h === handle ? "page" : undefined} className={`cut-sm shrink-0 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] ${h === handle ? "bg-foreground text-background" : "ring-1 ring-inset ring-foreground/20 hover:ring-foreground"}`}>{t.title}</Link>
        ))}
      </nav>
      <Suspense fallback={<CollectionGridFallback slugs={slugs} />}>
        <CollectionGrid slugs={slugs} />
      </Suspense>
    </div>
  );
}
