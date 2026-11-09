# MAVERICK — DIFFERENT BY CHOICE.

Online store for MAVERICK, a Nigerian menswear brand making oversized graphic tees, ringers and long sleeves.

Built with Next.js 16, React 19, Tailwind CSS 4 and GSAP.

## Run it

You need Node.js 20 or newer.

```bash
npm install
npm run dev      # http://localhost:3000
```

To build for production:

```bash
npm run build
npm start
```

## What's in the store

| Page | Route |
| --- | --- |
| Home: clothing rail hero, shop by cut, new in, spotlight, lookbook marquee | `/` |
| Collections with colour filter and sorting | `/collections/all`, `/collections/new`, `/collections/tees`, `/collections/ringers`, `/collections/long-sleeves` |
| Product pages: front/back gallery, sizes, add to bag, Order on WhatsApp | `/products/[slug]` |
| Bag (slide-out drawer and full page) | `/cart` |
| Checkout (test mode) and order confirmation | `/checkout`, `/checkout/success` |
| Search | `/search` |
| Lookbook, About, Size guide, Shipping & returns, FAQ, Contact | `/lookbook`, `/about`, `/size-guide`, `/shipping-returns`, `/faq`, `/contact` |

The navbar is a full-screen GSAP menu, and a floating WhatsApp button opens a chat on every page except checkout.

## Where things live

| To change… | Edit |
| --- | --- |
| Products: names, prices, sizes, descriptions, images | `lib/catalog.ts` |
| Currency, delivery rates, free-delivery threshold, returns, size chart, socials, email | `lib/site.ts` |
| Colours, fonts and shared styles | `app/globals.css` |
| Navbar and full-screen menu | `components/site-header.tsx` |
| Clothing rail hero (supplied component, unmodified) | `components/clothing-rail-hero.tsx` |
| Icons (SVG) and the logo mark | `components/icons.tsx` |

## Before launch

These are **placeholders**. Replace them with real values:

- **Prices**: currently ₦25,000–₦32,000 in `lib/catalog.ts`.
- **Sizes and stock**: all pieces are listed as S–XXL and in stock.
- **Delivery and returns**: Lagos ₦3,500, Nationwide ₦6,000, free over ₦100,000, 7-day returns, all set in `lib/site.ts`.
- **Size chart measurements**: in `lib/site.ts`.
- **Contact email**: `hello@maverick.example` in `lib/site.ts`.
- **Payments**: checkout runs in test mode and takes no money. Connect Paystack or Flutterwave before going live.
- **Newsletter and contact forms**: they show a success message but don't send anywhere yet. They need an email service.

## Images

All imagery is the client's own:

- `source-images/`: the original garment photos and the logo.
- `public/originals/`: the photos shown on the site, unedited.
- `public/garments/`: transparent cut-outs made from those photos.
- `public/brand/`: the logo, plus a vector version traced from it.

To regenerate the derived images after changing a photo:

```bash
node scripts/cutouts.mjs      # garment cut-outs
node scripts/trace-logo.mjs   # vector logo
```

## Tests

End-to-end checks run in your installed Google Chrome against a running build:

```bash
npm run build && npx next start -p 3123
node scripts/e2e-shop.mjs   # bag, sorting, search, checkout, WhatsApp, phone layout
node scripts/e2e-menu.mjs   # navbar menu: open, close, focus, links
```

## Contact

- TikTok: [@maverickwear1](https://www.tiktok.com/@maverickwear1)
- WhatsApp: +234 702 524 4302
