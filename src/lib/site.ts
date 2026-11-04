/** Canonical public URL for metadata, structured data, sitemap and robots.txt. */
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export const SITE_URL = (configuredSiteUrl || "https://paradelle.store").replace(/\/+$/, "");
