import { redirect } from "next/navigation";
import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import type { AdminUser } from "@/lib/admin-auth";

export async function logActivity(
  admin: AdminUser | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  details?: string,
) {
  try {
    await db.insert(activityLogs).values({
      adminId: admin?.id ?? null,
      adminEmail: admin?.email ?? "system",
      action,
      entityType,
      entityId: entityId ?? null,
      details: details ?? null,
    });
  } catch (err) {
    console.error("log:activity", err);
  }
}

/** Redirect with a flash banner param (native-form server action pattern). */
export function flash(path: string, ok?: string, error?: string): never {
  const params = new URLSearchParams();
  if (ok) params.set("ok", ok);
  if (error) params.set("error", error);
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${params.toString()}`);
}

/** Run a mutation and convert any failure into a message instead of a throw. */
export async function safe(fn: () => Promise<void>, fallback = "Something went wrong. Please try again."): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (err) {
    console.error("admin:action", err);
    return fallback;
  }
}

export function asInt(value: FormDataEntryValue | null, def = 0): number {
  const n = parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : def;
}

export function asStr(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

export function asList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
