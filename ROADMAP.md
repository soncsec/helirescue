# HeliRescue — Roadmap

> **Status:** APPROVED by owner 2026-10-18.
> Every milestone ends with something playable on staging. Each task is one small PR. Tasks in M3–M6 are split further when their milestone starts.
> Revised 2026-10-18 after the owner's PM review: M3 builds the mission frame (people groups, mission end, lives, title) before weapons and enemies; phones get fit-to-screen scaling and WebKit tests; one saved-data key; Retry on game over; the mission bonus follows the share saved.

## Progress

| Milestone | Status |
|---|---|
| M0 Setup | Done (2026-10-18) |
| M1 Art test | Done |
| M2 Walking skeleton (to production) | Done (2026-10-19) |
| M3 Mission 1 playable | Done (2026-10-19) |
| M4 Sound | Done (2026-10-19) |
| M5 Missions 2–5 | Done (2026-10-21) |
| M6 Polish and v1.0 release | In progress |

## Risks driving this order

| # | Risk | Mitigation | Addressed in |
|---|---|---|---|
| 1 | Art gaps: no helicopter, no rooftops to land on, few civilians in the pack; mixed sources may clash | Art test with candidates side by side in the game's scene; owner picks; sprites listed in one manifest so they can be swapped | M1 |
| 2 | Game feel: flying, hovering and landing are subjective and are the whole game | Walking skeleton is about flight and landing; every number in `tuning.ts`; owner play-tests on staging | M2, M3 |
| 3 | Many characters at once must be readable and fair | Rules in tested logic modules; seeded randomness; scripted e2e scenarios | M3 |
| 4 | Difficulty across 5 missions | One `difficulty()` with tested limits; owner play-tests | M5, M6 |
| 5 | Sound licences, size, autoplay rules | Owner approves each source; `CREDITS.md`; size check in CI; sound starts on first key press | M4 |
| 6 | Performance in a wide world with many bullets | Pooling, no updates off screen, automated frame-rate check | M3, M6 |
| 7 | Parallel sessions on this machine and the portal | Dedicated ports; separate portal clone; stop only our own processes | M0 |
| 8 | Supply chain | Only the template's dependencies; exact versions at least two weeks old; audits | Every PR |
| 9 | Phones: small screens, touch controls for a flight game, WebKit differences | Fit-to-screen scaling (H8); touch tests in a mobile viewport; WebKit in the e2e browsers | M2.6, M2.7 |

---

## M0 — Setup

**Demonstrable result:** `soncsec/helirescue` exists with a protected `main`, green CI, staging on, and the slug claimed in the portal.

- [x] M0.1 Discovery and plan; owner approved 2026-10-18
- [x] M0.2 Repo created from `soncsec/game-template`; `scripts/init-game.sh helirescue "HeliRescue" 5180`; approved docs and corrected CLAUDE.md; first CI run
- [x] M0.3 Branch protection on `main` with the four required checks; secret scanning with push protection; Dependabot alerts
- [x] M0.4 GitHub Pages turned on (Actions mode, `main` only); first staging deploy and ZAP scan pass
- [x] M0.5 Portal PR adding `games/helirescue.json` (status `in-development`) and the ports to NEW-GAME.md
- [x] M0.6 Docs page: builder in `tools/docs-page/`, published as a new HeliRescue docs page (https://claude.ai/artifact/KN8heqnPfx15tcX8vqXJwB)

**Acceptance criteria:** a direct push to `main` is rejected; a PR shows all checks green; staging loads; `legacy/` is not in the repo; the portal PR passes its checks.

**Verified 2026-10-18:** direct push to `main` rejected (GH006); PRs #1 and #2 green; staging deploy and ZAP baseline passed on `main`; https://soncsec.github.io/helirescue/ returns 200; `legacy/` git-ignored; portal PR #22 green and merged.

## M1 — Art test

**Demonstrable result:** an art preview on staging (`?scene=art`) shows candidate helicopters, rooftops, people, soldiers and enemies over the city background, animating at game scale. The owner chooses.

- [x] M1.1 Gather candidates: from the pack, from CC0 packs (listed with links and licences for approval), and Claude-made (`tools/art/`, H6)
- [x] M1.2 Preview scene with a side-by-side comparison and a mock gameplay frame per set
- [x] M1.3 Copy the chosen art into `public/assets/`; list every file in `CREDITS.md`

**Acceptance criteria:** the owner approves one art set; every file has a recorded licence; the preview runs on staging.

**Verified 2026-10-18:** the owner approved every pick, the 480×270 screen and an in-game credit for the CC-BY turret; every file is listed with its licence in `CREDITS.md` (checked by `check_repo.py`); the preview ran on staging after PR #4. The preview stays as a developer art viewer (`?scene=art`), with the unused candidate removed.

## M2 — Walking skeleton (to production)

**Demonstrable result:** at `games.soncrant.com/helirescue/` you fly over a short city, land on a rooftop, one person runs aboard, you fly back to base and unload them, and the score goes up.

- [x] M2.1 World and camera: wide level, layered background, base pad, a few buildings (H1)
- [x] M2.2 Flight model with tilt and rotor animation; keyboard controls (H2)
- [x] M2.3 Landing rules: safe landing, hard landing, no landing on people (H3)
- [x] M2.4 One person runs from the roof edge, boards, and is unloaded at base; score and HUD; a proper base drawn by Claude (hangar, flag, large H pad)
- [x] M2.5 First production release (keyboard play) and a live portal card, as soon as it is playable (owner, 2026-10-18): HUD font, a "touch controls coming soon" note on phones, card image; ZAP before and after
- [x] M2.6 Touch controls for phones and tablets: on-screen D-pad, landscape only with a "turn your phone sideways" message, fit-to-screen scaling on touch devices (H8) (scope change 2026-10-18). The Turn, Fire and Bomb buttons come with their actions in M3.5
- [x] M2.7 Playwright: fly, land, board, unload, check the score; touch controls in a mobile viewport in Chromium and WebKit; release with the owner's approval; first phone performance measurement (the owner plays on a real phone)
  - [x] WebKit (Safari, iPhone, iPad) added to the e2e browsers (PR #11, 2026-10-18)
  - [x] Full-rescue e2e test (`tests/e2e/rescue.spec.ts`): fly out, land, board, fly home, unload, score 100, no damage; with the keyboard in Chromium, Firefox and WebKit, and with the touch D-pad on a phone in Chromium and WebKit
  - [x] Release with the owner's approval; the owner plays on a real phone (2026-10-19: "It runs smoothly on iphone")

**Acceptance criteria:** each step works in the running game on staging and production; unit tests cover flight and landing rules; ZAP shows no high-risk alerts.

**M2.5 verified 2026-10-18:** game release `20261018T194318Z-55adfaf4` live at http://games.soncrant.com/helirescue/ (CI on 55adfaf: Gitleaks, build and test, CodeQL, staging deploy and ZAP baseline all passed; release smoke test passed with security headers). Portal release `20261018T223814Z-60019485` shows the card as live (portal PR #26; smoke test passed on all six live games). After both: the portal's Production check run 39173111194 passed (smoke test from outside the network and ZAP baseline scan of production). M2.6 and M2.7 remain.

**M2.6 verified 2026-10-18:** PR #13 merged (bc15059); main CI passed, including the staging deploy and ZAP baseline. Staging in a phone-sized WebKit window (844×390, touch) shows the D-pad, the canvas fills the full 390 px height (1.44× zoom), the portrait note is hidden in landscape, and there are no page errors. The e2e suite covers the D-pad flying the helicopter, the fit zoom on a phone, and the portrait note pausing the game, in Chromium and WebKit.

## M3 — Mission 1 playable

**Demonstrable result:** a complete first mission from takeoff to the result screen.

The frame of a mission comes first (M3.1–M3.4), so the owner can play-test a winnable mission before any enemy exists (reordered 2026-10-18).

- [x] M3.1 Several buildings with groups of people; carrying limit: mission 1 is 4 screens with 16 people in 5 groups (the helicopter carries 10, so at least two trips); every roof with people keeps room to land beside them (map check)
- [x] M3.2 Mission end when everyone is saved or lost; result screen with the bonus scaled by the share saved plus a perfect-rescue bonus; high score in the saved-data key (H9); Enter, Space or a tap plays again
- [x] M3.3 3 helicopters, game over, and Retry of the current mission: HELI xN under the health bar; the last wreck stays down, then GAME OVER with the points so far (no bonus); Retry restarts the mission with 3 helicopters
- [x] M3.4 Title screen (controls summary, CC-BY art credit) and pause (key, and on focus loss); the owner play-tests the winnable mission
  - [x] Title screen with the controls for the device, the high score and the CC-BY credit; pause with P or Esc, a touch pause button, and on focus loss (PR #19)
  - [x] CREDITS screen from the title (K, or a touch button) with the full CC-BY attribution, replacing the credit line on the title (owner, 2026-10-19)
  - [x] The owner play-tests mission 1 (2026-10-19, with enemies): flying good; difficulty good to start; scoring good; smooth on iPhone. Landing was not intuitive (holding Down caused damage), so landing now flares near a landing spot and hard landings come from sliding (PR #30)
  - [x] The owner re-tests the new landing on the live site: all good (2026-10-19)
- [x] M3.5 Turn key and button, forward gun and bombs, with pooled bullets and effects
  - [x] Turn: C or the touch Turn button turns the helicopter around (airborne only); flying no longer turns it, so it can fly backwards
  - [x] Forward gun (Z or Space, held) and bombs (X) with pooled shots and effects; FIRE and BOMB touch buttons; Claude-made bullet, bomb and spark sprites
- [x] M3.6 Soldiers on rooftops and in the street who shoot at people; anti-aircraft guns that shoot at the helicopter
  - [x] Anti-aircraft guns: aim at the helicopter, fire pooled flak (seeded timing) that takes its health and can crash it; 3 bullet hits or a bomb destroy them; 2 in mission 1
  - [x] Soldiers on rooftops and in the street who shoot at people running to the helicopter (leading their target; a hit person is lost); one bullet or a bomb takes them down; 3 in mission 1
- [x] M3.7 Frame-rate check for the acceptance criterion "steady 60 fps" (added 2026-10-19: no task covered it). Method approved by the owner: a frame-time budget (each game update under 8 ms at the 95th percentile, half a 60 fps frame, in a busy scene; `tests/e2e/frameBudget.spec.ts`), plus the owner's play-test on real devices

**Acceptance criteria:** mission 1 can be won or lost; scoring and saved-data rules are unit tested; an e2e test plays a scripted rescue on desktop and with touch; steady 60 fps in the frame-rate check; the owner approves the feel after a play-test, once without enemies (after M3.4) and once with.

## M4 — Sound

**Demonstrable result:** rotor, gun, bomb, explosion, boarding and UI sounds plus a music loop; M mutes.

- [x] M4.1 Sources listed for the owner's approval; generated effects where they fit
  - [x] Sound effects: Kenney's CC0 "Sci-fi Sounds" and "Digital SFX" packs, built like Contro (fingerprint-checked download; OGG plus an M4A copy for iPhone) (owner, 2026-10-19)
  - [x] Music: "Dark Happy World" by ansimuz (CC0), picked by the owner from three candidates (2026-10-19)
  - [x] `tools/audio/build_audio.py` builds 18 sounds as Ogg and M4A (1.63 MB in all) from the SHA-256-checked packs and writes the CREDITS.md table; the repo check enforces the 3 MB budget
- [x] M4.2 Sound starts on the first key press or tap; mute, remembered in the saved-data key (H9): M on a keyboard, a SOUND button on the touch title and pause screens; a rotor hum that follows the helicopter, and a sound for every game event

**Acceptance criteria:** every sound plays in Chrome and Firefox; every licence is recorded; audio under 3 MB.

**Accepted** by the owner on 2026-10-19 after listening on the live site.

## M5 — Missions 2–5

**Demonstrable result:** all five missions playable, each with its own setting and harder enemies.

Order agreed with the owner on 2026-10-20: mission 2 is playable after the first task.

- [x] M5.1 Mission data format and `difficulty()` with tested limits (H4); mission 2 (industrial backdrop, today's enemy types) and moving on to the next mission after a win
  - [x] `src/missions/` lists each mission's name and map; mission 2 "Factory District": 5 screens, 19 people, 3 guns, 5 soldiers
  - [x] `difficulty()` (`src/logic/difficulty.ts`): mission 1 unchanged; by mission 5 up to 2× the fire rate, shots 30% faster, range 20% further; damage and hit points never change
  - [x] A win continues to the next mission with the score carried over; Retry keeps the score the mission was entered with; the furthest mission is saved (H9); a banner names the mission as it starts; `?mission=N` starts any mission directly (kept open in v1.0, owner 2026-10-20)
- [x] M5.2 Tanks from mission 2: they drive along the street and fire shells up at the helicopter when it is low or landed; a bomb or 4 bullets destroys one
  - [x] `src/logic/tanks.ts`: tanks patrol open street, stop and turn to face a helicopter in range, and fire shells (pooled) within the barrel's reach (10° below level to 60° above); a shell takes 20 health; the difficulty curve covers tanks too
  - [x] Mission 2 gets an open factory yard with one tank (map check: a tank's patrol stays clear of buildings); mission 1 is unchanged
- [x] M5.3 Enemy aircraft: the VTOL jet from mission 2 (fast strafing passes), the gunship from mission 4 (hovers and fires bursts)
  - [x] VTOL jet (`src/logic/jets.ts`): passes timed by the map (mission 2: first after 30 s, then about every 35 s); a blinking "!" at the screen edge 1.5 s before, at the jet's height; it crosses above the rooftops and fires a level burst of 3 (8 health each) at a helicopter ahead and level with it; 2 bullets bring it down
  - [x] Gunship (`src/logic/gunships.ts`), from mission 4: hovers high over its stretch, stops and turns to a helicopter in range, fires aimed bursts of 3 (6 health each); 6 bullets bring it down
- [x] M5.4 Missions 3–5: layouts, plus backdrops from the CC0 pack, shown to the owner side by side before they are added
  - [x] Backdrops picked from an in-game preview (owner, 2026-10-20): 3 Downtown (Urban landscape), 4 Harbour (Ocean View day), 5 Mountain town (Gothicvania night town); each mission theme lists its layers and tiles (`THEMES` in `src/config/assets.ts`)
  - [x] Mission 3 "Downtown": 21 people, 4 guns, 6 soldiers, 2 tanks in two yards, a jet pass about every 30 s
  - [x] Mission 4 "Harbour": 24 people, 4 guns, 7 soldiers, 2 tanks, jets about every 28 s, 1 gunship
  - [x] Mission 5 "Mountain town": 25 people, 5 guns, 8 soldiers, 3 tanks, jets about every 24 s, 2 gunships
- [x] M5.5 Start from the furthest mission reached (H9); final victory screen with scrolling credits (owner, 2026-10-19)
  - [x] The title offers every mission reached ("< MISSION 3: DOWNTOWN >"; Left and Right, or tap the arrows), starting at the furthest; a new game starts with no score
  - [x] Winning mission 5 leads to the victory screen: MISSION ACCOMPLISHED, the final score and high score, then the full credits scroll up over the city (`src/scenes/VictoryScene.ts`); Enter, Esc or a tap goes back to the title

**Acceptance criteria:** all 5 missions can be completed; difficulty limits enforced by tests; an e2e test loads each mission; the owner approves the difficulty curve.

**Accepted** by the owner on 2026-10-21 after play-testing release `20261021T121636Z-32dcdc07`; the difficulty curve is approved.

## M6 — Polish and v1.0 release

**Demonstrable result:** v1.0 live on production with its card shown in the portal.

- [x] M6.1 Balance pass from the owner's play-test notes (2026-10-20); released 2026-10-21 (`20261021T121636Z-32dcdc07`) and play-tested by the owner ("Looks good")
  - [x] The helicopter faces the way it flies; the gun fires along the tilted body; flying into a building costs a little health
  - [x] Tank shells pass in front of buildings, like the soldiers' shots
  - [x] A mission needs 70% of its people saved to count as complete
  - [x] Bombs ("grenades"): the owner hadn't found them, so the pause screen now lists every control and mission 1 starts with an "X: DROP A BOMB   P: CONTROLS" hint
- [x] M6.2 Refresh the portal card image (256×192 gameplay shot) for v1.0, by portal PR (the card went `live` in M2.5): the owner compared new Downtown and Harbour shots with the current card and kept the current one (2026-10-21), so no portal change
- [x] M6.3 Full security checks: CodeQL, npm audit, Gitleaks, ZAP on staging and production (2026-10-21, on main `8a3fd88` and live release `20261021T121636Z-32dcdc07`)
  - [x] CodeQL: analysis passes on main; 0 open code-scanning alerts. Dependabot: 0 open alerts. Secret scanning: 0 alerts
  - [x] `npm audit --audit-level=high`: 0 vulnerabilities
  - [x] Gitleaks: no leaks in the full history (CI's pinned 8.30.1 on every push, and a local `gitleaks detect` over all commits)
  - [x] ZAP: staging (GitHub Pages) 0 failures; production (Production check run 39598335535) 0 failures. Production's warnings are informational (cacheable content, COEP not set, a Unix-timestamp-like number, "modern web app"). Staging's header warnings come from GitHub Pages, which can't set headers; production sends them
  - [x] Production headers: a strict CSP (`default-src 'self'`, no inline scripts), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, and a Permissions-Policy that blocks camera, microphone, location, payment and USB
  - [x] No third-party requests: the build's only `http(s)` strings are Phaser's console banner link and the SVG/XHTML namespace names, which are never fetched. localStorage holds only the `helirescue` key (H9)
  - [x] Unchanged by design: the site is served over HTTP on port 80 (ADR-010, the owner's decision); the game sends no personal data and holds no secrets
- [ ] M6.4 Production release with the owner's approval; docs updated
  - [x] The owner approved the v1.0 release of main after #53, tagged `v1.0.0` (2026-10-21). GitHub never ran CI on the #53 merge commit, so this PR's merge gives the release a commit with CI
  - [ ] Released and tagged; production check passed

**Acceptance criteria:** every item in PROJECT.md section 4 (definition of done) is met and checked on the live site, on a desktop and on a phone.
