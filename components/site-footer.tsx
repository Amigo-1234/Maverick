"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, InstagramIcon, SnapchatIcon, TikTokIcon, WhatsAppIcon } from "./icons";
import { handleFrom } from "@/lib/site";
import { useCatalog, useSettings, useWhatsApp } from "./store-provider";

const helpLinks = [["Track your order", "/track-order"], ["Size Guide", "/size-guide"], ["Shipping & Returns", "/shipping-returns"], ["FAQ", "/faq"], ["Contact", "/contact"], ["Terms of Sale", "/terms"], ["Privacy Policy", "/privacy"]];

export function Socials({ className = "" }: { className?: string }) {
  const s = useSettings();
  const wa = useWhatsApp();
  const item = "flex items-center gap-3 border border-current/25 px-4 py-3 transition-colors hover:border-current hover:text-accent-blue focus-visible:outline-2 focus-visible:outline-ring";
  const label = (kind: string, value: string) => <span className="flex flex-col leading-tight"><span className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-60">{kind}</span><span className="text-sm font-semibold">{value}</span></span>;
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {s.socials.tiktok && <li><a href={s.socials.tiktok} target="_blank" rel="noopener noreferrer" className={item}><TikTokIcon size={20} />{label("TikTok", handleFrom(s.socials.tiktok))}</a></li>}
      {s.socials.snapchat && <li><a href={s.socials.snapchat} target="_blank" rel="noopener noreferrer" className={item}><SnapchatIcon size={20} />{label("Snapchat", handleFrom(s.socials.snapchat))}</a></li>}
      {s.socials.instagram && <li><a href={s.socials.instagram} target="_blank" rel="noopener noreferrer" className={item}><InstagramIcon size={20} />{label("Instagram", handleFrom(s.socials.instagram))}</a></li>}
      {s.whatsapp && <li><a href={wa(`Hi ${s.name}!`)} target="_blank" rel="noopener noreferrer" className={item}><WhatsAppIcon size={20} />{label("WhatsApp", s.whatsappDisplay)}</a></li>}
    </ul>
  );
}

export function SiteFooter() {
  const settings = useSettings();
  const catalog = useCatalog();
  const columns = [
    { title: "Shop", links: catalog.collections.filter((c) => c.slugs.length).slice(0, 7).map((c) => [c.title, `/collections/${c.handle}`]) },
    { title: "Help", links: helpLinks },
    { title: settings.name, links: [["About", "/about"], ["Lookbook", "/lookbook"]] },
  ];
  const [done, setDone] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const join = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "We couldn't add you just now.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't add you just now.");
    } finally { setBusy(false); }
  };
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto grid max-w-7xl gap-12 gutter py-16 lg:grid-cols-[1.3fr_2fr]">
        <div className="flex flex-col gap-5">
          <p className="font-display text-5xl uppercase leading-[0.9]">Get Drop 02<br />first.</p>
          <p className="max-w-[44ch] text-sm text-paper/70">Join the list for early access to new drops. No spam.</p>
          {done ? (
            <p className="font-mono text-sm uppercase tracking-[0.16em] text-accent-blue" role="status">You&apos;re on the list.</p>
          ) : (
            <form onSubmit={join} className="flex max-w-md flex-col gap-2">
              <div className="flex gap-2">
                <label htmlFor="newsletter-email" className="sr-only">Email address</label>
                <input id="newsletter-email" name="email" type="email" required placeholder="Email address" className="min-w-0 flex-1 border border-paper/30 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-paper/40 focus:border-paper" />
                <input name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0" />
                <button type="submit" disabled={busy} className="btn-light disabled:opacity-60" aria-label="Join the list"><ArrowRightIcon size={18} /></button>
              </div>
              {error && <p role="alert" className="text-[13px] text-paper/80">{error}</p>}
            </form>
          )}
          <div className="mt-4 flex flex-col gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/50">Follow &amp; chat</p>
            <Socials />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {columns.map((c) => (
            <div key={c.title} className="flex flex-col gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/50">{c.title}</p>
              <ul className="flex flex-col gap-2 text-sm">
                {c.links.map(([label, href]) => <li key={href}><Link href={href} className="hover:text-accent-blue">{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-paper/15">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 gutter py-6">
          <div className="flex items-end gap-3 sm:gap-5">
            <Image src="/brand/maverick-m.jpg" alt="MAVERICK logo" width={1254} height={1254} className="-mb-[3%] w-[clamp(4.5rem,13vw,10rem)] mix-blend-lighten" />
            <p className="font-display text-[clamp(3.5rem,14vw,11rem)] uppercase leading-[0.8] tracking-tight">Maverick</p>
          </div>
          <div className="flex flex-col items-end gap-1 pb-20 font-mono text-[11px] uppercase tracking-[0.2em] text-paper/60">
            <span>{settings.slogan}</span>
            <span>© 2026 {settings.legal.businessName}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
