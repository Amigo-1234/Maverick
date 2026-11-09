"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { products as all, type Product } from "@/lib/catalog";
import { ProductCard } from "./product-card";

const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "new", label: "Newest" },
  { id: "price-asc", label: "Price, low to high" },
  { id: "price-desc", label: "Price, high to low" },
];

const baseColour = (p: Product) => p.colour.split(" / ")[0] ?? p.colour;

export function CollectionGrid({ slugs }: { slugs: string[] }) {
  const params = useSearchParams();
  const sort = params.get("sort") ?? "featured";
  const colour = params.get("colour") ?? "";
  const items = React.useMemo(() => all.filter((p) => slugs.includes(p.slug)), [slugs]);
  const colours = [...new Set(items.map(baseColour))];

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    const qs = next.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  };

  const shown = items
    .filter((p) => !colour || baseColour(p) === colour)
    .sort((a, b) => sort === "price-asc" ? a.price - b.price : sort === "price-desc" ? b.price - a.price : sort === "new" ? Number(b.isNew) - Number(a.isNew) : 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-border py-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by colour">
          <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Colour</span>
          {["", ...colours].map((c) => (
            <button key={c || "all"} type="button" aria-pressed={colour === c} onClick={() => set("colour", c)} className={`cut-sm px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] ${colour === c ? "bg-foreground text-background" : "ring-1 ring-inset ring-foreground/20 hover:ring-foreground"}`}>
              {c || "All"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground tabular-nums">{shown.length} {shown.length === 1 ? "piece" : "pieces"}</span>
          <label htmlFor="sort" className="sr-only">Sort by</label>
          <select id="sort" value={sort} onChange={(e) => set("sort", e.target.value === "featured" ? "" : e.target.value)} className="border border-foreground/20 bg-paper px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] outline-none focus:border-foreground">
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">No pieces match that filter.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {shown.map((p, i) => <li key={p.slug}><ProductCard product={p} priority={i < 4} /></li>)}
        </ul>
      )}
    </div>
  );
}

export function CollectionGridFallback({ slugs }: { slugs: string[] }) {
  const items = all.filter((p) => slugs.includes(p.slug));
  return (
    <ul className="mt-[66px] grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
      {items.map((p) => <li key={p.slug}><ProductCard product={p} /></li>)}
    </ul>
  );
}
