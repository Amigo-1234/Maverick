import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { products } from "@/lib/catalog";
import { PageHeader } from "@/components/page-header";
import { ArrowRightIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Lookbook", description: "MAVERICK Drop 01 lookbook." };

export default function Lookbook() {
  const looks = products.flatMap((p) => p.photos.map((ph) => ({ ...ph, product: p })));
  return (
    <div className="mx-auto max-w-7xl gutter pb-24 pt-10">
      <PageHeader title="Lookbook" intro="Drop 01, front and back. Tap any look to shop it." />
      <ul className="columns-2 gap-3 md:columns-3 [&>li]:mb-3">
        {looks.map((l) => (
          <li key={l.src} className="break-inside-avoid">
            <Link href={`/products/${l.product.slug}`} className="group relative block overflow-hidden bg-card">
              <Image src={l.src} alt={l.alt} width={960} height={1280} sizes="(min-width: 768px) 33vw, 50vw" className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />
              <span className="absolute inset-x-2 bottom-2 flex items-center justify-between bg-paper/95 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <span>{l.product.name} — {l.product.colour}</span><ArrowRightIcon size={16} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
