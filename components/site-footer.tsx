"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, TikTokIcon, WhatsAppIcon } from "./icons";
import { site, whatsappLink } from "@/lib/site";

const columns = [
  { title: "Shop", links: [["Shop All", "/collections/all"], ["New In", "/collections/new"], ["Tees", "/collections/tees"], ["Ringers", "/collections/ringers"], ["Long Sleeves", "/collections/long-sleeves"]] },
  { title: "Help", links: [["Size Guide", "/size-guide"], ["Shipping & Returns", "/shipping-returns"], ["FAQ", "/faq"], ["Contact", "/contact"]] },
  { title: "Maverick", links: [["About", "/about"], ["Lookbook", "/lookbook"]] },
];

export function Socials({ className = "" }: { className?: string }) {
  const item = "flex items-center gap-3 border border-current/25 px-4 py-3 transition-colors hover:border-current hover:text-accent-blue focus-visible:outline-2 focus-visible:outline-ring";
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      <li>
        <a href={site.socials.tiktok.url} target="_blank" rel="noopener noreferrer" className={item}>
          <TikTokIcon size={20} />
          <span className="flex flex-col leading-tight"><span className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-60">TikTok</span><span className="text-sm font-semibold">{site.socials.tiktok.handle}</span></span>
        </a>
      </li>
      <li>
        <a href={whatsappLink("Hi MAVERICK!")} target="_blank" rel="noopener noreferrer" className={item}>
          <WhatsAppIcon size={20} />
          <span className="flex flex-col leading-tight"><span className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-60">WhatsApp</span><span className="text-sm font-semibold tabular-nums">{site.socials.whatsapp.display}</span></span>
        </a>
      </li>
    </ul>
  );
}

export function SiteFooter() {
  const [done, setDone] = React.useState(false);
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto grid max-w-7xl gap-12 gutter py-16 lg:grid-cols-[1.3fr_2fr]">
        <div className="flex flex-col gap-5">
          <p className="font-display text-5xl uppercase leading-[0.9]">Get Drop 02<br />first.</p>
          <p className="max-w-[44ch] text-sm text-paper/70">Join the list for early access to new drops. No spam.</p>
          {done ? (
            <p className="font-mono text-sm uppercase tracking-[0.16em] text-accent-blue" role="status">You&apos;re on the list.</p>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setDone(true); }} className="flex max-w-md gap-2">
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <input id="newsletter-email" type="email" required placeholder="Email address" className="min-w-0 flex-1 border border-paper/30 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-paper/40 focus:border-paper" />
              <button type="submit" className="btn-light" aria-label="Join the list"><ArrowRightIcon size={18} /></button>
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
            <span>{site.slogan}</span>
            <span>© 2026 Maverick</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
