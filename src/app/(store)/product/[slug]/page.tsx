import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, ShieldCheck, Truck, RotateCcw, ChevronRight } from "lucide-react";
import { pricePer100g } from "@/lib/products";
import { getCatalog, getCatalogProduct, getReservedByProduct } from "@/lib/catalog";
import { Gallery } from "@/components/gallery";
import { AddToCart } from "@/components/add-to-cart";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { Kicker } from "@/components/ui";
import { formatINR } from "@/lib/utils";
import { SITE_URL } from "@/lib/site";
import { pageMetadata, siteTitle } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-json-ld";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCatalogProduct(slug);
  if (!product) return { title: "Product not found" };
  return pageMetadata({
    path: `/product/${product.slug}`,
    title: product.seoTitle || siteTitle(`${product.name} — ${formatINR(product.price)}`),
    description: product.seoDescription || `${product.tagline} ${product.weightGrams} g bar · ${product.cocoaPercent}% cacao · MRP inclusive of taxes.`,
    image: product.images.front,
  });
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const product = catalog.find((item) => item.slug === slug);
  if (!product) notFound();

  const related = catalog.filter((p) => p.slug !== product.slug).slice(0, 3);
  const reservations: Record<string, number> = await getReservedByProduct().catch(() => ({}));
  const availableStock = Math.max(0, product.stock - (reservations[product.slug] ?? 0));

  const accordions = [
    {
      title: "Ingredients",
      content: (
        <ul className="list-none space-y-2 text-[14px] leading-relaxed text-espresso/70">
          {product.ingredients.map((i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-[7px] h-1 w-1 rotate-45 bg-bronze" /> {i}
            </li>
          ))}
          <li className="pt-1 text-[13px] text-espresso/50">Cocoa solids: {product.cocoaPercent}% minimum.</li>
        </ul>
      ),
    },
    {
      title: "Allergens",
      content: (
        <div className="space-y-2 text-[14px] leading-relaxed text-espresso/70">
          {product.allergens.length > 0 ? (
            <p>
              <span className="font-semibold text-espresso">Contains:</span> {product.allergens.join(", ")}.
            </p>
          ) : (
            <p>
              <span className="font-semibold text-espresso">Contains:</span> no declared allergen ingredients in this recipe.
            </p>
          )}
          <p>{product.crossContact}</p>
        </div>
      ),
    },
    {
      title: "Nutrition — per 100 g",
      content: (
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-[14px] sm:grid-cols-3">
          {[
            ["Energy", product.nutritionPer100g.energy],
            ["Protein", product.nutritionPer100g.protein],
            ["Carbohydrate", product.nutritionPer100g.carbs],
            ["of which sugars", product.nutritionPer100g.sugars],
            ["Fat", product.nutritionPer100g.fat],
            ["of which saturates", product.nutritionPer100g.satFat],
            ["Sodium", product.nutritionPer100g.sodium],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3 border-b border-espresso/8 pb-2">
              <dt className="text-espresso/55">{k}</dt>
              <dd className="font-medium tabular-nums text-espresso">{v}</dd>
            </div>
          ))}
        </dl>
      ),
    },
    {
      title: "Food label",
      content: (
        <dl className="space-y-2.5 text-[14px] text-espresso/70">
          <div className="flex gap-2"><dt className="w-40 shrink-0 text-espresso/50">Marketed by</dt><dd>{product.manufacturer || "PARADELLE CHOCOLATES"}</dd></div>
          <div className="flex gap-2"><dt className="w-40 shrink-0 text-espresso/50">Net quantity</dt><dd>{product.netQuantityLabel || `${product.weightGrams} g`}</dd></div>
          <div className="flex gap-2"><dt className="w-40 shrink-0 text-espresso/50">Best before</dt><dd>{product.bestBeforeMonths} months from production</dd></div>
          <div className="flex gap-2"><dt className="w-40 shrink-0 text-espresso/50">Country of origin</dt><dd>{product.countryOfOrigin}</dd></div>
          {product.fssaiLicense ? (
            <div className="flex gap-2"><dt className="w-40 shrink-0 text-espresso/50">FSSAI licence</dt><dd className="font-mono text-[13px]">{product.fssaiLicense}</dd></div>
          ) : (
            <p className="text-[12.5px] text-espresso/45">FSSAI licence details print on the physical wrapper of every bar.</p>
          )}
          <p className="text-[12.5px] text-espresso/45">Vegetarian product. veg logo and statutory markings appear on pack.</p>
        </dl>
      ),
    },
    { title: "Storage", content: <p className="text-[14px] leading-relaxed text-espresso/70">{product.storage}</p> },
    { title: "Shipping & remedies", content: <p className="text-[14px] leading-relaxed text-espresso/70">{product.shippingNote} Arrived melted or damaged? Photograph it within 48 hours of delivery and choose a replacement or a full refund.</p> },
  ];

  return (
    <div className="pb-20 lg:pb-0">
      {/* Breadcrumbs */}
      <BreadcrumbJsonLd items={[
        { name: "Home", href: "/" },
        { name: "Collection", href: "/collection" },
        { name: product.shortName, href: `/product/${product.slug}` },
      ]} />
      <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <ol className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-espresso/65">
          <li><Link href="/" className="transition-colors hover:text-bronze">Home</Link></li>
          <li><ChevronRight className="h-3 w-3" strokeWidth={2} /></li>
          <li><Link href="/collection" className="transition-colors hover:text-bronze">Collection</Link></li>
          <li><ChevronRight className="h-3 w-3" strokeWidth={2} /></li>
          <li aria-current="page" className="text-espresso/80">{product.shortName}</li>
        </ol>
      </nav>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-8 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:pt-10">
        <Reveal><Gallery product={product} /></Reveal>

        <Reveal delay={120}>
          <div>
            <Kicker>{product.line}</Kicker>
            <h1 className="font-display mt-3 text-4xl leading-[1.05] text-espresso lg:text-[52px]">{product.name}</h1>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-bronze">
              {product.cocoaPercent}% cacao &middot; {product.weightGrams} g bar
            </p>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-espresso/70">{product.description}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {product.tastingNotes.map((n) => (
                <span key={n} className="rounded-full border border-gold/50 bg-gold/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-bronze">
                  {n}
                </span>
              ))}
            </div>

            <div className="mt-8 border-y hairline-gold py-6">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <p className="font-display text-4xl text-espresso">{formatINR(product.price)}</p>
                <p className="text-[12px] text-espresso/55">
                  {product.mrp > product.price ? (
                    <>
                      MRP <span className="line-through">{formatINR(product.mrp)}</span> · inclusive of all taxes
                    </>
                  ) : (
                    "MRP, inclusive of all taxes"
                  )}
                </p>
              </div>
              <p className="mt-1.5 text-[12px] text-espresso/45">
                ({formatINR(pricePer100g(product))} per 100 g) &middot; Free shipping on orders of ₹1,500+
              </p>
              {availableStock > 0 && availableStock <= product.lowStockThreshold ? (
                <p className="mt-2 text-[12px] font-medium text-bronze">Small batch — {availableStock} bars currently at the atelier.</p>
              ) : null}
              {availableStock <= 0 ? (
                <p className="mt-2 text-[12px] font-medium text-bronze">Awaiting the next batch — order now and we reserve yours first out of the mould.</p>
              ) : null}
            </div>

            <AddToCart product={product} />

            <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { icon: ShieldCheck, label: "Razorpay secure" },
                { icon: Truck, label: "Insulated delivery" },
                { icon: RotateCcw, label: "48-hr melt promise" },
              ].map((t) => (
                <li key={t.label} className="flex items-center gap-2.5 rounded-xl border border-espresso/10 bg-cream px-4 py-3 text-[12px] font-medium text-espresso/70">
                  <t.icon className="h-4 w-4 shrink-0 text-bronze" strokeWidth={1.7} /> {t.label}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>

      {/* Detail accordions */}
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <Reveal>
          <div className="rounded-3xl border hairline-gold bg-ivory">
            {accordions.map((a, i) => (
              <details key={a.title} className="group border-b hairline-gold last:border-b-0" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 marker:hidden [&::-webkit-details-marker]:hidden lg:px-9">
                  <span className="font-display text-lg text-espresso lg:text-xl">{a.title}</span>
                  <span className="rounded-full border border-espresso/15 p-2 transition-transform duration-300 group-open:rotate-45">
                    <Plus className="h-3.5 w-3.5 text-bronze" strokeWidth={2} />
                  </span>
                </summary>
                <div className="px-6 pb-7 lg:px-9">{a.content}</div>
              </details>
            ))}
          </div>
        </Reveal>
      </div>

      {/* Related */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.description,
            image: [new URL(product.images.front, `${SITE_URL}/`).toString()],
            sku: product.sku,
            brand: { "@type": "Brand", name: "PARADELLE CHOCOLATES" },
            weight: { "@type": "QuantitativeValue", value: product.weightGrams, unitCode: "GRM" },
            offers: {
              "@type": "Offer",
              url: `${SITE_URL}/product/${product.slug}`,
              priceCurrency: "INR",
              price: product.price / 100,
              availability: availableStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              itemCondition: "https://schema.org/NewCondition",
              seller: { "@type": "Organization", name: "PARADELLE CHOCOLATES" },
            },
          }).replace(/</g, "\\u003c"),
        }}
      />
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <Reveal>
          <div className="flex items-end justify-between gap-6">
            <h2 className="font-display text-3xl text-espresso lg:text-4xl">Complete the collection</h2>
            <Link href="/collection" className="hidden text-[12px] font-semibold uppercase tracking-[0.22em] text-bronze sm:block">
              View all four
            </Link>
          </div>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((p, i) => (
            <Reveal key={p.slug} delay={i * 90}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
