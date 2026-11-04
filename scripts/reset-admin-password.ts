import "dotenv/config";
import { eq } from "drizzle-orm";
import { admins, adminSessions } from "../src/db/schema";
import { db, pool } from "../src/db";
import { hashPassword } from "../src/lib/password";

async function main() {
  const email = (process.env.ADMIN_RESET_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_RESET_PASSWORD ?? "";
  if (!email || !email.includes("@")) throw new Error("Set ADMIN_RESET_EMAIL to the account to recover.");
  if (password.length < 12) throw new Error("Set a unique ADMIN_RESET_PASSWORD of at least 12 characters.");

  const rows = await db.select({ id: admins.id }).from(admins).where(eq(admins.email, email)).limit(1);
  const admin = rows[0];
  if (!admin) throw new Error("No admin account was found for ADMIN_RESET_EMAIL.");

  const passwordHash = await hashPassword(password);
  await db.transaction(async (tx) => {
    await tx.update(admins).set({ passwordHash }).where(eq(admins.id, admin.id));
    await tx.delete(adminSessions).where(eq(adminSessions.adminId, admin.id));
  });
  console.log(`Admin password reset for ${email}; all existing sessions were revoked.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Admin password reset failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
