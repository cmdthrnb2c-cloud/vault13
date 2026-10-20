import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createCheckoutToken() {
  return randomBytes(32).toString("base64url");
}

export function hashCheckoutToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyCheckoutToken(token: unknown, storedHash: unknown) {
  if (typeof token !== "string" || typeof storedHash !== "string") return false;
  const suppliedHash = Buffer.from(hashCheckoutToken(token), "hex");
  const expectedHash = Buffer.from(storedHash, "hex");
  return suppliedHash.length === expectedHash.length &&
    timingSafeEqual(suppliedHash, expectedHash);
}
