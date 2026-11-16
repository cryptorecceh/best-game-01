# AETHER HARVEST

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/cryptorecceh/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/cryptorecceh/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A complete original browser game: pilot the little skiff **Kestrel** through a drifting starfield, harvest star shards, chain them into combos, dash through golden rings for bonuses, and never touch a void mine. Waves rise every 20 shards — faster spawns, more mines, and from wave 2, comets streak across the field. Shield, magnet and slow-mo power-ups keep a run alive. Three lives, a best score that persists, synthesized sound, and a full loop from title screen to game over and restart.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request: `game/` is plain static files. Play with keyboard (WASD/arrows to steer, Space to dash, P to pause, M to mute, R to restart) or mouse (hold to steer toward the cursor, right-click to dash).

## How it is built

- `game/src/config.js` — tuning, palette, event codes
- `game/src/random.js` — seeded RNG (deterministic replays and screenshots)
- `game/src/audio.js` — synthesized WebAudio sound effects, no audio files
- `game/src/input.js` — keyboard + mouse input
- `game/src/world.js` — simulation: spawning, waves, collisions, combo, power-ups
- `game/src/render.js` — all art drawn on canvas, plus HUD and screens
- `game/src/shots.js` — deterministic screenshot scenes via a simple autopilot
- `game/src/main.js` — boot, fixed-step loop, screen state machine
- `main.ts` — the make.fun handoff program (copies `game/` + `screenshots/` to `/output`, writes `dossier.json`)

## Screenshots

`1-start.jpg` title screen · `2-play.jpg` mid-game with HUD and combo · `3-surge.jpg` wave 3, ring dash and power-ups · `4-end.jpg` game-over screen with score and restart. All four are real renders of the game's own code, staged by `game/src/shots.js` and captured headless in Firefox.

---

<sub>Entered on [make.fun](https://make.fun/?ref=zdkc9vmx&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
