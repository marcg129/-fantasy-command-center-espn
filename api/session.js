import { accessCodeMatches, createSession, sessionCookie } from "../server/session.js";
import { isSameOrigin, noStore, sendJson } from "../server/http.js";

export default async function handler(request, response) {
  noStore(response);
  if (request.method !== "POST") return sendJson(response, 405, { error: "Request not allowed." });
  if (!isSameOrigin(request)) return sendJson(response, 403, { error: "Request not allowed." });
  const expected = process.env.BETA_ACCESS_CODE, secret = process.env.SESSION_SECRET;
  if (!expected || !secret) return sendJson(response, 503, { error: "Service is not configured." });
  let body = request.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  if (!accessCodeMatches(body?.code, expected, secret)) return sendJson(response, 401, { error: "Authentication failed." });
  response.setHeader("Set-Cookie", sessionCookie(createSession(secret)));
  return sendJson(response, 200, { ok: true });
}
