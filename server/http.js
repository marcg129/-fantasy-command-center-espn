export function noStore(response) { response.setHeader("Cache-Control", "private, no-store"); }
export function sendJson(response, status, body) {
  response.statusCode = status; response.setHeader("Content-Type", "application/json; charset=utf-8"); response.end(JSON.stringify(body));
}
export function isSameOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  const protocol = request.headers["x-forwarded-proto"] || (request.socket?.encrypted ? "https" : "http");
  if (!origin || !host) return false;
  try { return new URL(origin).origin === `${protocol}://${host}`; } catch { return false; }
}
