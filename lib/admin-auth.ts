import "server-only";
import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "vault13_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET;
}

function signExpiry(expiry: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`vault13-admin:${expiry}`)
    .digest("base64url");
}

export function isAdminPasswordValid(password: unknown) {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (typeof password !== "string" || !expectedPassword) return false;

  const suppliedDigest = createHash("sha256").update(password).digest();
  const expectedDigest = createHash("sha256").update(expectedPassword).digest();
  return timingSafeEqual(suppliedDigest, expectedDigest);
}

export function isAdminAuthConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && getSessionSecret());
}

export function createAdminSession() {
  const secret = getSessionSecret();
  if (!secret) throw new Error("Admin session is not configured.");

  const expiry = String(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS);
  return {
    value: `${expiry}.${signExpiry(expiry, secret)}`,
    maxAge: SESSION_TTL_SECONDS,
  };
}

export async function hasAdminSession() {
  const secret = getSessionSecret();
  if (!secret) return false;

  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!value) return false;

  const [expiry, signature, ...extra] = value.split(".");
  if (!expiry || !signature || extra.length > 0) return false;

  const expirySeconds = Number(expiry);
  if (!Number.isSafeInteger(expirySeconds) || expirySeconds <= Date.now() / 1000) {
    return false;
  }

  const expected = Buffer.from(signExpiry(expiry, secret));
  const provided = Buffer.from(signature);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}