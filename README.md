

# ALIEN

Open `index.html` through a static web server to play locally or create an online room. Online play uses the project URL and public publishable key at the top of `game.js`; the Supabase project must be running.

Role assignment supports secret random games, guaranteed team compositions, and manual host selections. Trickster is a standard Neutral role, enabled by default. Each Trickster can swap two displayed identities once per game; the swap expires after voting. Silencer rests for one round after a successful two-round silence. A Jester reaching the final two loses to the other player's team immediately.

Bounty Hunter and Oracle are Neutral objective roles. Bounty Hunter marks a target in round 1 and wins if that target is voted out while the hunter survives. Oracle needs three correct final-ejection predictions, including at least one player ejection. Judge cancellations count as no ejection; Captain decisions count as the actual ejection. Simultaneous independent objectives share a win. Surviving to Earth alone does not complete these objectives.

Technician and Analyst are Human roles. Technician acts before ordinary ability turns and supplies another player with backup power for that round, including during a blackout. Analyst privately copies a chosen player's Detective investigation, Scientist check, or Radio Operator message at reaction time. Backup power does not override a Guard block.

Engineer can repair a sabotaged system starting the following round: sabotage in round 2 becomes repairable in round 3. Repeated sabotage of an already offline system cannot extend its repair delay.

Run the regression checks with:

```sh
node --check game.js
node verify-roles.cjs
node verify-gameplay.cjs
```

Live browser verification covered room creation and joining, private host and remote turns, Radio Operator reaction messages, Trickster vote labels, voting results, and progression to the next round.
