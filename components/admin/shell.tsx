"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloseIcon, LogoMark, MenuIcon } from "../icons";

type Counts = { inquiries: number; to_fulfil: number; low: number };

const NAV = [
  { href: "/admin", label: "Overview", code: "01" },
  { href: "/admin/orders", label: "Orders", code: "02", badge: "to_fulfil" as const },
  { href: "/admin/products", label: "Products", code: "03" },
  { href: "/admin/inventory", label: "Inventory", code: "04", badge: "low" as const },
  { href: "/admin/collections", label: "Collections", code: "05" },
  { href: "/admin/customers", label: "Customers", code: "06" },
  { href: "/admin/inquiries", label: "Inquiries", code: "07", badge: "inquiries" as const },
  { href: "/admin/discounts", label: "Discounts", code: "08" },
  { href: "/admin/delivery", label: "Delivery", code: "09" },
  { href: "/admin/settings", label: "Settings", code: "10" },
  { href: "/admin/activity", label: "Activity log", code: "11" },
];

export function AdminShell({ admin, counts, children }: { admin: { name: string; email: string; role: string }; counts: Counts | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => setOpen(false), [pathname]);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const nav = (
    <nav aria-label="Admin" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
      {NAV.map((n) => {
        const badge = n.badge && counts ? counts[n.badge] : 0;
        return (
          <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}
            className={`group flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold uppercase tracking-[0.1em] transition-colors ${active(n.href) ? "bg-paper text-ink" : "text-paper/70 hover:bg-paper/10 hover:text-paper"}`}>
            <span className={`font-mono text-[10px] ${active(n.href) ? "text-accent-blue" : "text-paper/35"}`}>{n.code}</span>
            <span className="flex-1">{n.label}</span>
            {badge > 0 && <span className={`min-w-5 px-1.5 py-0.5 text-center font-mono text-[10px] ${n.badge === "low" ? "bg-accent-red text-paper" : "bg-accent-blue text-paper"}`}>{badge}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="admin min-h-screen bg-background lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col bg-ink text-paper lg:flex">
        <Link href="/admin" className="flex items-center gap-2.5 border-b border-paper/10 px-6 py-5"><LogoMark size={26} /><span className="font-display text-xl uppercase tracking-wide">Maverick</span><span className="ml-auto font-mono text-[9px] uppercase tracking-[0.2em] text-paper/40">Store</span></Link>
        {nav}
        <AdminFoot admin={admin} />
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between bg-ink px-4 py-3 text-paper lg:hidden" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <Link href="/admin" className="flex items-center gap-2"><LogoMark size={22} /><span className="font-display text-lg uppercase">Maverick</span></Link>
        <button type="button" aria-expanded={open} aria-controls="admin-mobile-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)} className="grid size-10 place-items-center">{open ? <CloseIcon size={22} /> : <MenuIcon size={22} />}</button>
      </header>
      {open && (
        <div id="admin-mobile-nav" className="fixed inset-x-0 bottom-0 top-[60px] z-30 flex flex-col bg-ink text-paper lg:hidden">{nav}<AdminFoot admin={admin} /></div>
      )}

      <main id="main" className="min-w-0 px-[max(16px,env(safe-area-inset-left))] pb-24 pt-8 lg:px-10">{children}</main>
    </div>
  );
}

function AdminFoot({ admin }: { admin: { name: string; email: string; role: string } }) {
  return (
    <div className="flex flex-col gap-3 border-t border-paper/10 px-6 py-4 text-[12px]">
      <div className="min-w-0">
        <p className="truncate font-semibold">{admin.name}</p>
        <p className="truncate text-paper/50">{admin.email} · {admin.role}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Link href="/" target="_blank" className="uppercase tracking-[0.14em] text-paper/70 underline-offset-4 hover:text-paper hover:underline">View shop ↗</Link>
        <form method="post" action="/api/admin/logout"><button type="submit" className="uppercase tracking-[0.14em] text-paper/70 hover:text-paper">Sign out</button></form>
      </div>
    </div>
  );
}
