# SEO implementation report — Paradelle

**Prepared:** 4 November 2026

**Canonical site:** `https://paradelle.store`

**Status:** Technical implementation and HTTP smoke audit complete; exact supplied metadata/keyword targets and live third-party verification remain outstanding.

## Summary

This change establishes a technical SEO foundation for the Paradelle storefront while preserving its existing visual design and commerce flows. Current page titles and descriptions are usable draft copy based on the existing catalogue and site content. They are **not** represented as the exact 16 metadata sets requested: those sets were not available in the working context. Replace/confirm the draft metadata and apply the keyword targets once the user resends the URL/title/description/keyword mapping.

No `meta keywords` tag was added. Google does not use it for ranking; the supplied target phrases should be incorporated naturally into relevant page titles, descriptions, headings and product copy without keyword stuffing.

## Implemented

- **Page metadata:** shared helper for absolute page titles, descriptions, canonical URLs, Open Graph and Twitter cards. Public target pages have unique titles, descriptions and social-image URLs. Root metadata includes a canonical host and social card.
- **Robots and sitemap:** `/login` and `/register` emit `noindex, follow` and remain crawlable so search engines can see that directive. Sitemap contains the 14 intended indexable content/product URLs and excludes login, registration and private/transactional routes. `robots.txt` publishes the canonical sitemap and does not block login/registration.
- **Structured data:** homepage Organization and WebSite entities, with WebSite publisher linked to the Organization; product pages emit Product and stock-aware Offer data using catalogue price, SKU, description, weight and seller; every intended indexable non-home route emits BreadcrumbList JSON-LD. No ratings, reviews or certifications were fabricated.
- **Page content and accessibility:** the route audit confirms one H1 on each of the 16 target routes. Product gallery fallback alt text is descriptive, and existing product content, internal links and visible product/legal breadcrumbs were retained.
- **Performance foundation:** DM Sans and Playfair Display now load from local WOFF2 files; Next Image is configured for AVIF/WebP with a 24-hour minimum cache TTL and the existing public Supabase storage path. No visual redesign was made.
- **Host normalization:** permanent redirects are configured for `paradelle.in` and `www.paradelle.store` to `https://paradelle.store`. The domain aliases must resolve to the deployment for these application redirects to run.
- **Analytics preparation:** optional Search Console HTML-tag verification and GA4 hooks are environment-gated. No verification token or Measurement ID has been supplied or added. Deployment instructions document configuration and privacy review.

## Target routes audited

`/`, `/collection`, `/product/signature-milk`, `/product/signature-dark`, `/product/crunchy-nut`, `/product/pistachio-filled`, `/our-story`, `/craftsmanship`, `/contact`, `/faqs`, `/legal/shipping`, `/legal/refunds`, `/legal/privacy`, `/legal/terms`, `/login`, `/register`.

The first 14 are intended to be indexable; `/login` and `/register` are `noindex, follow` and excluded from the sitemap.

## Validation performed

- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:1/app_db' NEXT_PUBLIC_SITE_URL=https://paradelle.store npm run build` — passed.
- `BASE_URL=http://127.0.0.1:3000 SITE_ORIGIN=https://paradelle.store npm run seo:audit` — **212 passed, 0 failed**. Checks include HTTP success, title/description presence and uniqueness, canonicals, device-width viewport, one H1, image alt attributes, indexing directives, unique social metadata, structured data, sitemap/robots rules, social image responses and internal-link destinations.

The build and HTTP audit used an intentionally unreachable local database URL so the app exercised its fallback catalogue/content. The production database was not connected; recheck live product prices, inventory-derived availability, dynamic catalogue membership and CMS content against the real deployment.

## Outstanding / not verified

1. **Exact metadata and keyword targets:** resend the 16-row mapping (`URL | exact title | exact description | target keywords`). Existing copy is provisional until reconciled. Apply targets naturally in page content; do not add a meta keywords tag.
2. **Real deployment:** verify HTTPS, domain aliases and redirects after DNS/hosting configuration; confirm the live sitemap and canonical tags against production data.
3. **Search Console and GA4:** set real values in deployment only after creating/verifying the corresponding Google properties. Submit the sitemap and confirm privacy/consent requirements before enabling analytics.
4. **Browser and Core Web Vitals testing:** the Playwright Chromium executable was unavailable in this environment. The replacement audit is HTTP/HTML-level; it does not measure mobile overflow, client-side console errors, visual interaction, Lighthouse scores or field Core Web Vitals. Run a browser/Lighthouse and field-data check after deployment.
5. **Dependency security:** `npm ci` reported 30 dependency audit findings (1 low, 21 moderate, 7 high, 1 critical). Dependency remediation was not included; review separately and avoid an unreviewed breaking audit fix.
