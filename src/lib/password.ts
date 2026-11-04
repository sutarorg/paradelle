import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

/** scrypt(`salt:hash`), hex-encoded — shared by customer auth and admin auth. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash || !/^[a-f0-9]+$/i.test(salt) || !/^[a-f0-9]{128}$/i.test(hash)) return false;
    const derived = await scryptAsync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return expected.length === derived.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
