"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";
import { CartLines, FreeShippingBar } from "@/components/cart/cart-lines";
import { formatPrice } from "@/lib/site";

export default function CartPage() {
  const { items, subtotal, ready, count } = useCart();
  return (
    <div className="mx-auto max-w-7xl gutter pb-24 pt-10">
      <h1 className="mb-8 font-display text-[clamp(3.5rem,10vw,7rem)] uppercase leading-[0.85]">Your bag {ready && <span className="font-mono text-2xl align-middle text-muted-foreground">({count})</span>}</h1>
      {!ready ? null : items.length === 0 ? (
        <div className="flex flex-col items-start gap-5 border-t border-border py-12">
          <p className="text-muted-foreground">Your bag is empty.</p>
          <Link href="/collections/all" className="btn">Shop all</Link>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div className="border-t border-border"><CartLines /></div>
          <aside className="flex flex-col gap-5 self-start bg-paper p-6 lg:sticky lg:top-24">
            <FreeShippingBar />
            <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="price tabular-nums">{formatPrice(subtotal)}</dd></div>
              <div className="flex justify-between text-muted-foreground"><dt>Delivery</dt><dd>At checkout</dd></div>
            </dl>
            <Link href="/checkout" className="btn w-full py-4">Checkout</Link>
            <Link href="/collections/all" className="text-center text-[12px] uppercase tracking-[0.14em] underline underline-offset-4 hover:text-accent-blue">Continue shopping</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
