# Credits

Every file in `public/assets/` is listed here, as its path from `public/` in backticks. The repo check fails on unlisted or missing files.

## Art

Chosen by the owner in the art test (roadmap M1, 2026-10-18).

### Ansimuz Legacy Collection (CC0 1.0, public domain)

https://ansimuz.itch.io/ (shared art pack, `legacy/`)

- `assets/sprites/tank.png`: Warped, tank-unit
- `assets/sprites/gunship.png`: Warped, spaceship-unit
- `assets/sprites/explosion.png`: Explosions and Magic, explosion-1-b
- `assets/backgrounds/city-sky.png`, `assets/backgrounds/city-far.png`, `assets/backgrounds/city-near.png`: Warped, Synth City (city skyline layers)
- `assets/backgrounds/industrial-sky.png`, `assets/backgrounds/industrial-far.png`, `assets/backgrounds/industrial-near.png`: Warped, parallax-industrial

Recoloured from the pack by `tools/art/recolour.mjs` (still CC0):

- `assets/sprites/civilian-blue-walk.png`, `assets/sprites/civilian-green-walk.png`, `assets/sprites/civilian-yellow-walk.png`: Warped, cyberpunk-detective (walk)
- `assets/sprites/soldier.png`: Warped, space-marine-lite (run, shoot, die)

### Made for HeliRescue

Drawn by Claude with the scripts in `tools/art/`. Same licence as this repo.

- `assets/sprites/heli-side.png`, `assets/sprites/heli-front.png`: `tools/art/helicopter.mjs`
- `assets/tiles/buildings-night.png`, `assets/tiles/buildings-war.png`: `tools/art/buildings.mjs`
- `assets/sprites/base.png`: `tools/art/base.mjs` (the rescue base, M2.4)

### Other sources (approved by the owner 2026-10-18)

- `assets/sprites/vtol-jet.png`: "VTOL Military Vigilante Turbojet Fighter Plane" by Reactorcore, CC0 1.0. https://opengameart.org/content/vtol-military-vigilante-turbojet-fighter-plane (Milspec_3.png, unchanged)
- `assets/sprites/aa-turret.png`: "Open Gunner Expansion Pack 1" by master484, **CC-BY 3.0** (https://creativecommons.org/licenses/by/3.0/), credited in the game (`src/config/credits.ts`). https://opengameart.org/content/open-gunner-expansion-pack-1. Changes: the red rotating turret's first row of 5 frames was cropped from OpenGunnerEnemies2.png (rows 7–38 of each 50×50 box) and its background made transparent.
