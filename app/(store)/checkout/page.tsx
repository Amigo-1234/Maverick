"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";
import { ShieldIcon } from "@/components/icons";
import { useStore, useWhatsApp } from "@/components/store-provider";
import { NIGERIAN_STATES, deliveryFee, formatPrice, zonesForState } from "@/lib/site";
import { track } from "@/lib/track";

const DRAFT_KEY = "maverick-checkout-draft";
const FIELDS = ["email", "firstName", "lastName", "address1", "address2", "city", "state", "postcode", "country", "phone"] as const;
type Quote = { subtotal: number; discount: { code: string; amount: number } | null; delivery: { zoneId: number; fee: number } | null; total: number };

export default function CheckoutPage() {
  const { items, subtotal, ready } = useCart();
  const { settings, zones } = useStore();
  const wa = useWhatsApp();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [state, setState] = React.useState("Lagos");
  const options = zonesForState(zones, state);
  const [zoneId, setZoneId] = React.useState<number | null>(null);
  const zone = options.find((z) => z.id === zoneId) ?? options[0] ?? null;
  const [code, setCode] = React.useState("");
  const [applied, setApplied] = React.useState("");
  const [codeError, setCodeError] = React.useState<string | null>(null);
  const [quote, setQuote] = React.useState<Quote | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const lines = React.useMemo(() => items.map((i) => ({ slug: i.slug, size: i.size, colour: i.colour, qty: i.qty })), [items]);

  // Server-side price check whenever the bag, delivery or code changes. The server's numbers are what get charged.
  React.useEffect(() => {
    if (!ready || !lines.length || !zone) return;
    const ctrl = new AbortController();
    fetch("/api/checkout/quote", { method: "POST", signal: ctrl.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lines, state, zoneId: zone.id, discountCode: applied }) })
      .then(async (r) => {
        const d = await r.json();
        if (r.ok) { setQuote(d); setError(null); setCodeError(null); return; }
        if (d.field === "discount") { setCodeError(d.error); setApplied(""); } else setError(d.error);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [ready, lines, state, zone, applied]);

  React.useEffect(() => {
    if (!ready || !formRef.current) return;
    try {
      const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null") as Record<string, string> | null;
      if (draft) {
        for (const f of FIELDS) { const el = formRef.current.elements.namedItem(f) as HTMLInputElement | null; if (el && draft[f]) el.value = draft[f]; }
        if (draft.state) setState(draft.state);
        if (draft.zoneId) setZoneId(Number(draft.zoneId));
      }
    } catch {}
    if (new URLSearchParams(window.location.search).has("cancelled")) setNotice("Payment cancelled. Nothing was charged, and your bag and details are saved.");
  }, [ready]);

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

  // Shown immediately; replaced by the server's quote as soon as it arrives.
  const discount = quote?.discount?.amount ?? 0;
  const fee = quote?.delivery?.fee ?? (zone ? deliveryFee(zone, subtotal - discount, settings.freeDeliveryOver) : 0);
  const total = quote?.total ?? subtotal - discount + fee;
  const unavailable = items.some((i) => i.qty > i.available);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!zone) { setError("Choose a delivery option."); return; }
    setError(null); setNotice(null); setBusy(true);
    const form = new FormData(e.currentTarget);
    const customer = Object.fromEntries(FIELDS.map((f) => [f, String(form.get(f) ?? "")]));
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...customer, zoneId: zone.id })); } catch {}
    track("InitiateCheckout", { value: total, contents: items.map((i) => ({ id: i.slug, qty: i.qty, price: i.product.price })) });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: { ...customer, marketing: form.get("marketing") === "on" }, lines, zoneId: zone.id, discountCode: applied }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "Something went wrong. Please try again.");
      window.location.assign(data.url); // Paystack's secure payment page
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl gutter pb-24 pt-10">
      <h1 className="mb-8 font-display text-[clamp(3rem,8vw,6rem)] uppercase leading-[0.85]">Checkout</h1>
      {notice && <p role="status" className="mb-6 border-l-4 border-accent-blue bg-paper px-4 py-3 text-sm">{notice}</p>}
      <form ref={formRef} onSubmit={submit} className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-10">
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-4 font-display text-3xl uppercase">1. Contact</legend>
            <div className="field"><label htmlFor="email">Email (for your receipt)</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
            <label className="flex items-center gap-2 text-sm"><input id="marketing" name="marketing" type="checkbox" className="size-4 accent-[var(--ink)]" /> Email me about new drops</label>
          </fieldset>
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-4 font-display text-3xl uppercase">2. Delivery address</legend>
            <div className="field"><label htmlFor="firstName">First name</label><input id="firstName" name="firstName" required autoComplete="given-name" /></div>
            <div className="field"><label htmlFor="lastName">Last name</label><input id="lastName" name="lastName" required autoComplete="family-name" /></div>
            <div className="field sm:col-span-2"><label htmlFor="address1">Address</label><input id="address1" name="address1" required autoComplete="address-line1" /></div>
            <div className="field sm:col-span-2"><label htmlFor="address2">Apartment, suite, landmark (optional)</label><input id="address2" name="address2" autoComplete="address-line2" /></div>
            <div className="field"><label htmlFor="city">City</label><input id="city" name="city" required autoComplete="address-level2" /></div>
            <div className="field"><label htmlFor="state">State</label>
              <select id="state" name="state" required value={state} onChange={(e) => { setState(e.target.value); setZoneId(null); }} autoComplete="address-level1">{NIGERIAN_STATES.map((st) => <option key={st}>{st}</option>)}</select>
            </div>
            <div className="field"><label htmlFor="postcode">Postal code (optional)</label><input id="postcode" name="postcode" autoComplete="postal-code" /></div>
            <div className="field"><label htmlFor="country">Country</label><select id="country" name="country" defaultValue="Nigeria" autoComplete="country-name"><option>Nigeria</option></select></div>
            <div className="field sm:col-span-2"><label htmlFor="phone">Phone number (for the rider)</label><input id="phone" name="phone" type="tel" required placeholder="0803 000 0000" autoComplete="tel" /></div>
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-4 font-display text-3xl uppercase">3. Delivery method</legend>
            {options.length === 0 && <p className="text-sm text-accent-red">We don&apos;t deliver to {state} yet. <a className="underline" href={wa(`Hi ${settings.name}, do you deliver to ${state}?`)} target="_blank" rel="noopener noreferrer">Ask on WhatsApp</a></p>}
            {options.map((z) => {
              const price = deliveryFee(z, subtotal - discount, settings.freeDeliveryOver);
              return (
                <label key={z.id} htmlFor={`zone-${z.id}`} className={`flex cursor-pointer items-center justify-between gap-4 border-[1.5px] px-4 py-4 ${zone?.id === z.id ? "border-foreground bg-paper" : "border-foreground/20"}`}>
                  <span className="flex items-center gap-3">
                    <input id={`zone-${z.id}`} type="radio" name="zone" value={z.id} checked={zone?.id === z.id} onChange={() => setZoneId(z.id)} className="size-4 accent-[var(--ink)]" />
                    <span><span className="block font-semibold">{z.name}</span><span className="text-[13px] text-muted-foreground">{z.eta}{z.instructions ? ` · ${z.instructions}` : ""}</span></span>
                  </span>
                  <span className="price text-sm">{price === 0 ? "Free" : formatPrice(price)}</span>
                </label>
              );
            })}
            {settings.deliveryInstructions && <p className="text-[13px] text-muted-foreground">{settings.deliveryInstructions}</p>}
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-4 font-display text-3xl uppercase">4. Payment</legend>
            <div className="flex items-start gap-3 border-[1.5px] border-foreground/20 bg-paper p-5 text-sm leading-relaxed">
              <ShieldIcon size={22} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Pay securely with Paystack</p>
                <p className="mt-1 text-muted-foreground">Card, bank transfer or USSD. You&apos;ll go to Paystack to pay, then come straight back here. We never see your card details.</p>
              </div>
            </div>
          </fieldset>
        </div>

        <aside className="flex flex-col gap-5 self-start bg-paper p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-3xl uppercase">Order summary</h2>
          <ul className="flex flex-col gap-4">
            {items.map((i) => (
              <li key={`${i.slug}-${i.size}-${i.colour ?? ""}`} className="flex items-center gap-3">
                <div className="relative w-16 shrink-0 bg-studio" style={{ aspectRatio: "4 / 5" }}>
                  <Image src={i.product.frontTight} alt="" fill sizes="64px" className="object-contain p-1" />
                  <span className="absolute -right-2 -top-2 grid size-5 place-items-center bg-ink font-mono text-[10px] text-paper">{i.qty}</span>
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold uppercase">{i.product.name}</p><p className="text-muted-foreground">{i.colour || i.product.colour} · {i.size}</p>
                  {i.qty > i.available && <p className="text-[12px] font-semibold text-accent-red">{i.available === 0 ? "Sold out" : `Only ${i.available} left`}</p>}
                </div>
                <span className="price text-sm">{formatPrice(i.total)}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <label htmlFor="discount" className="text-[11px] font-bold uppercase tracking-[0.16em]">Discount code</label>
            <div className="flex gap-2">
              <input id="discount" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="CODE" className="min-w-0 flex-1 border-[1.5px] border-foreground/20 bg-background px-3 py-2.5 font-mono text-sm uppercase outline-none focus:border-foreground" />
              <button type="button" onClick={() => { setCodeError(null); setApplied(code.trim()); }} disabled={!code.trim()} className="btn-ghost px-4 disabled:opacity-50">Apply</button>
            </div>
            {codeError && <p role="alert" className="text-[13px] font-semibold text-accent-red">{codeError}</p>}
            {quote?.discount && <p className="text-[13px] font-semibold text-accent-blue">{quote.discount.code} applied. <button type="button" className="underline" onClick={() => { setApplied(""); setCode(""); setQuote(null); }}>Remove</button></p>}
          </div>
          <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="price">{formatPrice(quote?.subtotal ?? subtotal)}</dd></div>
            {discount > 0 && <div className="flex justify-between text-accent-blue"><dt>Discount</dt><dd className="price">−{formatPrice(discount)}</dd></div>}
            <div className="flex justify-between"><dt>Delivery</dt><dd className="price">{fee === 0 ? "Free" : formatPrice(fee)}</dd></div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold"><dt className="uppercase tracking-[0.1em]">Total</dt><dd className="price" data-testid="checkout-total">{formatPrice(total)}</dd></div>
          </dl>
          {error && (
            <div role="alert" className="border-l-4 border-accent-red bg-background px-4 py-3 text-sm">
              <p className="font-semibold">{error}</p>
              <a href={wa(`Hi ${settings.name}, I had trouble paying on the website.`)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block underline underline-offset-4">Order on WhatsApp instead</a>
            </div>
          )}
          <button type="submit" disabled={busy || unavailable || !zone} className="btn w-full py-4 disabled:opacity-60">{busy ? "Opening Paystack…" : unavailable ? "Update your bag to continue" : `Pay ${formatPrice(total)}`}</button>
          <p className="text-[12px] leading-relaxed text-muted-foreground">By paying you agree to our <Link href="/terms" className="underline underline-offset-2">Terms of Sale</Link> and <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.</p>
          <Link href="/cart" className="text-center text-[12px] uppercase tracking-[0.14em] underline underline-offset-4 hover:text-accent-blue">Back to bag</Link>
        </aside>
      </form>
    </div>
  );
}
