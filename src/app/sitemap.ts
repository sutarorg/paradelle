import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL;
  const catalog = await getCatalog().catch(() => []);
  // Only content pages intended for search indexing. Login/register are noindex.
  // Account, cart, checkout, payment and admin routes are private utilities.
  const staticPages = ["", "/collection", "/our-story", "/craftsmanship", "/contact", "/faqs", "/legal/shipping", "/legal/refunds", "/legal/privacy", "/legal/terms"];
  return [
    ...staticPages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...catalog.map((p) => ({ url: `${base}/product/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.9 })),
  ];
}
