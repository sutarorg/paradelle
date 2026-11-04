import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { admins, adminSessions, type ADMIN_PERMISSIONS } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";

/**
 * Admin session layer (Phase 2).
 * Cookie-held tokens backed by DB sessions, per-page server checks via
 * requireAdmin(). Phase 3 hardening: edge middleware verification, IP allow-list
 * option, and rotating tokens — hooks are already in place (sessions table).
 */
const ADMIN_COOKIE = "paradelle_admin";
const SESSION_DAYS = 7;

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "super" | "staff";
  permissions: string[];
};

export type PermissionKey = (typeof ADMIN_PERMISSIONS)[number];

export async function createAdminSession(adminId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(adminSessions).values({ token, adminId, expiresAt });
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function getAdmin(): Promise<AdminUser | null> {
  try {
    const store = await cookies();
    const token = store.get(ADMIN_COOKIE)?.value;
    if (!token) return null;
    const rows = await db
      .select({
        id: admins.id,
        name: admins.name,
        email: admins.email,
        role: admins.role,
        permissions: admins.permissions,
        active: admins.active,
      })
      .from(adminSessions)
      .innerJoin(admins, eq(admins.id, adminSessions.adminId))
      .where(and(eq(adminSessions.token, token), gt(adminSessions.expiresAt, new Date())))
      .limit(1);
    const row = rows[0];
    if (!row || !row.active) return null;
    return { id: row.id, name: row.name, email: row.email, role: row.role === "super" ? "super" : "staff", permissions: row.permissions };
  } catch {
    return null;
  }
}

export function adminCan(admin: AdminUser, permission: PermissionKey): boolean {
  return admin.role === "super" || admin.permissions.includes(permission);
}

/** Guard: requires a session; optionally a specific permission (redirects otherwise). */
export async function requireAdmin(permission?: PermissionKey): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (permission && !adminCan(admin, permission)) redirect("/admin?denied=" + permission);
  return admin;
}

export async function destroyAdminSession() {
  try {
    const store = await cookies();
    const token = store.get(ADMIN_COOKIE)?.value;
    if (token) await db.delete(adminSessions).where(eq(adminSessions.token, token));
    store.delete(ADMIN_COOKIE);
  } catch {
    /* best-effort */
  }
}
