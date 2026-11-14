import Link from "next/link";
import { LogoMark } from "./icons";

/** Shown for a moment in place of the header on pages that weren't pre-built (e.g. a product added after deploy). */
export function HeaderFallback() {
  return (
    <>
      <div className="h-[31px] bg-ink" />
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gutter py-2">
          <Link href="/" aria-label="MAVERICK home" className="flex h-10 items-center gap-2.5"><LogoMark size={30} /><span className="font-display text-[26px] uppercase leading-none tracking-wide">Maverick</span></Link>
        </div>
      </header>
    </>
  );
}
