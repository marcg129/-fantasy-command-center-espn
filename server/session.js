import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_NAME = "fcc_beta_session";
export const SESSION_SECONDS = 28_800;
const digest = (value, secret) => createHmac("sha256", secret).update(String(value)).digest();

export function accessCodeMatches(provided, expected, secret) {
  if (typeof provided !== "string" || typeof expected !== "string" || !expected || !secret) return false;
  return timingSafeEqual(digest(provided, secret), digest(expected, secret));
}
export function createSession(secret, now = Date.now()) {
  const expiration = Math.floor(now / 1000) + SESSION_SECONDS;
  const payload = String(expiration);
  return `${payload}.${digest(payload, secret).toString("base64url")}`;
}
export function verifySession(value, secret, now = Date.now()) {
  if (!secret || typeof value !== "string") return false;
  const parts = value.split(".");
  if (parts.length !== 2 || !/^\d+$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1])) return false;
  const expiration = Number(parts[0]);
  if (!Number.isSafeInteger(expiration) || expiration <= Math.floor(now / 1000)) return false;
  const supplied = Buffer.from(parts[1], "base64url"), expected = digest(parts[0], secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
export function readCookie(header = "", name = COOKIE_NAME) {
  for (const item of header.split(";")) {
    const [key, ...rest] = item.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}
export function sessionCookie(value, production = process.env.NODE_ENV === "production") {
  return `${COOKIE_NAME}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_SECONDS}${production ? "; Secure" : ""}`;
}
