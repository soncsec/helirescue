# HeliRescue — Roadmap

> **Status:** APPROVED by owner 2026-10-18.
> Every milestone ends with something playable on staging. Each task is one small PR. Tasks in M3–M6 are split further when their milestone starts.

## Progress

| Milestone | Status |
|---|---|
| M0 Setup | In progress |
| M1 Art test | Not started |
| M2 Walking skeleton (to production) | Not started |
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

---

## M0 — Setup

**Demonstrable result:** `soncsec/helirescue` exists with a protected `main`, green CI, staging on, and the slug claimed in the portal.

- [x] M0.1 Discovery and plan; owner approved 2026-10-18
- [ ] M0.2 Repo created from `soncsec/game-template`; `scripts/init-game.sh helirescue "HeliRescue" 5180`; approved docs and corrected CLAUDE.md; first CI run
- [ ] M0.3 Branch protection on `main` with the four required checks; secret scanning with push protection; Dependabot alerts
- [ ] M0.4 GitHub Pages turned on (Actions mode, `main` only); first staging deploy and ZAP scan pass
- [ ] M0.5 Portal PR adding `games/helirescue.json` (status `in-development`) and the ports to NEW-GAME.md
- [x] M0.6 Docs page: builder in `tools/docs-page/`, published as a new HeliRescue docs page (https://claude.ai/artifact/KN8heqnPfx15tcX8vqXJwB)

**Acceptance criteria:** a direct push to `main` is rejected; a PR shows all checks green; staging loads; `legacy/` is not in the repo; the portal PR passes its checks.

## M1 — Art test

**Demonstrable result:** an art preview on staging (`?scene=art`) shows candidate helicopters, rooftops, people, soldiers and enemies over the city background, animating at game scale. The owner chooses.

- [ ] M1.1 Gather candidates: from the pack, from CC0 packs (listed with links and licences for approval), and Claude-made (`tools/art/`, H6)
- [ ] M1.2 Preview scene with a side-by-side comparison and a mock gameplay frame per set
- [ ] M1.3 Copy the chosen art into `public/assets/`; list every file in `CREDITS.md`

**Acceptance criteria:** the owner approves one art set; every file has a recorded licence; the preview runs on staging.

## M2 — Walking skeleton (to production)

**Demonstrable result:** at `games.soncrant.com/helirescue/` you fly over a short city, land on a rooftop, one person runs aboard, you fly back to base and unload them, and the score goes up.

- [ ] M2.1 World and camera: wide level, layered background, base pad, a few buildings (H1)
- [ ] M2.2 Flight model with tilt and rotor animation; keyboard controls (H2)
- [ ] M2.3 Landing rules: safe landing, hard landing, no landing on people (H3)
- [ ] M2.4 One person runs from the roof edge, boards, and is unloaded at base; score and HUD
- [ ] M2.5 Playwright: fly, land, board, unload, check the score
- [ ] M2.6 First production release with the owner's approval; ZAP before and after

**Acceptance criteria:** each step works in the running game on staging and production; unit tests cover flight and landing rules; ZAP shows no high-risk alerts.

## M3 — Mission 1 playable

**Demonstrable result:** a complete first mission from takeoff to the result screen.

- [ ] M3.1 Several buildings with groups of people; carrying limit
- [ ] M3.2 Forward gun and bombs, with pooled bullets and effects
- [ ] M3.3 Ground soldiers who shoot at people; anti-aircraft guns that shoot at the helicopter
- [ ] M3.4 Health bar, crash, 3 helicopters, game over
- [ ] M3.5 Mission end when everyone is saved or dead; result screen with bonus; high score
- [ ] M3.6 Title screen and pause

**Acceptance criteria:** mission 1 can be won or lost; scoring rules are unit tested; an e2e test plays a scripted rescue; steady 60 fps in the frame-rate check; the owner approves the feel after a play-test.

## M4 — Sound

**Demonstrable result:** rotor, gun, bomb, explosion, boarding and UI sounds plus a music loop; M mutes.

- [ ] M4.1 Sources listed for the owner's approval; generated effects where they fit
- [ ] M4.2 Sound starts on the first key press; mute

**Acceptance criteria:** every sound plays in Chrome and Firefox; every licence is recorded; audio under 3 MB.

## M5 — Missions 2–5

**Demonstrable result:** all five missions playable, each with its own setting and harder enemies.

- [ ] M5.1 Mission data format and `difficulty()` with tested limits (H4)
- [ ] M5.2 Tanks, and enemy aircraft from mission 2
- [ ] M5.3 A background and layout for each mission
- [ ] M5.4 Progress through missions; final victory screen

**Acceptance criteria:** all 5 missions can be completed; difficulty limits enforced by tests; an e2e test loads each mission; the owner approves the difficulty curve.

## M6 — Polish and v1.0 release

**Demonstrable result:** v1.0 live on production with its card shown in the portal.

- [ ] M6.1 Balance pass from the owner's play-test notes
- [ ] M6.2 Portal card image (256×192 gameplay shot) and status `live`, by portal PR
- [ ] M6.3 Full security checks: CodeQL, npm audit, Gitleaks, ZAP on staging and production
- [ ] M6.4 Production release with the owner's approval; docs updated

**Acceptance criteria:** every item in PROJECT.md section 4 (definition of done) is met and checked on the live site.
