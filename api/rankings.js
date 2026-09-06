import zlib from "node:zlib";
import { parsePlayerCsv } from "../src/csv.js";
import { hasSession, sendJson } from "./_auth.js";

const decodeRankings = encoded => {
  if (typeof encoded !== "string" || !encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error("invalid payload");
  return zlib.gunzipSync(Buffer.from(encoded, "base64"), { maxOutputLength: 5 * 1024 * 1024 }).toString("utf8");
};

export default function handler(request, response) {
  if (request.method !== "GET") { response.setHeader("Allow", "GET"); return sendJson(response, 405, { error: "Method not allowed" }); }
  if (!hasSession(request)) return sendJson(response, 401, { error: "Authentication required" });
  try {
    const csv = decodeRankings(process.env.RANKINGS_GZIP_BASE64);
    if (parsePlayerCsv(csv).errors.length) throw new Error("invalid rankings");
    response.statusCode = 200;
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Cache-Control", "private, no-store");
    return response.end(csv);
  } catch { return sendJson(response, 503, { error: "Protected rankings are not configured correctly" }); }
}

export { decodeRankings };
