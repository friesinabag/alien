"use strict";

// Public briefings carry no timeline, roles, actor IDs or private results.
function publicBriefingData(phase = "briefing") {
    return {type:"public_phase", phase, round:game.round, stage:game.stage, opening:!!game.openingVote,
        systems:{...game.systems}, o2RoundsRemaining:game.o2RoundsRemaining, rules:missionRules(),
        results:[...game.lastRoundResults], displaySwap:game.displaySwap,
        players:game.players.map(p=>({id:p.id,name:p.name,alive:p.alive})),
        silences:living().filter(isVoteSilenced).map(p=>displayName(p.id))};
}

function renderRoundBriefing(data) {
    game.lastBriefing = JSON.parse(JSON.stringify(data));
    $("briefingMeta").textContent = `${data.opening ? "OPENING VOTE" : "ROUND " + data.round} · FLIGHT STAGE ${data.stage} / 10`;
    $("briefingSystems").innerHTML = Object.entries(data.systems || {}).map(([system,on])=>`<div class="briefing-system ${on ? "online" : "offline"}"><span>${on ? "●" : "!"}</span><strong>${esc(system.toUpperCase())}</strong><small>${on ? "ONLINE" : "OFFLINE"}</small></div>`).join("");
    const messages = [...(data.results || [])];
    if (data.systems?.o2 === false) messages.unshift(`OXYGEN WARNING: ${data.o2RoundsRemaining} rounds of air remain.`);
    if (!messages.length) messages.push("No public incidents reported. All crew may discuss before voting.");
    $("briefingAlerts").innerHTML = messages.map(text=>`<article class="briefing-card ${/EARTH/.test(text)?"earth-card":/SABOTAGE|WARNING|died|eliminated/i.test(text)?"alert-card":""}"><small>${/EARTH/.test(text)?"EARTH TRANSMISSION":"PUBLIC REPORT"}</small><p>${esc(text)}</p></article>`).join("");
    $("briefingSilences").textContent = data.silences?.length ? `${data.silences.join(", ")} cannot vote. They can still discuss and use their abilities.` : "All living crew members can vote.";
    const host = game.mode !== "online" || online.isHost;
    $("beginDiscussionButton").hidden = !host;
    $("beginDiscussionButton").onclick = () => { if (!online.paused) beginBriefedDiscussion(); };
    $("briefingWaiting").textContent = host ? "Read the reports together, then begin discussion." : "Waiting for the host to begin discussion.";
    publishAtmosphere(data.systems);
    setScreen("briefingScreen");
}

function beginBriefedDiscussion() {
    if (game.mode === "online" && !online.isHost) return;
    const data = {...(game.lastBriefing || publicBriefingData()), phase:"discussion"};
    data.discussionEndsAt = missionRules().discussionSeconds ? Date.now() + missionRules().discussionSeconds * 1000 : null;
    if (game.mode === "online") { online.phase = "discussion"; online.publicPhase = data; onlineBroadcast(data); }
    renderBriefedDiscussion(data);
    saveOnlineSession();
}

const discussionBeforeEnhancements = showDiscussion;
showDiscussion = function () {
    preparePublicBriefing();
    const data = publicBriefingData();
    logMission("public briefing",null,{text:data.results.join(" · ") || "No public incidents."});
    renderRoundBriefing(data);
};
hostBroadcastDiscussion = function () {
    preparePublicBriefing();
    const data = publicBriefingData();
    logMission("public briefing",null,{text:data.results.join(" · ") || "No public incidents."});
    online.phase = "briefing";
    online.publicPhase = data;
    onlineBroadcast(data);
    renderRoundBriefing(data);
    saveOnlineSession();
};
const onlineDiscussionBeforeEnhancements = onlineShowDiscussion;
function renderBriefedDiscussion(data) {
    if (game.mode === "online") onlineDiscussionBeforeEnhancements(data);
    else discussionBeforeEnhancements();
    publishAtmosphere(data.systems);
    startDiscussionClock(data.discussionEndsAt);
}
onlineShowDiscussion = function (data) { if (data.phase === "briefing") renderRoundBriefing(data); else renderBriefedDiscussion(data); };
const publicPhaseBeforeEnhancements = handleOnlinePublicPhase;
handleOnlinePublicPhase = function (data) {
    if (data.phase === "briefing" && !online.isHost) {
        handleOnlinePublicUpdate(data); game.displaySwap = data.displaySwap || null;
        if (data.o2RoundsRemaining != null) game.o2RoundsRemaining = data.o2RoundsRemaining;
        online.phase = "briefing"; online.publicPhase = data; renderRoundBriefing(data); return;
    }
    if (data.systems) publishAtmosphere(data.systems);
    publicPhaseBeforeEnhancements(data);
};
const recoveryBeforeEnhancements = applyRecoveryState;
applyRecoveryState = function (data) {
    if (data.rules) game.rules = normalizeMissionRules(data.rules);
    recoveryBeforeEnhancements(data);
    if (data.gameOver || data.paused || data.prompt) return;
    if (data.phase === "briefing") renderRoundBriefing(data.publicPhase || data);
    if (data.phase === "discussion") renderBriefedDiscussion(data.publicPhase || data);
};

let discussionClockTimer = null;
function stopDiscussionClock() { if (discussionClockTimer !== null) clearInterval(discussionClockTimer); discussionClockTimer = null; }
function startDiscussionClock(end) {
    stopDiscussionClock();
    let node = $("discussionClock");
    if (!node) { node = document.createElement("p"); node.id = "discussionClock"; node.className = "discussion-clock"; $("roundResults").before(node); }
    node.hidden = !end;
    if (!end) return;
    let last = Date.now();
    const tick = () => {
        const now = Date.now();
        if (online.paused) end += now - last;
        last = now;
        if (online.isHost && online.publicPhase?.phase === "discussion") online.publicPhase.discussionEndsAt = end;
        const seconds = Math.max(0,Math.ceil((end-now)/1000));
        node.textContent = online.paused ? "DISCUSSION PAUSED" : seconds ? `DISCUSSION · ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")} REMAINING` : "TIME’S UP · Finish your thoughts and start voting.";
        if (!seconds) stopDiscussionClock();
    };
    discussionClockTimer = setInterval(tick,500); tick();
}

function renderHostRules() {
    const panel = $("hostRuleFields"); if (!panel) return;
    const rules = normalizeMissionRules(settings.rules);
    const fields = [["powerSeconds","Power repair · seconds",5,60],["o2Seconds","O₂ repair · seconds",5,60],["communicationsSeconds","Communications repair · seconds",5,60],["engineSafeMistakes","Engine safe mistakes",1,5],["discussionSeconds","Discussion countdown · seconds (0 = unlimited)",0,600],["eventChance","Ship events · chance per round (%)",0,100]];
    panel.innerHTML = fields.map(([key,label,min,max])=>`<label>${label}<input type="number" inputmode="numeric" min="${min}" max="${max}" step="1" value="${rules[key]}" data-mission-rule="${key}"></label>`).join("") + `<label>After the final wrong engine submission<select data-mission-rule="engineFatal"><option value="true" ${rules.engineFatal?"selected":""}>Fatal overload · Engineer dies</option><option value="false" ${!rules.engineFatal?"selected":""}>Safety lock · repair fails, Engineer survives</option></select></label>`;
    panel.querySelectorAll("[data-mission-rule]").forEach(input=>input.onchange = () => {
        if (game.mode === "online" && !online.isHost) return;
        const key = input.dataset.missionRule;
        settings.rules = normalizeMissionRules({...normalizeMissionRules(settings.rules),[key]:key === "engineFatal" ? input.value === "true" : Number(input.value)});
        renderHostRules(); $("hostRulesStatus").textContent = "Rules updated for the next mission. Save a preset to keep them.";
    });
    $("resetHostRules").onclick = () => { if(game.mode === "online" && !online.isHost)return; settings.rules = {...DEFAULT_MISSION_RULES}; renderHostRules(); $("hostRulesStatus").textContent = "Standard rules restored for the next mission."; };
}

// Only public state can drive sound or effects, even on the host's private turns.
// The locally hosted recording is decoded once; screen changes never restart the loop.
const missionFX = {sound:false,motion:false,volume:20,systems:{power:true,o2:true,engines:true,communications:true},screen:'setupScreen',audio:null,source:null,output:null,filter:null,buffer:null,loading:null,request:0,error:false};
function publishAtmosphere(systems) { if (systems) missionFX.systems = {...systems}; refreshAtmosphere(); }
function atmosphereActive() {return !['setupScreen','gameOverScreen','replayScreen'].includes(missionFX.screen) && !game.gameOver && !document.hidden && missionFX.sound && missionFX.volume>0;}
function silenceAtmosphere() {
    missionFX.request++;
    if(missionFX.source){try{missionFX.source.stop();}catch{}missionFX.source.disconnect();missionFX.source=null;}
    if(missionFX.output){missionFX.output.disconnect();missionFX.output=null;}
    if(missionFX.filter){missionFX.filter.disconnect();missionFX.filter=null;}
    if(missionFX.audio?.state === 'running')missionFX.audio.suspend().catch(()=>{});
}
function softenLoop(ctx,decoded) {
    // Blend the original tail into its head to mask MP3 boundaries without a silent gap.
    const overlap=Math.min(Math.floor(decoded.sampleRate*.15),Math.floor(decoded.length/8));
    if(overlap<2)return decoded;
    const loop=ctx.createBuffer(decoded.numberOfChannels,decoded.length-overlap,decoded.sampleRate);
    for(let channel=0;channel<decoded.numberOfChannels;channel++) {
        const input=decoded.getChannelData(channel),output=loop.getChannelData(channel),body=decoded.length-2*overlap;
        output.set(input.subarray(overlap,decoded.length-overlap));
        for(let i=0;i<overlap;i++){const blend=i/(overlap-1);output[body+i]=input[decoded.length-overlap+i]*(1-blend)+input[i]*blend;}
    }
    return loop;
}
function loadShipAmbience() {
    if(missionFX.buffer)return Promise.resolve(missionFX.buffer);
    if(missionFX.loading)return missionFX.loading;
    const ctx=missionFX.audio;
    missionFX.loading=fetch('ship-ambience.mp3').then(response=>{
        if(!response.ok)throw new Error('Ship ambience could not be loaded.');
        return response.arrayBuffer();
    }).then(bytes=>ctx.decodeAudioData(bytes)).then(decoded=>{
        missionFX.buffer=softenLoop(ctx,decoded);missionFX.error=false;return missionFX.buffer;
    }).finally(()=>{missionFX.loading=null;});
    return missionFX.loading;
}
function updateAmbienceLevel() {
    if(!missionFX.output)return;
    const ctx=missionFX.audio,engineLevel=missionFX.systems.engines?1:.65;
    missionFX.output.gain.setTargetAtTime(missionFX.volume/100*.55*engineLevel,ctx.currentTime,.25);
    missionFX.filter.frequency.setTargetAtTime(missionFX.systems.engines?2400:900,ctx.currentTime,.4);
}
function updateAtmosphereSummary() {
    const summary=$('atmosphereSummary');if(!summary)return;
    summary.textContent=!missionFX.sound?'Sound off':missionFX.error?'Audio unavailable':missionFX.loading?'Loading ambience…':'Sound on';
}
function refreshAtmosphere() {
    const active=!['setupScreen','gameOverScreen','replayScreen'].includes(missionFX.screen)&&!game.gameOver;
    document.body?.classList.toggle('ship-motion',missionFX.motion&&active);
    document.body?.classList.toggle('ship-blackout',active&&!missionFX.systems.power);
    document.body?.classList.toggle('ship-low-air',active&&!missionFX.systems.o2);
    updateAtmosphereSummary();
    if(!atmosphereActive()){silenceAtmosphere();return;}
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){missionFX.error=true;updateAtmosphereSummary();return;}
    try {
        if(!missionFX.audio || missionFX.audio.state==='closed')missionFX.audio=new Audio();const ctx=missionFX.audio;
        // Called directly on a touch/change gesture as well as public phase changes.
        ctx.resume().catch(()=>{});
        if(missionFX.source){updateAmbienceLevel();return;}
        const request=++missionFX.request;
        const loading=loadShipAmbience();updateAtmosphereSummary();
        loading.then(buffer=>{
            if(request!==missionFX.request||!atmosphereActive())return;
            const gain=ctx.createGain(),filter=ctx.createBiquadFilter(),source=ctx.createBufferSource();
            gain.gain.setValueAtTime(0,ctx.currentTime);filter.type='lowpass';
            source.buffer=buffer;source.loop=true;source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
            missionFX.source=source;missionFX.filter=filter;missionFX.output=gain;
            updateAmbienceLevel();source.start();updateAtmosphereSummary();
        }).catch(()=>{
            if(request!==missionFX.request)return;
            silenceAtmosphere();missionFX.error=true;updateAtmosphereSummary();
        });
    }catch{silenceAtmosphere();missionFX.error=true;updateAtmosphereSummary();}
}
function initAtmosphere() {
    const controls=document.querySelector('.atmosphere-controls');
    if(controls)document.querySelector('.masthead')?.after(controls);
    try{const saved=JSON.parse(localStorage.getItem('alien-atmosphere')||'{}');missionFX.sound=saved.sound===true;missionFX.motion=saved.motion===true;missionFX.volume=Number.isFinite(saved.volume)?Math.max(0,Math.min(100,saved.volume)):20;}catch{}
    $('atmosphereSound').checked=missionFX.sound;$('atmosphereMotion').checked=missionFX.motion;$('atmosphereVolume').value=missionFX.volume;
    const update=()=>{
        missionFX.sound=$('atmosphereSound').checked;missionFX.motion=$('atmosphereMotion').checked;missionFX.volume=Number($('atmosphereVolume').value);
        try{localStorage.setItem('alien-atmosphere',JSON.stringify({sound:missionFX.sound,motion:missionFX.motion,volume:missionFX.volume}));}catch{}
        refreshAtmosphere();
    };
    $('atmosphereSound').onchange=update;$('atmosphereMotion').onchange=update;$('atmosphereVolume').oninput=update;
    document.addEventListener('pointerdown',()=>{if(missionFX.sound&&(!missionFX.audio||missionFX.audio.state!=='running'))refreshAtmosphere();},{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseMissionReplay();refreshAtmosphere();});
    window.addEventListener?.('pagehide',()=>{silenceAtmosphere();pauseMissionReplay();});refreshAtmosphere();
}

// Record resolved actions for the post-game reveal; private snapshots never enter public packets.
function replayActionText(actor, action) {
    const names = {none:"passed",kill:"attempted an attack",sabotage:"sabotaged a system",repair:"repaired a system",repairAccident:"suffered a fatal engine overload",protect:"provided protection",block:"blocked an ability",silence:"silenced a player",infect:"infected a player",radio:"requested an Earth transmission",investigate:"investigated a player",science:"used a science ability",predict:"sealed an Oracle prediction",bounty:"marked a bounty",swap:"swapped identities",harden:"scheduled next-round system hardening",captain_eject:"ordered a private night ejection",pardon:"armed a vote pardon",analyse:"selected a player to analyse"};
    const target = action.target ? ` → ${["skip","allclear"].includes(action.target) ? action.target : realName(action.target)}` : "";
    return `${realName(actor)} ${names[action.type] || action.type}${action.system ? " · " + action.system.toUpperCase() : ""}${target}${action.mode ? " · " + action.mode : ""}.`;
}
const immediateBeforeEnhancements = applyImmediateAction;
applyImmediateAction = function (player, action) {
    const length = game.timeline?.length || 0;
    immediateBeforeEnhancements(player,action);
    if ((game.timeline?.length || 0) > length) logMission("ability resolved",player.id,{type:action.type,system:action.system,target:action.target,text:replayActionText(player.id,action)});
};
const privateSendBeforeEnhancements = sendPrivateToPlayer;
sendPrivateToPlayer = async function (id,data) {
    if (data.type === "private_reaction" && data.message) logMission("private result",id,{text:data.message});
    return privateSendBeforeEnhancements(id,data);
};
const localReactionBeforeEnhancements = showReactionResult;
showReactionResult = function () { localReactionBeforeEnhancements(); const id=game.reactionQueue[game.reactionIndex]; if(id)logMission("private result",id,{text:$("reactionResultMessage").textContent}); };

const replayState = {events:[],index:0,timer:null};
function pauseMissionReplay() { if(replayState.timer!==null)clearInterval(replayState.timer);replayState.timer=null;if($("replayPlay"))$("replayPlay").textContent="▶ PLAY"; }
function openMissionReplay() {
    if(!game.gameOver)return;
    pauseMissionReplay();
    const resolved = (game.timeline || []).some(e=>e.kind === "ability resolved");
    replayState.events = (game.timeline || []).filter(e=>!resolved || e.kind !== "ability");
    if(!replayState.events.length)return;
    replayState.index=0;
    const rounds=new Map();replayState.events.forEach((e,i)=>{const key=e.opening?"opening":String(e.round);if(!rounds.has(key))rounds.set(key,{i,label:e.opening?"Opening vote":"Round "+e.round});});
    $("replayRound").innerHTML=[...rounds].map(([key,v])=>`<option value="${key}" data-first="${v.i}">${v.label}</option>`).join("");
    $("replayRound").onchange=()=>{pauseMissionReplay();replayState.index=replayState.events.findIndex(e=>(e.opening?"opening":String(e.round))===$("replayRound").value);renderReplayStep();};
    $("replayPosition").max=String(replayState.events.length-1);
    $("replayPosition").oninput=()=>{pauseMissionReplay();replayState.index=Number($("replayPosition").value);renderReplayStep();};
    $("replayPrevious").onclick=()=>{pauseMissionReplay();replayState.index--;renderReplayStep();};
    $("replayNext").onclick=()=>{pauseMissionReplay();replayState.index++;renderReplayStep();};
    $("replayPlay").onclick=()=>{
        if(replayState.timer!==null){pauseMissionReplay();return;}
        if(replayState.index===replayState.events.length-1)replayState.index=0;
        $("replayPlay").textContent="Ⅱ PAUSE";renderReplayStep();
        replayState.timer=setInterval(()=>{if(replayState.index>=replayState.events.length-1){pauseMissionReplay();return;}replayState.index++;renderReplayStep();},1800);
    };
    $("replayClose").onclick=()=>{pauseMissionReplay();setScreen("gameOverScreen");};
    setScreen("replayScreen");renderReplayStep();
}
function renderReplayStep() {
    if(!game.gameOver){pauseMissionReplay();return;}
    replayState.index=Math.max(0,Math.min(replayState.events.length-1,replayState.index));
    const e=replayState.events[replayState.index];if(!e)return;
    $("replayCounter").textContent=`Event ${replayState.index+1} / ${replayState.events.length} · ${e.opening?"Opening vote":"Round "+e.round} · Stage ${e.stage} / 10`;
    const target = e.target ? ["skip","allclear"].includes(e.target) ? e.target === "skip" ? "eject nobody" : "all clear" : realName(e.target) : "";
    const text = e.text || (e.kind === "vote" ? `Voted for ${target}.` : [e.type,e.system,target].filter(Boolean).join(" · ")) || e.kind;
    $("replayEvent").innerHTML=`<small>${esc(e.kind.toUpperCase())}</small><h3>${esc(e.actor?realName(e.actor):"MISSION CONTROL")}</h3><p>${esc(text)}</p>`;
    $("replayCrew").innerHTML=(e.snapshot || game.players).map(p=>`<article class="replay-crew-card ${p.alive?"":"dead"}"><strong>${esc(p.name)}</strong><span>${esc(roleData(p.role).icon+" "+roleData(p.role).name)}</span><small>${p.alive?"ALIVE":"DEAD"}${p.infected?" · INFECTED":""}</small></article>`).join("");
    $("replayPosition").value=String(replayState.index);$("replayRound").value=e.opening?"opening":String(e.round);
    $("replayPrevious").disabled=replayState.index===0;$("replayNext").disabled=replayState.index===replayState.events.length-1;
}
const endBeforeEnhancements = endGame;
endGame = function(title,message) { endBeforeEnhancements(title,message); if($("watchReplayButton")){$("watchReplayButton").disabled=!(game.timeline?.length);$("watchReplayButton").onclick=openMissionReplay;} };

const screenBeforeEnhancements = setScreen;
setScreen = function (id) {
    if(id!=="discussionScreen")stopDiscussionClock();
    if(id!=="replayScreen")pauseMissionReplay();
    if(id==="setupScreen")missionFX.systems={power:true,o2:true,engines:true,communications:true};
    if(id==="systemsScreen")missionFX.systems={...game.systems};
    missionFX.screen=id;screenBeforeEnhancements(id);refreshAtmosphere();
};
const announcementBeforeEnhancements = announceShipEvent;
announceShipEvent = function(message,round,broadcast=true) { announcementBeforeEnhancements(message,round,broadcast);if(message)publishAtmosphere(game.systems); };

function initMissionEnhancements() { renderHostRules();initAtmosphere(); }
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initMissionEnhancements);else initMissionEnhancements();
