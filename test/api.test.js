import test from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import sessionHandler from "../api/session.js";
import rankingsHandler from "../api/rankings.js";
import { COOKIE_NAME, createSession } from "../api/_auth.js";
import { parsePlayerCsv } from "../src/csv.js";

const SECRET = "test-only-session-secret-at-least-32-characters";
const CODE = "test-only-code";
const CSV = "player_name,team,position,overall_rank,adp\nAlpha Runner,AAA,RB,1,2";
const response = () => ({ headers:{}, setHeader(key,value){this.headers[key.toLowerCase()]=value;}, end(value=""){this.body=String(value);} });
const call = (handler, request, env = {}) => {
  const original = { ...process.env };
  Object.assign(process.env, env);
  for (const key of ["BETA_ACCESS_CODE","SESSION_SECRET","RANKINGS_GZIP_BASE64"]) if (!(key in env)) delete process.env[key];
  const result=response();
  try { handler({ method:"GET", headers:{}, ...request, headers:{...(request.headers || {})} },result); return result; }
  finally { process.env=original; }
};
const post = code => call(sessionHandler,{method:"POST",headers:{origin:"http://localhost",host:"localhost"},body:{code}},{BETA_ACCESS_CODE:CODE,SESSION_SECRET:SECRET});

test("correct access code creates a signed protected session",()=>{const result=post(CODE);assert.equal(result.statusCode,200);const cookie=result.headers["set-cookie"];assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);assert.match(cookie,/Path=\//);assert.ok(cookie.startsWith(`${COOKIE_NAME}=`));const token=cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))[1];const check=call(sessionHandler,{headers:{cookie:`${COOKIE_NAME}=${token}`}}, {BETA_ACCESS_CODE:CODE,SESSION_SECRET:SECRET});assert.equal(check.statusCode,200);});
test("incorrect and missing codes are rejected generically",()=>{for(const code of ["wrong",undefined]){const result=post(code);assert.equal(result.statusCode,401);assert.equal(JSON.parse(result.body).error,"Access denied");assert.ok(!result.body.includes(CODE));}});
test("missing session configuration and invalid origins fail safely",()=>{const missing=call(sessionHandler,{method:"POST",headers:{origin:"http://localhost",host:"localhost"},body:{code:CODE}},{});assert.equal(missing.statusCode,503);assert.ok(!missing.body.includes(CODE));const crossSite=call(sessionHandler,{method:"POST",headers:{origin:"https://attacker.test",host:"localhost"},body:{code:CODE}},{BETA_ACCESS_CODE:CODE,SESSION_SECRET:SECRET});assert.equal(crossSite.statusCode,403);});
test("expired, invalid, and tampered cookies are rejected",()=>{const expired=createSession(SECRET,0);const valid=createSession(SECRET);for(const token of [expired,"invalid",`${valid.slice(0,-1)}x`]){const result=call(sessionHandler,{headers:{cookie:`${COOKIE_NAME}=${token}`}}, {BETA_ACCESS_CODE:CODE,SESSION_SECRET:SECRET});assert.equal(result.statusCode,401);}});
test("rankings require a valid authenticated session",()=>{const payload=zlib.gzipSync(CSV).toString("base64");const result=call(rankingsHandler,{headers:{}},{SESSION_SECRET:SECRET,RANKINGS_GZIP_BASE64:payload});assert.equal(result.statusCode,401);assert.ok(!result.body.includes(payload));});
test("valid protected rankings decode and use the canonical parser",()=>{const payload=zlib.gzipSync(CSV).toString("base64"),token=createSession(SECRET);const result=call(rankingsHandler,{headers:{cookie:`${COOKIE_NAME}=${token}`}},{SESSION_SECRET:SECRET,RANKINGS_GZIP_BASE64:payload});assert.equal(result.statusCode,200);assert.match(result.headers["content-type"],/text\/csv/);assert.equal(result.headers["cache-control"],"private, no-store");const parsed=parsePlayerCsv(result.body);assert.equal(parsed.errors.length,0);assert.equal(parsed.players.length,1);assert.ok(!result.body.includes(payload));assert.ok(!result.body.includes(SECRET));});
test("missing or invalid rankings configuration is non-sensitive",()=>{const token=createSession(SECRET);for(const payload of [undefined,"not-base64"]){const env={SESSION_SECRET:SECRET};if(payload)env.RANKINGS_GZIP_BASE64=payload;const result=call(rankingsHandler,{headers:{cookie:`${COOKIE_NAME}=${token}`}},env);assert.equal(result.statusCode,503);assert.ok(!result.body.includes(SECRET));if(payload)assert.ok(!result.body.includes(payload));}});
