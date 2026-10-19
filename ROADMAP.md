# HeliRescue — Roadmap

> **Status:** APPROVED by owner 2026-10-18.
> Every milestone ends with something playable on staging. Each task is one small PR. Tasks in M3–M6 are split further when their milestone starts.
> Revised 2026-10-18 after the owner's PM review: M3 builds the mission frame (people groups, mission end, lives, title) before weapons and enemies; phones get fit-to-screen scaling and WebKit tests; one saved-data key; Retry on game over; the mission bonus follows the share saved.

## Progress

| Milestone | Status |
|---|---|
| M0 Setup | Done (2026-10-18) |
| M1 Art test | Done |
| M2 Walking skeleton (to production) | In progress: M2.7 rescue e2e and touch release (first release live since 2026-10-18) |
| M3 Mission 1 playable | Not started |
| M4 Sound | Not started |
| M5 Missions 2–5 | Not started |
| M6 Polish and v1.0 release | Not started |

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
- [ ] M2.7 Playwright: fly, land, board, unload, check the score; touch controls in a mobile viewport in Chromium and WebKit; release with the owner's approval; first phone performance measurement (the owner plays on a real phone)
  - [x] WebKit (Safari, iPhone, iPad) added to the e2e browsers (PR #11, 2026-10-18)
  - [x] Full-rescue e2e test (`tests/e2e/rescue.spec.ts`): fly out, land, board, fly home, unload, score 100, no damage; with the keyboard in Chromium, Firefox and WebKit, and with the touch D-pad on a phone in Chromium and WebKit
  - [ ] Release with the owner's approval; the owner plays on a real phone

**Acceptance criteria:** each step works in the running game on staging and production; unit tests cover flight and landing rules; ZAP shows no high-risk alerts.

**M2.5 verified 2026-10-18:** game release `20261018T194318Z-55adfaf4` live at http://games.soncrant.com/helirescue/ (CI on 55adfaf: Gitleaks, build and test, CodeQL, staging deploy and ZAP baseline all passed; release smoke test passed with security headers). Portal release `20261018T223814Z-60019485` shows the card as live (portal PR #26; smoke test passed on all six live games). After both: the portal's Production check run 39173111194 passed (smoke test from outside the network and ZAP baseline scan of production). M2.6 and M2.7 remain.

**M2.6 verified 2026-10-18:** PR #13 merged (bc15059); main CI passed, including the staging deploy and ZAP baseline. Staging in a phone-sized WebKit window (844×390, touch) shows the D-pad, the canvas fills the full 390 px height (1.44× zoom), the portrait note is hidden in landscape, and there are no page errors. The e2e suite covers the D-pad flying the helicopter, the fit zoom on a phone, and the portrait note pausing the game, in Chromium and WebKit.

## M3 — Mission 1 playable

**Demonstrable result:** a complete first mission from takeoff to the result screen.

The frame of a mission comes first (M3.1–M3.4), so the owner can play-test a winnable mission before any enemy exists (reordered 2026-10-18).

- [ ] M3.1 Several buildings with groups of people; carrying limit
- [ ] M3.2 Mission end when everyone is saved or lost; result screen with the bonus scaled by the share saved plus a perfect-rescue bonus; high score in the saved-data key (H9)
- [ ] M3.3 3 helicopters, game over, and Retry of the current mission
- [ ] M3.4 Title screen (controls summary, CC-BY art credit) and pause (key, and on focus loss); the owner play-tests the winnable mission
- [ ] M3.5 Turn key and button, forward gun and bombs, with pooled bullets and effects
- [ ] M3.6 Soldiers on rooftops and in the street who shoot at people; anti-aircraft guns that shoot at the helicopter

**Acceptance criteria:** mission 1 can be won or lost; scoring and saved-data rules are unit tested; an e2e test plays a scripted rescue on desktop and with touch; steady 60 fps in the frame-rate check; the owner approves the feel after a play-test, once without enemies (after M3.4) and once with.

## M4 — Sound

**Demonstrable result:** rotor, gun, bomb, explosion, boarding and UI sounds plus a music loop; M mutes.

- [ ] M4.1 Sources listed for the owner's approval; generated effects where they fit
- [ ] M4.2 Sound starts on the first key press or tap; mute, remembered in the saved-data key (H9)

**Acceptance criteria:** every sound plays in Chrome and Firefox; every licence is recorded; audio under 3 MB.

## M5 — Missions 2–5

**Demonstrable result:** all five missions playable, each with its own setting and harder enemies.

- [ ] M5.1 Mission data format and `difficulty()` with tested limits (H4)
- [ ] M5.2 Tanks, and enemy aircraft from mission 2
- [ ] M5.3 A background and layout for each mission
- [ ] M5.4 Progress through missions; start from the furthest mission reached (H9); final victory screen

**Acceptance criteria:** all 5 missions can be completed; difficulty limits enforced by tests; an e2e test loads each mission; the owner approves the difficulty curve.

## M6 — Polish and v1.0 release

**Demonstrable result:** v1.0 live on production with its card shown in the portal.

- [ ] M6.1 Balance pass from the owner's play-test notes
- [ ] M6.2 Refresh the portal card image (256×192 gameplay shot) for v1.0, by portal PR (the card went `live` in M2.5)
- [ ] M6.3 Full security checks: CodeQL, npm audit, Gitleaks, ZAP on staging and production
- [ ] M6.4 Production release with the owner's approval; docs updated

**Acceptance criteria:** every item in PROJECT.md section 4 (definition of done) is met and checked on the live site, on a desktop and on a phone.
