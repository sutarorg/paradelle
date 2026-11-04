# PARADELLE — Backend, Payments, Database, Security & Deployment (Phase 3)

> Status: integration-complete, **production-pending Phase 4 load/penetration testing**.
> Nothing here claims production readiness until Phase 4 certifies it.

---

## 1. Architecture

```
Browser (storefront)                Browser/admin                 Razorpay
      │                                 │                            │
      ▼                                 ▼                            ▼
Next.js App Router  ──►  src/app/api/* route handlers  ──►  PostgreSQL (Supabase)
(server components,              │                                  ▲
 Zod-validated JSON)             │   ┌──────────────────────────────┘
                                 │   │  /api/webhooks/razorpay  (signed, idempotent)
                                 └──►│  /api/checkout/verify    (signature + re-fetch)
                                     └──────────────────────────────┘
```

- **One database** for storefront + admin. The server connects as the DB owner/service role over `DATABASE_URL` and enforces authorization in code; **RLS policies** (see §3) additionally guard any direct Supabase anon/authenticated client path.
- **Money is integer paise everywhere** in the database and commerce engine. `formatINR()` renders rupees. Admin forms accept ₹ and convert with `toPaise()`.
- **Historical snapshots:** `order_items` carry `unit_price`/`line_total` at purchase time; admin price edits never rewrite history.
- **Timezone:** Asia/Kolkata in reports/series (`to_char … at time zone 'Asia/Kolkata'`); timestamps stored `timestamptz`.

## 2. Schema reference (Phase 3 new/changed)

| Table | Purpose | Key constraints |
|---|---|---|
| `profiles` | customer profile mirror | `id` = user id; role check |
| `addresses` | saved addresses | FK cascade, PIN check `^\d{6}$` |
| `carts` / `cart_items` | signed-in cart sync | unique(user), unique(cart,slug), qty 1–99 |
| `inventory_reservations` | 24 h unpaid-order holds | FK cascade, qty>0, (released, expires) index |
| `payments` | gateway ledger | unique `razorpay_payment_id`, `verified` flag |
| `refunds` | refund lifecycle | requested → processed/rejected |
| `razorpay_webhook_events` | event log + idempotency | unique `event_key` |
| `coupon_redemptions` | one redemption per order | unique(order,coupon) |
| `shipping_rules` | admin-editable charges | default ₹99 / free ≥ ₹499 (paise) |
| (Phase 1–2) users, sessions, admins, admin_sessions, activity_logs, products, product_images, stock_movements, orders, order_items, coupons, settings, site_content, pincodes, newsletter_subscribers, contact_messages | | indexed; products have `CHECK (mrp ≥ price, stock ≥ 0)` |

New food-label columns on `products`: `fssai_license`, `manufacturer`, `net_quantity_label`, `country_of_origin`, `best_before_months` — **left blank until pack copy is final; never fabricated.**

Migration: `supabase/migrations/20260104_phase3_backend.sql` — idempotent; converts legacy rupee integers to paise (guarded), adds constraints/indexes, enables RLS when the `auth` schema exists (Supabase).

## 3. Row Level Security

RLS protects the **anon/authenticated** PostgREST access paths; the Next.js server uses the service connection (owner bypasses RLS) and enforces rules in code (`requireAdmin`, `getSessionUser`).

Policies installed: public read of active products + images; customers `user_id = auth.uid()` on their own orders/items/addresses/profile/cart; public read of active coupons & serviceable PINs & CMS; admin-wide reads gated on the `admins` table via JWT email. If you later adopt Supabase Auth client-side, no policy changes are needed — profiles `id` already matches `auth.users.id`.

## 4. Inventory integrity (no overselling)

1. **Checkout** (`POST /api/checkout`): one `db.transaction()` — row-locks products (`FOR UPDATE`), computes availability as `stock − active reservations`, inserts order → items → **reservations (24 h TTL)**. Any contention throws; nothing half-writes.
2. **Capture** (`confirmPayment`): transaction — insert verified payment, flip `payment_pending → paid`, decrement stock (`greatest(stock − qty, 0)` + `sale` movement), release reservations, redeem coupon exactly once (unique constraint + atomic `used_count + 1`). Already-paid orders return `already-processed` → **duplicate events cannot double-decrement stock.**
3. **Failure/expiry:** `payment.failed` releases holds (order stays payable → retry-safe); a lazy sweep releases expired holds on every availability read; admin cancel releases too.
4. **Restock:** full refunds on unshipped orders write positive `stock_movements` automatically.

## 5. Razorpay flows (the only gateway — COD is impossible by design)

| Endpoint | Behaviour |
|---|---|
| `POST /api/checkout` | Zod-validate → PIN serviceability → server totals (DB prices/shipping/coupon rules) → transactional order+reservations → `order_reserved` email |
| `POST /api/checkout/razorpay` | creates/reuses the gateway order (receipt = order number); records `payments(status='created')`; returns public `key_id` — secrets never leave the server |
| `POST /api/checkout/verify` | verifies `HMAC( key_secret, order_id\|payment_id )` → **re-fetches the payment from Razorpay** → reconciles amount in paise → `confirmPayment`. Browser callbacks alone never fulfil. Unreachable gateway → 202, webhook completes |
| `POST /api/webhooks/razorpay` | raw-body HMAC vs `x-razorpay-signature` (constant-time); `event_key` uniqueness → duplicate/no-op; handles `payment.captured`, `order.paid` (out-of-order settle), `payment.failed` (release + retry-safe), `refund.processed` (ledger + email); persists every event with result; always 200s after validation |
| Admin “Process at gateway” | full/partial refunds via `POST /v1/payments/{id}/refund`; refundable-balance checked against processed refunds; full refund on unshipped order auto-cancels + restocks |
| `/pay/[orderNumber]` | customer retry page; creating a new attempt is safe and server-priced |

Fulfillment gate: only orders whose money came through a `verified` captured payment may advance. The admin UI has **no “mark paid”** control; the state machine rejects it server-side too.

### Test-mode plan (rzp_test_*)
1. Set test keys in env; create an order → Razorpay modal opens in test mode → pay with test UPI `success@razorpay`.
2. Configure webhook URL `https://<domain>/api/webhooks/razorpay` (test mode dashboard) with your test webhook secret; subscribe to `payment.captured, payment.failed, order.paid, refund.processed`.
3. Verify: order flips paid, stock decrements once, admin → payments shows verified row, duplicate delivery is a logged no-op (see `razorpay_webhook_events`).
4. Offline verification (used in Phase 3 tests here): craft payloads + `openssl dgst -sha256 -hmac "$RAZORPAY_WEBHOOK_SECRET"` — covers signature, idempotency, mismatch, failure paths without network.

## 6. Security controls

- **Auth:** scrypt(password, random 16 B salt, 64 B) hashes; separate cookie scopes for customers (`paradelle_session`) and admins (`paradelle_admin`), httpOnly, Secure in prod, SameSite=Lax.
- **Authorization:** per-page `requireAdmin(permission)`; staff nav/server both restricted; customers always filtered to own rows.
- **Validation:** Zod at every public API boundary; native form constraints in admin; server re-computes ALL money.
- **Rate limiting:** sliding-window per IP on checkout/payments/cart/newsletter/contact/reports (`src/lib/ratelimit.ts`; swap store to Upstash for multi-instance Vercel).
- **Uploads:** type/size checked (≤5 MB, image/*), randomised names, Supabase Storage when configured.
- **Secrets:** only non-`NEXT_PUBLIC` envs on server; Razorpay keys never serialized to the client (only the public `key_id`).
- **Audit:** `activity_logs` for every admin mutation incl. logins; webhook log for every payment event.
- **Errors:** user-safe messages; server logging with `console.error`; no stack traces to clients.

## 7. Notifications

`src/lib/email.ts` — templates: reservation, payment confirmation, shipment (tracking), refund, contact-form notification, and a cumulative newsletter-subscriber list sent to `CONTACT_NOTIFICATION_EMAIL`. Provider: Resend (`RESEND_API_KEY` / `RESEND_FROM`); inbound notifications additionally require `ENABLE_INBOUND_EMAIL_NOTIFICATIONS=true`. Contact/newsletter endpoints report delivery failures instead of claiming a notification was sent.

## 8. Deployment (GitHub → Vercel + Supabase)

```bash
# 1. Supabase: create project → get pooled connection string
# 2. Apply schema
psql "$DATABASE_URL" -f supabase/migrations/20260104_phase3_backend.sql
ADMIN_EMAIL=admin@paradelle.store ADMIN_INITIAL_PASSWORD='<unique secure password>' npx tsx scripts/seed.ts
psql "$DATABASE_URL" -f supabase/migrations/20261104_storefront_media_shipping.sql
npx tsx scripts/upload-media.ts   # uploads 16 supplied photos to Storage bucket product-media
# 3. Vercel: import repo, set envs from .env.example (test keys first!)
# 4. Razorpay dashboard (TEST): webhook https://<domain>/api/webhooks/razorpay
# 5. Smoke: place test order with success@razorpay → verify webhook flip → admin sees verified payment
```

## 9. Known limits before Phase 4 sign-off

- In-memory rate limiting is single-instance (documented Upstash swap).
- Supabase Auth bridge: storefront uses its own hardened sessions; profiles are authored to merge with `auth.users` 1:1 when the bridge is enabled.
- Payment-link emails for unpaid reservations require the email provider key.
