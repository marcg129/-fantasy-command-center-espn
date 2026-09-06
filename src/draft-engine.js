import { DEFAULT_LEAGUE, TEAM_NAMES } from "./config.js";

export const POSITIONS = ["QB", "RB", "WR", "TE", "DST", "K"];
export const normalizePosition = value => String(value || "").trim().toUpperCase().replace("D/ST", "DST").replace("DEF", "DST");
export const snakeSlot = (pick, teams = 10) => {
  const round = Math.ceil(pick / teams);
  const within = (pick - 1) % teams;
  return round % 2 ? within + 1 : teams - within;
};
export const roundForPick = (pick, teams = 10) => Math.ceil(pick / teams);
export const picksForPosition = (position, teams = 10, rounds = 16) => Array.from({ length: rounds }, (_, index) => {
  const round = index + 1;
  return (round - 1) * teams + (round % 2 ? position : teams - position + 1);
});

export function createState(overrides = {}) {
  const league = { ...DEFAULT_LEAGUE, ...(overrides.league || {}) };
  return {
    schemaVersion: 1,
    league,
    teamNames: overrides.teamNames || TEAM_NAMES.map((name, index) => index + 1 === league.draftPosition ? league.userTeam : name),
    players: overrides.players || [], picks: overrides.picks || [], shortlist: overrides.shortlist || [],
    importedAt: overrides.importedAt || null
  };
}

export function currentPick(state) { return state.picks.length + 1; }
export function teamAtPick(state, pick = currentPick(state)) { return snakeSlot(pick, state.league.teams); }
export function nextUserPick(state) {
  return picksForPosition(state.league.draftPosition, state.league.teams, state.league.rounds).find(pick => pick >= currentPick(state)) ?? null;
}
export function availablePlayers(state) {
  const drafted = new Set(state.picks.map(pick => pick.playerId));
  return state.players.filter(player => !drafted.has(player.id));
}
export function rosters(state) {
  return state.picks.reduce((all, pick) => {
    (all[pick.teamSlot] ||= []).push(state.players.find(player => player.id === pick.playerId));
    return all;
  }, {});
}
export function recordPick(state, playerId) {
  if (!state.players.some(player => player.id === playerId)) throw new Error("Player not found");
  if (state.picks.some(pick => pick.playerId === playerId)) throw new Error("That player has already been drafted");
  const pick = currentPick(state);
  state.picks.push({ pick, round: roundForPick(pick, state.league.teams), teamSlot: teamAtPick(state, pick), playerId, recordedAt: new Date().toISOString() });
  return state;
}
export function undoPick(state) { return state.picks.pop() || null; }
export function correctPick(state, pickNumber, replacementPlayerId) {
  const item = state.picks.find(pick => pick.pick === pickNumber);
  if (!item) throw new Error("Pick not found");
  if (!state.players.some(player => player.id === replacementPlayerId)) throw new Error("Player not found");
  if (state.picks.some(pick => pick.playerId === replacementPlayerId && pick.pick !== pickNumber)) throw new Error("That player has already been drafted");
  item.playerId = replacementPlayerId;
  item.correctedAt = new Date().toISOString();
  return state;
}
export function changeDraftPosition(state, position) {
  if (!Number.isInteger(position) || position < 1 || position > state.league.teams) throw new Error("Invalid draft position");
  const old = state.league.draftPosition;
  state.league.draftPosition = position;
  state.teamNames = state.teamNames.map((name, index) => index + 1 === old && name === state.league.userTeam ? `Team ${index + 1}` : name);
  state.teamNames[position - 1] = state.league.userTeam;
  return state;
}

export function rosterCounts(state, slot = state.league.draftPosition) {
  const counts = Object.fromEntries(POSITIONS.map(position => [position, 0]));
  (rosters(state)[slot] || []).filter(Boolean).forEach(player => counts[player.position]++);
  return counts;
}
export function starterNeeds(state) {
  const counts = rosterCounts(state);
  const needs = {};
  for (const pos of ["QB", "RB", "WR", "TE", "DST", "K"]) needs[pos] = Math.max(0, (state.league.starters[pos] || 0) - counts[pos]);
  const flexEligible = counts.RB + counts.WR + counts.TE;
  const base = state.league.starters.RB + state.league.starters.WR + state.league.starters.TE;
  needs.FLEX = Math.max(0, base + state.league.starters.FLEX - flexEligible);
  return needs;
}

const numeric = value => Number.isFinite(value) ? value : null;
export function recommendations(state, limit = 8) {
  if (!state.players.length) return { status: "HOLD", message: "Insufficient data — import current rankings to calculate recommendations.", players: [] };
  const pick = currentPick(state), next = nextUserPick(state), counts = rosterCounts(state), needs = starterNeeds(state);
  const scored = availablePlayers(state).filter(player => POSITIONS.includes(player.position)).map(player => {
    let score = 100;
    const rank = numeric(player.overallRank), adp = numeric(player.adp), projected = numeric(player.projectedPoints);
    if (rank !== null) score -= Math.min(rank, 250) * .28;
    if (adp !== null) score += Math.max(-18, Math.min(18, adp - pick)) * .7;
    if (projected !== null) score += Math.min(projected, 400) * .025;
    const baseNeed = needs[player.position] || 0;
    if (baseNeed) score += 11;
    if (["RB", "WR", "TE"].includes(player.position) && needs.FLEX) score += 4;
    if (counts[player.position] >= state.league.maximums[player.position]) score -= 100;
    if (player.position === "QB" && counts.QB >= 1) score -= 12;
    if (["K", "DST"].includes(player.position) && roundForPick(pick, state.league.teams) < 13 && !baseNeed) score -= 35;
    const samePosition = availablePlayers(state).filter(other => other.position === player.position && numeric(other.overallRank) !== null).sort((a,b) => a.overallRank-b.overallRank);
    const index = samePosition.findIndex(other => other.id === player.id);
    if (index >= 0 && samePosition[index + 1]?.tier > player.tier) score += 7;
    const reasons = [];
    if (baseNeed) reasons.push(`fills ${player.position} starter need`);
    else if (["RB", "WR", "TE"].includes(player.position) && needs.FLEX) reasons.push("helps fill FLEX");
    if (rank !== null && rank <= pick + 8) reasons.push("source-rank value");
    if (adp !== null && adp < (next || pick)) reasons.push("may not reach your next pick");
    if (index >= 0 && samePosition[index + 1]?.tier > player.tier) reasons.push("tier drop follows");
    if (!reasons.length) reasons.push("adds practical roster depth");
    return { ...player, recommendationScore: Math.round(score * 10) / 10, reasons: reasons.slice(0, 2) };
  }).filter(player => player.recommendationScore > 0).sort((a,b) => b.recommendationScore-a.recommendationScore).slice(0, limit);
  return { status: scored.length ? "READY" : "HOLD", message: scored.length ? "Scores combine roster utility, scarcity, imported value, tiers and pick spacing." : "Insufficient eligible data for a recommendation.", players: scored };
}
