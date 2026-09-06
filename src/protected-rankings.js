import { parsePlayerCsv } from "./csv.js";

export function hasCachedRankings(state) {
  return Array.isArray(state?.players) && state.players.length > 0;
}

export async function loadProtectedRankings({ code, state, fetchImpl = fetch, now = () => new Date().toISOString(), persist }) {
  if (hasCachedRankings(state)) return { status: "cached", count: state.players.length };
  const auth = await fetchImpl("/api/session", {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code })
  });
  if (!auth.ok) throw new Error(auth.status === 401 ? "Access code not accepted." : "Protected rankings are unavailable.");
  const response = await fetchImpl("/api/rankings", { credentials: "same-origin" });
  if (!response.ok) throw new Error("Protected rankings are unavailable.");
  const report = parsePlayerCsv(await response.text());
  if (!report.players.length || report.errors.length) throw new Error("Downloaded rankings did not pass validation. Use Manual fallback.");
  state.players = report.players;
  state.importedAt = now();
  persist(state);
  return { status: "ready", count: report.players.length, warnings: report.warnings };
}
