import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export type PageSeo = {
  title: string;
  description: string;
  keywords: string[];
};

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

export const PRODUCT_PAGE_SEO: Record<string, PageSeo> = {
  "signature-milk": {
    title: "Signature Milk Chocolate Online | Paradelle Chocolates",
    description:
      "Discover Paradelle Signature Milk Chocolate, a premium milk chocolate bar created for those who appreciate a classic and indulgent chocolate experience.",
    keywords: [
      "Signature Milk Chocolate",
      "premium milk chocolate India",
      "buy milk chocolate online",
      "luxury milk chocolate bar",
      "creamy milk chocolate",
      "premium chocolate bar",
      "Paradelle milk chocolate",
      "gourmet milk chocolate",
    ],
  },
  "signature-dark": {
    title: "Signature Dark Chocolate Online | Paradelle Chocolates",
    description:
      "Explore Paradelle Signature Dark Chocolate, a premium dark chocolate bar for chocolate enthusiasts who appreciate the distinctive character of dark chocolate.",
    keywords: [
      "Signature Dark Chocolate",
      "premium dark chocolate India",
      "buy dark chocolate online",
      "luxury dark chocolate bar",
      "dark chocolate online India",
      "Paradelle dark chocolate",
      "gourmet dark chocolate",
      "cocoa chocolate",
    ],
  },
  "crunchy-nut": {
    title: "Crunchy Nut Chocolate Online | Paradelle Chocolates",
    description:
      "Discover Paradelle Crunchy Nut Chocolate, a premium chocolate bar combining chocolate indulgence with the satisfying texture of crunchy nuts.",
    keywords: [
      "Crunchy Nut Chocolate",
      "nut chocolate bar India",
      "buy nut chocolate online",
      "premium nut chocolate",
      "chocolate with nuts",
      "crunchy chocolate bar",
      "Paradelle Crunchy Nut",
      "gourmet nut chocolate",
    ],
  },
  "pistachio-filled": {
    title: "Pistachio Filled Chocolate Online | Paradelle Chocolates",
    description:
      "Experience Paradelle Pistachio Filled Chocolate, a premium chocolate bar featuring a pistachio-filled centre for an indulgent flavour experience.",
    keywords: [
      "Pistachio Filled Chocolate",
      "pistachio chocolate India",
      "buy pistachio chocolate online",
      "premium pistachio chocolate bar",
      "chocolate with pistachio filling",
      "luxury pistachio chocolate",
      "Paradelle pistachio chocolate",
      "gourmet pistachio chocolate",
    ],
  },
};

export function siteTitle(title: string) {
  const suffix = " | Paradelle Chocolates";
  return title.endsWith(suffix) ? title : `${title}${suffix}`;
}

export function pageMetadata({
  path,
  title,
  description,
  keywords,
  image = SOCIAL_IMAGE_BY_PAGE.home,
  noindex = false,
}: {
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  noindex?: boolean;
}): Metadata {
  const canonical = new URL(path, `${SITE_URL}/`).toString();
  const imageUrl = new URL(image, `${SITE_URL}/`).toString();

  return {
    title: { absolute: title },
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: "Paradelle Chocolates",
      title,
      description,
      url: canonical,
      images: [{ url: imageUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    robots: { index: !noindex, follow: true },
  };
}
