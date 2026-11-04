# PARADELLE CHOCOLATES — Phase 4: Testing & Production Release Report

Date: 2026-11-04 · Tested against the production build (`next build` + `next start`) on the live preview.
Frameworks: Node fetch batteries, Bash/curl+OpenSSL payment suite, Playwright (Chromium 156), Lighthouse 12.
Every reported number below was measured, not estimated.

## Executive verdict

**148 / 148 automated checks pass.** Zero P0/P1 open. **Recommendation: GO for staged production launch** (Razorpay test-mode block lift → live keys after go-live checklist in `docs/BACKEND.md` §8).

## Suites (all re-runnable)

| Suite | File | Result |
|---|---|---|
| Functional (pages, APIs, validation, auth boundaries, admin surface) | `tests/functional.mjs` | 54/54 |
| Payment lifecycle (capture, duplicates, out-of-order, forged sig, mismatch, failure, refunds, COD absence) | `tests/payments.sh` | 20/20 |
| Security (injection, XSS, forced-role access, rate limits, webhook fuzz, secret exposure) | `tests/security.mjs` | 12/12 |
| UI/mobile (6 viewports × 7 pages overflow/console/tap-target sweeps, E2E purchase, real admin login, LCP/CLS probes) | `tests/ui.mjs` | 62/62 |

## Payment testing evidence (all on test fixtures — no real charges)

- `payment.captured` → atomic flip to `paid`, stock −qty, reservations released, verified ledger row ✓
- Duplicate delivery → `{duplicate:true}`, stock/ledger unchanged ✓
- `order.paid` before `payment.captured` → settles once; late capture answered `already-processed` ✓
- Forged signature → 401, state untouched, event not persisted ✓
- Amount mismatch → quarantined `amount-mismatch`, order stays `payment_pending` ✓
- `payment.failed` → holds released, order remains retry-payable (`/pay/[order]`) ✓
- Stray `refund.processed` → tolerated + persisted for audit ✓
- COD: zero code paths in `src/app/api`, `src/lib`, `src/db` ✓

## Security audit (OWASP-oriented)

- SQL injection probes (search, export filters) inert — Drizzle parameterisation ✓
- Stored XSS probe from contact form renders entity-escaped in admin inbox ✓
- Permission forcing: staff without a permission is redirected (307) server-side ✓
- Rate limiting: newsletter/contact/checkout/cart/payments/reports throttled; auth actions throttled by IP ✓
- Secrets: none in public HTML or static bundles; webhook secret sandbox-only ✓
- Sessions: httpOnly + SameSite=Lax + Secure(prod); scrypt salted hashes; admin/customer cookie isolation ✓
- CSRF: server actions are POST + Next origin checks; cookies SameSite=Lax ✓

## Mobile & UX (Playwright, measured)

- 360/390/430/768/1024/1440px: **zero horizontal overflow**, zero console errors, all images resolve.
- E2E @390px: stepper → add to bag → cart progress bar → checkout totals → guest-first → Razorpay stated → no COD.
- Admin login through the real form (not a backdoor) → dashboard renders KPIs + low stock + products.

## Performance & SEO (Lighthouse 12, lab)

| Page | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Home | 97–100 | 100 | 100 | 100 | 2.34–2.5 s (median across runs) | 0 | 70–80 ms |
| PDP | 99 | 100 | 100 | 100 | 1.8 s | 0 | 50 ms |
| Collection | 99 | 100 | 100 | 100 | 2.1 s | 0 | — |
| Checkout | 99 | 100 | 100 | noindex by design | 1.8 s | 0.019 | 90 ms |
| Cart | 99 | 100 | 100 | noindex by design | 1.8 s | 0.046 | — |

Targets met: LCP ≤ 2.5 s ✓ · CLS ≤ 0.1 ✓ · TBT ≤ 200 ms proxy for INP ✓ (lab, simulated mobile 4G).
Structured data: Organization + WebSite JSON-LD (home), Product JSON-LD with INR Offer per PDP; `/sitemap.xml` + `/robots.txt` (admin/api/checkout disallowed).

## Bug-fix history (this phase)

| # | Sev | Symptom | Root cause | Fix |
|---|---|---|---|---|
| 1 | P1 | Newsletter re-subscribe → 500 | pg unique-violation code wrapped inside `DrizzleQueryError.cause` | code read from `err.code ?? err.cause.code` (`newsletter/route.ts`) |
| 2 | P2 | CSV exports empty → no headers | `toCsv` had no headers without rows | explicit headers per exporter; empty exports now spreadsheet-valid |
| 3 | P2 | Console 401 noise on every page for guests | cart sync answered 401 to anonymous | anonymous answers 200 `{anonymous:true}`; provider skips sync |
| 4 | P3 | a11y 93 (home) | drawer focusable while `aria-hidden`; dark small-print contrast 3.8:1; logo name/label mismatch | `inert` on closed drawer; contrast tokens raised; decorative logos alt-less |
| 5 | P3 | PDP a11y/SEO 96/92 | breadcrumb/counter contrast; 8 px dot targets | contrast raised; dots now 28 px hit area with 8 px visual |
| 6 | P1 | Checkout CLS 0.353 (lab) | hydration swapped skeleton↔empty-state geometry | hydration shell renders identical card geometry; CLS 0.019 |
| 7 | P2 | Collection heading-order fails | h1→h3 skip in cards grid | sr-only h2 “Products” |
| 8 | P1 | Payment battery 7/13 after rebuild | sandbox snapshot reverted `.env`, dropping `RAZORPAY_WEBHOOK_SECRET`; route honestly 503’d | secret re-provisioned; battery now has a PREFLIGHT that fails loudly on missing config instead of red herrings |
| 9 | P2 | PDP horizontally overflowed at 360/390px after new photography | 4×80px thumbnails + counter exceeded width | thumbnail strip is `grid-cols-4 aspect-square`; counter moved onto the hero frame |
| 10 | P2 | Rate limits missing on lead/auth surfaces | only commerce APIs throttled | newsletter/contact 5/min, logins/registers 8–10/min per IP |

Env note: `.env` mutations are sandbox-local (snapshots may revert them); production secrets go in Vercel/Supabase dashboards — never the repo.

## Remaining known limits (documented, none blocking launch)

- Lighthouse “PDP meta description” warning is a **verified false positive** (tag confirmed inside `<head>` at byte 3185 via raw HTML; all other pages clean).
- In-memory rate limiter is per-instance — swap store to Upstash for multi-region concurrency hooks (interface identical).
- Supabase Auth bridge optional later; media upload script `scripts/upload-media.ts` awaits project keys.
- Real-device INP (CrPS) unmeasurable in lab; field monitoring recommended post-launch.

## Production readiness checklist

Database migration applied + seeded (idempotent) ✓ · prod build ✓ · HTTPS preview ✓ · webhooks over HTTPS ✓ · env template ✓ · rollback = `git revert` + Vercel instant rollback + DB migration is additive ✓ · error monitoring: console server logs now; wire Sentry DSN when provisioned.

**Release recommendation: GO — staged** (launch with Razorpay test-mode rehearsal on the production domain first, then flip `rzp_live_*` keys).
