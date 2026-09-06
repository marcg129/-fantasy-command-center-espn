export async function loadAutomaticRankings({ state, fetchImpl = fetch, parsePlayerCsv, saveState, now = () => new Date().toISOString() }) {
  if (state.players.length) return { status: "cached", state, playerCount: state.players.length };
  try {
    const response = await fetchImpl("/api/rankings", { credentials: "same-origin", headers: { Accept: "text/csv" } });
    if (!response.ok) throw new Error("request failed");
    const report = parsePlayerCsv(await response.text());
    if (report.errors.length || !report.players.length) throw new Error("invalid rankings");
    state.players = report.players;
    state.importedAt = now();
    saveState(state);
    return { status: "ready", state, playerCount: report.players.length };
  } catch {
    return { status: "fallback", state, playerCount: state.players.length };
  }
}
