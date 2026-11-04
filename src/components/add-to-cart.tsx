"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag, Check, Zap } from "lucide-react";
import type { Product } from "@/lib/products";
import { useCart } from "@/components/cart-provider";
import { formatINR, cn } from "@/lib/utils";

export function AddToCart({ product }: { product: Product }) {
  const { add } = useCart();
  const router = useRouter();
  const [qty, setQtyState] = useState(1);
  const [added, setAdded] = useState(false);

  function setQty(next: number) {
    setQtyState(Math.max(1, Math.min(24, next)));
  }

  function handleAdd(openBag = false) {
    add(product.slug, qty);
    if (openBag) {
      router.push("/checkout");
      return;
    }
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <>
      <div className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <div className="inline-flex items-center justify-between rounded-full border border-espresso/20 bg-cream sm:justify-start">
            <button type="button" aria-label="Decrease quantity" onClick={() => setQty(qty - 1)} className="p-3.5 text-espresso/70 transition-colors hover:text-espresso disabled:opacity-30" disabled={qty <= 1}>
              <Minus className="h-4 w-4" strokeWidth={1.8} />
            </button>
            <span className="w-12 text-center font-display text-lg tabular-nums" aria-live="polite">{qty}</span>
            <button type="button" aria-label="Increase quantity" onClick={() => setQty(qty + 1)} className="p-3.5 text-espresso/70 transition-colors hover:text-espresso">
              <Plus className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleAdd(false)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2.5 rounded-full border px-7 py-4 text-[13px] font-semibold uppercase tracking-[0.18em] transition-all duration-300 active:translate-y-px",
              added ? "border-gold bg-gold text-espresso" : "border-espresso bg-espresso text-ivory hover:bg-plum hover:border-plum",
            )}
          >
            {added ? <Check className="h-4 w-4" strokeWidth={2.4} /> : <ShoppingBag className="h-4 w-4" strokeWidth={1.7} />}
            {added ? "In your bag" : "Add to bag"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => handleAdd(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-espresso/25 px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-espresso transition-colors hover:border-gold hover:bg-gold/10"
        >
          <Zap className="h-4 w-4 text-bronze" strokeWidth={1.7} />
          Order Now
        </button>
      </div>

      {/* Sticky mobile action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t hairline-gold bg-ivory/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-bronze">{product.shortName}</p>
            <p className="font-display text-xl text-espresso">{formatINR(product.price)}</p>
          </div>
          <button
            type="button"
            onClick={() => handleAdd(false)}
            className="flex items-center gap-2 rounded-full bg-espresso px-6 py-3.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-ivory active:translate-y-px"
          >
            {added ? <Check className="h-4 w-4 text-gold" strokeWidth={2.4} /> : <ShoppingBag className="h-4 w-4" strokeWidth={1.7} />}
            {added ? "Added" : "Add to bag"}
          </button>
        </div>
      </div>
    </>
  );
}
