import { Suspense } from "react";
import type { Metadata } from "next";
import { LogoMark } from "@/components/icons";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default function LoginPage(props: PageProps<"/admin/login">) {
  return (
    <main className="grid min-h-screen bg-ink text-paper lg:grid-cols-[1fr_1fr]">
      <div className="hidden flex-col justify-between p-12 lg:flex">
        <div className="flex items-center gap-3"><LogoMark size={34} /><span className="font-display text-3xl uppercase">Maverick</span></div>
        <p className="font-display text-[clamp(4rem,8vw,7rem)] uppercase leading-[0.85]">Store<br />admin.</p>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-paper/50">DIFFERENT BY CHOICE.</p>
      </div>
      <div className="flex items-center justify-center bg-background px-6 py-16 text-foreground">
        <Suspense fallback={null}><LoginForm searchParams={props.searchParams} /></Suspense>
      </div>
    </main>
  );
}

async function LoginForm({ searchParams }: { searchParams: PageProps<"/admin/login">["searchParams"] }) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  return (
    <form method="post" action="/api/admin/login" className="flex w-full max-w-sm flex-col gap-4">
      <div className="mb-2 flex items-center gap-2 lg:hidden"><LogoMark size={26} /><span className="font-display text-2xl uppercase">Maverick</span></div>
      <h1 className="font-display text-5xl uppercase leading-none">Sign in</h1>
      <p className="text-sm text-muted-foreground">Staff only. Every change you make is logged with your name.</p>
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="username" autoFocus defaultValue={typeof sp.email === "string" ? sp.email : ""} /></div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" /></div>
      {error && <p role="alert" className="border-l-4 border-accent-red bg-paper px-3 py-2 text-sm font-semibold">{error}</p>}
      {ok && <p role="status" className="border-l-4 border-accent-blue bg-paper px-3 py-2 text-sm">{ok}</p>}
      <button type="submit" className="btn mt-2">Sign in</button>
    </form>
  );
}
