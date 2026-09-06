import test from "node:test";
import assert from "node:assert/strict";
import { availablePlayers, changeDraftPosition, correctPick, createState, currentPick, nextUserPick, picksForPosition, recordPick, rosterCounts, roundForPick, snakeSlot, starterNeeds, undoPick } from "../src/draft-engine.js";

const players = [
  { id:"a", name:"A", team:"AAA", position:"RB", overallRank:1 },
  { id:"b", name:"B", team:"BBB", position:"WR", overallRank:2 },
  { id:"c", name:"C", team:"CCC", position:"TE", overallRank:3 }
];

test("all ten snake positions alternate correctly", () => {
  for (let slot=1;slot<=10;slot++) {
    const picks=picksForPosition(slot,10,3);
    assert.deepEqual(picks,[slot,20-slot+1,20+slot]);
    assert.equal(snakeSlot(picks[0]),slot); assert.equal(snakeSlot(picks[1]),slot);
  }
});
test("confirmed fourth position has all sixteen selections", () => assert.deepEqual(picksForPosition(4),[4,17,24,37,44,57,64,77,84,97,104,117,124,137,144,157]));
test("round transitions and on-clock slots", () => { assert.equal(roundForPick(10),1); assert.equal(roundForPick(11),2); assert.equal(snakeSlot(10),10); assert.equal(snakeSlot(11),10); assert.equal(snakeSlot(20),1); assert.equal(snakeSlot(21),1); });
test("current and next user pick derive from ledger", () => { const state=createState({players}); assert.equal(currentPick(state),1); assert.equal(nextUserPick(state),4); recordPick(state,"a"); recordPick(state,"b"); recordPick(state,"c"); assert.equal(currentPick(state),4); assert.equal(nextUserPick(state),4); });
test("duplicate drafting is prevented", () => { const state=createState({players}); recordPick(state,"a"); assert.throws(()=>recordPick(state,"a"),/already/); assert.deepEqual(availablePlayers(state).map(x=>x.id),["b","c"]); });
test("undo and earlier correction preserve ledger integrity", () => { const state=createState({players}); recordPick(state,"a"); recordPick(state,"b"); correctPick(state,1,"c"); assert.equal(state.picks[0].playerId,"c"); assert.throws(()=>correctPick(state,1,"b"),/already/); assert.equal(undoPick(state).playerId,"b"); assert.equal(currentPick(state),2); });
test("draft-position correction preserves imported and saved data", () => { const state=createState({players,picks:[{pick:1,round:1,teamSlot:1,playerId:"a"}],shortlist:["b"]}); changeDraftPosition(state,7); assert.equal(state.league.draftPosition,7); assert.equal(state.players.length,3); assert.equal(state.picks.length,1); assert.deepEqual(state.shortlist,["b"]); assert.equal(state.teamNames[6],"Men of Steele"); });
test("FLEX counts RB, WR, and TE", () => { const state=createState({players,picks:players.map((p,i)=>({pick:i+1,round:1,teamSlot:4,playerId:p.id}))}); assert.deepEqual(rosterCounts(state),{QB:0,RB:1,WR:1,TE:1,DST:0,K:0}); assert.equal(starterNeeds(state).FLEX,3); state.league.starters={...state.league.starters,RB:0,WR:0,TE:0}; assert.equal(starterNeeds(state).FLEX,0); });
