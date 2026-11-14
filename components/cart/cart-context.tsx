"use client";

import * as React from "react";
import { findProduct, variantFor, type Product } from "@/lib/catalog";
import { track } from "@/lib/track";
import { useCatalog } from "../store-provider";

export type Line = { slug: string; size: string; colour?: string; qty: number };
export type CartItem = Line & { product: Product; total: number; available: number };

type Cart = {
  items: CartItem[];
  count: number;
  subtotal: number;
  ready: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  add: (slug: string, size: string, qty?: number, colour?: string) => void;
  update: (slug: string, size: string, qty: number, colour?: string) => void;
  remove: (slug: string, size: string, colour?: string) => void;
  clear: () => void;
};

const KEY = "maverick-bag";
const CartContext = React.createContext<Cart | null>(null);
const same = (l: Line, slug: string, size: string, colour?: string) => l.slug === slug && l.size === size && (l.colour ?? "") === (colour ?? "");

export function CartProvider({ children }: { children: React.ReactNode }) {
  const catalog = useCatalog();
  const [lines, setLines] = React.useState<Line[]>([]);
  const [ready, setReady] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw) as Line[]);
    } catch {}
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(KEY, JSON.stringify(lines)); } catch {}
  }, [lines, ready]);

  const add = React.useCallback((slug: string, size: string, qty = 1, colour?: string) => {
    const p = findProduct(catalog, slug);
    if (p) track("AddToCart", { value: p.price * qty, contents: [{ id: slug, qty, price: p.price }] });
    setLines((old) => {
      const hit = old.find((l) => same(l, slug, size, colour));
      if (hit) return old.map((l) => (l === hit ? { ...l, qty: Math.min(10, l.qty + qty) } : l));
      return [...old, { slug, size, colour, qty }];
    });
    setOpen(true);
  }, [catalog]);
  const update = React.useCallback((slug: string, size: string, qty: number, colour?: string) => {
    setLines((old) => (qty <= 0 ? old.filter((l) => !same(l, slug, size, colour)) : old.map((l) => (same(l, slug, size, colour) ? { ...l, qty: Math.min(10, qty) } : l))));
  }, []);
  const remove = React.useCallback((slug: string, size: string, colour?: string) => setLines((old) => old.filter((l) => !same(l, slug, size, colour))), []);
  const clear = React.useCallback(() => setLines([]), []);

  const value = React.useMemo<Cart>(() => {
    // Drop anything that's no longer for sale (unpublished or the size removed).
    const items = lines.flatMap((l) => {
      const product = findProduct(catalog, l.slug);
      const v = product ? variantFor(product, l.size, l.colour) : null;
      return product && v ? [{ ...l, product, total: product.price * l.qty, available: v.stock }] : [];
    });
    return {
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      subtotal: items.reduce((n, i) => n + i.total, 0),
      ready, open, setOpen, add, update, remove, clear,
    };
  }, [lines, catalog, ready, open, add, update, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

const noSubscribe = () => () => {};

/**
 * The bag. While a component is hydrating it sees the empty bag the server rendered (parts of the page
 * inside Suspense hydrate after the saved bag has loaded, and a different count would break hydration);
 * React re-renders it with the real bag straight after.
 */
export function useCart() {
  const cart = React.useContext(CartContext);
  if (!cart) throw new Error("useCart must be used inside <CartProvider>");
  const hydrated = React.useSyncExternalStore(noSubscribe, () => true, () => false);
  return React.useMemo(() => (hydrated ? cart : { ...cart, items: [], count: 0, subtotal: 0, ready: false }), [cart, hydrated]);
}
