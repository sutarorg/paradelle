# PARADELLE CHOCOLATES — Public Website

Luxury direct-to-consumer e-commerce for **PARADELLE CHOCOLATES** — *Crafted for true indulgence.*
Mobile-first, conversion-considered, ethically persuasive. No dark patterns anywhere.

---

## Phase status

| Phase | Scope | Status |
|---|---|---|
| **Phase 1** | Complete public website, 4-product catalogue, cart, checkout (reservation), accounts, order tracking, 16 owner-supplied WebP product photos, shared data models, docs | ✅ Complete |
| **Phase 2 (this deliverable)** | Protected `/admin` dashboard: real KPIs + revenue chart, product CRUD with image upload/reorder, inventory with movements, order fulfilment + tracking + printable invoices + CSV exports, customers, coupons, shipping rules, PIN serviceability, CMS for homepage/story/FAQs/policies, reports, activity log, team roles — all on the same database | ✅ Complete |
| **Phase 3 (this deliverable)** | Integer-paise money, new tables (profiles, addresses, carts, reservations, webhook events, redemptions, shipping rules), transactions + oversell guards, Supabase migration with indexes/constraints/RLS, Zod-validated APIs (products, cart, checkout, verify), full Razorpay lifecycle (server order creation, Standard Checkout, signature + amount re-verification, signed idempotent webhooks, refunds, payment history), email service interface, rate limiting, FSSAI fields, `/pay` retry page | ✅ Complete |
| **Phase 4 (this deliverable)** | 148 automated checks (functional ×54, payments ×20, security ×12, UI/mobile ×62, all rerun to green), Playwright at 6 viewports, Lighthouse 12 audits (96–100 across pages), 10 bugs found→fixed→regression-tested, real product photography integrated (16 assets), release report | ✅ Complete |

**Release report:** `docs/PHASE4-RELEASE.md` — verdict: **GO, staged launch**.

See **`docs/BACKEND.md`** for the database/API/payment/security/deployment contract.

## Phase 2 — `/admin`

**Access:** a Super Admin is created only when `ADMIN_INITIAL_PASSWORD` is provided in a secure environment and no account with `ADMIN_EMAIL` exists. Existing accounts can be recovered with the environment-based `admin:reset-password` script. Never commit or paste passwords into source control or chat. No public admin registration; staff are invited by Super Admins with per-section permissions (`catalog, inventory, orders, customers, marketing, content, reports, staff, settings`). Every admin page server-checks the session via `requireAdmin(permission)`; unpermitted areas never render in the sidebar and redirect if hit directly. All mutations write to `activity_logs`.

**Dashboard:** revenue (paid orders only), paid/pending counts, unique customers, AOV, daily revenue SVG chart, best sellers, low-stock alerts (on-hand − reserved by unpaid orders), recent orders — with 7/30/90/all-time windows. No statistic is fabricated; empty states are honest.

**Orders ethics:** the `payment_pending → paid` transition is *only* possible via a Razorpay webhook that verifies `x-razorpay-signature` (Phase 3). The admin UI deliberately exposes no “mark paid” button; attempts are rejected server-side. Refunds are recorded as `requested` and only ever `processed` by the gateway.

**Media uploads:** `storeImageFile()` in `src/lib/admin/catalog-actions.ts` uses **Supabase Storage** (`product-media` bucket) when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set; otherwise it falls back to `public/uploads/` (ephemeral on Vercel — set Supabase in production).

**CMS:** homepage hero/announcement/quote, story quote, FAQs and all four policies are edited at `/admin/content` and instantly live (public pages read through `getContent()` with typed fallbacks — zero breakage if the DB is unreachable).

### Phase 3 delivered all of the above

Checkout.js client, signature + amount verification, signed idempotent webhooks (`/api/webhooks/razorpay`), gateway-executed refunds, transactional email templates, carts API, addresses, reservations. Full contract in **`docs/BACKEND.md`**. Remaining for Phase 4: independent QA, Upstash rate-limit swap, Supabase Auth bridge (optional — current sessions are hardened), live-mode rehearsal.

Run seeds after `drizzle-kit push`: set `ADMIN_EMAIL` and a unique `ADMIN_INITIAL_PASSWORD` in your secure environment, then run `npx tsx scripts/seed.ts` (idempotent; an existing admin password is never overwritten). To recover an existing account, set `ADMIN_RESET_EMAIL` and a new `ADMIN_RESET_PASSWORD`, then run `npm run admin:reset-password`; the reset invalidates existing admin sessions.

---

## Stack

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4** — server components by default; client islands for cart, forms, gallery.
- **Drizzle ORM + PostgreSQL** — schema in `src/db/schema.ts`. Works with any Postgres; drop in a **Supabase** pooled connection string for production.
- **shadcn-style UI primitives** — `src/components/ui.tsx` (Button, ButtonLink, Field, inputClass) follow shadcn/ui conventions (Tailwind-utility driven, accessible focus rings).
- **Lucide icons** only (no emojis).
- **Razorpay** — single payment method, prepaid only. *Absolutely no Cash on Delivery.*

## Run

```bash
npm install
npx drizzle-kit push            # create tables
npm run dev                     # or: npm run build && npm start
```

Validation done for Phase 1: `npx next typegen` · `npm exec tsc --noEmit` · `npm run build` · `npm run lint`.

## Environment

Copy `.env.example`. Keys:

| Key | Purpose |
|---|---|
| `DATABASE_URL` | Postgres (Supabase pooled URI in production) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Phase 3 — server-side order creation (`/api/checkout/razorpay` is already wired) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Phase 3 — Checkout.js client |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Phase 2 — media storage + admin |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for metadata (production: `https://paradelle.store`) |
| `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD` | Secure one-time initial Super Admin bootstrap |
| `ADMIN_RESET_EMAIL` / `ADMIN_RESET_PASSWORD` | Secure one-time password reset; never store actual values in Git |
| `RESEND_API_KEY` / `RESEND_FROM` | Resend credentials and verified sender for contact/newsletter notifications |
| `CONTACT_NOTIFICATION_EMAIL` | Owner inbox for contact messages and cumulative newsletter list |
| `ENABLE_INBOUND_EMAIL_NOTIFICATIONS` | Explicitly enable owner email notifications after Resend is configured |

---

## Architecture map

```
src/
  app/
    page.tsx                    Homepage (hero, collection, story, craft, benefits, gifting, newsletter, promise)
    collection/                 Search (name/notes/ingredients) + 4 sort orders
    product/[slug]/             Gallery, MRP, per-100 g, qty, accordions (ingredients/allergens/nutrition/storage/shipping), related, sticky mobile add-to-cart
    our-story/  craftsmanship/  Editorial pages
    cart/                       Free-shipping progress bar, coupon UI, transparent summary
    checkout/                   8-field guest-first checkout + summary; success/ confirmation page
    login/ register/ account/   scrypt auth, session cookies, order history + 5-step tracking timeline
    contact/ faqs/ legal/[slug]/  shipping · refunds · privacy · terms
    api/checkout/               Server-verified totals → reserved order (status payment_pending)
    api/checkout/razorpay/      503 "gateway_pending" until keys exist; live order-creation path implemented
    api/newsletter/  api/contact/
  components/                   site-header/footer, cart-provider (localStorage), product-card, gallery, add-to-cart, reveal, forms
  lib/
    products.ts                 ★ catalogue source of truth (4 SKUs)
    commerce.ts                 ★ shipping/coupon/totals engine — shared by client AND checkout API
    content.ts                  FAQs, policies, nav
    auth.ts actions.ts          scrypt passwords, 30-day sessions, server actions
  db/schema.ts                  users · sessions · orders · order_items · coupons · newsletter_subscribers · contact_messages
```

## Data models (shared contract for Phases 2–3)

- **orders.status** state machine: `payment_pending → paid → crafting → shipped → delivered` (`cancelled` terminal). Phase 1 creates `payment_pending` reservations; Phase 3 flips to `paid` from the Razorpay webhook.
- **Money**: integer rupees everywhere (all catalogue prices are whole MRPs). Razorpay conversion = `total * 100` paise (already in the API route).
- **Coupons**: `coupons` table mirrors `src/lib/commerce.ts#COUPONS` (`WELCOME10` 10 %, `GIFT250` 5 % ≥ ₹1,500). Checkout API prefers DB rows, falls back to the registry.
- **Guest checkout** is first-class: `orders.user_id` nullable, linked by email for account history.

## Commerce rules (single source: `src/lib/commerce.ts`)

- Flat shipping **₹99**, **free ≥ ₹499** — shown on cart page, checkout and every product page *before* payment (shipping-cost surprise is the #1 abandonment cause).
- Prices are **prestige round numbers** (₹450 / ₹550 / ₹500 / ₹700), MRP inclusive of taxes — luxury price-ladder anchoring (Dark anchors Milk; Pistachio anchors the house).

## Media assets (Phase 2 → Supabase Storage)

Compressed as 1:1 WebP and ready to upload to a Supabase bucket named `product-media`:

```
public/images/products/{signature-milk,signature-dark,crunchy-nut,pistachio-filled}-{1,2,3,4}.webp   ← 16 supplied product photos
public/images/hero.webp  gifting.webp                                  ← editorial
public/images/logo.png                                                 ← official crest (unmodified)
```

The four supplied Drive photos for each product are stored in the requested order as compressed WebP. The database migration `supabase/migrations/20261104_storefront_media_shipping.sql` replaces existing product image rows and sets the ₹499 free-shipping threshold. To use Supabase Storage, run `npx tsx scripts/upload-media.ts` after the migration.

> ⚠️ **Confirm before launch:** ingredient decks, cocoa percentages, allergen statements and nutrition values in `src/lib/products.ts` are realistic industry-typical placeholders. Replace with laboratory/production specifications. Contact emails (`hello@`, `privacy@paradelle.store`) and the atelier city are configurable brand constants.

## Ethics charter (enforced in Phase 1)

No fake scarcity or countdowns · no invented discounts/strikethroughs · taxes-included MRPs · full totals visible pre-payment · guest checkout always available · honest "melted? replaced or refunded — your choice" remedy · `prefers-reduced-motion` respected · marketing email opt-in with one-click unsubscribe.

## Deploy (Vercel + GitHub)

1. Push to GitHub (repository already initialised — commit when authorised).
2. Vercel → import repo → add env vars from `.env.example` (Supabase pooled `DATABASE_URL` for production).
3. `npx drizzle-kit push` against production once; seed coupons:
   `INSERT INTO coupons (code, kind, value, min_subtotal) VALUES ('WELCOME10','percent',10,0), ('GIFT250','percent',5,1500) ON CONFLICT DO NOTHING;`
4. Phase 3: set Razorpay keys, add the Checkout.js client + `/api/checkout/razorpay/verify` webhook (`x-razorpay-signature` HMAC-SHA256) to flip orders to `paid`.
