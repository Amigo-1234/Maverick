"use client";

import * as React from "react";
import type { Product } from "@/lib/catalog";
import { ChevronDownIcon, WhatsAppIcon } from "./icons";
import { useSettings, useWhatsApp } from "./store-provider";

/** Builds the prefilled WhatsApp message for a product question. Exported for tests. */
export function inquiryWhatsAppText(o: { store: string; name: string; colour: string; url: string; size?: string | null; question?: string }) {
  return [
    `Hi ${o.store}, I have a question about the ${o.name}.`,
    `Product: ${o.url}`,
    o.size ? `Size: ${o.size}` : "",
    o.colour ? `Colour: ${o.colour}` : "",
    o.question?.trim() ? `Question: ${o.question.trim()}` : "",
  ].filter(Boolean).join("\n");
}

export function ProductInquiry({ product, size, colour }: { product: Product; size: string | null; colour: string }) {
  const settings = useSettings();
  const wa = useWhatsApp();
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"whatsapp" | "form">("whatsapp");
  const [question, setQuestion] = React.useState("");
  const [state, setState] = React.useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [url, setUrl] = React.useState(`/products/${product.slug}`);
  React.useEffect(() => { setUrl(`${window.location.origin}/products/${product.slug}`); }, [product.slug]);

  const waHref = wa(inquiryWhatsAppText({ store: settings.name, name: product.name, colour, url, size, question }));

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state === "sending") return; // no double submits
    setError(null); setState("sending");
    const body = { ...Object.fromEntries(new FormData(e.currentTarget)), product: product.slug, size: size ?? "", colour };
    try {
      const res = await fetch("/api/inquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "We couldn't send that. Please try WhatsApp.");
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't send that.");
      setState("idle");
    }
  };

  return (
    <div className="border-t border-border pt-3">
      <button type="button" aria-expanded={open} aria-controls="ask-panel" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between py-1 text-[12px] font-semibold uppercase tracking-[0.16em] hover:text-accent-blue">
        Ask about this product
        <ChevronDownIcon size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id="ask-panel" className="mt-3 flex flex-col gap-3 animate-in fade-in duration-200">
          <div role="tablist" aria-label="How would you like to ask?" className="grid grid-cols-2 gap-1 bg-paper p-1 text-[12px] font-semibold uppercase tracking-[0.12em]">
            {([["whatsapp", "WhatsApp"], ["form", "Send an inquiry"]] as const).map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)} className={`py-2.5 ${mode === k ? "bg-foreground text-background" : "hover:bg-foreground/5"}`}>{label}</button>
            ))}
          </div>
          <p className="text-[13px] text-muted-foreground">About: <span className="text-foreground">{product.name}, {colour}{size ? `, size ${size}` : ""}</span>{!size && " (pick a size above to include it)"}</p>

          {mode === "whatsapp" ? (
            <div className="flex flex-col gap-3">
              <div className="field"><label htmlFor="ask-wa-q">Your question (optional)</label><textarea id="ask-wa-q" rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. How does XL fit on someone 6ft?" /></div>
              <a href={waHref} target="_blank" rel="noopener noreferrer" data-testid="ask-whatsapp" className="btn w-full bg-[#25D366] text-ink hover:bg-[#1fb957] hover:text-ink"><WhatsAppIcon size={18} /> Ask on WhatsApp</a>
              <p className="text-[12px] text-muted-foreground">Opens WhatsApp with the product details filled in. We usually reply fastest here.</p>
            </div>
          ) : state === "sent" ? (
            <p role="status" className="border-l-4 border-accent-blue bg-paper px-4 py-3 text-sm"><span className="font-semibold">Question sent.</span> We&apos;ll reply by email{settings.email ? "" : ""}, usually within a day.</p>
          ) : (
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
              <div className="field"><label htmlFor="ask-name">Name</label><input id="ask-name" name="name" required autoComplete="name" /></div>
              <div className="field"><label htmlFor="ask-email">Email</label><input id="ask-email" name="email" type="email" required autoComplete="email" /></div>
              <div className="field sm:col-span-2"><label htmlFor="ask-phone">Phone (optional)</label><input id="ask-phone" name="phone" type="tel" autoComplete="tel" /></div>
              <div className="field sm:col-span-2"><label htmlFor="ask-msg">Your question</label><textarea id="ask-msg" name="message" rows={4} required minLength={3} /></div>
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden"><label htmlFor="ask-company">Company</label><input id="ask-company" name="company" tabIndex={-1} autoComplete="off" /></div>
              {error && <p role="alert" className="border-l-4 border-accent-red bg-paper px-4 py-3 text-sm sm:col-span-2">{error}</p>}
              <button type="submit" disabled={state === "sending"} className="btn sm:col-span-2 disabled:opacity-60">{state === "sending" ? "Sending…" : "Send question"}</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
