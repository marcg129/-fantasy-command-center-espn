import { availablePlayers, changeDraftPosition, changeTeamCount, correctPick, createState, currentPick, nextUserPick, picksForPosition, recommendations, recordPick, rosterCounts, roundForPick, snakeSlot, starterNeeds, undoPick } from "./draft-engine.js";
import { parsePlayerCsv } from "./csv.js";
import { clearState, exportBackup, importBackup, loadState, saveState } from "./storage.js";
import { hasCachedRankings, loadProtectedRankings } from "./protected-rankings.js";

let state = loadState();
const $ = selector => document.querySelector(selector);
const formatValue = value => value == null ? "—" : value;
const download = (name, content, type) => { const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(new Blob([content], { type })); anchor.download = name; anchor.click(); URL.revokeObjectURL(anchor.href); };
const toast = message => { $("#toast").textContent = message; $("#toast").classList.add("show"); setTimeout(() => $("#toast").classList.remove("show"), 2600); };
const commit = (message) => { saveState(state); render(); if (message) toast(message); };
const playerById = id => state.players.find(player => player.id === id);
const teamName = slot => state.teamNames[slot - 1] || `Team ${slot}`;

function showTab(id) {
  document.querySelectorAll(".tab-view").forEach(view => view.classList.toggle("active", view.id === id));
  document.querySelectorAll(".tabs button").forEach(button => button.classList.toggle("active", button.dataset.tab === id));
}

function render() {
  const pick = currentPick(state), round = roundForPick(pick, state.league.teams), within = ((pick - 1) % state.league.teams) + 1;
  $("#current-pick").textContent = pick > state.league.teams * state.league.rounds ? "Complete" : `${round}.${String(within).padStart(2,"0")}`;
  $("#clock-team").textContent = pick > state.league.teams * state.league.rounds ? "Draft complete" : `${teamName(snakeSlot(pick, state.league.teams))} on the clock`;
  const next = nextUserPick(state);
  $("#next-pick").textContent = next ? `${roundForPick(next, state.league.teams)}.${String(((next - 1) % state.league.teams) + 1).padStart(2,"0")}` : state.league.draftPosition ? "Complete" : "Select position";
  $("#pick-spacing").textContent = next ? `${next - pick} pick${next - pick === 1 ? "" : "s"} away · #${next} overall` : state.league.draftPosition ? "All selections complete" : "Choose a valid draft position";
  $("#queue-count").textContent = state.shortlist.length;
  renderPlayers(); renderRecommendations(); renderRoster(); renderQueue(); renderLedger(); renderSettings();
}

function renderPlayers() {
  const query = $("#search").value.toLowerCase(), position = $("#position-filter").value;
  const players = availablePlayers(state).filter(player => (!position || player.position === position) && (!query || `${player.name} ${player.team}`.toLowerCase().includes(query))).sort((a,b) => a.overallRank-b.overallRank);
  $("#player-count").textContent = `${players.length} available`;
  $("#empty-import").hidden = state.players.length > 0;
  $("#player-list").innerHTML = players.map(player => `<article class="player-row"><div class="rank">${player.overallRank}</div><div class="player-info"><strong>${escapeHtml(player.name)}</strong><span>${player.team} · ${player.position} · ${player.positionalRank == null ? "Pos rank —" : `${player.position}${player.positionalRank}`}</span></div><div class="metrics"><span><small>ADP</small>${formatValue(player.adp)}</span><span><small>PROJ</small>${formatValue(player.projectedPoints)}</span><span><small>TIER</small>${formatValue(player.tier)}</span></div><button class="queue-button ${state.shortlist.includes(player.id) ? "queued" : ""}" data-queue="${player.id}" aria-label="Toggle ${escapeHtml(player.name)} in queue">☆</button><button class="draft-button" data-draft="${player.id}">Draft</button></article>`).join("");
}

function renderRecommendations() {
  const result = recommendations(state);
  $("#recommendation-note").textContent = result.message;
  $("#recommendation-list").innerHTML = result.players.length ? result.players.map((player,index) => `<article class="rec"><div class="rec-number">${index+1}</div><div><strong>${escapeHtml(player.name)}</strong><span>${player.team} · ${player.position}</span><p>${player.reasons.join(" · ")}</p><div class="rec-data"><span>Source rank <b>${formatValue(player.overallRank)}</b></span><span>ADP <b>${formatValue(player.adp)}</b></span><span>Projected <b>${formatValue(player.projectedPoints)}</b></span><span class="app-score">App score <b>${player.recommendationScore}</b></span></div></div></article>`).join("") : `<div class="hold"><strong>HOLD</strong><span>Insufficient data</span></div>`;
}

function renderRoster() {
  const counts = rosterCounts(state), needs = starterNeeds(state), total = Object.values(counts).reduce((sum,count) => sum+count,0);
  $("#roster-total").textContent = `${total} / 16`;
  $("#roster-counts").innerHTML = ["QB","RB","WR","TE","FLEX","DST","K"].map(position => `<div class="roster-line"><span>${position === "DST" ? "D/ST" : position}</span><b>${position === "FLEX" ? `${needs.FLEX ? "OPEN" : "FILLED"}` : `${counts[position]} / ${state.league.starters[position]}`}</b></div>`).join("");
}

function renderQueue() {
  const drafted = new Set(state.picks.map(pick => pick.playerId));
  $("#queue-list").innerHTML = state.shortlist.length ? state.shortlist.map((id,index) => { const player=playerById(id); if (!player) return ""; return `<article class="queue-row ${drafted.has(id) ? "drafted" : ""}"><span class="queue-order">${index+1}</span><div><strong>${escapeHtml(player.name)}</strong><span>${player.team} · ${player.position}${drafted.has(id) ? " · DRAFTED" : ""}</span></div><div class="queue-actions"><button data-move="up" data-id="${id}" ${index===0?"disabled":""}>↑</button><button data-move="down" data-id="${id}" ${index===state.shortlist.length-1?"disabled":""}>↓</button><button data-remove="${id}">Remove</button></div></article>`; }).join("") : `<div class="empty"><strong>No targets yet.</strong><p>Use ☆ beside any available player to build your queue.</p></div>`;
}

function renderLedger() {
  $("#undo").disabled = !state.picks.length;
  $("#pick-log").innerHTML = state.picks.length ? [...state.picks].reverse().map(pick => { const player=playerById(pick.playerId); return `<article class="pick-row"><span class="pick-number">#${pick.pick}<small>R${pick.round}</small></span><div><strong>${escapeHtml(player?.name || "Unknown")}</strong><span>${player?.team || "—"} · ${player?.position || "—"}</span></div><span class="receiving-team">${escapeHtml(teamName(pick.teamSlot))}</span><button data-correct="${pick.pick}" class="link-button">Correct</button></article>`; }).join("") : `<div class="empty"><strong>No picks recorded.</strong><p>The ledger will become the source of truth as the draft proceeds.</p></div>`;
}

function renderSettings() {
  $("#team-count").value = state.league.teams;
  $("#league-draft-summary").textContent = `${state.league.teams} teams · Snake · ${state.league.rounds} rounds`;
  $("#hero-draft-summary").textContent = `${state.league.teams}-team snake · ${state.league.secondsPerPick} sec/pick`;
  $("#hero-position").textContent = state.league.draftPosition ? `Draft from the ${state.league.draftPosition} spot.` : "Choose your draft position.";
  $("#draft-position").innerHTML = `${state.league.draftPosition ? "" : '<option value="" selected disabled>Select a position</option>'}${Array.from({length:state.league.teams},(_,index) => `<option value="${index+1}" ${index+1===state.league.draftPosition?"selected":""}>${index+1} of ${state.league.teams}</option>`).join("")}`;
  $("#scheduled-picks").innerHTML = state.league.draftPosition ? `<strong>Scheduled selections</strong><br>${picksForPosition(state.league.draftPosition, state.league.teams, state.league.rounds).join(", ")}` : "<strong>New draft position required</strong><br>Select a valid position before drafting.";
  const cached = hasCachedRankings(state);
  $("#rankings-cache").textContent = cached ? `${state.players.length} cached players · Imported ${state.importedAt ? new Date(state.importedAt).toLocaleString() : "time unavailable"}` : "No rankings are cached on this device.";
  if (cached) { $("#rankings-status").textContent = "Ready — using cached rankings. No protected request was made."; $("#rankings-form").hidden = true; }
}

function escapeHtml(value) { const div=document.createElement("div"); div.textContent=value; return div.innerHTML; }

document.addEventListener("click", event => {
  const tab = event.target.closest("[data-tab]"); if (tab) showTab(tab.dataset.tab);
  if (event.target.closest("[data-open-settings]")) showTab("settings");
  const draft = event.target.closest("[data-draft]"); if (draft) { try { recordPick(state, draft.dataset.draft); commit("Pick recorded"); } catch(error) { toast(error.message); } }
  const queue = event.target.closest("[data-queue]"); if (queue) { const id=queue.dataset.queue; state.shortlist = state.shortlist.includes(id) ? state.shortlist.filter(item=>item!==id) : [...state.shortlist,id]; commit(); }
  const remove = event.target.closest("[data-remove]"); if (remove) { state.shortlist=state.shortlist.filter(id=>id!==remove.dataset.remove); commit(); }
  const move = event.target.closest("[data-move]"); if (move) { const index=state.shortlist.indexOf(move.dataset.id), target=index+(move.dataset.move==="up"?-1:1); [state.shortlist[index],state.shortlist[target]]=[state.shortlist[target],state.shortlist[index]]; commit(); }
  const correction = event.target.closest("[data-correct]"); if (correction) openCorrection(Number(correction.dataset.correct));
});
$("#search").addEventListener("input", renderPlayers); $("#position-filter").addEventListener("change", renderPlayers);
$("#undo").addEventListener("click", () => { const undone=undoPick(state); if (undone) commit("Latest pick undone"); });
$("#save-position").addEventListener("click", () => { try { changeDraftPosition(state, Number($("#draft-position").value)); commit("Draft position updated; saved data preserved"); } catch (error) { toast(error.message); } });
$("#draft-position").addEventListener("change", event => { $("#scheduled-picks").innerHTML=`<strong>Scheduled selections</strong><br>${picksForPosition(Number(event.target.value), state.league.teams, state.league.rounds).join(", ")}`; });
let pendingTeamCount = null;
$("#team-count").addEventListener("change", event => {
  const teams = Number(event.target.value);
  if (teams === state.league.teams) return;
  if (state.picks.length) {
    pendingTeamCount = teams;
    $("#team-count-change").textContent = `${state.league.teams} to ${teams} teams`;
    $("#team-count-dialog").showModal();
  } else {
    changeTeamCount(state, teams);
    commit(`League updated to ${teams} teams`);
  }
});
$("#cancel-team-count").addEventListener("click", () => { pendingTeamCount = null; $("#team-count-dialog").close(); render(); });
$("#confirm-team-count").addEventListener("click", () => { changeTeamCount(state, pendingTeamCount); pendingTeamCount = null; $("#team-count-dialog").close(); commit("Team count updated; recorded picks and rosters cleared"); });
$("#manual-mode").addEventListener("click", () => { $("#manual-fallback").scrollIntoView({ behavior: "smooth" }); $("#rankings-status").textContent = "Manual Mode selected — no protected rankings request was made."; });
$("#rankings-form").addEventListener("submit", async event => {
  event.preventDefault(); const button=$("#load-rankings"), status=$("#rankings-status"); button.disabled=true; status.textContent="Loading — authenticating and validating rankings…";
  try { const result=await loadProtectedRankings({code:$("#access-code").value,state,persist:saveState}); $("#access-code").value=""; status.textContent=`Ready — ${result.count} rankings loaded and saved on this device.`; render(); }
  catch(error) { status.textContent=`Fallback available — ${error.message}`; }
  finally { button.disabled=false; }
});
$("#csv-file").addEventListener("change", async event => { const report=parsePlayerCsv(await event.target.files[0].text()); $("#import-report").innerHTML=[...report.errors.map(x=>`<p class="error">${escapeHtml(x)}</p>`),...report.warnings.map(x=>`<p class="warning">${escapeHtml(x)}</p>`)].join(""); if (report.players.length && !report.errors.length) { state.players=report.players; state.importedAt=new Date().toISOString(); state.picks=[]; state.shortlist=[]; commit(`Imported ${report.players.length} players`); } event.target.value=""; });
$("#export-backup").addEventListener("click", () => download("men-of-steele-draft-backup.json", exportBackup(state), "application/json"));
$("#backup-file").addEventListener("change", async event => { try { state=importBackup(await event.target.files[0].text()); commit("Backup restored"); } catch(error) { toast(error.message); } event.target.value=""; });
$("#reset").addEventListener("click", () => $("#confirm-dialog").showModal()); $("#cancel-reset").addEventListener("click",()=>$("#confirm-dialog").close());
$("#confirm-reset").addEventListener("click",()=>{ clearState(); state=createState(); $("#confirm-dialog").close(); render(); toast("Application reset"); });
let correctionPick=null;
function openCorrection(pick) { correctionPick=pick; $("#correct-number").textContent=`#${pick}`; const current=state.picks.find(item=>item.pick===pick)?.playerId; $("#replacement-player").innerHTML=state.players.filter(player=>!state.picks.some(item=>item.playerId===player.id)||player.id===current).sort((a,b)=>a.overallRank-b.overallRank).map(player=>`<option value="${player.id}" ${player.id===current?"selected":""}>${escapeHtml(player.name)} · ${player.position}</option>`).join(""); $("#correct-dialog").showModal(); }
$("#cancel-correct").addEventListener("click",()=>$("#correct-dialog").close()); $("#confirm-correct").addEventListener("click",()=>{ try { correctPick(state,correctionPick,$("#replacement-player").value); $("#correct-dialog").close(); commit("Earlier pick corrected safely"); } catch(error) { toast(error.message); } });
render();
