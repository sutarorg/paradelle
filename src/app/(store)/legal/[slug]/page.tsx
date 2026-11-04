import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { POLICIES, type PolicyKey } from "@/lib/content";
import { getContent, type PolicyContent } from "@/lib/cms";
import { Reveal } from "@/components/reveal";
import { Kicker } from "@/components/ui";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-json-ld";
import { pageMetadata, siteTitle, SOCIAL_IMAGE_BY_PAGE } from "@/lib/seo";

export const dynamic = "force-dynamic";

const KEYS = Object.keys(POLICIES) as PolicyKey[];
const POLICY_DESCRIPTIONS: Record<PolicyKey, string> = {
  shipping: "PARADELLE shipping charges, delivery timelines and insulated chocolate packaging across India.",
  refunds: "Read the PARADELLE refund and replacement policy for melted, damaged or incorrect chocolate orders.",
  privacy: "How PARADELLE handles account, order and newsletter information, plus customer privacy choices.",
  terms: "PARADELLE terms for chocolate orders, pricing, availability, prepaid payments and customer accounts.",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const policy = POLICIES[slug as PolicyKey];
  if (!policy) return { title: "Policy" };
  const key = slug as PolicyKey;
  return pageMetadata({
    path: `/legal/${key}`,
    title: siteTitle(policy.title),
    description: POLICY_DESCRIPTIONS[key],
    image: SOCIAL_IMAGE_BY_PAGE[key],
  });
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = POLICIES[slug as PolicyKey];
  if (!policy) notFound();
  const live = await getContent<PolicyContent>(`policy.${slug}`, { sections: policy.sections });
  const sections = live.sections.length > 0 ? live.sections : policy.sections;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6 lg:px-8 lg:pt-16">
      <BreadcrumbJsonLd items={[{ name: "Home", href: "/" }, { name: policy.title, href: `/legal/${slug}` }]} />
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-espresso/65">
          <li><Link href="/" className="transition-colors hover:text-bronze">Home</Link></li>
          <li><ChevronRight className="h-3 w-3" strokeWidth={2} /></li>
          <li aria-current="page" className="text-espresso/80">{policy.title}</li>
        </ol>
      </nav>

      <Reveal>
        <div className="mt-8">
          <Kicker>{policy.eyebrow}</Kicker>
          <h1 className="font-display mt-3 text-4xl text-espresso lg:text-5xl">{policy.title}</h1>
          <p className="mt-3 text-[12px] uppercase tracking-[0.2em] text-espresso/45">{policy.updated}</p>
        </div>
      </Reveal>

      <div className="mt-10 space-y-2">
        {sections.map((s, i) => (
          <Reveal key={s.heading} delay={i * 60}>
            <section className="rounded-2xl border hairline-gold bg-ivory p-6 sm:p-8">
              <h2 className="font-display text-xl text-espresso lg:text-2xl">{s.heading}</h2>
              {s.body.map((p, j) => (
                <p key={j} className="mt-3 text-[14.5px] leading-relaxed text-espresso/68">{p}</p>
              ))}
            </section>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <nav aria-label="Other policies" className="mt-12 flex flex-wrap gap-2.5">
          {KEYS.filter((k) => k !== slug).map((k) => (
            <Link
              key={k}
              href={`/legal/${k}`}
              className="rounded-full border border-espresso/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-espresso/60 transition-colors hover:border-gold hover:text-bronze"
            >
              {POLICIES[k].title}
            </Link>
          ))}
        </nav>
      </Reveal>
    </div>
  );
}
