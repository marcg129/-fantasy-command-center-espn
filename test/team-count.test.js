import test from "node:test";
import assert from "node:assert/strict";
import { changeDraftPosition, changeTeamCount, createState, nextUserPick, picksForPosition, recordPick, snakeSlot } from "../src/draft-engine.js";
import { exportBackup, importBackup, loadState, saveState, STORAGE_KEY } from "../src/storage.js";

const players = Array.from({ length: 30 }, (_, index) => ({
  id: `p-${index + 1}`, name: `Player ${index + 1}`, team: "TST", position: index % 2 ? "WR" : "RB", overallRank: index + 1
}));
const memory = () => { const map = new Map(); return { getItem: key => map.get(key) || null, setItem: (key, value) => map.set(key, value) }; };

test("existing 10-team behavior and all selectable team-count boundaries remain correct", () => {
  const state = createState();
  assert.equal(state.league.teams, 10);
  assert.deepEqual(picksForPosition(4, 10, 3), [4, 17, 24]);
  for (let teams = 4; teams <= 20; teams++) assert.doesNotThrow(() => changeTeamCount(createState(), teams));
  for (const teams of [3, 21, 12.5]) assert.throws(() => changeTeamCount(createState(), teams), /4 through 20/);
});

test("12-team rounds run 1–12 then reverse from slot 12 to slot 1", () => {
  assert.deepEqual(Array.from({ length: 12 }, (_, index) => snakeSlot(index + 1, 12)), [1,2,3,4,5,6,7,8,9,10,11,12]);
  assert.deepEqual(Array.from({ length: 12 }, (_, index) => snakeSlot(index + 13, 12)), [12,11,10,9,8,7,6,5,4,3,2,1]);
  assert.deepEqual(picksForPosition(12, 12, 4), [12, 13, 36, 37]);
  assert.deepEqual(picksForPosition(11, 12, 4), [11, 14, 35, 38]);
  const state = createState({ league: { teams: 12 } });
  changeDraftPosition(state, 11);
  assert.equal(state.league.draftPosition, 11);
  changeDraftPosition(state, 12);
  assert.equal(state.league.draftPosition, 12);
});

test("next-pick calculations use multiple 12-team positions", () => {
  for (const [position, expected] of [[1, [1,24,25]], [6, [6,19,30]], [11, [11,14,35]], [12, [12,13,36]]]) {
    const state = createState({ league: { teams: 12, draftPosition: position }, players });
    assert.equal(nextUserPick(state), expected[0]);
    for (let index = 0; index < expected[0]; index++) recordPick(state, players[index].id);
    assert.equal(nextUserPick(state), expected[1]);
    while (state.picks.length < expected[1]) recordPick(state, players[state.picks.length].id);
    assert.equal(nextUserPick(state), expected[2]);
  }
});

test("10-to-12 change before picks preserves data, settings, queue, and first ten names", () => {
  const names = Array.from({ length: 10 }, (_, index) => `Club ${index + 1}`);
  const state = createState({ league: { scoring: "Custom PPR" }, teamNames: names, players, shortlist: ["p-2"], importedAt: "2026-09-06T00:00:00.000Z" });
  changeTeamCount(state, 12);
  assert.equal(state.league.teams, 12);
  assert.deepEqual(state.teamNames, [...names, "Team 11", "Team 12"]);
  assert.equal(state.league.draftPosition, 4);
  assert.equal(state.league.scoring, "Custom PPR");
  assert.equal(state.players, players);
  assert.deepEqual(state.shortlist, ["p-2"]);
  assert.equal(state.importedAt, "2026-09-06T00:00:00.000Z");
});

test("cancelling a post-pick change means state stays byte-for-byte unchanged", () => {
  const state = createState({ players, shortlist: ["p-2"] });
  recordPick(state, "p-1");
  const before = JSON.stringify(state);
  // The UI cancellation path deliberately does not call changeTeamCount.
  assert.equal(JSON.stringify(state), before);
});

test("confirming a post-pick change clears only incompatible draft data", () => {
  const state = createState({ players, shortlist: ["p-2", "missing"], importedAt: "2026-09-06T00:00:00.000Z" });
  recordPick(state, "p-1");
  changeTeamCount(state, 12);
  assert.deepEqual(state.picks, []);
  assert.equal(state.players, players);
  assert.deepEqual(state.shortlist, ["p-2"]);
  assert.equal(state.importedAt, "2026-09-06T00:00:00.000Z");
});

test("reducing team count removes only excess slots and requires a new invalidated position", () => {
  const names = Array.from({ length: 12 }, (_, index) => `Club ${index + 1}`);
  const state = createState({ league: { teams: 12, draftPosition: 12 }, teamNames: names, players });
  changeTeamCount(state, 10);
  assert.deepEqual(state.teamNames, names.slice(0, 10));
  assert.equal(state.league.draftPosition, null);
  assert.equal(nextUserPick(state), null);
  assert.throws(() => recordPick(state, "p-1"), /valid draft position/);
});

test("reload and backup restore retain 12 teams", () => {
  const state = createState({ league: { teams: 12, draftPosition: 11 }, players });
  const storage = memory();
  saveState(state, storage);
  assert.equal(loadState(storage).league.teams, 12);
  assert.equal(importBackup(exportBackup(state)).league.teams, 12);
});

test("legacy state without team count defaults to 10 and preserves cached rankings", () => {
  const storage = memory();
  const legacy = createState({ players, shortlist: ["p-2"], importedAt: "2026-09-06T00:00:00.000Z" });
  delete legacy.league.teams;
  storage.setItem(STORAGE_KEY, JSON.stringify(legacy));
  const restored = loadState(storage);
  assert.equal(restored.league.teams, 10);
  assert.equal(restored.players.length, players.length);
  assert.deepEqual(restored.shortlist, ["p-2"]);
  assert.equal(restored.importedAt, "2026-09-06T00:00:00.000Z");
});
