

# ALIEN

Open `index.html` through a static web server to play locally or create an online room. Online play uses the project URL and public publishable key at the top of `game.js`; the Supabase project must be running.

Role assignment supports secret random games, guaranteed team compositions, and manual host selections. Trickster is a standard Neutral role, enabled by default. Each Trickster can swap two displayed identities once per game; the swap expires after voting. Silencer rests for one round after a successful two-round silence. A Jester reaching the final two loses to the other player's team immediately.

Run the regression checks with:

```sh
node --check game.js
node verify-roles.cjs
node verify-gameplay.cjs
```

Live browser verification covered room creation and joining, private host and remote turns, Radio Operator reaction messages, Trickster vote labels, voting results, and progression to the next round.
