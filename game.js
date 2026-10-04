"use strict";


/* =========================================================
   ALIEN
   COMPLETE GAME.JS
   LOCAL + ONLINE
   =========================================================

   IMPORTANT:
   - This file automatically loads Supabase JS if it is not
     already loaded.
   - The publishable key is safe to use in browser code.
   - NEVER put a Supabase service_role key in this file.
   ========================================================= */


/* =========================================================
   SUPABASE CONFIG
   ========================================================= */

const SUPABASE_URL = "https://sovwkrauwyoskxrnajjn.supabase.co";
const SUPABASE_KEY = "sb_publishable_ck6DlHqxEFmoCex44rXbKw_HlAtPkaW";

let supabaseClient = null;
let supabaseLoading = null;

function loadSupabase() {
    if (supabaseClient) return Promise.resolve(supabaseClient);
    if (supabaseLoading) return supabaseLoading;
    const initialise = () => {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        return supabaseClient;
    };
    if (window.supabase) return Promise.resolve(initialise());
    supabaseLoading = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
        script.async = true;
        const timeout = setTimeout(() => fail(), 15000);
        const fail = () => { clearTimeout(timeout); script.remove(); reject(new Error("Could not load the online library. Check your internet connection and retry.")); };
        script.onload = () => { clearTimeout(timeout); try { resolve(initialise()); } catch (e) { reject(e); } };
        script.onerror = fail;
        document.head.appendChild(script);
    }).catch(error => { supabaseLoading = null; throw error; });
    return supabaseLoading;
}

/* =========================================================
   HELPERS
   ========================================================= */

const $ = id => document.getElementById(id);

const alive = p => !!p && p.alive;

const esc = value =>
    String(value ?? "").replace(
        /[&<>"']/g,
        c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[c])
    );

function shuffle(array) {
    const a = [...array];

    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }

    return a;
}

function rand(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getPlayer(id) {
    return game.players.find(p => p.id === id);
}

function living() {
    return game.players.filter(alive);
}

function realName(id) {
    return getPlayer(id)?.name || "";
}

function roleData(role) {
    return ROLE_DATA[role] || {
        icon: "❓",
        name: role || "Unknown",
        team: "Human",
        desc: ""
    };
}


/* =========================================================
   ROLE DATA
   ========================================================= */

const ROLE_DATA = {

    alien: {
        icon: "👽",
        name: "Alien",
        team: "Hostile",
        desc:
            "Kill 1 player each round. If there is no living Saboteur, you may choose Kill OR Sabotage. You can see the other Hostile players."
    },

    saboteur: {
        icon: "😈",
        name: "Saboteur",
        team: "Hostile",
        desc:
            "Sabotage 1 ship system each round. If you are alive, the Alien cannot sabotage. You can see the other Hostile players."
    },

    silencer: {
        icon: "🔇",
        name: "Silencer",
        team: "Hostile",
        desc:
            "Silence 1 living player for 2 rounds, then wait a round before using this ability again. They cannot vote while silenced, but can still discuss and use their ability."
    },

    parasite: {
        icon: "🦠",
        name: "Parasite",
        team: "Hostile",
        desc:
            "Infect 1 player once. The infection is completely secret until it becomes Diseased."
    },

    engineer: {
        icon: "🔧",
        name: "Engineer",
        team: "Human",
        desc:
            "Repair 1 offline ship system each round, starting the round after it was sabotaged. Engineer can act even while Power is offline."
    },

    scientist: {
        icon: "🧪",
        name: "Scientist",
        team: "Human",
        desc:
            "Check a living player to see Healthy, Infected, Diseased or Parasite. You can cure Infected or Diseased players."
    },

    detective: {
        icon: "🕵️",
        name: "Detective",
        team: "Human",
        desc:
            "Investigate a living player and learn what they interacted with during the previous round."
    },

    medic: {
        icon: "🩺",
        name: "Medic",
        team: "Human",
        desc:
            "Protect 1 living player from being killed this round."
    },

    captain: {
        icon: "👨‍✈️",
        name: "Captain",
        team: "Human",
        desc:
            "If the vote ties, secretly choose which tied player is ejected. Power must be online."
    },

    guard: {
        icon: "🛡️",
        name: "Guard",
        team: "Human",
        desc:
            "Block 1 living player's role ability for this round. The target is not told."
    },

    survivor: {
        icon: "👤",
        name: "Survivor",
        team: "Human",
        desc:
            "No special ability. Help the Human team survive."
    },

    radio: {
        icon: "📻",
        name: "Radio Operator",
        team: "Human",
        desc:
            "Choose to receive a private message from Earth during the Reaction Round if Communications is online."
    },

    judge: {
        icon: "⚖️",
        name: "Judge",
        team: "Human",
        desc:
            "Once per game, cancel ANY vote ejection. This includes normal majority ejections and Captain tie-breaker ejections."
    },

    jester: {
        icon: "🃏",
        name: "Jester",
        team: "Neutral",
        desc:
            "Win immediately if you are normally voted out. If you reach the final 2, the other player’s team wins instead."
    },

    king: {
        icon: "👑",
        name: "Survivor King",
        team: "Neutral",
        desc:
            "Win independently by being one of the final 2 living players."
    },

    trickster: {
        icon: "🎭",
        name: "Trickster",
        team: "Neutral",
        desc:
            "Once per game, swap the displayed identities of two living players. The swap lasts through Reaction, Discussion and Voting, then ends. Win with the Neutral team by surviving the journey to Earth."
    },

    bountyhunter: {
        icon: "🎯", name: "Bounty Hunter", team: "Neutral",
        desc: "Mark another player once, at the start of the game. Win if they are voted out while you are alive. A kill does not count; you cannot change your target."
    },
    oracle: {
        icon: "🔮", name: "Oracle", team: "Neutral",
        desc: "Before discussion, predict who will be ejected, or predict no ejection. Win with 3 correct predictions, including at least 1 player ejection. You must still be alive."
    },
    technician: {
        icon: "🔋", name: "Technician", team: "Human",
        desc: "Give another player backup power for this round, allowing their ability to work while Power is offline. You act before regular ability turns and can work during a blackout. Backup power does not bypass a Guard block."
    },
    analyst: {
        icon: "📡", name: "Analyst", team: "Human",
        desc: "Choose another player. Privately receive a copy of any Detective investigation, Scientist check, or Earth radio message they receive this round. You do not learn their role."
    },

    infected: {
        icon: "🦠",
        name: "Infected",
        team: "Human",
        sub: true,
        desc:
            "A hidden infection stage. The infected player does not know they are infected. Only the Scientist can detect it."
    },

    diseased: {
        icon: "☣️",
        name: "Diseased",
        team: "Hostile",
        sub: true,
        desc:
            "The infection has progressed. You now know that you are Diseased and on the Hostile Team. You cannot use an ability."
    }
};


const HOSTILES = [
    "alien",
    "saboteur",
    "silencer",
    "parasite"
];

const HUMANS = [
    "engineer",
    "scientist",
    "detective",
    "medic",
    "captain",
    "guard",
    "survivor",
    "radio",
    "judge",
    "technician",
    "analyst"
];

const NEUTRALS = [
    "jester",
    "king",
    "trickster",
    "bountyhunter",
    "oracle"
];

const ALL_STARTING_ROLES = [
    ...HOSTILES,
    ...HUMANS,
    ...NEUTRALS
];

const HOSTILE_COUNTS = {
    2: 1,
    3: 1,
    4: 1,
    5: 1,
    6: 2,
    7: 2,
    8: 3,
    9: 3,
    10: 3,
    11: 4,
    12: 4
};

const HUMAN_WEIGHTS = {
    survivor: 25,
    medic: 15,
    detective: 12.5,
    guard: 12.5,
    scientist: 10,
    radio: 10,
    captain: 7.5,
    judge: 7.5,
    technician: 10,
    analyst: 10
};


/* =========================================================
   SETTINGS
   ========================================================= */

let setupMode = "random";
let roundComposition = "mixed";

let settings = {
    enabled: {},
    counts: {}
};

ALL_STARTING_ROLES.forEach(role => {
    settings.enabled[role] = true;
    settings.counts[role] = 0;
});

settings.enabled.engineer = true;
settings.counts.engineer = 1;


/* =========================================================
   GAME STATE
   ========================================================= */

let game = {

    mode: "local",

    players: [],

    round: 1,
    stage: 1,

    abilityQueue: [],
    abilityIndex: 0,

    reactionQueue: [],
    reactionIndex: 0,

    currentVoteIndex: 0,

    roundStartAliveIds: [],

    actions: {},
    previousActions: {},
    sabotagedAt: {},
    backupPowered: new Set(),
    investigationResults: {},
    oraclePredictions: {},
    objectiveVoteRound: null,

    blockedPlayers: new Set(),
    protectedPlayers: new Set(),

    silencedUntil: {},

    votes: {},

    selectedAction: null,
    selectedVote: null,

    reactionInfo: {},

    lastRoundResults: [],

    randomisedRoles: false,
    randomRoles: {},

    lifelineNumber: 0,

    gameOver: false,

    displaySwap: null,

    judgeUsed: false,

systems: {
    engines: true,
    o2: true,
    communications: true,
    power: true
},

o2RoundsRemaining: 3,

    currentPlayerIndex: 0,

    pendingEjection: null,

    pendingJudge: false
};


/* =========================================================
   TEAM HELPERS
   ========================================================= */

function roleTeam(roleOrPlayer) {

    const role =
        typeof roleOrPlayer === "string"
            ? roleOrPlayer
            : roleOrPlayer?.role;

    /*
       IMPORTANT:
       Infected is treated as Human until it becomes Diseased.
    */

    if (role === "infected") return "Human";

    if (role === "diseased") return "Hostile";

    return roleData(role).team;
}

function isHostile(player) {
    return alive(player) && roleTeam(player) === "Hostile";
}

function isHuman(player) {
    return alive(player) && roleTeam(player) === "Human";
}

function isNeutral(player) {
    return alive(player) && roleTeam(player) === "Neutral";
}

function teamClass(team) {

    if (team === "Hostile") return "hostile";
    if (team === "Neutral") return "neutral";
    if (team === "Infection") return "infection";

    return "human";
}


/* =========================================================
   DISPLAY IDENTITY / TRICKSTER
   ========================================================= */

function displayMap() {

    const map = {};

    living().forEach(p => {
        map[p.id] = p.id;
    });

    if (game.displaySwap) {

        const [a, b] = game.displaySwap;

        if (map[a] && map[b]) {
            map[a] = b;
            map[b] = a;
        }
    }

    return map;
}

function displayName(id) {

    const map = displayMap();
    const realId = map[id] || id;

    return realName(realId);
}

function displayedPlayer(id) {

    const map = displayMap();
    return getPlayer(map[id] || id);
}


/* =========================================================
   ACTION PERMISSIONS
   ========================================================= */

function canAct(player) {

    if (!alive(player)) return false;
    if (player.role === "silencer" && player.lastSilenceRound != null && game.round < player.lastSilenceRound + 2) return false;

    if (player.role === "engineer") return true;
    if (game.blockedPlayers.has(player.id)) return false;
    if (player.role === "bountyhunter") return game.round === 1 && !player.bountyTarget && !player.bountyFailed;
    if (player.role === "technician") return true;

    if (
        player.role === "infected" ||
        player.role === "diseased" ||
        player.role === "survivor" ||
        player.role === "jester" ||
        player.role === "king"
    ) {
        return false;
    }

    if (!game.systems.power && !game.backupPowered.has(player.id)) return false;

    if (game.blockedPlayers.has(player.id)) return false;

    if (
        player.role === "judge" &&
        game.judgeUsed
    ) {
        return false;
    }

    return true;
}


/* =========================================================
   TARGET OPTIONS
   ========================================================= */

function targetOptions(actor = null, excludeId = null) {

    return living()
        .filter(p => {

            if (p.id === excludeId) return false;
            if (online.connected && !online.isHost && actor?.id === online.playerId && roleTeam(actor) === "Hostile" && online.hostileAllyIds?.includes(p.id) && !game.displaySwap?.includes(p.id) && online.hostileAllyIds.length !== living().length) return false;

            /*
               Hostiles normally cannot target living Hostiles.
               Trickster swaps displayed identities, so the displayed
               identity can cause an apparent teammate target.
            */

            if (
                actor &&
                roleTeam(actor) === "Hostile" &&
                roleTeam(p) === "Hostile" &&
                !game.players.every(player => roleTeam(player.originalRole) === "Hostile") &&
                !(
                    game.displaySwap &&
                    game.displaySwap.includes(p.id)
                )
            ) {
                return false;
            }

            return true;
        })
        .map(p => ({
            id: p.id,
            label: displayName(p.id)
        }));
}


/* =========================================================
   RESET TRANSIENT ROUND DATA
   ========================================================= */

function resetTransient() {

    game.actions = {};
    game.backupPowered = new Set();
    game.investigationResults = {};
    game.oraclePredictions = {};
    game.objectiveVoteRound = null;

    game.blockedPlayers = new Set();

    game.protectedPlayers = new Set();

    game.selectedAction = null;

    game.reactionInfo = {};

    game.votes = {};

    game.selectedVote = null;

    game.pendingEjection = null;

    game.pendingJudge = false;
}


/* =========================================================
   SCREEN CONTROL
   ========================================================= */

function setScreen(id) {

    document
        .querySelectorAll(".screen")
        .forEach(screen =>
            screen.classList.remove("active")
        );

    const target = $(id);

    if (target) {
        target.classList.add("active");
    }

    window.scrollTo(0, 0);
}


/* =========================================================
   BUTTON HTML
   ========================================================= */

function button(text, value, cls = "choice-button") {

    return `
        <button
            type="button"
            class="${cls}"
            data-value="${esc(value)}"
        >
            ${text}
        </button>
    `;
}


/* =========================================================
   SETUP
   ========================================================= */

function resetSetupPlayers() {

const count = Math.max(
    2,
    Math.min(
        12,
        Number($("playerCount")?.value || 2)
    )
);

    game.players = Array.from(
        { length: count },
        (_, i) => ({
            id: `p${i + 1}`,
            name: `Player ${i + 1}`,
            role: "survivor",
            originalRole: "survivor",
            alive: true,
            infectionRound: null,
            hasInfected: false
        })
    );

    game.randomisedRoles = false;
    game.randomRoles = {};

    renderSetup();
}


function renderSetup() {

    const container = $("playersSetup");

    if (!container) return;

    container.innerHTML = game.players.map((p, i) => {

        const selectedRole =
            game.randomRoles[i] || null;

        return `
            <div class="setup-player">

                <label>
                    Player ${i + 1}

                    <input
                        class="player-name-input"
                        type="text"
                        maxlength="20"
                        value="${esc(
                            p.name || `Player ${i + 1}`
                        )}"
                        data-name-index="${i}"
                        autocomplete="off"
                        autocapitalize="words"
                        spellcheck="false"
                        placeholder="Player ${i + 1}"
                    >
                </label>

                <label>
                    Role

                    <select
                        class="role-select ${
                            selectedRole
                                ? "random-hidden"
                                : ""
                        }"
                        data-index="${i}"
                    >

                        <option value="random">
                            🎲 RANDOM
                        </option>

                        ${
                            ALL_STARTING_ROLES
                                .filter(
                                    role =>
                                        settings.enabled[role] ||
                                        role === "engineer"
                                )
                                .map(
                                    role => `
                                        <option value="${role}">
                                            ${roleData(role).icon}
                                            ${roleData(role).name}
                                        </option>
                                    `
                                )
                                .join("")
                        }

                    </select>

                </label>

            </div>
        `;
    }).join("");

    bindSetupNames();
    bindSetupSelects();
    updatePlayerValidity();
}


function bindSetupNames() {

    document
        .querySelectorAll(".player-name-input")
        .forEach(input => {

            const save = () => {

                const index =
                    Number(input.dataset.nameIndex);

                if (
                    game.players[index] &&
                    input.value.trim()
                ) {
                    game.players[index].name =
                        input.value.trim();
                }
            };

            input.addEventListener("input", save);
            input.addEventListener("blur", save);
        });
}


function bindSetupSelects() {
    document.querySelectorAll(".role-select").forEach(select => {
        const index = Number(select.dataset.index);
        select.value = game.randomRoles[index] || "random";
        select.closest("label").hidden = setupMode !== "manual";
        select.onchange = () => {
            if (select.value === "random") delete game.randomRoles[index];
            else game.randomRoles[index] = select.value;
            game.randomisedRoles = true;
            updatePlayerValidity();
        };
    });
}


function updatePlayerValidity() {
    const assigned = Object.keys(game.randomRoles).length;
    $("playerValidity").textContent = setupMode === "manual"
        ? `${assigned} / ${game.players.length} roles selected · Host eyes only`
        : `${game.players.length} crew members · ${game.randomisedRoles ? "Roles sealed. Ready to launch." : "Roles will be secretly assigned at launch."}`;
    $("randomRolesButton").hidden = setupMode === "manual";
}


/* =========================================================
   RANDOM ROLE SYSTEM
   ========================================================= */

function weightedPick(items, weights) {

    const total = items.reduce(
        (sum, item) =>
            sum + (weights[item] || 0),
        0
    );

    let random =
        Math.random() * total;

    for (const item of items) {

        random -= weights[item] || 0;

        if (random < 0) {
            return item;
        }
    }

    return items[items.length - 1];
}


// One generator for local and online play. Keep the chosen composition secret.
function generateRoles(count) {
    if (count < 2 || count > 12) throw new Error("Choose 2–12 players.");
    const enabled = pool => pool.filter(role => settings.enabled[role]);
    const pickMany = (pool, amount) => {
        if (!pool.length && amount) throw new Error("Enable at least one role for the selected team in Custom Roles.");
        const result = [];
        let available = shuffle(pool);
        for (let i = 0; i < amount; i++) {
            if (!available.length) available = shuffle(pool);
            const role = weightedPick(available, Object.fromEntries(available.map(r => [r, HUMAN_WEIGHTS[r] || 10])));
            result.push(role);
            available = available.filter(r => r !== role);
        }
        return result;
    };
    const composition = roundComposition === "mixed" && Math.random() < 0.2 ? "good" : roundComposition;
    if (composition === "good") return shuffle(["engineer", ...pickMany(enabled(HUMANS.filter(r => r !== "engineer")), count - 1)]);
    if (composition === "neutral") return pickMany(enabled(NEUTRALS), count);
    if (composition === "evil") return pickMany(enabled(HOSTILES), count);
    const roles = [...pickMany(enabled(HOSTILES), HOSTILE_COUNTS[count]), "engineer"];
    const neutrals = enabled(NEUTRALS);
    if (roles.length < count && neutrals.length && Math.random() < 0.5) roles.push(rand(neutrals));
    return shuffle([...roles, ...pickMany(enabled(HUMANS.filter(r => r !== "engineer")), count - roles.length)]);
}

function selectedStartingRoles() {
    const count = game.players.length;
    if (setupMode !== "manual" && (!game.randomisedRoles || Object.keys(game.randomRoles).length !== count)) {
        game.randomRoles = Object.fromEntries(generateRoles(count).map((r, i) => [i, r]));
        game.randomisedRoles = true;
    }
    const roles = Array.from({length: count}, (_, i) => game.randomRoles[i]);
    if (roles.some(r => !ALL_STARTING_ROLES.includes(r) || !settings.enabled[r])) throw new Error("Choose an enabled role for every player.");
    if (setupMode !== "manual" && roundComposition !== "mixed") {
        const team = {good: "Human", neutral: "Neutral", evil: "Hostile"}[roundComposition];
        if (roles.some(r => roleTeam(r) !== team)) throw new Error("Regenerate roles to match the selected round type.");
    }
    return roles;
}

function randomiseRoles() {
    try {
        game.randomRoles = Object.fromEntries(generateRoles(game.players.length).map((role, i) => [i, role]));
        game.randomisedRoles = true;
        renderSetup();
    } catch (error) { alert(error.message); }
}

/* =========================================================
   START GAME
   ========================================================= */

function startGame() {

    if (game.mode === "online") {

        onlineHostStartGame();

        return;
    }

    let roles;
    try { roles = selectedStartingRoles(); }
    catch (error) { alert(error.message); return; }

    game.players.forEach(
        (player, index) => {

            player.role =
                roles[index];

            player.originalRole =
                roles[index];

            player.alive = true;

            player.infectionRound = null;

            player.hasInfected = false;
        }
    );

    game.round = 1;
    game.stage = 1;

    game.gameOver = false;

    game.lifelineNumber = 0;

    game.judgeUsed = false;

    game.players.forEach(p => { p.tricksterUsed = false; p.lastSilenceRound = null; p.bountyTarget = null; p.bountyFailed = false; p.oracleCorrect = 0; p.oraclePlayerCorrect = false; p.lastOracleResult = null; });
    game.sabotagedAt = {};

    game.displaySwap = null;

    game.systems = {
        engines: true,
        o2: true,
        communications: true,
        power: true
    };

   game.o2RoundsRemaining = 3;

    resetTransient();

    startRound();
}


/* =========================================================
   ROUND START
   ========================================================= */

function progressInfections() {

    for (const player of game.players) {

        if (
            !player.alive ||
            player.infectionRound === null
        ) {
            continue;
        }

        const age =
            game.round -
            player.infectionRound +
            1;

        /*
           Infection is secret.

           Round after infection:
           Infected -> Diseased.

           Next round:
           Diseased -> Parasite.
        */

        if (
            age === 2 &&
            player.role === "infected"
        ) {

            player.role = "diseased";

            game.reactionInfo[player.id] =
                "You became DISEASED. You are on the HOSTILE TEAM.";

        } else if (
            age >= 3 &&
            player.role === "diseased"
        ) {

            player.role = "parasite";

            player.hasInfected = false;

            game.reactionInfo[player.id] =
                "You became a PARASITE. You are on the HOSTILE TEAM.";
        }
    }
}


function startRound() {

    if (checkVictory()) return;

       if (
        game.round > 1 &&
        !game.systems.o2
    ) {
        if (advanceOxygenCountdown()) {
            return;
        }
    }
   
    /*
       IMPORTANT:
       Previous actions MUST be captured BEFORE
       resetTransient() clears actions.

       This fixes the Detective previous-round bug.
    */

    game.previousActions = {
        ...game.actions
    };

    resetTransient();

    progressInfections();

    game.roundStartAliveIds =
        living().map(
            player => player.id
        );

    game.abilityQueue = abilityOrder(game.roundStartAliveIds);

    game.abilityIndex = 0;

    game.reactionQueue = [];

    game.reactionIndex = 0;

    game.currentVoteIndex = 0;

    passToAbility();
}


/* =========================================================
   PASS SCREEN
   ========================================================= */

function passToAbility() {

    if (
        game.abilityIndex >=
        game.abilityQueue.length
    ) {

        resolveAbilities();

        return;
    }

    const player =
        getPlayer(
            game.abilityQueue[
                game.abilityIndex
            ]
        );

    if (!player) {

        advanceAbility();

        return;
    }

    $("passPlayerName").textContent =
        player.name;

    $("passRound").textContent =
        `ROUND ${game.round} • STAGE ${game.stage} / 10`;

    $("passSubtext").textContent =
        game.mode === "online"
            ? "YOUR PRIVATE TURN"
            : "PASS THE PHONE TO THIS PLAYER";

    game.currentPlayerIndex =
        game.abilityIndex;

    setScreen("passScreen");
}


/* =========================================================
   ROLE SCREEN
   ========================================================= */

function showRole() {

    if (game.mode === "online") {

        onlineShowPrivateRole();

        return;
    }

    const player =
        getPlayer(
            game.abilityQueue[
                game.abilityIndex
            ]
        );

    if (!player) return;

    $("rolePlayerName").textContent =
        player.name;

    $("roleIcon").textContent =
        roleData(player.role).icon;

    $("roleName").textContent =
        roleData(player.role).name;

    const team =
        roleTeam(player);

    $("roleName").className =
        `role-title ${teamClass(team)}`;

    $("roleTeam").textContent =
        `${team.toUpperCase()} TEAM`;

    $("roleTeam").className =
        `team-badge ${teamClass(team)}`;

    $("roleDescription").textContent =
        roleData(player.role).desc;

    $("hostileList").innerHTML = "";

    if (team === "Hostile") {

        const allies =
            living().filter(
                other =>
                    other.id !== player.id &&
                    isHostile(other)
            );

        $("hostileList").innerHTML =
            allies.length
                ? `
                    <div class="ally-box">
                        <strong>HOSTILE ALLIES</strong>
                        <br>
                        ${allies
                            .map(
                                other =>
                                    `${roleData(other.role).icon} ${esc(other.name)}`
                            )
                            .join("<br>")}
                    </div>
                  `
                : `
                    <div class="ally-box">
                        <strong>HOSTILE ALLIES</strong>
                        <br>
                        None
                    </div>
                  `;
    }

    /*
       Infection secrecy:
       Infected players see their original role screen.
       They do NOT get told they are infected.
    */

    if (
        player.role === "infected"
    ) {

        $("roleIcon").textContent =
            roleData(player.originalRole).icon;

        $("roleName").textContent =
            roleData(player.originalRole).name;

        $("roleTeam").textContent =
            "HUMAN TEAM";

        $("roleTeam").className =
            "team-badge human";

        $("roleDescription").textContent =
            roleData(player.originalRole).desc;

        $("hostileList").innerHTML = "";
    }

    setScreen("roleScreen");
}


/* =========================================================
   ACTION SCREEN
   ========================================================= */

function showAction() {

    if (game.mode === "online") {

        onlineShowPrivateAction();

        return;
    }

    const player =
        getPlayer(
            game.abilityQueue[
                game.abilityIndex
            ]
        );

    if (!player) return;

    $("actionTitle").textContent =
        `${roleData(player.role).icon} ${roleData(player.role).name}`;

    $("actionDescription").textContent = "";

    $("actionOptions").innerHTML = "";

    game.selectedAction = null;

    if (player.role === "bountyhunter" && (player.bountyTarget || game.round > 1)) {
        $("actionDescription").textContent = player.bountyTarget ? `Bounty: ${realName(player.bountyTarget)}. ${player.bountyFailed ? "Your target died without being voted out. Your bounty cannot be changed." : "Have them voted out while you remain alive."}` : "You did not mark a bounty in round 1. Your objective can no longer be completed.";
        game.selectedAction = "none";
        $("confirmActionButton").textContent = "CONTINUE";
        $("confirmActionButton").onclick = completeAbility;
        setScreen("actionScreen"); return;
    }
    if (!canAct(player)) {

        if (player.role === "diseased") {

            $("actionDescription").textContent =
                "You are Diseased. You cannot use an ability.";

        } else if (
            player.role === "infected"
        ) {

            /*
               Keep this neutral.
               Do not reveal infection.
            */

            $("actionDescription").textContent =
                "You have no ability to use this round.";

        } else if (player.role === "silencer" && player.lastSilenceRound != null && game.round < player.lastSilenceRound + 2) {
            $("actionDescription").textContent = `Your silence is recharging. Available in round ${player.lastSilenceRound + 2}.`;
        } else if (
            game.blockedPlayers.has(player.id)
        ) {

            $("actionDescription").textContent =
                "Your ability was blocked this round.";

        } else if (
            !game.systems.power &&
            player.role !== "engineer"
        ) {

            $("actionDescription").textContent =
                "POWER IS OFFLINE. Your ability cannot be used.";

        } else {

            $("actionDescription").textContent =
                "Your ability cannot be used this round.";
        }

        $("confirmActionButton").textContent =
            "CONTINUE";

        $("confirmActionButton").onclick =
            completeAbility;

        setScreen("actionScreen");

        return;
    }

    /*
       ALIEN
    */

    if (player.role === "bountyhunter") renderTargetChoices(player, "bounty");
    else if (player.role === "oracle") renderOracleChoices(player);
    else if (player.role === "technician") renderTargetChoices(player, "backup");
    else if (player.role === "analyst") renderTargetChoices(player, "analyse");
    else if (player.role === "alien") {

        const saboteurAlive = online.connected && !online.isHost ? online.saboteurAlive : living().some(p => p.role === "saboteur");

        $("actionDescription").textContent =
            saboteurAlive
                ? "A living Saboteur exists. You can only kill."
                : "Choose Kill or Sabotage.";

        $("actionOptions").innerHTML = `
            ${button("☠️ KILL", "kill")}
            ${
                saboteurAlive
                    ? ""
                    : button("💥 SABOTAGE", "sabotage")
            }
        `;

        $("actionOptions")
            .querySelectorAll("button")
            .forEach(btn => {

                btn.onclick = () => {

                    game.selectedAction =
                        btn.dataset.value;

                    $("actionOptions")
                        .querySelectorAll("button")
                        .forEach(
                            b =>
                                b.classList.remove(
                                    "selected"
                                )
                        );

                    btn.classList.add("selected");

                    if (
                        btn.dataset.value ===
                        "kill"
                    ) {

                        renderTargetChoices(
                            player,
                            "kill"
                        );

                    } else {

                        renderSystemChoices(
                            false
                        );
                    }
                };
            });

        /*
           Default to kill.
        */

        if (saboteurAlive) {

            game.selectedAction =
                "kill";

            renderTargetChoices(
                player,
                "kill"
            );
        }
    }

    /*
       SABOTEUR
    */

    else if (
        player.role === "saboteur"
    ) {

        renderSystemChoices(false);
    }

    /*
       SILENCER
    */

    else if (
        player.role === "silencer"
    ) {

        renderTargetChoices(
            player,
            "silence"
        );
    }

    /*
       PARASITE
    */

    else if (
        player.role === "parasite"
    ) {

        if (player.hasInfected) {

            $("actionDescription").textContent =
                "You already used your infection.";

            game.selectedAction = "none";

        } else {

            renderTargetChoices(
                player,
                "infect"
            );
        }
    }

    /*
       ENGINEER
    */

    else if (
        player.role === "engineer"
    ) {

        renderSystemChoices(true);
    }

    /*
       SCIENTIST
    */

    else if (
        player.role === "scientist"
    ) {

        renderScientistChoices(player);
    }

    /*
       DETECTIVE
    */

    else if (
        player.role === "detective"
    ) {

        renderTargetChoices(
            player,
            "detect"
        );
    }

    /*
       MEDIC
    */

    else if (
        player.role === "medic"
    ) {

        renderTargetChoices(
            player,
            "protect"
        );
    }

    /*
       GUARD
    */

    else if (
        player.role === "guard"
    ) {

        renderTargetChoices(
            player,
            "block"
        );
    }

    /*
       RADIO
    */

    else if (
        player.role === "radio"
    ) {

        if (!game.systems.communications) {

            $("actionDescription").textContent =
                "COMMUNICATIONS IS OFFLINE.";

            game.selectedAction =
                "none";

        } else {

            $("actionDescription").textContent =
                "Choose whether to receive a private message from Earth.";

            $("actionOptions").innerHTML =
                button(
                    "📻 RECEIVE EARTH MESSAGE",
                    "radio"
                );

            $("actionOptions")
                .querySelector("button")
                .onclick = () => {

                    game.selectedAction =
                        "radio";

                    $("actionOptions")
                        .querySelector("button")
                        .classList.add(
                            "selected"
                        );
                };
        }
    }

    /*
       CAPTAIN
    */

    else if (
        player.role === "captain"
    ) {

        $("actionDescription").textContent =
            "Your ability activates automatically if the vote ties.";

        game.selectedAction =
            "none";
    }

    /*
       JUDGE
    */

    else if (
        player.role === "judge"
    ) {

        $("actionDescription").textContent =
            "If a player would be ejected, you may be asked whether to cancel the ejection.";

        game.selectedAction =
            "none";
    }

    /*
       TRICKSTER
    */

    else if (
        player.role === "trickster"
    ) {

        if (player.tricksterUsed) {

            $("actionDescription").textContent =
                "You already used your Trickster swap.";

            game.selectedAction =
                "none";

        } else {

            renderSwapChoices(player);
        }
    }

    else {

        $("actionDescription").textContent =
            "No ability.";

        game.selectedAction =
            "none";
    }

    $("confirmActionButton").textContent =
        "CONFIRM";

    $("confirmActionButton").onclick =
        completeAbility;

    setScreen("actionScreen");
}


/* =========================================================
   TARGET CHOICES
   ========================================================= */

function renderTargetChoices(
    player,
    action
) {

    const descriptions = {
        bounty: "Choose your bounty once. You win if they are voted out while you are alive; kills do not count.",
        backup: "Choose another player to receive backup power for this round.",
        analyse: "Choose another player whose investigative result you will receive privately.",

        kill:
            "Choose a player to kill.",

        silence:
            "Choose a player to silence for 2 rounds.",

        infect:
            "Choose a player to infect.",

        detect:
            "Choose a player to investigate.",

        protect:
            "Choose a player to protect.",

        block:
            "Choose a player's ability to block."
    };

    $("actionDescription").textContent =
        descriptions[action] ||
        "Choose a player.";

    $("actionOptions").innerHTML =
        targetOptions(player, ["bounty", "backup", "analyse"].includes(action) ? player.id : null)
            .map(
                option =>
                    button(
                        esc(option.label),
                        option.id
                    )
            )
            .join("");

    $("actionOptions")
        .querySelectorAll("button")
        .forEach(btn => {

            btn.onclick = () => {

                game.selectedAction =
                    JSON.stringify({
                        type: action,
                        target:
                            btn.dataset.value
                    });

                $("actionOptions")
                    .querySelectorAll("button")
                    .forEach(
                        b =>
                            b.classList.remove(
                                "selected"
                            )
                    );

                btn.classList.add("selected");
            };
        });
}


/* =========================================================
   SYSTEM CHOICES
   ========================================================= */

function canRepairSystem(system) {
    return game.systems[system] === false && (game.sabotagedAt[system] == null || game.round > game.sabotagedAt[system]);
}

function abilityOrder(ids) {
    // Support is granted before the recipient needs to use it.
    const priority = id => ["technician", "bountyhunter"].includes(getPlayer(id)?.role) ? 0 : 1;
    return [...ids].sort((a, b) => priority(a) - priority(b));
}

function privateInvestigation(player, message) {
    game.investigationResults[player.id] = message;
    game.reactionInfo[player.id] = message;
}

function resolveAnalystResults() {
    for (const player of living().filter(p => p.role === "analyst")) {
        const action = game.actions[player.id];
        if (action?.type !== "analyse" || game.blockedPlayers.has(player.id)) continue;
        const target = getPlayer(action.target);
        const result = alive(target) && game.investigationResults[target.id];
        const message = result ? `ANALYST: ${displayName(target.id)} received:\n${result}` : "ANALYST: Your chosen player received no investigative result this round.";
        game.reactionInfo[player.id] = [game.reactionInfo[player.id], message].filter(Boolean).join("\n\n");
    }
}

function settleVoteObjectives(ejectedId) {
    if (game.objectiveVoteRound === game.round || game.gameOver) return false;
    game.objectiveVoteRound = game.round;
    const outcome = ejectedId || "skip";
    const winners = [];
    const ejected = getPlayer(ejectedId);
    if (ejected?.role === "jester") winners.push(ejected);
    for (const player of living()) {
        if (player.role === "bountyhunter" && ejectedId && player.bountyTarget === ejectedId) winners.push(player);
        if (player.role !== "oracle") continue;
        const prediction = game.oraclePredictions[player.id];
        if (!prediction) continue;
        const correct = prediction === outcome;
        if (correct) {
            player.oracleCorrect = (player.oracleCorrect || 0) + 1;
            if (outcome !== "skip") player.oraclePlayerCorrect = true;
        }
        player.lastOracleResult = {round: game.round, message: `ORACLE: ${correct ? "Correct prediction" : "Incorrect prediction"}. ${player.oracleCorrect || 0} / 3 correct; player ejection ${player.oraclePlayerCorrect ? "confirmed" : "still required"}.`};
        if (player.oracleCorrect >= 3 && player.oraclePlayerCorrect) winners.push(player);
    }
    if (!winners.length) return false;
    const title = winners.every(p => p.role === "bountyhunter") ? "BOUNTY HUNTER WINS" : winners.every(p => p.role === "oracle") ? "ORACLE WINS" : winners.every(p => p.role === "jester") ? "JESTER WINS" : "NEUTRAL OBJECTIVE VICTORY";
    endGame(title, `${winners.map(p => p.name).join(", ")} completed their independent objectives.`);
    return true;
}

function renderOracleChoices(player) {
    $("actionDescription").textContent = `${player.lastOracleResult?.message || "Predict the final ejection after Captain and Judge decisions."} Progress: ${player.oracleCorrect || 0} / 3. At least one correct player ejection is required.`;
    $("actionOptions").innerHTML = [...living().map(p => button(esc(displayName(p.id)), p.id)), button("NO EJECTION", "skip")].join("");
    $("actionOptions").querySelectorAll("button").forEach(btn => {
        btn.onclick = () => {
            game.selectedAction = JSON.stringify({type: "predict", target: btn.dataset.value});
            $("actionOptions").querySelectorAll("button").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
        };
    });
}

function renderSystemChoices(
    engineer = false
) {

    const systems =
        engineer
            ? Object.keys(game.systems)
                .filter(
                    system =>
                        canRepairSystem(system)
                )
            : Object.keys(game.systems).filter(system => game.systems[system]);

    if (!systems.length) {

        $("actionDescription").textContent =
            engineer
                ? Object.values(game.systems).some(value => !value) ? "Fresh sabotage cannot be repaired until next round." : "There are no offline systems to repair."
                : "No systems available.";

        game.selectedAction =
            "none";

        return;
    }

    $("actionDescription").textContent =
        engineer
            ? "Choose an offline system to repair."
            : "Choose a ship system to sabotage.";

    $("actionOptions").innerHTML =
        systems
            .map(
                system =>
                    button(
                        `${
                            game.systems[system]
                                ? "🟢"
                                : "🔴"
                        } ${system.toUpperCase()}`,
                        system
                    )
            )
            .join("");

    $("actionOptions")
        .querySelectorAll("button")
        .forEach(btn => {

            btn.onclick = () => {

                game.selectedAction =
                    JSON.stringify({
                        type:
                            engineer
                                ? "repair"
                                : "sabotage",
                        system:
                            btn.dataset.value
                    });

                $("actionOptions")
                    .querySelectorAll("button")
                    .forEach(
                        b =>
                            b.classList.remove(
                                "selected"
                            )
                    );

                btn.classList.add("selected");
            };
        });
}


/* =========================================================
   SCIENTIST
   ========================================================= */

function renderScientistChoices(player) {

    $("actionDescription").textContent =
        "Choose a living player to check. You will see their infection status.";

    $("actionOptions").innerHTML =
        targetOptions(player)
            .map(
                option =>
                    button(
                        esc(option.label),
                        option.id
                    )
            )
            .join("");

    $("actionOptions")
        .querySelectorAll("button")
        .forEach(btn => {

            btn.onclick = () => {

                const target =
                    getPlayer(
                        btn.dataset.value
                    );

                if (!target) return;

                const canCure =
                    target.role === "infected" ||
                    target.role === "diseased";

                $("actionOptions").innerHTML = `
                    ${button(
                        "🔬 CHECK",
                        "check"
                    )}

                    ${
                        canCure
                            ? button(
                                "💉 CURE",
                                "cure"
                            )
                            : ""
                    }
                `;

                $("actionOptions")
                    .querySelectorAll("button")
                    .forEach(option => {

                        option.onclick = () => {

                            const mode =
                                option.dataset.value;

                            game.selectedAction =
                                JSON.stringify({
                                    type: "science",
                                    target:
                                        target.id,
                                    mode
                                });

                            $("actionOptions")
                                .querySelectorAll(
                                    "button"
                                )
                                .forEach(
                                    b =>
                                        b.classList.remove(
                                            "selected"
                                        )
                                );

                            option.classList.add(
                                "selected"
                            );
                        };
                    });
            };
        });
}


/* =========================================================
   TRICKSTER
   ========================================================= */

function renderSwapChoices(player) {

    const ids =
        living().map(
            p => p.id
        );

    $("actionDescription").textContent =
        "Choose TWO living players whose displayed identities will be swapped through voting.";

    $("actionOptions").innerHTML =
        ids.map(
            id =>
                button(
                    esc(displayName(id)),
                    id
                )
        ).join("");

    const chosen = [];

    $("actionOptions")
        .querySelectorAll("button")
        .forEach(btn => {

            btn.onclick = () => {

                const id =
                    btn.dataset.value;

                const existing =
                    chosen.indexOf(id);

                if (existing >= 0) {

                    chosen.splice(
                        existing,
                        1
                    );

                    btn.classList.remove(
                        "selected"
                    );

                } else if (
                    chosen.length < 2
                ) {

                    chosen.push(id);

                    btn.classList.add(
                        "selected"
                    );
                }

                if (
                    chosen.length === 2
                ) {

                    game.selectedAction =
                        JSON.stringify({
                            type: "swap",
                            a: chosen[0],
                            b: chosen[1]
                        });

                } else {

                    game.selectedAction =
                        null;
                }
            };
        });
}


/* =========================================================
   COMPLETE ABILITY
   ========================================================= */

function normaliseAction(value) {
    if (value === "radio") return {type: "radio"};
    if (value === "none" || value == null) return {type: "none"};
    if (typeof value === "string") {
        try { return JSON.parse(value); } catch { return {type: "none"}; }
    }
    return value;
}

function completeAbility() {
    if (game.mode === "online") { onlineCompleteAbility(); return; }
    const player = getPlayer(game.abilityQueue[game.abilityIndex]);
    if (!player) { advanceAbility(); return; }
    const action = normaliseAction(game.selectedAction);
    if (!validateAction(player, action)) { alert("Choose a valid action or target."); return; }
    game.actions[player.id] = action;
    applyImmediateAction(player, action);
    advanceAbility();
}

function advanceAbility() {

    game.abilityIndex++;

    if (
        game.abilityIndex <
        game.abilityQueue.length
    ) {

        passToAbility();

    } else {

        resolveAbilities();
    }
}


/* =========================================================
   APPLY IMMEDIATE ACTIONS
   ========================================================= */

function applyImmediateAction(
    player,
    action
) {

    if (!action || !action.type || !canAct(player)) return;

    if (action.type === "bounty" && player.role === "bountyhunter" && !player.bountyTarget) {
        if (action.target !== player.id && alive(getPlayer(action.target))) {
            player.bountyTarget = action.target;
            game.reactionInfo[player.id] = `BOUNTY: ${realName(action.target)} is your permanent target.`;
        }
        return;
    }
    if (action.type === "predict" && player.role === "oracle") {
        game.oraclePredictions[player.id] = action.target;
        game.reactionInfo[player.id] = "ORACLE: Your prediction is sealed until the vote resolves.";
        return;
    }
    if (action.type === "backup" && player.role === "technician" && alive(getPlayer(action.target)) && action.target !== player.id) {
        game.backupPowered.add(action.target);
        game.reactionInfo[player.id] = `TECHNICIAN: Backup power supplied to ${displayName(action.target)} for this round.`;
        return;
    }
    if (action.type === "analyse" && player.role === "analyst") return;
    /*
       ENGINEER
    */

    if (
        action.type === "repair" &&
        player.role === "engineer"
    ) {

        if (
            canRepairSystem(action.system)
        ) {

game.systems[action.system] =
    true;

if (action.system === "o2") {
    game.o2RoundsRemaining = 3;
}

game.reactionInfo[player.id] =
    `ENGINEER: ${action.system.toUpperCase()} repaired.`;
        }

        return;
    }

    /*
       SABOTAGE
    */

    if (
        action.type === "sabotage"
    ) {

        if (
            !HOSTILES.includes(player.role)
        ) {
            return;
        }

        /*
           Alien may only sabotage if no living
           Saboteur exists.
        */

        if (
            player.role === "alien" &&
            living().some(
                p => p.role === "saboteur"
            )
        ) {
            return;
        }

        if (
            game.systems[action.system] === true
        ) {

           game.sabotagedAt[action.system] = game.round;
           game.systems[action.system] =
    false;

if (action.system === "o2") {
    game.o2RoundsRemaining = 3;
}

game.reactionInfo[player.id] =
    `SABOTAGE: ${action.system.toUpperCase()} is OFFLINE.`;
           
        }

        return;
    }

    /*
       PROTECTION
    */

    if (
        action.type === "protect"
    ) {

        if (getPlayer(action.target)) {

            game.protectedPlayers.add(
                action.target
            );
        }

        return;
    }

    /*
       BLOCK
    */

    if (
        action.type === "block"
    ) {

        if (getPlayer(action.target)) {

            game.blockedPlayers.add(
                action.target
            );
        }

        return;
    }

    /*
       SILENCE
    */

    if (
        action.type === "silence"
    ) {

        if (player.role === "silencer" && alive(getPlayer(action.target))) {
            player.lastSilenceRound = game.round;
            game.silencedUntil[
                action.target
            ] =
                Math.max(
                    game.silencedUntil[
                        action.target
                    ] || 0,
                    game.round + 2
                );
        }

        return;
    }

    /*
       PARASITE INFECTION

       IMPORTANT:
       No infection message is shown to target.
    */

    if (
        action.type === "infect"
    ) {

        if (
            player.role !== "parasite" ||
            player.hasInfected
        ) {
            return;
        }

        const target =
            getPlayer(action.target);

        if (
            !target ||
            !alive(target) ||
            target.id === player.id ||
            game.blockedPlayers.has(
                player.id
            )
        ) {
            return;
        }

        /*
           A player can only be infected once.
        */

        if (
            target.infectionRound !== null
        ) {
            return;
        }

        player.hasInfected = true;

        target.infectionRound =
            game.round;

        target.originalRole =
            target.role;

        target.role =
            "infected";

        target.hasInfected = false;

        /*
           DO NOT add a message to target.
        */

        return;
    }

    /*
       SCIENTIST
    */

    if (
        action.type === "science"
    ) {

        const target =
            getPlayer(action.target);

        if (!target) return;

        if (
            action.mode === "check"
        ) {

            let status;

            if (
                target.role === "infected"
            ) {
                status = "Infected";
            } else if (
                target.role === "diseased"
            ) {
                status = "Diseased";
            } else if (
                target.role === "parasite"
            ) {
                status = "Parasite";
            } else {
                status = "Healthy";
            }

            privateInvestigation(player, `SCIENCE: ${target.name} is ${status}.`);

        } else if (
            action.mode === "cure"
        ) {

            if (
                target.role === "infected" ||
                target.role === "diseased"
            ) {

                target.role =
                    "survivor";

                target.infectionRound =
                    null;

                target.hasInfected =
                    false;

                game.reactionInfo[player.id] =
                    `SCIENCE: ${target.name} was cured and is now a Survivor.`;

                /*
                   The cured player can know they were cured,
                   but never receives the original infection message.
                */

                if (
                    target.id !== player.id
                ) {

                    game.reactionInfo[
                        target.id
                    ] =
                        "You were cured by the Scientist and are now a Survivor.";
                }
            }
        }

        return;
    }

    /*
       DETECTIVE
    */

    if (
        action.type === "detect"
    ) {

        const target =
            getPlayer(action.target);

        if (!target) return;

        const previous =
            game.previousActions[
                target.id
            ];

        privateInvestigation(player, detectiveMessage(target, previous));

        return;
    }

    /*
       RADIO
    */

    if (
        action.type === "radio"
    ) {

        privateInvestigation(player, randomRadioMessage());

        return;
    }

    /*
       TRICKSTER
    */

    if (
        action.type === "swap"
    ) {

        if (
            player.role !== "trickster" ||
            player.tricksterUsed
        ) {
            return;
        }

        const a =
            getPlayer(action.a);

        const b =
            getPlayer(action.b);

        if (
            !a ||
            !b ||
            !alive(a) ||
            !alive(b) ||
            a.id === b.id
        ) {
            return;
        }

        game.displaySwap = [
            a.id,
            b.id
        ];

        player.tricksterUsed = true;
        game.reactionInfo[player.id] = "TRICKSTER: Your identity swap is active through voting.";

        return;
    }
}


/* =========================================================
   DETECTIVE MESSAGE
   ========================================================= */

function detectiveMessage(
    target,
    previous
) {

    if (!previous) {

        return `DETECTIVE: ${target.name} did not interact with anything last round.`;
    }

    if (
        previous.type === "none"
    ) {

        return `DETECTIVE: ${target.name} did not use an ability last round.`;
    }

    if (
        previous.type === "kill"
    ) {

        return `DETECTIVE: ${target.name} interacted with a player last round.`;
    }

    if (
        previous.type === "sabotage"
    ) {

        return `DETECTIVE: ${target.name} interacted with a ship system last round.`;
    }

    if (
        previous.type === "repair"
    ) {

        return `DETECTIVE: ${target.name} interacted with a ship system last round.`;
    }

    if (
        previous.type === "protect"
    ) {

        return `DETECTIVE: ${target.name} interacted with a player last round.`;
    }

    if (
        previous.type === "block"
    ) {

        return `DETECTIVE: ${target.name} interacted with a player last round.`;
    }

    if (
        previous.type === "silence"
    ) {

        return `DETECTIVE: ${target.name} interacted with a player last round.`;
    }

    if (
        previous.type === "infect"
    ) {

        return `DETECTIVE: ${target.name} interacted with a player last round.`;
    }

    if (
        previous.type === "science"
    ) {

        return `DETECTIVE: ${target.name} interacted with a player last round.`;
    }

    if (
        previous.type === "swap"
    ) {

        return `DETECTIVE: ${target.name} interacted with multiple players last round.`;
    }

    return `DETECTIVE: ${target.name} interacted with something last round.`;
}


/* =========================================================
   RADIO MESSAGES
   ========================================================= */

function randomRadioMessage() {
    const crew = living();
    const hostiles = crew.filter(isHostile);
    const messages = [
        `EARTH: There are exactly ${hostiles.length} hostile players remaining.`,
        `EARTH: ${crew.length} crew members are still alive.`,
        `EARTH: Engines are ${game.systems.engines ? "online" : "offline"}. Current flight stage: ${game.stage} / 10.`,
        "EARTH: Communications link is currently stable."
    ];
    // These hints must remain true in red herring games too.
    if (hostiles.length && crew.length >= 3) {
        const suspect = rand(hostiles);
        const names = shuffle([suspect, ...shuffle(crew.filter(p => p.id !== suspect.id)).slice(0, 2)]).map(p => displayName(p.id));
        messages.push(`EARTH: ${names.join(", ")} — at least one is hostile.`);
    }
    const interaction = crew.filter(p => ["repair", "sabotage"].includes(game.previousActions[p.id]?.type));
    if (interaction.length) messages.push(`EARTH: ${displayName(rand(interaction).id)} interacted with a ship system last round.`);
    return rand(messages);
}

/* =========================================================
   RESOLVE ABILITIES
   ========================================================= */

function resolveAbilities() {

    /*
       KILLS happen after protection and blocking
       have been determined.
    */

    const killActions =
        Object.entries(game.actions)
            .filter(
                ([, action]) =>
                    action.type === "kill"
            );

    for (
        const [actorId, action]
        of killActions
    ) {

        const actor =
            getPlayer(actorId);

        const target =
            getPlayer(action.target);

        if (
            !actor ||
            !target ||
            !alive(actor) ||
            !alive(target)
        ) {
            continue;
        }

        if (
            game.blockedPlayers.has(
                actor.id
            )
        ) {
            continue;
        }

        if (
            game.protectedPlayers.has(
                target.id
            )
        ) {

            game.reactionInfo[target.id] =
                "You survived an attack this round.";

            continue;
        }

        /*
           Hostiles cannot normally kill Hostiles.
           Trickster can cause apparent identity confusion,
           but underlying role remains unchanged.
        */

        if (
            isHostile(target) &&
            isHostile(actor) &&
            !game.players.every(p => roleTeam(p.originalRole) === "Hostile")
        ) {

            if (
                !(
                    game.displaySwap &&
                    game.displaySwap.includes(
                        target.id
                    )
                )
            ) {
                continue;
            }
        }

        target.alive = false;

        game.reactionInfo[target.id] =
            "You were eliminated this round.";

        game.lastRoundResults.push(
            `${displayName(target.id)} was eliminated.`
        );
    }

    /*
       Reaction queue contains EVERYONE alive at
       the beginning of the round.

       Therefore someone killed during the ability
       phase still gets a Reaction result.
    */

    for (const player of game.players) {
        if (player.bountyTarget && !alive(getPlayer(player.bountyTarget))) player.bountyFailed = true;
    }
    resolveAnalystResults();
    if (checkFinalTwoJesterVictory()) return;

    game.reactionQueue =
        [...game.roundStartAliveIds];

    game.reactionIndex = 0;

    if (game.mode !== "online") showReactionPass();
}


/* =========================================================
   REACTION PASS
   ========================================================= */

function showReactionPass() {

    if (
        game.reactionIndex >=
        game.reactionQueue.length
    ) {

        showDiscussion();

        return;
    }

    const player =
        getPlayer(
            game.reactionQueue[
                game.reactionIndex
            ]
        );

    if (!player) {

        advanceReaction();

        return;
    }

    $("reactionRound").textContent =
        `ROUND ${game.round}`;

    $("reactionStage").textContent =
        `STAGE ${game.stage} / 10`;

    $("reactionPlayerName").textContent =
        player.name;

    /*
       Reuse pass screen style through the
       existing reaction screen.
    */

    setScreen("reactionScreen");
}


function showReactionResult() {

    if (game.mode === "online") {

        onlineShowPrivateReaction();

        return;
    }

    const player =
        getPlayer(
            game.reactionQueue[
                game.reactionIndex
            ]
        );

    if (!player) {

        advanceReaction();

        return;
    }

    $("reactionResultTitle").textContent =
        "ROUND RESULT";

    let message =
        game.reactionInfo[player.id];

    /*
       Diseased/Parasite transformation messages
       are allowed to be shown privately.
    */

    if (!message) {

        if (
            player.role === "diseased" &&
            player.infectionRound !== null &&
            game.round -
            player.infectionRound +
            1 === 2
        ) {

            message =
                "You became DISEASED. You are on the HOSTILE TEAM.";

        } else if (
            player.role === "parasite" &&
            player.infectionRound !== null &&
            game.round -
            player.infectionRound +
            1 >= 3
        ) {

            message =
                "You became a PARASITE. You are on the HOSTILE TEAM.";

        } else {

            message =
                "Nothing happened to you this round.";
        }
    }

    /*
       A dead player still gets their reaction result,
       but doesn't receive future turns.
    */

    if (!player.alive) {

        message +=
            "\n\nYou are no longer alive and will not participate in future rounds.";
    }

    $("reactionResultMessage").textContent =
        message;

    $("reactionContinueButton").onclick =
        advanceReaction;

    setScreen("reactionResultScreen");
}


function advanceReaction() {

    game.reactionIndex++;

    if (
        game.reactionIndex <
        game.reactionQueue.length
    ) {

        showReactionPass();

    } else {

        showDiscussion();
    }
}


function updateOxygenCountdown() {

    if (game.systems.o2) {
        return "";
    }

    const rounds =
        game.o2RoundsRemaining;

    if (rounds <= 0) {
        return "☠️ OXYGEN HAS RUN OUT. THE HOSTILE TEAM WINS.";
    }

return `⚠️ OXYGEN WILL RUN OUT IN ${rounds} ${
    rounds === 1
        ? "ROUND"
        : "ROUNDS"
}.`;
}

function advanceOxygenCountdown() {

    if (game.systems.o2) {
        return false;
    }

    game.o2RoundsRemaining--;

    if (
        game.o2RoundsRemaining <= 0
    ) {
        endGame(
            "HOSTILE VICTORY",
            "OXYGEN HAS RUN OUT. The Hostile team wins."
        );

        return true;
    }

    return false;
}

/* =========================================================
   DISCUSSION
   ========================================================= */

function showDiscussion() {

    $("discussionRound").textContent =
        `ROUND ${game.round}`;

    $("discussionStage").textContent =
        `STAGE ${game.stage} / 10`;

    const results = [];

    if (!game.systems.o2) {
        const rounds = game.o2RoundsRemaining;

        results.push(
            `⚠️ OXYGEN WILL RUN OUT IN ${rounds} ${
                rounds === 1 ? "ROUND" : "ROUNDS"
            }.`
        );
    }

    if (game.lastRoundResults.length) {
        results.push(
            ...game.lastRoundResults
        );
    } else if (!results.length) {
        results.push(
            "No public eliminations this round."
        );
    }

    $("roundResults").innerHTML =
        results
            .map(
                result =>
                    `<div>${esc(result)}</div>`
            )
            .join("");

    $("startVotingButton").onclick =
        startVoting;

    setScreen("discussionScreen");
}

/* =========================================================
   VOTING
   ========================================================= */

function startVoting() {

    if (game.mode === "online") {

        onlineStartVoting();

        return;
    }

    game.votes = {};

    game.currentVoteIndex = 0;

    showVote();
}


function showVote() {

    const alivePlayers =
        living();

    if (
        game.currentVoteIndex >=
        alivePlayers.length
    ) {

        resolveVoting();

        return;
    }

    const player =
        alivePlayers[
            game.currentVoteIndex
        ];

    $("votingRound").textContent =
        `ROUND ${game.round}`;

    $("votingStage").textContent =
        `STAGE ${game.stage} / 10`;

    $("voterName").textContent =
        player.name;

    const silenced =
        (
            game.silencedUntil[
                player.id
            ] || 0
        ) > game.round;

    $("votingSilenced").textContent =
        silenced
            ? "🔇 YOU ARE SILENCED — YOU CANNOT VOTE"
            : "";

    if (silenced) {

        $("voteOptions").innerHTML =
            button(
                "SKIP (SILENCED)",
                "skip"
            );

    } else {

        $("voteOptions").innerHTML =
            [
                ...living()
                    .filter(
                        target =>
                            target.id !==
                            player.id
                    )
                    .map(
                        target =>
                            button(
                                esc(
                                    displayName(
                                        target.id
                                    )
                                ),
                                target.id
                            )
                    ),

                button(
                    "⏭️ SKIP",
                    "skip"
                )
            ].join("");
    }

    game.selectedVote = null;

    $("voteOptions")
        .querySelectorAll("button")
        .forEach(btn => {

            btn.onclick = () => {

                game.selectedVote =
                    btn.dataset.value;

                $("voteOptions")
                    .querySelectorAll("button")
                    .forEach(
                        b =>
                            b.classList.remove(
                                "selected"
                            )
                    );

                btn.classList.add(
                    "selected"
                );
            };
        });

    $("confirmVoteButton").onclick =
        confirmVote;

    setScreen("votingScreen");
}


function confirmVote() {

    if (game.mode === "online") {

        onlineConfirmVote();

        return;
    }

    const player =
        living()[
            game.currentVoteIndex
        ];

    if (!player) return;

    if (!game.selectedVote) return;

    game.votes[player.id] =
        game.selectedVote;

    game.currentVoteIndex++;

    showVote();
}


/* =========================================================
   VOTE RESOLUTION
   ========================================================= */

function resolveVoting() {

    const tally = {};

    Object.values(game.votes)
        .forEach(vote => {

            if (
                vote === "skip"
            ) {
                return;
            }

            tally[vote] =
                (tally[vote] || 0) + 1;
        });

    const max =
        Math.max(
            0,
            ...Object.values(tally)
        );

    const tied =
        Object.keys(tally)
            .filter(
                id =>
                    tally[id] === max &&
                    max > 0
            );

    /*
       No votes.
    */

    if (!tied.length) {

        finishEjection(
            null,
            false
        );

        return;
    }

    /*
       One clear winner.
    */

    if (tied.length === 1) {

        finishEjection(
            tied[0],
            false
        );

        return;
    }

    /*
       Tie.

       Captain gets first chance.
    */

    const captain =
        living().find(
            player =>
                player.role === "captain" &&
                game.systems.power &&
                !game.blockedPlayers.has(
                    player.id
                )
        );

    if (captain) {

        showCaptainTie(
            tied,
            captain
        );

        return;
    }

    /*
       No Captain -> no ejection.
    */

    finishEjection(
        null,
        false
    );
}


/* =========================================================
   CAPTAIN TIE
   ========================================================= */

function showCaptainTie(
    tied,
    captain
) {

    $("captainTieOptions").innerHTML =
        `
            <p>
                ${
                    esc(captain.name)
                },
                choose one tied player to eject.
            </p>

            ${
                tied
                    .map(
                        id =>
                            button(
                                esc(
                                    displayName(id)
                                ),
                                id
                            )
                    )
                    .join("")
            }
        `;

    $("captainTieOptions")
        .querySelectorAll("button")
        .forEach(btn => {

            btn.onclick = () => {

                finishEjection(
                    btn.dataset.value,
                    true
                );
            };
        });

    setScreen(
        "captainTieScreen"
    );
}


/* =========================================================
   JUDGE
   ========================================================= */

function showJudgePrompt(
    ejectionId,
    byCaptain
) {

    const judge =
        living().find(
            player =>
                player.role === "judge" &&
                !game.judgeUsed &&
                game.systems.power &&
                !game.blockedPlayers.has(
                    player.id
                )
        );

    if (!judge) {

        completeEjection(
            ejectionId,
            byCaptain
        );

        return;
    }

    game.pendingEjection = {
        id: ejectionId,
        byCaptain
    };

    game.pendingJudge = true;

    if (game.mode === "online" && online.isHost) {
        sendPrivateToPlayer(judge.id, {type: "private_judge", target: ejectionId, targetName: displayName(ejectionId)});
        return;
    }
    $("judgeDescription").textContent =
        `The vote would eject ${displayName(ejectionId)}. Do you want to cancel the ejection?`;

    $("judgeCancelButton").onclick =
        () => {

            game.judgeUsed = true;

            game.pendingJudge = false;
            if (settleVoteObjectives(null)) return;

            $("voteResultTitle").textContent =
                "EJECTION CANCELLED";

            $("voteResultMessage").textContent =
                "The Judge cancelled the ejection. Nobody was voted out.";

            $("afterVoteButton").onclick =
                afterVoting;

            setScreen(
                "voteResultScreen"
            );
        };

    $("judgeAllowButton").onclick =
        () => {

            game.pendingJudge = false;

            completeEjection(
                ejectionId,
                byCaptain
            );
        };

    setScreen("judgeScreen");
}


/* =========================================================
   FINISH EJECTION
   ========================================================= */

function finishEjection(
    id,
    byCaptain
) {

    if (!id) {

        completeEjection(
            null,
            false
        );

        return;
    }

    /*
       Judge can cancel ANY ejection.

       This includes:
       - normal majority
       - Captain tie-breaker
    */

    const judge =
        living().find(
            player =>
                player.role === "judge" &&
                !game.judgeUsed &&
                game.systems.power &&
                !game.blockedPlayers.has(
                    player.id
                )
        );

    if (judge) {

        showJudgePrompt(
            id,
            byCaptain
        );

        return;
    }

    completeEjection(
        id,
        byCaptain
    );
}


function completeEjection(
    id,
    byCaptain
) {

    const ejectedName = id ? displayName(id) : "";
    game.displaySwap = null;

    if (!id) {

        $("voteResultTitle").textContent =
            "NO EJECTION";

        $("voteResultMessage").textContent =
            "Nobody was voted out.";

    } else {

        const player =
            getPlayer(id);

        if (!player) return;

        player.alive = false;

        if (
            player.role === "jester"
        ) {

            $("voteResultTitle").textContent =
                "JESTER WINS";

            $("voteResultMessage").textContent =
                `${player.name} was voted out and wins as the Jester!`;

        } else {

            $("voteResultTitle").textContent =
                "PLAYER VOTED OUT";

            $("voteResultMessage").textContent =
                `${ejectedName} was voted out.`;
        }
    }

    if (!game.gameOver && settleVoteObjectives(id)) return;
    if (!game.gameOver && checkFinalTwoJesterVictory()) return;
    if (game.mode === "online" && online.isHost) {
        online.activeTurn = null;
        if (game.gameOver) { showGameOver(); return; }
        onlineBroadcast({type: "public_update", displaySwap: null, players: game.players.map(p => ({id: p.id, name: p.name, alive: p.alive}))});
        for (const p of game.players.filter(p => p.id !== online.playerId)) sendPrivateToPlayer(p.id, {type: "private_result", title: $("voteResultTitle").textContent, message: $("voteResultMessage").textContent, objectiveFeedback: p.lastOracleResult?.round === game.round ? p.lastOracleResult.message : ""});
    }
    $("afterVoteButton").onclick =
        afterVoting;

    setScreen(
        "voteResultScreen"
    );
}


/* =========================================================
   AFTER VOTING
   ========================================================= */

function afterVoting() {

    /*
       Trickster identity swap ends after
       full vote resolution.
    */

    game.displaySwap = null;

    if (game.gameOver) {

        showGameOver();

        return;
    }

    if (checkVictory()) return;

    /*
       Earth lifeline exactly every 3 rounds.
       R3, R6, R9...
    */

    if (
        game.round % 3 === 0
    ) {

        if (
            game.systems.communications
        ) {

            game.lifelineNumber++;

            showLifeline();

        } else {

            /*
               Once Communications is offline at the
               lifeline checkpoint, that lifeline is lost.
            */

            proceedToSystems();
        }

    } else {

        proceedToSystems();
    }
}


/* =========================================================
   EARTH LIFELINE
   ========================================================= */

function showLifeline() {

    const hostiles =
        living().filter(
            isHostile
        );

    const nonHostiles =
        living().filter(
            player =>
                !isHostile(player)
        );

    const candidates = [];

    /*
       Exactly ONE actual Hostile among the clue.
    */

    const actualHostile =
        rand(hostiles);

    if (actualHostile) {

        candidates.push(
            actualHostile
        );
    }

    candidates.push(
        ...shuffle(nonHostiles)
            .slice(0, 2)
    );

    const clue =
        shuffle(candidates);

    $("lifelineTitle").textContent =
        `EARTH LIFELINE #${game.lifelineNumber}`;

    $("lifelineMessage").textContent =
        clue.length
            ? `⚠️ ONE OF THESE PLAYERS IS HOSTILE: ${clue.map(p => p.name).join(", ")}`
            : "Earth sent no useful clue.";

    $("lifelineContinue").onclick =
        proceedToSystems;

    setScreen(
        "lifelineScreen"
    );
}


/* =========================================================
   SYSTEMS
   ========================================================= */

function proceedToSystems() {

    /*
       Engines only advance if Engines is ONLINE.
    */

    if (game.systems.engines) {

        game.stage++;
    }

    /*
       Stage 10 is the final completed stage.
    */

    if (game.stage > 10) {

        earthCheck();

        return;
    }

    $("systemsRound").textContent =
        `ROUND ${game.round}`;

    $("systemsStage").textContent =
        `STAGE ${game.stage} / 10`;

    $("systemsList").innerHTML =
        Object.entries(
            game.systems
        )
            .map(
                ([system, online]) =>
                    `
                    <div>
                        ${
                            online
                                ? "🟢"
                                : "🔴"
                        }
                        <strong>
                            ${system.toUpperCase()}
                        </strong>
                        —
                        ${
                            online
                                ? "ONLINE"
                                : "OFFLINE"
                        }
                    </div>
                    `
            )
            .join("");

    $("nextRoundButton").onclick =
        () => {

            game.round++;

            game.lastRoundResults = [];

            startRound();
        };

    setScreen(
        "systemsScreen"
    );
}


/* =========================================================
   EARTH CHECK
   ========================================================= */

function earthCheck() {
    if (living().length && living().every(isHostile)) {
        endGame("HOSTILE VICTORY", "The Hostile crew reached Earth.");
        return;
    }

    const neutrals = living().filter(p => isNeutral(p) && !["bountyhunter", "oracle"].includes(p.role));

    if (neutrals.length) {

        endGame(
            "NEUTRAL VICTORY",
            "The ship reached Earth with a Neutral player still alive."
        );

        return;
    }

    if (!living().some(isHuman)) {
        endGame("VOYAGE COMPLETE", "The ship reached Earth, but no surviving player completed a winning objective.");
        return;
    }
    endGame(
        "HUMAN VICTORY",
        "The crew completed all 10 stages and reached Earth."
    );
}


/* =========================================================
   VICTORY CHECK
   ========================================================= */

function checkFinalTwoJesterVictory() {
    if (game.gameOver) return false;
    const alivePlayers = living();
    if (alivePlayers.length === 2) {
        const jester = alivePlayers.find(p => p.role === "jester");
        const other = alivePlayers.find(p => p.role !== "jester");
        if (jester && other) {
            const team = roleTeam(other);
            endGame(team === "Human" ? "HUMAN VICTORY" : team === "Hostile" ? "HOSTILE VICTORY" : "NEUTRAL VICTORY", `${other.name} reached the final 2 with the Jester. ${team} team wins.`);
            return true;
        }
    }
    return false;
}

function checkVictory() {
    if (game.gameOver) return true;
    if (checkFinalTwoJesterVictory()) return true;

    const alivePlayers = living();
    const startingTeams = new Set(game.players.map(p => roleTeam(p.originalRole)));
    if (startingTeams.size === 1) {
        const team = [...startingTeams][0];
        if (alivePlayers.length === 1 && ["bountyhunter", "oracle"].includes(alivePlayers[0].role)) return false;
        if (team !== "Human" && alivePlayers.length <= 1) {
            endGame(team === "Hostile" ? "HOSTILE VICTORY" : "NEUTRAL VICTORY", alivePlayers.length ? `${alivePlayers[0].name} is the last player aboard.` : "Nobody survived the voyage.");
            return true;
        }
        if (!alivePlayers.length) {
            endGame("CREW LOST", "Nobody survived the voyage.");
            return true;
        }
        return false;
    }

    const hostiles =
        alivePlayers.filter(
            isHostile
        ).length;

    const neutrals =
        alivePlayers.filter(
            isNeutral
        ).length;

    const nonHostiles =
        alivePlayers.filter(
            p =>
                !isHostile(p)
        ).length;

    /*
       SURVIVOR KING

       The King wins independently if they are
       one of the final 2 living players.

       This MUST happen before Hostile victory.
    */

    if (
        alivePlayers.length === 2
    ) {
        const king =
            alivePlayers.find(
                p =>
                    p.role === "king"
            );

        if (king) {
            endGame(
                "SURVIVOR KING WINS",
                `${king.name} is one of the final 2 living players.`
            );

            return true;
        }
    }

    /*
       LOCAL HUMAN VICTORY

       Humans only win when BOTH Hostiles
       AND Neutrals are completely gone.
    */

    if (
        hostiles === 0 &&
        neutrals === 0
    ) {
        endGame(
            "HUMAN VICTORY",
            "All Hostile and Neutral players have been eliminated."
        );

        return true;
    }

    /*
       HOSTILE VICTORY

       Hostiles win when they equal or outnumber
       everyone else alive.
    */

    if (
        hostiles > 0 &&
        hostiles >= nonHostiles
    ) {
        endGame(
            "HOSTILE VICTORY",
            "The Hostile team now equals or outnumbers everyone else alive."
        );

        return true;
    }

    return false;
}

/* =========================================================
   END GAME
   ========================================================= */

function endGame(
    title,
    message
) {

    game.gameOver = true;

    $("gameOverTitle").textContent =
        title;

    $("gameOverMessage").textContent =
        message;

    $("finalPlayers").innerHTML =
        game.players
            .map(player => {

                const data =
                    roleData(player.role);

                const team =
                    roleTeam(player);

                return `
                    <div
                        class="${
                            player.alive
                                ? ""
                                : "dead"
                        }"
                    >
                        <strong>
                            ${esc(player.name)}
                        </strong>

                        —
                        ${data.icon}
                        ${data.name}

                        <span
                            class="team-${teamClass(team)}"
                        >
                            [${team}]
                        </span>

                        ${
                            player.alive
                                ? "ALIVE"
                                : "DEAD"
                        }
                    </div>
                `;
            })
            .join("");

    setScreen(
        "gameOverScreen"
    );

   const returnButton =
    $("restartButton");

const returnStatus =
    $("onlineReturnStatus");

if (game.mode === "online") {

    if (returnButton) {
        returnButton.textContent =
            "RETURN TO LOBBY";

        returnButton.disabled = false;
    }

    if (returnStatus) {
        returnStatus.textContent = "";
    }

} else {

    if (returnButton) {
        returnButton.textContent =
            "PLAY AGAIN";

        returnButton.disabled = false;
    }

    if (returnStatus) {
        returnStatus.textContent = "";
    }
}
   
    if (
        game.mode === "online" &&
        online.isHost
    ) {

        onlineBroadcast({
            type: "game_over",
            title,
            message,
            players:
                game.players.map(
                    p => ({
                        id: p.id,
                        name: p.name,
                        role: p.role,
                        alive: p.alive
                    })
                )
        });
    }
}


function showGameOver() {

    endGame(
        $("voteResultTitle").textContent,
        $("voteResultMessage").textContent
    );
}


/* =========================================================
   POST-GAME RETURN TO LOBBY
   ========================================================= */

function resetGameForNewLocalGame() {
    const oldPlayers = game.players.map(player => ({
        id: player.id,
        name: player.name || `Player ${player.id.replace("p", "")}`
    }));

    game.mode = "local";

    game.players = oldPlayers.map(player => ({
        id: player.id,
        name: player.name,
        role: "survivor",
        originalRole: "survivor",
        alive: true,
        infectionRound: null,
        hasInfected: false
    }));

    game.round = 1;
    game.stage = 1;

    game.abilityQueue = [];
    game.abilityIndex = 0;

    game.reactionQueue = [];
    game.reactionIndex = 0;

    game.currentVoteIndex = 0;
    game.roundStartAliveIds = [];

    game.actions = {};
    game.previousActions = {};

    game.blockedPlayers = new Set();
    game.protectedPlayers = new Set();

    game.silencedUntil = {};
    game.votes = {};

    game.selectedAction = null;
    game.selectedVote = null;

    game.reactionInfo = {};
    game.lastRoundResults = [];

    game.lifelineNumber = 0;

    game.gameOver = false;

    game.players.forEach(p => { p.tricksterUsed = false; p.lastSilenceRound = null; p.bountyTarget = null; p.bountyFailed = false; p.oracleCorrect = 0; p.oraclePlayerCorrect = false; p.lastOracleResult = null; });
    game.sabotagedAt = {};
    game.displaySwap = null;

    game.judgeUsed = false;

    game.systems = {
        engines: true,
        o2: true,
        communications: true,
        power: true
    };

   game.o2RoundsRemaining = 3;

    game.currentPlayerIndex = 0;

    game.pendingEjection = null;
    game.pendingJudge = false;

    game.randomisedRoles = false;
    game.randomRoles = {};

    initGameUI();
    $("startVotingButton").hidden = false;
    renderSetup();
    setScreen("setupScreen");
}


function resetGameForOnlineLobby() {
    /*
       Keep the ONLINE connection and room exactly as they are.
       Only reset the actual game state.
    */

    game.mode = "online";
    online.started = false;
    online.activeTurn = null;

    const roomPlayers = Object.values(online.players)
        .filter(player => player.connected)
        .sort((a, b) => {
            return Number(a.playerId.slice(1)) -
                   Number(b.playerId.slice(1));
        });

    game.players = roomPlayers.map(player => ({
        id: player.playerId,
        name: player.name,
        role: "survivor",
        originalRole: "survivor",
        alive: true,
        infectionRound: null,
        hasInfected: false
    }));

    game.round = 1;
    game.stage = 1;

    game.abilityQueue = [];
    game.abilityIndex = 0;

    game.reactionQueue = [];
    game.reactionIndex = 0;

    game.currentVoteIndex = 0;
    game.roundStartAliveIds = [];

    game.actions = {};
    game.previousActions = {};

    game.blockedPlayers = new Set();
    game.protectedPlayers = new Set();

    game.silencedUntil = {};
    game.votes = {};

    game.selectedAction = null;
    game.selectedVote = null;

    game.reactionInfo = {};
    game.lastRoundResults = [];

    game.lifelineNumber = 0;

    game.gameOver = false;

    game.players.forEach(p => { p.tricksterUsed = false; p.lastSilenceRound = null; p.bountyTarget = null; p.bountyFailed = false; p.oracleCorrect = 0; p.oraclePlayerCorrect = false; p.lastOracleResult = null; });
    game.sabotagedAt = {};
    game.displaySwap = null;

    game.judgeUsed = false;

    game.systems = {
        engines: true,
        o2: true,
        communications: true,
        power: true
    };

    game.currentPlayerIndex = 0;

    game.pendingEjection = null;
    game.pendingJudge = false;

    game.randomisedRoles = false;
    game.randomRoles = {};

    renderSetup();
    updateOnlinePlayersUI();
    updateOnlineSetupUI();

    setScreen("setupScreen");

    updateOnlineStatus(
        `ROOM ${online.roomCode}\nWaiting in lobby...`
    );
}


function hostReturnEveryoneToLobby() {
    if (!online.isHost) return;

    /*
       Tell every connected player to return to the lobby.
    */
    onlineBroadcast({
        type: "return_to_lobby",
        roomCode: online.roomCode
    });

    /*
       Host also returns locally.
    */
    resetGameForOnlineLobby();
}


function requestReturnToLobby() {
    /*
       Local Pass & Play.
    */
    if (game.mode !== "online") {
        resetGameForNewLocalGame();
        return;
    }

    /*
       ONLINE HOST.
       Host immediately sends everyone back.
    */
    if (online.isHost) {
        hostReturnEveryoneToLobby();
        return;
    }

    /*
       ONLINE PLAYER.
       Tell the host that this player wants to return.
    */
    if (
        online.channel &&
        online.connected
    ) {
        online.channel.send({
            type: "broadcast",
            event: "alien",
            payload: {
                type: "return_to_lobby_request",
                playerId: online.playerId,
                connectionId: online.connectionId
            }
        });
    }

    const button = $("restartButton");

    if (button) {
        button.textContent =
            "WAITING FOR HOST...";

        button.disabled = true;
    }

    const status =
        $("onlineReturnStatus");

    if (status) {
        status.textContent =
            "Waiting for the host to return everyone to the lobby...";
    }
}


function handlePostGameButton() {
    requestReturnToLobby();
}


/* =========================================================
   ROLE GUIDE
   ========================================================= */

function renderRoleGuide() {

    const sections = [

        [
            "HOSTILE",
            [
                ...HOSTILES,
                "diseased"
            ]
        ],

        [
            "HUMAN",
            HUMANS
        ],

        [
            "NEUTRAL",
            NEUTRALS
        ],

        [
            "INFECTION",
            [
                "infected",
                "diseased",
                "parasite"
            ]
        ]
    ];

    $("roleGuideContent").innerHTML =
        sections
            .map(
                ([title, roles]) =>
                    `
                    <section>

                        <h3>
                            ${title}
                        </h3>

                        ${
                            roles
                                .map(
                                    role => {

                                        const data =
                                            roleData(
                                                role
                                            );

                                        return `
                                            <article
                                                class="guide-card ${teamClass(data.team)}"
                                            >

                                                <div
                                                    class="guide-icon"
                                                >
                                                    ${data.icon}
                                                </div>

                                                <div>

                                                    <strong>
                                                        ${data.name}
                                                    </strong>

                                                    <div
                                                        class="guide-team"
                                                    >
                                                        ${data.team}
                                                    </div>

                                                    <p>
                                                        ${esc(data.desc)}
                                                    </p>

                                                </div>

                                            </article>
                                        `;
                                    }
                                )
                                .join("")
                        }

                    </section>
                    `
            )
            .join("");
}


/* =========================================================
   CUSTOM ROLES
   ========================================================= */

function renderCustomRoles() {

    const groups = [
        ["HOSTILE", HOSTILES],
        ["HUMAN", HUMANS],
        ["NEUTRAL", NEUTRALS]
    ];

    $("customRoleContent").innerHTML =
        groups
            .map(
                ([title, roles]) =>
                    `
                    <section>

                        <h3>
                            ${title}
                        </h3>

                        ${
                            roles
                                .map(role => {

                                    const locked = false;

                                    return `
                                        <div
                                            class="custom-row ${
                                                locked
                                                    ? "locked"
                                                    : ""
                                            }"
                                        >

                                            <span>
                                                ${roleData(role).icon}
                                                ${roleData(role).name}
                                            </span>

                                            <label>
                                                Count

                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="12"
                                                    value="${
                                                        settings.counts[
                                                            role
                                                        ] || 0
                                                    }"
                                                    data-role-count="${role}"
                                                    ${
                                                        locked
                                                            ? "readonly"
                                                            : ""
                                                    }
                                                >
                                            </label>

                                            <label
                                                class="switch"
                                            >

                                                <input
                                                    type="checkbox"
                                                    data-role-enabled="${role}"
                                                    ${
                                                        (
                                                            settings.enabled[
                                                                role
                                                            ] ||
                                                            locked
                                                        )
                                                            ? "checked"
                                                            : ""
                                                    }
                                                    ${
                                                        locked
                                                            ? "disabled"
                                                            : ""
                                                    }
                                                >

                                                <span>
                                                    Enabled
                                                </span>

                                            </label>

                                        </div>
                                    `;
                                })
                                .join("")
                        }

                    </section>
                    `
            )
            .join("");

    $("customRoleContent")
        .querySelectorAll(
            "[data-role-enabled]"
        )
        .forEach(input => {

            input.onchange = () => {

                const role =
                    input.dataset.roleEnabled;

                settings.enabled[role] =
                    input.checked;

                if (!input.checked) {

                    settings.counts[role] =
                        0;
                }

                renderCustomRoles();
                renderSetup();
            };
        });

    $("customRoleContent")
        .querySelectorAll(
            "[data-role-count]"
        )
        .forEach(input => {

            input.onchange = () => {

                const role =
                    input.dataset.roleCount;

                settings.counts[role] =
                    Math.max(
                        0,
                        Math.min(
                            12,
                            Number(input.value) ||
                            0
                        )
                    );

                if (
                    settings.counts[role] >
                    0
                ) {

                    settings.enabled[role] =
                        true;
                }

                updatePlayerValidity();
            };
        });
}


function applyCustomRoles() {

    const count =
        game.players.length;

    const selected = [];

    Object.entries(
        settings.counts
    )
        .forEach(
            ([role, amount]) => {

                for (
                    let i = 0;
                    i < amount;
                    i++
                ) {

                    selected.push(role);
                }
            }
        );

    if (
        selected.length !== count
    ) {

        alert(
            `Custom roles must total exactly ${count} players. Current total: ${selected.length}.`
        );

        return;
    }

    setupMode = "manual";
    $("assignmentMode").value = "manual";
    $("roundComposition").disabled = true;
    game.randomRoles =
        Object.fromEntries(
            shuffle(selected)
                .map(
                    (role, index) =>
                        [index, role]
                )
        );

    game.randomisedRoles = true;

    renderSetup();

    closeModal(
        "customRoleModal"
    );
}


/* =========================================================
   MODALS
   ========================================================= */

function openModal(id) {

    $(id)?.classList.add(
        "open"
    );
}

function closeModal(id) {

    $(id)?.classList.remove(
        "open"
    );
}


/* =========================================================
   ONLINE STATE
   ========================================================= */

const online = {

    connected: false,

    name: "",

    isHost: false,

    roomCode: null,

    connectionId: null,

    playerId: null,

    channel: null,

    privateChannel: null,

    hostPrivateChannels: {},

    players: {},

    pendingRole: null,

    pendingPhase: null,

    privatePayload: null,

    connectedPlayers: 0
};


/* =========================================================
   ONLINE UI
   ========================================================= */

function ensureOnlineUI() {

    const setup =
        $("setupScreen");

    if (!setup) return;

    if (
        $("onlineModePanel")
    ) {
        return;
    }

    const panel =
        document.createElement("div");

    panel.id =
        "onlineModePanel";

    panel.innerHTML = `

        <div
            style="
                margin-top:20px;
                padding:16px;
                border:1px solid rgba(255,255,255,.15);
                border-radius:12px;
            "
        >

            <h3>
                🌐 ONLINE MODE
            </h3>

            <div
                style="
                    display:flex;
                    gap:10px;
                    flex-wrap:wrap;
                    margin-bottom:12px;
                "
            >

                <button
                    type="button"
                    id="localModeButton"
                    class="choice-button"
                >
                    📱 LOCAL MODE
                </button>

                <button
                    type="button"
                    id="onlineModeButton"
                    class="choice-button"
                >
                    🌐 ONLINE MODE
                </button>

            </div>

            <div id="onlineControls">

            <button
    type="button"
    id="onlineHostStartButton"
    class="choice-button"
    style="display:none; width:100%; margin-top:12px;"
>
    🚀 START GAME
</button>

                <button
                    type="button"
                    id="createRoomButton"
                    class="choice-button"
                >
                    CREATE ROOM
                </button>

                <input
    id="onlineNameInput"
    type="text"
    maxlength="20"
    placeholder="YOUR NAME"
    autocomplete="off"
    style="
        width:100%;
        box-sizing:border-box;
        padding:12px;
        margin-bottom:12px;
    "
>

                <div
                    style="
                        margin:12px 0;
                        text-align:center;
                    "
                >
                    OR
                </div>

                <input
                    id="onlineRoomInput"
                    type="text"
                    maxlength="5"
                    placeholder="ROOM CODE"
                    autocomplete="off"
                    autocapitalize="characters"
                    style="
                        width:100%;
                        box-sizing:border-box;
                        padding:12px;
                        margin-bottom:8px;
                    "
                >

                <button
                    type="button"
                    id="joinRoomButton"
                    class="choice-button"
                >
                    JOIN ROOM
                </button>

                <div
                    id="onlineStatus"
                    style="
                        margin-top:12px;
                        white-space:pre-wrap;
                    "
                >
                    Local mode.
                </div>

             <div
    id="onlineRoomPlayers"
    style="
        margin-top:12px;
    "
></div>

<button
    type="button"
    id="leaveLobbyButton"
    class="choice-button"
    style="
        display:none;
        width:100%;
        margin-top:12px;
    "
>
    🚪 LEAVE LOBBY
</button>

            </div>

        </div>
    `;

    setup.appendChild(panel);

    $("localModeButton").onclick =
        () => {

            game.mode = "local";

            onlineDisconnect();

            updateOnlineStatus(
                "📱 Local mode selected."
            );

            resetGameForNewLocalGame();
            updateOnlineSetupUI();
        };

    $("onlineModeButton").onclick =
    async () => {

        game.mode = "online";

        updateOnlineStatus(
            "🌐 Online mode selected.\nCreate a room or join a room."
        );

        updateOnlineSetupUI();
    };

    $("createRoomButton").onclick =
        createOnlineRoom;

    $("joinRoomButton").onclick =
        joinOnlineRoom;

   $("leaveLobbyButton").onclick =
    leaveOnlineLobby;
   
$("onlineHostStartButton").onclick =
    event => {

        event.preventDefault();

        if (!online.isHost) {
            updateOnlineStatus(
                "Only the Host can start the game."
            );
            return;
        }

        startGame();
    };

}


function setOnlineReturnButtonState(waitingForHost = false) {
    const button = $("restartButton");
    const status = $("onlineReturnStatus");

    if (!button) return;

    if (!online.connected) {
        button.textContent = "PLAY AGAIN";
        button.disabled = false;
        button.classList.remove("waiting");

        if (status) {
            status.textContent = "";
        }

        return;
    }

    if (waitingForHost) {
        button.textContent = "WAITING FOR HOST...";
        button.disabled = true;
        button.classList.add("waiting");

        if (status) {
            status.textContent = "Waiting for the host to return everyone to the lobby...";
        }
    } else {
        button.textContent = "RETURN TO LOBBY";
        button.disabled = false;
        button.classList.remove("waiting");

        if (status) {
            status.textContent = "";
        }
    }
}

async function leaveOnlineLobby() {
   
if (!online.isHost) {
    if (
        online.channel &&
        online.connected
    ) {
        await online.channel.send({
            type: "broadcast",
            event: "alien",
            payload: {
                type: "leave_request",
                connectionId:
                    online.connectionId
            }
        });
    }
}

onlineDisconnect();



game.mode = "local";

    updateOnlineStatus(
        "You left the lobby."
    );

    const leaveButton =
        $("leaveLobbyButton");

    if (leaveButton) {
        leaveButton.style.display = "none";
    }

renderSetup();
updateOnlineSetupUI();

const playersBox =
    $("onlineRoomPlayers");

if (playersBox) {
    playersBox.style.display =
        "none";
}

}

function updateOnlineSetupUI() {

    const leaveButton =
        $("leaveLobbyButton");

    if (leaveButton) {
        leaveButton.style.display =
            online.roomCode &&
            online.connected
                ? "block"
                : "none";
    }

const playersBox =
    $("onlineRoomPlayers");

if (playersBox) {
    playersBox.style.display =
        online.roomCode &&
        online.connected
            ? "block"
            : "none";
}
   
    const setupList =
        document.querySelector("#playersSetup");

    const playerValidity =
        $("playerValidity");

    const setupActions =
        document.querySelector(".setup-actions");

    const playerCount =
        $("playerCount");

    if (game.mode === "online") {

        if (setupList) {
            setupList.style.display = online.isHost ? "" : "none";
            if (online.isHost) renderSetup();
        }

        if (playerValidity)
            playerValidity.style.display = online.isHost ? "" : "none";

        if (setupActions)
            setupActions.style.display = online.isHost ? "" : "none";

        if (playerCount)
            playerCount.closest("label")?.style
                && (playerCount.closest("label").style.display = "none");

    } else {

        if (setupList)
            setupList.style.display = "";

        if (playerValidity)
            playerValidity.style.display = "";

        if (setupActions)
            setupActions.style.display = "";

        if (playerCount)
            playerCount.closest("label")?.style
                && (playerCount.closest("label").style.display = "");
    }

    document.querySelector(".mission-controls").hidden = game.mode === "online" && !online.isHost;
    $("startGameButton").hidden = game.mode === "online";

    const hostButton =
        $("onlineHostStartButton");

    if (hostButton) {
        hostButton.style.display =
            game.mode === "online" &&
            online.isHost
                ? "block"
                : "none";
    }
}

function updateOnlineStatus(
    message
) {

    const status =
        $("onlineStatus");

    if (status) {

        status.textContent =
            message;
    }
}


function updateOnlinePlayersUI() {

    const box =
        $("onlineRoomPlayers");

    if (!box) return;
   
if (
    !online.roomCode ||
    !online.connected
) {
    box.style.display = "none";
    return;
}

box.style.display = "block";
   
    const entries =
        Object.values(
            online.players
        );

    if (!entries.length) {

        box.textContent =
            "No players connected.";

        return;
    }

    box.innerHTML =
        entries
            .map(
                player =>
                    `
                    <div>
                        ${
                            player.connected
                                ? "🟢"
                                : "🔴"
                        }
                        ${esc(player.name)}
                        ${
                            player.host
                                ? " 👑 HOST"
                                : ""
                        }
                    </div>
                    `
            )
            .join("");
}


/* =========================================================
   ROOM CODE
   ========================================================= */

function createRoomCode() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (
        let i = 0;
        i < 5;
        i++
    ) {

        code +=
            chars[
                Math.floor(
                    Math.random() *
                    chars.length
                )
            ];
    }

    return code;
}



function makeConnectionId() {
    if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
    ) {
        return window.crypto.randomUUID();
    }

    return (
        "c-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 10)
    );
}


/* =========================================================
   ONLINE CREATE ROOM
   ========================================================= */

async function createOnlineRoom() {

    try {

        await loadSupabase();

        if (!supabaseClient) {

            throw new Error(
                "Supabase did not load."
            );
        }

        game.mode = "online";

        onlineDisconnect();

       const nameInput =
    $("onlineNameInput");

const name =
    nameInput?.value
        ?.trim();

if (!name) {
    alert(
        "Enter your name first."
    );

    return;
}

online.name = name;

        online.isHost = true;

        online.roomCode =
            createRoomCode();

        online.connectionId =
            makeConnectionId()

        online.playerId = "p1";

        online.connected = true;

        /*
           Host player uses first setup player.
        */

        if (!game.players.length) {

            resetSetupPlayers();
        }

        game.players = [{id: "p1", name: online.name, role: "survivor", originalRole: "survivor", alive: true, infectionRound: null, hasInfected: false}];
        game.randomisedRoles = false;
        game.randomRoles = {};
        online.players = {};

        online.players[
            online.connectionId
        ] = {

            connectionId:
                online.connectionId,

            playerId: "p1",

           name:
    online.name,

            host: true,

            connected: true
        };

        await subscribePublicRoom();

       updateOnlineSetupUI();

        updateOnlineStatus(
            `ROOM CREATED: ${online.roomCode}\nYou are Player 1 / Host.\nShare the room code with the other players.`
        );

updateOnlinePlayersUI();

renderSetup();

updateOnlineSetupUI();

    } catch (error) {

        onlineDisconnect();
        updateOnlineSetupUI();
        console.error(error);

        updateOnlineStatus(
            `❌ Could not connect to servers.\n${error.message || error}`
        );
    }
}


/* =========================================================
   ONLINE JOIN
   ========================================================= */

async function joinOnlineRoom() {

    const input =
        $("onlineRoomInput");

    const room =
        input?.value
            ?.trim()
            .toUpperCase();

   const nameInput =
    $("onlineNameInput");

const name =
    nameInput?.value
        ?.trim();

if (!name) {
    alert(
        "Enter your name first."
    );

    return;
}

online.name = name;

    if (
        !room ||
        room.length !== 5
    ) {

        alert(
            "Enter a valid 5-character room code."
        );

        return;
    }

    try {

        await loadSupabase();

        if (!supabaseClient) {

            throw new Error(
                "Supabase did not load."
            );
        }

        game.mode = "online";

        onlineDisconnect();

        online.isHost = false;

        online.roomCode = room;

        online.connectionId =
            makeConnectionId()
       
        online.connected = true;

        await subscribePublicRoom();
        await createClientPrivateChannel();

       updateOnlineSetupUI();

        updateOnlineStatus(
            `Connected to room ${room}.\nWaiting for the host...`
        );

        /*
           Tell host we joined.
        */

        online.joinTimer = setTimeout(() => { if (!online.playerId) { onlineDisconnect(); updateOnlineStatus("No host answered. Check the room code."); updateOnlineSetupUI(); } }, 12000);
        onlineBroadcast({
            type: "join_request",

            connectionId:
                online.connectionId,

           name:
    online.name,

            clientTime:
                Date.now()
        });

    } catch (error) {

        onlineDisconnect();
        updateOnlineSetupUI();
        console.error(error);

        updateOnlineStatus(
            `❌ Could not connect to servers.\n${error.message || error}`
        );
    }
}


/* =========================================================
   PUBLIC ROOM CHANNEL
   ========================================================= */

function subscribeChannel(channel) {
    return new Promise((resolve, reject) => {
        let done = false;
        const fail = status => {
            if (done) return;
            done = true;
            clearTimeout(timeout);
            supabaseClient.removeChannel(channel);
            reject(new Error(`Online connection failed (${status}). Check that the Supabase project is active, its URL and publishable key are correct, and your network allows WebSockets.`));
        };
        const timeout = setTimeout(() => fail("timeout"), 15000);
        channel.subscribe(status => {
            if (status === "SUBSCRIBED" && !done) { done = true; clearTimeout(timeout); resolve(channel); }
            else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
                if (!done) fail(status);
                else if (online.connected) updateOnlineStatus("Connection interrupted. Reconnecting… If it does not recover, leave and rejoin the room.");
            }
        });
    });
}

async function subscribePublicRoom() {
    if (!supabaseClient) throw new Error("Supabase is not available.");
    const channel = supabaseClient.channel(`alien-room-${online.roomCode}`, {config: {broadcast: {self: false, ack: true}}});
    channel.on("broadcast", {event: "alien"}, payload => handleOnlinePublicMessage(payload.payload));
    online.channel = channel;
    await subscribeChannel(channel);
}

/* =========================================================
   ONLINE PUBLIC BROADCAST
   ========================================================= */

function onlineBroadcast(data) {

    if (
        !online.channel ||
        !online.connected
    ) {
        return;
    }

    online.channel.send({
        type: "broadcast",
        event: "alien",
        payload: data
    });
}


/* =========================================================
   ONLINE PRIVATE CHANNEL
   ========================================================= */

async function createPrivateChannel(connectionId) {
    if (!supabaseClient) throw new Error("Supabase is not available.");
    const channel = supabaseClient.channel(`alien-private-${online.roomCode}-${connectionId}`, {config: {broadcast: {self: false, ack: true}}});
    channel.on("broadcast", {event: "private"}, payload => handleOnlinePrivateMessage(payload.payload, connectionId));
    return subscribeChannel(channel);
}

/* =========================================================
   SEND PRIVATE
   ========================================================= */

async function sendPrivate(connectionId, data) {
    if (online.isHost && connectionId === online.connectionId) {
        receivePrivateGameData(data);
        return;
    }
    let channel = online.hostPrivateChannels[connectionId];
    if (!channel) {
        const pending = online.privateChannelPromises ||= {};
        pending[connectionId] ||= createPrivateChannel(connectionId).then(c => online.hostPrivateChannels[connectionId] = c).finally(() => delete pending[connectionId]);
        channel = await pending[connectionId];
    }
    const status = await channel.send({type: "broadcast", event: "private", payload: data});
    if (status !== "ok") updateOnlineStatus("A private message could not be delivered. Check the room connection.");
}

/* =========================================================
   ONLINE PRIVATE SEND FROM CLIENT
   ========================================================= */

function sendPrivateToHost(data) {
    const payload = {...data, round: game.round, turnId: online.turnId, connectionId: online.connectionId};
    if (online.isHost) { handleHostPrivateRequest(payload, online.connectionId); return; }
    if (online.privateChannel) online.privateChannel.send({type: "broadcast", event: "private", payload});
}

/* =========================================================
   JOIN REQUEST HANDLING
   ========================================================= */

async function handleJoinRequest(
    data
) {

    if (!online.isHost) return;
    if (online.started) { await sendPrivate(data.connectionId, {type: "join_denied", reason: "The game has already started."}); return; }

    if (
        !data.connectionId
    ) {
        return;
    }

    /*
       Maximum 12 players.
    */

    const currentPlayers =
        Object.keys(
            online.players
        ).length;

    if (
        currentPlayers >= 12
    ) {

        await sendPrivate(
            data.connectionId,
            {
                type:
                    "join_denied",
                reason:
                    "Room is full."
            }
        );

        return;
    }

    /*
       Don't assign a duplicate connection.
    */

    if (
        online.players[
            data.connectionId
        ]
    ) {
        return;
    }

    const usedIds =
        Object.values(
            online.players
        )
            .map(
                p => p.playerId
            );

    let playerId = null;

    for (
        let i = 1;
        i <= 12;
        i++
    ) {

        const id =
            `p${i}`;

        if (
            !usedIds.includes(id)
        ) {

            playerId = id;

            break;
        }
    }

    if (!playerId) return;

    const index =
        Number(
            playerId.slice(1)
        ) - 1;

    if (!game.players[index]) {

        game.players[index] = {
            id: playerId,
            name:
                data.name ||
                `Player ${index + 1}`,
            role: "survivor",
            originalRole: "survivor",
            alive: true,
            infectionRound: null,
            hasInfected: false
        };

    } else {

        game.players[index].name =
            data.name ||
            game.players[index].name;
    }

    online.players[
        data.connectionId
    ] = {

        connectionId:
            data.connectionId,

        playerId,

        name:
            game.players[index].name,

        host: false,

        connected: true
    };

    /*
       Give the joining player a private channel.
    */

    try {

        online.hostPrivateChannels[
            data.connectionId
        ] =
            await createPrivateChannel(
                data.connectionId
            );

    } catch (error) {

        console.error(error);

        delete online.players[
            data.connectionId
        ];

        return;
    }

    await sendPrivate(
        data.connectionId,
        {
            type:
                "join_accepted",

            roomCode:
                online.roomCode,

            playerId,

            connectionId:
                data.connectionId,

            name:
                game.players[index].name
        }
    );

    /*
       Send public room roster.
    */

    broadcastRoomState();

    game.randomisedRoles = false;
    game.randomRoles = {};
    updateOnlineSetupUI();
    updateOnlinePlayersUI();
}

function handleLeaveRequest(
    data
) {
    if (!online.isHost) return;

    if (!data.connectionId) {
        return;
    }

    const connection = online.players[data.connectionId];
    if (online.started) {
        updateOnlineStatus(`${connection?.name || "A player"} left during the game. Return to the lobby to start again.`);
        hostReturnEveryoneToLobby();
    }
    const channel = online.hostPrivateChannels[data.connectionId];
    if (channel) supabaseClient.removeChannel(channel);
    delete online.hostPrivateChannels[data.connectionId];
    game.players = game.players.filter(p => p.id !== connection?.playerId);
    game.randomisedRoles = false;
    game.randomRoles = {};
    delete online.players[
        data.connectionId
    ];

    broadcastRoomState();
    updateOnlineSetupUI();
    updateOnlinePlayersUI();
}

/* =========================================================
   ROOM STATE
   ========================================================= */

function broadcastRoomState() {

    onlineBroadcast({
        type:
            "room_state",

        players:
            Object.values(
                online.players
            ).map(
                p => ({
                    playerId:
                        p.playerId,
                    name:
                        p.name,
                    host:
                        p.host,
                    connected:
                        p.connected
                })
            )
    });
}


/* =========================================================
   ONLINE PUBLIC MESSAGE HANDLER
   ========================================================= */

function handleOnlinePublicMessage(
    data
) {

    if (!data || !data.type) {
        return;
    }

    switch (data.type) {

        case "join_request":

            handleJoinRequest(
                data
            );

            break;

          case "leave_request":
    handleLeaveRequest(
        data
    );

    break;

        case "room_state":

            if (!online.isHost) {

                online.players = {};

                (data.players || [])
                    .forEach(
                        p => {

                            const connection =
                                Object.values(
                                    online.players
                                )
                                    .find(
                                        x =>
                                            x.playerId ===
                                            p.playerId
                                    );

                            if (connection) {
                                return;
                            }

                            /*
                               Public state does not need
                               private channel IDs.
                            */

                            online.players[
                                p.playerId
                            ] = {
                                playerId:
                                    p.playerId,
                                name:
                                    p.name,
                                host:
                                    p.host,
                                connected:
                                    p.connected
                            };
                        }
                    );

                /*
                   Keep local hostless representation.
                */

                game.players = game.players.filter(p => (data.players || []).some(x => x.playerId === p.id));
                (data.players || []).forEach(
                    p => {

                        const existing =
                            game.players.find(
                                x =>
                                    x.id ===
                                    p.playerId
                            );

                        if (!existing) {

                            game.players.push({
                                id:
                                    p.playerId,
                                name:
                                    p.name,
                                role:
                                    "survivor",
                                originalRole:
                                    "survivor",
                                alive: true,
                                infectionRound:
                                    null,
                                hasInfected:
                                    false
                            });

                        } else {

                            existing.name =
                                p.name;
                        }
                    }
                );
            }

            updateOnlinePlayersUI();

            break;


        case "game_start":

            if (!online.isHost) {

                handleOnlineGameStart(
                    data
                );
            }

            break;


        case "public_phase":

            handleOnlinePublicPhase(
                data
            );

            break;


        case "public_update":

            handleOnlinePublicUpdate(
                data
            );

            break;


        case "game_over":

            if (!online.isHost) {

                game.players =
                    data.players.map(
                        p => ({
                            ...p,
                            originalRole:
                                p.role
                        })
                    );

                endGame(
                    data.title,
                    data.message
                );
            }

            break;


case "return_to_lobby_request":

    if (online.isHost) {

        const status =
            $("onlineReturnStatus");

        if (status) {
            status.textContent =
                "A player is waiting for the host to return everyone to the lobby.";
        }
    }

    break;


case "return_to_lobby":

    if (
        !online.isHost &&
        data.roomCode === online.roomCode
    ) {
        resetGameForOnlineLobby();
    }

    break; 

    }
}


/* =========================================================
   ONLINE GAME START
   ========================================================= */

function handleOnlineGameStart(
    data
) {

    game.mode = "online";
    online.started = true;
    game.gameOver = false;

    game.round =
        data.round || 1;

    game.stage =
        data.stage || 1;

    game.systems =
        data.systems || {
            engines: true,
            o2: true,
            communications: true,
            power: true
        };

    game.players =
        (data.players || [])
            .map(
                p => ({
                    id:
                        p.id,
                    name:
                        p.name,
                    role:
                        "survivor",
                    originalRole:
                        "survivor",
                    alive:
                        true,
                    infectionRound:
                        null,
                    hasInfected:
                        false
                })
            );

    const local =
        game.players.find(
            p =>
                p.id ===
                online.playerId
        );

    if (local) {

        onlineShowPrivateRoleWaiting();
    }
}


/* =========================================================
   ONLINE HOST START
   ========================================================= */

async function onlineHostStartGame() {

    if (!online.isHost) {

        updateOnlineStatus(
            "Only the Host can start the game."
        );

        return;
    }

    const connected =
        Object.values(
            online.players
        )
            .filter(
                p => p.connected
            );

if (
    connected.length < 2
) {
    alert(
        "You need at least 2 connected players."
    );

    return;
}

    const count =
        connected.length;

    /*
       Resize game.players to connected players.
    */

    game.players =
        connected
            .sort(
                (a, b) =>
                    Number(
                        a.playerId.slice(1)
                    ) -
                    Number(
                        b.playerId.slice(1)
                    )
            )
            .map(
                p => ({
                    id:
                        p.playerId,
                    name:
                        p.name,
                    role:
                        "survivor",
                    originalRole:
                        "survivor",
                    alive:
                        true,
                    infectionRound:
                        null,
                    hasInfected:
                        false
                })
            );

    /*
       Generate roles using the same role system.
    */

    online.started = true;
    const oldMode =
        game.mode;

    game.mode =
        "local";

    /*
       Use existing setup selections if available.
    */

    try {

        assignOnlineRoles();

    } catch (error) {

        game.mode = oldMode;
        online.started = false;
        alert(
            error.message
        );

        return;
    }

    game.mode =
        oldMode;

    game.round = 1;
    game.stage = 1;

    game.gameOver = false;

    game.lifelineNumber = 0;

    game.judgeUsed = false;

    game.players.forEach(p => { p.tricksterUsed = false; p.lastSilenceRound = null; p.bountyTarget = null; p.bountyFailed = false; p.oracleCorrect = 0; p.oraclePlayerCorrect = false; p.lastOracleResult = null; });
    game.sabotagedAt = {};

    game.displaySwap = null;

game.systems = {
    engines: true,
    o2: true,
    communications: true,
    power: true
};

game.o2RoundsRemaining = 3;

resetTransient();

    /*
       Public game start contains NO roles.
    */

    onlineBroadcast({

        type:
            "game_start",

        round:
            1,

        stage:
            1,

        systems:
            game.systems,

        players:
            game.players.map(
                p => ({
                    id:
                        p.id,
                    name:
                        p.name
                })
            )
    });

    /*
       Send each player's private role.
    */

    for (
        const connection
        of Object.values(
            online.players
        )
    ) {

        const player =
            getPlayer(
                connection.playerId
            );

        if (!player) continue;

        await sendPrivateToPlayer(
            player.id,
            {
                type:
                    "private_role",

                playerId:
                    player.id,

                role:
                    player.role,

                originalRole:
                    player.originalRole,

                allies: isHostile(player) ? living().filter(p => p.id !== player.id && isHostile(p)).map(p => ({id: p.id, name: p.name})) : [],
                round: game.round
            }
        );
    }

    startRound();
}


/* =========================================================
   ONLINE ROLE ASSIGNMENT
   ========================================================= */

function assignOnlineRoles() {
    const roles = selectedStartingRoles();
    game.players.forEach((player, index) => {
        player.role = roles[index];
        player.originalRole = roles[index];
        player.alive = true;
        player.infectionRound = null;
        player.hasInfected = false;
    });
}

/* =========================================================
   ONLINE PRIVATE MESSAGE HANDLER
   ========================================================= */

function handleOnlinePrivateMessage(
    data,
    connectionId
) {

    if (!data || !data.type) {
        return;
    }

    /*
       HOST receives player requests.
    */

    if (online.isHost) {

        handleHostPrivateRequest(
            data,
            connectionId
        );

        return;
    }

    receivePrivateGameData(data);
}

function receivePrivateGameData(data) {
    if (game.gameOver && data.type.startsWith("private_")) return;
    if (data.round) game.round = data.round;
    if (data.stage) game.stage = data.stage;
    if (data.turnId) online.turnId = data.turnId;
    /*
       CLIENT receives private data.
    */

    switch (data.type) {

        case "join_accepted":

            online.playerId =
                data.playerId;

          online.name =
    data.name;

            updateOnlineStatus(
                `Joined room ${data.roomCode} as ${data.playerId}.`
            );

            clearTimeout(online.joinTimer);
            online.joinTimer = null;
            updateOnlineSetupUI();

            break;


        case "join_denied":

            onlineDisconnect();
            updateOnlineSetupUI();
            updateOnlineStatus(data.reason || "Could not join room.");

            break;


        case "private_role":

            online.pendingRole =
                data;

            onlineApplyPrivateRole(
                data
            );

            break;


        case "private_action":

            online.pendingPhase =
                "ability";

            online.pendingRole =
                data;

            onlineShowPrivateAction(
                data
            );

            break;


        case "private_reaction":

            online.pendingPhase =
                "reaction";

            online.pendingRole =
                data;

            onlineShowPrivateReaction(
                data
            );

            break;


        case "private_vote":

            online.pendingPhase =
                "vote";

            online.pendingRole =
                data;

            onlineShowPrivateVote(
                data
            );

            break;


        case "private_captain":

            onlineShowPrivateCaptain(
                data
            );

            break;


        case "private_judge":

            onlineShowPrivateJudge(
                data
            );

            break;


        case "private_result":

            onlineShowPrivateResult(
                data
            );

            break;


        case "private_discussion":

            onlineShowDiscussion(
                data
            );

            break;
    }
}


/* =========================================================
   CLIENT PRIVATE CHANNEL
   ========================================================= */

async function createClientPrivateChannel() {
    if (online.privateChannel) return;
    online.privateChannel = await createPrivateChannel(online.connectionId);
}

/* =========================================================
   HOST PRIVATE REQUEST HANDLER
   ========================================================= */

function handleHostPrivateRequest(
    data,
    connectionId
) {

    const connection =
        online.players[
            connectionId
        ];

    if (!connection) return;

    const player =
        getPlayer(
            connection.playerId
        );

    if (!player) return;

    const prompts = {ability_action: "private_action", reaction_ready: "private_reaction", vote: "private_vote", captain_choice: "private_captain", judge_choice: "private_judge"};
    if (prompts[data.type]) {
        const turn = online.activeTurn;
        if (!turn || turn.playerId !== player.id || turn.type !== prompts[data.type] || turn.id !== data.turnId || data.round !== game.round) return;
    } else return;
    switch (data.type) {

        case "ability_action":

            hostReceiveAbility(
                player,
                data.action
            );

            break;


        case "reaction_ready":

            hostReceiveReactionReady(
                player
            );

            break;


        case "vote":

            hostReceiveVote(
                player,
                data.vote
            );

            break;


        case "captain_choice":

            hostReceiveCaptainChoice(
                player,
                data.target
            );

            break;


        case "judge_choice":

            hostReceiveJudgeChoice(
                player,
                data.cancel
            );

            break;


        case "radio_request":

            hostReceiveRadioRequest(
                player
            );

            break;
    }
}


/* =========================================================
   HOST SEND PRIVATE ROLE
   ========================================================= */

function connectionForPlayer(
    playerId
) {

    return Object.values(
        online.players
    ).find(
        p =>
            p.playerId ===
            playerId
    );
}


async function sendPrivateToPlayer(playerId, data) {
    const connection = connectionForPlayer(playerId);
    if (!connection) return;
    const turnTypes = ["private_action", "private_reaction", "private_vote", "private_captain", "private_judge"];
    const payload = {...data, round: game.round, stage: game.stage};
    if (turnTypes.includes(data.type)) {
        online.turnSequence = (online.turnSequence || 0) + 1;
        payload.turnId = `${data.type}:${game.round}:${playerId}:${online.turnSequence}`;
        online.activeTurn = {id: payload.turnId, playerId, type: data.type};
    }
    await sendPrivate(connection.connectionId, payload);
}

/* =========================================================
   ONLINE HOST ROUND
   ========================================================= */

function hostStartRound() {

    startRound();
}


/* =========================================================
   ONLINE CLIENT ROLE
   ========================================================= */

function onlineShowPrivateRoleWaiting() {

    updateOnlineStatus(
        "Game started. Waiting for your private role..."
    );
}


function onlineApplyPrivateRole(
    data
) {

    const player =
        getPlayer(
            online.playerId
        );

    if (!player) return;

    player.role =
        data.role;

    player.originalRole =
        data.originalRole ||
        data.role;

    /*
       Build role screen without exposing
       anyone else's role.
    */

    $("rolePlayerName").textContent =
        player.name;

    $("roleIcon").textContent =
        roleData(player.role).icon;

    $("roleName").textContent =
        roleData(player.role).name;

    const team =
        roleTeam(player);

    $("roleName").className =
        `role-title ${teamClass(team)}`;

    $("roleTeam").textContent =
        `${team.toUpperCase()} TEAM`;

    $("roleTeam").className =
        `team-badge ${teamClass(team)}`;

    $("roleDescription").textContent =
        roleData(player.role).desc;

    $("hostileList").innerHTML =
        "";

    if (
        team === "Hostile"
    ) {

        /*
           The host can safely send ally names
           privately later if desired. For now,
           use the public role data that is available
           to the player only.
        */

        $("hostileList").innerHTML =
            `
                <div class="ally-box">
                    <strong>
                        HOSTILE ALLIES
                    </strong>
                    <br>
                    ${(data.allies || []).map(p => esc(p.name)).join(", ") || "You are the only Hostile."}
                </div>
            `;
    }

    $("showActionButton").onclick = () => onlineShowWaiting("Waiting for your ability turn…");
    setScreen(
        "roleScreen"
    );
}


/* =========================================================
   ONLINE PRIVATE ROLE SCREEN
   ========================================================= */

function onlineShowPrivateRole() {

    if (online.pendingRole) {

        onlineApplyPrivateRole(
            online.pendingRole
        );

        return;
    }

    onlineShowPrivateRoleWaiting();
}


/* =========================================================
   ONLINE PRIVATE ACTION
   ========================================================= */

function onlineShowPrivateAction(data = {}) {
    const player = getPlayer(online.playerId);
    if (!player) return;
    if (!online.isHost) {
        player.role = data.role || player.role;
        player.hasInfected = !!data.hasInfected;
        player.bountyTarget = data.bountyTarget || null;
        player.bountyFailed = !!data.bountyFailed;
        player.oracleCorrect = data.oracleCorrect || 0;
        player.oraclePlayerCorrect = !!data.oraclePlayerCorrect;
        player.lastOracleResult = data.lastOracleResult || null;
        game.backupPowered = new Set(data.backupPowered ? [player.id] : []);
        game.sabotagedAt = data.sabotagedAt || {};
        player.lastSilenceRound = data.lastSilenceRound ?? null;
        player.tricksterUsed = !!data.tricksterUsed;
        game.systems = data.systems || game.systems;
        game.displaySwap = data.displaySwap || null;
        game.blockedPlayers = new Set(data.blocked ? [player.id] : []);
        online.hostileAllyIds = data.allyIds || [];
        online.saboteurAlive = !!data.saboteurAlive;
    }
    const previous = {mode: game.mode, queue: game.abilityQueue, index: game.abilityIndex};
    try {
        game.mode = "local";
        game.abilityQueue = [player.id];
        game.abilityIndex = 0;
        showAction();
    } finally {
        game.mode = previous.mode;
        game.abilityQueue = previous.queue;
        game.abilityIndex = previous.index;
    }
    $("confirmActionButton").onclick = onlineCompleteAbility;
}

function onlineShowWaiting(message) {
    $("onlineWaitingMessage").textContent = message;
    setScreen("onlineWaitingScreen");
}

function onlineCompleteAbility() {
    const action = normaliseAction(game.selectedAction);
    if (!game.selectedAction && canAct(getPlayer(online.playerId))) { alert("Choose an action first."); return; }
    onlineShowWaiting("Action submitted. Waiting for the crew…");
    sendPrivateToHost({type: "ability_action", action});
}

/* =========================================================
   HOST ABILITY RECEIVE
   ========================================================= */

function hostReceiveAbility(
    player,
    action
) {

    /*
       Validate the action against the player's
       actual role.

       This prevents clients from pretending
       to be another role.
    */

    if (game.abilityQueue[game.abilityIndex] !== player.id || game.actions[player.id]) return;
    action = normaliseAction(action);
    const valid =
        validateAction(
            player,
            action
        );

    if (!valid) {

        updateOnlineStatus("An invalid action was rejected. The player can choose again.");
        onlineHostSendNextAbility();

        return;
    }

    online.activeTurn = null;
    game.actions[
        player.id
    ] = action;

    applyImmediateAction(
        player,
        action
    );

    onlineAdvanceHostAbility();
}


/* =========================================================
   ACTION VALIDATION
   ========================================================= */

function validateAction(
    player,
    action
) {

    if (!action || typeof action !== "object") return false;
    if (action.type === "none") return true;

    if (!alive(player)) {
        return false;
    }

    if (!canAct(player)) {

        return (
            action.type ===
            "none"
        );
    }

    switch (player.role) {
        case "bountyhunter":
            return action.type === "bounty" && !player.bountyTarget && !player.bountyFailed && action.target !== player.id && alive(getPlayer(action.target));
        case "oracle":
            return action.type === "predict" && !game.oraclePredictions[player.id] && (action.target === "skip" || alive(getPlayer(action.target)));
        case "technician":
            return action.type === "backup" && action.target !== player.id && alive(getPlayer(action.target));
        case "analyst":
            return action.type === "analyse" && action.target !== player.id && alive(getPlayer(action.target));

        case "alien":

            if (
                action.type ===
                "kill"
            ) {

                const target =
                    getPlayer(
                        action.target
                    );

                return (
                    !!target &&
                    alive(target) && target.id !== player.id &&
                    targetOptions(player, player.id).some(p => p.id === target.id)
                );
            }

            if (
                action.type ===
                "sabotage"
            ) {

                return (
                    !living().some(
                        p =>
                            p.role ===
                            "saboteur"
                    ) &&
                    !!game.systems[
                        action.system
                    ]
                );
            }

            return false;


        case "saboteur":

            return (
                action.type ===
                "sabotage" &&
                game.systems[action.system] === true
            );


        case "silencer":

            return (
                action.type ===
                "silence" &&
                !!getPlayer(
                    action.target
                ) &&
                alive(
                    getPlayer(
                        action.target
                    )
                )
            );


        case "parasite":

            return (
                action.type ===
                "infect" &&
                !player.hasInfected &&
                !!getPlayer(
                    action.target
                ) &&
                alive(
                    getPlayer(
                        action.target
                    )
                )
            );


        case "engineer":

            return (
                action.type ===
                "repair" &&
                canRepairSystem(action.system)
            );


        case "scientist":

            if (
                action.type !==
                "science"
            ) {
                return false;
            }

            const scienceTarget =
                getPlayer(
                    action.target
                );

            if (
                !scienceTarget ||
                !alive(scienceTarget)
            ) {
                return false;
            }

            if (
                action.mode ===
                "cure"
            ) {

                return (
                    scienceTarget.role ===
                        "infected" ||
                    scienceTarget.role ===
                        "diseased"
                );
            }

            return (
                action.mode ===
                "check"
            );


        case "detective":

            return (
                action.type ===
                "detect" &&
                !!getPlayer(
                    action.target
                ) &&
                alive(
                    getPlayer(
                        action.target
                    )
                )
            );


        case "medic":

            return (
                action.type ===
                "protect" &&
                !!getPlayer(
                    action.target
                ) &&
                alive(
                    getPlayer(
                        action.target
                    )
                )
            );


        case "guard":

            return (
                action.type ===
                "block" &&
                !!getPlayer(
                    action.target
                ) &&
                alive(
                    getPlayer(
                        action.target
                    )
                )
            );


        case "radio":

            return (
                action.type ===
                    "radio" &&
                game.systems
                    .communications
            );


        case "captain":

            return (
                action.type ===
                "none"
            );


        case "judge":

            return (
                action.type ===
                "none"
            );


        case "trickster":

            return (
                action.type ===
                    "swap" &&
                !player.tricksterUsed &&
                !!getPlayer(action.a) &&
                !!getPlayer(action.b) &&
                action.a !== action.b &&
                alive(
                    getPlayer(action.a)
                ) &&
                alive(
                    getPlayer(action.b)
                )
            );


        default:

            return (
                action.type ===
                "none"
            );
    }
}


/* =========================================================
   ONLINE HOST ABILITY ADVANCE
   ========================================================= */

function onlineAdvanceHostAbility() {

    game.abilityIndex++;

    if (
        game.abilityIndex <
        game.abilityQueue.length
    ) {

        onlineHostSendNextAbility();

    } else {

        resolveAbilities();

        if (game.gameOver) return;

        onlineBroadcast({
            type:
                "public_phase",

            phase:
                "reaction",

            round:
                game.round,

            stage:
                game.stage
        });

        onlineHostSendReaction();
    }
}


function onlineHostSendNextAbility() {

    const player =
        getPlayer(
            game.abilityQueue[
                game.abilityIndex
            ]
        );

    if (!player) {

        onlineAdvanceHostAbility();

        return;
    }

    sendPrivateToPlayer(
        player.id,
        {
            type:
                "private_action",

            round:
                game.round,

            stage:
                game.stage,

            role: player.role,
            systems: game.systems,
            blocked: game.blockedPlayers.has(player.id),
            lastSilenceRound: player.lastSilenceRound,
            tricksterUsed: !!player.tricksterUsed,
            hasInfected: player.hasInfected,
            backupPowered: game.backupPowered.has(player.id),
            sabotagedAt: game.sabotagedAt,
            bountyTarget: player.bountyTarget,
            bountyFailed: player.bountyFailed,
            oracleCorrect: player.oracleCorrect,
            oraclePlayerCorrect: player.oraclePlayerCorrect,
            lastOracleResult: player.lastOracleResult,
            displaySwap: game.displaySwap,
            allyIds: isHostile(player) ? living().filter(isHostile).map(p => p.id) : [],
            saboteurAlive: living().some(p => p.role === "saboteur")
        }
    );
}


/* =========================================================
   ONLINE HOST REACTION
   ========================================================= */

function onlineHostSendReaction() {

    game.reactionQueue =
        [...game.roundStartAliveIds];

    game.reactionIndex = 0;

    onlineHostSendCurrentReaction();
}


function onlineHostSendCurrentReaction() {

    if (
        game.reactionIndex >=
        game.reactionQueue.length
    ) {

        online.activeTurn = null;
        hostBroadcastDiscussion();
        return;
    }

    const player =
        getPlayer(
            game.reactionQueue[
                game.reactionIndex
            ]
        );

    if (!player) {

        game.reactionIndex++;

        onlineHostSendCurrentReaction();

        return;
    }

    sendPrivateToPlayer(
        player.id,
        {
            type:
                "private_reaction",

            round:
                game.round,

            stage:
                game.stage,

            message:
                game.reactionInfo[
                    player.id
                ] ||
                "Nothing happened to you this round.",

            alive:
                player.alive,

            role: player.role,
            players: game.players.map(p => ({id: p.id, name: p.name, alive: p.alive})),
            displaySwap: game.displaySwap
        }
    );
}


function hostReceiveReactionReady(
    player
) {

    if (game.reactionQueue[game.reactionIndex] !== player.id) return;
    online.activeTurn = null;
    game.reactionIndex++;

    onlineHostSendCurrentReaction();
}


/* =========================================================
   ONLINE PRIVATE REACTION
   ========================================================= */

function onlineShowPrivateReaction() {

    const data =
        online.pendingRole;

    if (data?.players) handleOnlinePublicUpdate({players: data.players});
    if (!online.isHost) {
        const player = getPlayer(online.playerId);
        if (player && data?.role) player.role = data.role;
        game.displaySwap = data?.displaySwap || null;
    }
    $("reactionResultTitle").textContent =
        "ROUND RESULT";

    let message =
        data?.message ||
        "Nothing happened to you this round.";

    if (
        data &&
        !data.alive
    ) {

        message +=
            "\n\nYou are no longer alive and will not participate in future rounds.";
    }

    $("reactionResultMessage").textContent =
        message;

    $("reactionContinueButton").onclick =
        () => {

            onlineShowWaiting("Result acknowledged. Waiting for the crew…");
            sendPrivateToHost({
                type:
                    "reaction_ready"
            });
        };

    setScreen(
        "reactionResultScreen"
    );
}


/* =========================================================
   ONLINE VOTING
   ========================================================= */

function onlineStartVoting() {

    if (!online.isHost) {

        /*
           Clients are told through public phase.
        */

        return;
    }

    game.votes = {};

    game.currentVoteIndex = 0;

    onlineBroadcast({
        type:
            "public_phase",

        phase:
            "voting",

        round:
            game.round,

        stage:
            game.stage
    });

    onlineHostSendNextVote();
}


function onlineHostSendNextVote() {

    const alivePlayers =
        living();

    if (
        game.currentVoteIndex >=
        alivePlayers.length
    ) {

        resolveVoting();

        return;
    }

    const player =
        alivePlayers[
            game.currentVoteIndex
        ];

    sendPrivateToPlayer(
        player.id,
        {
            type:
                "private_vote",

            round:
                game.round,

            stage:
                game.stage,

            players:
                alivePlayers
                    .filter(
                        p =>
                            p.id !==
                            player.id
                    )
                    .map(
                        p => ({
                            id:
                                p.id,
                            name:
                                displayName(p.id)
                        })
                    ),

            silenced:
                (
                    game.silencedUntil[
                        player.id
                    ] || 0
                ) > game.round
        }
    );
}


/* =========================================================
   ONLINE CLIENT VOTE UI
   ========================================================= */

function onlineShowPrivateVote(
    data
) {

    const options =
        data.players || [];

    $("votingRound").textContent =
        `ROUND ${data.round}`;

    $("votingStage").textContent =
        `STAGE ${data.stage} / 10`;

    const player =
        getPlayer(
            online.playerId
        );

    $("voterName").textContent =
        player?.name ||
        online.playerId;

    $("votingSilenced").textContent =
        data.silenced
            ? "🔇 YOU ARE SILENCED — YOU CANNOT VOTE"
            : "";

    $("voteOptions").innerHTML =
        (
            data.silenced
                ? [
                    button(
                        "SKIP (SILENCED)",
                        "skip"
                    )
                ]
                : [
                    ...options.map(
                        p =>
                            button(
                                esc(p.name),
                                p.id
                            )
                    ),

                    button(
                        "⏭️ SKIP",
                        "skip"
                    )
                ]
        ).join("");

    game.selectedVote =
        null;

    $("voteOptions")
        .querySelectorAll("button")
        .forEach(btn => {

            btn.onclick = () => {

                game.selectedVote =
                    btn.dataset.value;

                $("voteOptions")
                    .querySelectorAll("button")
                    .forEach(
                        b =>
                            b.classList.remove(
                                "selected"
                            )
                    );

                btn.classList.add(
                    "selected"
                );
            };
        });

    $("confirmVoteButton").onclick =
        onlineConfirmVote;

    setScreen(
        "votingScreen"
    );
}


function onlineConfirmVote() {

    if (!game.selectedVote) return;

    onlineShowWaiting("Vote submitted. Waiting for the crew…");
    sendPrivateToHost({
        type:
            "vote",

        vote:
            game.selectedVote
    });
}


/* =========================================================
   HOST RECEIVE VOTE
   ========================================================= */

function hostReceiveVote(
    player,
    vote
) {

    if (living()[game.currentVoteIndex]?.id !== player.id || Object.prototype.hasOwnProperty.call(game.votes, player.id)) return;
    if (
        !alive(player)
    ) {
        return;
    }

    if (
        vote !== "skip" &&
        !alive(getPlayer(vote))
    ) {
        return;
    }

    if (
        vote === player.id
    ) {
        return;
    }

    const silenced =
        (
            game.silencedUntil[
                player.id
            ] || 0
        ) > game.round;

    if (
        silenced &&
        vote !== "skip"
    ) {
        return;
    }

    online.activeTurn = null;
    game.votes[
        player.id
    ] = vote;

    game.currentVoteIndex++;

    onlineHostSendNextVote();
}


/* =========================================================
   ONLINE PUBLIC PHASE
   ========================================================= */

function handleOnlinePublicPhase(
    data
) {

    if (online.isHost) return;
    handleOnlinePublicUpdate(data);
    game.displaySwap = data.displaySwap || null;

if (
    data.o2RoundsRemaining !==
    undefined
) {
    game.o2RoundsRemaining =
        data.o2RoundsRemaining;
}

if (data.systems) {
    game.systems =
        data.systems;
}
   
    if (
        data.phase ===
        "discussion"
    ) {

        onlineShowDiscussion(data);

    } else if (data.phase === "ability" || data.phase === "reaction") {
        onlineShowWaiting("Waiting for your private turn…");

    } else if (
        data.phase ===
        "voting"
    ) {

        onlineShowWaiting("Voting started. Waiting for your private vote…");
    }
}


/* =========================================================
   ONLINE DISCUSSION
   ========================================================= */

function onlineShowDiscussion(
    data
) {

    $("discussionRound").textContent =
        `ROUND ${data.round}`;

    $("discussionStage").textContent =
        `STAGE ${data.stage} / 10`;

const oxygenMessage =
    updateOxygenCountdown();

$("roundResults").innerHTML =
    oxygenMessage
        ? `<div>${esc(oxygenMessage)}</div>
           <div>Discuss what happened this round.</div>`
        : `<div>Discuss what happened this round.</div>`;

    if (data.results?.length) $("roundResults").innerHTML = data.results.map(r => `<div>${esc(r)}</div>`).join("");
    $("startVotingButton").hidden = !online.isHost;
    $("startVotingButton").onclick =
        () => {

            if (online.isHost) {

                onlineStartVoting();

            } else {

                updateOnlineStatus(
                    "Waiting for the host to start voting..."
                );
            }
        };

    setScreen(
        "discussionScreen"
    );
}


/* =========================================================
   ONLINE PUBLIC UPDATE
   ========================================================= */

function handleOnlinePublicUpdate(
    data
) {

    if (!online.isHost && Object.prototype.hasOwnProperty.call(data, "displaySwap")) game.displaySwap = data.displaySwap;
    if (data.round) {
        game.round =
            data.round;
    }

    if (data.stage) {
        game.stage =
            data.stage;
    }

    if (data.systems) {

        game.systems =
            data.systems;
    }

    if (data.players) {

        data.players.forEach(
            publicPlayer => {

                const player =
                    getPlayer(
                        publicPlayer.id
                    );

                if (player) {

                    player.name =
                        publicPlayer.name;

                    player.alive =
                        publicPlayer.alive;
                }
            }
        );
    }
}


/* =========================================================
   ONLINE CAPTAIN
   ========================================================= */

function onlineShowPrivateCaptain(
    data
) {

    $("captainTieOptions").innerHTML =
        `
            <p>
                The vote is tied.
                Choose one player to eject.
            </p>

            ${
                (data.targets || [])
                    .map(
                        target =>
                            button(
                                esc(target.name),
                                target.id
                            )
                    )
                    .join("")
            }
        `;

    $("captainTieOptions")
        .querySelectorAll("button")
        .forEach(btn => {

            btn.onclick = () => {

                sendPrivateToHost({
                    type:
                        "captain_choice",

                    target:
                        btn.dataset.value
                });
            };
        });

    setScreen(
        "captainTieScreen"
    );
}


/* =========================================================
   HOST CAPTAIN
   ========================================================= */

function hostReceiveCaptainChoice(
    player,
    target
) {

    if (
        player.role !== "captain" ||
        !game.systems.power ||
        game.blockedPlayers.has(
            player.id
        )
    ) {
        return;
    }

    if (
        !game.pendingEjection
    ) {
        /*
           Host resolves tie from fresh tally.
        */
    }

    if (!online.captainTargets?.includes(target) || !alive(getPlayer(target))) {
        return;
    }

    online.activeTurn = null;
    online.captainTargets = null;
    finishEjection(
        target,
        true
    );
}


/* =========================================================
   ONLINE JUDGE
   ========================================================= */

function onlineShowPrivateJudge(
    data
) {

    $("judgeDescription").textContent =
        `The vote would eject ${data.targetName}. Cancel the ejection?`;

    $("judgeCancelButton").onclick =
        () => {

            sendPrivateToHost({
                type:
                    "judge_choice",

                cancel:
                    true
            });
        };

    $("judgeAllowButton").onclick =
        () => {

            sendPrivateToHost({
                type:
                    "judge_choice",

                cancel:
                    false
            });
        };

    setScreen(
        "judgeScreen"
    );
}


function hostReceiveJudgeChoice(
    player,
    cancel
) {

    if (
        player.role !== "judge" ||
        game.judgeUsed ||
        !game.systems.power ||
        game.blockedPlayers.has(
            player.id
        )
    ) {
        return;
    }

    if (
        !game.pendingEjection
    ) {
        return;
    }

    online.activeTurn = null;
    game.pendingJudge = false;
    if (cancel) {

        game.judgeUsed = true;

        const target =
            game.pendingEjection.id;

        game.pendingEjection =
            null;

        onlineBroadcast({
            type:
                "public_update",

            players:
                game.players.map(
                    p => ({
                        id:
                            p.id,
                        name:
                            p.name,
                        alive:
                            p.alive
                    })
                ),

            round:
                game.round,

            stage:
                game.stage,

            systems:
                game.systems
        });

        sendPrivateResultsAll(
            "EJECTION CANCELLED",
            "The Judge cancelled the ejection. Nobody was voted out."
        );

        if (settleVoteObjectives(null)) return;
        afterVoting();

    } else {

        const pending =
            game.pendingEjection;

        game.pendingEjection =
            null;

        completeEjection(
            pending.id,
            pending.byCaptain
        );
    }
}


/* =========================================================
   PRIVATE RESULT
   ========================================================= */

function onlineShowPrivateResult(
    data
) {

    $("voteResultTitle").textContent =
        data.title;

    $("voteResultMessage").textContent =
        [data.message, data.objectiveFeedback].filter(Boolean).join("\n\n");

    $("afterVoteButton").onclick =
        () => {

            updateOnlineStatus(
                "Waiting for the next phase..."
            );
        };

    setScreen(
        "voteResultScreen"
    );
}


async function sendPrivateResultsAll(
    title,
    message
) {

    for (
        const player
        of living()
    ) {

        await sendPrivateToPlayer(
            player.id,
            {
                type:
                    "private_result",

                title,
                message
            }
        );
    }
}


/* =========================================================
   ONLINE DISCUSSION / HOST
   ========================================================= */

function hostBroadcastDiscussion() {
    const data = {type: "public_phase", phase: "discussion", round: game.round, stage: game.stage, systems: game.systems, players: game.players.map(p => ({id: p.id, name: p.name, alive: p.alive})), results: game.lastRoundResults, displaySwap: game.displaySwap};
    onlineBroadcast(data);
    onlineShowDiscussion(data);
}

/* =========================================================
   ONLINE RADIO
   ========================================================= */

function hostReceiveRadioRequest(
    player
) {

    if (
        player.role !== "radio" ||
        !game.systems.communications ||
        game.blockedPlayers.has(
            player.id
        )
    ) {
        return;
    }

    if (game.actions[player.id]?.type !== "radio") return;
    const message =
        randomRadioMessage();

    game.actions[
        player.id
    ] = {
        type:
            "radio",
        message
    };

    game.reactionInfo[
        player.id
    ] = message;
}


/* =========================================================
   ONLINE PRIVATE RADIO
   ========================================================= */

function onlineRequestRadio() {

    sendPrivateToHost({
        type:
            "radio_request"
    });
}


/* =========================================================
   ONLINE ROLE ALLIES
   ========================================================= */

async function sendPrivateRoleData(
    player
) {

    const allies =
        living()
            .filter(
                other =>
                    other.id !==
                    player.id &&
                    isHostile(other)
            )
            .map(
                other => ({
                    id:
                        other.id,
                    name:
                        other.name,
                    role:
                        other.role
                })
            );

    await sendPrivateToPlayer(
        player.id,
        {
            type:
                "private_role",

            playerId:
                player.id,

            role:
                player.role,

            originalRole:
                player.originalRole,

            allies
        }
    );
}


/* =========================================================
   ONLINE RECONNECT / DISCONNECT
   ========================================================= */

function onlineDisconnect() {

    clearTimeout(online.joinTimer);
    online.joinTimer = null;
    online.activeTurn = null;
    online.turnId = null;
    online.started = false;
    online.pendingRole = null;
    online.pendingPhase = null;
    online.connected =
        false;

    if (online.channel) {

        try {
            supabaseClient?.removeChannel(online.channel);
        } catch {}
    }

    if (online.privateChannel) {

        try {
            supabaseClient?.removeChannel(online.privateChannel);
        } catch {}
    }

    Object.values(
        online.hostPrivateChannels
    )
        .forEach(
            channel => {

                try {
                    supabaseClient?.removeChannel(channel);
                } catch {}
            }
        );

    online.channel =
        null;

    online.privateChannel =
        null;

    online.hostPrivateChannels =
        {};

    online.players =
        {};

    online.roomCode =
        null;

    online.connectionId =
        null;

    online.playerId =
        null;

    online.isHost =
        false;
}


/* =========================================================
   ONLINE PRIVATE ACTION PATCH
   ========================================================= */

/*
   The normal showAction renderer can be used for
   an online client because only that client's
   local player is placed in abilityQueue.
*/

function onlinePrepareActionPlayer() {

    const player =
        getPlayer(
            online.playerId
        );

    if (!player) return false;

    game.abilityQueue =
        [player.id];

    game.abilityIndex = 0;

    return true;
}


/* =========================================================
   ONLINE PHASE HANDLING
   ========================================================= */

function onlineHostPhaseBroadcast(
    phase
) {

    onlineBroadcast({
        type:
            "public_phase",

        phase,

round:
    game.round,

stage:
    game.stage,

systems:
    game.systems,

o2RoundsRemaining:
    game.o2RoundsRemaining
       
    });
}


/* =========================================================
   ONLINE START ROUND OVERRIDE
   ========================================================= */

const originalStartRound =
    startRound;

function startRoundOnlineAware() {

    if (
        game.mode !== "online" ||
        !online.isHost
    ) {

        originalStartRound();

        return;
    }

    /*
       Same authoritative round engine,
       but private actions are distributed.
    */

if (checkVictory()) return;

if (
    game.round > 1 &&
    !game.systems.o2
) {
    if (advanceOxygenCountdown()) {
        return;
    }
}

game.previousActions = {
        ...game.actions
    };

    resetTransient();

    progressInfections();

    game.roundStartAliveIds =
        living().map(
            p => p.id
        );

    game.abilityQueue = abilityOrder(game.roundStartAliveIds);

    game.abilityIndex = 0;

    onlineHostPhaseBroadcast(
        "ability"
    );

    onlineHostSendNextAbility();
}


/*
   Replace function binding used by the rest
   of the file.
*/

startRound = startRoundOnlineAware;


/* =========================================================
   ONLINE DISCUSSION OVERRIDE
   ========================================================= */

const originalAfterVoting =
    afterVoting;

function afterVotingOnlineAware() {

    if (
        game.mode !== "online" ||
        !online.isHost
    ) {

        originalAfterVoting();

        return;
    }

    game.displaySwap = null;

    if (game.gameOver) {

        showGameOver();

        return;
    }

    if (checkVictory()) return;

    if (
        game.round % 3 === 0
    ) {

        if (
            game.systems.communications
        ) {

            game.lifelineNumber++;

            onlineBroadcast({
                type:
                    "public_update",

                round:
                    game.round,

                stage:
                    game.stage,

                systems:
                    game.systems,

                lifeline:
                    true,

                lifelineNumber:
                    game.lifelineNumber
            });

            showLifeline();

        } else {

            proceedToSystems();
        }

    } else {

        proceedToSystems();
    }
}

afterVoting =
    afterVotingOnlineAware;


/* =========================================================
   ONLINE HOST RESOLVE VOTING PATCH
   ========================================================= */

const originalResolveVoting =
    resolveVoting;

function resolveVotingOnlineAware() {

    if (
        game.mode !== "online" ||
        !online.isHost
    ) {

        originalResolveVoting();

        return;
    }

    const tally = {};

    Object.values(
        game.votes
    ).forEach(
        vote => {

            if (
                vote === "skip"
            ) return;

            tally[vote] =
                (tally[vote] || 0) + 1;
        }
    );

    const max =
        Math.max(
            0,
            ...Object.values(tally)
        );

    const tied =
        Object.keys(tally)
            .filter(
                id =>
                    tally[id] === max &&
                    max > 0
            );

    if (!tied.length) {

        completeEjection(
            null,
            false
        );

        return;
    }

    if (
        tied.length === 1
    ) {

        const captain =
            null;

        /*
           Normal majority still gives Judge
           the opportunity to cancel.
        */

        const judge =
            living().find(
                p =>
                    p.role === "judge" &&
                    !game.judgeUsed &&
                    game.systems.power &&
                    !game.blockedPlayers.has(
                        p.id
                    )
            );

        if (judge) {

            game.pendingEjection = {
                id:
                    tied[0],
                byCaptain:
                    false
            };

            sendPrivateToPlayer(
                judge.id,
                {
                    type:
                        "private_judge",

                    target:
                        tied[0],

                    targetName:
                        displayName(
                            tied[0]
                        )
                }
            );

            return;
        }

        completeEjection(
            tied[0],
            false
        );

        return;
    }

    /*
       Tie -> Captain.
    */

    const captain =
        living().find(
            p =>
                p.role === "captain" &&
                game.systems.power &&
                !game.blockedPlayers.has(
                    p.id
                )
        );

    if (captain) {
        online.captainTargets = tied;

        sendPrivateToPlayer(
            captain.id,
            {
                type:
                    "private_captain",

                targets:
                    tied.map(
                        id => ({
                            id,
                            name:
                                displayName(
                                    id
                                )
                        })
                    )
            }
        );

        return;
    }

    completeEjection(
        null,
        false
    );
}

resolveVoting =
    resolveVotingOnlineAware;


/* =========================================================
   ONLINE HOST DISCUSSION -> VOTING
   ========================================================= */

function onlineHostStartDiscussion() {

    onlineBroadcast({
        type:
            "public_phase",

        phase:
            "discussion",

        round:
            game.round,

        stage:
            game.stage
    });
}


/* =========================================================
   ONLINE SYSTEM UPDATE
   ========================================================= */

const originalProceedToSystems =
    proceedToSystems;

function proceedToSystemsOnlineAware() {

    if (
        game.mode !== "online" ||
        !online.isHost
    ) {

        originalProceedToSystems();

        return;
    }

    if (game.systems.engines) {

        game.stage++;
    }

    if (
        game.stage > 10
    ) {

        earthCheck();

        return;
    }

    onlineBroadcast({
        type:
            "public_update",

        round:
            game.round,

        stage:
            game.stage,

        systems:
            game.systems
    });

    $("systemsRound").textContent =
        `ROUND ${game.round}`;

    $("systemsStage").textContent =
        `STAGE ${game.stage} / 10`;

    $("systemsList").innerHTML =
        Object.entries(
            game.systems
        )
            .map(
                ([system, onlineState]) =>
                    `
                    <div>
                        ${
                            onlineState
                                ? "🟢"
                                : "🔴"
                        }
                        <strong>
                            ${system.toUpperCase()}
                        </strong>
                        —
                        ${
                            onlineState
                                ? "ONLINE"
                                : "OFFLINE"
                        }
                    </div>
                    `
            )
            .join("");

    $("nextRoundButton").onclick =
        () => {

            game.round++;

            game.lastRoundResults =
                [];

            startRound();
        };

    setScreen(
        "systemsScreen"
    );
}

proceedToSystems =
    proceedToSystemsOnlineAware;


/* =========================================================
   ONLINE HOST REACTION START PATCH
   ========================================================= */

const originalResolveAbilities =
    resolveAbilities;

function resolveAbilitiesOnlineAware() {

    if (
        game.mode !== "online" ||
        !online.isHost
    ) {

        originalResolveAbilities();

        return;
    }

    /*
       Use the normal authoritative resolution.
    */

    originalResolveAbilities();

    /*
       resolveAbilities already creates the reaction queue.
       The online host then distributes private results.
    */
}

resolveAbilities =
    resolveAbilitiesOnlineAware;


/* =========================================================
   ONLINE CLIENT ABILITY PHASE
   ========================================================= */

function handleOnlineAbilityPhase(
    data
) {

    if (online.isHost) return;

    updateOnlineStatus(
        `ROUND ${data.round}\nYour private ability turn is ready.`
    );
}


/* =========================================================
   ONLINE SETUP NAME SYNC
   ========================================================= */

function onlineSyncOwnName() {

    if (
        !online.connected ||
        !online.playerId
    ) {
        return;
    }

    const player =
        getPlayer(
            online.playerId
        );

    if (!player) return;

    onlineBroadcast({
        type:
            "name_update",

        playerId:
            online.playerId,

        name:
            player.name
    });
}


/* =========================================================
   ONLINE NAME UPDATE
   ========================================================= */

function handleOnlineNameUpdate(
    data
) {

    const player =
        getPlayer(
            data.playerId
        );

    if (player) {

        player.name =
            data.name;
    }

    const connection =
        Object.values(
            online.players
        ).find(
            p =>
                p.playerId ===
                data.playerId
        );

    if (connection) {

        connection.name =
            data.name;
    }

    updateOnlinePlayersUI();
}


/* =========================================================
   PATCH PUBLIC MESSAGE NAME UPDATE
   ========================================================= */

const originalPublicHandler =
    handleOnlinePublicMessage;

handleOnlinePublicMessage =
    function(data) {

        if (
            data?.type ===
            "name_update"
        ) {

            handleOnlineNameUpdate(
                data
            );

            return;
        }

        if (
            data?.type ===
            "ability_phase"
        ) {

            handleOnlineAbilityPhase(
                data
            );

            return;
        }

        originalPublicHandler(
            data
        );
    };


/* =========================================================
   MOBILE RANDOM BUTTON FIX
   ========================================================= */

function bindMobileRandomButton() {

    const oldButton =
        $("randomRolesButton");

    if (!oldButton) return;

    /*
       Clone removes any stale handlers that may have
       been attached by an older version of the script.
    */

    const newButton =
        oldButton.cloneNode(true);

    oldButton.parentNode.replaceChild(
        newButton,
        oldButton
    );

    newButton.type =
        "button";

    const handler =
        event => {

            event.preventDefault();
            event.stopPropagation();

            randomiseRoles();
        };

    /*
       pointerup works reliably on mobile browsers.
    */

    if (
        "PointerEvent" in window
    ) {

        newButton.addEventListener(
            "pointerup",
            handler
        );

    } else {

        newButton.addEventListener(
            "click",
            handler
        );
    }
}


/* =========================================================
   INIT UI
   ========================================================= */

function initGameUI() {

    const playerCount =
        $("playerCount");

    if (!playerCount) return;

    ensureOnlineUI();
    $("assignmentMode").onchange = event => {
        setupMode = event.target.value;
        game.randomRoles = {};
        game.randomisedRoles = false;
        $("roundComposition").disabled = setupMode === "manual";
        $("assignmentHint").textContent = setupMode === "manual"
            ? "Host eyes only. Choose every crew member’s role before passing the phone. Duplicate roles are allowed."
            : "Roles stay secret. Mixed games have a 20% chance of an all-good red herring.";
        renderSetup();
    };
    $("roundComposition").onchange = event => {
        roundComposition = event.target.value;
        game.randomRoles = {};
        game.randomisedRoles = false;
        renderSetup();
    };

    playerCount.onchange =
        resetSetupPlayers;

    if (
        !game.players.length
    ) {

        resetSetupPlayers();

    } else {

        renderSetup();
    }

    bindMobileRandomButton();

    $("startGameButton").onclick =
        event => {

            event.preventDefault();

            /*
               Save names before starting.
            */

            document
                .querySelectorAll(
                    ".player-name-input"
                )
                .forEach(
                    input => {

                        const index =
                            Number(
                                input.dataset.nameIndex
                            );

                        if (
                            game.players[index]
                        ) {

                            const value =
                                input.value.trim();

                            if (value) {

                                game.players[
                                    index
                                ].name =
                                    value;
                            }
                        }
                    }
                );

            startGame();
        };

    $("roleGuideButton").onclick =
        () => {

            renderRoleGuide();

            openModal(
                "roleGuideModal"
            );
        };

    $("customRolesButton").onclick =
        () => {

            renderCustomRoles();

            openModal(
                "customRoleModal"
            );
        };

    document
        .querySelectorAll(
            "[data-close]"
        )
        .forEach(
            buttonElement => {

                buttonElement.onclick =
                    () =>
                        closeModal(
                            buttonElement.dataset.close
                        );
            }
        );

    $("readyButton").onclick =
        showRole;

    $("showActionButton").onclick =
        showAction;

    $("reactionReadyButton").onclick =
        showReactionResult;

    $("reactionContinueButton").onclick =
        advanceReaction;

    $("startVotingButton").onclick =
        startVoting;

$("restartButton").onclick =
    handlePostGameButton;

    $("applyCustomRolesButton").onclick =
        applyCustomRoles;

    /*
       Make sure mobile RANDOM is rebound after
       the rest of the setup UI has loaded.
    */

    bindMobileRandomButton();
}


/* =========================================================
   SUPABASE AUTO-LOAD + START
   ========================================================= */

async function bootAlien() {

    /*
       Supabase is loaded lazily.

       Local mode does not need to wait for it.
    */

    initGameUI();

    /*
       Try loading Supabase in the background.
       If it fails, LOCAL MODE still works.
    */

    try {

        await loadSupabase();

        console.log(
            "ALIEN: Supabase ready."
        );

    } catch (error) {

        console.warn(
            "ALIEN: Supabase could not load. Local mode will still work.",
            error
        );
    }
}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        bootAlien,
        {
            once: true
        }
    );

} else {

    bootAlien();
}


/* =========================================================
   END GAME.JS
   ========================================================= */
