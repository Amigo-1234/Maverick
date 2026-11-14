# MAVERICK — DIFFERENT BY CHOICE.

Online store and store-management system for MAVERICK, a Nigerian menswear brand making oversized graphic tees, ringers and long sleeves.

Built with Next.js 16, React 19, Tailwind CSS 4, GSAP and PostgreSQL (Supabase in production).

## Run it

You need Node.js 20 or newer.

```bash
npm install
npm run dev      # shop: http://localhost:3000   admin: http://localhost:3000/admin
```

With no `DATABASE_URL` set, the site uses a built-in local database stored in `.data/`. It's real PostgreSQL (PGlite), seeded with the Drop 01 catalog. To sign in to the admin, put `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env.local` first (see `.env.example`).

## What's in it

**Shop** (`app/(store)`)

| Page | Route |
| --- | --- |
| Home: clothing rail hero, shop by cut, new in, spotlight, lookbook marquee | `/` |
| Collections and categories (filter, sort) | `/collections/[handle]` |
| Product pages: gallery, colour and size, live stock, sale prices, Order on WhatsApp, **Ask about this product** | `/products/[slug]` |
| Bag, checkout (Paystack, delivery by state, discount codes), payment confirmation | `/cart`, `/checkout`, `/checkout/verify` |
| **Track your order** (no account needed) | `/track-order` |
| Search, lookbook, about, size guide, shipping & returns, FAQ, contact, terms, privacy | … |

**Admin** (`app/admin`): sign in at `/admin/login`.

| Section | What it does |
| --- | --- |
| Overview | Net revenue (paid orders minus refunds), sales, pipeline counts, stock health, revenue by day for any date range, top sellers, recent orders and inquiries |
| Orders | Search and filter by payment, fulfilment and date. The order page has items, customer, address, timeline, status changes (with customer emails), tracking, internal notes, refunds (through Paystack) and resending the confirmation |
| Products | Create, edit, publish/unpublish, archive or delete. Sale prices, categories, collections, materials and care. Front/back/side cut-outs (with optional background removal) and gallery photos |
| Inventory | Stock per size and colour: set, add, remove, mark sold out, restore, low-stock alert levels, stock held by unpaid checkouts, full adjustment history with who changed it |
| Collections | Hand-picked collections (with visibility) and categories |
| Customers | Spend, order count and last purchase for each customer, plus their order history |
| Inquiries | Product questions inbox: search, filter by product, status, internal notes, reply by email or WhatsApp |
| Discounts | Percent or naira codes with minimum order, start/end dates, usage limit, on/off |
| Delivery | Delivery options by state, fees, delivery times, pickup, instructions, free-delivery threshold |
| Settings | Store name, emails, WhatsApp number, socials, announcement, maintenance mode, legal details, team accounts and passwords |
| Activity log | Every sign-in and change, with who made it |

## How the important parts work

- **Payment vs fulfilment:** each order has a *payment status* (pending → paid → refunded), set only from verified Paystack transactions and refunds, and a separate *fulfilment status* (processing → preparing → shipped → delivered, plus on hold, cancelled, refund requested) set by staff. Staff can't mark an order paid, and unpaid orders can't be shipped.
- **Stock and overselling:** checkout reserves stock with one atomic database update (`stock = stock − qty WHERE stock ≥ qty`). The database also refuses negative stock. Paying commits the reservation. A failed, cancelled or expired payment (after `STOCK_RESERVATION_MINUTES`, default 30) gives the stock back. If someone pays after their reservation expired and the item sold out meanwhile, the order is flagged *Needs attention*.
- **Duplicate payments and webhooks:** the return page and the webhook both call the same confirm step. "Mark as paid" can only succeed once, and each webhook event id is recorded first, so retries change nothing and no email is sent twice.
- **Emails (Resend):**
  - The shop gets an alert for each order and inquiry.
  - The customer gets a receipt with a signed tracking link, an email for each status change (at most one per status), and a refund email.
- **Order tracking:** the customer enters the order number plus the email *or* phone on the order. Wrong details get the same message as a made-up number, and lookups are rate-limited. Links in emails carry an HMAC token instead.
- **Security:**
  - Admins sign in with scrypt-hashed passwords. Sessions are random tokens, and only their SHA-256 hash is stored.
  - Every admin page, server action and admin API checks the session on the server.
  - Sign-in, checkout, tracking, inquiries and forms are rate-limited in the database.
  - Sensitive admin actions go to the activity log.
  - Secret keys stay server-side.
  - Every table has row-level security on with no public policies, so Supabase's public API can't read anything.
- **Images:** uploads are processed with `sharp` and stored in the database (`media` table), served from `/media/<id>` with long-lived caching. No separate storage service is needed.

## Database

Migrations are plain SQL in `db/migrations/` (versioned `0001_…`, `0002_…`):

- `0001_schema.sql`: all tables, constraints and row-level security.
- `0002_seed.sql`: the original catalog, settings and delivery options. Stock and prices are placeholders.

Locally they apply automatically. For Supabase:

1. Create a Supabase project. Under **Project Settings → Database → Connection string**, copy the **Transaction pooler** URL.
2. Run `DATABASE_URL="postgres://…" npm run db:migrate`. It's safe to run again; already-applied migrations are skipped.
3. Set the same `DATABASE_URL` on the host.

To add a migration later, add `db/migrations/0003_….sql`. It's bundled into the app automatically on `dev`/`build`.

## Environment variables

See `.env.example` for every variable with instructions. Required in production:

`NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`, `APP_SECRET`, `ADMIN_EMAIL` + `ADMIN_PASSWORD` (first sign-in only), `PAYSTACK_SECRET_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `ORDER_NOTIFY_EMAIL`.

Store details (WhatsApp number, socials, delivery fees, announcement and so on) live in **Admin → Settings / Delivery**, not in environment variables.

## Deploying (Vercel + Supabase)

1. Create the Supabase database and run the migrations (above).
2. On [vercel.com](https://vercel.com), import the GitHub repo.
3. Add the environment variables. Start with the Paystack **test** key.
4. Deploy, then sign in at `/admin/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. That creates the owner account.
5. In Paystack → Settings → API Keys & Webhooks, set the webhook URL to `https://YOUR-DOMAIN/api/paystack/webhook`.
6. Place a test order with a Paystack test card, then check that it shows in Admin → Orders, both emails arrive, and stock went down.
7. Add the domain in Vercel → Settings → Domains. Swap to the **live** Paystack key and live webhook URL.

## Tests

End-to-end checks run in your installed Google Chrome against a production build:

```bash
npm run build
node scripts/e2e-payments.mjs   # Part C: orders, stock, webhooks, refunds, tracking, inquiries, admin (≈90 checks)
npx next start -p 3123 &        # then, against that server:
node scripts/e2e-shop.mjs       # bag, sorting, search, WhatsApp, phone layout
node scripts/e2e-menu.mjs       # navbar menu
```

`e2e-payments.mjs` is **simulated**: it starts local stand-ins for Paystack and Resend (`scripts/mock-services.mjs`) and a throwaway database. It proves the site's logic, not the real Paystack or Resend accounts. Test those with your test keys before going live.

## Images and brand assets

All imagery is the client's own: `source-images/` (originals), `public/originals/`, `public/garments/` (cut-outs), `public/brand/` (logo). Regenerate derived images with `node scripts/cutouts.mjs` and `node scripts/trace-logo.mjs`. New product images are uploaded in the admin.

## Contact

- TikTok: [@maverickwear1](https://www.tiktok.com/@maverickwear1)
- Snapchat: [maverick267153](https://www.snapchat.com/add/maverick267153)
- WhatsApp: +234 702 524 4302
