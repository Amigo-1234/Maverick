"use client";

import * as React from "react";
import { useCart } from "@/components/cart/cart-context";
import { track } from "@/lib/track";

/** Empties the bag once and reports the purchase to any ad pixels. Renders nothing. */
export function OrderPlaced({ reference, total, items }: { reference: string; total: number; items: { id: string; qty: number; price: number }[] }) {
  const { clear, ready } = useCart();
  const done = React.useRef(false);
  React.useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    clear();
    const key = `maverick-tracked-${reference}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch {}
    track("Purchase", { value: total, currency: "NGN", contents: items, order_id: reference });
  }, [ready, clear, reference, total, items]);
  return null;
}
