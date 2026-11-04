import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const CRAWLABLE_PATHS = [
  "/",
  "/sitemap.xml",
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
  "/product/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: CRAWLABLE_PATHS,
        disallow: ["/admin", "/admin/", "/api/", "/account", "/checkout", "/cart", "/pay/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
