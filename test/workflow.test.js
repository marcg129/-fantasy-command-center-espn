import test from "node:test";
import assert from "node:assert/strict";
import { parsePlayerCsv } from "../src/csv.js";
import { availablePlayers, changeDraftPosition, createState, recommendations, recordPick, undoPick } from "../src/draft-engine.js";
import { exportBackup, importBackup, loadState, saveState } from "../src/storage.js";

test("manual draft workflow survives refresh and backup recovery", () => {
  const csv = `player_name,team,position,overall_rank,positional_rank,tier,adp,projected_points,bye_week,notes,provider_id
Alpha Runner,AAA,RB,1,1,1,3,280,8,Target,p-1
Bravo Wide,BBB,WR,2,1,1,5,260,9,,p-2
Charlie QB,CCC,QB,3,1,1,18,300,10,,p-3
Delta Tight,DDD,TE,4,1,1,30,210,11,,p-4`;
  const imported = parsePlayerCsv(csv);
  assert.deepEqual(imported.errors, []);
  const state = createState({ players: imported.players, shortlist: ["p-4"] });
  changeDraftPosition(state, 4);
  const before = recommendations(state).players.map(player => player.id);
  recordPick(state, "p-1"); recordPick(state, "p-2"); recordPick(state, "p-3");
  assert.deepEqual(availablePlayers(state).map(player => player.id), ["p-4"]);
  assert.notDeepEqual(recommendations(state).players.map(player => player.id), before);
  undoPick(state);
  assert.ok(availablePlayers(state).some(player => player.id === "p-3"));
  const map = new Map(), storage = { getItem:key => map.get(key) || null, setItem:(key,value) => map.set(key,value) };
  saveState(state, storage);
  const refreshed = loadState(storage);
  assert.equal(refreshed.picks.length, 2);
  assert.deepEqual(refreshed.shortlist, ["p-4"]);
  const restored = importBackup(exportBackup(refreshed));
  assert.deepEqual(restored, refreshed);
});
