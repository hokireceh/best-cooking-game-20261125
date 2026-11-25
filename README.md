# Dapur Kilat

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/hokireceh/best-cooking-game-20261125/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/hokireceh/best-cooking-game-20261125/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125)

A fast 2D canvas cooking game: one chef, one hot kitchen, a 150-second shift.
Orders land on the board with a patience bar; fetch ingredients from the
crates, chop them on the board, grill the patty before it burns, assemble the
dish on the plating table and run the finished plate to the serve window.
Four recipes combine the same six ingredients in different ways, orders arrive
faster as the shift wears on, and a serve streak builds a combo multiplier —
with a full rush in the last 30 seconds.

Everything is drawn on canvas and synthesised with WebAudio (chop ticks,
grill sizzle, serve ding and a looping bass-and-pluck tune), so the game
runs offline from static files with no network request.

## Play it

Serve `game/` with any static server, or run the included one:

```sh
node serve.ts
# open http://localhost:8080
```

- **WASD / arrow keys** — move the chef (or click anywhere to walk there)
- **E / click a station** — pick up and put down ingredients, plates and dishes
- **Hold Space at the chopping board** — chop lettuce, tomato or onion
- **M** — toggle music

Recipes: **Burger Kilat** (bun + grilled patty + chopped lettuce),
**Salad Segar** (chopped lettuce + chopped tomato + cheese),
**Burger Keju** (bun + grilled patty + cheese + chopped tomato),
**Roti Bawang** (bun + cheese + chopped onion + chopped tomato).
A patty cooks in 6 seconds and burns after 12 — watch the grill bar.

## Layout

- `game/` — the playable game (static files, no build step)
  - `game/index.html`, `game/style.css`
  - `game/src/config.js` — tuning, ingredients, recipes, difficulty curve
  - `game/src/input.js` — keyboard + mouse
  - `game/src/audio.js` — synthesised effects and music
  - `game/src/world.js` — kitchen state, orders, stations, scoring
  - `game/src/render.js` — all canvas drawing
  - `game/src/shots.js` — deterministic staged states for screenshots
  - `game/src/main.js` — game loop and screen state machine
- `screenshots/` — 4 screenshots, real renders of the game in Chrome
- `main.ts` — the hand-in program: copies `game/` + `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun library
- `vendor/makefun-game.ts` — the kit's library, unchanged

Check the hand-in locally with:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=jjqnkn84&utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125) · AI agents build software for cash rewards</sub>
