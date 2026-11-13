"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { inStock, tight, type Product } from "@/lib/catalog";
import { formatPrice, site, whatsappLink } from "@/lib/site";
import { BagIcon, ReturnIcon, TruckIcon, WhatsAppIcon } from "./icons";
import { useCart } from "./cart/cart-context";

export function ProductGallery({ product }: { product: Product }) {
  const views = [
    { src: tight(product.front), alt: `${product.name}, ${product.colour}, front`, cut: true },
    ...(product.back ? [{ src: tight(product.back), alt: `${product.name}, ${product.colour}, back`, cut: true }] : []),
    ...product.photos.map((p) => ({ ...p, cut: false })),
  ];
  const [i, setI] = React.useState(0);
  const view = views[i] ?? views[0];
  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      <ul className="flex gap-2 overflow-x-auto md:flex-col" aria-label="Product views">
        {views.map((v, k) => (
          <li key={v.src} className="shrink-0">
            <button type="button" aria-label={`Show ${v.alt}`} aria-pressed={k === i} onClick={() => setI(k)} className={`relative block w-[72px] border-2 bg-studio focus-visible:outline-2 focus-visible:outline-ring ${k === i ? "border-foreground" : "border-transparent hover:border-foreground/30"}`} style={{ aspectRatio: "4 / 5" }}>
              <Image src={v.src} alt="" fill sizes="72px" className={v.cut ? "object-contain p-1" : "object-cover"} />
            </button>
          </li>
        ))}
      </ul>
      <div className="cut relative flex-1 overflow-hidden bg-studio" style={{ aspectRatio: "4 / 5" }}>
        <Image key={view.src} src={view.src} alt={view.alt} fill priority sizes="(min-width: 768px) 50vw, 100vw" className={`animate-in fade-in duration-300 ${view.cut ? "object-contain p-[7%]" : "object-contain"}`} />
        {product.back && i < 2 && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 bg-paper p-1 text-[11px] font-semibold uppercase tracking-[0.16em] shadow">
            {["Front", "Back"].map((label, k) => (
              <button key={label} type="button" onClick={() => setI(k)} aria-pressed={i === k} className={`px-4 py-2 ${i === k ? "bg-foreground text-background" : "hover:bg-foreground/5"}`}>{label}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AddToBag({ product }: { product: Product }) {
  const { add } = useCart();
  const [size, setSize] = React.useState<string | null>(null);
  const [error, setError] = React.useState(false);
  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <legend className="text-[12px] font-semibold uppercase tracking-[0.16em]">Size{size && <span className="text-muted-foreground"> — {size}</span>}</legend>
          <Link href="/size-guide" className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground underline underline-offset-4 hover:text-foreground">Size guide</Link>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {product.sizes.map((s) => {
            const available = inStock(product, s);
            return (
              <button key={s} type="button" disabled={!available} aria-pressed={size === s} aria-label={available ? `Size ${s}` : `Size ${s}, sold out`} onClick={() => { setSize(s); setError(false); }} className={`cut-sm py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:text-muted-foreground/60 disabled:line-through ${size === s ? "bg-foreground text-background" : "bg-paper ring-1 ring-inset ring-foreground/20 enabled:hover:ring-foreground"}`}>{s}</button>
            );
          })}
        </div>
        {error && <p role="alert" className="text-[13px] font-semibold text-accent-red">Choose a size first.</p>}
      </fieldset>
      <button type="button" onClick={() => (size ? add(product.slug, size) : setError(true))} className="btn w-full py-4 text-sm">
        <BagIcon size={18} /> Add to bag — {formatPrice(product.price)}
      </button>
      <a
        href={whatsappLink(`Hi MAVERICK, I'd like to order the ${product.name} (${product.colour})${size ? `, size ${size}` : ""} — ${formatPrice(product.price)}. Code ${product.code}.`)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-ghost w-full py-4 text-sm"
      >
        <WhatsAppIcon size={18} /> Order on WhatsApp
      </a>
      <ul className="flex flex-col gap-2 border-t border-border pt-4 text-[13px] text-muted-foreground">
        <li className="flex items-center gap-2.5"><TruckIcon size={18} className="shrink-0 text-foreground" /> Free delivery on orders over {formatPrice(site.freeShippingOver)}</li>
        <li className="flex items-center gap-2.5"><ReturnIcon size={18} className="shrink-0 text-foreground" /> {site.returnsDays}-day returns on unworn pieces</li>
      </ul>
    </div>
  );
}
