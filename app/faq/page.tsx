import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { site } from "@/lib/site";
import { PlusIcon } from "@/components/icons";

export const metadata: Metadata = { title: "FAQ" };

const faqs = [
  ["How do MAVERICK tees fit?", <>Oversized and boxy, with dropped shoulders. Take your usual size for the intended fit. See the <Link className="underline" href="/size-guide">size guide</Link> for measurements.</>],
  ["Will the print crack or fade?", <>Wash inside out on cold and don&apos;t tumble dry. The print will last much longer that way.</>],
  ["When is the next drop?", <>Join the list at the bottom of any page and you&apos;ll hear about Drop 02 first.</>],
  ["Can I return or exchange?", <>Yes, within {site.returnsDays} days, unworn with tags on. The details are on <Link className="underline" href="/shipping-returns">Shipping &amp; returns</Link>.</>],
  ["Do you restock?", <>Some pieces come back, some don&apos;t. If you want a piece, don&apos;t wait.</>],
] as const;

export default function Faq() {
  return (
    <div className="mx-auto max-w-7xl gutter pb-24 pt-10">
      <PageHeader eyebrow="FAQ" title="Questions" />
      <div className="max-w-3xl border-t border-border">
        {faqs.map(([q, a]) => (
          <details key={q} className="group border-b border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold [&::-webkit-details-marker]:hidden">{q}<PlusIcon size={20} className="shrink-0 transition-transform group-open:rotate-45" /></summary>
            <p className="pb-6 leading-relaxed text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
