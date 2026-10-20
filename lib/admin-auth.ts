import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const ADMIN_COOKIE = "vault13_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 8;

function getSigningSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Admin session configuration is incomplete.");
  return secret;
}

function sign(expiresAt: string) {
  return createHmac("sha256", getSigningSecret())
    .update(expiresAt)
    .digest("hex");
}

export function isValidAdminPassword(password: unknown) {
  const expected = process.env.ADMIN_PASSWORD;
  if (typeof password !== "string" || !expected) return false;

  const suppliedBuffer = Buffer.from(password);
  const expectedBuffer = Buffer.from(expected);
  return suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer);
}

export function createAdminSessionCookie() {
  const expiresAt = String(Date.now() + SESSION_MAX_AGE * 1000);
  return {
    name: ADMIN_COOKIE,
    value: `${expiresAt}.${sign(expiresAt)}`,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      path: "/",
      maxAge: SESSION_MAX_AGE,
    },
  };
}

export function clearAdminSessionCookie() {
  return {
    name: ADMIN_COOKIE,
    value: "",
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      path: "/",
      maxAge: 0,
    },
  };
}

export function hasAdminSession(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE}=`))
    ?.slice(ADMIN_COOKIE.length + 1);

  if (!cookie) return false;

  const [expiresAt, signature, ...unexpectedParts] = cookie.split(".");
  if (!expiresAt || !signature || unexpectedParts.length > 0) return false;

  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || expiry <= Date.now()) return false;

  const expectedSignature = Buffer.from(sign(expiresAt), "hex");
  const suppliedSignature = Buffer.from(signature, "hex");
  return expectedSignature.length === suppliedSignature.length &&
    timingSafeEqual(expectedSignature, suppliedSignature);
}

export const adminSessionMaxAge = SESSION_MAX_AGE;
