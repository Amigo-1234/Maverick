import Image from "next/image";
import Link from "next/link";
import { ClothingRailHero, type RailGarment } from "@/components/clothing-rail-hero";
import { ProductCard } from "@/components/product-card";
import { fullName, type Product } from "@/lib/catalog";
import { getStorefront } from "@/lib/server/store";
import { formatPrice } from "@/lib/site";
import { ArrowRightIcon } from "@/components/icons";

export default async function Home() {
  const { catalog } = await getStorefront();
  const { products } = catalog;
  // The rail shows up to 8 published pieces in the admin's sort order.
  const rail: RailGarment[] = products.slice(0, 8).map((p) => ({ id: p.slug, name: fullName(p), description: p.summary, image: p.front, backImage: p.back, sideImage: p.side, tag: formatPrice(p.price), details: [p.code, ...p.details.slice(0, 3)] }));
  // Lookbook marquee: every studio photo, alternating between products.
  const lookbook: { src: string; alt: string; product: Product }[] = [];
  for (let k = 0; k < 6; k++) for (const p of products) { const ph = p.photos[k]; if (ph) lookbook.push({ ...ph, product: p }); }
  const spotlight = products.find((p) => p.featured && p.backTight) ?? products.find((p) => p.backTight) ?? products[0];
  const twin = spotlight ? products.find((p) => p.name === spotlight.name && p.slug !== spotlight.slug) : undefined;
  const categories = catalog.categories.map((c) => ({ ...c, pieces: products.filter((p) => p.category === c.handle) })).filter((c) => c.pieces.length);
  return (
    <>
      <ClothingRailHero
        items={rail}
        eyebrow="Drop 01 / Menswear"
        heading="DIFFERENT BY CHOICE."
        caption="Hover or tap a piece to turn it. Open it to see the front and back."
        autoplay
        interval={2800}
        hanger="matte"
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/collections/all" className="btn">Shop the drop</Link>
            <Link href="/lookbook" className="btn-ghost">Lookbook</Link>
          </div>
        }
      />

      {/* Shop by category */}
      <section className="mx-auto max-w-7xl gutter py-16" aria-labelledby="cat-h">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 id="cat-h" className="font-display text-5xl uppercase leading-none md:text-6xl">Shop by cut</h2>
          <Link href="/collections/all" className="text-[12px] font-semibold uppercase tracking-[0.16em] underline underline-offset-4 hover:text-accent-blue">Shop all</Link>
        </div>
        <ul className="grid gap-4 md:grid-cols-3">
          {categories.slice(0, 3).map((c, i) => {
            const pieces = c.pieces;
            const hero = pieces[0];
            return (
              <li key={c.handle}>
                <Link href={`/collections/${c.handle}`} className="group cut relative flex aspect-[4/5] flex-col justify-between overflow-hidden bg-ink p-6 text-paper focus-visible:outline-2 focus-visible:outline-ring">
                  <div className="relative z-10 flex items-start justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/60">0{i + 1} / {pieces.length} {pieces.length === 1 ? "piece" : "pieces"}</span>
                    <ArrowRightIcon size={22} className="transition-transform group-hover:translate-x-1" />
                  </div>
                  {hero && <Image src={hero.frontTight} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-contain p-[12%] pt-[16%] transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none" />}
                  <div className="relative z-10">
                    <p className="font-display text-6xl uppercase leading-[0.85]">{c.title}</p>
                    <p className="mt-2 max-w-[30ch] text-sm text-paper/70">{c.blurb}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* New in */}
      <section className="mx-auto max-w-7xl gutter pb-20" aria-labelledby="new-h">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 id="new-h" className="font-display text-5xl uppercase leading-none md:text-6xl">New in</h2>
          <Link href="/collections/new" className="text-[12px] font-semibold uppercase tracking-[0.16em] underline underline-offset-4 hover:text-accent-blue">View all</Link>
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {products.filter((p) => p.isNew).slice(0, 4).map((p) => <li key={p.slug}><ProductCard product={p} /></li>)}
        </ul>
      </section>

      {/* Spotlight: front and back */}
      {spotlight && <section className="bg-ink text-paper" aria-labelledby="spot-h">
        <div className="mx-auto grid max-w-7xl items-center gap-10 gutter py-20 lg:grid-cols-[1.4fr_1fr]">
          <div className="grid grid-cols-2 gap-3">
            {[spotlight.frontTight, spotlight.backTight].filter((x): x is string => Boolean(x)).map((src, k) => (
              <div key={src} className="cut relative bg-[#1a1a1c]" style={{ aspectRatio: "4 / 5" }}>
                <Image src={src} alt={`${spotlight.name}, ${k ? "back" : "front"}`} fill sizes="(min-width: 1024px) 30vw, 50vw" className="object-contain p-[7%]" />
                <span className="absolute left-3 top-3 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/60">{k ? "Back" : "Front"}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent-blue">{spotlight.code} / Spotlight</p>
            <h2 id="spot-h" className="font-display text-6xl uppercase leading-[0.88] md:text-7xl">{spotlight.name}</h2>
            <p className="max-w-[46ch] text-paper/75">{spotlight.description}</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href={`/products/${spotlight.slug}`} className="btn-light">Shop the {spotlight.name} — {formatPrice(spotlight.price)}</Link>
              {twin && <Link href={`/products/${twin.slug}`} className="text-[12px] font-semibold uppercase tracking-[0.16em] underline underline-offset-4 hover:text-accent-blue">Also in {twin.colour.toLowerCase()}</Link>}
            </div>
          </div>
        </div>
      </section>}

      {/* Manifesto */}
      <section className="mx-auto max-w-7xl gutter py-20" aria-labelledby="mf-h">
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-end">
          <h2 id="mf-h" className="font-display text-[clamp(3.2rem,11vw,9rem)] uppercase leading-[0.86] tracking-tight">Different<br />by choice.</h2>
          <div className="flex max-w-[52ch] flex-col gap-4 text-[15px] leading-relaxed text-muted-foreground">
            <p className="text-foreground">MAVERICK is menswear for men who would rather stand out than fit in.</p>
            <p>Bold lettering, the horned M, lightning and stars. Black and white at the core, with blue, yellow and red for each drop. Printed big on the front, bigger on the back.</p>
            <Link href="/about" className="self-start text-[12px] font-semibold uppercase tracking-[0.16em] text-foreground underline underline-offset-4 hover:text-accent-blue">Our story</Link>
          </div>
        </div>
      </section>

      {/* Lookbook strip */}
      <section aria-labelledby="lb-h" className="pb-20">
        <div className="mx-auto mb-6 flex max-w-7xl items-end justify-between gap-4 gutter">
          <h2 id="lb-h" className="font-display text-5xl uppercase leading-none md:text-6xl">Lookbook</h2>
          <Link href="/lookbook" className="text-[12px] font-semibold uppercase tracking-[0.16em] underline underline-offset-4 hover:text-accent-blue">See all looks</Link>
        </div>
        <div className="marquee group overflow-hidden">
          <div className="marquee-track flex w-max">
            {[0, 1].map((copy) => (
              <ul key={copy} aria-hidden={copy === 1 || undefined} className="flex shrink-0 gap-3 pr-3">
                {lookbook.map(({ src, alt, product: p }) => (
                  <li key={src} className="w-[72vw] shrink-0 sm:w-[34vw] lg:w-[24vw]">
                    <Link href={`/products/${p.slug}`} tabIndex={copy === 1 ? -1 : undefined} className="group/look flex h-full flex-col bg-card focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring">
                      <div className="overflow-hidden">
                        <Image src={src} alt={copy === 1 ? "" : alt} width={960} height={1280} sizes="(min-width: 1024px) 24vw, 72vw" className="h-auto w-full transition-transform duration-500 group-hover/look:scale-[1.03] motion-reduce:transition-none" />
                      </div>
                      <div className="flex flex-1 flex-col gap-2 border-t border-border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{p.code} / {p.tag}</p>
                            <p className="font-display text-2xl uppercase leading-none">{p.name}</p>
                            <p className="mt-1 text-[13px] text-muted-foreground">{p.colour}</p>
                          </div>
                          <p className="price text-sm tabular-nums">{formatPrice(p.price)}</p>
                        </div>
                        <p className="line-clamp-2 text-[13px] leading-snug text-muted-foreground">{p.summary}</p>
                        <p className="mt-auto flex items-center justify-between border-t border-border pt-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
                          <span className="group-hover/look:text-accent-blue">Shop now</span>
                          <ArrowRightIcon size={16} className="transition-transform group-hover/look:translate-x-1" />
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
