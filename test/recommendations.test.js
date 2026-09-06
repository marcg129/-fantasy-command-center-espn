import test from "node:test";
import assert from "node:assert/strict";
import { createState, recommendations, snakeSlot } from "../src/draft-engine.js";

const player = (id, position, overallRank, adp = overallRank, tier = 1, projectedPoints = 200) => ({ id, name:id, team:"TST", position, overallRank, adp, tier, projectedPoints });
const atPick = (pick, candidates) => {
  const rosterPlan = ["RB","WR","QB","RB","WR","TE","RB","WR","QB","RB","WR","TE","DST","K","RB","WR"];
  let userSelection = 0;
  const fillers = Array.from({length:pick - 1}, (_,index) => {
    const position = snakeSlot(index + 1) === 4 ? rosterPlan[userSelection++] : ["RB","WR","QB","TE"][index % 4];
    return player(`drafted-${index}`, position, index + 1);
  });
  return createState({players:[...fillers, ...candidates],picks:fillers.map((item,index) => ({pick:index + 1,round:Math.ceil((index + 1) / 10),teamSlot:snakeSlot(index + 1),playerId:item.id}))});
};

test("corrected opening order favors elite RB/WR source ranks over TE need and late ADP", () => {
  const drafted = [player("Ja'Marr Chase","WR",1,1), player("Jahmyr Gibbs","RB",2,2)];
  const candidates = [player("Puka Nacua","WR",3,5,1,285),player("Bijan Robinson","RB",4,4,1,280),player("Brock Bowers","TE",5,22,1,250)];
  const state = createState({players:[...drafted,...candidates],picks:drafted.map((item,index)=>({pick:index+1,round:1,teamSlot:index+1,playerId:item.id}))});
  assert.deepEqual(recommendations(state,3).players.map(item=>item.id),["Puka Nacua","Bijan Robinson","Brock Bowers"]);
});

test("ADP rewards a fall, penalizes reaches, and leaves missing ADP neutral", () => {
  const state = createState({players:[...Array.from({length:9},(_,i)=>player(`gone-${i}`,"WR",i+1)),player("fallen","RB",10,1),player("missing","RB",10,null),player("ahead","RB",10,22)],picks:Array.from({length:9},(_,i)=>({pick:i+1,round:1,teamSlot:1,playerId:`gone-${i}`}))});
  const scores=Object.fromEntries(recommendations(state).players.map(item=>[item.id,item]));
  assert.ok(scores.fallen.recommendationScore > scores.missing.recommendationScore);
  assert.ok(scores.missing.recommendationScore > scores.ahead.recommendationScore);
  assert.ok(scores.fallen.reasons.includes("fallen past market ADP"));
});

test("tier bonus requires two actual tiers and remains bounded",()=>{const state=createState({players:[player("cliff","RB",1,1,1),player("after","RB",2,2,2),player("unknown","WR",1,1,null),player("unknown-next","WR",2,2,3)]});const scored=Object.fromEntries(recommendations(state).players.map(item=>[item.id,item]));assert.ok(scored.cliff.reasons.includes("tier drop follows"));assert.ok(!scored.unknown.reasons.includes("tier drop follows"));});

for (const [round,pick] of [[8,71],[12,111],[16,151]]) test(`round ${round} retains useful recommendations near the current pick`,()=>{const candidates=[player(`near-${round}`,"RB",pick,pick),player(`later-${round}`,"WR",pick+12,pick+12),player(`k-${round}`,"K",pick+1,pick+1),player(`dst-${round}`,"DST",pick+2,pick+2)];const result=recommendations(atPick(pick,candidates));assert.equal(result.status,"READY");assert.equal(result.players[0].id,`near-${round}`);assert.ok(result.players.some(item=>item.id===`near-${round}`));if(round===8) assert.ok(!result.players.some(item=>["K","DST"].includes(item.position)));if(round===12) assert.ok(result.players.find(item=>item.position==="K").recommendationScore < result.players.find(item=>item.position==="WR").recommendationScore);if(round===16) assert.ok(result.players.some(item=>item.position==="K"));});

test("K and DST penalties follow round thresholds regardless of open starter slots",()=>{const scores=[];for(const pick of [81,101,121]){const all=recommendations(atPick(pick,[player("rb","RB",pick,pick),player("k","K",pick,pick)]),8).players;const rb=all.find(item=>item.id==="rb")?.recommendationScore;const k=all.find(item=>item.id==="k")?.recommendationScore;scores.push(k);if(pick===81) assert.equal(k,undefined);if(pick===101) assert.ok(k < rb);if(pick===121) assert.ok(k >= rb - 7);}assert.ok(scores[2] > scores[1]);});

test("HOLD remains valid without an eligible trustworthy source rank",()=>{const result=recommendations(createState({players:[player("invalid","RB",null)]}));assert.equal(result.status,"HOLD");assert.deepEqual(result.players,[]);});
