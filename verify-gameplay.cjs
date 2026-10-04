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
    game.systems={engines:true,o2:true,communications:true,power:true};game.displaySwap=null;
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
console.log('Passed: radio reaction delivery, truthful red herring hints, Silencer cooldown, immediate final-two Jester outcomes, independent Tricksters, swap expiry, host queue preservation, stale/duplicate turn rejection.');
`,ctx);
