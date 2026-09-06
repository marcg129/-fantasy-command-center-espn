import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { parsePlayerCsv } from "../src/csv.js";

const input = process.argv[2];
if (!input) { console.error("Usage: node scripts/encode-rankings.mjs <input.csv>"); process.exit(1); }
const csv = fs.readFileSync(input, "utf8");
const report = parsePlayerCsv(csv);
if (report.errors.length) { console.error(`Rankings validation failed with ${report.errors.length} error(s).`); process.exit(1); }
const output = path.resolve(".runtime/rankings-gzip-base64.txt");
fs.mkdirSync(path.dirname(output), { recursive: true });
const encoded = zlib.gzipSync(csv).toString("base64");
fs.writeFileSync(output, encoded, { mode: 0o600 });
console.log(`Encoded ${report.players.length} players (${Buffer.byteLength(encoded)} bytes) to ${output}`);
