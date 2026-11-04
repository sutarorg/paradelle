import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems, payments, products, stockMovements, users } from "@/db/schema";
import type { CatalogProduct } from "@/lib/catalog";

/** Order statuses that represent money actually received. */
export const PAID_STATUSES = ["paid", "crafting", "shipped", "delivered"] as const;

export function rangeStart(range?: string): Date | null {
  const days = range === "7" ? 7 : range === "30" ? 30 : range === "90" ? 90 : null;
  if (!days) return null;
  const d = new Date();
  d.setDate(d.getDate() - days + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function rangeLabel(range?: string) {
  return range === "7" ? "Last 7 days" : range === "30" ? "Last 30 days" : range === "90" ? "Last 90 days" : "All time";
}

export type DashboardData = {
  revenue: number;
  paidOrders: number;
  pendingOrders: number;
  customers: number;
  aov: number;
  series: { label: string; value: number }[];
  bestSellers: { slug: string; name: string; qty: number; revenue: number }[];
  lowStock: { id: string; name: string; slug: string; stock: number; reserved: number; available: number; threshold: number }[];
  recentOrders: (typeof orders.$inferSelect)[];
};

export async function getDashboard(range?: string): Promise<DashboardData> {
  const since = rangeStart(range);
  const paidWhere = since
    ? and(inArray(orders.status, [...PAID_STATUSES]), gte(orders.createdAt, since))
    : inArray(orders.status, [...PAID_STATUSES]);

  const [agg, pending, custAgg, bestSellers, recentOrders, lowRows, movementsReserved] = await Promise.all([
    db
      .select({ revenue: sql<number>`coalesce(sum(${orders.total}),0)::int`, count: sql<number>`count(*)::int` })
      .from(orders)
      .where(paidWhere),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(since ? and(eq(orders.status, "payment_pending"), gte(orders.createdAt, since)) : eq(orders.status, "payment_pending")),
    db.select({ count: sql<number>`count(distinct ${orders.email})::int` }).from(orders).where(since ? gte(orders.createdAt, since) : sql`true`),
    db
      .select({
        slug: orderItems.slug,
        name: orderItems.name,
        qty: sql<number>`coalesce(sum(${orderItems.qty}),0)::int`,
        revenue: sql<number>`coalesce(sum(${orderItems.lineTotal}),0)::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(paidWhere)
      .groupBy(orderItems.slug, orderItems.name)
      .orderBy(sql`sum(${orderItems.qty}) desc`)
      .limit(5),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(8),
    db.select().from(products).where(inArray(products.status, ["active", "draft"])).orderBy(sql`${products.stock} asc`),
    // reserved = qty held by payment-pending orders
    db
      .select({ slug: orderItems.slug, qty: sql<number>`coalesce(sum(${orderItems.qty}),0)::int` })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(eq(orders.status, "payment_pending"))
      .groupBy(orderItems.slug),
  ]);

  // Daily revenue series for the window (or last 30 days when "all time" is empty-span heavy)
  const seriesDays = range === "7" ? 7 : range === "90" ? 90 : 30;
  const seriesSince = rangeStart(String(seriesDays))!;
  const daily = await db
    .select({
      day: sql<string>`to_char(${orders.createdAt} at time zone 'Asia/Kolkata', 'DD Mon')`,
      dayKey: sql<string>`to_char(${orders.createdAt} at time zone 'Asia/Kolkata', 'YYYY-MM-DD')`,
      value: sql<number>`coalesce(sum(${orders.total}),0)::int`,
    })
    .from(orders)
    .where(and(inArray(orders.status, [...PAID_STATUSES]), gte(orders.createdAt, seriesSince)))
    .groupBy(sql`2`, sql`1`)
    .orderBy(sql`2`);

  const byKey = new Map(daily.map((d) => [d.dayKey, { label: d.day, value: Number(d.value) }]));
  const series: { label: string; value: number }[] = [];
  for (let i = seriesDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ist = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const key = `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, "0")}-${String(ist.getDate()).padStart(2, "0")}`;
    const label = `${String(ist.getDate()).padStart(2, "0")} ${ist.toLocaleString("en-US", { month: "short" })}`;
    series.push(byKey.get(key) ?? { label, value: 0 });
  }

  const revenue = Number(agg[0]?.revenue ?? 0);
  const paidOrders = Number(agg[0]?.count ?? 0);
  const reservedMap = Object.fromEntries(movementsReserved.map((r) => [r.slug, Number(r.qty)]));
  const lowStock = lowRows
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      stock: p.stock,
      reserved: reservedMap[p.slug] ?? 0,
      available: Math.max(0, p.stock - (reservedMap[p.slug] ?? 0)),
      threshold: p.lowStockThreshold,
    }))
    .filter((p) => p.available <= p.threshold)
    .slice(0, 6);

  return {
    revenue,
    paidOrders,
    pendingOrders: Number(pending[0]?.count ?? 0),
    customers: Number(custAgg[0]?.count ?? 0),
    aov: paidOrders > 0 ? Math.round(revenue / paidOrders) : 0,
    series,
    bestSellers: bestSellers.map((b) => ({ slug: b.slug, name: b.name, qty: Number(b.qty), revenue: Number(b.revenue) })),
    lowStock,
    recentOrders,
  };
}

export type PaymentHistoryRow = typeof payments.$inferSelect;

export async function getOrderPayments(orderId: string) {
  return db.select().from(payments).where(eq(payments.orderId, orderId)).orderBy(desc(payments.createdAt));
}

/** Aggregated customers derived from real orders + registered accounts. */
export async function getCustomers(q?: string) {
  const search = q?.trim();
  const rows = await db
    .select({
      email: orders.email,
      name: sql<string>`max(${orders.name})`,
      ordersCount: sql<number>`count(*)::int`,
      spend: sql<number>`coalesce(sum(case when ${orders.status} in ('paid','crafting','shipped','delivered') then ${orders.total} else 0 end),0)::int`,
      lastOrder: sql<string>`max(${orders.createdAt})`,
      city: sql<string>`max(${orders.city})`,
    })
    .from(orders)
    .where(search ? sql`(${orders.email} ilike ${"%" + search + "%"} or ${orders.name} ilike ${"%" + search + "%"})` : sql`true`)
    .groupBy(orders.email)
    .orderBy(sql`count(*) desc, sum(case when ${orders.status} in ('paid','crafting','shipped','delivered') then ${orders.total} else 0 end) desc`)
    .limit(200);
  return rows;
}

export async function getRegisteredCount() {
  const rows = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  return Number(rows[0]?.count ?? 0);
}

export async function getRegisteredUsers(q?: string) {
  const search = q?.trim();
  return db
    .select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(search ? sql`(${users.email} ilike ${"%" + search + "%"} or ${users.name} ilike ${"%" + search + "%"})` : sql`true`)
    .orderBy(desc(users.createdAt))
    .limit(200);
}

export async function getStockMovements(productFilter?: string) {
  const query = db
    .select({
      id: stockMovements.id,
      productId: stockMovements.productId,
      delta: stockMovements.delta,
      reason: stockMovements.reason,
      note: stockMovements.note,
      createdAt: stockMovements.createdAt,
      productName: products.name,
    })
    .from(stockMovements)
    .innerJoin(products, eq(products.id, stockMovements.productId))
    .orderBy(desc(stockMovements.createdAt))
    .limit(60);
  return productFilter ? await query.where(eq(stockMovements.productId, productFilter)) : await query;
}

/** CSV with headers even on empty datasets (accounting tools require the schema row). */
export function toCsv(rows: Record<string, unknown>[], explicitHeaders?: string[]): string {
  const headers = explicitHeaders ?? (rows.length > 0 ? Object.keys(rows[0]) : []);
  if (headers.length === 0) return "\n";
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n") + "\n";
}

export function sortKeyFor(p: CatalogProduct) {
  return p.slug;
}
