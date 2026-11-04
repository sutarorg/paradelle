"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, ArrowUpDown, PackageSearch } from "lucide-react";
import type { Product } from "@/lib/products";
import { ProductCard } from "@/components/product-card";
import { inputClass } from "@/components/ui";
import { cn } from "@/lib/utils";

type Sort = "featured" | "price-asc" | "price-desc" | "name";

const SORT_LABELS: Record<Sort, string> = {
  featured: "Featured",
  "price-asc": "Price — low to high",
  "price-desc": "Price — high to low",
  name: "Name — A to Z",
};

export function CollectionClient({ products }: { products: Product[] }) {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("featured");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (params.get("focus") === "search") searchRef.current?.focus();
      const q = params.get("q");
      if (q) setQuery(q);
    }, 0);
    return () => window.clearTimeout(id);
  }, [params]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products.filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.tastingNotes.some((t) => t.toLowerCase().includes(q)) ||
        p.ingredients.join(" ").toLowerCase().includes(q),
    );
    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "name":
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return list;
  }, [query, sort, products]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-espresso/40" strokeWidth={1.7} />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bars, notes, ingredients…"
            aria-label="Search the collection"
            className={cn(inputClass, "rounded-full pl-11")}
          />
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-[12px] uppercase tracking-[0.2em] text-espresso/50 sm:block">
            {results.length} of {products.length} bars
          </p>
          <div className="relative">
            <ArrowUpDown className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-espresso/40" strokeWidth={1.7} />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Sort products"
              className="appearance-none rounded-full border border-espresso/15 bg-cream py-3 pl-11 pr-10 text-[13px] font-medium text-espresso outline-none transition-colors focus:border-bronze"
            >
              {(Object.keys(SORT_LABELS) as Sort[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="mt-16 flex flex-col items-center rounded-3xl border hairline-gold bg-cream px-6 py-20 text-center">
          <PackageSearch className="h-10 w-10 text-bronze/60" strokeWidth={1.4} />
          <h2 className="font-display mt-5 text-2xl text-espresso">Nothing matches &ldquo;{query}&rdquo;</h2>
          <p className="mt-2 max-w-sm text-sm text-espresso/60">
            Our collection is deliberately small — four signature bars. Try &ldquo;milk&rdquo;, &ldquo;pistachio&rdquo; or &ldquo;roasted&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-6 rounded-full border border-espresso/25 px-6 py-2.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-espresso transition-colors hover:border-gold hover:bg-gold/10"
          >
            Clear search
          </button>
        </div>
      ) : (
        <>
          <h2 className="sr-only">Products</h2>
          <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {results.map((p, i) => (
              <ProductCard key={p.slug} product={p} priority={i < 2} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
