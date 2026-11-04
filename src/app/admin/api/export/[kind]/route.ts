import { desc, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { coupons, orderItems, orders, payments, products, refunds, stockMovements, users } from "@/db/schema";
import { getAdmin } from "@/lib/admin-auth";
import { toCsv } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

/** CSV exports — session-guarded; respects the same filters shown in the UI. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ ok: false }, { status: 401 });

  const { kind } = await params;
  const url = req.nextUrl;
  let filename = "export.csv";
  let csv = "empty\n";

  if (kind === "orders") {
    const q = url.searchParams.get("q")?.trim();
    const status = url.searchParams.get("status")?.trim();
    const rows = await db
      .select()
      .from(orders)
      .where(
        sql.join(
          [
            q ? sql`(${orders.orderNumber} ilike ${"%" + q + "%"} or ${orders.email} ilike ${"%" + q + "%"} or ${orders.name} ilike ${"%" + q + "%"})` : sql`true`,
            status ? sql`${orders.status} = ${status}` : sql`true`,
          ],
          sql` and `,
        ),
      )
      .orderBy(desc(orders.createdAt))
      .limit(5000);
    csv = toCsv(
      rows.map((o) => ({
        order: o.orderNumber, created: o.createdAt.toISOString(), customer: o.name, email: o.email, phone: o.phone,
        city: o.city, state: o.state, pincode: o.pincode, subtotal: o.subtotal, discount: o.discount, coupon: o.coupon ?? "",
        shipping: o.shipping, total: o.total, status: o.status, provider: o.paymentProvider,
        tracking: o.trackingId ?? "", courier: o.shippingProvider ?? "",
      })),
      ["order","created","customer","email","phone","city","state","pincode","subtotal","discount","coupon","shipping","total","status","provider","tracking","courier"],
    );
    filename = "orders.csv";
  } else if (kind === "order-items") {
    const rows = await db.select().from(orderItems).orderBy(desc(orderItems.id)).limit(10000);
    csv = toCsv(rows.map((i) => ({ orderId: i.orderId, product: i.name, slug: i.slug, qty: i.qty, unitPrice: i.unitPrice, lineTotal: i.lineTotal })), ["orderId","product","slug","qty","unitPrice","lineTotal"]);
    filename = "order-items.csv";
  } else if (kind === "customers") {
    const rows = await db
      .select({
        email: orders.email, name: sql<string>`max(${orders.name})`, orders: sql<number>`count(*)::int`,
        spend: sql<number>`coalesce(sum(case when ${orders.status} in ('paid','crafting','shipped','delivered') then ${orders.total} else 0 end),0)::int`,
        lastOrder: sql<string>`max(${orders.createdAt})`,
      })
      .from(orders)
      .groupBy(orders.email);
    csv = toCsv(rows.map((r) => ({ email: r.email, name: r.name, orders: r.orders, spendInr: r.spend, lastOrder: String(r.lastOrder) })), ["email","name","orders","spendInr","lastOrder"]);
    filename = "customers.csv";
  } else if (kind === "accounts") {
    const rows = await db.select().from(users).orderBy(desc(users.createdAt)).limit(10000);
    csv = toCsv(rows.map((u) => ({ name: u.name, email: u.email, joined: u.createdAt.toISOString() })), ["name","email","joined"]);
    filename = "registered-accounts.csv";
  } else if (kind === "products") {
    const rows = await db.select().from(products).orderBy(products.sort);
    csv = toCsv(
      rows.map((p) => ({
        sku: p.sku, name: p.name, slug: p.slug, status: p.status, price: p.price, mrp: p.mrp, stock: p.stock,
        lowStockAt: p.lowStockThreshold, weightGrams: p.weightGrams, cocoaPercent: p.cocoaPercent,
      })),
      ["sku","name","slug","status","price","mrp","stock","lowStockAt","weightGrams","cocoaPercent"],
    );
    filename = "products.csv";
  } else if (kind === "stock") {
    const rows = await db
      .select({
        createdAt: stockMovements.createdAt, product: products.name, delta: stockMovements.delta,
        reason: stockMovements.reason, note: stockMovements.note,
      })
      .from(stockMovements)
      .innerJoin(products, sql`${products.id} = ${stockMovements.productId}`)
      .orderBy(desc(stockMovements.createdAt))
      .limit(5000);
csv = toCsv(rows.map((r) => ({ date: r.createdAt.toISOString(), product: r.product, delta: r.delta, reason: r.reason, note: r.note ?? "" })), ["date","product","delta","reason","note"]);
    filename = "stock-movements.csv";
  } else if (kind === "payments") {
    const rows = await db
      .select({ payment: payments, order: orders.orderNumber })
      .from(payments)
      .innerJoin(orders, sql`${orders.id} = ${payments.orderId}`)
      .orderBy(desc(payments.createdAt))
      .limit(10000);
    csv = toCsv(
      rows.map(({ payment: p, order }) => ({
        order, amount: p.amount, currency: p.currency, status: p.status, method: p.method ?? "", verified: p.verified,
        razorpayOrderId: p.razorpayOrderId ?? "", razorpayPaymentId: p.razorpayPaymentId ?? "", created: p.createdAt.toISOString(),
      })),
    );
    filename = "payments.csv";
  } else if (kind === "refunds") {
    const rows = await db.select().from(refunds).orderBy(desc(refunds.createdAt)).limit(5000);
    csv = toCsv(rows.map((r) => ({ id: r.id, orderId: r.orderId, amount: r.amount, reason: r.reason, status: r.status, created: r.createdAt.toISOString() })), ["id","orderId","amount","reason","status","created"]);
    filename = "refunds.csv";
  } else if (kind === "coupons") {
    const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
csv = toCsv(rows.map((c) => ({ code: c.code, percent: c.value, minSubtotal: c.minSubtotal, maxDiscount: c.maxDiscount ?? "", used: c.usedCount, limit: c.usageLimit ?? "", active: c.active, expires: c.expiresAt?.toISOString() ?? "" })), ["code","percent","minSubtotal","maxDiscount","used","limit","active","expires"]);
    filename = "coupons.csv";
  } else {
    return NextResponse.json({ ok: false, message: "Unknown export" }, { status: 404 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="paradelle-${filename}"`,
    },
  });
}
