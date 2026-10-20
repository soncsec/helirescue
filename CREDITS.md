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

Mission backdrops picked by the owner from an in-game preview (M5.4, 2026-10-20), unchanged:

- `assets/backgrounds/downtown-sky.png`, `assets/backgrounds/downtown-far.png`: Warped, Urban-landscape (Sky-layer, buildings-layer)
- `assets/backgrounds/harbour-sky.png`, `assets/backgrounds/harbour-clouds.png`, `assets/backgrounds/harbour-near.png`: Warped, Ocean View, Day (Back, Clouds, Middle)
- `assets/backgrounds/mountain-sky.png`, `assets/backgrounds/mountain-far.png`, `assets/backgrounds/mountain-houses.png`, `assets/backgrounds/mountain-town.png`: Gothicvania, night-town-background (sky, mountains, far-buildings, town)

Recoloured from the pack by `tools/art/recolour.mjs` (still CC0):

- `assets/sprites/civilian-blue-walk.png`, `assets/sprites/civilian-green-walk.png`, `assets/sprites/civilian-yellow-walk.png`: Warped, cyberpunk-detective (walk)
- `assets/sprites/soldier.png`: Warped, space-marine-lite (run, shoot, die)

### Made for HeliRescue

Drawn by Claude with the scripts in `tools/art/`. Same licence as this repo.

- `assets/sprites/heli-side.png`, `assets/sprites/heli-front.png`: `tools/art/helicopter.mjs`
- `assets/tiles/buildings-night.png`, `assets/tiles/buildings-war.png`: `tools/art/buildings.mjs`
- `assets/sprites/base.png`: `tools/art/base.mjs` (the rescue base, M2.4)
- `assets/sprites/bullet.png`, `assets/sprites/bomb.png`, `assets/sprites/spark.png`: `tools/art/weapons.mjs` (the gun and bombs, M3.5)
- `assets/sprites/flak.png`, `assets/sprites/burst.png`: `tools/art/weapons.mjs` (enemy flak, M3.6)

### Other sources (approved by the owner 2026-10-18)

- `assets/sprites/vtol-jet.png`: "VTOL Military Vigilante Turbojet Fighter Plane" by Reactorcore, CC0 1.0. https://opengameart.org/content/vtol-military-vigilante-turbojet-fighter-plane (Milspec_3.png, unchanged)
- `assets/sprites/aa-turret.png`: "Open Gunner Expansion Pack 1" by master484, **CC-BY 3.0** (https://creativecommons.org/licenses/by/3.0/), credited in the game (`src/config/credits.ts`). https://opengameart.org/content/open-gunner-expansion-pack-1. Changes: the red rotating turret's first row of 5 frames was cropped from OpenGunnerEnemies2.png (rows 7–38 of each 50×50 box) and its background made transparent.

## Font

- **Press Start 2P** by CodeMan38 (Copyright 2012 The Press Start 2P Project Authors), SIL Open Font License 1.1, used for the HUD. File `src/assets/fonts/PressStart2P-Regular.ttf`, SHA-256 `034c77f1f05ec89421e4a63f0e3a4ca1ecf852cc6d2bf611f126f275728e017d`: the same file as the games portal and Star Destroyer (source: `google/fonts` repo, `ofl/pressstart2p/`). Licence text: `src/assets/fonts/PressStart2P-OFL.txt`. Approved by the owner for HeliRescue 2026-10-18.

## Audio

Sound effects and music from CC0 packs, each approved by the owner (2026-10-19). Built by `tools/audio/build_audio.py`, which checks each downloaded pack against the SHA-256 recorded in it; only the files below are copied.

<!-- audio:start -->
| File | Source | Changes |
|---|---|---|
| `assets/audio/sfx-rotor.ogg` | [sci-fi_sounds.zip](https://opengameart.org/content/sci-fi-sounds) `Audio/engineCircular_000.ogg` by Kenney, CC0 | mono 22 kHz, re-encoded to Ogg Vorbis |
| `assets/audio/sfx-rotor.m4a` | [sci-fi_sounds.zip](https://opengameart.org/content/sci-fi-sounds) `Audio/engineCircular_000.ogg` by Kenney, CC0 | mono 22 kHz, AAC (M4A) copy for iPhone Safari |
| `assets/audio/sfx-gun.ogg` | [sci-fi_sounds.zip](https://opengameart.org/content/sci-fi-sounds) `Audio/laserSmall_002.ogg` by Kenney, CC0 | mono 22 kHz, re-encoded to Ogg Vorbis |
| `assets/audio/sfx-gun.m4a` | [sci-fi_sounds.zip](https://opengameart.org/content/sci-fi-sounds) `Audio/laserSmall_002.ogg` by Kenney, CC0 | mono 22 kHz, AAC (M4A) copy for iPhone Safari |
| `assets/audio/sfx-bomb-drop.ogg` | [Digital_SFX_Set.zip](https://opengameart.org/content/63-digital-sound-effects-lasers-phasers-space-etc) `phaserDown2.mp3` by Kenney, CC0 | mono 22 kHz, re-encoded to Ogg Vorbis |
| `assets/audio/sfx-bomb-drop.m4a` | [Digital_SFX_Set.zip](https://opengameart.org/content/63-digital-sound-effects-lasers-phasers-space-etc) `phaserDown2.mp3` by Kenney, CC0 | mono 22 kHz, AAC (M4A) copy for iPhone Safari |
| `assets/audio/sfx-blast.ogg` | [sci-fi_sounds.zip](https://opengameart.org/content/sci-fi-sounds) `Audio/explosionCrunch_002.ogg` by Kenney, CC0 | mono 22 kHz, re-encoded to Ogg Vorbis |
| `assets/audio/sfx-blast.m4a` | [sci-fi_sounds.zip](https://opengameart.org/content/sci-fi-sounds) `Audio/explosionCrunch_002.ogg` by Kenney, CC0 | mono 22 kHz, AAC (M4A) copy for iPhone Safari |
| `assets/audio/sfx-crash.ogg` | [sci-fi_sounds.zip](https://opengameart.org/content/sci-fi-sounds) `Audio/lowFrequency_explosion_000.ogg` by Kenney, CC0 | mono 22 kHz, re-encoded to Ogg Vorbis |
| `assets/audio/sfx-crash.m4a` | [sci-fi_sounds.zip](https://opengameart.org/content/sci-fi-sounds) `Audio/lowFrequency_explosion_000.ogg` by Kenney, CC0 | mono 22 kHz, AAC (M4A) copy for iPhone Safari |
| `assets/audio/sfx-flak.ogg` | [sci-fi_sounds.zip](https://opengameart.org/content/sci-fi-sounds) `Audio/laserLarge_003.ogg` by Kenney, CC0 | mono 22 kHz, re-encoded to Ogg Vorbis |
| `assets/audio/sfx-flak.m4a` | [sci-fi_sounds.zip](https://opengameart.org/content/sci-fi-sounds) `Audio/laserLarge_003.ogg` by Kenney, CC0 | mono 22 kHz, AAC (M4A) copy for iPhone Safari |
| `assets/audio/sfx-heli-hit.ogg` | [sci-fi_sounds.zip](https://opengameart.org/content/sci-fi-sounds) `Audio/impactMetal_000.ogg` by Kenney, CC0 | mono 22 kHz, re-encoded to Ogg Vorbis |
| `assets/audio/sfx-heli-hit.m4a` | [sci-fi_sounds.zip](https://opengameart.org/content/sci-fi-sounds) `Audio/impactMetal_000.ogg` by Kenney, CC0 | mono 22 kHz, AAC (M4A) copy for iPhone Safari |
| `assets/audio/sfx-soldier-shot.ogg` | [sci-fi_sounds.zip](https://opengameart.org/content/sci-fi-sounds) `Audio/laserRetro_000.ogg` by Kenney, CC0 | mono 22 kHz, re-encoded to Ogg Vorbis |
| `assets/audio/sfx-soldier-shot.m4a` | [sci-fi_sounds.zip](https://opengameart.org/content/sci-fi-sounds) `Audio/laserRetro_000.ogg` by Kenney, CC0 | mono 22 kHz, AAC (M4A) copy for iPhone Safari |
| `assets/audio/sfx-spark.ogg` | [sci-fi_sounds.zip](https://opengameart.org/content/sci-fi-sounds) `Audio/impactMetal_004.ogg` by Kenney, CC0 | mono 22 kHz, re-encoded to Ogg Vorbis |
| `assets/audio/sfx-spark.m4a` | [sci-fi_sounds.zip](https://opengameart.org/content/sci-fi-sounds) `Audio/impactMetal_004.ogg` by Kenney, CC0 | mono 22 kHz, AAC (M4A) copy for iPhone Safari |
| `assets/audio/sfx-land.ogg` | [sci-fi_sounds.zip](https://opengameart.org/content/sci-fi-sounds) `Audio/impactMetal_001.ogg` by Kenney, CC0 | mono 22 kHz, re-encoded to Ogg Vorbis |
| `assets/audio/sfx-land.m4a` | [sci-fi_sounds.zip](https://opengameart.org/content/sci-fi-sounds) `Audio/impactMetal_001.ogg` by Kenney, CC0 | mono 22 kHz, AAC (M4A) copy for iPhone Safari |
| `assets/audio/sfx-hard-land.ogg` | [sci-fi_sounds.zip](https://opengameart.org/content/sci-fi-sounds) `Audio/impactMetal_003.ogg` by Kenney, CC0 | mono 22 kHz, re-encoded to Ogg Vorbis |
| `assets/audio/sfx-hard-land.m4a` | [sci-fi_sounds.zip](https://opengameart.org/content/sci-fi-sounds) `Audio/impactMetal_003.ogg` by Kenney, CC0 | mono 22 kHz, AAC (M4A) copy for iPhone Safari |
| `assets/audio/sfx-board.ogg` | [Digital_SFX_Set.zip](https://opengameart.org/content/63-digital-sound-effects-lasers-phasers-space-etc) `pepSound1.mp3` by Kenney, CC0 | mono 22 kHz, re-encoded to Ogg Vorbis |
| `assets/audio/sfx-board.m4a` | [Digital_SFX_Set.zip](https://opengameart.org/content/63-digital-sound-effects-lasers-phasers-space-etc) `pepSound1.mp3` by Kenney, CC0 | mono 22 kHz, AAC (M4A) copy for iPhone Safari |
| `assets/audio/sfx-saved.ogg` | [Digital_SFX_Set.zip](https://opengameart.org/content/63-digital-sound-effects-lasers-phasers-space-etc) `powerUp2.mp3` by Kenney, CC0 | mono 22 kHz, re-encoded to Ogg Vorbis |
| `assets/audio/sfx-saved.m4a` | [Digital_SFX_Set.zip](https://opengameart.org/content/63-digital-sound-effects-lasers-phasers-space-etc) `powerUp2.mp3` by Kenney, CC0 | mono 22 kHz, AAC (M4A) copy for iPhone Safari |
| `assets/audio/sfx-lost.ogg` | [Digital_SFX_Set.zip](https://opengameart.org/content/63-digital-sound-effects-lasers-phasers-space-etc) `lowDown.mp3` by Kenney, CC0 | mono 22 kHz, re-encoded to Ogg Vorbis |
| `assets/audio/sfx-lost.m4a` | [Digital_SFX_Set.zip](https://opengameart.org/content/63-digital-sound-effects-lasers-phasers-space-etc) `lowDown.mp3` by Kenney, CC0 | mono 22 kHz, AAC (M4A) copy for iPhone Safari |
| `assets/audio/sfx-complete.ogg` | [Digital_SFX_Set.zip](https://opengameart.org/content/63-digital-sound-effects-lasers-phasers-space-etc) `powerUp12.mp3` by Kenney, CC0 | mono 22 kHz, re-encoded to Ogg Vorbis |
| `assets/audio/sfx-complete.m4a` | [Digital_SFX_Set.zip](https://opengameart.org/content/63-digital-sound-effects-lasers-phasers-space-etc) `powerUp12.mp3` by Kenney, CC0 | mono 22 kHz, AAC (M4A) copy for iPhone Safari |
| `assets/audio/sfx-game-over.ogg` | [Digital_SFX_Set.zip](https://opengameart.org/content/63-digital-sound-effects-lasers-phasers-space-etc) `zapThreeToneDown.mp3` by Kenney, CC0 | mono 22 kHz, re-encoded to Ogg Vorbis |
| `assets/audio/sfx-game-over.m4a` | [Digital_SFX_Set.zip](https://opengameart.org/content/63-digital-sound-effects-lasers-phasers-space-etc) `zapThreeToneDown.mp3` by Kenney, CC0 | mono 22 kHz, AAC (M4A) copy for iPhone Safari |
| `assets/audio/sfx-select.ogg` | [Digital_SFX_Set.zip](https://opengameart.org/content/63-digital-sound-effects-lasers-phasers-space-etc) `twoTone1.mp3` by Kenney, CC0 | mono 22 kHz, re-encoded to Ogg Vorbis |
| `assets/audio/sfx-select.m4a` | [Digital_SFX_Set.zip](https://opengameart.org/content/63-digital-sound-effects-lasers-phasers-space-etc) `twoTone1.mp3` by Kenney, CC0 | mono 22 kHz, AAC (M4A) copy for iPhone Safari |
| `assets/audio/music.ogg` | [dark-happy-world.zip](https://opengameart.org/content/dark-happy-world) `dark-happy-world/dark-happy-world.ogg` by ansimuz (Luis Zuno), CC0 | mono 22 kHz, re-encoded to Ogg Vorbis |
| `assets/audio/music.m4a` | [dark-happy-world.zip](https://opengameart.org/content/dark-happy-world) `dark-happy-world/dark-happy-world.ogg` by ansimuz (Luis Zuno), CC0 | mono 22 kHz, AAC (M4A) copy for iPhone Safari |
<!-- audio:end -->
