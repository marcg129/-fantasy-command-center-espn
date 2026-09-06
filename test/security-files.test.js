import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("tracked environment example contains empty placeholders only",()=>{
  assert.equal(fs.readFileSync(".env.example","utf8"),"BETA_ACCESS_CODE=\nSESSION_SECRET=\nRANKINGS_GZIP_BASE64=\n");
  const ignored=fs.readFileSync(".gitignore","utf8");
  assert.match(ignored,/\.env\.\*/);
  assert.match(ignored,/\.runtime\//);
  assert.match(ignored,/rankings-gzip-base64\.txt/);
});
