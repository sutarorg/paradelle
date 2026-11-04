"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Plus, Check } from "lucide-react";
import type { Product } from "@/lib/products";
import { formatINR } from "@/lib/utils";
import { useCart } from "@/components/cart-provider";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  function quickAdd(e: React.MouseEvent) {
    e.preventDefault();
    add(product.slug, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <Link href={`/product/${product.slug}`} className="card-swap group block">
      <article>
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-cream ring-1 ring-espresso/8 transition-shadow duration-500 group-hover:shadow-[0_30px_60px_-30px_rgba(41,24,19,0.35)]">
          <Image
            src={product.images.front}
            alt={`${product.name} — sealed wrapper`}
            fill
            sizes="(max-width: 640px) 82vw, (max-width: 1024px) 44vw, 23vw"
            className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
            priority={priority}
          />
          <Image
            src={product.images.angle}
            alt=""
            aria-hidden
            fill
            sizes="(max-width: 640px) 82vw, (max-width: 1024px) 44vw, 23vw"
            className="img-alt object-cover"
          />
          <div className="absolute inset-x-4 bottom-4 translate-y-2 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={quickAdd}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-espresso/95 py-3 text-[12px] font-semibold uppercase tracking-[0.2em] text-ivory backdrop-blur transition-colors hover:bg-plum"
            >
              {added ? <Check className="h-4 w-4 text-gold" strokeWidth={2.4} /> : <Plus className="h-4 w-4" strokeWidth={2} />}
              {added ? "Added to bag" : "Add to bag"}
            </button>
          </div>
          <span className="absolute left-4 top-4 rounded-full bg-ivory/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-bronze backdrop-blur">
            {product.weightGrams} g
          </span>
        </div>

        <div className="mt-5 flex items-start justify-between gap-3 px-1">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-bronze">{product.line}</p>
            <h3 className="font-display mt-1.5 text-xl leading-snug text-espresso transition-colors group-hover:text-bronze">
              {product.shortName}
            </h3>
            <p className="mt-1 text-[13px] text-espresso/75">{product.cocoaPercent}% cacao &middot; {product.weightGrams} g</p>
          </div>
          <p className="font-display mt-1 text-lg text-espresso">{formatINR(product.price)}</p>
        </div>
      </article>
    </Link>
  );
}
