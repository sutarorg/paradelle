import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout-form";
import { getSessionUser } from "@/lib/auth";
import { getCatalog, getShippingSettings } from "@/lib/catalog";
import { Kicker } from "@/components/ui";
import { Reveal } from "@/components/reveal";
import type { SavedAddress } from "@/components/checkout-form";

export const metadata: Metadata = {
  title: "Secure Checkout",
  description: "Guest checkout in under a minute — transparent totals, Razorpay secure payment.",
};
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [user, catalog, shipping] = await Promise.all([getSessionUser(), getCatalog(), getShippingSettings()]);
  let savedAddresses: SavedAddress[] = [];
  if (user) {
    const { db } = await import("@/db");
    const { addresses } = await import("@/db/schema");
    const { eq, desc } = await import("drizzle-orm");
    savedAddresses = await db.select().from(addresses).where(eq(addresses.userId, user.id)).orderBy(desc(addresses.isDefault));
  }
  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-14 sm:px-6 lg:px-8 lg:pt-16">
      <Reveal>
        <Kicker>Almost there</Kicker>
        <h1 className="font-display mt-4 text-4xl text-espresso lg:text-5xl">Checkout</h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-espresso/70">
          Eight short fields, one secure payment. Your total below is final — taxes included, shipping already shown.
        </p>
      </Reveal>
      <div className="mt-10">
        <CheckoutForm user={user} catalog={catalog} shipping={shipping} addresses={savedAddresses} />
      </div>
    </div>
  );
}
