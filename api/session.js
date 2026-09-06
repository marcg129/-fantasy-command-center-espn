import { configured, createSession, hasSession, safeCodeEqual, sendJson, SESSION_SECONDS, COOKIE_NAME, validOrigin } from "./_auth.js";

export default function handler(request, response) {
  if (request.method === "GET") return sendJson(response, hasSession(request) ? 200 : 401, { authenticated: hasSession(request) });
  if (request.method !== "POST") { response.setHeader("Allow", "GET, POST"); return sendJson(response, 405, { error: "Method not allowed" }); }
  if (!validOrigin(request)) return sendJson(response, 403, { error: "Request not allowed" });
  if (!configured()) return sendJson(response, 503, { error: "Beta access is temporarily unavailable" });
  let body = request.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!safeCodeEqual(body?.code, process.env.BETA_ACCESS_CODE, process.env.SESSION_SECRET)) return sendJson(response, 401, { error: "Access denied" });
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.setHeader("Set-Cookie", `${COOKIE_NAME}=${createSession(process.env.SESSION_SECRET)}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=${SESSION_SECONDS}`);
  return sendJson(response, 200, { authenticated: true });
}
