import Link from "next/link";

export function PageHeader({ eyebrow, title, intro }: { eyebrow?: string; title: string; intro?: string }) {
  return (
    <header className="mb-10 flex flex-col gap-4">
      <nav aria-label="Breadcrumb" className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link> / <span className="text-foreground">{eyebrow ?? title}</span>
      </nav>
      <h1 className="font-display text-[clamp(3.5rem,10vw,8rem)] uppercase leading-[0.85]">{title}</h1>
      {intro && <p className="max-w-[60ch] text-muted-foreground">{intro}</p>}
    </header>
  );
}
