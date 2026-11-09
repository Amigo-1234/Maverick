"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-context";
import { NIGERIAN_STATES, formatPrice, site } from "@/lib/site";
import { tight } from "@/lib/catalog";

export default function CheckoutPage() {
  const { items, subtotal, ready, clear } = useCart();
  const router = useRouter();
  const [method, setMethod] = React.useState(site.shipping[0]!.id);
  const [busy, setBusy] = React.useState(false);
  const option = site.shipping.find((s) => s.id === method) ?? site.shipping[0]!;
  const delivery = subtotal >= site.freeShippingOver ? 0 : option.price;
  const total = subtotal + delivery;

  if (!ready) return <div className="min-h-[60vh]" />;
  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-5 gutter py-20">
        <h1 className="font-display text-6xl uppercase">Checkout</h1>
        <p className="text-muted-foreground">Your bag is empty, so there&apos;s nothing to check out yet.</p>
        <Link href="/collections/all" className="btn">Shop all</Link>
      </div>
    );
  }

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const order = {
      id: `MV-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      email: String(form.get("email")),
      name: `${form.get("firstName")} ${form.get("lastName")}`,
      address: [form.get("address1"), form.get("address2"), form.get("city"), form.get("state"), form.get("postcode"), form.get("country")].filter(Boolean).join(", "),
      delivery: { label: option.label, eta: option.eta, price: delivery },
      lines: items.map((i) => ({ name: i.product.name, colour: i.product.colour, size: i.size, qty: i.qty, total: i.total, image: tight(i.product.front) })),
      subtotal, total,
    };
    try { sessionStorage.setItem("maverick-last-order", JSON.stringify(order)); } catch {}
    clear();
    router.push("/checkout/success");
  };

  return (
    <div className="mx-auto max-w-7xl gutter pb-24 pt-10">
      <h1 className="mb-8 font-display text-[clamp(3rem,8vw,6rem)] uppercase leading-[0.85]">Checkout</h1>
      <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-10">
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-4 font-display text-3xl uppercase">1. Contact</legend>
            <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
            <label className="flex items-center gap-2 text-sm"><input id="marketing" name="marketing" type="checkbox" className="size-4 accent-[var(--ink)]" /> Email me about new drops</label>
          </fieldset>
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-4 font-display text-3xl uppercase">2. Delivery address</legend>
            <div className="field"><label htmlFor="firstName">First name</label><input id="firstName" name="firstName" required autoComplete="given-name" /></div>
            <div className="field"><label htmlFor="lastName">Last name</label><input id="lastName" name="lastName" required autoComplete="family-name" /></div>
            <div className="field sm:col-span-2"><label htmlFor="address1">Address</label><input id="address1" name="address1" required autoComplete="address-line1" /></div>
            <div className="field sm:col-span-2"><label htmlFor="address2">Apartment, suite (optional)</label><input id="address2" name="address2" autoComplete="address-line2" /></div>
            <div className="field"><label htmlFor="city">City</label><input id="city" name="city" required autoComplete="address-level2" /></div>
            <div className="field"><label htmlFor="state">State</label><select id="state" name="state" required defaultValue="Lagos" autoComplete="address-level1">{NIGERIAN_STATES.map((st) => <option key={st}>{st}</option>)}</select></div>
            <div className="field"><label htmlFor="postcode">Postal code (optional)</label><input id="postcode" name="postcode" autoComplete="postal-code" /></div>
            <div className="field"><label htmlFor="country">Country</label>
              <select id="country" name="country" defaultValue="Nigeria" autoComplete="country-name"><option>Nigeria</option><option>Ghana</option><option>United Kingdom</option><option>United States</option><option>Other</option></select>
            </div>
            <div className="field"><label htmlFor="phone">Phone number (for the rider)</label><input id="phone" name="phone" type="tel" required placeholder="0803 000 0000" autoComplete="tel" /></div>
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-4 font-display text-3xl uppercase">3. Delivery method</legend>
            {site.shipping.map((s) => {
              const free = subtotal >= site.freeShippingOver;
              return (
                <label key={s.id} htmlFor={`ship-${s.id}`} className={`flex cursor-pointer items-center justify-between gap-4 border-[1.5px] px-4 py-4 ${method === s.id ? "border-foreground bg-paper" : "border-foreground/20"}`}>
                  <span className="flex items-center gap-3">
                    <input id={`ship-${s.id}`} type="radio" name="shipping" value={s.id} checked={method === s.id} onChange={() => setMethod(s.id)} className="size-4 accent-[var(--ink)]" />
                    <span><span className="block font-semibold">{s.label}</span><span className="text-[13px] text-muted-foreground">{s.eta}</span></span>
                  </span>
                  <span className="price text-sm tabular-nums">{free ? "Free" : formatPrice(s.price)}</span>
                </label>
              );
            })}
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-4 font-display text-3xl uppercase">4. Payment</legend>
            <div className="border-[1.5px] border-dashed border-foreground/30 bg-paper p-5 text-sm leading-relaxed">
              <p className="font-semibold uppercase tracking-[0.12em]">Test mode</p>
              <p className="mt-1 text-muted-foreground">Payments aren&apos;t connected yet, so placing an order here takes no money and ships nothing. Card, bank transfer and USSD payments will appear here once Paystack or Flutterwave is connected.</p>
            </div>
          </fieldset>
        </div>

        <aside className="flex flex-col gap-5 self-start bg-paper p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-3xl uppercase">Order summary</h2>
          <ul className="flex flex-col gap-4">
            {items.map((i) => (
              <li key={`${i.slug}-${i.size}`} className="flex items-center gap-3">
                <div className="relative w-16 shrink-0 bg-studio" style={{ aspectRatio: "4 / 5" }}>
                  <Image src={tight(i.product.front)} alt="" fill sizes="64px" className="object-contain p-1" />
                  <span className="absolute -right-2 -top-2 grid size-5 place-items-center bg-ink font-mono text-[10px] text-paper">{i.qty}</span>
                </div>
                <div className="min-w-0 flex-1 text-sm"><p className="font-semibold uppercase">{i.product.name}</p><p className="text-muted-foreground">{i.product.colour} · {i.size}</p></div>
                <span className="price text-sm tabular-nums">{formatPrice(i.total)}</span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="price tabular-nums">{formatPrice(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd className="price tabular-nums">{delivery === 0 ? "Free" : formatPrice(delivery)}</dd></div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold"><dt className="uppercase tracking-[0.1em]">Total</dt><dd className="price tabular-nums">{formatPrice(total)}</dd></div>
          </dl>
          <button type="submit" disabled={busy} className="btn w-full py-4 disabled:opacity-60">{busy ? "Placing order…" : `Place test order — ${formatPrice(total)}`}</button>
          <Link href="/cart" className="text-center text-[12px] uppercase tracking-[0.14em] underline underline-offset-4 hover:text-accent-blue">Back to bag</Link>
        </aside>
      </form>
    </div>
  );
}
