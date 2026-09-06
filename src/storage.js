import { createState } from "./draft-engine.js";
export const STORAGE_KEY = "fcc-espn-state";
export const LEGACY_STORAGE_KEYS = ["fcc-espn-v0.1.0"];
export function saveState(state, storage = localStorage) { storage.setItem(STORAGE_KEY, JSON.stringify(state)); }
export function loadState(storage = localStorage) {
  const raw = storage.getItem(STORAGE_KEY) || LEGACY_STORAGE_KEYS.map(key => storage.getItem(key)).find(Boolean);
  if (!raw) return createState();
  try { return validateBackup(JSON.parse(raw)); } catch { return createState(); }
}
export function clearState(storage = localStorage) { [STORAGE_KEY, ...LEGACY_STORAGE_KEYS].forEach(key => storage.removeItem(key)); }
export function validateBackup(value) {
  if (!value || value.schemaVersion !== 1 || !value.league || !Array.isArray(value.players) || !Array.isArray(value.picks) || !Array.isArray(value.shortlist)) throw new Error("Unsupported or malformed backup");
  const state = createState(value);
  const playerIds = new Set(state.players.map(player => player.id));
  const drafted = new Set();
  for (const pick of state.picks) {
    if (!playerIds.has(pick.playerId) || drafted.has(pick.playerId)) throw new Error("Backup contains invalid or duplicate picks");
    drafted.add(pick.playerId);
  }
  return state;
}
export function exportBackup(state) { return JSON.stringify(state, null, 2); }
export function importBackup(text) { return validateBackup(JSON.parse(text)); }
