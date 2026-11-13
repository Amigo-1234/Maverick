"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { inStock, tight, type Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/site";
import { useCart } from "./cart/cart-context";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { add } = useCart();
  const [quick, setQuick] = React.useState(false);
  return (
    <article className="group relative flex flex-col gap-3">
      <div className="cut relative overflow-hidden bg-studio" style={{ aspectRatio: "4 / 5" }}>
        <Link href={`/products/${product.slug}`} className="absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring" aria-label={`${product.name}, ${product.colour}`}>
          <Image src={tight(product.front)} alt="" fill priority={priority} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" className={`object-contain object-center p-[6%] pt-[9%] transition-[opacity,transform] duration-500 motion-reduce:transition-none ${product.back ? "group-hover:opacity-0" : "group-hover:scale-[1.04]"}`} />
          {product.back && <Image src={tight(product.back)} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" className="object-contain object-center p-[6%] pt-[9%] opacity-0 transition-opacity duration-500 group-hover:opacity-100 motion-reduce:transition-none" />}
        </Link>
        <div className="pointer-events-none absolute left-3 top-3 flex gap-1.5">
          {product.isNew && <span className="bg-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-paper">New</span>}
          {product.back && <span className="bg-paper/90 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em]">Front + back</span>}
        </div>
        <div className={`absolute inset-x-3 bottom-3 transition-[opacity,transform] duration-300 motion-reduce:transition-none ${quick ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100"}`}>
          {quick ? (
            <div className="flex flex-col gap-2 bg-paper p-2 shadow-lg">
              <p className="px-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Pick a size</p>
              <div className="grid grid-cols-5 gap-1">
                {product.sizes.map((s) => (
                  <button key={s} type="button" disabled={!inStock(product, s)} aria-label={inStock(product, s) ? `Size ${s}` : `Size ${s}, sold out`} onClick={() => { add(product.slug, s); setQuick(false); }} className="border border-foreground/20 py-2 text-[12px] font-semibold enabled:hover:bg-foreground enabled:hover:text-background focus-visible:outline-2 focus-visible:outline-ring disabled:text-muted-foreground/50 disabled:line-through">{s}</button>
                ))}
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setQuick(true)} className="btn w-full">Quick add</button>
          )}
        </div>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{product.code}</p>
          <h3 className="font-semibold uppercase tracking-wide"><Link href={`/products/${product.slug}`} className="hover:text-accent-blue">{product.name}</Link></h3>
          <p className="text-[13px] text-muted-foreground">{product.colour}</p>
        </div>
        <p className="price text-sm tabular-nums">{formatPrice(product.price)}</p>
      </div>
    </article>
  );
}
