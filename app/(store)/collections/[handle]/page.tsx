import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { collectionBy } from "@/lib/catalog";
import { getStorefront } from "@/lib/server/store";
import { CollectionGrid, CollectionGridFallback } from "@/components/collection-grid";

export async function generateStaticParams() {
  const { catalog } = await getStorefront();
  return catalog.collections.map((c) => ({ handle: c.handle }));
}

export async function generateMetadata(props: PageProps<"/collections/[handle]">): Promise<Metadata> {
  const { handle } = await props.params;
  const c = collectionBy((await getStorefront()).catalog, handle);
  return c ? { title: c.title, description: c.blurb } : {};
}

export default function CollectionPage(props: PageProps<"/collections/[handle]">) {
  return (
    <Suspense fallback={<div className="mx-auto min-h-[70vh] max-w-7xl gutter pt-10" aria-busy="true" />}>
      <Collection params={props.params} />
    </Suspense>
  );
}

async function Collection({ params }: { params: PageProps<"/collections/[handle]">["params"] }) {
  const { handle } = await params;
  const { catalog } = await getStorefront();
  const c = collectionBy(catalog, handle);
  if (!c) notFound();
  const slugs = c.slugs;
  const tabs = catalog.collections.filter((t) => t.slugs.length || t.handle === handle).map((t) => [t.handle, t] as const);
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
