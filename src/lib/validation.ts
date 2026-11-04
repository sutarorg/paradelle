import { z } from "zod";

/** Shared Zod schemas — API boundary validation (Phase 3). */

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const pincodeSchema = z.string().regex(/^\d{6}$/, "6-digit PIN code");

export const phoneSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s()-]/g, ""))
  .pipe(z.string().regex(/^\+?\d{10,13}$/, "Enter a reachable 10-digit phone number"));

export const checkoutSchema = z.object({
  items: z.array(z.object({ slug: z.string().min(1).max(80), qty: z.coerce.number().int().min(1).max(99) })).min(1).max(24),
  coupon: z.string().trim().max(24).optional(),
  customer: z.object({
    email: emailSchema,
    name: z.string().trim().min(2).max(80),
    phone: phoneSchema,
    line1: z.string().trim().min(4).max(120),
    line2: z.string().trim().max(120).optional().nullable(),
    city: z.string().trim().min(2).max(60),
    state: z.string().trim().min(2).max(60),
    pincode: pincodeSchema,
  }),
});

export const newsletterSchema = z.object({ email: emailSchema });

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  message: z.string().trim().min(10).max(2000),
});

export const verifyPaymentSchema = z.object({
  orderNumber: z.string().regex(/^PDL-[0-9A-F]{6}$/),
  razorpay_order_id: z.string().min(6).max(64),
  razorpay_payment_id: z.string().min(6).max(64),
  razorpay_signature: z.string().min(16).max(256),
});

export const createRazorpaySchema = z.object({ orderNumber: z.string().regex(/^PDL-[0-9A-F]{6}$/) });

export const cartMutationSchema = z.object({
  slug: z.string().min(1).max(80),
  qty: z.coerce.number().int().min(0).max(99),
});

export const cartMergeSchema = z.object({
  items: z.array(z.object({ slug: z.string().min(1).max(80), qty: z.coerce.number().int().min(0).max(99) })).max(50),
});

export const addressSchema = z.object({
  label: z.string().trim().min(1).max(24).default("Home"),
  name: z.string().trim().min(2).max(80),
  phone: phoneSchema,
  line1: z.string().trim().min(4).max(120),
  line2: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  pincode: pincodeSchema,
  isDefault: z.boolean().optional(),
});

export function zodError(err: z.ZodError): string {
  return err.issues[0] ? `${err.issues[0].path.join(".") || "input"}: ${err.issues[0].message}` : "Invalid input.";
}
