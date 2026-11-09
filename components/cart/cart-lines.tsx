"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "./cart-context";
import { formatPrice, site } from "@/lib/site";
import { tight } from "@/lib/catalog";
import { MinusIcon, PlusIcon } from "../icons";

export function FreeShippingBar() {
  const { subtotal } = useCart();
  const left = site.freeShippingOver - subtotal;
  const pct = Math.min(100, (subtotal / site.freeShippingOver) * 100);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em]">
        {left > 0 ? <>You&apos;re {formatPrice(left)} away from free delivery</> : <>Free delivery unlocked</>}
      </p>
      <div className="h-1.5 w-full overflow-hidden bg-foreground/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Progress to free delivery">
        <div className="h-full bg-accent-blue transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function CartLines({ compact = false }: { compact?: boolean }) {
  const { items, update, remove, setOpen } = useCart();
  return (
    <ul className="flex flex-col divide-y divide-border">
      {items.map((item) => (
        <li key={`${item.slug}-${item.size}`} className="flex gap-4 py-4">
          <Link href={`/products/${item.slug}`} onClick={() => setOpen(false)} className="cut relative shrink-0 bg-studio" style={{ width: compact ? 84 : 110, aspectRatio: "200 / 240" }}>
            <Image src={tight(item.product.front)} alt={item.product.name} fill sizes="110px" className="object-contain p-1.5" />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/products/${item.slug}`} onClick={() => setOpen(false)} className="font-semibold uppercase tracking-wide hover:text-accent-blue">{item.product.name}</Link>
                <p className="text-[13px] text-muted-foreground">{item.product.colour} · Size {item.size}</p>
              </div>
              <p className="price text-sm tabular-nums">{formatPrice(item.total)}</p>
            </div>
            <div className="mt-auto flex items-center justify-between gap-3">
              <div className="flex items-center border border-foreground/25">
                <button type="button" aria-label={`Decrease quantity of ${item.product.name}`} onClick={() => update(item.slug, item.size, item.qty - 1)} className="grid size-8 place-items-center hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-ring"><MinusIcon size={14} /></button>
                <span className="w-8 text-center font-mono text-sm tabular-nums" aria-live="polite">{item.qty}</span>
                <button type="button" aria-label={`Increase quantity of ${item.product.name}`} onClick={() => update(item.slug, item.size, item.qty + 1)} className="grid size-8 place-items-center hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-ring"><PlusIcon size={14} /></button>
              </div>
              <button type="button" onClick={() => remove(item.slug, item.size)} className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Remove</button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
