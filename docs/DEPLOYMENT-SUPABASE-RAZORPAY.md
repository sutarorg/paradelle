# PARADELLE — Supabase & Razorpay Deployment Guide

Everything below matches the code exactly as shipped. Estimated time: ~60–90 minutes.

---

## PART A — SUPABASE (database + media storage)

### A1. Create the project
1. <https://supabase.com> → **New project** → name `paradelle`, strong DB password (save it), region **Mumbai (ap-south-1)** or **Singapore (ap-southeast-1)** — closest to your customers.
2. Wait ~2 min for provisioning.

### A2. Get the connection string (choose the pooler)
**Project Settings → Database → Connection string → "Transaction" (port 6543)**
```
postgresql://postgres.<project-ref>:<DB_PASSWORD>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```
Put this in Vercel as `DATABASE_URL`. (Drizzle/`pg` Pool works with Supabase pooler out of the box — no code change.)

> For migrations below, use the **direct** string (port 5432) or the SQL editor.

### A3. Apply the schema (one standalone SQL file — nothing else needed first)
1. **Supabase → SQL Editor → New query** and paste the full contents of `supabase/migrations/20260104_phase3_backend.sql` → **Run**.
   - It creates **all 26 tables** from scratch, adds constraints + indexes, seeds the shipping rule and enables **RLS policies** automatically (Supabase has the `auth` schema, so that block activates).
   - It is idempotent — re-running is safe, and against an older database it also converts legacy integer rupees to paise.
2. Seed reference data (products + images, coupons, settings, and the initial Super Admin if configured):
```bash
DATABASE_URL="<direct string, port 5432>" ADMIN_EMAIL="admin@paradelle.store" ADMIN_INITIAL_PASSWORD="<unique secure password>" npx tsx scripts/seed.ts
```
The password is read only from the secure environment; existing admin passwords are never overwritten by the seed.
3. Apply `supabase/migrations/20261104_storefront_media_shipping.sql` in the SQL Editor. It replaces galleries for products that already exist and updates shipping rules/copy to free delivery at ₹499. It is safe if the products are not seeded yet: the media update is skipped with a notice, and the current `scripts/seed.ts` inserts the supplied galleries when it creates the products.
4. *(Optional)* `DATABASE_URL="<direct>" npx drizzle-kit push` afterwards reconciles any microscopic drift against the Drizzle schema — safe either way.
Verify: **Table Editor → `products` has 4 rows**; **Authentication → Policies** lists e.g. "customers read own orders", "public reads active products".

### A4. Media storage (16 product photos + hero + gifting)
1. **Storage → New bucket** → name `product-media`, **Public: ON**.
2. Add to env (Vercel + this script): `SUPABASE_URL=https://<ref>.supabase.co`, `SUPABASE_SERVICE_ROLE_KEY=<service_role key>` (Settings → API).
3. Run: `npx tsx scripts/upload-media.ts` — creates the bucket if missing, uploads all files, and **rewrites `product_images.url` to CDN URLs** (positions/alts preserved).
4. Verify: open one URL in a browser; storefront images still render (they now come from Supabase CDN).

### A5. Bootstrap or recover admin access
The first seed creates the Super Admin only when `ADMIN_INITIAL_PASSWORD` is set and no matching admin already exists. Existing accounts are deliberately left untouched.

To reset a known account, set `ADMIN_RESET_EMAIL` and a new `ADMIN_RESET_PASSWORD` only in a secure shell/deployment environment, then run:
```bash
npm run admin:reset-password
```
The reset invalidates existing admin sessions. Never commit, log, or paste passwords into source control or chat; use a unique password and remove the one-time environment value after the reset.

### A6. Contact and newsletter notifications
Set `CONTACT_NOTIFICATION_EMAIL=tejassutar.business@gmail.com`, `ENABLE_INBOUND_EMAIL_NOTIFICATIONS=true`, a valid `RESEND_API_KEY`, and a domain-verified `RESEND_FROM` in the deployment environment. Contact submissions are emailed to the owner inbox with the visitor as reply-to. Each newsletter submission sends the current ordered subscriber list to that inbox; addresses remain private from the public response. Without a working Resend configuration the API reports the delivery problem instead of claiming an email was sent.

---

## PART B — RAZORPAY (test mode first, then live)

### B1. Account & test keys
1. <https://dashboard.razorpay.com> → sign up → complete basic profile (live payments need KYC later).
2. **Settings → API Keys → Generate Test Key**. You get:
   - Key ID: `rzp_test_…` · Key Secret: `…`

### B2. Environment variables (Vercel → Project → Settings → Environment Variables)
```
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx        # server-only
RAZORPAY_KEY_SECRET=…                         # server-only, never NEXT_PUBLIC
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_<generated>     # create a random 24+ char string
DATABASE_URL=<supabase pooler string>
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=…
NEXT_PUBLIC_SITE_URL=https://paradelle.store
CONTACT_NOTIFICATION_EMAIL=tejassutar.business@gmail.com
ENABLE_INBOUND_EMAIL_NOTIFICATIONS=true
RESEND_API_KEY=…  RESEND_FROM="PARADELLE <orders@paradelle.store>"   # verified Resend sender required for contact/newsletter mail
# Admin reset only, set transiently in a secure shell then remove:
ADMIN_RESET_EMAIL=admin@paradelle.store  ADMIN_RESET_PASSWORD=<unique new password>
```

### B3. Configure the webhook (TEST mode dashboard)
**Settings → Webhooks → Add New Webhook**:
- URL: `https://paradelle.store/api/webhooks/razorpay`
- Secret: the same `RAZORPAY_WEBHOOK_SECRET`
- Events: `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`
- Save. (Set it up **separately in Live mode** later — test/live webhook configs are independent.)

### B4. Deploy & end-to-end test (no real money)
1. Deploy to Vercel (import the GitHub repo; framework auto-detected; build command default; add envs **before** first deploy).
2. On your domain, add bars → checkout → the Razorpay modal opens.
3. Pay with Razorpay TEST methods:
   - UPI: `success@razorpay` (success), `failure@razorpay` (failure)
   - Card: `4111 1111 1111 1111`, any future expiry/CVV, any name
4. Verify the full chain:
   - `/checkout/success` shows **Payment confirmed**
   - Admin → order shows `paid`, Payments card shows a **verified captured** row
   - Inventory stock decreased once; admin best-sellers updated; email logged (or sent via Resend)
   - Razorpay dashboard → Webhooks → deliveries show `200`
5. Failure path: pay with `failure@razorpay` → order stays `payment_pending`, stock hold releases, customer can retry from `/pay/<order>`.
6. Refund path (admin): order detail → Refunds → record → **Process at gateway** → dashboard shows refund; webhook `refund.processed` updates status + emails.
7. Reconciliation audit: mismatched capture (only reachable in anomalous traces) stays un-fulfilled and flagged `amount-mismatch` in the ledger.

### B5. Go live checklist
1. KYC fully approved in Razorpay (bank account, PAN, business details; website/policies reviewed).
2. **Test keys out, live keys in**: `rzp_live_…` into the 3 RAZORPAY_* env vars (rotate webhook secret, new live webhook).
3. Confirm no COD anywhere (nothing to change — no such code exists).
4. SSL/Domain on Vercel green; `NEXT_PUBLIC_SITE_URL` matches.
5. One live UPI payment of ₹1? Razorpay min is ₹1; make a real tiny order, refund it from admin, confirm webhook + ledger.
6. Only then announce launch.

### B6. Operating rules (hard-coded safeguards)
- Orders become fulfiable **only** via verified captured webhooks — admins cannot self-mark paid.
- Duplicate/out-of-order deliveries are no-ops (idempotency by `event_key`).
- Refunds execute through the gateway API; the admin UI only records requests.
- Failed/unsigned webhook calls return 401 and are not persisted.

---

## PART C — GOOGLE SEARCH & ANALYTICS

### C1. Google Search Console
1. Add the verified site property `https://paradelle.store/` in Google Search Console. DNS/domain verification is preferred when you control the DNS zone; otherwise use the URL-prefix property.
2. For HTML-tag verification, place only the token value from Google's provided tag in `GOOGLE_SITE_VERIFICATION` in the hosting environment. The root layout emits Google's verification metadata only when this value is set. No verification token is stored in the repository.
3. Redeploy, use Search Console's Verify action, then submit `https://paradelle.store/sitemap.xml` under **Sitemaps**.
4. Inspect `https://paradelle.store/robots.txt`, test a representative product URL and review indexing/canonical reports after Google recrawls the site.
5. Keep `NEXT_PUBLIC_SITE_URL=https://paradelle.store` in the production environment. Confirm the domain is attached to the hosting project and HTTPS is active. The app permanently redirects requests on `paradelle.in` and `www.paradelle.store` to the canonical host once those domains resolve to the deployment; configure the aliases/DNS in the hosting provider.

### C2. Google Analytics 4
1. Create a GA4 property and web data stream in Google's console, then copy the real Measurement ID (`G-…`). No analytics ID is assumed or fabricated here.
2. Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` in the hosting environment and redeploy. The GA tag is disabled when the variable is blank or malformed; page-view events cover initial loads and App Router path changes.
3. Before enabling it for customers, review the privacy notice and any consent requirements that apply to your audience and analytics configuration. Test Realtime reports and ensure only one page view is recorded per navigation.

---

## PART D — QUICK REFERENCE: files that implement each step

| Capability | Location |
|---|---|
| Server order creation | `src/app/api/checkout/razorpay/route.ts` |
| Browser Standard Checkout | `src/lib/razorpay-client.ts` + `src/components/checkout-form.tsx` |
| Signature + amount re-verification | `src/app/api/checkout/verify/route.ts` |
| Webhook (signature, idempotent, out-of-order) | `src/app/api/webhooks/razorpay/route.ts` |
| Atomic fulfilment/fulfilment gate | `src/lib/payments-core.ts` |
| Refunds (full/partial, restock, emails) | `src/lib/admin/order-actions.ts` |
| Product media rows/CDN | `scripts/upload-media.ts`, `product_images` table |
| RLS policies | `supabase/migrations/20260104_phase3_backend.sql` |
