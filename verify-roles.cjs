const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const context = vm.createContext({console, document: {readyState: 'loading', addEventListener() {}}, window: {}});
vm.runInContext(fs.readFileSync('game.js', 'utf8'), context);
vm.runInContext(`
for (const composition of ['mixed', 'good', 'neutral', 'evil']) {
    roundComposition = composition;
    for (let count = 2; count <= 12; count++) {
        for (let trial = 0; trial < 100; trial++) {
            const roles = generateRoles(count);
            if (roles.length !== count || roles.some(r => !ALL_STARTING_ROLES.includes(r))) throw Error('Invalid role list');
            const team = {good:'Human',neutral:'Neutral',evil:'Hostile'}[composition];
            if (team && roles.some(r => roleTeam(r) !== team)) throw Error('Wrong team');
        }
    }
}
let redHerrings = 0;
roundComposition = 'mixed';
for (let i = 0; i < 1000; i++) if (generateRoles(6).every(r => roleTeam(r) === 'Human')) redHerrings++;
if (redHerrings < 100 || redHerrings > 300) throw Error('Red herring frequency');
setupMode = 'manual';
game.players = [{id:'p1'}, {id:'p2'}];
game.randomRoles = {0:'alien',1:'alien'};
assignOnlineRoles();
if (game.players.some(p => p.role !== 'alien')) throw Error('Manual roles overwritten');
if (checkVictory()) throw Error('All evil ended immediately');
if (targetOptions(game.players[0], 'p1').length !== 1) throw Error('All evil cannot target');
game.players.forEach(p => {p.role='engineer';p.originalRole='engineer'});
if (checkVictory()) throw Error('All good ended immediately');
game.randomRoles = {0:'alien'};
let rejected = false;
try { selectedStartingRoles(); } catch { rejected = true; }
if (!rejected) throw Error('Incomplete manual assignments accepted');
console.log('Passed: 4,400 generated games, red herring frequency, manual online assignment, special-game victory and targets, incomplete assignment validation.');
`, context);
