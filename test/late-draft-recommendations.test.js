import test from "node:test";
import assert from "node:assert/strict";
import { createState, currentPick, recommendations } from "../src/draft-engine.js";

const candidate = (id, position, rank, adp = rank) => ({
  id, name: id, team: "TST", position, overallRank: rank, adp,
  tier: null, positionalRank: null, projectedPoints: null
});

const userPositions = ["RB", "WR", "RB", "WR", "TE", "QB", "RB", "WR", "RB", "WR", "TE", "QB", "DST", "WR", "RB"];

function stateAtPick(pick, available, userPositionOverrides = {}) {
  const drafted = Array.from({ length: pick - 1 }, (_, index) => {
    const number = index + 1;
    const round = Math.ceil(number / 10);
    const within = (number - 1) % 10;
    const teamSlot = round % 2 ? within + 1 : 10 - within;
    const position = teamSlot === 4
      ? (userPositionOverrides[round] || userPositions[round - 1] || "WR")
      : (index % 4 === 0 ? "RB" : index % 4 === 1 ? "WR" : index % 4 === 2 ? "QB" : "TE");
    return { player: candidate(`drafted-${number}`, position, number, number), pick: { pick: number, round, teamSlot, playerId: `drafted-${number}` } };
  });
  return createState({ players: [...drafted.map(item => item.player), ...available], picks: drafted.map(item => item.pick) });
}

test("round 8 recommends useful players near the current pick and excludes K/DST", () => {
  const state = stateAtPick(74, [
    candidate("round-8-value", "WR", 72, 73), candidate("round-8-near", "RB", 76, 75),
    candidate("round-8-reach", "TE", 102, 104), candidate("round-8-k", "K", 70, 72), candidate("round-8-dst", "DST", 71, 73)
  ]);
  assert.equal(currentPick(state), 74);
  const result = recommendations(state);
  assert.equal(result.status, "READY");
  assert.deepEqual(result.players.slice(0, 2).map(player => player.id), ["round-8-value", "round-8-near"]);
  assert.ok(!result.players.some(player => ["round-8-k", "round-8-dst"].includes(player.id)));
});

test("round 12 stays useful while applying the documented mid-round K/DST penalty", () => {
  const state = stateAtPick(114, [
    candidate("round-12-value", "RB", 110, 112), candidate("round-12-near", "WR", 116, 115),
    candidate("round-12-reach", "TE", 145, 148), candidate("round-12-k", "K", 111, 112), candidate("round-12-dst", "DST", 113, 114)
  ]);
  const result = recommendations(state);
  assert.equal(result.status, "READY");
  assert.deepEqual(result.players.slice(0, 2).map(player => player.id), ["round-12-value", "round-12-near"]);
  const skillScore = result.players.find(player => player.id === "round-12-value").recommendationScore;
  assert.ok(result.players.filter(player => ["round-12-k", "round-12-dst"].includes(player.id)).every(player => player.recommendationScore < skillScore));
});

test("round 16 recommends near-pick depth and permits late K/DST", () => {
  const state = stateAtPick(154, [
    candidate("round-16-value", "WR", 150, 152), candidate("round-16-near", "RB", 156, 155),
    candidate("round-16-reach", "TE", 210, 215), candidate("round-16-k", "K", 153, 154), candidate("round-16-dst", "DST", 155, 156)
  ], { 13: "WR" });
  const result = recommendations(state);
  assert.equal(result.status, "READY");
  assert.equal(result.players[0].id, "round-16-value");
  assert.ok(result.players.some(player => player.id === "round-16-k"));
  assert.ok(result.players.some(player => player.id === "round-16-dst"));
  assert.ok(result.players.findIndex(player => player.id === "round-16-near") < result.players.findIndex(player => player.id === "round-16-reach"));
});

test("HOLD remains available when no eligible trustworthy candidates exist", () => {
  const state = stateAtPick(114, [candidate("unsupported", "UNKNOWN", 114, 114)]);
  const result = recommendations(state);
  assert.equal(result.status, "HOLD");
  assert.deepEqual(result.players, []);
});
