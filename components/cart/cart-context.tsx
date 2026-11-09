"use client";

import * as React from "react";
import { getProduct, type Product } from "@/lib/catalog";

export type Line = { slug: string; size: string; qty: number };
export type CartItem = Line & { product: Product; total: number };

type Cart = {
  items: CartItem[];
  count: number;
  subtotal: number;
  ready: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  add: (slug: string, size: string, qty?: number) => void;
  update: (slug: string, size: string, qty: number) => void;
  remove: (slug: string, size: string) => void;
  clear: () => void;
};

const KEY = "maverick-bag";
const CartContext = React.createContext<Cart | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = React.useState<Line[]>([]);
  const [ready, setReady] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setLines((JSON.parse(raw) as Line[]).filter((l) => getProduct(l.slug)));
    } catch {}
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(KEY, JSON.stringify(lines)); } catch {}
  }, [lines, ready]);

  const add = React.useCallback((slug: string, size: string, qty = 1) => {
    setLines((old) => {
      const hit = old.find((l) => l.slug === slug && l.size === size);
      if (hit) return old.map((l) => (l === hit ? { ...l, qty: Math.min(10, l.qty + qty) } : l));
      return [...old, { slug, size, qty }];
    });
    setOpen(true);
  }, []);
  const update = React.useCallback((slug: string, size: string, qty: number) => {
    setLines((old) => (qty <= 0 ? old.filter((l) => !(l.slug === slug && l.size === size)) : old.map((l) => (l.slug === slug && l.size === size ? { ...l, qty: Math.min(10, qty) } : l))));
  }, []);
  const remove = React.useCallback((slug: string, size: string) => setLines((old) => old.filter((l) => !(l.slug === slug && l.size === size))), []);
  const clear = React.useCallback(() => setLines([]), []);

  const value = React.useMemo<Cart>(() => {
    const items = lines.flatMap((l) => {
      const product = getProduct(l.slug);
      return product ? [{ ...l, product, total: product.price * l.qty }] : [];
    });
    return {
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      subtotal: items.reduce((n, i) => n + i.total, 0),
      ready, open, setOpen, add, update, remove, clear,
    };
  }, [lines, ready, open, add, update, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = React.useContext(CartContext);
  if (!cart) throw new Error("useCart must be used inside <CartProvider>");
  return cart;
}
