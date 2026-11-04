import Link from "next/link";
import { FileText, Home, BookOpen, HelpCircle, Scale } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { getContent, HOMEPAGE_DEFAULTS, STORY_DEFAULTS } from "@/lib/cms";
import { FAQS, POLICIES, type PolicyKey } from "@/lib/content";
import { saveFaqsAction, saveHomepageAction, savePolicyAction, saveStoryAction } from "@/lib/admin/actions-core";
import { FaqsEditor, PendingButton, PolicyEditor } from "@/components/admin/client";
import { AdminField, Flash, PageHeader, adminInput } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export const metadata = { title: "Website content" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "homepage", label: "Homepage", icon: Home },
  { key: "story", label: "Brand story", icon: BookOpen },
  { key: "faqs", label: "FAQs", icon: HelpCircle },
  { key: "policies", label: "Policies", icon: Scale },
];

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ tab?: string; ok?: string; error?: string }> }) {
  await requireAdmin("content");
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "homepage";

  const [home, story, faqs, ...policyValues] = await Promise.all([
    getContent("homepage", HOMEPAGE_DEFAULTS),
    getContent("story", STORY_DEFAULTS),
    getContent("faqs", FAQS),
    ...(Object.keys(POLICIES) as PolicyKey[]).map((k) => getContent(`policy.${k}`, { sections: POLICIES[k].sections })),
  ]);
  const policyEntries = (Object.keys(POLICIES) as PolicyKey[]).map((k, i) => ({ key: k, title: POLICIES[k].title, sections: policyValues[i].sections }));

  return (
    <>
      <PageHeader title="Website content" sub="Edit the living copy of the storefront. Changes publish instantly — the public pages read these blocks." />

      <nav aria-label="Content sections" className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/content?tab=${t.key}`}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] transition-colors",
              tab === t.key ? "border-espresso bg-espresso text-ivory" : "border-espresso/15 bg-white text-espresso/60 hover:border-bronze hover:text-bronze",
            )}
          >
            <t.icon className="h-3.5 w-3.5" strokeWidth={1.8} /> {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-5"><Flash ok={sp.ok} error={sp.error} /></div>

      <div className="mt-2 max-w-3xl">
        {tab === "homepage" ? (
          <form action={saveHomepageAction} className="space-y-5 rounded-2xl border border-espresso/8 bg-white p-6">
            <h2 className="font-display flex items-center gap-2 text-lg text-espresso"><FileText className="h-4.5 w-4.5 text-bronze" strokeWidth={1.7} /> Hero &amp; highlights</h2>
            <AdminField label="Announcement bar"><input name="announcement" defaultValue={home.announcement} className={adminInput} /></AdminField>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="Headline — line one"><input name="heroTitle1" defaultValue={home.heroTitle1} className={adminInput} /></AdminField>
              <AdminField label="Headline — gold line"><input name="heroTitle2" defaultValue={home.heroTitle2} className={adminInput} /></AdminField>
            </div>
            <AdminField label="Hero intro copy"><textarea name="heroSub" rows={3} defaultValue={home.heroSub} className={adminInput} /></AdminField>
            <AdminField label="Philosophy quote" hint="the plum story band"><textarea name="storyQuote" rows={2} defaultValue={home.storyQuote} className={adminInput} /></AdminField>
            <PendingButton>Publish homepage</PendingButton>
          </form>
        ) : null}

        {tab === "story" ? (
          <form action={saveStoryAction} className="space-y-5 rounded-2xl border border-espresso/8 bg-white p-6">
            <h2 className="font-display text-lg text-espresso">Our Story — closing quote</h2>
            <AdminField label="Quote"><textarea name="quote" rows={2} defaultValue={story.quote} className={adminInput} /></AdminField>
            <AdminField label="Attribution"><input name="attribution" defaultValue={story.attribution} className={adminInput} /></AdminField>
            <PendingButton>Publish story quote</PendingButton>
            <p className="text-[12px] text-espresso/45">Long-form story paragraphs are intentionally developer-managed to protect layout quality.</p>
          </form>
        ) : null}

        {tab === "faqs" ? (
          <div className="rounded-2xl border border-espresso/8 bg-white p-6">
            <h2 className="font-display mb-4 text-lg text-espresso">Frequently asked questions</h2>
            <form action={saveFaqsAction}>
              <FaqsEditor initial={faqs} />
            </form>
          </div>
        ) : null}

        {tab === "policies" ? (
          <div className="space-y-8">
            {policyEntries.map((p) => (
              <div key={p.key} className="rounded-2xl border border-espresso/8 bg-white p-6">
                <h2 className="font-display mb-4 text-lg text-espresso">{p.title}</h2>
                <form action={savePolicyAction}>
                  <PolicyEditor policyKey={p.key} initial={p.sections} />
                </form>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}
