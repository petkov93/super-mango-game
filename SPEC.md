# MANGO — NIGHT RUNNER
### The one-page plan we agreed on

**A Mario-style platformer for the phone browser.** Original hero, original art, no Nintendo assets.
Everything runs client-side: no accounts, no database, no server code.

---

## The hero

**Mango** — brown-skinned scrapper, black hat, big moustache. Mustard shirt, dark trousers.
Drawn as 12 × 16 pixel art (shown at 3×, so 36 × 48 on screen).

## The world

A night-time city. Deep blue sky, moon, stars, two parallax skyline layers (far haze buildings
behind, dark towers with lit windows in front), street lamps, steel-grate rooftops.

## The loop

1. **Sneak** — explore the level, collect metal, coins and diamonds.
2. **Grab the prize** — the level's main loot. This trips the alarm.
3. **Run** — police pour in. Mango must reach the getaway van to bank the score.
4. Jump on an officer and he goes dizzy for a moment (cartoon stars), then gets back up.
   Nobody gets hurt. Touching an officer = caught, lose a life, drop some loot.

## Rules

- Loot: coin **10**, scrap metal **25**, diamond **100**. Conking an officer is worth **50**.
- Getting tagged by an officer costs you your position (back to the street start), not your score.
- 3 lives per run, generous checkpoints, forgiving difficulty curve. *(lives arrive in milestone 3)*
- Best score and unlocked levels saved on the device (`localStorage`).
- 3 short levels, 60–90 seconds each, one night-city theme, rising difficulty.

## Controls

Phone first: **left-thumb joystick** (push further = run) + **right-thumb jump button**.
Jump is *variable* — hold the button for a higher jump. Keyboard also works for desktop testing
(arrows / WASD + space).

## Tech

| Piece | Choice | Why |
|---|---|---|
| Engine | **Phaser 3.80** (arcade physics) | free, batteries-included platforming |
| Language | **JavaScript** | you already know some, no build step |
| Markup | plain **HTML + a little CSS** | one page, fullscreen canvas |
| Art | generated **pixel art in code** | no asset pipeline, easy to tweak |
| Sound | CC0 effects / WebAudio (milestone 4) | free and licence-safe |
| Storage | `localStorage` | high score + progress |
| Hosting | any static host | it is just three files |

No React, no backend, no build tools. Phaser is loaded from a CDN, so the page needs internet.

## The jump feel (the secret sauce)

These live in `TUNING` at the top of `game.js` and are what make it feel like Mario rather than stiff:

- **holdGravityScale** — gravity is lighter while you hold jump, so height is under your control
- **jumpCut** — releasing early clips the jump short
- **coyoteTime** — 100 ms of grace to still jump after walking off a ledge
- **jumpBuffer** — a jump pressed slightly before landing still happens
- **fastFallExtra** — falling is faster than rising, which reads as "snappy"

## Milestones

1. ✅ **Mango moves** — run, jump, variable height, camera, phone controls.
2. ✅ **Loot & trouble** — coins, scrap and diamonds, score counter, patrolling officer who chases,
   can be conked from above, and tags you if he catches you. *← you are here*
3. **A real level** — the prize + alarm, getaway van, checkpoint, lives, caught-and-respawn.
4. **Polish** — title screen, sound, three levels, hit effects, best score saved.
5. **Optional** — wrap it as an Android app with Capacitor and put it on a store.

## Files

- `index.html` — the page, canvas, rotate-phone hint
- `game.js` — everything else: art generation, level, physics, controls, UI
- `SPEC.md` — this plan
