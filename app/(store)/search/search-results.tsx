"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { products } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";

export function SearchResults() {
  const params = useSearchParams();
  const [q, setQ] = React.useState(params.get("q") ?? "");
  React.useEffect(() => { setQ(params.get("q") ?? ""); }, [params]);
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = terms.length
    ? products.filter((p) => {
        const hay = `${p.name} ${p.colour} ${p.category} ${p.code} ${p.description} ${p.details.join(" ")}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      })
    : products;

  return (
    <div className="flex flex-col gap-8">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="flex items-center gap-3 border-b-2 border-foreground">
        <label htmlFor="search-q" className="sr-only">Search the store</label>
        <input
          id="search-q" value={q} autoFocus placeholder="Tees, ringers, black, blue…"
          onChange={(e) => { setQ(e.target.value); window.history.replaceState(null, "", e.target.value ? `?q=${encodeURIComponent(e.target.value)}` : "/search"); }}
          className="min-w-0 flex-1 bg-transparent py-3 font-display text-3xl uppercase outline-none placeholder:text-muted-foreground/50"
        />
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground tabular-nums">{hits.length} results</span>
      </form>
      {hits.length === 0 ? (
        <p className="py-10 text-muted-foreground">Nothing matches &ldquo;{q}&rdquo;. Try &ldquo;tee&rdquo;, &ldquo;ringer&rdquo; or a colour.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {hits.map((p) => <li key={p.slug}><ProductCard product={p} /></li>)}
        </ul>
      )}
    </div>
  );
}
