import test from "node:test";
import assert from "node:assert/strict";
import { loadAutomaticRankings } from "../src/automatic-rankings.js";
import { parsePlayerCsv } from "../src/csv.js";
import { createState } from "../src/draft-engine.js";

const CSV="player_name,team,position,overall_rank\nAutomatic Player,AUT,RB,1";
test("cached rankings prevent an automatic request or replacement",async()=>{const existing={id:"existing",name:"Existing",team:"OLD",position:"WR",overallRank:1};const state=createState({players:[existing],importedAt:"2026-01-01T00:00:00.000Z"});let calls=0,saves=0;const result=await loadAutomaticRankings({state,fetchImpl:async()=>{calls++;},parsePlayerCsv,saveState:()=>saves++});assert.equal(result.status,"cached");assert.equal(calls,0);assert.equal(saves,0);assert.equal(state.players[0],existing);});
test("automatic rankings import through the canonical parser and persist",async()=>{const state=createState();let saved;const result=await loadAutomaticRankings({state,fetchImpl:async()=>({ok:true,text:async()=>CSV}),parsePlayerCsv,saveState:value=>saved=value,now:()=>"2026-09-06T20:00:00.000Z"});assert.equal(result.status,"ready");assert.equal(state.players[0].name,"Automatic Player");assert.equal(state.importedAt,"2026-09-06T20:00:00.000Z");assert.equal(saved,state);});
test("automatic-load failure preserves picks, queue, and player state",async()=>{const state=createState({players:[],picks:[{pick:1,playerId:"queued"}],shortlist:["queued"]});const before=JSON.stringify(state);const result=await loadAutomaticRankings({state,fetchImpl:async()=>({ok:false}),parsePlayerCsv,saveState:()=>assert.fail("must not save")});assert.equal(result.status,"fallback");assert.equal(JSON.stringify(state),before);});
