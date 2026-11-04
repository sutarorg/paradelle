import type { Metadata } from "next";
import { Suspense } from "react";
import { CollectionClient } from "@/components/collection-client";
import { Reveal } from "@/components/reveal";
import { Kicker } from "@/components/ui";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Collection — Four Signature Bars",
  description:
    "Signature Milk, Signature Dark, Crunchy Nut and Pistachio Filled. Small-batch PARADELLE bars with transparent pricing and insulated delivery across India.",
};

export default async function CollectionPage() {
  const catalog = await getCatalog();
  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 lg:px-8 lg:pt-16">
      <Reveal>
        <div className="max-w-2xl">
          <Kicker>The Collection</Kicker>
          <h1 className="font-display mt-4 text-4xl leading-tight text-espresso lg:text-6xl">
            Four signatures, <span className="text-gilt">nothing else.</span>
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-espresso/65">
            A deliberately small collection — each bar perfected rather than multiplied. All prices are MRP,
            inclusive of taxes; complimentary shipping on orders of ₹1,500 or more.
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
