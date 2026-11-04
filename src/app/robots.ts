import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://paradelle.in";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/", "/account", "/checkout", "/cart", "/pay/", "/checkout/success"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
