import test from "node:test";
import assert from "node:assert/strict";
import { createState, recommendations } from "../src/draft-engine.js";

const player = (id, name, position, rank, adp, tier = null) => ({
  id, name, team: "TST", position, overallRank: rank, adp, tier,
  positionalRank: null, projectedPoints: null, byeWeek: null, notes: null
});

const scoreFor = (state, id) => recommendations(state, 100).players.find(item => item.id === id)?.recommendationScore;

test("pick 1.03 ranks Puka and Bijan above Brock Bowers", () => {
  const players = [
    player("chase", "Ja'Marr Chase", "WR", 1, 1, 1),
    player("gibbs", "Jahmyr Gibbs", "RB", 2, 3, 1),
    player("puka", "Puka Nacua", "WR", 3, 4, 1),
    player("bijan", "Bijan Robinson", "RB", 4, 2, 1),
    player("brown", "A.J. Brown", "WR", 12, 17, 2),
    player("bowers", "Brock Bowers", "TE", 19, 22, 1),
    player("nabers", "Malik Nabers", "WR", 23, 27, 3)
  ];
  const picks = [
    { pick: 1, round: 1, teamSlot: 1, playerId: "chase" },
    { pick: 2, round: 1, teamSlot: 2, playerId: "gibbs" }
  ];
  const ordered = recommendations(createState({ players, picks })).players;
  assert.deepEqual(ordered.slice(0, 3).map(item => item.id), ["puka", "bijan", "brown"]);
  assert.ok(scoreFor(createState({ players, picks }), "puka") > scoreFor(createState({ players, picks }), "bowers"));
  assert.ok(scoreFor(createState({ players, picks }), "bijan") > scoreFor(createState({ players, picks }), "bowers"));
});

test("later ADP is not rewarded merely for being farther from the current pick", () => {
  const early = player("early", "Early Market", "WR", 10, 4);
  const reach = player("reach", "Later Market", "WR", 10, 22);
  const state = createState({ players: [early, reach, player("x", "Drafted One", "RB", 1, 1), player("y", "Drafted Two", "RB", 2, 2)], picks: [
    { pick: 1, round: 1, teamSlot: 1, playerId: "x" }, { pick: 2, round: 1, teamSlot: 2, playerId: "y" }
  ] });
  assert.ok(scoreFor(state, "early") > scoreFor(state, "reach"));
});

test("a meaningful fall past ADP earns a capped market-value bonus", () => {
  const drafted = Array.from({ length: 19 }, (_, index) => player(`d${index}`, `Drafted ${index}`, "WR", index + 1, index + 1));
  const picks = drafted.map((item, index) => ({ pick: index + 1, round: Math.ceil((index + 1) / 10), teamSlot: 1, playerId: item.id }));
  const fallen = player("fallen", "Fallen Player", "RB", 25, 10);
  const market = player("market", "At Market", "RB", 25, 20);
  const state = createState({ players: [...drafted, fallen, market], picks });
  assert.ok(scoreFor(state, "fallen") > scoreFor(state, "market"));
  assert.match(recommendations(state, 100).players.find(item => item.id === "fallen").reasons.join(" "), /fallen past market ADP/);
});

test("missing ADP is neutral", () => {
  const withoutAdp = createState({ players: [player("candidate", "Candidate", "RB", 8, null)] });
  const atMarket = createState({ players: [player("candidate", "Candidate", "RB", 8, 1)] });
  assert.equal(scoreFor(withoutAdp, "candidate"), scoreFor(atMarket, "candidate"));
});

test("empty K and DST starter slots do not put them in early recommendations", () => {
  const skill = Array.from({ length: 10 }, (_, index) => player(`s${index}`, `Skill ${index}`, index % 2 ? "RB" : "WR", index + 10, index + 10));
  const state = createState({ players: [...skill, player("k", "Kicker", "K", 5, 5), player("dst", "Defense", "DST", 6, 6)] });
  const ids = recommendations(state, 8).players.map(item => item.id);
  assert.ok(!ids.includes("k"));
  assert.ok(!ids.includes("dst"));
});

test("starter need and tier drop cannot overwhelm a superior source rank", () => {
  const elite = player("elite", "Elite Wideout", "WR", 3, 3, 1);
  const lower = player("lower", "Tier-End Tight End", "TE", 24, 24, 1);
  const nextTe = player("next-te", "Next Tight End", "TE", 25, 25, 2);
  const ordered = recommendations(createState({ players: [elite, lower, nextTe] })).players;
  assert.equal(ordered[0].id, "elite");
  assert.ok(scoreFor(createState({ players: [elite, lower, nextTe] }), "elite") > scoreFor(createState({ players: [elite, lower, nextTe] }), "lower"));
});
