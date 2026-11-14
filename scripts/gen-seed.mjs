// One-off: turns the original hard-coded catalog (lib/catalog.ts, lib/site.ts) into db/migrations/0002_seed.sql.
// Kept for reference; the database is the source of truth from now on.
import fs from "node:fs";
const { products, CATEGORIES } = await import("../db/legacy/catalog.ts");
const { site } = await import("../db/legacy/site.ts");

const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => `array[${a.map(q).join(",")}]::text[]`;
const tight = (s) => (s ? s.replace(/\.png$/, "-tight.png") : null);
const out = ["-- Seed data: the original Drop 01 catalog and store settings. Prices and stock are placeholders.", ""];

const store = {
  name: site.name, slogan: site.slogan, email: site.email, currency: site.currency,
  whatsapp: site.socials.whatsapp.number, whatsappDisplay: site.socials.whatsapp.display,
  supportContact: site.socials.whatsapp.display, address: site.legal.address,
  socials: { tiktok: site.socials.tiktok.url, snapchat: site.socials.snapchat.url, instagram: "" },
  announcement: site.announcement, maintenance: false, orderNotifyEmail: "",
  freeDeliveryOver: site.freeShippingOver, returnsDays: site.returnsDays,
  deliveryInstructions: "The rider will call the phone number on your order before delivery.",
  legal: site.legal, lowStockDefault: 3,
};
out.push(`insert into store_settings (key, value) values ('store', ${q(JSON.stringify(store))}::jsonb);`, "");

out.push(`insert into delivery_zones (name, states, fee, eta, sort) values`,
  `  ('Lagos delivery', array['Lagos']::text[], ${site.shipping[0].price}, ${q(site.shipping[0].eta)}, 1),`,
  `  ('Nationwide delivery', '{}'::text[], ${site.shipping[1].price}, ${q(site.shipping[1].eta)}, 2);`,
  `insert into delivery_zones (name, states, fee, eta, is_pickup, instructions, active, sort) values`,
  `  ('Pickup in Lagos', array['Lagos']::text[], 0, 'Ready in 1 working day', true, 'We will WhatsApp you the pickup address and time.', false, 3);`, "");

CATEGORIES.forEach((c, i) => out.push(`insert into categories (handle, title, blurb, sort) values (${q(c.handle)}, ${q(c.title)}, ${q(c.blurb)}, ${i});`));
out.push("");

products.forEach((p, i) => {
  out.push(`insert into products (slug, code, name, colour_label, category_id, price, status, featured, is_new, tag, summary, description, details, front, front_tight, back, back_tight, side, side_tight, sort)
  values (${q(p.slug)}, ${q(p.code)}, ${q(p.name)}, ${q(p.colour)}, (select id from categories where handle = ${q(p.category)}), ${p.price}, 'published', ${i < 2}, ${p.isNew}, ${q(p.tag)}, ${q(p.summary)}, ${q(p.description)}, ${arr(p.details)}, ${q(p.front)}, ${q(tight(p.front))}, ${q(p.back)}, ${q(tight(p.back))}, ${q(p.side)}, ${q(tight(p.side))}, ${i});`);
  p.photos.forEach((ph, k) => out.push(`insert into product_images (product_id, url, alt, sort) values ((select id from products where slug = ${q(p.slug)}), ${q(ph.src)}, ${q(ph.alt)}, ${k});`));
  p.sizes.forEach((s, k) => out.push(`insert into variants (product_id, size, colour, stock, sku, sort) values ((select id from products where slug = ${q(p.slug)}), ${q(s)}, ${q(p.colour)}, 10, ${q(`${p.code}-${s}`)}, ${k});`));
});
out.push("", `insert into inventory_adjustments (variant_id, product_name, size, colour, delta, stock_after, reason, note)
  select v.id, p.name, v.size, v.colour, v.stock, v.stock, 'created', 'Opening stock (placeholder)' from variants v join products p on p.id = v.product_id;`, "");

const collections = [
  ["new", "New In", "The latest pieces from Drop 01.", products.filter((p) => p.isNew).map((p) => p.slug), true],
  ["graphic", "Graphic Collection", "Big prints, front and back.", ["strike-tee-black-blue", "strike-tee-white-yellow", "peel-tee-white", "layered-long-sleeve"], true],
  ["oversized", "Oversized Series", "Boxy, dropped-shoulder cuts.", ["strike-tee-black-blue", "strike-tee-white-yellow", "peel-tee-white"], true],
  ["best-sellers", "Best Sellers", "The pieces everyone's wearing.", [], false],
];
collections.forEach(([h, t, b, slugs, vis], i) => {
  out.push(`insert into collections (handle, title, blurb, visible, sort) values (${q(h)}, ${q(t)}, ${q(b)}, ${vis}, ${i});`);
  slugs.forEach((s, k) => out.push(`insert into collection_products (collection_id, product_id, sort) values ((select id from collections where handle = ${q(h)}), (select id from products where slug = ${q(s)}), ${k});`));
});

fs.writeFileSync("db/migrations/0002_seed.sql", out.join("\n") + "\n");
console.log("wrote db/migrations/0002_seed.sql");
