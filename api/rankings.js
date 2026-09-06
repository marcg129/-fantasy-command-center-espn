import { gunzipSync } from "node:zlib";
import { parsePlayerCsv } from "../src/csv.js";
import { COOKIE_NAME, readCookie, verifySession } from "../server/session.js";
import { noStore, sendJson } from "../server/http.js";

const MAX_OUTPUT = 5 * 1024 * 1024;
export default async function handler(request, response) {
  noStore(response);
  if (request.method !== "GET") return sendJson(response, 405, { error: "Request not allowed." });
  if (!verifySession(readCookie(request.headers.cookie, COOKIE_NAME), process.env.SESSION_SECRET)) return sendJson(response, 401, { error: "Authentication required." });
  const encoded = process.env.RANKINGS_GZIP_BASE64;
  if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 !== 0) return sendJson(response, 503, { error: "Rankings are not configured." });
  try {
    const compressed = Buffer.from(encoded, "base64");
    if (!compressed.length || compressed.toString("base64") !== encoded) throw new Error("invalid");
    const csv = gunzipSync(compressed, { maxOutputLength: MAX_OUTPUT }).toString("utf8");
    const report = parsePlayerCsv(csv);
    if (!report.players.length || report.errors.length) throw new Error("invalid");
    response.statusCode = 200; response.setHeader("Content-Type", "text/csv; charset=utf-8"); return response.end(csv);
  } catch { return sendJson(response, 503, { error: "Rankings are not configured." }); }
}
