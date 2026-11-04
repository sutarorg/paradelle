import { PRODUCTS, getProduct, type Product } from "./products";

/**
 * Commerce rules — one shared module used by the client UI AND the checkout API,
 * so the browser and the server always quote identical totals.
 * Phase 2: catalogue, coupon rules and shipping charges can be overridden by the
 * database (admin-managed); the constants below are the offline defaults.
 */
/** All money values are INTEGER PAISE (₹1,500 → 150000). */
export const FREE_SHIPPING_THRESHOLD = 150000;
export const FLAT_SHIPPING_FEE = 9900;

export type Coupon = {
  code: string;
  kind: "percent";
  value: number;
  minSubtotal: number;
  description: string;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usedCount?: number;
  expiresAt?: Date | string | null;
};

/** Seed coupons (mirrored in the `coupons` table; admin UI manages the DB rows). */
export const COUPONS: Coupon[] = [
  { code: "WELCOME10", kind: "percent", value: 10, minSubtotal: 0, description: "10% welcome treat on your first order" },
  { code: "GIFT250", kind: "percent", value: 5, minSubtotal: 150000, description: "5% off gifting orders above ₹1,500" },
];

export type CartLine = { slug: string; qty: number };

export function normalizeLines(lines: CartLine[], catalog: Product[] = PRODUCTS): CartLine[] {
  const map = new Map<string, number>();
  const active = new Set(catalog.map((p) => p.slug));
  for (const l of lines) {
    const qty = Math.max(0, Math.min(99, Math.floor(Number(l.qty) || 0)));
    if (!active.has(l.slug) || qty === 0) continue;
    map.set(l.slug, (map.get(l.slug) ?? 0) + qty);
  }
  return catalog.filter((p) => map.has(p.slug)).map((p) => ({ slug: p.slug, qty: map.get(p.slug)! }));
}

export function cartSubtotal(lines: CartLine[], catalog: Product[] = PRODUCTS) {
  return normalizeLines(lines, catalog).reduce((sum, l) => {
    const p = catalog.find((c) => c.slug === l.slug) ?? getProduct(l.slug);
    return sum + (p ? p.price * l.qty : 0);
  }, 0);
}

export function findCoupon(code: string, dbRows?: Coupon[]): Coupon | undefined {
  const c = code.trim().toUpperCase();
  if (!c) return undefined;
  const fromDb = dbRows?.find((r) => r.code.toUpperCase() === c);
  return fromDb ?? COUPONS.find((x) => x.code === c);
}

export type TotalsOptions = { catalog?: Product[]; flatFee?: number; freeThreshold?: number };

export function computeTotals(lines: CartLine[], couponCode?: string, availableCoupons?: Coupon[], opts: TotalsOptions = {}) {
  const catalog = opts.catalog ?? PRODUCTS;
  const flatFee = opts.flatFee ?? FLAT_SHIPPING_FEE;
  const threshold = opts.freeThreshold ?? FREE_SHIPPING_THRESHOLD;

  const normalized = normalizeLines(lines, catalog);
  const subtotal = cartSubtotal(normalized, catalog);
  const coupon = couponCode ? findCoupon(couponCode, availableCoupons) : undefined;

  let discount = 0;
  let couponError: string | null = null;
  if (couponCode && couponCode.trim()) {
    if (!coupon) {
      couponError = "This code is not valid.";
    } else if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      couponError = "This code has expired.";
    } else if (coupon.usageLimit != null && (coupon.usedCount ?? 0) >= coupon.usageLimit) {
      couponError = "This code has been fully used.";
    } else if (subtotal < coupon.minSubtotal) {
      couponError = `Requires a subtotal of ₹${(coupon.minSubtotal / 100).toLocaleString("en-IN")} or more.`;
    } else {
      discount = Math.round((subtotal * coupon.value) / 100);
      if (coupon.maxDiscount != null && coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
    }
  }

  const afterDiscount = subtotal - discount;
  const shipping = subtotal === 0 ? 0 : afterDiscount >= threshold ? 0 : flatFee;
  const total = afterDiscount + shipping;

  return {
    lines: normalized,
    subtotal,
    coupon: coupon && !couponError ? coupon : null,
    couponError,
    discount,
    shipping,
    freeShipping: subtotal > 0 && shipping === 0,
    amountToFreeShipping: Math.max(0, threshold - afterDiscount),
    total,
  };
}
