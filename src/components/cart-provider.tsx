"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PRODUCTS, getProduct } from "@/lib/products";
import { normalizeLines } from "@/lib/commerce";

export type CartItem = { slug: string; qty: number };

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  count: number;
  subtotal: number;
  coupon: string;
  setCoupon: (code: string) => void;
  add: (slug: string, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const ITEMS_KEY = "paradelle-cart-v1";
const COUPON_KEY = "paradelle-coupon-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [coupon, setCouponState] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const syncedRef = useRef(false);

  useEffect(() => {
    // Hydrate from localStorage after mount (SSR renders an empty bag first),
    // then merge with the server cart when the customer is signed in.
    const id = window.setTimeout(async () => {
      let local: CartItem[] = [];
      try {
        const raw = window.localStorage.getItem(ITEMS_KEY);
        if (raw) local = JSON.parse(raw) as CartItem[];
        setItems(normalizeLines(local));
        const c = window.localStorage.getItem(COUPON_KEY);
        if (c) setCouponState(c);
      } catch { /* fresh cart */ }
      setHydrated(true);

      try {
        const merge = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: normalizeLines(local) }),
        });
        if (merge.ok) {
          const data = (await merge.json()) as { items?: CartItem[]; anonymous?: boolean };
          if (!data.anonymous) {
            if (data.items) setItems((_cur) => normalizeLines(data.items ?? []));
            syncedRef.current = true;
          }
        }
      } catch { /* guest or offline cart — local stays authoritative */ }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  // Best-effort push to the server cart for signed-in customers.
  useEffect(() => {
    if (!hydrated) return;
    if (!syncedRef.current) return;
    const t = window.setTimeout(() => {
      void fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      }).catch(() => { syncedRef.current = false; });
    }, 600);
    return () => window.clearTimeout(t);
  }, [items, hydrated]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const value = useMemo<CartContextValue>(() => {
    const clean = normalizeLines(items);
    const count = clean.reduce((n, l) => n + l.qty, 0);
    const subtotal = clean.reduce((n, l) => n + (getProduct(l.slug)?.price ?? 0) * l.qty, 0);
    return {
      items: clean,
      hydrated,
      count,
      subtotal,
      coupon,
      setCoupon: (code: string) => {
        const c = code.trim().toUpperCase();
        setCouponState(c);
        try {
          if (c) window.localStorage.setItem(COUPON_KEY, c);
          else window.localStorage.removeItem(COUPON_KEY);
        } catch { /* ignore */ }
      },
      add: (slug, qty = 1) =>
        setItems((cur) => {
          const found = cur.find((l) => l.slug === slug);
          if (found) return cur.map((l) => (l.slug === slug ? { ...l, qty: Math.min(99, l.qty + qty) } : l));
          return [...cur, { slug, qty: Math.max(1, qty) }];
        }),
      setQty: (slug, qty) =>
        setItems((cur) =>
          qty <= 0 ? cur.filter((l) => l.slug !== slug) : cur.map((l) => (l.slug === slug ? { ...l, qty: Math.min(99, qty) } : l)),
        ),
      remove: (slug) => setItems((cur) => cur.filter((l) => l.slug !== slug)),
      clear: () => setItems([]),
    };
  }, [items, coupon, hydrated]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

/** Slugs in catalogue order — used for a deterministic mini-cart preview. */
export const CATALOG_SLUGS = PRODUCTS.map((p) => p.slug);
