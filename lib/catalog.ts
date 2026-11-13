/**
 * MAVERICK catalog. Every image comes from the client's own photos (MAVERICK_Design_References.zip).
 *
 * PLACEHOLDERS — confirm with the client before launch:
 *   - price            (naira; the client has not set prices yet, these are placeholders)
 *   - sizes            (assumed S–XXL, all in stock)
 *   - fabric / weight  (not stated anywhere yet, so not shown)
 */
export type Category = "tees" | "ringers" | "long-sleeves";

export interface Product {
  slug: string;
  code: string;
  name: string;
  colour: string;
  category: Category;
  price: number;
  sizes: string[];
  isNew: boolean;
  /** Transparent cut-outs on a 200x310 canvas (see scripts/cutouts.mjs). */
  front: string;
  back?: string;
  /** Side-on cut-out shown while the piece rests on the rail (same canvas and scale as front/back). */
  side?: string;
  /** The original studio photos, unedited. */
  photos: { src: string; alt: string }[];
  tag: string;
  summary: string;
  description: string;
  details: string[];
  /** Units in stock per size. Leave out to treat every size as in stock; set a size to 0 to mark it sold out. */
  stock?: Partial<Record<string, number>>;
}

export const SIZES = ["S", "M", "L", "XL", "XXL"];

export const CATEGORIES: { handle: Category; title: string; blurb: string }[] = [
  { handle: "tees", title: "Tees", blurb: "Oversized, boxy graphic tees. Big front prints, bigger back prints." },
  { handle: "ringers", title: "Ringers", blurb: "Black bodies with red ringer collars and cuffs." },
  { handle: "long-sleeves", title: "Long Sleeves", blurb: "Layered sleeves with slogan hits at the cuff." },
];

export const products: Product[] = [
  {
    slug: "strike-tee-black-blue",
    code: "MV-01",
    name: "Strike Tee",
    colour: "Black / Blue",
    category: "tees",
    price: 25000,
    sizes: SIZES,
    isNew: true,
    front: "/garments/strike-black-front.png",
    back: "/garments/strike-black-back.png",
    side: "/garments/strike-black-side.png",
    photos: [
      { src: "/originals/reference_04.jpeg", alt: "Strike Tee in black, front" },
      { src: "/originals/reference_02.jpeg", alt: "Strike Tee in black, back" },
      { src: "/originals/sides/strike-black-side-front.jpg", alt: "Strike Tee in black, side view from the front" },
      { src: "/originals/sides/strike-black-side-back.jpg", alt: "Strike Tee in black, side view from the back" },
    ],
    tag: "TEE",
    summary: "Drip-lettered MAVERICK on the front, the slogan stacked across the back.",
    description: "MAVERICK in electric-blue drip lettering with a white outline across the chest. On the back, DIFFERENT BY CHOICE. stacked large in the same treatment, with a distressed, hand-pulled finish.",
    details: ["Black body", "Electric blue + white print", "Front and back print", "Distressed finish", "Oversized, boxy fit"],
  },
  {
    slug: "layered-long-sleeve",
    code: "MV-02",
    name: "Layered Long Sleeve",
    colour: "Black",
    category: "long-sleeves",
    price: 32000,
    sizes: SIZES,
    isNew: true,
    front: "/garments/layered-longsleeve-front.png",
    back: "/garments/layered-longsleeve-back.png",
    photos: [{ src: "/originals/reference_01.jpeg", alt: "Layered Long Sleeve, front and back" }],
    tag: "LONG SLEEVE",
    summary: "Lightning wordmark on the chest, slogan on the lower back and both cuffs.",
    description: "The MAVERICK lightning wordmark across the chest and a small M logo at the hem. DIFFERENT BY CHOICE. runs low across the back and repeats on both cuffs. Layered sleeves give the look of a tee over a long sleeve.",
    details: ["Black body", "White print", "Front, back and cuff prints", "Layered-look sleeves"],
  },
  {
    slug: "peel-tee-white",
    code: "MV-03",
    name: "Peel Tee",
    colour: "White",
    category: "tees",
    price: 28000,
    sizes: SIZES,
    isNew: true,
    front: "/garments/peel-front.png",
    photos: [{ src: "/originals/reference_05.jpeg", alt: "Peel Tee in white, front" }],
    tag: "TEE",
    summary: "The red MA box peels away to reveal the eye and the electrified skeleton.",
    description: "A full-colour illustrated front. The red MA box peels down off the wordmark to show an eye and an electrified skeleton underneath, with Different By Choice set in red beside it.",
    details: ["White body", "Full-colour illustrated print", "Front print", "Oversized, boxy fit"],
  },
  {
    slug: "horned-m-ringer",
    code: "MV-04",
    name: "Horned M Ringer",
    colour: "Black / Red",
    category: "ringers",
    price: 25000,
    sizes: SIZES,
    isNew: false,
    front: "/garments/horned-ringer-front.png",
    photos: [{ src: "/originals/reference_07.jpeg", alt: "Horned M Ringer with hang tag" }],
    tag: "RINGER",
    summary: "The horned M on the chest, framed by a red ringer collar and cuffs.",
    description: "A clean black ringer with red rib at the collar and sleeves. The horned M sits on the left chest. Quiet from a distance, unmistakable up close.",
    details: ["Black body", "Red rib collar and cuffs", "White chest logo", "Regular fit"],
  },
  {
    slug: "strike-tee-white-yellow",
    code: "MV-05",
    name: "Strike Tee",
    colour: "White / Yellow",
    category: "tees",
    price: 25000,
    sizes: SIZES,
    isNew: true,
    front: "/garments/strike-white-front.png",
    back: "/garments/strike-white-back.png",
    side: "/garments/strike-white-side.png",
    photos: [
      { src: "/originals/reference_08.jpeg", alt: "Strike Tee in white, front" },
      { src: "/originals/reference_03.jpeg", alt: "Strike Tee in white, back" },
      { src: "/originals/sides/strike-white-side-front.jpg", alt: "Strike Tee in white, side view from the front" },
      { src: "/originals/sides/strike-white-side-back.jpg", alt: "Strike Tee in white, side view from the back" },
    ],
    tag: "TEE",
    summary: "The Strike tee in white, with yellow drip lettering and a black outline.",
    description: "The Strike graphics in reverse: yellow drip lettering with a heavy black outline on a white body. MAVERICK across the front, DIFFERENT BY CHOICE. stacked across the back.",
    details: ["White body", "Yellow + black print", "Front and back print", "Distressed finish", "Oversized, boxy fit"],
  },
  {
    slug: "lone-star-ringer",
    code: "MV-06",
    name: "Lone Star Ringer",
    colour: "Black / Red",
    category: "ringers",
    price: 28000,
    sizes: SIZES,
    isNew: false,
    front: "/garments/star-ringer-front.png",
    back: "/garments/star-ringer-back.png",
    photos: [
      { src: "/originals/reference_09.jpeg", alt: "Lone Star Ringer, front" },
      { src: "/originals/reference_06.jpeg", alt: "Lone Star Ringer, back" },
    ],
    tag: "RINGER",
    summary: "Varsity front stack, with a full star M across the back.",
    description: "A varsity-style front: boxed MAVERICK, Different by Choice, and the M set into a red star with a signature underneath. The back carries the star M at full size.",
    details: ["Black body", "Red rib collar and cuffs", "Front and back print", "Regular fit"],
  },
];

export const COLLECTIONS: Record<string, { title: string; blurb: string; filter: (p: Product) => boolean }> = {
  all: { title: "Shop All", blurb: "Every piece from Drop 01.", filter: () => true },
  new: { title: "New In", blurb: "The latest pieces from Drop 01.", filter: (p) => p.isNew },
  ...Object.fromEntries(CATEGORIES.map((c) => [c.handle, { title: c.title, blurb: c.blurb, filter: (p: Product) => p.category === c.handle }])),
};

/** Tightly cropped version of a cut-out, for cards and galleries. */
export const tight = (src: string) => src.replace(/\.png$/, "-tight.png");

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);
/** True when a size can be bought (no stock list means in stock). */
export const inStock = (p: Product, size: string) => p.sizes.includes(size) && (p.stock?.[size] ?? 1) > 0;
export const fullName = (p: Product) => `${p.name} — ${p.colour}`;
export const related = (p: Product, n = 4) =>
  [...products.filter((x) => x.slug !== p.slug && x.category === p.category), ...products.filter((x) => x.slug !== p.slug && x.category !== p.category)].slice(0, n);
