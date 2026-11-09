"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/site";

type Order = {
  id: string; email: string; name: string; address: string;
  delivery: { label: string; eta: string; price: number };
  lines: { name: string; colour: string; size: string; qty: number; total: number; image: string }[];
  subtotal: number; total: number;
};

export default function OrderConfirmed() {
  const [order, setOrder] = React.useState<Order | null | undefined>(undefined);
  React.useEffect(() => {
    try { const raw = sessionStorage.getItem("maverick-last-order"); setOrder(raw ? JSON.parse(raw) : null); } catch { setOrder(null); }
  }, []);

  if (order === undefined) return <div className="min-h-[60vh]" />;
  if (!order) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-5 gutter py-20">
        <h1 className="font-display text-6xl uppercase">No recent order</h1>
        <p className="text-muted-foreground">We couldn&apos;t find an order from this session.</p>
        <Link href="/collections/all" className="btn">Shop all</Link>
      </div>
    );
  }
  return (
    <div className="mx-auto grid max-w-7xl gap-10 gutter pb-24 pt-12 lg:grid-cols-[1.3fr_1fr]">
      <div className="flex flex-col gap-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent-blue">Order {order.id} · Test mode</p>
        <h1 className="font-display text-[clamp(3.5rem,10vw,7rem)] uppercase leading-[0.85]">Order placed.</h1>
        <p className="max-w-[52ch] text-muted-foreground">Thanks, {order.name.split(" ")[0]}. This was a test order, so no payment was taken. When payments go live, a confirmation would be sent to <span className="text-foreground">{order.email}</span>.</p>
        <dl className="grid gap-4 border-t border-border pt-5 text-sm sm:grid-cols-2">
          <div><dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Delivering to</dt><dd className="mt-1">{order.address}</dd></div>
          <div><dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Delivery</dt><dd className="mt-1">{order.delivery.label}, {order.delivery.eta}</dd></div>
        </dl>
        <Link href="/collections/all" className="btn self-start">Keep shopping</Link>
      </div>
      <aside className="flex flex-col gap-4 self-start bg-paper p-6">
        <ul className="flex flex-col gap-4">
          {order.lines.map((l, k) => (
            <li key={k} className="flex items-center gap-3 text-sm">
              <div className="relative w-14 shrink-0 bg-studio" style={{ aspectRatio: "4 / 5" }}><Image src={l.image} alt="" fill sizes="56px" className="object-contain p-1" /></div>
              <div className="flex-1"><p className="font-semibold uppercase">{l.name}</p><p className="text-muted-foreground">{l.colour} · {l.size} · ×{l.qty}</p></div>
              <span className="price tabular-nums">{formatPrice(l.total)}</span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="price tabular-nums">{formatPrice(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Delivery</dt><dd className="price tabular-nums">{order.delivery.price === 0 ? "Free" : formatPrice(order.delivery.price)}</dd></div>
          <div className="flex justify-between border-t border-border pt-3 font-semibold"><dt>Total</dt><dd className="price tabular-nums">{formatPrice(order.total)}</dd></div>
        </dl>
      </aside>
    </div>
  );
}
