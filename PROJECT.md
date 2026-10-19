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
| Controls | Keyboard on desktop: fly with arrows or WASD, Turn (flips the helicopter to face the other way; the direction of flight does not turn it), fire the forward gun, drop bombs, pause, M to mute. Touch on phones and tablets: an on-screen D-pad (left thumb) and Turn, Fire and Bomb buttons (right thumb), landscape only (a "turn your phone sideways" message in portrait). The game pauses when the tab or app loses focus. No gamepad in v1. |
| Helicopter | Health bar; a hard landing damages it; it cannot land on top of people. 3 helicopters per mission: losing all three is game over, and Retry restarts the current mission with 3 helicopters and the score you entered it with. |
| Weapons | Forward-firing gun and bombs that drop straight down. Your own shots and bombs can hit the people too (they vanish and count as lost, no blood). No power-ups in v1. |
| Enemies | Soldiers on rooftops and in the street (shoot at people running to the helicopter), tanks, anti-aircraft guns (shoot at the helicopter), enemy aircraft from mission 2 |
| Missions | 5 missions that get harder. A mission ends when every person is rescued or lost. Progress is remembered: you can start from the furthest mission reached. |
| Session | About 3–5 minutes per mission |
| Scoring | Points per person saved; a mission bonus scaled by the share of people saved, plus a perfect-rescue bonus; no penalty for losses. High score in localStorage (see section 3). |
| Tone and setting | Near-future war zone, all ages, cartoon style. People fall over or vanish when hit, no blood. |
| Art | A mix of the shared art pack (`legacy/`, CC0), other free-licence (CC0) packs, and art Claude makes. Chosen by the owner in an art test (M1). Each third-party source needs the owner's approval. |
| Audio | Sound effects and a music loop, if suitable free sources exist. Each third-party source needs the owner's approval. Under 3 MB in total. |
| Portal | A card in the portal with a 256×192 gameplay image in the same style as the other games |

Out of scope for v1: online scores, accounts, gamepad controls, power-ups, a level editor.

## 3. Constraints (shared by every Soncrant Arcade game)

- Browser only, single player. Desktop browsers (current Chrome, Firefox, Safari, Edge) and phones and tablets (Safari on iOS and iPadOS, Chrome on Android) in landscape.
- No accounts, payments, analytics, cookies or third-party requests. localStorage holds one key, `helirescue`, with the high score, the mute setting and the furthest mission reached (H9); no personal data.
- Art keeps its native pixel style; whole-number scaling on desktop, fit-to-screen scaling on phones and tablets (H8).
- Served at `games.soncrant.com/helirescue/` over HTTP (ADR-010), behind the security headers in the portal's Apache config.

## 4. Definition of done for v1.0

- Live on production at `games.soncrant.com/helirescue/` with its card shown in the portal.
- All 5 missions playable, at a steady 60 fps on a mid-range laptop, and playable with touch on a mid-range phone in landscape.
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
| 2026-10-18 | Draw a proper base (hangar, flag, large H pad) in M2.4 |
| 2026-10-18 | Playable on phones and tablets too: touch D-pad and buttons, landscape only, built in M2 before the first release (scope change from keyboard only) |
| 2026-10-18 | First release stays as it is (no controls hint or "rescue complete" message) until M3 brings the title and result screens |
| 2026-10-18 | PM review: WebKit (Safari, iPhone, iPad) added to the e2e browsers; fit-to-screen scaling on phones and tablets (H8); one localStorage key for the high score, mute and progress (H9); Retry restarts the current mission on game over; mission bonus scaled by the share of people saved; soldiers on rooftops and in the street; the game pauses on focus loss |
| 2026-10-18 | M3 reordered: the mission frame (people groups, mission end, lives, title) comes before weapons and enemies, so a winnable mission can be play-tested early |
| 2026-10-18 | Turning: a Turn key (and a third touch button) flips the helicopter; the gun fires the way it faces, so it can retreat while shooting. Confirmed by the owner |
| 2026-10-19 | Friendly fire: the helicopter's own bullets and bombs can hit the people (lost, no blood), as in Choplifter (scope change) |
| 2026-10-19 | Street soldiers' shots pass the edge of the roof their target stands on (other buildings still block them), so they are a real threat to people on roofs |
| 2026-10-19 | M3.7 frame-rate check: an automated frame-time budget test (our per-frame work in a busy scene), plus the owner's play-test on real devices |

## 6. Open questions

1. Phone performance target: 60 fps on a mid-range phone from the last three years? Decide in M2.6 when the first phone measurement exists.
