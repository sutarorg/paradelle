import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://paradelle.in";
  const catalog = await getCatalog().catch(() => []);
  const staticPages = ["", "/collection", "/our-story", "/craftsmanship", "/contact", "/faqs", "/legal/shipping", "/legal/refunds", "/legal/privacy", "/legal/terms", "/login", "/register"];
  return [
    ...staticPages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...catalog.map((p) => ({ url: `${base}/product/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.9 })),
  ];
}
