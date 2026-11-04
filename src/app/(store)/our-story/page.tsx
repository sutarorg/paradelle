import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { Kicker, ButtonLink } from "@/components/ui";
import { PRODUCTS } from "@/lib/products";
import { getContent, STORY_DEFAULTS } from "@/lib/cms";
import { pageMetadata, SOCIAL_IMAGE_BY_PAGE } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-json-ld";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  path: "/our-story",
  title: "Our Story | The Philosophy Behind Paradelle Chocolates",
  description:
    "Discover the inspiration, philosophy and brand identity behind Paradelle Chocolates and explore the story behind our premium chocolate collection.",
  keywords: [
    "Paradelle story",
    "about Paradelle",
    "luxury chocolate brand India",
    "premium chocolate brand",
    "chocolate brand philosophy",
    "brand journey",
    "chocolate craftsmanship",
    "luxury chocolatier",
  ],
  image: SOCIAL_IMAGE_BY_PAGE.story,
});

const VALUES = [
  { n: "I", title: "Patience over volume", text: "We would rather make fewer bars than faster ones. Every recipe is conched for hours and rested before it is wrapped — the calendar bends to the chocolate, never the reverse." },
  { n: "II", title: "Honesty over theatre", text: "No invented discounts, no countdown timers, no fine print. An MRP that includes taxes, shipping shown before checkout, and ingredient decks you can actually read." },
  { n: "III", title: "Generosity over margin", text: "More nuts than strictly sensible, couverture rather than compound, and insulated packaging at our cost — because the person opening the box should feel considered." },
];

export default async function OurStoryPage() {
  const story = await getContent("story", STORY_DEFAULTS);
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Home", href: "/" }, { name: "Our Story", href: "/our-story" }]} />
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pt-20">
        <Reveal>
          <div className="max-w-3xl">
            <Kicker>Our Story</Kicker>
            <h1 className="font-display mt-4 text-4xl leading-[1.08] text-espresso lg:text-6xl">
              A small maison, built around <span className="text-gilt">a single belief.</span>
            </h1>
            <p className="mt-6 text-[15px] leading-relaxed text-espresso/65 lg:text-base">
              That belief: chocolate deserves the same seriousness great houses give perfume or wine — and the same
              honesty a friend gives a friend.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] ring-1 ring-espresso/10">
              <Image src="/images/hero.webp" alt="Molten chocolate catching golden light" fill sizes="(max-width: 1024px) 100vw, 45vw" className="object-cover" />
            </div>
          </Reveal>
          <div className="space-y-6 text-[15px] leading-relaxed text-espresso/70 lg:pt-4">
            <Reveal delay={80}>
              <p>
                PARADELLE began with a frustration familiar to anyone who loves chocolate in a warm country: the finest
                bars were always elsewhere — flown in, marked up, and usually worse for the journey. Beautiful European
                chocolate, tired by the time it arrived.
              </p>
            </Reveal>
            <Reveal delay={140}>
              <p>
                So we built a maison here instead. A compact atelier where cacao is slow-roasted in small drums,
                couverture is conched long past the point of impatience, and bars are wrapped by hand in sleeves we
                designed with the restraint of the houses we admire — deep espresso and plum grounds, champagne-gold
                detail, nothing louder than the chocolate inside.
              </p>
            </Reveal>
            <Reveal delay={200}>
              <p>
                The collection is four bars and will stay four bars until a fifth genuinely deserves the name. Signature
                Milk for comfort, Signature Dark for contemplation, Crunchy Nut for joy, and Pistachio Filled for the
                centre of the table. Each priced plainly as MRP — taxes included, value argued by the bar itself, not by
                a strikethrough.
              </p>
            </Reveal>
            <Reveal delay={260}>
              <p>
                And because chocolate is only half the experience, we obsessed over the journey: insulated packaging as
                standard, cool packs when the season demands, and couriers tracked door-to-door. Indulgence should never
                arrive melted.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <Reveal>
          <div className="max-w-2xl">
            <Kicker>What the house stands on</Kicker>
            <h2 className="font-display mt-4 text-3xl text-espresso lg:text-5xl">Three quiet principles.</h2>
          </div>
        </Reveal>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {VALUES.map((v, i) => (
            <Reveal key={v.n} delay={i * 100}>
              <div className="border-t hairline-gold pt-8">
                <span className="font-display text-2xl text-gold">{v.n}</span>
                <h3 className="font-display mt-4 text-2xl text-espresso">{v.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-espresso/60">{v.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Quote band */}
      <section className="bg-plum text-ivory">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:py-24">
          <Reveal>
            <p className="font-display text-3xl leading-snug lg:text-4xl">
              <span className="text-gilt">&ldquo;{story.quote}&rdquo;</span>
            </p>
            <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.3em] text-gold/80">{story.attribution}</p>
          </Reveal>
        </div>
      </section>

      {/* The signatures strip */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="font-display text-3xl text-espresso lg:text-4xl">Meet the four signatures</h2>
            <ButtonLink href="/collection" variant="outlineDark">
              Shop the collection <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
            </ButtonLink>
          </div>
        </Reveal>
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          {PRODUCTS.map((p, i) => (
            <Reveal key={p.slug} delay={i * 80}>
              <Link href={`/product/${p.slug}`} className="group block">
                <div className="relative aspect-square overflow-hidden rounded-2xl ring-1 ring-espresso/8">
                  <Image src={p.images.front} alt={`${p.name} wrapper`} fill sizes="(max-width: 1024px) 50vw, 22vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <p className="font-display mt-3 text-base text-espresso transition-colors group-hover:text-bronze">{p.shortName}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
