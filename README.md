# makefun-flight-game

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/nofrizal05/makefun-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/nofrizal05/makefun-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Merapi Run — a complete, original chase-view flight game that plays offline in a desktop browser. Fly the Elang-7 down a green valley under a volcano, thread six glowing rings over the river and rice fields, watch your fuel, then land her smooth on runway 09 at Minang Airfield.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — no build step, no network requests, no libraries. The game is plain static files under `game/`.

## How to fly

- **← → / A D** — bank and turn
- **↑ ↓** — pitch (climb / descend)
- **W / S** — throttle lever up / down
- **B or Space** — brake on the runway
- **Hold the mouse button** — steer with the pointer (M toggles mouse steering)
- **P** — pause, **R** — restart, **Enter** — take off

## The sortie

1. Take off from Minang Airfield and climb over the valley.
2. Fly through all six rings — 100 points each, 25 for a near miss.
3. Line up with runway 09 and land: a gentle touchdown at the right speed scores 250, plus 150 for a smooth landing. Come in too fast or too steep and the Elang-7 is wreckage.
4. Mind the fuel gauge and the stall warning — empty tanks mean a glide, and a slow wing drops its nose.

The HUD shows altitude, speed, heading, vertical speed, fuel, throttle, score, rings, a compass strip, an attitude indicator, and the distance and direction to the next ring or the runway. Deterministic screenshot scenes are available at `?shot=start|play|end&seed=1`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=31w76kz9&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
