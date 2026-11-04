import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export const SOCIAL_IMAGE_BY_PAGE = {
  home: "/images/hero.webp",
  collection: "/images/gifting.webp",
  story: "/images/products/signature-milk-3.webp",
  craftsmanship: "/images/products/signature-dark-3.webp",
  contact: "/images/logo.png",
  faqs: "/images/products/crunchy-nut-4.webp",
  shipping: "/images/products/signature-milk-4.webp",
  refunds: "/images/products/pistachio-filled-3.webp",
  privacy: "/images/products/crunchy-nut-3.webp",
  terms: "/images/products/signature-dark-4.webp",
  login: "/images/products/pistachio-filled-4.webp",
  register: "/images/products/signature-dark-2.webp",
} as const;

export function siteTitle(title: string) {
  return title.endsWith(" | PARADELLE CHOCOLATES") ? title : `${title} | PARADELLE CHOCOLATES`;
}

export function pageMetadata({
  path,
  title,
  description,
  image = SOCIAL_IMAGE_BY_PAGE.home,
  noindex = false,
}: {
  path: string;
  title: string;
  description: string;
  image?: string;
  noindex?: boolean;
}): Metadata {
  const canonical = new URL(path, `${SITE_URL}/`).toString();
  const imageUrl = new URL(image, `${SITE_URL}/`).toString();
  const fullTitle = title; // Final title is emitted verbatim; callers control brand text.

  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: "PARADELLE CHOCOLATES",
      title: fullTitle,
      description,
      url: canonical,
      images: [{ url: imageUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [imageUrl],
    },
    robots: { index: !noindex, follow: true },
  };
}
