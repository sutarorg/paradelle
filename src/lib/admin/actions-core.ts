"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/ratelimit";
import { db } from "@/db";
import { admins, coupons, pincodes, settings, shippingRules, siteContent, ADMIN_PERMISSIONS } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  createAdminSession,
  destroyAdminSession,
  getAdmin,
  requireAdmin,
  type AdminUser,
} from "@/lib/admin-auth";
import { asInt, asStr, flash, logActivity, safe } from "@/lib/admin/log";

/* ───────────────────────── Auth ───────────────────────── */

export type AdminAuthState = { error?: string } | null;

export async function adminLoginAction(_prev: AdminAuthState, formData: FormData): Promise<AdminAuthState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rl = rateLimit(`admin-login:${ip}`, 8, 60_000);
  if (!rl.ok) return { error: `Too many attempts — try again in ${rl.retryAfterSec}s.` };
  const email = asStr(formData.get("email")).toLowerCase();
  const password = asStr(formData.get("password"));
  if (!email || !password) return { error: "Enter your email and password." };

  const rows = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
  const admin = rows[0];
  if (!admin || !admin.active || !(await verifyPassword(password, admin.passwordHash))) {
    return { error: "Invalid credentials, or this account is disabled." };
  }
  await createAdminSession(admin.id);
  await db.update(admins).set({ lastLoginAt: new Date() }).where(eq(admins.id, admin.id));
  await logActivity(
    { id: admin.id, email: admin.email, name: admin.name, role: admin.role === "super" ? "super" : "staff", permissions: admin.permissions },
    "auth.login",
    "admin",
    admin.id,
  );
  redirect("/admin");
}

export async function adminLogoutAction() {
  await destroyAdminSession();
  redirect("/admin/login");
}

export async function changePasswordAction(formData: FormData) {
  const me = await requireAdmin();
  const current = asStr(formData.get("current"));
  const next = asStr(formData.get("next"));
  const confirm = asStr(formData.get("confirm"));
  if (next.length < 8) return flash("/admin/settings", undefined, "New password must be at least 8 characters.");
  if (next !== confirm) return flash("/admin/settings", undefined, "New passwords do not match.");
  const rows = await db.select().from(admins).where(eq(admins.id, me.id)).limit(1);
  if (!rows[0] || !(await verifyPassword(current, rows[0].passwordHash)))
    return flash("/admin/settings", undefined, "Current password is incorrect.");
  const err = await safe(async () => {
    await db.update(admins).set({ passwordHash: await hashPassword(next) }).where(eq(admins.id, me.id));
    await logActivity(me, "settings.password_change", "admin", me.id);
  });
  flash("/admin/settings", err ? undefined : "Password updated.", err ?? undefined);
}

/* ───────────────────────── Settings & shipping ───────────────────────── */

async function upsertSetting(key: string, value: string) {
  await db
    .insert(settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

export async function saveShippingAction(formData: FormData) {
  const me = await requireAdmin("settings");
  // Admin enters rupees; storage is integer paise.
  const flatFee = Math.max(0, asInt(formData.get("flatFee"), 99)) * 100;
  const freeThreshold = Math.max(0, asInt(formData.get("freeThreshold"), 1500)) * 100;
  const err = await safe(async () => {
    await upsertSetting("shipping.flat_fee", String(flatFee));
    await upsertSetting("shipping.free_threshold", String(freeThreshold));
    // Keep the primary shipping_rules row in sync (rules win over legacy keys).
    const rules = await db.select().from(shippingRules).limit(1);
    if (rules[0]) {
      await db.update(shippingRules).set({ flatFeePaise: flatFee, freeThresholdPaise: freeThreshold, updatedAt: new Date() }).where(eq(shippingRules.id, rules[0].id));
    } else {
      await db.insert(shippingRules).values({ flatFeePaise: flatFee, freeThresholdPaise: freeThreshold, active: true });
    }
    await logActivity(me, "settings.shipping", "settings", "shipping", `₹${flatFee / 100} flat · free ≥ ₹${freeThreshold / 100}`);
  });
  flash("/admin/shipping", err ? undefined : "Shipping charges updated.", err ?? undefined);
}

export async function saveStoreSettingsAction(formData: FormData) {
  const me = await requireAdmin("settings");
  const supportEmail = asStr(formData.get("supportEmail"));
  const note = asStr(formData.get("legalName"));
  const err = await safe(async () => {
    await upsertSetting("store.support_email", supportEmail || "hello@paradelle.store");
    await upsertSetting("store.legal_name", note || "PARADELLE CHOCOLATES");
    await logActivity(me, "settings.store", "settings", "store");
  });
  flash("/admin/settings", err ? undefined : "Store settings saved.", err ?? undefined);
}

/* ───────────────────────── PIN serviceability ───────────────────────── */

export async function addPincodesAction(formData: FormData) {
  const me = await requireAdmin("settings");
  const raw = asStr(formData.get("bulk"));
  const rows = raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      const [pin, city] = line.split(":").map((s) => s.trim());
      return { pincode: pin, city: city || null };
    })
    .filter((r) => /^\d{6}$/.test(r.pincode));
  if (rows.length === 0) return flash("/admin/pincodes", undefined, "Add 6-digit PIN codes (one per line; “400001:Mumbai” to name a city).");
  const err = await safe(async () => {
    for (const r of rows) {
      await db.insert(pincodes).values(r).onConflictDoUpdate({ target: pincodes.pincode, set: { city: r.city, serviceable: true } });
    }
    await logActivity(me, "pincodes.add", "pincodes", null, `${rows.length} codes`);
  });
  flash("/admin/pincodes", err ? undefined : `${rows.length} PIN code(s) saved.`, err ?? undefined);
}

export async function togglePincodeAction(formData: FormData) {
  const me = await requireAdmin("settings");
  const pin = asStr(formData.get("pincode"));
  const next = formData.get("next") === "1";
  const err = await safe(async () => {
    await db.update(pincodes).set({ serviceable: next }).where(eq(pincodes.pincode, pin));
    await logActivity(me, next ? "pincodes.enable" : "pincodes.disable", "pincodes", pin);
  });
  flash("/admin/pincodes", err ? undefined : "Updated.", err ?? undefined);
}

export async function deletePincodeAction(formData: FormData) {
  const me = await requireAdmin("settings");
  const pin = asStr(formData.get("pincode"));
  const err = await safe(async () => {
    await db.delete(pincodes).where(eq(pincodes.pincode, pin));
    await logActivity(me, "pincodes.delete", "pincodes", pin);
  });
  flash("/admin/pincodes", err ? undefined : "Removed.", err ?? undefined);
}

/* ───────────────────────── Coupons ───────────────────────── */

export async function saveCouponAction(formData: FormData) {
  const me = await requireAdmin("marketing");
  const code = asStr(formData.get("code")).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const value = asInt(formData.get("value"));
  // Admin enters rupees; storage is integer paise.
  const minSubtotal = Math.max(0, asInt(formData.get("minSubtotal"), 0)) * 100;
  const maxDiscountRaw = asInt(formData.get("maxDiscount"), 0);
  const maxDiscount = maxDiscountRaw > 0 ? maxDiscountRaw * 100 : null;
  const usageLimit = asInt(formData.get("usageLimit"), 0) || null;
  const expiresRaw = asStr(formData.get("expiresAt"));
  const description = asStr(formData.get("description"));
  if (!code) return flash("/admin/coupons", undefined, "A code is required.");
  if (value < 1 || value > 90) return flash("/admin/coupons", undefined, "Discount must be 1–90%.");
  const err = await safe(async () => {
    await db
      .insert(coupons)
      .values({
        code, kind: "percent", value, minSubtotal, maxDiscount, usageLimit, description,
        expiresAt: expiresRaw ? new Date(expiresRaw) : null,
      })
      .onConflictDoUpdate({
        target: coupons.code,
        set: { value, minSubtotal, maxDiscount, usageLimit, description, expiresAt: expiresRaw ? new Date(expiresRaw) : null, active: true },
      });
    await logActivity(me, "coupon.save", "coupon", code, `${value}% off`);
  });
  flash("/admin/coupons", err ? undefined : `Coupon ${code} saved.`, err ?? undefined);
}

export async function toggleCouponAction(formData: FormData) {
  const me = await requireAdmin("marketing");
  const code = asStr(formData.get("code"));
  const next = formData.get("next") === "1";
  const err = await safe(async () => {
    await db.update(coupons).set({ active: next }).where(eq(coupons.code, code));
    await logActivity(me, next ? "coupon.activate" : "coupon.pause", "coupon", code);
  });
  flash("/admin/coupons", err ? undefined : "Updated.", err ?? undefined);
}

export async function deleteCouponAction(formData: FormData) {
  const me = await requireAdmin("marketing");
  const code = asStr(formData.get("code"));
  const err = await safe(async () => {
    await db.delete(coupons).where(eq(coupons.code, code));
    await logActivity(me, "coupon.delete", "coupon", code);
  });
  flash("/admin/coupons", err ? undefined : `Coupon ${code} deleted.`, err ?? undefined);
}

/* ───────────────────────── CMS ───────────────────────── */

async function upsertContent(key: string, value: unknown) {
  await db
    .insert(siteContent)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: siteContent.key, set: { value, updatedAt: new Date() } });
}

export async function saveHomepageAction(formData: FormData) {
  const me = await requireAdmin("content");
  const err = await safe(async () => {
    await upsertContent("homepage", {
      heroTitle1: asStr(formData.get("heroTitle1")),
      heroTitle2: asStr(formData.get("heroTitle2")),
      heroSub: asStr(formData.get("heroSub")),
      announcement: asStr(formData.get("announcement")),
      storyQuote: asStr(formData.get("storyQuote")),
    });
    await logActivity(me, "content.homepage", "content", "homepage");
  });
  flash("/admin/content", err ? undefined : "Homepage content saved.", err ?? undefined);
}

export async function saveStoryAction(formData: FormData) {
  const me = await requireAdmin("content");
  const err = await safe(async () => {
    await upsertContent("story", { quote: asStr(formData.get("quote")), attribution: asStr(formData.get("attribution")) });
    await logActivity(me, "content.story", "content", "story");
  });
  flash("/admin/content?tab=story", err ? undefined : "Brand story saved.", err ?? undefined);
}

export async function saveFaqsAction(formData: FormData) {
  const me = await requireAdmin("content");
  let parsed: { q: string; a: string }[] = [];
  try {
    const raw = JSON.parse(asStr(formData.get("faqsJson")));
    if (Array.isArray(raw)) parsed = raw.filter((f) => f?.q && f?.a).map((f) => ({ q: String(f.q), a: String(f.a) }));
  } catch { /* handled below */ }
  if (parsed.length === 0) return flash("/admin/content?tab=faqs", undefined, "Add at least one FAQ.");
  const err = await safe(async () => {
    await upsertContent("faqs", parsed);
    await logActivity(me, "content.faqs", "content", "faqs", `${parsed.length} questions`);
  });
  flash("/admin/content?tab=faqs", err ? undefined : "FAQs published.", err ?? undefined);
}

export async function savePolicyAction(formData: FormData) {
  const me = await requireAdmin("content");
  const key = asStr(formData.get("policy"));
  if (!["shipping", "refunds", "privacy", "terms"].includes(key))
    return flash("/admin/content?tab=policies", undefined, "Unknown policy.");
  let sections: { heading: string; body: string[] }[] = [];
  try {
    const raw = JSON.parse(asStr(formData.get("policyJson")));
    if (Array.isArray(raw))
      sections = raw
        .filter((s) => s?.heading)
        .map((s) => ({ heading: String(s.heading), body: String(s.body ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) }));
  } catch { /* handled below */ }
  if (sections.length === 0) return flash("/admin/content?tab=policies", undefined, "A policy needs at least one section.");
  const err = await safe(async () => {
    await upsertContent(`policy.${key}`, { sections });
    await logActivity(me, `content.policy.${key}`, "content", key);
  });
  flash("/admin/content?tab=policies", err ? undefined : "Policy published.", err ?? undefined);
}

/* ───────────────────────── Team (super only) ───────────────────────── */

export async function createStaffAction(formData: FormData) {
  const me = await requireAdmin("staff");
  const name = asStr(formData.get("name"));
  const email = asStr(formData.get("email")).toLowerCase();
  const password = asStr(formData.get("password"));
  const permissions = ADMIN_PERMISSIONS.filter((p) => formData.get(`perm_${p}`) === "on");
  if (name.length < 2 || !email.includes("@")) return flash("/admin/staff", undefined, "Name and valid email are required.");
  if (password.length < 8) return flash("/admin/staff", undefined, "Password must be at least 8 characters.");
  const err = await safe(async () => {
    await db.insert(admins).values({ name, email, passwordHash: await hashPassword(password), role: "staff", permissions: [...permissions] });
    await logActivity(me, "staff.create", "admin", email, permissions.join(","));
  }, "Could not create the account — the email may already exist.");
  flash("/admin/staff", err ? undefined : `${name} can now sign in.`, err ?? undefined);
}

export async function updateStaffPermissionsAction(formData: FormData) {
  const me = await requireAdmin("staff");
  const id = asStr(formData.get("id"));
  const permissions = ADMIN_PERMISSIONS.filter((p) => formData.get(`perm_${p}`) === "on");
  const err = await safe(async () => {
    const target = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
    if (!target[0]) throw new Error("not found");
    if (target[0].role === "super") throw new Error("super admin unchanged");
    await db.update(admins).set({ permissions: [...permissions] }).where(eq(admins.id, id));
    await logActivity(me, "staff.permissions", "admin", target[0].email, permissions.join(","));
  }, "Could not update permissions.");
  flash("/admin/staff", err ? undefined : "Permissions updated.", err ?? undefined);
}

export async function toggleStaffActiveAction(formData: FormData) {
  const me = await requireAdmin("staff");
  const id = asStr(formData.get("id"));
  const next = formData.get("next") === "1";
  if (id === me.id) return flash("/admin/staff", undefined, "You cannot deactivate your own account.");
  const err = await safe(async () => {
    const target = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
    if (!target[0]) throw new Error("not found");
    if (target[0].role === "super" && !next) throw new Error("cannot deactivate a super admin");
    await db.update(admins).set({ active: next }).where(eq(admins.id, id));
    await logActivity(me, next ? "staff.activate" : "staff.deactivate", "admin", target[0].email);
  }, "Could not update that account (super admins cannot be deactivated).");
  flash("/admin/staff", err ? undefined : "Account updated.", err ?? undefined);
}

/* helper used by content page (permission check reuse) */
export async function adminSelf(): Promise<Pick<AdminUser, "id" | "email" | "role"> | null> {
  const me = await getAdmin();
  if (!me) return null;
  return { id: me.id, email: me.email, role: me.role };
}
