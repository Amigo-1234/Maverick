"use client";

/**
 * MAVERICK navbar: the client's full-screen GSAP menu component, adapted to the store.
 * Mechanics kept from the original: Menu/Close text swap, rotating plus icon, overlay,
 * staggered backdrop layers, links rising into place, a hover shape per link, fade-in footer.
 */
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { useCart } from "./cart/cart-context";
import { BagIcon, LogoMark, SearchIcon, SnapchatIcon, TikTokIcon, WhatsAppIcon } from "./icons";
import { LOGO_PATH, LOGO_VIEWBOX } from "./logo-path";
import { COLLECTIONS, products } from "@/lib/catalog";
import { site, whatsappLink } from "@/lib/site";

if (typeof window !== "undefined") gsap.registerPlugin(CustomEase);

const count = (handle: string) => products.filter(COLLECTIONS[handle]!.filter).length;
const MENU = [
  { href: "/collections/all", label: "Shop All", note: `${count("all")} pieces` },
  { href: "/collections/new", label: "New In", note: `${count("new")} pieces` },
  { href: "/collections/tees", label: "Tees", note: `${count("tees")} pieces` },
  { href: "/collections/ringers", label: "Ringers", note: `${count("ringers")} pieces` },
  { href: "/collections/long-sleeves", label: "Long Sleeves", note: `${count("long-sleeves")} piece` },
  { href: "/lookbook", label: "Lookbook", note: "Drop 01" },
  { href: "/about", label: "About", note: "The brand" },
  { href: "/contact", label: "Contact", note: "WhatsApp" },
];

const iconBtn = "grid size-10 place-items-center hover:text-accent-blue focus-visible:outline-2 focus-visible:outline-ring";
const BLUE = "rgba(28,63,255,0.42)";
const PAPER = "rgba(247,246,243,0.09)";
const RED = "rgba(212,33,26,0.38)";

function starPoints(cx: number, cy: number, R: number, r = R * 0.42) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = (-90 + i * 36) * (Math.PI / 180);
    const rr = i % 2 ? r : R;
    return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

/** One background shape per menu link (index = data-shape). */
function Shapes() {
  return (
    <div className="ambient-background-shapes" aria-hidden="true">
      {/* 1 Shop All: the horned M */}
      <svg className="bg-shape bg-shape-1" viewBox={LOGO_VIEWBOX} preserveAspectRatio="xMidYMid meet">
        <path className="shape-element" d={LOGO_PATH} fill={PAPER} />
        <path className="shape-element" d={LOGO_PATH} fill="none" stroke={BLUE} strokeWidth="5" transform="translate(18 18)" />
      </svg>
      {/* 2 New In: lightning */}
      <svg className="bg-shape bg-shape-2" viewBox="0 0 400 400" fill="none">
        <polyline className="shape-element" points="250,10 170,170 240,170 140,390" stroke={BLUE} strokeWidth="26" strokeLinejoin="miter" />
        <polyline className="shape-element" points="110,40 60,140 105,140 40,260" stroke={PAPER} strokeWidth="16" strokeLinejoin="miter" />
        <polyline className="shape-element" points="360,160 320,240 350,240 300,340" stroke={PAPER} strokeWidth="12" strokeLinejoin="miter" />
      </svg>
      {/* 3 Tees: star field */}
      <svg className="bg-shape bg-shape-3" viewBox="0 0 400 400" fill="none">
        {[[60, 60], [180, 50], [310, 70], [110, 170], [240, 160], [350, 190], [60, 280], [180, 290], [300, 300], [120, 370], [250, 370]].map(([x, y], i) => (
          <polygon key={i} className="shape-element" points={starPoints(x!, y!, i === 4 ? 34 : 18)} fill={i === 4 ? BLUE : "none"} stroke={i === 4 ? "none" : PAPER} strokeWidth="3" />
        ))}
      </svg>
      {/* 4 Ringers: rings */}
      <svg className="bg-shape bg-shape-4" viewBox="0 0 400 400" fill="none">
        <circle className="shape-element" cx="250" cy="170" r="140" stroke={RED} strokeWidth="26" />
        <circle className="shape-element" cx="250" cy="170" r="90" stroke={PAPER} strokeWidth="14" />
        <circle className="shape-element" cx="90" cy="330" r="50" stroke={RED} strokeWidth="12" />
      </svg>
      {/* 5 Long Sleeves: blade lines */}
      <svg className="bg-shape bg-shape-5" viewBox="0 0 400 400" fill="none">
        <line className="shape-element" x1="0" y1="100" x2="300" y2="400" stroke={BLUE} strokeWidth="34" />
        <line className="shape-element" x1="100" y1="0" x2="400" y2="300" stroke={PAPER} strokeWidth="24" />
        <line className="shape-element" x1="200" y1="0" x2="400" y2="200" stroke={PAPER} strokeWidth="14" />
      </svg>
      {/* 6 Lookbook: frames */}
      <svg className="bg-shape bg-shape-6" viewBox="0 0 400 400" fill="none">
        <rect className="shape-element" x="60" y="40" width="150" height="200" stroke={PAPER} strokeWidth="10" />
        <rect className="shape-element" x="190" y="120" width="170" height="226" stroke={BLUE} strokeWidth="16" />
        <rect className="shape-element" x="30" y="270" width="110" height="110" fill={PAPER} />
      </svg>
      {/* 7 About: lone star */}
      <svg className="bg-shape bg-shape-7" viewBox="0 0 400 400" fill="none">
        <polygon className="shape-element" points={starPoints(230, 200, 170)} fill={RED} />
        <polygon className="shape-element" points={starPoints(230, 200, 120)} fill="none" stroke={PAPER} strokeWidth="8" />
      </svg>
      {/* 8 Contact: chat bubbles */}
      <svg className="bg-shape bg-shape-8" viewBox="0 0 400 400" fill="none">
        <path className="shape-element" d="M90 60h240v150H190l-60 50v-50H90z" stroke={BLUE} strokeWidth="18" strokeLinejoin="miter" />
        <path className="shape-element" d="M150 250h170v100h-40l-40 34v-34h-90z" fill={PAPER} />
      </svg>
    </div>
  );
}

export function SiteHeader() {
  const { count: bagCount, setOpen: openBag, ready } = useCart();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const ctxRef = React.useRef<gsap.Context | null>(null);
  const tlRef = React.useRef<gsap.core.Timeline | null>(null);
  const firstRun = React.useRef(true);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [search, setSearch] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => { setIsMenuOpen(false); setSearch(false); }, [pathname]);

  // Initial setup: ease, one GSAP context for the life of the header, hover shapes.
  React.useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    try {
      if (!gsap.parseEase("main")) CustomEase.create("main", "0.65, 0.01, 0.05, 0.99");
      gsap.defaults({ ease: "main", duration: 0.7 });
    } catch {
      gsap.defaults({ ease: "power2.out", duration: 0.7 });
    }
    const ctx = gsap.context(() => {}, root);
    ctxRef.current = ctx;

    const shapesContainer = root.querySelector(".ambient-background-shapes");
    const cleanups: (() => void)[] = [];
    root.querySelectorAll<HTMLElement>(".menu-list-item[data-shape]").forEach((item) => {
      const shape = shapesContainer?.querySelector(`.bg-shape-${item.dataset.shape}`);
      if (!shape) return;
      const els = shape.querySelectorAll(".shape-element");
      const onEnter = () => {
        shapesContainer?.querySelectorAll(".bg-shape").forEach((s) => s.classList.remove("active"));
        shape.classList.add("active");
        ctx.add(() => gsap.fromTo(els, { scale: 0.5, opacity: 0, rotation: -10, transformOrigin: "50% 50%" }, { scale: 1, opacity: 1, rotation: 0, duration: 0.6, stagger: 0.08, ease: "back.out(1.7)", overwrite: "auto" }));
      };
      const onLeave = () => {
        ctx.add(() => gsap.to(els, { scale: 0.8, opacity: 0, duration: 0.3, ease: "power2.in", overwrite: "auto", onComplete: () => shape.classList.remove("active") }));
      };
      item.addEventListener("mouseenter", onEnter);
      item.addEventListener("mouseleave", onLeave);
      item.addEventListener("focusin", onEnter);
      item.addEventListener("focusout", onLeave);
      cleanups.push(() => {
        item.removeEventListener("mouseenter", onEnter);
        item.removeEventListener("mouseleave", onLeave);
        item.removeEventListener("focusin", onEnter);
        item.removeEventListener("focusout", onLeave);
      });
    });
    return () => { cleanups.forEach((c) => c()); ctx.revert(); ctxRef.current = null; };
  }, []);

  // Open / close animation.
  React.useEffect(() => {
    const root = containerRef.current;
    const ctx = ctxRef.current;
    if (!root || !ctx) return;
    const initial = firstRun.current;
    firstRun.current = false;
    if (initial && !isMenuOpen) return;

    const navWrap = root.querySelector<HTMLElement>(".nav-overlay-wrapper");
    const menu = root.querySelector(".menu-content");
    const overlay = root.querySelector(".overlay");
    const bgPanels = root.querySelectorAll(".backdrop-layer");
    const menuLinks = root.querySelectorAll(".nav-link");
    const fadeTargets = root.querySelectorAll("[data-menu-fade]");
    const menuButtonTexts = buttonRef.current?.querySelectorAll("p");
    const menuButtonIcon = buttonRef.current?.querySelector(".menu-button-icon");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    tlRef.current?.kill();
    ctx.add(() => {
      const tl = gsap.timeline();
      tlRef.current = tl;
      if (isMenuOpen) {
        navWrap?.setAttribute("data-nav", "open");
        tl.set(navWrap, { display: "block" })
          .set(menu, { xPercent: 0 }, "<")
          .fromTo(menuButtonTexts ?? [], { yPercent: 0 }, { yPercent: -100, stagger: 0.2 })
          .fromTo(menuButtonIcon ?? [], { rotate: 0 }, { rotate: 315 }, "<")
          .fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1 }, "<")
          .fromTo(bgPanels, { xPercent: 101 }, { xPercent: 0, stagger: 0.12, duration: 0.575 }, "<")
          .fromTo(menuLinks, { yPercent: 140, rotate: 10 }, { yPercent: 0, rotate: 0, stagger: 0.05 }, "<+=0.35");
        if (fadeTargets.length) tl.fromTo(fadeTargets, { autoAlpha: 0, yPercent: 50 }, { autoAlpha: 1, yPercent: 0, stagger: 0.04, clearProps: "all" }, "<+=0.2");
      } else {
        navWrap?.setAttribute("data-nav", "closed");
        tl.to(overlay, { autoAlpha: 0 })
          .to(menu, { xPercent: 120 }, "<")
          .to(menuButtonTexts ?? [], { yPercent: 0 }, "<")
          .to(menuButtonIcon ?? [], { rotate: 0 }, "<")
          .set(navWrap, { display: "none" });
      }
      if (reduce) tl.progress(1);
    });

    if (isMenuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const id = requestAnimationFrame(() => root.querySelector<HTMLElement>(".nav-link")?.focus({ preventScroll: true }));
      return () => { cancelAnimationFrame(id); document.body.style.overflow = prev; };
    }
    buttonRef.current?.focus({ preventScroll: true });
  }, [isMenuOpen]);

  // Escape closes; Tab stays inside the open menu.
  React.useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setIsMenuOpen(false); return; }
      if (e.key !== "Tab") return;
      const root = containerRef.current;
      if (!root) return;
      const focusables = [buttonRef.current, ...root.querySelectorAll<HTMLElement>(".menu-content a")].filter(Boolean) as HTMLElement[];
      const first = focusables[0]!, last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMenuOpen]);

  const toggleMenu = () => setIsMenuOpen((o) => !o);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div ref={containerRef} className="contents">
      <div className="bg-ink text-paper">
        <p className="mx-auto max-w-7xl gutter py-2 text-center font-mono text-[11px] uppercase tracking-[0.24em]">
          {site.announcement} <span className="text-accent-blue">/</span> {site.slogan}
        </p>
      </div>

      <header className={`site-header sticky top-0 border-b border-border bg-background/90 backdrop-blur ${isMenuOpen ? "z-[57]" : "z-40"}`}>
        <nav aria-label="Primary" className="mx-auto flex max-w-7xl items-center justify-between gap-4 gutter py-2">
          <Link href="/" aria-label="MAVERICK home" className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-ring">
            <LogoMark size={30} />
            <span className="font-display text-[26px] uppercase leading-none tracking-wide">Maverick</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <button type="button" onClick={() => { setSearch((s) => !s); closeMenu(); }} aria-expanded={search} aria-label="Search" className={iconBtn}>
              <SearchIcon size={21} />
            </button>
            <button type="button" onClick={() => { closeMenu(); openBag(true); }} aria-label={`Open bag, ${ready ? bagCount : 0} items`} className={`${iconBtn} relative`}>
              <BagIcon size={22} />
              <span data-bag-count className="absolute right-0.5 top-0.5 grid h-[17px] min-w-[17px] place-items-center bg-foreground px-1 font-mono text-[10px] leading-none text-background tabular-nums">{ready ? bagCount : 0}</span>
            </button>
            <button ref={buttonRef} type="button" className="nav-close-btn" onClick={toggleMenu} aria-expanded={isMenuOpen} aria-controls="site-menu">
              <span className="sr-only">{isMenuOpen ? "Close menu" : "Open menu"}</span>
              <div className="menu-button-text" aria-hidden="true">
                <p className="p-large">Menu</p>
                <p className="p-large">Close</p>
              </div>
              <div className="icon-wrap" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 16 16" fill="none" className="menu-button-icon">
                  <path d="M7.33333 16L7.33333 -3.2055e-07L8.66667 -3.78832e-07L8.66667 16L7.33333 16Z" fill="currentColor" />
                  <path d="M16 8.66667L-2.62269e-07 8.66667L-3.78832e-07 7.33333L16 7.33333L16 8.66667Z" fill="currentColor" />
                  <path d="M6 7.33333L7.33333 7.33333L7.33333 6C7.33333 6.73637 6.73638 7.33333 6 7.33333Z" fill="currentColor" />
                  <path d="M10 7.33333L8.66667 7.33333L8.66667 6C8.66667 6.73638 9.26362 7.33333 10 7.33333Z" fill="currentColor" />
                  <path d="M6 8.66667L7.33333 8.66667L7.33333 10C7.33333 9.26362 6.73638 8.66667 6 8.66667Z" fill="currentColor" />
                  <path d="M10 8.66667L8.66667 8.66667L8.66667 10C8.66667 9.26362 9.26362 8.66667 10 8.66667Z" fill="currentColor" />
                </svg>
              </div>
            </button>
          </div>
        </nav>
        {search && (
          <form
            role="search"
            onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get("q"); router.push(`/search?q=${encodeURIComponent(String(q ?? ""))}`); }}
            className="border-t border-border"
          >
            <div className="mx-auto flex max-w-7xl items-center gap-3 gutter py-3">
              <SearchIcon size={22} className="shrink-0 text-muted-foreground" />
              <label htmlFor="site-search" className="sr-only">Search the store</label>
              <input id="site-search" name="q" autoFocus placeholder="Search tees, ringers, colours…" className="min-w-0 flex-1 bg-transparent py-2 font-display text-2xl uppercase outline-none placeholder:text-muted-foreground/60" />
              <button type="submit" className="btn">Search</button>
            </div>
          </form>
        )}
      </header>

      <section className="fullscreen-menu-container">
        <div data-nav="closed" className="nav-overlay-wrapper" inert={!isMenuOpen}>
          <div className="overlay" onClick={closeMenu} />
          <nav id="site-menu" aria-label="Site menu" className="menu-content">
            <div className="menu-bg">
              <div className="backdrop-layer first" />
              <div className="backdrop-layer second" />
              <div className="backdrop-layer" />
              <Shapes />
            </div>
            <div className="menu-content-wrapper">
              <ul className="menu-list">
                {MENU.map((m, i) => (
                  <li key={m.href} className="menu-list-item" data-shape={i + 1}>
                    <Link href={m.href} onClick={closeMenu} aria-current={pathname === m.href ? "page" : undefined} className="nav-link">
                      <span className="nav-link-index">{String(i + 1).padStart(2, "0")}</span>
                      <p className="nav-link-text">{m.label}</p>
                      <span className="nav-link-note">{m.note}</span>
                      <div className="nav-link-hover-bg" />
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="menu-footer">
                <a data-menu-fade href={site.socials.tiktok.url} target="_blank" rel="noopener noreferrer" className="menu-social"><TikTokIcon size={18} /> {site.socials.tiktok.handle}</a>
                <a data-menu-fade href={site.socials.snapchat.url} target="_blank" rel="noopener noreferrer" className="menu-social"><SnapchatIcon size={18} /> {site.socials.snapchat.handle}</a>
                <a data-menu-fade href={whatsappLink("Hi MAVERICK!")} target="_blank" rel="noopener noreferrer" className="menu-social"><WhatsAppIcon size={18} /> {site.socials.whatsapp.display}</a>
                <p data-menu-fade className="menu-slogan">{site.slogan}</p>
              </div>
            </div>
          </nav>
        </div>
      </section>
    </div>
  );
}
