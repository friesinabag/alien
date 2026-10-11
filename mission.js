"use strict";

// Shared mission rules. Only the online host owns hidden state.
function resetMission() {
    game.commSilenced = new Set();
    game.commSilenceRound = null;
    game.eventRound = null;
    game.shipEvent = null;
    announceShipEvent(null, game.round, false);
    game.openingVote = false;
    game.initialRoleReveal = false;
    game.roleRevealId = null;
    game.rolesPending = new Set();
    game.repairChallenges = {};
    game.timeline = [];
    game.players.forEach(p => { p.preInfectionRole = null; });
    online.paused = false;
    online.lastPackets = {};
    online.finalResult = null;
    online.phase = "lobby";
    online.voteResult = null;
    online.lifelineState = null;
    logMission("crew assigned", null, {text: game.players.map(p => `${p.name}: ${roleData(p.role).name}`).join("; ")});
}

function logMission(kind, actor, details = {}) {
    if (game.mode === "online" && !online.isHost) return;
    (game.timeline ||= []).push({round: game.round, stage: game.stage, kind, actor, ...JSON.parse(JSON.stringify(details))});
}

function isVoteSilenced(player) {
    return (game.silencedUntil[player.id] || 0) > game.round || game.commSilenced.has(player.id);
}

function addCommunicationsSilence() {
    if (game.commSilenceRound === game.round) return;
    game.commSilenceRound = game.round;
    const eligible = living().filter(p => !game.commSilenced.has(p.id));
    if (!eligible.length) return;
    const player = rand(eligible);
    game.commSilenced.add(player.id);
    logMission("communications", null, {target: player.id, text: "Communications outage removed this player's vote until the system was repaired."});
}

function beginMissionRound() {
    if (game.eventRound === game.round) return;
    game.eventRound = game.round;
    game.repairChallenges = {};
    logMission("round begins", null, {text: `Flight stage ${game.stage}.`});
    game.shipEvent = null;
    if (game.round > 1 && Math.random() < 0.35) {
        const events = ["debris", "surge", "distress"];
        const event = rand(events);
        if (event === "debris") {
            const system = rand(Object.keys(game.systems).filter(s => game.systems[s]));
            if (system) {
                game.systems[system] = false;
                game.sabotagedAt[system] = game.round;
                if (system === "o2") game.o2RoundsRemaining = 3;
                game.shipEvent = `MICROMETEOR IMPACT: ${system.toUpperCase()} is offline. Repair becomes available next round.`;
            } else game.shipEvent = "DEBRIS FIELD: The hull shook, but no additional system was damaged.";
        } else if (event === "surge") {
            // A one-round backup supply is public; nobody's role is disclosed.
            living().forEach(p => game.backupPowered.add(p.id));
            game.shipEvent = "EMERGENCY BATTERIES: Every crew member has backup power for this round. Blocks still apply.";
        } else {
            game.shipEvent = "UNIDENTIFIED SIGNAL: An external transmission triggered the ship's alarms. It proves nothing about the crew.";
        }
        game.lastRoundResults.push(game.shipEvent);
        logMission("ship event", null, {text: game.shipEvent});
    }
    if (!game.systems.communications) addCommunicationsSilence();
    announceShipEvent(game.shipEvent, game.round);
}

function announceShipEvent(message, round, broadcast = true) {
    const banner = $("shipEventAnnouncement");
    if (banner) {
        banner.hidden = !message;
        banner.textContent = message ? `PUBLIC SHIP EVENT · ROUND ${round} — ${message}` : "";
    }
    if (broadcast && game.mode === "online" && online.isHost) onlineBroadcast({type: "ship_event", message, round});
}

function beginOpeningVote() {
    if (game.mode === "online") return; // Online roles are delivered by the host before this point.
    prepareInitialRoles();
    game.abilityQueue = game.players.map(p => p.id);
    game.abilityIndex = 0;
    passToAbility();
}

function prepareInitialRoles() {
    game.openingVote = true;
    game.initialRoleReveal = true;
    game.roleRevealId = `roles:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    game.rolesPending = new Set(game.players.map(p => p.id));
    online.phase = "role_reveal";
    logMission("roles revealed", null, {text: "Private role distribution before the opening discussion and vote."});
}

function finishInitialRoles() {
    if (!game.initialRoleReveal || game.rolesPending.size) return;
    game.initialRoleReveal = false;
    $("showActionButton").textContent = "CONTINUE TO ABILITY";
    $("showActionButton").onclick = showAction;
    game.lastRoundResults = ["Everyone has received their role. Discuss the crew, then take the opening vote."];
    if (game.mode === "online") hostBroadcastDiscussion();
    else showDiscussion();
    saveOnlineSession();
}

function acknowledgeLocalRole() {
    const player = getPlayer(game.abilityQueue[game.abilityIndex]);
    if (!player || !game.rolesPending.has(player.id)) return;
    game.rolesPending.delete(player.id);
    game.abilityIndex++;
    if (game.rolesPending.size) passToAbility();
    else finishInitialRoles();
}

function acknowledgeOnlineRole(player, revealId) {
    if (online.paused || !game.initialRoleReveal || revealId !== game.roleRevealId || !game.rolesPending.has(player.id)) return;
    game.rolesPending.delete(player.id);
    saveOnlineSession();
    finishInitialRoles();
}

function initialRolePacket(player) {
    return {type: "private_role", playerId: player.id, role: player.role, originalRole: player.originalRole, round: game.round, roleRevealId: game.roleRevealId, objectiveProgress: objectiveProgress(player), allies: isHostile(player) ? living().filter(p => p.id !== player.id && isHostile(p)).map(p => ({id: p.id, name: p.name})) : []};
}

function continueAfterOpeningVote() {
    if (!game.openingVote || game.gameOver) return false;
    game.openingVote = false;
    game.lastRoundResults = [];
    startRound();
    return true;
}

function renderVoteRole(player) {
    const panel = $("voteRoleGuide");
    if (!panel || !player) return;
    panel.open = false;
    const role = roleData(player.role);
    const allies = role.team === "Hostile" ? game.mode === "online" && !online.isHost ? online.allies || [] : living().filter(p => p.id !== player.id && isHostile(p)) : [];
    const progress = objectiveProgress(player);
    panel.innerHTML = `<summary>Your role — view privately</summary><strong>${esc(role.icon + " " + role.name + " · " + role.team)}</strong><p>${esc(role.desc)}</p>${allies.length ? `<p>Hostile allies: ${allies.map(p => esc(p.name)).join(", ")}</p>` : ""}${progress ? `<p>${esc(progress.text)}</p>` : ""}`;
}

function resolveAllClear() {
    const eligible = living().filter(p => !isVoteSilenced(p));
    const count = eligible.filter(p => game.votes[p.id] === "allclear").length;
    if (!eligible.length || count <= eligible.length / 2) return false;
    logMission("all clear", null, {text: `${count} of ${eligible.length} eligible voters declared all clear.`});
    const hostiles = living().filter(isHostile);
    const neutrals = living().filter(p => isNeutral(p) && p.role !== "jester");
    if (hostiles.length) endGame("HOSTILE VICTORY", "The crew declared all clear while at least one Hostile remained. Hostiles take priority.");
    else if (neutrals.length) endGame("NEUTRAL VICTORY", "The crew declared all clear while at least one non-Jester Neutral remained.");
    else endGame("HUMAN VICTORY", "The crew correctly declared all clear. No Hostile or non-Jester Neutral remained.");
    return true;
}

function objectiveProgress(player) {
    if (player.role === "bountyhunter") return {title: "Bounty contract", text: player.bountyTarget ? `Target: ${realName(player.bountyTarget)}. ${player.bountyFailed ? "Failed: target died without a vote ejection." : "Stay alive and have your target voted out."}` : game.round === 1 ? "Choose your permanent target this round." : "Failed: no target was marked in round 1."};
    if (player.role === "oracle") return {title: "Oracle predictions", text: `${player.oracleCorrect || 0} / 3 correct. Player ejection: ${player.oraclePlayerCorrect ? "completed" : "required"}.${player.lastOracleResult ? ` ${player.lastOracleResult.message}` : ""}`};
    if (player.role === "trickster") return {title: "Identity swap", text: player.tricksterUsed ? "Your one swap has been used." : "One swap available. Survive to Earth for a Neutral win."};
    if (player.role === "parasite") return {title: "Parasite objective", text: `${player.hasInfected ? "Infection used" : "One infection available"}. Survive to Earth for a Neutral win.`};
    if (player.role === "king") return {title: "Survivor King", text: `${living().length} players remain. Be one of the final two.`};
    if (player.role === "jester") return {title: "Jester objective", text: "Get voted out. Reaching the final two awards the other player's team the win."};
    return null;
}

function renderObjectiveProgress(player) {
    const progress = game.mode === "online" && !online.isHost && online.objectiveProgress ? online.objectiveProgress : objectiveProgress(player);
    for (const id of ["objectiveProgress", "actionObjectiveProgress"]) {
        const panel = $(id);
        if (!panel) continue;
        panel.hidden = !progress;
        panel.innerHTML = progress ? `<strong>${esc(progress.title)}</strong><p>${esc(progress.text)}</p>` : "";
    }
}

function renderMissionTimeline() {
    const panel = $("missionTimeline");
    if (!panel) return;
    panel.innerHTML = (game.timeline || []).map(entry => {
        const actor = entry.actor ? `${realName(entry.actor)} · ` : "";
        const target = entry.target ? ` → ${["skip", "allclear"].includes(entry.target) ? entry.target : realName(entry.target)}` : "";
        const extra = entry.text || [entry.type, entry.system, entry.mode, entry.a && realName(entry.a), entry.b && realName(entry.b)].filter(Boolean).join(" · ");
        return `<article class="timeline-entry"><small>ROUND ${entry.round} / STAGE ${entry.stage}</small><strong>${esc(actor + entry.kind + target)}</strong><p>${esc(extra)}</p></article>`;
    }).join("") || "No mission entries recorded.";
}

function getRepairTask(player, system) {
    const tasks = game.repairChallenges[player.id] ||= {};
    if (tasks[system]?.round === game.round) return tasks[system];
    const values = system === "power" ? shuffle(["RED / A", "BLUE / B", "GREEN / C"]) : system === "engines" ? Array.from({length: 3}, () => 1 + Math.floor(Math.random() * 5)) : system === "o2" ? [21, 79] : shuffle([1, 2, 3, 4]);
    return tasks[system] = {id: `${game.round}:${player.id}:${system}:${Math.random().toString(36).slice(2)}`, round: game.round, system, values};
}

function prepareRepairTasks(player) {
    Object.keys(game.systems).filter(canRepairSystem).forEach(system => getRepairTask(player, system));
    return game.repairChallenges[player.id] || {};
}

function validRepairTask(player, action) {
    const task = game.repairChallenges[player.id]?.[action.system];
    return !!task && task.round === game.round && task.id === action.taskId && Array.isArray(action.repairProof) && JSON.stringify(task.values) === JSON.stringify(action.repairProof);
}

function renderRepairTask(player, system) {
    const task = getRepairTask(player, system);
    game.selectedAction = null;
    $("confirmActionButton").disabled = true;
    const finish = proof => {
        game.selectedAction = {type: "repair", system, taskId: task.id, repairProof: proof};
        $("confirmActionButton").disabled = false;
        $("repairTaskStatus").textContent = "Task complete. Confirm to repair the system.";
    };
    const title = {power: "Connect matching wires", engines: "Calibrate the three thrusters", o2: "Balance the air mixture", communications: "Rebuild the beacon signal"}[system];
    $("actionDescription").textContent = `${system.toUpperCase()} REPAIR — ${title}`;
    $("actionOptions").innerHTML = '<div id="repairTask" class="repair-task"></div><p id="repairTaskStatus" aria-live="polite"></p>';
    if (system === "power" || system === "communications") {
        let proof = [];
        const render = () => {
            const options = system === "power" ? ["RED / A", "BLUE / B", "GREEN / C"] : [1, 2, 3, 4];
            $("repairTask").innerHTML = `<p>${system === "power" ? `Wire ${proof.length + 1}: connect ${esc(task.values[proof.length])} to its terminal.` : `Transmit sequence: ${task.values.join(" → ")}. ${proof.length} / 4 tones entered.`}</p><div class="choice-grid">${options.map(value => button(esc(value), value)).join("")}</div>`;
            $("repairTask").querySelectorAll("button").forEach(btn => btn.onclick = () => {
                const value = system === "power" ? btn.dataset.value : Number(btn.dataset.value);
                if (value !== task.values[proof.length]) { proof = []; $("repairTaskStatus").textContent = "Mismatch. Start the connection sequence again."; render(); return; }
                proof.push(value);
                if (proof.length === task.values.length) { $("repairTask").innerHTML = '<p>✓ Circuit connected.</p>'; finish(proof); }
                else render();
            });
        };
        render();
    } else {
        const labels = system === "engines" ? ["Port thruster", "Centre thruster", "Starboard thruster"] : ["Oxygen %", "Nitrogen %"];
        $("repairTask").innerHTML = `<p>${system === "engines" ? "Match each thruster to its requested output." : "Set breathable air to 21% oxygen and 79% nitrogen."}</p>${labels.map((label, i) => `<label>${label} · target ${task.values[i]}<input type="range" min="0" max="${system === "engines" ? 5 : 100}" value="0" data-dial="${i}"><output id="repairDial${i}">0</output></label>`).join("")}`;
        const dials = [...$("repairTask").querySelectorAll("input")];
        dials.forEach(dial => dial.oninput = () => {
            $("repairDial" + dial.dataset.dial).textContent = dial.value;
            const proof = dials.map(d => Number(d.value));
            if (JSON.stringify(proof) === JSON.stringify(task.values)) finish(proof);
            else { game.selectedAction = null; $("confirmActionButton").disabled = true; $("repairTaskStatus").textContent = "Adjust every dial to its target."; }
        });
    }
}

// Additional truthful clues. The original pool retains the established two/three-name clue.
const basicRadioMessage = randomRadioMessage;
randomRadioMessage = function () {
    const clues = [basicRadioMessage()];
    const safe = living().filter(p => !isHostile(p));
    if (safe.length >= 2) clues.push(`EARTH: Neither ${shuffle(safe).slice(0, 2).map(p => displayName(p.id)).join(" nor ")} is Hostile.`);
    const hostileActs = living().filter(p => isHostile(p) && game.actions[p.id] && game.actions[p.id].type !== "none");
    if (hostileActs.length) clues.push("EARTH: At least one living Hostile has already submitted an ability this round.");
    return rand(clues);
};

function clearOnlineSession() {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.removeItem("alien-room");
    sessionStorage.removeItem("alien-host-state");
}

function savedRoom() {
    try { return typeof sessionStorage === "undefined" ? null : JSON.parse(sessionStorage.getItem("alien-room")); } catch { return null; }
}

function savedConnectionId(room) {
    const entered = $("onlineRecoveryCode")?.value?.trim();
    if (entered && /^[a-zA-Z0-9-]{20,64}$/.test(entered)) return entered;
    const saved = savedRoom();
    return saved?.roomCode === room && !saved.isHost ? saved.connectionId : null;
}

function saveOnlineSession() {
    if (!online.connected || !online.roomCode || typeof sessionStorage === "undefined") return;
    sessionStorage.setItem("alien-room", JSON.stringify({roomCode: online.roomCode, connectionId: online.connectionId, playerId: online.playerId, name: online.name, isHost: online.isHost}));
    if (online.isHost) {
        const serialize = (_key, value) => value instanceof Set ? {missionSet: [...value]} : value;
        sessionStorage.setItem("alien-host-state", JSON.stringify({game, setupMode, roundComposition, settings, online: {players: online.players, started: online.started, paused: online.paused, activeTurn: online.activeTurn, turnSequence: online.turnSequence, lastPackets: online.lastPackets, phase: online.phase, publicPhase: online.publicPhase, finalResult: online.finalResult, voteResult: online.voteResult, lifelineState: online.lifelineState, captainTargets: online.captainTargets}}, serialize));
    }
    renderRecoveryControls();
}

function ensureRecoveryUI() {
    if ($("recoveryControls")) return;
    const panel = document.createElement("aside");
    panel.id = "recoveryControls";
    panel.className = "recovery-controls";
    panel.innerHTML = '<div id="recoveryStatus" aria-live="polite"></div><div class="choice-grid"><button id="reconnectMission" type="button">RECONNECT / RESTORE</button><button id="copyRecoveryCode" type="button">COPY PRIVATE RECOVERY CODE</button><button id="pauseMission" type="button">PAUSE GAME</button><button id="skipAbsentTurn" type="button">SKIP ABSENT PLAYER</button></div>';
    $("app").prepend(panel);
    const label = document.createElement("label");
    label.className = "mode-note";
    label.innerHTML = 'Returning from another tab? Enter your private recovery code before joining.<input id="onlineRecoveryCode" type="text" autocomplete="off" placeholder="PRIVATE RECOVERY CODE (OPTIONAL)">';
    $("onlineControls").append(label);
    $("copyRecoveryCode").onclick = async () => {
        try { await navigator.clipboard.writeText(online.connectionId); $("recoveryStatus").textContent = "Recovery code copied. Keep it private; use it with the room code to restore your player."; }
        catch { $("recoveryStatus").textContent = `Private recovery code: ${online.connectionId}`; }
    };
    $("reconnectMission").onclick = reconnectMission;
    $("pauseMission").onclick = () => {
        online.paused = !online.paused;
        logMission("host control", online.playerId, {text: online.paused ? "Paused the game." : "Resumed the game."});
        onlineBroadcast({type: "public_pause", paused: online.paused});
        if (!online.paused) sendRecoveryState(online.playerId);
        renderRecoveryControls();
    };
    $("skipAbsentTurn").onclick = skipAbsentTurn;
}

function renderRecoveryControls() {
    const panel = $("recoveryControls");
    if (!panel) return;
    panel.hidden = !online.connected && !savedRoom();
    const roster = Object.values(online.players || {});
    $("recoveryStatus").textContent = online.connected ? `ROOM ${online.roomCode} · ${online.paused ? "PAUSED" : "CONNECTED"}${roster.length ? " · " + roster.map(p => `${p.name}: ${p.connected ? "online" : "disconnected"}`).join(" / ") : ""}` : "A saved room is available. Reconnect to restore your role and progress.";
    $("pauseMission").hidden = !online.isHost || !online.started || game.gameOver;
    $("pauseMission").textContent = online.paused ? "RESUME GAME" : "PAUSE GAME";
    const current = online.activeTurn && connectionForPlayer(online.activeTurn.playerId);
    $("skipAbsentTurn").hidden = !online.isHost || !online.started || !current || current.connected || game.gameOver;
    $("reconnectMission").hidden = online.isHost && online.connected;
    $("copyRecoveryCode").hidden = !online.connected || online.isHost;
}

function updateOnlinePresence() {
    if (!online.channel) return;
    const state = online.channel.presenceState();
    const present = new Set(Object.keys(state));
    const playerIds = new Set(Object.values(state).flat().map(p => p.playerId).filter(Boolean));
    for (const player of Object.values(online.players)) player.connected = online.isHost ? present.has(player.connectionId) : playerIds.has(player.playerId);
    if (online.isHost) broadcastRoomState();
    updateOnlinePlayersUI();
    saveOnlineSession();
}

async function sendRecoveryState(playerId) {
    const player = getPlayer(playerId);
    if (!player) return;
    const packet = online.lastPackets?.[playerId];
    const active = game.initialRoleReveal && game.rolesPending.has(playerId) ? initialRolePacket(player) : online.activeTurn?.playerId === playerId && packet?.turnId === online.activeTurn.id ? packet : null;
    await sendPrivate(connectionForPlayer(playerId).connectionId, {type: "private_sync", started: online.started, round: game.round, stage: game.stage, shipEvent: game.shipEvent, systems: game.systems, o2RoundsRemaining: game.o2RoundsRemaining, roster: game.players.map(p => ({id: p.id, name: p.name, alive: p.alive})), role: player.role, originalRole: player.originalRole, objectiveProgress: objectiveProgress(player), phase: online.phase, paused: online.paused, prompt: active, gameOver: game.gameOver, finalResult: online.finalResult, voteResult: online.voteResult, lifelineState: online.lifelineState, timeline: game.gameOver ? game.timeline : undefined, results: game.lastRoundResults});
}

function renderRecoveredSystems() {
    $("systemsRound").textContent = `ROUND ${game.round}`;
    $("systemsStage").textContent = `STAGE ${game.stage} / 10`;
    $("systemsList").innerHTML = Object.entries(game.systems).map(([name, enabled]) => `<div>${enabled ? "🟢" : "🔴"} ${esc(name.toUpperCase())} — ${enabled ? "ONLINE" : "OFFLINE"}</div>`).join("");
    $("nextRoundButton").hidden = !online.isHost;
    $("nextRoundButton").onclick = () => { if (online.paused) return; game.round++; game.lastRoundResults = []; startRound(); };
    setScreen("systemsScreen");
}

function applyRecoveryState(data) {
    announceShipEvent(data.shipEvent, data.round, false);
    if (!online.isHost) {
        game.players = data.roster.map(p => ({...p, role: "survivor", originalRole: "survivor", infectionRound: null}));
        game.round = data.round; game.stage = data.stage; game.systems = data.systems; game.o2RoundsRemaining = data.o2RoundsRemaining;
        const player = getPlayer(online.playerId);
        if (player) { player.role = data.role; player.originalRole = data.originalRole; }
        online.objectiveProgress = data.objectiveProgress;
        game.gameOver = !!data.gameOver;
    }
    online.paused = data.paused;
    online.started = data.started;
    if (data.gameOver) { game.timeline = data.timeline || []; endGame(data.finalResult.title, data.finalResult.message); }
    else if (data.paused) onlineShowWaiting("The host paused the game.");
    else if (data.prompt) receivePrivateGameData(data.prompt);
    else if (data.phase === "discussion") onlineShowDiscussion({round: game.round, stage: game.stage, results: data.results});
    else if (data.phase === "systems") renderRecoveredSystems();
    else if (data.phase === "vote_result" && data.voteResult) {
        onlineShowPrivateResult(data.voteResult);
        if (online.isHost) $("afterVoteButton").onclick = () => { if (!online.paused) afterVoting(); };
    }
    else if (data.phase === "lifeline" && online.isHost && data.lifelineState) {
        $("lifelineTitle").textContent = data.lifelineState.title;
        $("lifelineMessage").textContent = data.lifelineState.message;
        $("lifelineContinue").onclick = () => { if (!online.paused) proceedToSystems(); };
        setScreen("lifelineScreen");
    }
    else if (!online.started) setScreen("setupScreen");
    else onlineShowWaiting("Reconnected. Your role and progress are restored. Waiting for your turn…");
    renderRecoveryControls();
}

async function reconnectMission() {
    const saved = savedRoom();
    if (!saved) return;
    try {
        await loadSupabase();
        const hostState = saved.isHost && JSON.parse(sessionStorage.getItem("alien-host-state"), (_key, value) => value?.missionSet ? new Set(value.missionSet) : value);
        onlineDisconnect(false);
        Object.assign(online, saved, {connected: true, players: {}});
        game.mode = "online";
        if (hostState) {
            Object.assign(game, hostState.game); Object.assign(online, hostState.online);
            setupMode = hostState.setupMode || "random";
            roundComposition = hostState.roundComposition || "mixed";
            if (hostState.settings) settings = hostState.settings;
            $("assignmentMode").value = setupMode; $("roundComposition").value = roundComposition;
            $("roundComposition").disabled = setupMode === "manual";
        }
        await subscribePublicRoom();
        if (saved.isHost) {
            for (const player of Object.values(online.players).filter(p => !p.host)) online.hostPrivateChannels[player.connectionId] = await createPrivateChannel(player.connectionId);
            broadcastRoomState();
            await sendRecoveryState(online.playerId);
        } else {
            await createClientPrivateChannel();
            onlineBroadcast({type: "join_request", connectionId: online.connectionId, name: online.name});
            online.started = true;
            onlineShowWaiting("Reconnecting to the host…");
        }
    } catch (error) { updateOnlineStatus(error.message); $("recoveryStatus").textContent = `Reconnect failed: ${error.message}`; }
}

function skipAbsentTurn() {
    const turn = online.activeTurn;
    const player = turn && getPlayer(turn.playerId);
    const connection = player && connectionForPlayer(player.id);
    if (!online.isHost || !player || connection.connected) return;
    logMission("host control", online.playerId, {target: player.id, text: "Skipped disconnected player's turn."});
    const paused = online.paused;
    if (turn.type === "private_action") hostReceiveAbility(player, {type: "none"});
    else if (turn.type === "private_reaction") hostReceiveReactionReady(player);
    else if (turn.type === "private_vote") hostReceiveVote(player, "skip");
    else if (turn.type === "private_judge") hostReceiveJudgeChoice(player, false);
    else if (turn.type === "private_captain") { online.activeTurn = null; completeEjection(null, false); }
    online.paused = paused;
    saveOnlineSession();
}

resetMission();
const missionRosterUI = updateOnlinePlayersUI;
updateOnlinePlayersUI = function () { missionRosterUI(); renderRecoveryControls(); };
