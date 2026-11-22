"use client";

import * as React from "react";
import type { Product } from "@/lib/catalog";
import { ChevronDownIcon, WhatsAppIcon } from "./icons";
import { useSettings, useWhatsApp } from "./store-provider";
import { PushNotifications } from "./push-notifications";

export function inquiryWhatsAppText(o: { store: string; name: string; colour: string; url: string; size?: string | null; question?: string }) {
  return [`Hi ${o.store}, I have a question about the ${o.name}.`, `Product: ${o.url}`, o.size ? `Size: ${o.size}` : "", o.colour ? `Colour: ${o.colour}` : "", o.question?.trim() ? `Question: ${o.question.trim()}` : ""].filter(Boolean).join("\n");
}

type ChatKey = { id: number; token: string };
type ChatMessage = { id: number; sender: "customer" | "admin"; author: string; body: string; createdAt: string };

export function ProductInquiry({ product, size, colour }: { product: Product; size: string | null; colour: string }) {
  const settings = useSettings(), wa = useWhatsApp();
  const storageKey = `maverick-chat:${product.slug}`;
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"chat" | "whatsapp">("chat");
  const [key, setKey] = React.useState<ChatKey | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [draft, setDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const sectionRef = React.useRef<HTMLElement>(null);
  const url = typeof window === "undefined" ? `/products/${product.slug}` : `${window.location.origin}/products/${product.slug}`;
  const waHref = wa(inquiryWhatsAppText({ store: settings.name, name: product.name, colour, url, size, question: draft }));

  const load = React.useCallback(async (chat: ChatKey, quiet = false) => {
    try {
      const res = await fetch(`/api/inquiries/${chat.id}`, { headers: { "x-chat-token": chat.token }, cache: "no-store" });
      if (!res.ok) throw new Error("This conversation is no longer available on this device.");
      const data = await res.json() as { messages: ChatMessage[] };
      setMessages(data.messages); if (!quiet) setError(null);
    } catch (e) { if (!quiet) setError(e instanceof Error ? e.message : "Couldn't load the conversation."); }
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      try { const saved = JSON.parse(localStorage.getItem(storageKey) || "null") as ChatKey | null; if (saved?.id && saved.token) { setKey(saved); void load(saved); } }
      catch { localStorage.removeItem(storageKey); }
    }, 0);
    return () => clearTimeout(timer);
  }, [load, storageKey]);
  React.useEffect(() => { if (!key || !open || mode !== "chat") return; const timer = window.setInterval(() => void load(key, true), 12000); return () => clearInterval(timer); }, [key, load, mode, open]);
  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages.length]);

  const start = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setBusy(true); setError(null);
    const body = { ...Object.fromEntries(new FormData(e.currentTarget)), product: product.slug, size: size ?? "", colour };
    try {
      const res = await fetch("/api/inquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json() as { id?: number; token?: string; error?: string };
      if (!res.ok || !data.id || !data.token) throw new Error(data.error || "We couldn't start the chat.");
      const next = { id: data.id, token: data.token }; localStorage.setItem(storageKey, JSON.stringify(next)); setKey(next); await load(next);
    } catch (e) { setError(e instanceof Error ? e.message : "We couldn't start the chat."); }
    finally { setBusy(false); }
  };
  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!key || !draft.trim() || busy) return; setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/inquiries/${key.id}`, { method: "POST", headers: { "Content-Type": "application/json", "x-chat-token": key.token }, body: JSON.stringify({ message: draft }) });
      const data = await res.json().catch(() => ({})) as { error?: string }; if (!res.ok) throw new Error(data.error || "We couldn't send that message.");
      setDraft(""); await load(key);
    } catch (e) { setError(e instanceof Error ? e.message : "We couldn't send that message."); }
    finally { setBusy(false); }
  };

  const reveal = () => { setMode("chat"); setOpen(true); window.setTimeout(() => sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); };

  return <section ref={sectionRef} className="min-w-0 scroll-mt-24 border-t border-border pt-3 [&_.field]:min-w-0 [&_input]:min-w-0 [&_textarea]:min-w-0">
    <button type="button" onClick={reveal} aria-label="Open MAVERICK product chat" className={`${open ? "hidden" : "fixed"} bottom-[max(16px,calc(env(safe-area-inset-bottom,0px)+16px))] left-[max(16px,calc(env(safe-area-inset-left,0px)+16px))] z-50 bg-accent-blue px-4 py-3 text-[12px] font-bold uppercase tracking-[0.16em] text-paper shadow-[0_8px_24px_rgb(0_0_0/0.28)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}>Ask Maverick <span aria-hidden="true">→</span></button>
    <button type="button" aria-expanded={open} aria-controls="ask-panel" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between py-1 text-[12px] font-semibold uppercase tracking-[0.16em] hover:text-accent-blue">
      Chat about this product <ChevronDownIcon size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div id="ask-panel" className="mt-3 flex min-w-0 flex-col gap-3 pb-14 animate-in fade-in duration-200 sm:pb-0">
      <div className="border-y-2 border-foreground py-3"><h2 className="font-display text-3xl uppercase leading-none">Ask Maverick</h2><p className="mt-1 text-[12px] text-muted-foreground">Chat directly with the store owner. Usually replies within a day.</p></div>
      <div role="tablist" aria-label="Contact method" className="grid grid-cols-2 gap-1 bg-paper p-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
        <button type="button" role="tab" aria-selected={mode === "chat"} onClick={() => setMode("chat")} className={`min-w-0 py-2.5 ${mode === "chat" ? "bg-foreground text-background" : "hover:bg-foreground/5"}`}>Website chat</button>
        <button type="button" role="tab" aria-selected={mode === "whatsapp"} onClick={() => setMode("whatsapp")} className={`min-w-0 py-2.5 ${mode === "whatsapp" ? "bg-foreground text-background" : "hover:bg-foreground/5"}`}>WhatsApp</button>
      </div>
      <p className="text-[12px] text-muted-foreground">About: <span className="text-foreground">{product.name}, {colour}{size ? `, size ${size}` : ""}</span></p>
      {mode === "whatsapp" ? <div className="flex flex-col gap-3"><div className="field"><label htmlFor="ask-wa-q">Your question</label><textarea id="ask-wa-q" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="How does this fit?" /></div><a href={waHref} target="_blank" rel="noopener noreferrer" data-testid="ask-whatsapp" className="btn w-full bg-[#25D366] text-ink hover:bg-[#1fb957]"><WhatsAppIcon size={18} /> Ask on WhatsApp</a></div>
      : key ? <div className="flex flex-col gap-3">
        <div className="max-h-[360px] min-h-40 space-y-2 overflow-y-auto border border-border bg-paper p-3" aria-live="polite">{messages.map((m) => <div key={m.id} className={`max-w-[90%] px-3 py-2 text-sm ${m.sender === "admin" ? "mr-auto border-l-4 border-accent-red bg-background" : "ml-auto bg-accent-blue text-paper"}`}><p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] opacity-70">{m.sender === "admin" ? "Maverick · Owner" : "You"}</p><p className="whitespace-pre-wrap leading-relaxed">{m.body}</p><time className="mt-1 block text-[9px] opacity-60">{new Date(m.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</time></div>)}<div ref={endRef} /></div>
        <form onSubmit={send} className="flex flex-col gap-2"><label htmlFor="chat-message" className="sr-only">Type your message</label><textarea id="chat-message" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={3000} required placeholder="Type your message" />{error && <p role="alert" className="border-l-4 border-accent-red bg-paper px-3 py-2 text-sm">{error}</p>}<button className="btn" disabled={busy || !draft.trim()}>{busy ? "Sending…" : "Send message"}</button></form>
        <PushNotifications audience="customer" inquiryId={key.id} token={key.token} compact />
      </div> : <form onSubmit={start} className="grid gap-3 sm:grid-cols-2">
        <div className="field"><label htmlFor="chat-name">Name</label><input id="chat-name" name="name" required autoComplete="name" /></div><div className="field"><label htmlFor="chat-email">Email</label><input id="chat-email" name="email" type="email" required autoComplete="email" /></div>
        <div className="field sm:col-span-2"><label htmlFor="chat-phone">Phone (optional)</label><input id="chat-phone" name="phone" type="tel" autoComplete="tel" /></div><div className="field sm:col-span-2"><label htmlFor="chat-first">Your question</label><textarea id="chat-first" name="message" rows={4} required minLength={3} placeholder="Ask about sizing, fit, fabric or delivery" /></div>
        <div aria-hidden="true" className="absolute -left-[9999px]"><label htmlFor="chat-company">Company</label><input id="chat-company" name="company" tabIndex={-1} autoComplete="off" /></div>{error && <p role="alert" className="border-l-4 border-accent-red bg-paper px-3 py-2 text-sm sm:col-span-2">{error}</p>}<button className="btn sm:col-span-2" disabled={busy}>{busy ? "Starting chat…" : "Start chat"}</button><p className="text-[11px] text-muted-foreground sm:col-span-2">Your details are private and used only to reply about MAVERICK products. This device remembers your conversation.</p>
      </form>}
    </div>}
  </section>;
}
