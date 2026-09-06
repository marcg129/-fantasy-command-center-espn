import test from "node:test";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import sessionHandler from "../api/session.js";
import rankingsHandler from "../api/rankings.js";
import { COOKIE_NAME, createSession, verifySession } from "../server/session.js";

const csv = "player_name,team,position,overall_rank\nAlpha,AAA,RB,1\n";
function response() { return { statusCode: 200, headers: {}, body: "", setHeader(key,value){this.headers[key.toLowerCase()]=value;}, end(value=""){this.body=value;} }; }
const request = (overrides={}) => ({ method:"POST", headers:{origin:"https://example.test",host:"example.test","x-forwarded-proto":"https"}, body:{code:"open-sesame"}, ...overrides });
const env = { BETA_ACCESS_CODE:"open-sesame", SESSION_SECRET:"long-session-secret", RANKINGS_GZIP_BASE64:gzipSync(csv).toString("base64") };
async function configured(fn) { const old={...process.env}; Object.assign(process.env,env); try{return await fn();}finally{process.env=old;} }

test("correct access code creates an eight-hour secure signed cookie", async()=>configured(async()=>{process.env.NODE_ENV="production";const res=response();await sessionHandler(request(),res);assert.equal(res.statusCode,200);assert.match(res.headers["set-cookie"],/HttpOnly; SameSite=Lax; Path=\/; Max-Age=28800; Secure/);const value=res.headers["set-cookie"].match(new RegExp(`${COOKIE_NAME}=([^;]+)`))[1];assert.equal(verifySession(value,env.SESSION_SECRET),true);assert.equal(res.headers["cache-control"],"private, no-store");}));
test("incorrect access code returns a generic non-sensitive error", async()=>configured(async()=>{const res=response();await sessionHandler(request({body:{code:"wrong"}}),res);assert.equal(res.statusCode,401);assert.equal(res.body,JSON.stringify({error:"Authentication failed."}));assert.doesNotMatch(res.body,/wrong|open-sesame|secret/);}));
test("missing configuration is generic", async()=>{delete process.env.BETA_ACCESS_CODE;delete process.env.SESSION_SECRET;const res=response();await sessionHandler(request(),res);assert.equal(res.statusCode,503);assert.equal(res.body,JSON.stringify({error:"Service is not configured."}));});
test("cross-origin session requests are rejected", async()=>configured(async()=>{const res=response();await sessionHandler(request({headers:{origin:"https://evil.test",host:"example.test","x-forwarded-proto":"https"}}),res);assert.equal(res.statusCode,403);}));
test("expired, malformed, and tampered sessions are rejected",()=>{const token=createSession(env.SESSION_SECRET,1_000_000);assert.equal(verifySession(token,env.SESSION_SECRET,1_000_000+28_801_000),false);assert.equal(verifySession("malformed",env.SESSION_SECRET),false);assert.equal(verifySession(`${token.slice(0,-1)}x`,env.SESSION_SECRET,1_000_000),false);});
test("authenticated rankings retrieval returns canonical CSV with no-store", async()=>configured(async()=>{const res=response();await rankingsHandler({method:"GET",headers:{cookie:`${COOKIE_NAME}=${createSession(env.SESSION_SECRET)}`}},res);assert.equal(res.statusCode,200);assert.equal(res.body,csv);assert.match(res.headers["content-type"],/^text\/csv/);assert.equal(res.headers["cache-control"],"private, no-store");}));
test("invalid canonical CSV and encoded configuration return no sensitive details", async()=>configured(async()=>{process.env.RANKINGS_GZIP_BASE64=gzipSync("not,csv\n1,2\n").toString("base64");const res=response();await rankingsHandler({method:"GET",headers:{cookie:`${COOKIE_NAME}=${createSession(env.SESSION_SECRET)}`}},res);assert.equal(res.statusCode,503);assert.equal(res.body,JSON.stringify({error:"Rankings are not configured."}));assert.doesNotMatch(res.body,/not,csv|H4s/);}));
