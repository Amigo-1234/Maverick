"use client";

import * as React from "react";
import Link from "next/link";
import { useCart } from "./cart-context";
import { CartLines, FreeShippingBar } from "./cart-lines";
import { formatPrice } from "@/lib/site";
import { CloseIcon } from "../icons";

export function CartDrawer() {
  const { open, setOpen, items, count, subtotal } = useCart();
  const closeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [open, setOpen]);

  return (
    <div aria-hidden={!open} className={`fixed inset-0 z-[60] ${open ? "" : "pointer-events-none"}`}>
      <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-ink/50 transition-opacity duration-300 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your bag"
        inert={!open}
        className={`absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-paper transition-[transform,box-shadow] ${open ? "shadow-2xl" : "shadow-none"} duration-300 ease-out motion-reduce:transition-none ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-2xl uppercase">Bag <span className="font-mono text-base align-middle text-muted-foreground">({count})</span></h2>
          <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close bag" className="-mr-2 grid size-10 place-items-center hover:text-accent-blue focus-visible:outline-2 focus-visible:outline-ring"><CloseIcon size={22} /></button>
        </header>
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
            <p className="font-display text-4xl uppercase">Your bag is empty</p>
            <p className="text-sm text-muted-foreground">Nothing here yet. Start with Drop 01.</p>
            <Link href="/collections/all" onClick={() => setOpen(false)} className="btn">Shop all</Link>
          </div>
        ) : (
          <>
            <div className="border-b border-border px-5 py-4"><FreeShippingBar /></div>
            <div className="flex-1 overflow-y-auto px-5"><CartLines compact /></div>
            <footer className="flex flex-col gap-3 border-t border-border px-5 py-5">
              <div className="flex items-center justify-between text-sm">
                <span className="uppercase tracking-[0.14em]">Subtotal</span>
                <span className="price text-base tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              <p className="text-[12px] text-muted-foreground">Delivery is calculated at checkout.</p>
              <Link href="/checkout" onClick={() => setOpen(false)} className="btn w-full">Checkout</Link>
              <Link href="/cart" onClick={() => setOpen(false)} className="btn-ghost w-full">View bag</Link>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
