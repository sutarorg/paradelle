import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/lib/products";
import { SITE_URL } from "@/lib/site";

const INDEXABLE_STATIC_PAGES = [
  "",
  "/collection",
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

/** Keep the public sitemap independent of the database so crawlers can always fetch it. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...INDEXABLE_STATIC_PAGES.map((path) => ({
      url: path === "" ? `${SITE_URL}/` : `${SITE_URL}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...PRODUCTS.map((product) => ({
      url: `${SITE_URL}/product/${product.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  ];
}
