import type { ReactNode } from "react";
import { CartProvider } from "@/components/cart-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/** Public storefront chrome — /admin renders without it (root layout only). */
export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </CartProvider>
  );
}
