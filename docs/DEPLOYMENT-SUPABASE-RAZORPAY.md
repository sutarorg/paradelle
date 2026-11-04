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
2. Seed reference data (products + images, coupons, settings, super admin):
```bash
DATABASE_URL="<direct string, port 5432>" npx tsx scripts/seed.ts
```
3. *(Optional)* `DATABASE_URL="<direct>" npx drizzle-kit push` afterwards reconciles any microscopic drift against the Drizzle schema — safe either way.

Verify: **Table Editor → `products` has 4 rows**; **Authentication → Policies** lists e.g. "customers read own orders", "public reads active products".

### A4. Media storage (16 product photos + hero + gifting)
1. **Storage → New bucket** → name `product-media`, **Public: ON**.
2. Add to env (Vercel + this script): `SUPABASE_URL=https://<ref>.supabase.co`, `SUPABASE_SERVICE_ROLE_KEY=<service_role key>` (Settings → API).
3. Run: `npx tsx scripts/upload-media.ts` — creates the bucket if missing, uploads all files, and **rewrites `product_images.url` to CDN URLs** (positions/alts preserved).
4. Verify: open one URL in a browser; storefront images still render (they now come from Supabase CDN).

### A5. Set the seeded admin password
Sign in at `/admin/login` with `admin@paradelle.store / Iskcon@098` → **Settings → change password immediately**.

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
NEXT_PUBLIC_SITE_URL=https://<your-domain>
RESEND_API_KEY=…  RESEND_FROM="PARADELLE <orders@your-domain>"   # optional but recommended
```

### B3. Configure the webhook (TEST mode dashboard)
**Settings → Webhooks → Add New Webhook**:
- URL: `https://<your-domain>/api/webhooks/razorpay`
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

## PART C — QUICK REFERENCE: files that implement each step

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
