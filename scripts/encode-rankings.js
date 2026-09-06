import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { parsePlayerCsv } from "../src/csv.js";

const input = process.argv[2];
if (!input) { console.error("Usage: npm run encode-rankings -- path/to/rankings.csv"); process.exit(1); }
const csv = await readFile(input, "utf8");
const report = parsePlayerCsv(csv);
if (!report.players.length || report.errors.length) { console.error("Rankings CSV failed canonical validation."); process.exit(1); }
const encoded = gzipSync(Buffer.from(csv)).toString("base64");
const output = ".runtime/rankings-gzip-base64.txt";
await mkdir(".runtime", { recursive: true, mode: 0o700 });
await writeFile(output, encoded, { mode: 0o600 }); await chmod(output, 0o600);
console.log(`Validated players: ${report.players.length}`);
console.log(`Encoded length: ${encoded.length}`);
console.log(`Output path: ${output}`);
