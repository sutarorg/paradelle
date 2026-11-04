import { CartView } from "@/components/cart-view";
import { Kicker } from "@/components/ui";
import { Reveal } from "@/components/reveal";
import { getCatalog, getShippingSettings } from "@/lib/catalog";
import { pageMetadata, SOCIAL_IMAGE_BY_PAGE } from "@/lib/seo";

export const metadata = pageMetadata({
  path: "/cart",
  title: "Your Bag | PARADELLE CHOCOLATES",
  description: "Review your selection — transparent totals, shipping shown upfront, secure Razorpay checkout.",
  image: SOCIAL_IMAGE_BY_PAGE.collection,
  noindex: true,
});
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
