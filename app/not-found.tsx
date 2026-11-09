import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 gutter py-24">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">404</p>
      <h1 className="font-display text-[clamp(4rem,14vw,10rem)] uppercase leading-[0.82]">Off the rail.</h1>
      <p className="max-w-[48ch] text-muted-foreground">This page doesn&apos;t exist. Maybe it took a different path.</p>
      <Link href="/collections/all" className="btn">Shop all</Link>
    </div>
  );
}
