"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Search, User, ShoppingBag } from "lucide-react";
import { NAV_LINKS } from "@/lib/content";
import { useCart } from "@/components/cart-provider";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const { count, hydrated } = useCart();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const id = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return (
    <>
      <div className="bg-espresso text-center text-[11px] font-medium uppercase tracking-[0.22em] text-gold/90">
        <p className="mx-auto max-w-7xl px-4 py-2">FREE DELIVERY above ₹1,500</p>
      </div>

      <header
        className={cn(
          "sticky top-0 z-40 border-b hairline-gold bg-ivory/90 backdrop-blur-md transition-shadow duration-300",
          scrolled && "shadow-[0_18px_40px_-30px_rgba(41,24,19,0.4)]",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[76px] lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className="rounded-full p-2 text-espresso transition-colors hover:bg-espresso/5 lg:hidden"
            >
              <Menu className="h-5 w-5" strokeWidth={1.6} />
            </button>
            <Link href="/" className="group flex items-center gap-3">
              <span className="relative block h-10 w-10 overflow-hidden rounded-full lg:h-11 lg:w-11">
                <Image src="/images/logo.png" alt="" fill sizes="44px" className="object-cover" priority />
              </span>
              <span className="leading-none">
                <span className="font-display block text-lg tracking-[0.18em] text-espresso lg:text-xl">PARADELLE</span>
                <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.38em] text-bronze">Chocolates</span>
              </span>
            </Link>
          </div>

          <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((l) => {
              const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "relative py-2 text-[12px] font-semibold uppercase tracking-[0.22em] transition-colors",
                    active ? "text-espresso" : "text-espresso/55 hover:text-espresso",
                  )}
                >
                  {l.label}
                  <span
                    className={cn(
                      "absolute inset-x-0 -bottom-0.5 h-px bg-gold transition-transform duration-300",
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/collection?focus=search" aria-label="Search the collection" className="rounded-full p-2 text-espresso transition-colors hover:bg-espresso/5">
              <Search className="h-5 w-5" strokeWidth={1.6} />
            </Link>
            <Link href="/account" aria-label="Your account" className="hidden rounded-full p-2 text-espresso transition-colors hover:bg-espresso/5 sm:block">
              <User className="h-5 w-5" strokeWidth={1.6} />
            </Link>
            <Link href="/cart" aria-label={`Shopping bag, ${hydrated ? count : 0} items`} className="relative rounded-full p-2 text-espresso transition-colors hover:bg-espresso/5">
              <ShoppingBag className="h-5 w-5" strokeWidth={1.6} />
              {hydrated && count > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-plum px-1 text-[10px] font-bold text-ivory">
                  {count}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile drawer — inert & unfocusable while closed (a11y) */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open} inert={!open}>
        <div
          className={cn("absolute inset-0 bg-espresso/50 backdrop-blur-sm transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
          onClick={() => setOpen(false)}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-ivory shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b hairline-gold px-6 py-5">
            <span className="font-display text-lg tracking-[0.18em] text-espresso">PARADELLE</span>
            <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="rounded-full p-2 text-espresso hover:bg-espresso/5">
              <X className="h-5 w-5" strokeWidth={1.6} />
            </button>
          </div>
          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-6 py-8">
            <ul className="space-y-1">
              {[{ href: "/", label: "Home" }, ...NAV_LINKS, { href: "/account", label: "Account" }, { href: "/cart", label: "Shopping Bag" }].map((l, i) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="group flex items-center justify-between border-b border-espresso/8 py-4 font-display text-[26px] text-espresso transition-colors hover:text-bronze"
                    style={{ transitionDelay: `${i * 20}ms` }}
                  >
                    {l.label}
                    <span className="h-px w-6 bg-gold/60 transition-all group-hover:w-10" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-t hairline-gold px-6 py-5 text-[11px] uppercase tracking-[0.2em] text-espresso/50">
            Crafted for true indulgence
          </div>
        </div>
      </div>
    </>
  );
}
