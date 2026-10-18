# HeliRescue — Project

> **Status:** APPROVED by owner 2026-10-18 (discovery answers and the plan "HeliRescue — Plan for Approval").

## 1. Summary

A side-scrolling rescue game in the spirit of Choplifter. You fly a rescue helicopter into a near-future war zone, land on rooftops while trapped people run aboard, and fly them back to base while enemies try to shoot them and you down. You score for every person you bring home.

## 2. Scope (version 1.0)

| Area | Decision |
|---|---|
| Genre and camera | Side-scrolling. One wide world per mission (about 4–6 screens); the camera follows the helicopter. Your base is on one side. |
| Core loop | Fly out, land on a rooftop, people run aboard, fly back to base and unload. People count as saved only when unloaded at base. |
| Capacity | 8–12 people on board at once; exact number set by play-testing (`tuning.ts`) |
| Controls | Keyboard only: fly with arrows or WASD, fire the forward gun, drop bombs, pause, M to mute. No touch or gamepad in v1. |
| Helicopter | Health bar; a hard landing damages it; it cannot land on top of people. 3 helicopters for the whole game. |
| Weapons | Forward-firing gun and bombs that drop straight down. No power-ups in v1. |
| Enemies | Ground soldiers (shoot at people running to the helicopter), tanks, anti-aircraft guns (shoot at the helicopter), enemy aircraft from mission 2 |
| Missions | 5 missions that get harder. A mission ends when every person is rescued or dead. |
| Session | About 3–5 minutes per mission |
| Scoring | Points per person saved, a bonus per mission, no penalty for losses. High score in localStorage only. |
| Tone and setting | Near-future war zone, all ages, cartoon style. People fall over or vanish when hit, no blood. |
| Art | A mix of the shared art pack (`legacy/`, CC0), other free-licence (CC0) packs, and art Claude makes. Chosen by the owner in an art test (M1). Each third-party source needs the owner's approval. |
| Audio | Sound effects and a music loop, if suitable free sources exist. Each third-party source needs the owner's approval. Under 3 MB in total. |
| Portal | A card in the portal with a 256×192 gameplay image in the same style as the other games |

Out of scope for v1: online scores, accounts, touch and gamepad controls, power-ups, a level editor.

## 3. Constraints (shared by every Soncrant Arcade game)

- Browser only, single player, desktop browsers (current Chrome, Firefox, Safari, Edge).
- No accounts, payments, analytics, cookies or third-party requests. localStorage holds only the high score (and the mute setting, see section 4).
- Art keeps its native pixel style; whole-number scaling only.
- Served at `games.soncrant.com/helirescue/` over HTTP (ADR-010), behind the security headers in the portal's Apache config.

## 4. Definition of done for v1.0

- Live on production at `games.soncrant.com/helirescue/` with its card shown in the portal.
- All 5 missions playable, at a steady 60 fps on a mid-range laptop.
- Every check passing (CI, CodeQL, npm audit, Gitleaks, ZAP on staging and production).
- The owner approves it after a play-test. No deadline.

## 5. Decisions confirmed by the owner

| Date | Decision |
|---|---|
| 2026-10-18 | Classic Choplifter loop; 5 missions; 3 helicopters; health bar; gun and bombs; enemy types as in section 2 |
| 2026-10-18 | Near-future setting, all ages, cartoon style, no blood |
| 2026-10-18 | Art from the pack, free-licence packs and Claude-made art, chosen in a short art test |
| 2026-10-18 | Add sound if possible |
| 2026-10-18 | Slug `helirescue`, title "HeliRescue", ports 5180 (dev), 6180 (preview), 6181 (Playwright) |
| 2026-10-18 | Same release process and portal integration as the other games, with a card image in their style |
| 2026-10-18 | A new docs page for HeliRescue (separate from Star Destroyer's) |
| 2026-10-18 | Art test picks approved: Claude's helicopter and building tiles, recoloured pack civilians and soldier, pack tank, gunship and backdrops, CC0 VTOL jet, CC-BY turret credited on the title screen; screen 480×270 |
| 2026-10-18 | Keep the art test as a developer art viewer (`?scene=art`); remove the unused edomin helicopter |

## 6. Open questions

1. Remembering the mute setting would need a second localStorage key; the shared rule allows only the high score. Decide in M4 (otherwise mute resets each visit).
