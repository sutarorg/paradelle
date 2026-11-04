import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Lock } from "lucide-react";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { PayNowButton } from "@/components/pay-now";
import { ButtonLink, Kicker } from "@/components/ui";
import { formatINR } from "@/lib/utils";
import { pageMetadata, SOCIAL_IMAGE_BY_PAGE } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ orderNumber: string }> }): Promise<Metadata> {
  const { orderNumber } = await params;
  return pageMetadata({
    path: `/pay/${encodeURIComponent(orderNumber)}`,
    title: "Complete Your PARADELLE Payment | PARADELLE CHOCOLATES",
    description: "Complete payment for your reserved PARADELLE chocolate order through Razorpay.",
    image: SOCIAL_IMAGE_BY_PAGE.collection,
    noindex: true,
  });
}
export const dynamic = "force-dynamic";

export default async function PayPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const rows = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  const order = rows[0];
  if (!order) notFound();

  const payable = order.status === "payment_pending";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
      <Kicker className="justify-center">Reserved for you</Kicker>
      <h1 className="font-display mt-3 text-4xl text-espresso">{order.orderNumber}</h1>

      {payable ? (
        <>
          <p className="mt-4 max-w-sm text-[14.5px] leading-relaxed text-espresso/65">
            Your bars are reserved for 24 hours. Complete payment of
            <span className="font-display text-espresso"> {formatINR(order.total)} </span>
            through Razorpay&rsquo;s secure window — UPI, cards, net banking or wallets.
          </p>
          <div className="mt-8">
            <PayNowButton orderNumber={order.orderNumber} />
          </div>
          <p className="mt-6 flex items-center gap-2 text-[12px] text-espresso/45">
            <Lock className="h-3.5 w-3.5" strokeWidth={1.8} /> Prepaid only — we never offer Cash on Delivery.
          </p>
        </>
      ) : (
        <>
          <p className="mt-4 max-w-sm text-[14.5px] leading-relaxed text-espresso/65">
            This order is already <span className="font-medium capitalize text-espresso">{order.status.replace(/_/g, " ")}</span> — nothing left to pay.
          </p>
          <ButtonLink href="/account" className="mt-8">View your orders</ButtonLink>
        </>
      )}
    </div>
  );
}
