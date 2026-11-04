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
const EXPECTED_METADATA = {
  "/": {
    title: "Premium Chocolates Online in India | Paradelle Chocolates",
    description: "Explore Paradelle Chocolates, a premium chocolate brand featuring Signature Milk, Signature Dark, Crunchy Nut and Pistachio Filled chocolate bars.",
    keywords: ["Paradelle Chocolates", "premium chocolates India", "luxury chocolate brand", "chocolate bars online India", "premium chocolate bars", "buy chocolate online", "milk chocolate bar", "dark chocolate bar"],
  },
  "/collection": {
    title: "Shop Premium Chocolate Bars Online | Paradelle",
    description: "Discover all four Paradelle chocolate bars, from Signature Milk and Signature Dark to Crunchy Nut and Pistachio Filled, in one curated collection.",
    keywords: ["premium chocolate collection", "chocolate bars online", "buy premium chocolate India", "luxury chocolate bars", "milk chocolate", "dark chocolate", "crunchy nut chocolate", "pistachio chocolate"],
  },
  "/our-story": {
    title: "Our Story | The Philosophy Behind Paradelle Chocolates",
    description: "Discover the inspiration, philosophy and brand identity behind Paradelle Chocolates and explore the story behind our premium chocolate collection.",
    keywords: ["Paradelle story", "about Paradelle", "luxury chocolate brand India", "premium chocolate brand", "chocolate brand philosophy", "brand journey", "chocolate craftsmanship", "luxury chocolatier"],
  },
  "/craftsmanship": {
    title: "Chocolate Craftsmanship & Quality | Paradelle Chocolates",
    description: "Explore Paradelle's approach to chocolate craftsmanship, product presentation and the details behind its four signature chocolate creations.",
    keywords: ["chocolate craftsmanship", "premium chocolate making", "chocolate quality", "luxury chocolate craftsmanship", "chocolate production", "cocoa chocolate", "gourmet chocolate", "Paradelle chocolates"],
  },
  "/contact": {
    title: "Contact Paradelle Chocolates | Customer Support",
    description: "Get in touch with Paradelle Chocolates for assistance with orders, products, delivery enquiries, customer support and general business enquiries.",
    keywords: ["contact Paradelle", "customer support", "chocolate order assistance", "delivery enquiries", "customer service", "contact details", "order support India", "brand enquiries"],
  },
  "/faqs": {
    title: "Chocolate Shopping & Delivery FAQs | Paradelle Chocolates",
    description: "Find answers to common questions about Paradelle chocolates, products, ordering, prepaid payments, shipping, delivery, cancellations and refunds.",
    keywords: ["Paradelle FAQs", "chocolate questions", "chocolate orders India", "premium chocolate delivery", "payment information", "online shopping help", "shipping questions", "order tracking"],
  },
  "/legal/shipping": {
    title: "Shipping & Delivery Policy | Paradelle Chocolates",
    description: "Read Paradelle's shipping and delivery policy for order processing, delivery coverage, estimated timelines, shipping charges and order tracking information.",
    keywords: ["shipping policy", "chocolate delivery India", "premium chocolate shipping", "online delivery", "shipping charges", "delivery timelines", "order tracking", "shipping terms"],
  },
  "/legal/refunds": {
    title: "Cancellation & Refund Policy | Paradelle Chocolates",
    description: "Review Paradelle's cancellation and refund policy, including order cancellation procedures, refund eligibility, payment reversals and customer support.",
    keywords: ["refund policy", "chocolate order cancellation", "online chocolate refund India", "refund terms", "prepaid order cancellation", "payment refund", "cancellation policy", "refund assistance"],
  },
  "/legal/privacy": {
    title: "Privacy Policy | Paradelle Chocolates",
    description: "Understand how Paradelle Chocolates collects, uses, stores and protects personal information relating to customer accounts, online orders and website interactions.",
    keywords: ["privacy policy", "customer data privacy", "personal information protection", "ecommerce privacy India", "account privacy", "data protection", "information security", "data practices"],
  },
  "/legal/terms": {
    title: "Terms & Conditions | Paradelle Chocolates",
    description: "Read the terms and conditions governing Paradelle Chocolates, including online purchases, prepaid payments, orders, delivery and customer responsibilities.",
    keywords: ["terms and conditions", "ecommerce terms India", "online purchase conditions", "prepaid payment terms", "customer purchase policy", "order conditions", "website terms", "shopping agreement"],
  },
  "/login": {
    title: "Customer Login | Paradelle Chocolates",
    description: "Sign in to your Paradelle Chocolates account to manage your customer profile, access previous orders, review account details and track purchases.",
    keywords: ["Paradelle login", "customer account", "chocolate store login", "customer sign in", "shopping account India", "order history", "order tracking", "account access"],
  },
  "/register": {
    title: "Create Your Account | Paradelle Chocolates",
    description: "Create your Paradelle Chocolates account to manage your personal details, save delivery addresses, access your orders and enjoy a convenient shopping experience.",
    keywords: ["Paradelle registration", "create account", "chocolate store signup", "customer registration India", "shopping account", "customer profile", "online shopping", "account creation"],
  },
  "/product/signature-milk": {
    title: "Signature Milk Chocolate Online | Paradelle Chocolates",
    description: "Discover Paradelle Signature Milk Chocolate, a premium milk chocolate bar created for those who appreciate a classic and indulgent chocolate experience.",
    keywords: ["Signature Milk Chocolate", "premium milk chocolate India", "buy milk chocolate online", "luxury milk chocolate bar", "creamy milk chocolate", "premium chocolate bar", "Paradelle milk chocolate", "gourmet milk chocolate"],
  },
  "/product/signature-dark": {
    title: "Signature Dark Chocolate Online | Paradelle Chocolates",
    description: "Explore Paradelle Signature Dark Chocolate, a premium dark chocolate bar for chocolate enthusiasts who appreciate the distinctive character of dark chocolate.",
    keywords: ["Signature Dark Chocolate", "premium dark chocolate India", "buy dark chocolate online", "luxury dark chocolate bar", "dark chocolate online India", "Paradelle dark chocolate", "gourmet dark chocolate", "cocoa chocolate"],
  },
  "/product/crunchy-nut": {
    title: "Crunchy Nut Chocolate Online | Paradelle Chocolates",
    description: "Discover Paradelle Crunchy Nut Chocolate, a premium chocolate bar combining chocolate indulgence with the satisfying texture of crunchy nuts.",
    keywords: ["Crunchy Nut Chocolate", "nut chocolate bar India", "buy nut chocolate online", "premium nut chocolate", "chocolate with nuts", "crunchy chocolate bar", "Paradelle Crunchy Nut", "gourmet nut chocolate"],
  },
  "/product/pistachio-filled": {
    title: "Pistachio Filled Chocolate Online | Paradelle Chocolates",
    description: "Experience Paradelle Pistachio Filled Chocolate, a premium chocolate bar featuring a pistachio-filled centre for an indulgent flavour experience.",
    keywords: ["Pistachio Filled Chocolate", "pistachio chocolate India", "buy pistachio chocolate online", "premium pistachio chocolate bar", "chocolate with pistachio filling", "luxury pistachio chocolate", "Paradelle pistachio chocolate", "gourmet pistachio chocolate"],
  },
};
const EXPECTED_PRODUCT_PRICES = {
  "/product/signature-milk": 450,
  "/product/signature-dark": 550,
  "/product/crunchy-nut": 500,
  "/product/pistachio-filled": 700,
};
const EXPECTED_PRODUCT_GALLERIES = Object.fromEntries(
  Object.keys(EXPECTED_PRODUCT_PRICES).map((path) => {
    const slug = path.slice("/product/".length);
    return [path, [1, 2, 3, 4].map((number) => `/images/products/${slug}-${number}.webp`)];
  }),
);

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
let faviconHref = "";
for (const path of URLS) {
  const response = await fetch(`${BASE}${path}`);
  const html = await response.text();
  check(`${path} responds successfully`, response.status === 200, `HTTP ${response.status}`);

  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  const description = getMeta(html, "name", "description");
  const keywords = getMeta(html, "name", "keywords");
  const applicationName = getMeta(html, "name", "application-name");
  const ogSiteName = getMeta(html, "property", "og:site_name");
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
  if (path === "/") {
    faviconHref = [...html.matchAll(/<link\b[^>]*>/gi)]
      .map((match) => attrs(match[0]))
      .find((link) => link.rel === "icon" && link.href?.includes("/images/logo.png"))?.href ?? "";
  }
  const canonicalPath = path === "/" ? SITE_ORIGIN : new URL(path, `${SITE_ORIGIN}/`).toString();

  const expected = EXPECTED_METADATA[path];
  const actualKeywords = keywords.split(",").map((keyword) => keyword.trim()).filter(Boolean);
  check(`${path} has a title`, title.length > 0);
  check(`${path} has the requested title`, title === expected.title, title);
  check(`${path} has the requested meta description`, description === expected.description, description);
  check(`${path} has the requested meta keywords`, JSON.stringify(actualKeywords) === JSON.stringify(expected.keywords), keywords);
  check(`${path} identifies the site as Paradelle Chocolates`, applicationName === "Paradelle Chocolates" && ogSiteName === "Paradelle Chocolates");
  check(`${path} has a device-width viewport`, /width=device-width/i.test(viewport), viewport);
  check(`${path} canonical matches configured host`, canonical === canonicalPath, canonical);
  check(`${path} has unique Open Graph and Twitter metadata`, Boolean(ogTitle && ogDescription && ogImage && twitterCard === "summary_large_image" && twitterTitle && twitterDescription && twitterImage));
  check(`${path} has one H1`, (html.match(/<h1\b/gi) ?? []).length === 1, `found ${(html.match(/<h1\b/gi) ?? []).length}`);
  check(`${path} image elements include alt attributes`, imageTags.every((image) => Object.hasOwn(image, "alt")), `${imageTags.filter((image) => !Object.hasOwn(image, "alt")).length} missing`);
  check(`${path} is indexable`, /index/i.test(robots) && !/noindex/i.test(robots), robots);

  for (const href of links) {
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const target = new URL(href, BASE);
    internalPaths.add(`${target.pathname}${target.search}`);
  }

  records.push({ path, title, description, ogImage, structuredData });

  if (EXPECTED_PRODUCT_PRICES[path]) {
    const product = structuredData.find((entry) => entry?.["@type"] === "Product");
    check(`${path} has Product and Offer JSON-LD`, Boolean(product?.offers?.["@type"] === "Offer"));
    check(`${path} uses Paradelle Chocolates as the product brand and seller`, product?.brand?.name === "Paradelle Chocolates" && product?.offers?.seller?.name === "Paradelle Chocolates");
    check(`${path} structured price is the current INR price`, product?.offers?.price === EXPECTED_PRODUCT_PRICES[path], String(product?.offers?.price));
    check(`${path} has a valid stock-derived Offer availability`, ["https://schema.org/InStock", "https://schema.org/OutOfStock"].includes(product?.offers?.availability));
    check(`${path} includes product description and no fabricated ratings`, Boolean(product?.description) && !product?.aggregateRating && !product?.review);
    check(`${path} includes BreadcrumbList JSON-LD`, structuredData.some((entry) => entry?.["@type"] === "BreadcrumbList"));
    const gallerySources = imageTags.map((image) => {
      try { return decodeURIComponent(image.src ?? ""); } catch { return image.src ?? ""; }
    });
    const galleryOrder = EXPECTED_PRODUCT_GALLERIES[path].map((asset) => gallerySources.findIndex((src) => src.includes(asset)));
    check(`${path} uses the four supplied product images in order`, galleryOrder.every((index, i) => index >= 0 && (i === 0 || index > galleryOrder[i - 1])), JSON.stringify(galleryOrder));
  }
}

check("all 16 titles are unique", new Set(records.map((record) => record.title)).size === URLS.length);
check("all 16 meta descriptions are unique", new Set(records.map((record) => record.description)).size === URLS.length);
check("all 16 social image URLs are unique", new Set(records.map((record) => record.ogImage)).size === URLS.length);

const homepageData = records.find((record) => record.path === "/").structuredData;
check("homepage includes Organization JSON-LD with the requested brand", homepageData.some((entry) => entry?.["@type"] === "Organization" && entry?.name === "Paradelle Chocolates"));
check("homepage includes WebSite JSON-LD named Paradelle Chocolates and linked to the Organization", homepageData.some((entry) => entry?.["@type"] === "WebSite" && entry?.name === "Paradelle Chocolates" && entry?.publisher?.["@id"] === `${SITE_ORIGIN}/#organization`));
check("organization JSON-LD exposes the crawlable logo", homepageData.some((entry) => entry?.["@type"] === "Organization" && entry?.logo?.url === `${SITE_ORIGIN}/images/logo.png`));
check("homepage favicon link points to the site logo", faviconHref.includes("/images/logo.png"), faviconHref);
const faviconResponse = faviconHref ? await fetch(`${BASE}${new URL(faviconHref, BASE).pathname}`) : null;
check("homepage favicon/logo is publicly fetchable as PNG", faviconResponse?.status === 200 && faviconResponse.headers.get("content-type")?.includes("image/png"), String(faviconResponse?.status));
check("indexable editorial and product pages include BreadcrumbList JSON-LD", records.filter(({ path }) => path !== "/" && path !== "/login" && path !== "/register").every((record) => record.structuredData.some((entry) => entry?.["@type"] === "BreadcrumbList")));

const sitemapResponse = await fetch(`${BASE}/sitemap.xml`);
const sitemap = await sitemapResponse.text();
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
check("sitemap is served as valid XML", sitemapResponse.status === 200 && /<urlset[\s>]/.test(sitemap));
check("sitemap contains all 16 requested pages", sitemapUrls.length === 16, `found ${sitemapUrls.length}`);
check("sitemap includes login and registration", sitemap.includes(`${SITE_ORIGIN}/login`) && sitemap.includes(`${SITE_ORIGIN}/register`));
check("sitemap URLs use the canonical domain", sitemapUrls.every((url) => url.startsWith(SITE_ORIGIN)));
check("sitemap includes every requested canonical URL", URLS.every((path) => sitemapUrls.includes(path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`)));

const robotsResponse = await fetch(`${BASE}/robots.txt`);
const robots = await robotsResponse.text();
check("robots.txt points to the canonical sitemap", robotsResponse.status === 200 && robots.includes(`${SITE_ORIGIN}/sitemap.xml`));
check("robots.txt explicitly allows the sitemap", /Allow:\s*\/sitemap\.xml/i.test(robots));
const disallowedRules = [...robots.matchAll(/^Disallow:\s*(\S+)/gim)].map((match) => match[1]);
check("robots.txt does not block any requested page", URLS.every((path) => !disallowedRules.some((rule) => path.startsWith(rule))));

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
