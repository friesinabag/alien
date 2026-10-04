const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const nodes = new Map();
const node = id => {
    if (!nodes.has(id)) nodes.set(id, {textContent:'',innerHTML:'',classList:{add(){},remove(){}},style:{},querySelectorAll(){return []},querySelector(){return null}});
    return nodes.get(id);
};
const ctx = vm.createContext({console,assert,setTimeout,clearTimeout,alert:message=>{throw Error(message)},window:{scrollTo(){}},document:{readyState:'loading',addEventListener(){},getElementById:node,querySelectorAll(){return []}}});
vm.runInContext(fs.readFileSync('game.js','utf8'),ctx);
vm.runInContext(`
function crew(roles) {
    game.mode='local';game.gameOver=false;game.round=1;game.stage=1;
    game.players=roles.map((role,i)=>({id:'p'+(i+1),name:'Player '+(i+1),role,originalRole:role,alive:true,infectionRound:null,hasInfected:false}));
    game.systems={engines:true,o2:true,communications:true,power:true};game.displaySwap=null;game.sabotagedAt={};
    resetTransient();game.previousActions={};
}
crew(['radio','alien','engineer','medic']);
const advance=advanceAbility;advanceAbility=()=>{};
game.abilityQueue=['p1'];game.abilityIndex=0;game.selectedAction='radio';completeAbility();
assert.match(game.reactionInfo.p1,/^EARTH:/);
game.reactionQueue=['p1'];game.reactionIndex=0;showReactionResult();
assert.match($('reactionResultMessage').textContent,/^EARTH:/);
advanceAbility=advance;
crew(['radio','engineer','medic']);
for(let i=0;i<300;i++) assert.ok(!randomRadioMessage().includes('one is hostile'));
crew(['silencer','engineer','medic']);
applyImmediateAction(game.players[0],{type:'silence',target:'p2'});
assert.equal(game.players[0].lastSilenceRound,1);
assert.equal(game.silencedUntil.p2,3);
game.round=2;assert.equal(canAct(game.players[0]),false);
assert.equal(validateAction(game.players[0],{type:'silence',target:'p3'}),false);
applyImmediateAction(game.players[0],{type:'silence',target:'p3'});assert.equal(game.silencedUntil.p3,undefined);
game.round=3;assert.equal(canAct(game.players[0]),true);
applyImmediateAction(game.players[0],{type:'silence',target:'p3'});assert.equal(game.silencedUntil.p3,5);
for(const mode of ['local','online']) for(const [role,title] of [['engineer','HUMAN VICTORY'],['alien','HOSTILE VICTORY'],['king','NEUTRAL VICTORY'],['trickster','NEUTRAL VICTORY']]) {
    crew(['jester',role]);game.mode=mode;assert.equal(checkVictory(),true);assert.equal($('gameOverTitle').textContent,title);
}
crew(['jester','jester']);assert.equal(checkVictory(),false);
crew(['jester','alien','engineer']);
game.actions={p2:{type:'kill',target:'p3'}};game.roundStartAliveIds=['p1','p2','p3'];
resolveAbilities();assert.equal(game.gameOver,true);assert.equal($('gameOverTitle').textContent,'HOSTILE VICTORY');
crew(['jester','engineer','medic']);
completeEjection('p3',false);assert.equal(game.gameOver,true);assert.equal($('gameOverTitle').textContent,'HUMAN VICTORY');
crew(['trickster','trickster','engineer','alien']);
assert.ok(NEUTRALS.includes('trickster') && settings.enabled.trickster);
applyImmediateAction(game.players[0],{type:'swap',a:'p3',b:'p4'});
assert.equal(displayName('p3'),'Player 4');assert.equal(game.players[2].role,'engineer');
assert.equal(game.players[0].tricksterUsed,true);assert.equal(game.players[1].tricksterUsed,undefined);
assert.equal(validateAction(game.players[0],{type:'swap',a:'p1',b:'p2'}),false);
applyImmediateAction(game.players[1],{type:'swap',a:'p1',b:'p2'});assert.equal(displayName('p1'),'Player 2');
completeEjection(null,false);assert.equal(game.displaySwap,null);
// Guard the authoritative host queue while showing the host's own action UI.
crew(['engineer','radio','alien','trickster']);game.mode='online';online.connected=true;online.isHost=true;online.playerId='p1';online.connectionId='host';
online.players={host:{playerId:'p1',connectionId:'host',connected:true},remote:{playerId:'p2',connectionId:'remote',connected:true}};
game.abilityQueue=['p2','p1','p3'];game.abilityIndex=1;
onlineShowPrivateAction({role:'engineer'});assert.equal(game.abilityQueue.length,3);assert.equal(game.abilityIndex,1);assert.equal(game.mode,'online');
const advanceOnline=onlineAdvanceHostAbility;let advanced=0;onlineAdvanceHostAbility=()=>{advanced++;game.abilityIndex++};
hostReceiveAbility(game.players[1],{type:'radio'});assert.equal(advanced,0);
hostReceiveAbility(game.players[0],{type:'none'});assert.equal(advanced,1);
hostReceiveAbility(game.players[0],{type:'none'});assert.equal(advanced,1);
onlineAdvanceHostAbility=advanceOnline;
online.activeTurn={id:'current',type:'private_action',playerId:'p2'};let accepted=0;
const receive=hostReceiveAbility;hostReceiveAbility=()=>accepted++;
handleHostPrivateRequest({type:'ability_action',action:{type:'radio'},round:1,turnId:'old'},'remote');assert.equal(accepted,0);
handleHostPrivateRequest({type:'ability_action',action:{type:'radio'},round:1,turnId:'current'},'remote');assert.equal(accepted,1);
hostReceiveAbility=receive;
// A sabotage must survive its own round before an Engineer can repair it.
crew(['saboteur','engineer','medic']);
applyImmediateAction(game.players[0],{type:'sabotage',system:'engines'});
assert.equal(game.sabotagedAt.engines,1);assert.equal(canRepairSystem('engines'),false);
assert.equal(validateAction(game.players[1],{type:'repair',system:'engines'}),false);
applyImmediateAction(game.players[1],{type:'repair',system:'engines'});assert.equal(game.systems.engines,false);
game.round=2;assert.equal(validateAction(game.players[1],{type:'repair',system:'engines'}),true);
assert.equal(validateAction(game.players[0],{type:'sabotage',system:'engines'}),false);
applyImmediateAction(game.players[1],{type:'repair',system:'engines'});assert.equal(game.systems.engines,true);
// Technician works during a blackout and powers someone else's actual ability.
crew(['radio','technician','analyst','engineer']);game.systems.power=false;
assert.equal(abilityOrder(['p1','p2','p3','p4'])[0],'p2');
assert.equal(canAct(game.players[0]),false);assert.equal(canAct(game.players[1]),true);
assert.equal(validateAction(game.players[1],{type:'backup',target:'p2'}),false);
applyImmediateAction(game.players[1],{type:'backup',target:'p1'});
assert.equal(canAct(game.players[0]),true);
applyImmediateAction(game.players[0],{type:'radio'});assert.match(game.reactionInfo.p1,/^EARTH:/);
game.blockedPlayers.add('p1');assert.equal(canAct(game.players[0]),false);
game.round=2;resetTransient();assert.equal(canAct(game.players[0]),false);
// Analyst copies results regardless of whether they choose before or after the source.
for (const source of ['radio','detective','scientist']) {
    crew(['analyst',source,'engineer','medic']);
    game.actions.p1={type:'analyse',target:'p2'};
    const sourceAction=source==='radio'?{type:'radio'}:source==='detective'?{type:'detect',target:'p3'}:{type:'science',target:'p3',mode:'check'};
    game.actions.p2=sourceAction;applyImmediateAction(game.players[1],sourceAction);
    resolveAnalystResults();assert.ok(game.reactionInfo.p1.includes(game.investigationResults.p2));
    assert.equal(game.reactionInfo.p3,undefined);
}
crew(['analyst','medic']);game.actions.p1={type:'analyse',target:'p2'};resolveAnalystResults();assert.match(game.reactionInfo.p1,/no investigative result/);
// Bounty is permanent; voted targets win, killed targets fail, dead hunters cannot win.
crew(['bountyhunter','engineer','medic']);
applyImmediateAction(game.players[0],{type:'bounty',target:'p2'});
assert.equal(validateAction(game.players[0],{type:'bounty',target:'p3'}),false);
completeEjection('p2',false);assert.equal($('gameOverTitle').textContent,'BOUNTY HUNTER WINS');
crew(['bountyhunter','engineer','alien','medic']);applyImmediateAction(game.players[0],{type:'bounty',target:'p2'});
game.actions.p3={type:'kill',target:'p2'};resolveAbilities();assert.equal(game.players[0].bountyFailed,true);assert.equal(game.gameOver,false);
crew(['bountyhunter','engineer','medic']);game.players[0].bountyTarget='p2';game.players[0].alive=false;completeEjection('p2',false);assert.equal(game.gameOver,false);
crew(['bountyhunter','engineer']);game.round=2;assert.equal(canAct(game.players[0]),false);
crew(['bountyhunter','jester','engineer','medic']);applyImmediateAction(game.players[0],{type:'bounty',target:'p2'});completeEjection('p2',false);
assert.equal($('gameOverTitle').textContent,'NEUTRAL OBJECTIVE VICTORY');assert.ok($('gameOverMessage').textContent.includes('Player 1'));assert.ok($('gameOverMessage').textContent.includes('Player 2'));
// Oracle cannot farm only skips, double-score a vote, or win after being ejected.
crew(['oracle','engineer','medic','guard','radio']);
for (let round=1;round<=3;round++) {
    game.round=round;resetTransient();game.oraclePredictions.p1='skip';
    assert.equal(settleVoteObjectives(null),false);assert.equal(game.players[0].oracleCorrect,round);
    assert.equal(settleVoteObjectives(null),false);assert.equal(game.players[0].oracleCorrect,round);
}
game.round=4;resetTransient();game.oraclePredictions.p1='p2';completeEjection('p2',true);assert.equal($('gameOverTitle').textContent,'ORACLE WINS');
crew(['oracle','engineer','medic']);game.players[0].oracleCorrect=2;game.players[0].oraclePlayerCorrect=true;game.oraclePredictions.p1='p1';completeEjection('p1',false);assert.equal(game.gameOver,false);
crew(['oracle','judge','engineer','medic']);game.oraclePredictions.p1='skip';showJudgePrompt('p3',false);$('judgeCancelButton').onclick();assert.equal(game.players[0].oracleCorrect,1);
crew(['bountyhunter','oracle','engineer']);earthCheck();assert.equal($('gameOverTitle').textContent,'HUMAN VICTORY');
crew(['bountyhunter','oracle']);earthCheck();assert.equal($('gameOverTitle').textContent,'VOYAGE COMPLETE');
// Online payloads carry power grants, sabotage ages, and private objective progress.
crew(['oracle','technician','engineer']);game.mode='online';online.isHost=true;online.playerId='p1';
game.abilityQueue=['p1'];game.abilityIndex=0;game.backupPowered.add('p1');game.sabotagedAt.engines=1;game.players[0].oracleCorrect=2;
let payload;const deliver=sendPrivateToPlayer;sendPrivateToPlayer=(id,data)=>{payload=data};onlineHostSendNextAbility();
assert.equal(payload.backupPowered,true);assert.equal(payload.sabotagedAt.engines,1);assert.equal(payload.oracleCorrect,2);
sendPrivateToPlayer=deliver;online.isHost=false;game.systems.power=false;payload.systems=game.systems;
onlineShowPrivateAction(payload);assert.equal(canAct(game.players[0]),true);assert.equal(game.players[0].oracleCorrect,2);
console.log('Passed: radio reaction delivery, truthful red herring hints, Silencer cooldown, immediate final-two Jester outcomes, independent Tricksters, swap expiry, host queue preservation, stale/duplicate turn rejection.');
console.log('Passed: delayed Engineer repairs, blackout Technician support, private Analyst copies, Bounty Hunter outcomes, Oracle scoring, and online role-state synchronization.');
`,ctx);
