import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Truck, Leaf } from "lucide-react";
import { PRODUCTS } from "@/lib/products";
import { NewsletterForm } from "@/components/newsletter-form";

const shopLinks = [
  ...PRODUCTS.map((p) => ({ href: `/product/${p.slug}`, label: p.shortName })),
  { href: "/collection", label: "View the Collection" },
];

const houseLinks = [
  { href: "/our-story", label: "Our Story" },
  { href: "/craftsmanship", label: "Craftsmanship" },
  { href: "/#gifting", label: "Gifting" },
  { href: "/contact", label: "Contact" },
];

const supportLinks = [
  { href: "/faqs", label: "FAQs" },
  { href: "/legal/shipping", label: "Shipping Policy" },
  { href: "/legal/refunds", label: "Refunds & Replacements" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/terms", label: "Terms of Service" },
];

export function SiteFooter() {
  return (
    <footer className="bg-espresso text-ivory">
      {/* Newsletter band */}
      <div className="border-b border-ivory/10">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-gold">Letters from the atelier</p>
            <h2 className="font-display mt-3 text-3xl leading-tight lg:text-4xl">
              10% off your first order,
              <span className="text-gilt"> for those who savour slowly.</span>
            </h2>
          </div>
          <NewsletterForm dark />
        </div>
      </div>

      {/* Link columns */}
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr] lg:gap-14 lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="relative block h-12 w-12 overflow-hidden rounded-full bg-ivory p-0.5">
              <Image src="/images/logo.png" alt="" fill sizes="48px" className="rounded-full object-cover" />
            </span>
            <span>
              <span className="font-display block text-lg tracking-[0.18em]">PARADELLE</span>
              <span className="block text-[9px] font-semibold uppercase tracking-[0.38em] text-gold">Chocolates</span>
            </span>
          </div>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-ivory/60">
            Small-batch European-style chocolate, crafted for true indulgence and delivered across India in temperature-protective packaging.
          </p>
          <ul className="mt-6 space-y-3 text-[13px] text-ivory/70">
            <li className="flex items-center gap-2.5">
              <Truck className="h-4 w-4 text-gold" strokeWidth={1.6} /> Insulated, tracked delivery
            </li>
            <li className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-gold" strokeWidth={1.6} /> Secure payments by Razorpay
            </li>
            <li className="flex items-center gap-2.5">
              <Leaf className="h-4 w-4 text-gold" strokeWidth={1.6} /> Small-batch, vegetarian recipes
            </li>
          </ul>
        </div>

        <FooterCol title="Collection" links={shopLinks} />
        <FooterCol title="The House" links={houseLinks} />
        <FooterCol title="Support & Legal" links={supportLinks} />
      </div>

      {/* Payment strip */}
      <div className="border-t border-ivory/10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-6 text-[12px] text-ivory/55 sm:px-6 lg:flex-row lg:items-center lg:px-8">
          <p>
            Secure prepaid payments via <span className="font-semibold text-gold">Razorpay</span> — UPI &middot; Cards &middot; NetBanking &middot; Wallets.
            <span className="ml-2 text-ivory/65">We do not offer Cash on Delivery.</span>
          </p>
          <p className="uppercase tracking-[0.2em]">All prices are MRP, taxes included</p>
        </div>
      </div>

      <div className="border-t border-ivory/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-[12px] text-ivory/65 sm:flex-row sm:px-6 lg:px-8">
          <p>&copy; {new Date().getFullYear()} PARADELLE CHOCOLATES. All rights reserved.</p>
          <p className="font-display italic text-gold/80">Crafted for true indulgence.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <nav aria-label={title}>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.32em] text-gold">{title}</h3>
      <ul className="mt-5 space-y-3">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="text-sm text-ivory/65 transition-colors hover:text-gold">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
