# SEO implementation report — Paradelle

**Prepared:** 4 November 2026

**Canonical site:** `https://paradelle.store`

**Status:** The supplied metadata/keyword targets are implemented and the HTTP smoke audit passes. Live Google Search Console recrawl and third-party verification remain outstanding.

## Summary

This change implements the exact title, description and keyword mapping supplied for all 16 requested storefront URLs while preserving the existing visual design and commerce flows. The site and organization names are consistently emitted as **Paradelle Chocolates**, with a crawlable logo/favicon and explicit crawl allowances for the requested pages and sitemap.

The requested `meta keywords` tags are included for completeness. Google does not use the keywords tag as a ranking signal; titles, descriptions, structured data and on-page content remain the primary supplied signals.

## Implemented

- **Page metadata:** shared helper for absolute page titles, descriptions, keywords, canonical URLs, Open Graph and Twitter cards. All 16 requested target pages use the supplied title and description, and matching page-specific keyword tags. Root metadata names the site **Paradelle Chocolates** and exposes the crawlable 500×500 PNG logo as favicon/apple icon.
- **Robots and sitemap:** all 16 requested URLs, including `/login` and `/register`, are indexable and listed in the sitemap. The sitemap is statically generated from the four-code product registry, so it does not depend on the database. `robots.txt` explicitly allows every target path and `/sitemap.xml`, while keeping admin/API/account/transaction routes disallowed.
- **Structured data:** homepage Organization and WebSite entities both use the name **Paradelle Chocolates**, with WebSite publisher linked to the Organization and a crawlable logo; product pages emit Product and stock-aware Offer data using catalogue price, SKU, description, weight and seller; editorial and product pages emit BreadcrumbList JSON-LD. No ratings, reviews or certifications were fabricated.
- **Page content and accessibility:** the route audit confirms one H1 on each of the 16 target routes. Product gallery fallback alt text is descriptive, and existing product content, internal links and visible product/legal breadcrumbs were retained.
- **Performance foundation:** DM Sans and Playfair Display now load from local WOFF2 files; Next Image is configured for AVIF/WebP with a 24-hour minimum cache TTL and the existing public Supabase storage path. No visual redesign was made.
- **Host normalization:** permanent redirects are configured for `paradelle.in` and `www.paradelle.store` to `https://paradelle.store`. The domain aliases must resolve to the deployment for these application redirects to run.
- **Analytics preparation:** optional Search Console HTML-tag verification and GA4 hooks are environment-gated. No verification token or Measurement ID has been supplied or added. Deployment instructions document configuration and privacy review.

## Target routes audited

`/`, `/collection`, `/product/signature-milk`, `/product/signature-dark`, `/product/crunchy-nut`, `/product/pistachio-filled`, `/our-story`, `/craftsmanship`, `/contact`, `/faqs`, `/legal/shipping`, `/legal/refunds`, `/legal/privacy`, `/legal/terms`, `/login`, `/register`.

All 16 requested routes are indexable and listed in the sitemap; private account, cart, checkout, payment and admin utilities remain excluded.

## Validation performed

- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:1/app_db' NEXT_PUBLIC_SITE_URL=https://paradelle.store npm run build` — passed.
- `BASE_URL=http://127.0.0.1:3000 SITE_ORIGIN=https://paradelle.store npm run seo:audit` — **273 passed, 0 failed**. Checks include exact titles/descriptions/keywords, `Paradelle Chocolates` site-name metadata and structured data, favicon/logo fetch, indexing directives, sitemap URLs, robots allowances, images and internal links.
- The sitemap function returned all 16 entries without `DATABASE_URL`; the built `/sitemap.xml` and `/robots.txt` both returned HTTP 200, with the logo served as `image/png`.

The build and HTTP audit used a local placeholder database URL so the app exercised its fallback catalogue/content. The production database was not connected; recheck live product prices, inventory-derived availability and CMS content against the real deployment. Google Search Console must recrawl the updated site before its result labels/status are reflected.

## Outstanding / not verified

1. **Google recrawl:** submit `https://paradelle.store/sitemap.xml` in Search Console and request indexing for the updated home page. Google chooses the site-name display and may take time to reflect the structured-data and title changes.
2. **Real deployment:** verify HTTPS, domain aliases, the production `NEXT_PUBLIC_SITE_URL=https://paradelle.store`, canonical tags and the sitemap after deployment.
3. **Search Console and GA4:** configure real verification/measurement values only after creating the corresponding Google properties. Confirm privacy/consent requirements before enabling analytics.
4. **Browser and Core Web Vitals testing:** the Playwright Chromium executable was unavailable in this environment. The replacement audit is HTTP/HTML-level; it does not measure mobile overflow, client-side console errors, visual interaction, Lighthouse scores or field Core Web Vitals. Run a browser/Lighthouse and field-data check after deployment.
5. **Dependency security:** `npm ci` reported 23 dependency audit findings (1 low, 14 moderate, 7 high, 1 critical). Dependency remediation was not included; review separately and avoid an unreviewed breaking audit fix.
