"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

/** Full product gallery — renders every DB-linked image (4 per signature bar). */
export function Gallery({ product }: { product: Product & { imageList?: { id: string; url: string; alt: string; position: number }[] } }) {
  const [index, setIndex] = useState(0);
  const slides =
    product.imageList && product.imageList.length > 0
      ? [...product.imageList].sort((a, b) => a.position - b.position).map((i) => ({ src: i.url, label: i.alt }))
      : [
          { src: product.images.front, label: "sealed front wrapper" },
          { src: product.images.angle, label: "three-quarter product view" },
        ];

  return (
    <div>
      <div className="group relative aspect-square overflow-hidden rounded-3xl bg-cream ring-1 ring-espresso/8">
        {slides.map((s, i) => (
          <Image
            key={s.src}
            src={s.src}
            alt={s.label.toLowerCase().includes(product.name.toLowerCase()) ? s.label : `${product.name} — ${s.label}`}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority={i === 0}
            className={cn(
              "object-cover transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
              i === index ? "opacity-100" : "opacity-0",
              "group-hover:scale-[1.05]",
            )}
          />
        ))}
        <span className="absolute left-5 top-5 rounded-full bg-ivory/90 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-bronze backdrop-blur">
          {product.cocoaPercent}% cacao
        </span>
        <span className="absolute right-5 top-5 rounded-full bg-ivory/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-espresso/80 backdrop-blur">
          {index + 1} / {slides.length}
        </span>
        {/* Dot indicators for quick mobile navigation */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((s, i) => (
            <button
              key={s.src}
              type="button"
              aria-label={`View image ${i + 1}`}
              onClick={() => setIndex(i)}
              className="flex h-7 w-7 items-center justify-center"
            >
              <span className={cn("block h-2 rounded-full transition-all duration-300", i === index ? "w-5 bg-gold" : "w-2 bg-espresso/25 group-hover:bg-espresso/40 hover:bg-espresso/50")} />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2.5">
        {slides.map((s, i) => (
          <button
            key={s.src}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`View ${s.label}`}
            aria-pressed={i === index}
            className={cn(
              "relative aspect-square w-full overflow-hidden rounded-xl ring-offset-2 ring-offset-ivory transition-all",
              i === index ? "ring-2 ring-gold" : "ring-1 ring-espresso/10 opacity-70 hover:opacity-100",
            )}
          >
            <Image src={s.src} alt="" fill sizes="(max-width: 640px) 23vw, 120px" className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
