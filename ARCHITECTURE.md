# HeliRescue — Architecture

> **Status:** H1–H9 accepted by owner 2026-10-18 (H8 and H9 from the PM review).

The shared decisions for every Soncrant Arcade game are recorded once, in
[`soncsec/star-destroyer` ARCHITECTURE.md](https://github.com/soncsec/star-destroyer/blob/main/ARCHITECTURE.md):

| ADR | Decision |
|---|---|
| 001 | Static site, no backend; high score in localStorage |
| 002 | Phaser 4 game engine |
| 003 | TypeScript |
| 004 | Vite build, relative base, no runtime CDN |
| 005 | GitHub Pages staging, Apache production |
| 006 | Rules in engine-free `src/logic/` with unit tests; Playwright e2e with a test-only hook; seeded RNG |
| 007 | Security tooling: CodeQL, ESLint, npm audit, gitleaks, ZAP |
| 008 | Portal card from one file per game, changed only by PR |
| 009 | Releases: `/srv/games-releases/<slug>/<id>/`, atomic symlink switch, rollback |
| 010 | HTTP on port 80 |
| 011 | Parallel games: one repo, folder, port and portal file per game |
| 012 (pattern) | Levels as data, with one `difficulty()` function whose limits are enforced by tests |

## Code structure

```
src/
├── main.ts            Phaser config, scaling (H8), loads the test hook in the e2e build only
├── config/tuning.ts   every gameplay number
├── logic/             game rules: flight, landing, boarding, scoring, difficulty, mission progress
│                      (plain TypeScript, no Phaser imports (ESLint enforces), unit tested)
├── missions/          one data file per mission (H4)
├── scenes/            Phaser scenes: title, game, HUD, mission result, pause, art preview; thin, call into logic/
├── (pooling)          shots live in a fixed pool in logic/weapons.ts; the scene keeps one sprite per
│                      slot and a few reused effect sprites (enemies will follow the same pattern)
└── debug/testHook.ts  window.__game for Playwright (e2e build only)
tests/
├── unit/              Vitest, 80% coverage floor on src/logic
├── e2e/               Playwright in Chromium, Firefox and WebKit (Safari, iPhone, iPad), incl. the production CSP
└── release/           release scripts against a fake server
scripts/               release.sh, release-remote.sh, smoke_test.py, zap_check.py, check_repo.py
tools/art/             sprite generator for Claude-made art (H6)
tools/docs-page/       builds the docs page from the four docs
```

## Game decisions

### H1: World and camera — *Accepted 2026-10-18*

- **Decision:** one wide world per mission (about 4–6 screens). The camera follows the helicopter over a layered (parallax) city background. The base is at one end.
- **Alternatives:** a single fixed screen (too small for the trip back to base); an auto-scrolling level (stops you flying back).
- **Tradeoffs:** a follow camera needs off-screen culling to keep the frame rate steady (see pooling rules).

### H2: Flight model — *Accepted 2026-10-18*

- **Decision:** our own arcade flight rules in `src/logic/flight.ts`: thrust, drag, tilt and light gravity, all numbers in `tuning.ts`. Phaser's Arcade physics is used only for collision checks.
- **Alternatives:** Phaser Arcade velocity alone (too little control over hovering and landing); Matter.js rigid-body physics (realistic, but hard to tune and test).
- **Tradeoffs:** a small amount of our own code, in return for flight that is unit tested and easy to tune.
- **Amended 2026-10-18 (confirmed by the owner):** facing is set by a Turn key or button, not by the direction of flight, so the gun fires the way the helicopter faces and it can retreat while shooting (as in Choplifter). Built in M3.5: C or the touch Turn button, airborne only.

### H3: Landing and boarding rules — *Accepted 2026-10-18*

- **Decision:** pure TypeScript state machines. Helicopter: flying, landing, landed, crashed. Person: waiting, running, boarding, aboard, unloading, saved, lost. Safe and hard landing thresholds live in `tuning.ts`.
- **Alternatives:** rules written inside the Phaser scene (hard to test).
- **Tradeoffs:** these rules decide score and fairness, so they get unit tests; scenes only draw the states.

### H4: Missions as data — *Accepted 2026-10-18*

- **Decision:** each mission is a data object in `src/missions/`: buildings (position, width, height), people per roof, enemy roster, spawn timeline. Buildings are assembled from tiles at runtime. One `difficulty(mission)` function produces every difficulty number, and tests enforce its limits (same pattern as Star Destroyer ADR-012).
- **Alternatives:** Tiled maps, as Contro uses (needs an install; suits complex maps); one hand-coded scene per mission.
- **Tradeoffs:** a small data format to design (M5); missions are then reviewable data and cheap to add.

### H5: Enemy behaviour — *Accepted 2026-10-18*

- **Decision:** simple rules per enemy type (patrol, aim, fire with a cooldown) with clear targets: soldiers aim at running people, anti-aircraft guns at the helicopter. All randomness uses the seeded RNG.
- **Alternatives:** a behaviour-tree library (a new dependency; more than four enemy types need).

### H6: Claude-made art — *Accepted 2026-10-18*

- **Decision:** pixel art drawn as text grids and turned into PNGs by a small Node script in `tools/art/`, using only Node's built-in `zlib`. Generated PNGs are committed and listed in `CREDITS.md`.
- **Alternatives:** Aseprite (paid desktop app); Python Pillow (not installed; a new dependency).
- **Tradeoffs:** no new install or dependency; sprites stay reviewable in PRs.

### H7: Sound — *Accepted 2026-10-18*

- **Decision:** sound files played through Phaser's sound system. Effects are generated by us (retro synth) or taken from CC0 packs; music loops come from CC0 sources. The owner approves each third-party source. Sound starts on the first key press (browser autoplay rule); M mutes. Audio stays under 3 MB.
- **Alternatives:** sound synthesised live in the browser with Web Audio (no files, but more code and weaker music).

### H8: Scaling — *Accepted 2026-10-18*

- **Decision:** on desktop the canvas uses whole-number zoom (crisp pixels; 1920×1080 is exactly 4×). On touch devices (`hover: none` and `pointer: coarse`) it scales to fit the screen in landscape, keeping the 16:9 ratio, because whole-number zoom leaves a phone at 1× (480×270 in the middle of an 844×390 screen). Phaser's `pixelArt` setting keeps the pixels sharp either way.
- **Alternatives:** whole-number zoom everywhere (too small on phones); a lower game resolution on phones (two layouts to maintain).
- **Tradeoffs:** pixels are not an exact multiple on phones, which is barely visible at phone pixel densities.

### H9: Saved data — *Accepted 2026-10-18*

- **Decision:** one localStorage key, `helirescue`, holding a small JSON object: the high score, the mute setting and the furthest mission reached. Read through one tested module in `src/logic/` that validates the shape and falls back to defaults on anything unexpected. No personal data, nothing else.
- **Alternatives:** one key per value (the shared rule "only the high score" would then need re-opening for every feature); no saved progress (a five-mission run with no way back is harsh for an all-ages game).
- **Tradeoffs:** a three-field object instead of one number; the same privacy footprint.
