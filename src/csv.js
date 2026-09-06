const REQUIRED = ["player_name", "team", "position", "overall_rank"];
const OPTIONAL = ["positional_rank", "tier", "adp", "projected_points", "bye_week", "notes", "provider_id"];
export const CSV_HEADERS = [...REQUIRED, ...OPTIONAL];

export function parseCsvLine(line) {
  const cells = []; let current = "", quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') { current += '"'; index++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { cells.push(current.trim()); current = ""; }
    else current += char;
  }
  if (quoted) throw new Error("unclosed quote");
  cells.push(current.trim()); return cells;
}
const optionalNumber = value => value === "" || value == null ? null : Number(value);
export function parsePlayerCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) return { players: [], errors: ["The CSV is empty."], warnings: [] };
  const headers = parseCsvLine(lines[0]).map(value => value.toLowerCase().trim());
  const missing = REQUIRED.filter(field => !headers.includes(field));
  if (missing.length) return { players: [], errors: [`Missing required columns: ${missing.join(", ")}`], warnings: [] };
  const players = [], errors = [], warnings = [], seen = new Map();
  for (let line = 1; line < lines.length; line++) {
    let cells;
    try { cells = parseCsvLine(lines[line]); } catch (error) { errors.push(`Row ${line + 1}: ${error.message}`); continue; }
    if (cells.length !== headers.length) { errors.push(`Row ${line + 1}: expected ${headers.length} columns, found ${cells.length}`); continue; }
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
    if (!row.player_name || !row.team || !row.position || !row.overall_rank) { errors.push(`Row ${line + 1}: missing a required value`); continue; }
    const position = row.position.toUpperCase().replace("D/ST", "DST");
    if (!["QB","RB","WR","TE","DST","K"].includes(position)) { errors.push(`Row ${line + 1}: invalid position “${row.position}”`); continue; }
    const numbers = ["overall_rank", "positional_rank", "tier", "adp", "projected_points", "bye_week"];
    if (numbers.some(field => row[field] && !Number.isFinite(Number(row[field])))) { errors.push(`Row ${line + 1}: invalid numeric value`); continue; }
    const identity = `${row.player_name.toLowerCase()}|${row.team.toLowerCase()}|${position}`;
    if (seen.has(identity)) { errors.push(`Row ${line + 1}: duplicate player also found on row ${seen.get(identity)}`); continue; }
    const nameOnly = row.player_name.toLowerCase();
    const sameName = players.find(player => player.name.toLowerCase() === nameOnly);
    if (sameName) warnings.push(`Row ${line + 1}: ambiguous player name “${row.player_name}”; verify team and position.`);
    seen.set(identity, line + 1);
    players.push({
      id: row.provider_id || `local-${line}-${identity.replace(/[^a-z0-9]/g, "-")}`,
      providerId: row.provider_id || null, name: row.player_name, team: row.team, position,
      overallRank: Number(row.overall_rank), positionalRank: optionalNumber(row.positional_rank), tier: optionalNumber(row.tier),
      adp: optionalNumber(row.adp), projectedPoints: optionalNumber(row.projected_points), byeWeek: optionalNumber(row.bye_week), notes: row.notes || null
    });
  }
  return { players, errors, warnings };
}

export const templateCsv = `${CSV_HEADERS.join(",")}\n`;
