/**
 * Catalog types and helpers, shared by the storefront and the server.
 * The data itself lives in the database (see lib/server/store.ts); the admin dashboard edits it.
 * The original hard-coded catalog is archived in db/legacy/catalog.ts.
 */
export type Variant = { id: number; size: string; colour: string; stock: number; lowStockAt: number };

export interface Product {
  id: number;
  slug: string;
  code: string;
  name: string;
  /** Colourway label, e.g. "Black / Blue". */
  colour: string;
  category: string;
  categoryTitle: string;
  price: number;
  /** Original price when the item is on sale. */
  compareAt: number | null;
  sizes: string[];
  colours: string[];
  variants: Variant[];
  isNew: boolean;
  featured: boolean;
  /** Transparent cut-outs on a 200x310 canvas for the rail, plus tightly cropped copies for cards. */
  front: string;
  frontTight: string;
  back?: string;
  backTight?: string;
  side?: string;
  photos: { src: string; alt: string }[];
  tag: string;
  summary: string;
  description: string;
  details: string[];
  materials: string;
  care: string;
  extraInfo: string;
  collections: string[];
}

export type Category = { handle: string; title: string; blurb: string };
export type CollectionInfo = { handle: string; title: string; blurb: string; slugs: string[]; kind: "all" | "category" | "collection" };
export type Catalog = { products: Product[]; categories: Category[]; collections: CollectionInfo[] };

export const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

export const findProduct = (c: Catalog, slug: string) => c.products.find((p) => p.slug === slug);
export const fullName = (p: Product) => `${p.name} — ${p.colour}`;

/** The variant for a size (and colour, when a product has several). */
export const variantFor = (p: Product, size: string, colour?: string) =>
  p.variants.find((v) => v.size === size && (!colour || v.colour === colour)) ?? null;

/** Can this size (and colour) be bought right now? */
export const inStock = (p: Product, size: string, colour?: string) => (variantFor(p, size, colour)?.stock ?? 0) > 0;
export const anyInStock = (p: Product) => p.variants.some((v) => v.stock > 0);
export const lowStock = (p: Product, size: string, colour?: string) => {
  const v = variantFor(p, size, colour);
  return v ? v.stock > 0 && v.stock <= v.lowStockAt : false;
};

export const related = (c: Catalog, p: Product, n = 4) =>
  [...c.products.filter((x) => x.slug !== p.slug && x.category === p.category), ...c.products.filter((x) => x.slug !== p.slug && x.category !== p.category)].slice(0, n);

export const collectionBy = (c: Catalog, handle: string) => c.collections.find((x) => x.handle === handle);
