"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { addresses, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { createSession, destroySession, getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";
import { addressSchema } from "@/lib/validation";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/ratelimit";

async function authThrottle(scope: string): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rl = rateLimit(`${scope}:${ip}`, 10, 60_000);
  return rl.ok ? null : `Too many attempts — try again in ${rl.retryAfterSec}s.`;
}

export type AuthState = { error?: string } | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const throttle = await authThrottle("register");
  if (throttle) return { error: throttle };
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (name.length < 2) return { error: "Please tell us your name." };
  if (!EMAIL_RE.test(email)) return { error: "Please enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) return { error: "An account already exists for this email. Try signing in." };

  const passwordHash = await hashPassword(password);
  const inserted = await db.insert(users).values({ name, email, passwordHash }).returning({ id: users.id });
  await createSession(inserted[0].id);
  redirect("/account");
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const throttle = await authThrottle("login");
  if (throttle) return { error: throttle };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Email or password is incorrect." };
  }
  await createSession(user.id);
  redirect("/account");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

/* ───────────────────────── Address book (customer-owned rows only) ───────────────────────── */

export async function saveAddressAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const parsed = addressSchema.safeParse({
    label: String(formData.get("label") ?? "Home"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    line1: formData.get("line1"),
    line2: String(formData.get("line2") ?? ""),
    city: formData.get("city"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    isDefault: formData.get("isDefault") === "on",
  });
  if (!parsed.success) redirect("/account?error=" + encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the address."));
  const v = parsed.data;
  if (v.isDefault) await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
  const count = await db.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, user.id));
  await db.insert(addresses).values({ ...v, userId: user.id, isDefault: v.isDefault || count.length === 0 });
  redirect("/account?ok=" + encodeURIComponent("Address saved."));
}

export async function deleteAddressAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const id = String(formData.get("id") ?? "");
  await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));
  redirect("/account?ok=" + encodeURIComponent("Address removed."));
}

export async function setDefaultAddressAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const id = String(formData.get("id") ?? "");
  await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
  await db.update(addresses).set({ isDefault: true }).where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));
  redirect("/account?ok=" + encodeURIComponent("Default address updated."));
}
