import Image from "next/image";
import { ArrowRight, Thermometer, Timer, FlaskConical, PackageCheck } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { Kicker, ButtonLink } from "@/components/ui";
import { pageMetadata, SOCIAL_IMAGE_BY_PAGE } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-json-ld";

export const metadata = pageMetadata({
  path: "/craftsmanship",
  title: "Craftsmanship | PARADELLE CHOCOLATES",
  description: "Roasting, conching, tempering and wrapping — the four rituals behind every PARADELLE bar.",
  image: SOCIAL_IMAGE_BY_PAGE.craftsmanship,
});

const STAGES = [
  {
    n: "01",
    title: "The slow roast",
    image: "/images/products/signature-dark-2.webp",
    alt: "Dark chocolate squares beside a PARADELLE Signature Dark wrapper",
    text: "Roasting is where flavour is decided. Our cacao meets the drum gently and leaves slowly — a low, patient roast that trades raw bitterness for layered notes of red fruit, toasted grain and espresso. Small drums mean every batch is tasted, not timed by a clock alone.",
    detail: "Batch-tasted, never scorched",
  },
  {
    n: "02",
    title: "The long conch",
    image: "/images/products/signature-milk-2.webp",
    alt: "Milk chocolate squares beside a PARADELLE Signature Milk wrapper",
    text: "Conching is polishing with air, warmth and time. We run the granite rollers for hours beyond convenience —rounding sharp acids, softening texture from grain to silk, and letting the dairy in our milk couverture turn gently toffee-sweet.",
    detail: "Hours beyond convenience",
  },
  {
    n: "03",
    title: "The true temper",
    image: "/images/products/pistachio-filled-2.webp",
    alt: "A PARADELLE Pistachio Filled bar revealing its green pistachio cream centre",
    text: "Tempering is the discipline of crystals. Cocoa butter can set in six forms; only one gives the mirror gloss and clean snap of a great bar. Each couverture is coaxed to that single form — which is why a PARADELLE square breaks with a decisive, quiet crack.",
    detail: "One crystal, of six possible",
  },
  {
    n: "04",
    title: "The considered wrap",
    image: "/images/products/crunchy-nut-2.webp",
    alt: "Roasted hazelnuts beside a PARADELLE Crunchy Nut wrapper",
    text: "Bars rest after moulding, then meet their sleeves: deep colour grounds, champagne-gold line work, and a foil seal that keeps aroma in and the world out. Filled bars like our Pistachio are wrapped warm from the mould, so the heart stays silken.",
    detail: "Rested, sealed, sleeved",
  },
];

const PRINCIPLES = [
  { icon: Timer, title: "Slow, on purpose", text: "Weekly batches sized to demand — never stockpiled." },
  { icon: Thermometer, title: "Temperature, guarded", text: "From marble slab to insulated parcel, the cold chain is ours to keep." },
  { icon: FlaskConical, title: "Nothing mysterious", text: "Readable ingredient decks on every wrapper and every page." },
  { icon: PackageCheck, title: "Checked twice", text: "Each bar is inspected at moulding and again before dispatch." },
];

export default function CraftsmanshipPage() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Home", href: "/" }, { name: "Craftsmanship", href: "/craftsmanship" }]} />
      <section className="mx-auto max-w-7xl px-4 pb-14 pt-14 sm:px-6 lg:px-8 lg:pt-20">
        <Reveal>
          <div className="max-w-3xl">
            <Kicker>Craftsmanship</Kicker>
            <h1 className="font-display mt-4 text-4xl leading-[1.08] text-espresso lg:text-6xl">
              Four rituals, kept <span className="text-gilt">without exception.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-espresso/65 lg:text-base">
              Between the cacao bean and your hands, a PARADELLE bar passes through four disciplines. None are
              revolutionary. All are non-negotiable.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl space-y-20 px-4 sm:px-6 lg:space-y-28 lg:px-8">
        {STAGES.map((s, i) => (
          <div key={s.n} className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-20 ${i % 2 === 1 ? "" : ""}`}>
            <Reveal className={i % 2 === 1 ? "lg:order-2" : ""}>
              <div className="relative aspect-square overflow-hidden rounded-[2rem] ring-1 ring-espresso/10">
                <Image src={s.image} alt={s.alt} fill sizes="(max-width: 1024px) 100vw, 45vw" className="object-cover" />
              </div>
            </Reveal>
            <Reveal delay={120} className={i % 2 === 1 ? "lg:order-1" : ""}>
              <div>
                <span className="font-display text-6xl text-gold/70 lg:text-7xl">{s.n}</span>
                <h2 className="font-display mt-4 text-3xl text-espresso lg:text-4xl">{s.title}</h2>
                <p className="mt-5 text-[15px] leading-relaxed text-espresso/65">{s.text}</p>
                <p className="mt-6 inline-flex items-center gap-3 border-t hairline-gold pt-4 text-[11px] font-semibold uppercase tracking-[0.26em] text-bronze">
                  <span className="h-1.5 w-1.5 rotate-45 bg-gold" /> {s.detail}
                </p>
              </div>
            </Reveal>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="rounded-[2rem] bg-plum px-6 py-14 text-ivory sm:px-10 lg:px-16 lg:py-20">
          <Reveal>
            <div className="max-w-2xl">
              <Kicker className="text-gold/80">Principles of the bench</Kicker>
              <h2 className="font-display mt-4 text-3xl leading-tight lg:text-4xl">Standards you can taste, and verify.</h2>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map((p, i) => (
              <Reveal key={p.title} delay={i * 90}>
                <div>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gold/15 text-gold">
                    <p.icon className="h-5 w-5" strokeWidth={1.6} />
                  </span>
                  <h3 className="font-display mt-4 text-lg">{p.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-ivory/60">{p.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200}>
            <div className="mt-12">
              <ButtonLink href="/collection" variant="gold">
                Taste the difference <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
