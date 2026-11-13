"use client";

import * as React from "react";
import { whatsappLink } from "@/lib/site";

export function ContactForm() {
  const [state, setState] = React.useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = React.useState<string | null>(null);
  if (state === "sent") return <p role="status" className="font-display text-4xl uppercase">Message received. We&apos;ll be in touch.</p>;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null); setState("sending");
    const body = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "We couldn't send that.");
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't send that.");
      setState("idle");
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="field"><label htmlFor="c-name">Name</label><input id="c-name" name="name" required autoComplete="name" /></div>
      <div className="field"><label htmlFor="c-email">Email</label><input id="c-email" name="email" type="email" required autoComplete="email" /></div>
      <div className="field sm:col-span-2"><label htmlFor="c-order">Order number (optional)</label><input id="c-order" name="order" /></div>
      <div className="field sm:col-span-2"><label htmlFor="c-msg">Message</label><textarea id="c-msg" name="message" rows={6} required /></div>
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden"><label htmlFor="c-company">Company</label><input id="c-company" name="company" tabIndex={-1} autoComplete="off" /></div>
      {error && (
        <p role="alert" className="border-l-4 border-accent-red bg-paper px-4 py-3 text-sm sm:col-span-2">
          {error} <a className="underline underline-offset-4" href={whatsappLink("Hi MAVERICK!")} target="_blank" rel="noopener noreferrer">Open WhatsApp</a>
        </p>
      )}
      <button type="submit" disabled={state === "sending"} className="btn sm:col-span-2 sm:justify-self-start disabled:opacity-60">{state === "sending" ? "Sending…" : "Send message"}</button>
    </form>
  );
}
