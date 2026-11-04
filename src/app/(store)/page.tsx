import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf, Snowflake, ShieldCheck, HandHeart } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { Kicker, ButtonLink } from "@/components/ui";
import { NewsletterForm } from "@/components/newsletter-form";
import { getCatalog } from "@/lib/catalog";
import { getContent, HOMEPAGE_DEFAULTS } from "@/lib/cms";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const MARQUEE_ITEMS = [
  "Four signature bars",
  "Slow-roasted cacao",
  "Conched for silkiness",
  "Small weekly batches",
  "Insulated delivery",
  "Crafted for true indulgence",
];

const CRAFT_STEPS = [
  { n: "01", title: "Slow roast", text: "Cacao roasted gently in small drums until the aromatic heart of the bean opens — never scorched, never rushed." },
  { n: "02", title: "Long conch", text: "Hours of slow conching polish each batch to silk, rounding acidity into a calm, lingering finish." },
  { n: "03", title: "Hand temper", text: "Every couverture is tempered to a precise crystalline snap — the quiet signature of a well-made bar." },
  { n: "04", title: "Rested & wrapped", text: "Bars rest before wrapping in our gold-detailed sleeves, then ship in insulated, temperature-safe packaging." },
];

const BENEFITS = [
  { icon: Leaf, title: "Honest ingredients", text: "Short, readable decks. Real cacao, real dairy, real nuts — nothing you cannot pronounce." },
  { icon: HandHeart, title: "Made in small batches", text: "Crafted weekly, never stockpiled. Your bar was poured recently — taste the freshness." },
  { icon: Snowflake, title: "Melt-safe delivery", text: "Insulated packaging with cool packs in warm months, always at no extra cost to you." },
  { icon: ShieldCheck, title: "Secure, transparent checkout", text: "Razorpay-protected prepaid payments. MRP includes taxes; shipping is shown before you pay." },
];

export default async function HomePage() {
  const [cms, catalog] = await Promise.all([getContent("homepage", HOMEPAGE_DEFAULTS), getCatalog()]);
  const base = SITE_URL;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": `${base}/#organization`,
              name: "PARADELLE CHOCOLATES",
              slogan: "Crafted for true indulgence.",
              url: base,
              logo: { "@type": "ImageObject", url: `${base}/images/logo.png` },
              contactPoint: { "@type": "ContactPoint", email: "hello@paradelle.store", contactType: "customer service", areaServed: "IN" },
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": `${base}/#website`,
              name: "PARADELLE CHOCOLATES",
              url: base,
              publisher: { "@id": `${base}/#organization` },
            },
          ]),
        }}
      />
      {/* ————— HERO ————— */}
      <section className="relative flex min-h-[calc(100svh-104px)] items-end overflow-hidden bg-espresso text-ivory">
        <div className="absolute inset-0">
          <Image
            src="/images/hero.webp"
            alt="Molten dark chocolate swirling in golden light"
            fill
            priority
            sizes="100vw"
            className="animate-hero-drift object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-espresso/85 via-espresso/35 to-espresso/90" />
          <div className="absolute inset-0 bg-gradient-to-r from-espresso/60 via-transparent to-transparent" />
        </div>

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8 lg:pb-24">
          <Reveal>
            <p className="flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.34em] text-gold">
              <span className="inline-block h-px w-10 bg-gold/70" />
              Maison de chocolat &middot; India
            </p>
          </Reveal>
          <Reveal delay={120}>
            <h1 className="font-display mt-6 max-w-3xl text-[13vw] leading-[1.02] sm:text-6xl lg:text-7xl xl:text-[86px]">
              {cms.heroTitle1}
              <br />
              <span className="text-gilt">{cms.heroTitle2}</span>
            </h1>
          </Reveal>
          <Reveal delay={240}>
            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-ivory/75 lg:text-lg">{cms.heroSub}</p>
          </Reveal>
          <Reveal delay={360}>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <ButtonLink href="/collection" variant="gold">
                Explore the collection <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
              </ButtonLink>
              <ButtonLink href="/our-story" variant="outlineGold">
                Our story
              </ButtonLink>
            </div>
          </Reveal>

          <Reveal delay={480}>
            <dl className="mt-16 grid max-w-2xl grid-cols-3 divide-x divide-ivory/15 border-t border-ivory/15 pt-6">
              {[
                [String(catalog.length), "signature recipes"],
                ["72%", "finest dark couverture"],
                ["1–2 days", "atelier dispatch"],
              ].map(([v, l]) => (
                <div key={l} className="px-4 first:pl-0">
                  <dt className="sr-only">{l}</dt>
                  <dd className="font-display text-2xl text-gold lg:text-3xl">{v}</dd>
                  <dd className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-ivory/55">{l}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* ————— MARQUEE ————— */}
      <section aria-hidden className="overflow-hidden border-b hairline-gold bg-plum py-4 text-ivory">
        <div className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="flex items-center gap-8 text-[12px] font-semibold uppercase tracking-[0.3em] text-ivory/70">
              {item} <span className="text-gold">&#9670;</span>
            </span>
          ))}
        </div>
      </section>

      {/* ————— COLLECTION ————— */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <Kicker>The Signature Collection</Kicker>
              <h2 className="font-display mt-4 text-4xl leading-tight text-espresso lg:text-5xl">
                Four bars. No filler. <span className="text-gilt">Only character.</span>
              </h2>
            </div>
            <Link href="/collection" className="group inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-bronze">
              View all four
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.8} />
            </Link>
          </div>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-4">
          {catalog.map((p, i) => (
            <Reveal key={p.slug} delay={i * 90}>
              <ProductCard product={p} priority={i < 2} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ————— STORY BAND ————— */}
      <section className="relative overflow-hidden bg-plum text-ivory">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 lg:py-28">
          <Reveal>
            <Kicker className="text-gold/80">Our philosophy</Kicker>
          </Reveal>
          <Reveal delay={120}>
            <p className="font-display mx-auto mt-6 max-w-3xl text-3xl leading-snug lg:text-[42px] lg:leading-[1.3]">
              &ldquo;<span className="text-gilt">{cms.storyQuote}&rdquo;</span>
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="ornament-rule mx-auto mt-8 max-w-xs text-gold">
              <span className="text-[10px] font-semibold uppercase tracking-[0.34em]">Paradelle</span>
            </div>
          </Reveal>
          <Reveal delay={320}>
            <div className="mt-10">
              <ButtonLink href="/our-story" variant="outlineGold">Read our story</ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ————— CRAFT ————— */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <Reveal>
          <div className="max-w-2xl">
            <Kicker>The craft</Kicker>
            <h2 className="font-display mt-4 text-4xl leading-tight text-espresso lg:text-5xl">
              Slow by intention, <span className="text-gilt">precise by hand.</span>
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-espresso/65">
              Great chocolate is a series of patiently kept promises. Four rituals govern every PARADELLE bar,
              from roasting drum to wrapped sleeve.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border hairline-gold bg-espresso/10 sm:grid-cols-2 lg:grid-cols-4">
          {CRAFT_STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 90} className="bg-ivory">
              <div className="flex h-full flex-col gap-6 p-8 transition-colors duration-500 hover:bg-cream">
                <span className="font-display text-4xl text-gold">{s.n}</span>
                <div>
                  <h3 className="font-display text-xl text-espresso">{s.title}</h3>
                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-espresso/60">{s.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={150}>
          <div className="mt-10">
            <ButtonLink href="/craftsmanship" variant="outlineDark">
              Inside the atelier <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
            </ButtonLink>
          </div>
        </Reveal>
      </section>

      {/* ————— BENEFITS ————— */}
      <section className="border-y hairline-gold bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <Kicker>Why Paradelle</Kicker>
              <h2 className="font-display mt-4 text-4xl leading-tight text-espresso lg:text-5xl">
                Quietly uncompromising.
              </h2>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b, i) => (
              <Reveal key={b.title} delay={i * 90}>
                <div className="lift h-full rounded-3xl border hairline-gold bg-ivory p-7">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-plum text-gold">
                    <b.icon className="h-5 w-5" strokeWidth={1.6} />
                  </span>
                  <h3 className="font-display mt-5 text-xl text-espresso">{b.title}</h3>
                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-espresso/60">{b.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ————— GIFTING ————— */}
      <section id="gifting" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal className="order-2 lg:order-1">
            <div>
              <Kicker>Gifting</Kicker>
              <h2 className="font-display mt-4 text-4xl leading-tight text-espresso lg:text-5xl">
                The gift that says <span className="text-gilt">you considered them.</span>
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-espresso/65">
                An ivory presentation box, a champagne-gold ribbon, and four bars that read like a tasting menu.
                Parcels ship without pricing documents, and a handwritten-style gift note comes complimentary.
              </p>
              <ul className="mt-7 space-y-3.5">
                {[
                  "Signature ivory & gold presentation",
                  "Complimentary gift note with every gifting order",
                  "Insulated delivery, tracked door-to-door",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3 text-[14px] text-espresso/75">
                    <span className="h-1.5 w-1.5 rotate-45 bg-gold" /> {t}
                  </li>
                ))}
              </ul>
              <div className="mt-9">
                <ButtonLink href="/collection" variant="espresso">
                  Compose a gift <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
                </ButtonLink>
              </div>
            </div>
          </Reveal>
          <Reveal className="order-1 lg:order-2" delay={120}>
            <div className="relative">
              <div className="relative aspect-square overflow-hidden rounded-[2rem] ring-1 ring-espresso/10">
                <Image
                  src="/images/gifting.webp"
                  alt="PARADELLE gift box in ivory with a champagne-gold ribbon and four wrapped chocolate bars"
                  fill
                  sizes="(max-width: 1024px) 100vw, 44vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-5 -left-4 rounded-2xl border hairline-gold bg-ivory px-5 py-4 shadow-xl sm:-left-8">
                <p className="font-display text-lg text-espresso">From {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(450)}</p>
                <p className="text-[11px] uppercase tracking-[0.22em] text-bronze">a bar, beautifully sent</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ————— PROMISE + NEWSLETTER ————— */}
      <section className="border-t hairline-gold">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-20">
            <Reveal>
              <div>
                <Kicker>The Paradelle promise</Kicker>
                <h2 className="font-display mt-4 text-3xl leading-tight text-espresso lg:text-4xl">
                  No hidden fees. No pressure tactics. <span className="text-gilt">Only chocolate, honestly sold.</span>
                </h2>
                <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-espresso/65">
                  Prices are MRP with taxes included. Shipping is calculated before checkout. Every parcel is
                  tracked and insured. If anything arrives below our standard, we replace or refund — your choice.
                </p>
              </div>
            </Reveal>
            <Reveal delay={140}>
              <div className="rounded-3xl border hairline-gold bg-cream p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-bronze">Stay close</p>
                <h3 className="font-display mt-3 text-2xl text-espresso">A monthly letter, worth opening.</h3>
                <p className="mt-2 text-sm text-espresso/60">Subscribe and receive 10% off your first order — code revealed instantly.</p>
                <div className="mt-5">
                  <NewsletterForm />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
