import { pgTable, uuid, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * PARADELLE CHOCOLATES — data model (Phase 3).
 * Single Postgres database (Supabase in production) shared by storefront AND /admin.
 * ALL money columns are INTEGER PAISE (₹450 → 45000). Conversion to rupees happens
 * only at display (formatINR). Orders keep immutable unit-price snapshots.
 */

/* ─────────────────────────── Storefront customers ─────────────────────────── */

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  /** scrypt hash stored as `salt:hash` (hex) */
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ─────────────────────────── Admin team ─────────────────────────── */

/** Super Admin (role 'super') bypasses permission checks; staff carry explicit keys. */
export const ADMIN_PERMISSIONS = [
  "catalog",
  "inventory",
  "orders",
  "customers",
  "marketing",
  "content",
  "reports",
  "staff",
  "settings",
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("staff"), // 'super' | 'staff'
  permissions: text("permissions")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const adminSessions = pgTable("admin_sessions", {
  token: text("token").primaryKey(),
  adminId: uuid("admin_id")
    .notNull()
    .references(() => admins.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  adminId: uuid("admin_id").references(() => admins.id, { onDelete: "set null" }),
  adminEmail: text("admin_email"),
  action: text("action").notNull(), // e.g. 'product.update'
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ─────────────────────────── Catalogue ─────────────────────────── */

export type NutritionRow = { energy: string; protein: string; carbs: string; sugars: string; fat: string; satFat: string; sodium: string };

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  sku: text("sku").notNull().unique(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  line: text("line").notNull().default("The Signature Collection"),
  status: text("status").notNull().default("active"), // 'active' | 'draft' | 'archived'
  cocoaPercent: integer("cocoa_percent").notNull().default(45),
  weightGrams: integer("weight_grams").notNull().default(50),
  price: integer("price").notNull(),
  mrp: integer("mrp").notNull(),
  stock: integer("stock").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(12),
  tagline: text("tagline").notNull().default(""),
  description: text("description").notNull().default(""),
  tastingNotes: jsonb("tasting_notes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  ingredients: jsonb("ingredients").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  allergens: jsonb("allergens").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  crossContact: text("cross_contact").notNull().default(""),
  nutrition: jsonb("nutrition").$type<NutritionRow>().notNull(),
  storage: text("storage").notNull().default(""),
  shippingNote: text("shipping_note").notNull().default(""),
  accent: text("accent").notNull().default("#C9A66B"),
  seoTitle: text("seo_title").notNull().default(""),
  seoDescription: text("seo_description").notNull().default(""),
  sort: integer("sort").notNull().default(0),
  /** Food-label (FSSAI) fields — never prefabricated; enter from printed sleeves. */
  fssaiLicense: text("fssai_license").notNull().default(""),
  manufacturer: text("manufacturer").notNull().default(""),
  countryOfOrigin: text("country_of_origin").notNull().default("India"),
  bestBeforeMonths: integer("best_before_months").notNull().default(12),
  netQuantityLabel: text("net_quantity_label").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const productImages = pgTable("product_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  alt: text("alt").notNull().default(""),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ─────────────────────────── Inventory ─────────────────────────── */

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  /** signed change (+ receipt, − adjustment/sale write-off) */
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(), // receipt | correction | damage | sample | reservation | release
  note: text("note"),
  adminId: uuid("admin_id").references(() => admins.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ─────────────────────────── Orders & payments ─────────────────────────── */

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  pincode: text("pincode").notNull(),
  subtotal: integer("subtotal").notNull(),
  discount: integer("discount").notNull().default(0),
  coupon: text("coupon"),
  shipping: integer("shipping").notNull().default(0),
  total: integer("total").notNull(),
  /**
   * Lifecycle: payment_pending → paid → crafting → shipped → delivered (cancelled).
   * The payment_pending → paid transition is ONLY set by a verified Razorpay
   * event (webhook, Phase 3) — admin can never self-certify payment success.
   */
  status: text("status").notNull().default("payment_pending"),
  paymentProvider: text("payment_provider").notNull().default("razorpay"),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  shippingProvider: text("shipping_provider"),
  trackingId: text("tracking_id"),
  trackingUrl: text("tracking_url"),
  fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  qty: integer("qty").notNull(),
  unitPrice: integer("unit_price").notNull(),
  lineTotal: integer("line_total").notNull(),
});

/** Gateway payment events — the ledger of record for money movement. */
export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("razorpay"),
  status: text("status").notNull().default("created"), // created | authorized | captured | failed | refunded
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("INR"),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  method: text("method"), // upi | card | netbanking | wallet
  /** true only when the webhook signature verified (Phase 3) */
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const refunds = pgTable("refunds", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "set null" }),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("requested"), // requested | processed | rejected
  razorpayRefundId: text("razorpay_refund_id"),
  adminId: uuid("admin_id").references(() => admins.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

/* ─────────────────────────── Marketing & store config ─────────────────────────── */

export const coupons = pgTable("coupons", {
  code: text("code").primaryKey(),
  kind: text("kind").notNull().default("percent"), // 'percent'
  value: integer("value").notNull(),
  minSubtotal: integer("min_subtotal").notNull().default(0),
  maxDiscount: integer("max_discount"),
  description: text("description").notNull().default(""),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Key-value store settings: shipping.flat_fee, shipping.free_threshold, store.support_email … */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** CMS blocks keyed by page: homepage, story, faqs, policies.shipping … */
export const siteContent = pgTable("site_content", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pincodes = pgTable("pincodes", {
  pincode: text("pincode").primaryKey(),
  city: text("city"),
  serviceable: boolean("serviceable").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ─────────────────────────── Phase 3 additions ─────────────────────────── */

/** Customer profile (on Supabase, mirroring auth.users; locally mirrors users.id). */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // == users.id / auth.users.id
  fullName: text("full_name").notNull().default(""),
  phone: text("phone").default(""),
  role: text("role").notNull().default("customer"), // customer | admin (admin power flows through `admins`)
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const addresses = pgTable("addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  label: text("label").notNull().default("Home"),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  pincode: text("pincode").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const carts = pgTable("carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const cartItems = pgTable("cart_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  cartId: uuid("cart_id")
    .notNull()
    .references(() => carts.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  qty: integer("qty").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Stock reservations — created atomically with an order while it awaits payment.
 * Prevents overselling; expire after 24 h or release on payment outcome.
 */
export const inventoryReservations = pgTable("inventory_reservations", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  qty: integer("qty").notNull(),
  released: boolean("released").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Immutable Razorpay webhook log — idempotency + duplicate protection anchor. */
export const razorpayWebhookEvents = pgTable("razorpay_webhook_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** x-razorpay-event-id header, or sha256 of raw body as fallback */
  eventKey: text("event_key").notNull().unique(),
  event: text("event").notNull(),
  orderNumber: text("order_number"),
  razorpayPaymentId: text("razorpay_payment_id"),
  signatureValid: boolean("signature_valid").notNull().default(false),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  processingResult: text("processing_result"),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const couponRedemptions = pgTable("coupon_redemptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  coupon: text("coupon")
    .notNull()
    .references(() => coupons.code, { onDelete: "cascade" }),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  discountPaise: integer("discount_paise").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Admin-editable shipping rules; the active row wins (fallback: settings keys). */
export const shippingRules = pgTable("shipping_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().default("Standard (all India)"),
  flatFeePaise: integer("flat_fee_paise").notNull().default(9900),
  freeThresholdPaise: integer("free_threshold_paise").notNull().default(150000),
  active: boolean("active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
