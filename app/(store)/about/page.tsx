import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "About", description: "MAVERICK. DIFFERENT BY CHOICE." };

export default function About() {
  return (
    <div className="mx-auto max-w-7xl gutter pb-24 pt-10">
      <PageHeader eyebrow="About" title="Different by choice." />
      <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
        <div className="prose-mv">
          <p className="text-lg text-foreground">MAVERICK is menswear for men who would rather stand out than fit in.</p>
          <p>A maverick doesn&apos;t follow the herd. He chooses his own line and stands by it. That choice is the whole idea behind the brand, and it&apos;s printed on almost everything we make: DIFFERENT BY CHOICE.</p>
          <h2>What we make</h2>
          <p>Oversized graphic tees, ringers and long sleeves. Heavy lettering inspired by metal and rock, the horned M, lightning, stars and eyes. Big on the front, bigger on the back, with hits on the sleeves and cuffs.</p>
          <h2>The colours</h2>
          <p>Black and white at the core. Electric blue, yellow and red arrive drop by drop, never all at once.</p>
          <Link href="/collections/all" className="btn mt-4 self-start">Shop Drop 01</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 self-start">
          {["/originals/reference_01.jpeg", "/originals/reference_06.jpeg", "/originals/reference_04.jpeg", "/originals/reference_07.jpeg"].map((src, i) => (
            <div key={src} className="overflow-hidden bg-card"><Image src={src} alt={`MAVERICK piece ${i + 1}`} width={960} height={1280} sizes="25vw" className="h-auto w-full" /></div>
          ))}
        </div>
      </div>
    </div>
  );
}
