import { Suspense } from "react";
import { CollectionClient } from "@/components/collection-client";
import { Reveal } from "@/components/reveal";
import { Kicker } from "@/components/ui";
import { getCatalog } from "@/lib/catalog";
import { pageMetadata, SOCIAL_IMAGE_BY_PAGE } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-json-ld";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  path: "/collection",
  title: "Shop Premium Chocolate Bars Online | Paradelle",
  description:
    "Discover all four Paradelle chocolate bars, from Signature Milk and Signature Dark to Crunchy Nut and Pistachio Filled, in one curated collection.",
  keywords: [
    "premium chocolate collection",
    "chocolate bars online",
    "buy premium chocolate India",
    "luxury chocolate bars",
    "milk chocolate",
    "dark chocolate",
    "crunchy nut chocolate",
    "pistachio chocolate",
  ],
  image: SOCIAL_IMAGE_BY_PAGE.collection,
});

export default async function CollectionPage() {
  const catalog = await getCatalog();
  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 lg:px-8 lg:pt-16">
      <BreadcrumbJsonLd items={[{ name: "Home", href: "/" }, { name: "Collection", href: "/collection" }]} />
      <Reveal>
        <div className="max-w-2xl">
          <Kicker>The Collection</Kicker>
          <h1 className="font-display mt-4 text-4xl leading-tight text-espresso lg:text-6xl">
            Four signatures, <span className="text-gilt">nothing else.</span>
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-espresso/65">
            A deliberately small collection — each bar perfected rather than multiplied. All prices are MRP,
            inclusive of taxes; complimentary shipping on orders of ₹499 or more.
          </p>
        </div>
      </Reveal>

      <div className="mt-10">
        <Suspense fallback={<div className="h-40 animate-pulse rounded-3xl bg-cream" />}>
          <CollectionClient products={catalog} />
        </Suspense>
      </div>
    </div>
  );
}
