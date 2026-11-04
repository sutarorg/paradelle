import { eq } from "drizzle-orm";
import { db } from "@/db";
import { siteContent } from "@/db/schema";

/**
 * CMS blocks (Phase 2). Admin edits `site_content` rows; public pages read
 * through this helper with a typed fallback so the storefront never degrades.
 */
export async function getContent<T>(key: string, fallback: T): Promise<T> {
  try {
    const rows = await db.select().from(siteContent).where(eq(siteContent.key, key)).limit(1);
    const value = rows[0]?.value as T | undefined;
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export type HomepageContent = {
  heroTitle1: string;
  heroTitle2: string;
  heroSub: string;
  announcement: string;
  storyQuote: string;
};

export const HOMEPAGE_DEFAULTS: HomepageContent = {
  heroTitle1: "Crafted for",
  heroTitle2: "true indulgence.",
  heroSub:
    "Four signature bars — milk, dark, crunchy nut and a pistachio heart — slow-roasted, long-conched and hand-tempered in small weekly batches.",
  announcement: "Complimentary shipping on orders above ₹1,500 · Small-batch, crafted weekly",
  storyQuote: "Indulgence is not excess. It is attention — to the bean, the roast, the temper, and the person it is meant for.",
};

export type StoryContent = { quote: string; attribution: string };
export const STORY_DEFAULTS: StoryContent = {
  quote: "Four bars is not a limitation. It is a standard.",
  attribution: "The Paradelle Atelier",
};

export type PolicyContent = { sections: { heading: string; body: string[] }[] };
