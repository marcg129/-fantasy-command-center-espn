import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
test("environment example contains only empty required placeholders",async()=>{assert.equal(await readFile(".env.example","utf8"),"BETA_ACCESS_CODE=\nSESSION_SECRET=\nRANKINGS_GZIP_BASE64=\n");});
test("generated rankings and private environment outputs remain ignored",()=>{for(const path of [".runtime/rankings-gzip-base64.txt",".env",".env.production"]){assert.doesNotThrow(()=>execFileSync("git",["check-ignore","-q",path]));}});
