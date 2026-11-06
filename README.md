# Super Mango

A night-time heist platformer for the phone browser. You play **Mango** — brown-skinned, black hat,
big moustache — sneaking through a moonlit city collecting loot, with cartoon police on your tail.

Original hero and original art, all drawn in code. No game assets, no Nintendo sprites, nothing to download.

**Status: work in progress.** Movement and the loot/police systems are playable. The heist objective,
lives and sound are still to come — see [Roadmap](#roadmap).

---

## Run it

Three files and no build step. Phaser loads from a CDN, so the page needs an internet connection.

```bash
git clone https://github.com/petkov93/super-mango-game.git
cd super-mango-game
python3 -m http.server 3000
```

Then open <http://127.0.0.1:3000/>.

Any static server works (`npx serve`, VS Code Live Server, whatever you already use). Two things matter:

- `game.js` must sit next to `index.html`.
- Don't open `index.html` straight off disk as a `file://` URL — some browsers block the script load that way.

**On a phone:** run the server on your computer, put the phone on the same Wi-Fi, and open your
computer's LAN address (something like `http://192.168.1.20:3000`) instead of `127.0.0.1`.
Hold the phone in **landscape** — a portrait screen shows a "Rotate your phone" hint.

## Controls

Designed for thumbs first, but keyboard works for testing on a desktop.

| | Phone | Keyboard |
|---|---|---|
| Move | Left thumb stick — push further to run | `←` `→` or `A` `D` |
| Jump | Right thumb jump button | `Space`, `↑` or `W` |

Jump height is **variable** — tap for a small hop, hold for a full jump.

## What's in it right now

- **Movement that feels like Mario.** Variable jump height, coyote time (100 ms of grace to still jump
  after walking off a ledge), jump buffering (a jump pressed just before landing still counts), and
  faster falling than rising so landings feel snappy.
- **Loot** — 22 items placed across the level, each worth a different amount:

  | Item | Points |
  |---|---|
  | Coin | 10 |
  | Scrap metal | 25 |
  | Diamond | 100 |

- **One patrolling officer.** He walks his beat, chases you if you get within about five body lengths,
  and can be dealt with two ways:
  - **Land on his head** — he sits down dizzy with stars circling (3200 ms) and you get **+50**.
    Nobody gets hurt.
  - **Let him touch you** — you flash red, get a "TAGGED!" toast and are sent back to the start of
    the street. You keep your score. No lives are lost yet, because lives don't exist yet.
- **A night city** — moon, stars, two parallax skyline layers, street lamps, steel-grate rooftops.

## Roadmap

1. ✅ **Mango moves** — run, jump, variable height, camera, phone controls.
2. ✅ **Loot & trouble** — coins, scrap, diamonds, score, patrolling officer, conk and tag.
3. ⬜ **A real level** — the prize and alarm, a getaway van to bank your score, checkpoints, 3 lives.
4. ⬜ **Polish** — title screen, sound effects, three levels, saved best score.
5. ⬜ **Optional** — wrap it as an Android app with Capacitor.

The full plan lives in [SPEC.md](SPEC.md). [HANDOFF.md](HANDOFF.md) has the practical notes:
how to run it, where the project stands, and which parts of the code to touch first.

## How it's built

| Piece | Choice |
|---|---|
| Engine | [Phaser 3.80](https://phaser.io) with arcade physics |
| Language | Plain JavaScript — no build tools, no framework |
| Markup | One HTML page with a fullscreen canvas |
| Art | Pixel art generated in code on canvas textures |
| Storage | `localStorage` (best score, later) |

```
index.html   the page: canvas, styling, rotate hint, script tags
game.js      everything else — art, level, physics, controls, HUD
SPEC.md      the plan and milestone checklist
HANDOFF.md   how to run it, current state, where to start hacking
```

### Tweaking it

Everything you'd want to change first is in one place near the top of `game.js`:

- **`TUNING`** — the feel numbers: gravity, jump velocity, jump cut, coyote time, acceleration.
  Change these before anything else if the movement feels wrong.
- **`LEVEL`** — the layout as plain data: ground ranges, platform positions, lamp columns, start
  column, every loot item, and the officer's patrol range. Edit numbers, not an ASCII map.

There's also a dev hook: open the browser console and `MANGO.scene.getScene('game')` gives you the
live scene with `player`, `loot`, `officer` and `score` on it.

## Licence

[MIT](LICENSE) © 2026 P. Petkov — use it, change it, ship it, just keep the copyright notice.

The character and art are original to this project, so there are no third-party asset terms to worry
about. The only dependency is [Phaser 3](https://phaser.io), which is also MIT.
