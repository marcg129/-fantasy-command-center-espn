import crypto from "node:crypto";

export const COOKIE_NAME = "beta_session";
export const SESSION_SECONDS = 8 * 60 * 60;

const encode = value => Buffer.from(value).toString("base64url");
const signature = (payload, secret) => crypto.createHmac("sha256", secret).update(payload).digest("base64url");

export function configured(env = process.env) {
  return typeof env.BETA_ACCESS_CODE === "string" && env.BETA_ACCESS_CODE.length > 0 && typeof env.SESSION_SECRET === "string" && env.SESSION_SECRET.length >= 32;
}

export function safeCodeEqual(candidate, expected, secret) {
  if (typeof candidate !== "string" || typeof expected !== "string" || !candidate || !expected || !secret) return false;
  const candidateDigest = crypto.createHmac("sha256", secret).update(candidate).digest();
  const expectedDigest = crypto.createHmac("sha256", secret).update(expected).digest();
  return crypto.timingSafeEqual(candidateDigest, expectedDigest);
}

export function createSession(secret, now = Date.now()) {
  const payload = encode(JSON.stringify({ expiresAt: now + SESSION_SECONDS * 1000 }));
  return `${payload}.${signature(payload, secret)}`;
}

export function verifySession(token, secret, now = Date.now()) {
  if (!token || !secret) return false;
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) return false;
  const expectedSignature = signature(payload, secret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isFinite(session.expiresAt) && session.expiresAt > now;
  } catch { return false; }
}

export function cookieValue(header = "") {
  const cookies = Object.fromEntries(header.split(";").map(item => item.trim().split(/=(.*)/s).slice(0, 2)).filter(([key]) => key));
  return cookies[COOKIE_NAME] || "";
}

export function hasSession(request, env = process.env, now = Date.now()) {
  return verifySession(cookieValue(request.headers.cookie), env.SESSION_SECRET, now);
}

export function validOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  const protocol = request.headers["x-forwarded-proto"] || (process.env.NODE_ENV === "production" ? "https" : "http");
  if (!origin || !host) return false;
  try { return new URL(origin).origin === `${protocol}://${host}`; } catch { return false; }
}

export function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "private, no-store");
  response.end(JSON.stringify(body));
}
