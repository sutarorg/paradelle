import Link from "next/link";
import { Plus } from "lucide-react";
import { FAQS } from "@/lib/content";
import { getContent } from "@/lib/cms";
import { Reveal } from "@/components/reveal";
import { Kicker } from "@/components/ui";
import { pageMetadata, SOCIAL_IMAGE_BY_PAGE } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-json-ld";

export const metadata = pageMetadata({
  path: "/faqs",
  title: "Chocolate Shopping & Delivery FAQs | Paradelle Chocolates",
  description:
    "Find answers to common questions about Paradelle chocolates, products, ordering, prepaid payments, shipping, delivery, cancellations and refunds.",
  keywords: [
    "Paradelle FAQs",
    "chocolate questions",
    "chocolate orders India",
    "premium chocolate delivery",
    "payment information",
    "online shopping help",
    "shipping questions",
    "order tracking",
  ],
  image: SOCIAL_IMAGE_BY_PAGE.faqs,
});

export const dynamic = "force-dynamic";

export default async function FaqsPage() {
  const faqs = await getContent("faqs", FAQS);
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-14 sm:px-6 lg:px-8 lg:pt-20">
      <BreadcrumbJsonLd items={[{ name: "Home", href: "/" }, { name: "FAQs", href: "/faqs" }]} />
      <Reveal>
        <div className="text-center">
          <Kicker className="justify-center">Good questions, honest answers</Kicker>
          <h1 className="font-display mt-4 text-4xl text-espresso lg:text-5xl">Frequently asked</h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-espresso/60">
            Everything you might want to know before indulging. Anything else — <Link href="/contact" className="text-bronze underline-offset-4 hover:underline">write to us</Link>.
          </p>
        </div>
      </Reveal>

      <div className="mt-12 rounded-3xl border hairline-gold bg-ivory">
        {faqs.map((f, i) => (
          <Reveal key={f.q} delay={Math.min(i * 40, 240)}>
            <details className="group border-b hairline-gold last:border-b-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left marker:hidden [&::-webkit-details-marker]:hidden lg:px-8">
                <span className="font-display text-[17px] text-espresso lg:text-lg">{f.q}</span>
                <span className="shrink-0 rounded-full border border-espresso/15 p-2 transition-transform duration-300 group-open:rotate-45">
                  <Plus className="h-3.5 w-3.5 text-bronze" strokeWidth={2} />
                </span>
              </summary>
              <p className="px-6 pb-6 text-[14px] leading-relaxed text-espresso/65 lg:px-8">{f.a}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
