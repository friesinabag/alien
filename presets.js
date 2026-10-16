"use strict";

const PRESET_STORAGE_KEY = "alien-setup-presets-v1";

function readSetupPresets() {
    const raw = localStorage.getItem(PRESET_STORAGE_KEY);
    if (!raw) return [];
    const presets = JSON.parse(raw);
    if (!Array.isArray(presets)) throw new Error("Saved presets could not be read.");
    return presets;
}

function refreshSetupPresets(selected = "") {
    const presets = readSetupPresets();
    $("presetSelect").innerHTML = '<option value="">Choose a preset</option>' + presets.map(p =>
        `<option value="${esc(p.name)}">${esc(p.name)}</option>`).join("");
    $("presetSelect").value = selected;
    $("loadPresetButton").disabled = !selected;
    $("deletePresetButton").disabled = !selected;
}

function captureSetupPreset(name) {
    return {
        version: 1, name, playerCount: game.players.length,
        assignmentMode: setupMode, roundComposition,
        enabled: {...settings.enabled}, counts: {...settings.counts},
        assignments: setupMode === "manual" ? game.players.map((_, i) => game.randomRoles[i] || null) : []
    };
}

function applySetupPreset(preset) {
    if (preset?.version !== 1 || !Number.isInteger(preset.playerCount) || preset.playerCount < 2 || preset.playerCount > 12 ||
        !["manual", "random"].includes(preset.assignmentMode) || !["mixed", "good", "neutral", "evil"].includes(preset.roundComposition) ||
        !preset.enabled || !preset.counts || !Array.isArray(preset.assignments)) {
        throw new Error("This preset is invalid or uses an unsupported format.");
    }
    const enabled = {}, counts = {};
    for (const role of ALL_STARTING_ROLES) {
        if (typeof preset.enabled[role] !== "boolean" || !Number.isInteger(preset.counts[role]) || preset.counts[role] < 0 || preset.counts[role] > 12) {
            throw new Error("This preset contains invalid role settings.");
        }
        enabled[role] = preset.enabled[role];
        counts[role] = preset.counts[role];
    }
    if (preset.assignmentMode === "manual" && (preset.assignments.length !== preset.playerCount || preset.assignments.some(role => role !== null && !ALL_STARTING_ROLES.includes(role)))) {
        throw new Error("This preset contains invalid manual assignments.");
    }
    if (game.mode === "online" && (!online.isHost || game.players.length !== preset.playerCount)) {
        throw new Error(`The host needs ${preset.playerCount} connected crew positions to load this preset.`);
    }
    // Validate everything before changing the current setup. Keep names and online identities.
    settings = {enabled, counts};
    if (game.mode !== "online" && game.players.length !== preset.playerCount) {
        const names = game.players.map(p => p.name);
        $("playerCount").value = String(preset.playerCount);
        resetSetupPlayers();
        game.players.forEach((p, i) => { if (names[i]) p.name = names[i]; });
    }
    $("playerCount").value = String(preset.playerCount);
    setupMode = preset.assignmentMode;
    roundComposition = preset.roundComposition;
    game.randomRoles = {};
    if (setupMode === "manual") preset.assignments.forEach((role, i) => { if (role) game.randomRoles[i] = role; });
    game.randomisedRoles = setupMode === "manual";
    $("assignmentMode").value = setupMode;
    $("roundComposition").value = roundComposition;
    $("roundComposition").disabled = setupMode === "manual";
    $("assignmentHint").textContent = setupMode === "manual"
        ? "Host eyes only. Choose every crew member’s role before passing the phone. Duplicate roles are allowed."
        : "Roles stay secret. Mixed games have a 20% chance of an all-good red herring.";
    renderSetup();
    renderCustomRoles();
}

function initSetupPresets() {
    if (!$("presetSelect")) return;
    const run = action => {
        try { action(); }
        catch (error) { $("presetStatus").textContent = `Preset unavailable: ${error.message} Your current setup is kept.`; }
    };
    run(() => refreshSetupPresets());
    $("presetSelect").onchange = () => {
        const name = $("presetSelect").value;
        $("presetName").value = name;
        $("loadPresetButton").disabled = !name;
        $("deletePresetButton").disabled = !name;
        $("presetStatus").textContent = "";
    };
    $("savePresetButton").onclick = () => run(() => {
        const name = $("presetName").value.trim();
        if (!name || name.length > 60) throw new Error("Enter a preset name of up to 60 characters.");
        const presets = readSetupPresets();
        const index = presets.findIndex(p => p.name === name);
        const preset = captureSetupPreset(name);
        if (index >= 0) presets[index] = preset; else presets.push(preset);
        localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
        refreshSetupPresets(name);
        $("presetStatus").textContent = `Saved “${name}” on this device.`;
    });
    $("loadPresetButton").onclick = () => run(() => {
        const name = $("presetSelect").value;
        const preset = readSetupPresets().find(p => p.name === name);
        if (!preset) throw new Error("Choose a saved preset.");
        applySetupPreset(preset);
        $("presetName").value = name;
        $("presetStatus").textContent = `Loaded “${name}”. Manual roles follow crew order; player names are kept.`;
    });
    $("deletePresetButton").onclick = () => run(() => {
        const name = $("presetSelect").value;
        if (!name) return;
        localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(readSetupPresets().filter(p => p.name !== name)));
        refreshSetupPresets();
        $("presetName").value = "";
        $("presetStatus").textContent = `Deleted “${name}”.`;
    });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initSetupPresets);
else initSetupPresets();
