import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";
import { Kicker } from "@/components/ui";
import { Reveal } from "@/components/reveal";
import { getCatalog, getShippingSettings } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Your Bag",
  description: "Review your selection — transparent totals, shipping shown upfront, secure Razorpay checkout.",
};
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const [catalog, shipping] = await Promise.all([getCatalog(), getShippingSettings()]);
  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-14 sm:px-6 lg:px-8 lg:pt-16">
      <Reveal>
        <Kicker>Your selection</Kicker>
        <h1 className="font-display mt-4 text-4xl text-espresso lg:text-5xl">The bag</h1>
      </Reveal>
      <div className="mt-10">
        <CartView catalog={catalog} shipping={shipping} />
      </div>
    </div>
  );
}
