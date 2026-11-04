#!/usr/bin/env bash
# Push the completed platform and open the Phase 1–4 pull request.
# Requires: export GITHUB_TOKEN=<fine-grained PAT with repo:contents + pull_requests on sutarorg/paradelle>
set -euo pipefail
REPO="sutarorg/paradelle"
BRANCH="paradelle/complete-platform"

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "Set GITHUB_TOKEN first (GitHub → Settings → Developer settings → Fine-grained tokens → $REPO, Contents + Pull requests: Read & Write)."
  exit 1
fi

git push "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git" "${BRANCH}"

BASE=$(curl -s -H "Authorization: Bearer ${GITHUB_TOKEN}" "https://api.github.com/repos/${REPO}" | python3 -c 'import json,sys; print(json.load(sys.stdin)["default_branch"])')

curl -s -X POST -H "Authorization: Bearer ${GITHUB_TOKEN}" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${REPO}/pulls" \
  -d "$(python3 -c 'import json; print(json.dumps({
    "title": "PARADELLE CHOCOLATES — complete platform (Phases 1–4)",
    "head": "paradelle/complete-platform",
    "base": "'"$BASE"'",
    "body": "## Scope\n\n- **Phase 1** — luxury storefront: hero, collection with search/sort, 4 PDPs with galleries, cart, guest-first checkout, accounts with order tracking, FAQs, policies, contact\n- **Phase 2** — protected `/admin` dashboard: role-based staff, KPIs, product CRUD + images, inventory with movements, order fulfilment/tracking/invoices, coupons, shipping, PIN serviceability, CMS, reports, CSV exports, activity logs\n- **Phase 3** — production backend: integer-paise money, stock reservations, transactional checkout, Razorpay lifecycle (server order creation, Standard Checkout, signature + amount verification, signed idempotent webhooks, refunds), Zod APIs, rate limiting, Supabase migration with RLS\n- **Phase 4** — 148 automated checks (functional 54 · payments 20 · security 12 · UI/mobile 62), Lighthouse 96–100, accessibility fixes, real product photography (16 assets)\n\n## Evidence\n\n- `docs/PHASE4-RELEASE.md` — full test report + release verdict (GO, staged)\n- `docs/BACKEND.md` — DB/RLS/payments/security/deployment contract\n- Tests: `node tests/functional.mjs`, `bash tests/payments.sh`, `node tests/security.mjs`, `node tests/ui.mjs`\n\n**Payment gateway:** Razorpay only, prepaid. No Cash on Delivery anywhere.\n**Secrets:** none committed — use Vercel env + Razorpay test keys first (`.env.example`)."
  }))')" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("PR created:", d["html_url"])'
