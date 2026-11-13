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
| Business name, CAC number and address on the legal pages | `site.legal` in `lib/site.ts` |
| Mark a size sold out | add `stock: { XL: 0 }` to the product in `lib/catalog.ts` |

## Before launch

These are **placeholders**. Replace them with real values:

- **Prices**: currently ₦25,000–₦32,000 in `lib/catalog.ts`.
- **Sizes and stock**: all pieces are listed as S–XXL and in stock.
- **Delivery and returns**: Lagos ₦3,500, Nationwide ₦6,000, free over ₦100,000, 7-day returns, all set in `lib/site.ts`.
- **Size chart measurements**: in `lib/site.ts`.
- **Contact email**: `hello@maverick.example` in `lib/site.ts`.
- **Business details** for the Terms and Privacy pages: `site.legal` in `lib/site.ts`.
- **Keys**: Paystack, Resend and the admin password (see below).

## Payments, email and orders

Everything is configured with environment variables. Copy `.env.example` to `.env.local` and fill it in on your computer. On the live host, add the same names in its settings. **Never** commit `.env.local`, or paste secret keys into chats or emails.

### 1. Paystack (payments)

1. Sign in at [dashboard.paystack.com](https://dashboard.paystack.com) and go to **Settings → API Keys & Webhooks**.
2. Copy the **Test Secret Key** (`sk_test_…`) into `PAYSTACK_SECRET_KEY`.
3. Set the **Test Webhook URL** to `https://YOUR-DOMAIN/api/paystack/webhook`.
4. Place a test order with one of Paystack's test cards. Check that it appears on `/admin` and that both emails arrive.
5. When Paystack has activated the business, swap in the **Live Secret Key** (`sk_live_…`) and set the **Live Webhook URL** to the same address.

How it works:

- The server re-prices every order from `lib/catalog.ts`, so customers can't change what they pay.
- Paystack hosts the payment page (card, bank transfer, USSD).
- `/checkout/verify` confirms each payment with Paystack before showing "Order placed".
- The signed webhook confirms payments even if the customer closes the tab, and triggers the emails.

### 2. Email (Resend)

1. Create an account at [resend.com](https://resend.com) and **verify your domain** so emails don't go to spam.
2. Set `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `MAVERICK <orders@yourdomain.com>`) and `ORDER_NOTIFY_EMAIL` (the owner's inbox).
3. Optionally create an Audience and set `RESEND_AUDIENCE_ID` to collect newsletter sign-ups there.

Once this is set up:

- The owner gets a "New order" email for every paid order.
- The customer gets a receipt.
- Contact-form messages arrive with reply-to set to the customer.

### 3. Orders admin

Set `ADMIN_PASSWORD` to a long password, then visit `/admin`. It lists paid orders straight from Paystack, with:

- items and sizes
- delivery address
- phone number, with a one-tap WhatsApp link to the customer

Paystack is the order record, so there's no separate database to look after.

### 4. Going live (Vercel)

1. On [vercel.com](https://vercel.com), import the GitHub repo (it's detected as Next.js automatically).
2. Add every variable from `.env.example` under **Settings → Environment Variables**, and set `NEXT_PUBLIC_SITE_URL` to the real address (e.g. `https://maverickwear.com`).
3. Add the domain under **Settings → Domains** and follow the DNS steps. HTTPS is automatic.
4. Update the Paystack webhook URL to the real domain, then place a test order end to end.

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

The payment test starts its own local stand-ins for Paystack and Resend, so it needs no keys and moves no money:

```bash
npm run build && node scripts/e2e-payments.mjs   # pay, cancel, webhook, emails, admin, tampering, forms, SEO
```

## Contact

- TikTok: [@maverickwear1](https://www.tiktok.com/@maverickwear1)
- Snapchat: [maverick267153](https://www.snapchat.com/add/maverick267153)
- WhatsApp: +234 702 524 4302
