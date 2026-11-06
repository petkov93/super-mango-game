# Mango — handoff note

Where the project stands and how to pick it up in a new chat or Code mode.

## Run it

Three files, no build step. Phaser loads from a CDN, so the page needs internet.

```bash
cd <this folder>
python3 -m http.server 3000
```

Then open `http://127.0.0.1:3000/`. On a phone, put the machine and phone on the same
network and use the machine's LAN address instead of `127.0.0.1`. Use landscape — portrait
shows a "Rotate your phone" hint on touch devices.

`game.js` must sit next to `index.html`; opening the HTML directly as a `file://` URL will
not work in some browsers.

## Current state

- **Milestone 1 — done.** Run, variable-height jump (coyote time, jump buffer, jump cut),
  camera follow, left joystick + right jump button for touch, keyboard for desktop.
- **Milestone 2 — done.** 22 loot items (coin 10, scrap 25, diamond 100), spinning loot with
  pop-up score text, patrolling officer who chases within about five body-lengths, conk from
  above = stunned with dizzy stars and +50, being tagged = flash, red toast, and respawn at the
  street start with score kept. HUD shows score.
- Milestones 3, 4 and 5 are open — see `SPEC.md`.

## Useful internals

- `TUNING` at the top of `game.js` holds all the feel numbers (gravity, jump velocity,
  accel, coyote time). Change these first when the movement feels wrong.
- `LEVEL` holds the layout as data: `ground` ranges, `platforms`, `lamps`, `startCol`,
  `loot`, and `officer`. Edit numbers, not ASCII maps.
- Grid is 54 px tiles, 40 columns x 10 rows, base resolution 960x540, `Phaser.Scale.FIT`.
- `window.MANGO` is exposed for console poking:
  `MANGO.scene.getScene('game')` gives you `player`, `loot`, `officer`, `score`.

## Next up (milestone 3)

The prize plus alarm, getaway van, checkpoint, 3 lives, and caught-and-respawn wired to the
life count. Everything for it belongs in `game.js`; `index.html` should not need changes.
