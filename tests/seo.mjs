#!/usr/bin/env node
/** HTTP-level SEO smoke audit for the 16 target storefront URLs. */
const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const SITE_ORIGIN = process.env.SITE_ORIGIN || "https://paradelle.store";
const URLS = [
  "/",
  "/collection",
  "/product/signature-milk",
  "/product/signature-dark",
  "/product/crunchy-nut",
  "/product/pistachio-filled",
  "/our-story",
  "/craftsmanship",
  "/contact",
  "/faqs",
  "/legal/shipping",
  "/legal/refunds",
  "/legal/privacy",
  "/legal/terms",
  "/login",
  "/register",
];
const NOINDEX = new Set(["/login", "/register"]);
const EXPECTED_PRODUCT_PRICES = {
  "/product/signature-milk": 450,
  "/product/signature-dark": 550,
  "/product/crunchy-nut": 500,
  "/product/pistachio-filled": 700,
};

let passed = 0;
let failed = 0;
const records = [];
function check(label, ok, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`PASS ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}
function decode(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
function attrs(tag) {
  const result = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return result;
}
function metaValues(html) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => attrs(match[0]));
}
function getMeta(html, key, value) {
  const item = metaValues(html).find((meta) => meta[key] === value);
  return item?.content ?? "";
}
function jsonLd(html) {
  return [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].flatMap((match) => {
    try {
      const parsed = JSON.parse(match[1]);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  });
}

const internalPaths = new Set();
for (const path of URLS) {
  const response = await fetch(`${BASE}${path}`);
  const html = await response.text();
  check(`${path} responds successfully`, response.status === 200, `HTTP ${response.status}`);

  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  const description = getMeta(html, "name", "description");
  const canonical = attrs(html.match(/<link\b[^>]*rel="canonical"[^>]*>/i)?.[0] ?? "").href ?? "";
  const robots = getMeta(html, "name", "robots");
  const viewport = getMeta(html, "name", "viewport");
  const ogTitle = getMeta(html, "property", "og:title");
  const ogDescription = getMeta(html, "property", "og:description");
  const ogImage = getMeta(html, "property", "og:image");
  const twitterCard = getMeta(html, "name", "twitter:card");
  const twitterTitle = getMeta(html, "name", "twitter:title");
  const twitterDescription = getMeta(html, "name", "twitter:description");
  const twitterImage = getMeta(html, "name", "twitter:image");
  const structuredData = jsonLd(html);
  const links = [...html.matchAll(/<a\b[^>]*href=(?:"([^"]*)"|'([^']*)')[^>]*>/gi)].map((match) => decode(match[1] ?? match[2] ?? ""));
  const imageTags = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => attrs(match[0]));
  const canonicalPath = path === "/" ? SITE_ORIGIN : new URL(path, `${SITE_ORIGIN}/`).toString();

  check(`${path} has a title`, title.length > 0);
  check(`${path} has a meta description`, description.length > 0);
  check(`${path} has a device-width viewport`, /width=device-width/i.test(viewport), viewport);
  check(`${path} canonical matches configured host`, canonical === canonicalPath, canonical);
  check(`${path} has unique Open Graph and Twitter metadata`, Boolean(ogTitle && ogDescription && ogImage && twitterCard === "summary_large_image" && twitterTitle && twitterDescription && twitterImage));
  check(`${path} has one H1`, (html.match(/<h1\b/gi) ?? []).length === 1, `found ${(html.match(/<h1\b/gi) ?? []).length}`);
  check(`${path} image elements include alt attributes`, imageTags.every((image) => Object.hasOwn(image, "alt")), `${imageTags.filter((image) => !Object.hasOwn(image, "alt")).length} missing`);
  check(`${path} indexing directive is correct`, NOINDEX.has(path) ? /noindex/i.test(robots) && /follow/i.test(robots) : /index/i.test(robots) && !/noindex/i.test(robots), robots);

  for (const href of links) {
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const target = new URL(href, BASE);
    internalPaths.add(`${target.pathname}${target.search}`);
  }

  records.push({ path, title, description, ogImage, structuredData });

  if (EXPECTED_PRODUCT_PRICES[path]) {
    const product = structuredData.find((entry) => entry?.["@type"] === "Product");
    check(`${path} has Product and Offer JSON-LD`, Boolean(product?.offers?.["@type"] === "Offer"));
    check(`${path} structured price is the current INR price`, product?.offers?.price === EXPECTED_PRODUCT_PRICES[path], String(product?.offers?.price));
    check(`${path} has a valid stock-derived Offer availability`, ["https://schema.org/InStock", "https://schema.org/OutOfStock"].includes(product?.offers?.availability));
    check(`${path} includes product description and no fabricated ratings`, Boolean(product?.description) && !product?.aggregateRating && !product?.review);
    check(`${path} includes BreadcrumbList JSON-LD`, structuredData.some((entry) => entry?.["@type"] === "BreadcrumbList"));
  }
}

check("all 16 titles are unique", new Set(records.map((record) => record.title)).size === URLS.length);
check("all 16 meta descriptions are unique", new Set(records.map((record) => record.description)).size === URLS.length);
check("all 16 social image URLs are unique", new Set(records.map((record) => record.ogImage)).size === URLS.length);

const homepageData = records.find((record) => record.path === "/").structuredData;
check("homepage includes Organization JSON-LD", homepageData.some((entry) => entry?.["@type"] === "Organization"));
check("homepage includes WebSite JSON-LD linked to the Organization publisher", homepageData.some((entry) => entry?.["@type"] === "WebSite" && entry?.publisher?.["@id"] === `${SITE_ORIGIN}/#organization`));
check("indexable non-home URLs include BreadcrumbList JSON-LD", records.filter(({ path }) => path !== "/" && !NOINDEX.has(path)).every((record) => record.structuredData.some((entry) => entry?.["@type"] === "BreadcrumbList")));

const sitemapResponse = await fetch(`${BASE}/sitemap.xml`);
const sitemap = await sitemapResponse.text();
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
check("sitemap is served as valid XML", sitemapResponse.status === 200 && /<urlset[\s>]/.test(sitemap));
check("sitemap contains only 14 indexable target URLs", sitemapUrls.length === 14, `found ${sitemapUrls.length}`);
check("sitemap excludes login and registration", !sitemap.includes(`${SITE_ORIGIN}/login`) && !sitemap.includes(`${SITE_ORIGIN}/register`));
check("sitemap URLs use the canonical domain", sitemapUrls.every((url) => url.startsWith(SITE_ORIGIN)));

const robotsResponse = await fetch(`${BASE}/robots.txt`);
const robots = await robotsResponse.text();
check("robots.txt points to the canonical sitemap", robotsResponse.status === 200 && robots.includes(`${SITE_ORIGIN}/sitemap.xml`));
check("robots.txt allows login/register to be crawled for noindex", !/Disallow:\s*\/(login|register)/i.test(robots));

for (const record of records) {
  const imagePath = new URL(record.ogImage).pathname;
  const response = await fetch(`${BASE}${imagePath}`);
  check(`${record.path} social image exists`, response.status === 200, `HTTP ${response.status}: ${imagePath}`);
}

for (const path of [...internalPaths].sort()) {
  const response = await fetch(`${BASE}${path}`);
  check(`internal link ${path} is not broken`, response.status < 400, `HTTP ${response.status}`);
}

console.log(`\nSEO HTTP audit: ${passed} passed, ${failed} failed; ${URLS.length} target URLs and ${internalPaths.size} internal destinations.`);
process.exitCode = failed ? 1 : 0;
