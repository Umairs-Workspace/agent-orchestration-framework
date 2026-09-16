---
doc: verification
---
# 50 · Session launcher — Verification

## Method

Verified incrementally during `aof:continue 50`, then **re-measured end-to-end at `aof:verify 50`
(2026-08-14)** on a quiet tree with no concurrent writers. Focused suites import and execute each
exported test array directly, each test under its own throwaway `AOF_GLOBAL_HOME`, so neither the
live control service on `127.0.0.1:4182` nor the real `~/.aof` is disturbed. The full suite is never
run on this machine (`global-work-propagation` binds `:4182`, which the live daemon holds).

Numbers below are the orchestrator's own measurement, not an agent's report.

## Verification evidence

### Story 01 · The session-spawn directive — **ACCEPTED**

Contract: two `@executable` task features; no `@manual`, `@uat`, or UI/design lane.

- `mesh-session-spawn-directive`: **16 / 16** green, including all five Examples rows, a real
  loopback `sendDirective` control-to-worker dispatch, real WebSocket ack serialization, silent
  unregistered drop, directive isolation, and failure-isolated ack send.
- Adjacent `worker-stream-client`: **13 / 13** green.
- `acd-memory-index-never-on-mesh`: **5 / 5** green after adding the new transport module and both
  builders to its exhaustive ratchet.
- Craft: `node --check` on both production modules and the story test; `git diff --check` green.
- Structural gate: `aof work validate 50/01` → **PASS**.
- Structural review: `aof-architect` → **CONFORMS**. Behavioural review: `aof-qa` → **GREEN**.

The prior near-miss about offline-only simulations shaped the real loopback and real WebSocket lanes.

### The `@executable` suite, re-measured at verify — **128 / 128 green, 0 failing**

Every task feature in this milestone is `@executable`. There are **no `@manual` and no `@uat`
scenarios** in any of the four stories' contracts (the `@uat` mentions in stories 04's features are
comments deferring *visual* judgement to the design lane, not scenario tags). So the agent-run
`@manual` step and the human `@uat` step both have empty scope here, by contract.

| Suite | Story | Green |
|---|---|---|
| `mesh-session-spawn-directive` | 50/01 | 16 / 16 |
| `worker-stream-client` | 50/01 | 13 / 13 |
| `mesh-ui-session-route` | 50/02 | 21 / 21 |
| `mesh-session-spawn-handler` | 50/03 | 34 / 34 |
| `session-spawn-outcome-lane` | 50/04 | 17 / 17 |
| `home-session-launcher` | 50/04 | 14 / 14 |
| `home-session-launcher-states` | 50/04 | 13 / 13 |
| **Total** | | **128 / 128** |

**Correction to STATE's build-time tally.** STATE recorded "99/99" over five suites (21/42/17/13/13).
That count was wrong twice over: its own five addends sum to 106, not 99, and it omitted story 01's
two suites entirely. Re-measured per test-array entry the true figure is **128 across seven suites**;
the `mesh-session-spawn-handler` "42" was a scenario/row count, not a test count (34 entries). No
lane is missing and nothing is red — the drift is in the reporting, and this table supersedes it.

### Fitness functions — **972 / 975 green across 276 arch files, 3 failing**

`acd-captured-producer-fixture` was red at the first verify pass and is now **12 / 12 green** (see the
re-capture below). Every remaining failure is inherited from `main`; **none belongs to milestone 50**.

| Gate | Clause | Ours? |
|---|---|---|
| `acd-captured-producer-fixture` | producer-shape + the typed-fixture self-check | **was ours — RESOLVED, 12/12 green** |
| `acd-graphify-backend-selection` | `config.memory?.backend` read once (found 7) | no — inherited from `main`, ledgered as chore 64 |
| `acd-memory-backend-selection` | same invariant, sibling gate (found 7) | no — inherited from `main`, ledgered as chore 64 |
| `acd-no-new-silent-catch` | `board-worker-stream.mjs`: 1 site, baseline 0 | no — inherited from `main`, ledgered as chore 64 |

**The "inherited" claim is measured, not asserted.** `git diff main --` over every file the three
gates name (`src/work-init.mjs`, `src/work-memory.mjs`, `src/commands/init-update.mjs`,
`src/board-worker-stream.mjs`) *and* over the three gate files themselves returns **empty**, and
`git status --porcelain` shows none of them dirty in the worktree. They are byte-identical to `main`
on this branch, so no change in this milestone can have caused them. STATE named this as
"`acd-graphify-backend-selection` (both clauses)"; it is in fact **two sibling gate files** with one
clause each — same count, corrected attribution.

### The producer-fixture gate (F-50-C) — **re-captured from the real producer, now 12 / 12 green**

The gate was red because 50/ADR-008 appended `relaying` as the session entry's **seventh** key, so the
five `REAL_CAPTURED_*` payloads in the Rust surface still carried six. It was first reported here as
an operator gate needing a deploy. **That was wrong, and the file itself says so** — its own
provenance comment records how m48 discharged the identical drift on 2026-08-11, and that method
needs no deployed build:

> the local node's `presence` object above was RE-CAPTURED from the post-m48 producer rather than
> hand-edited: `startLauncher`'s first publish … over a hermetic repo in its own `AOF_GLOBAL_HOME`,
> with the session written by the real `startSession` … The re-serialisation was proven lossless
> first — each payload parsed and re-emitted byte-for-byte before any splice.

The deploy is irrelevant to this gate because `relaying` is **code-shaped, not data-shaped**:
`readLiveSessions` emits it unconditionally as `record.relaying === true`
([mesh-presence.mjs:150](../../../../src/mesh-presence.mjs#L150)), so a record predating the key projects
`false` rather than vanishing. Re-running the producer is all it takes.

Applied the same method and the same proof:

1. **Losslessness proven first.** All five fixtures parse and re-emit **byte-for-byte** (modulo the
   file's uniform CRLF), so a splice can only change what is deliberately changed.
2. **Every session entry re-emitted by the real producer.** For each of the **8** captured entries,
   `startSession` — the seam `aof session start` calls — wrote the captured record into its own
   hermetic `AOF_GLOBAL_HOME` with the clock **injected at that entry's own `lastPingAt`**, and
   `readLiveSessions` — the seam `assembleCurrentPresenceRecord`, and hence `aof mesh status --json`,
   reads through — read it back. The producer's output is what was spliced in.
3. **The diff is exactly the producer's change.** All 8 reproduced their originals byte-for-byte
   except the appended `"relaying": false`. The whole change to the Rust surface is
   **8 appended lines**; nothing outside the session objects was touched. Provenance comments record
   the re-capture, as m48's did.
4. **The Rust consumer still passes** — `cargo test --manifest-path app/desktop/Cargo.toml`:
   **85 passed, 0 failed**.

**One further fix, and it is the durable half.** With the fixtures re-captured, a *different* clause
went red: the m49/ADR-010 typed-fixture self-check held its **own hard-coded copy** of the producer's
key lists and asserted the real fixtures pass against *that*. So a self-check meant to prove the
detectors work was quietly refusing every legitimate re-capture — the opposite of what ADR-008
requires. It now derives its yardstick from `produceProducerShape()`, the same real-producer seam the
main clause uses, so it cannot go stale again. **Non-vacuity is preserved and re-proven**: all 7
planted rows still get flagged.

Neither shortcut the gate's header forbids was used: no payload was hand-edited and no detector was
weakened (the self-check got *stricter* — it now tracks the live producer instead of a frozen guess).

### Booby trap from STATE — **verified CLOSED, the note was stale**

STATE warns `ui/src/home/session-launcher.mjs` "sits ONE line under" the 800-line
`acd-ui-surface-file-budget` threshold at 799, to be resolved here. Measured at source: the file is
now **821 lines** (822 by the gate's own `split(/\r?\n/)` arithmetic) and story 04's structural
review **already added the budget row** — `ceiling: 840, floor: 400`, with a `why` naming the next
extraction (`session-launcher-copy.mjs`, the copy + `REFUSAL_MAP` block)
([acd-ui-surface-file-budget.test.mjs:159-187](../../../../test/arch/acd-ui-surface-file-budget.test.mjs#L159)).
The gate is green with ~18 lines of headroom. No action is owed; STATE's note is corrected below.

### Live end-to-end exercise of the new verb — **the honest-failure promise verified in production**

The milestone's own route was driven against the running fleet (operator-approved), twice,
reproducibly:

```
POST /api/mesh/session  {"nodeId":"umamis-msi","workspaceId":"9db1fd84f5895e38"}
  -> HTTP 200  {"ok":true,"sessionId":"d6168b10-…","nodeId":"umamis-msi","workspaceId":"…"}
GET  /api/mesh/session-outcome?nodeId=umamis-msi&sessionId=d6168b10-…
  -> {"ok":true,"state":"failed","code":"session-target-not-connected","at":"…T19:23:47.932Z"}
```

**What this proves, live, that no test could:**

- The named write route exists on the **shipped** fleet face, enforces same-origin + JSON, mints a
  `sessionId` and answers 200 — story 02, in production.
- **ADR-006's cross-process dispatch is real.** The request left the `aof mesh ui` process, crossed
  the loopback relay to the `aof mesh serve` process that owns `directiveTargets`, and reached the
  router — which is precisely the thing story 02's original blocker declared unbuildable. It is
  built, deployed and exercised.
- **The outcome lane answers.** Story 04 lane A's registry returned a state, a code and a timestamp
  for a real tuple within ~2s of the POST.
- **SPEC's fifth scope bullet — "honest failure" — holds in production.** The operator got a stated,
  coded reason naming the machine. No spinner, no ghost grid slot, no empty tile that never fills.

**Why no session started, and why that is not a defect.** The only presence-`live` node on this fleet
is `umamis-msi`, which is the **control** node; the control node is never a connected worker, so it
has no `directiveTargets` entry and the router synthesised the refusal. That is **deliberate and
documented** at [session-launcher.mjs:235-237](../../../../ui/src/home/session-launcher.mjs#L235):
*"The control node stays an option deliberately: a spawn aimed at it answers
`session-target-not-connected`, and a stated refusal is a better answer than a picker that silently
drops a machine the operator can see in the fleet."* The picker annotates; the route refuses.

The remaining two nodes are simply **down** — measured, not assumed: `umamis-msi-wsl` last seen
**2026-08-11** (~3 days) and `umamis-mac-mini` **2026-07-27**. So this fleet currently has no node
that can host a launched session, which is an environmental fact and not a property of the code.

### Design conformance — **CONFORMS on every judgeable region; three close conditions unjudged**

Deployed and rendered 2026-08-14. Payload `28bfedf+dirty.20260814T183916`; the fleet at `:4181`
served `assets/index-CcfaDpiM.js`, the exact bundle built by that deploy — so the render judged
*this* milestone's code, verified by asset hash rather than assumed.

Playwright is not a dependency and `npx playwright` is unavailable here, so the render drove the
cached Chromium directly over CDP — which the panel-open frames require, since a bare `--screenshot`
cannot click. Eight frames at DPR 2 over route `/`: R-A (1280 at rest), R-B (1280 panel open),
R-E (390 at rest + panel open), R-F (768 at rest + panel open), R-G (**760×520** panel open, the
binding frame), R-H (1280 grid). Screenshots were handed to `aof-designer` to judge — the ADR-001
hand-off; the designer did not run the browser.

**Designer's verdict: GAPS, on one finding — and that finding was REFUTED by measurement.** The
designer read the trigger at 23.5 CSS px and the selects/action at ~22.5 against DESIGN
§Accessibility requirement 8's ≥24 CSS px floor, and honestly flagged it as a 1–2px read off a 2×
screenshot that a DOM probe would settle. It was settled by `getBoundingClientRect` at DPR 1,
identical at 1280 / 390 / 760×520:

| Control | Floor | Read off the screenshot | **Measured in the DOM** |
|---|---|---|---|
| trigger (`New session ▾`) | ≥24 | 23.5 | **26.00** ✓ |
| `Node` / `Repo` / `Item` selects | ≥24 | ~22.5 | **25.00** ✓ |
| `Start session →` | ≥24 | ~22.5 | **24.66** ✓ |

All five clear the floor. **No design gap stands**, so the region verdicts below are the operative
result. Screenshot-edge measurement is not a sound basis for a sub-2px rule — recorded as a lesson,
not as a defect.

**CONFORMS**, region by region: the trigger is legible, un-tinted and *identically formed* in the
48px top bar at 1280 and the 40px surface bar at 768 / 760 / 390 (§S1 L0a/L0b, DG-50-5); the 390 bar
holds on one y-band with nothing overprinted (DG-50-6 rules 1 and 3); at the binding **760×520** the
panel is 228px inside the 432px `CONTENT_FLOOR` with the page **not scrolling** — probe-confirmed
`pageScrolls=false`, panel `overflow-y:auto`, `max-height:312px`; the field set is exactly
`Node` / `Repo` / `Item (optional)` with `none — open the repo root` as the item default; the empty
grid's card is untouched and keeps its single exit (DG-50-5); and **`Opens your default shell on
that machine.` renders verbatim with no assistant control anywhere — DG-50-4's close condition is
fully met**, which is the rule this milestone most risked breaking.

**Unjudged, and honestly so:**

- **DG-50-1 (R-H) — the headline, and the one that matters.** It needs "a **launched** session's tile,
  streaming, beside an assignment-owned tile". No session was launched during the render, so the grid
  was empty and nothing exercised it. R-A does show the `no-producer` treatment still live in this
  build (`READ-ONLY` pill, `no live output` chip) over a free session — which is exactly what a
  launched session would look like if the producer fact does not cross the wire. Only a real launch
  settles it.
- **DG-50-6's close condition** — requires the longest summary (`16 sessions · 16 live · 9 need
  input`) at 390; the live fleet had `1 session · 0 live`, so the stress case was not reachable from
  production data.
- **DG-50-2, DG-50-3, DG-50-7** — carried only by R-C's four and R-D's six **fixture** frames. DESIGN
  states by name that *"a reviewer must not log their absence from a production render as a
  finding"*, so their absence is not a gap; their close conditions simply remain open on fixtures.

## Findings

| id | type | severity | observed | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-50-01-a | architecture | blocker | The inherited exhaustive mesh-transport fitness ratchet omitted the new protocol home and builders. | Fix in story | 50/01 | resolved |
| F-50-01-b | contract coverage | blocker | The five standalone Examples rows were not initially driven by the focused suite. | Add explicit row iteration without editing the locked features | 50/01 | resolved |
| F-50-A | build gate | blocker | The producer-site ceiling was red for two reasons; ADR-008's FF-E closed only one (a third `.sendTerminalFrame(` site sits outside any `onOutputChunk:` value). | Raise the ceiling **and** admit the second sanctioned shape as a named enumeration | 50/04 lane B | resolved — `session-spawn-outcome-lane` proves all three sites sanctioned by name |
| F-50-B | design-gap | non-blocker | DESIGN §DG-50-3 rule 3 required the `title` to carry "the server's own sentence" for every code — unsatisfiable for the outcome lane, whose ack frame carries `code` and **no message field**. | PO ruling: narrow the rule rather than grow the wire; the UI's `REFUSAL_MAP` owns the sentence | DESIGN.md §DG-50-3 | **resolved at verify** — rule 3 rewritten in two halves; behaviour was already correct and locked by task 02 |
| F-50-C | fitness gate | blocker | `acd-captured-producer-fixture` was RED: ADR-008 appended `relaying` as the session entry's 7th key, so the 5 `REAL_CAPTURED_*` payloads still carried 6. | **First triaged as an operator gate — that triage was wrong.** The file's own m48 provenance records a re-capture method needing no deploy, because `relaying` is code-shaped (`record.relaying === true`), not data-shaped. Re-captured all 8 entries from the real producer seam; fixed the self-check's stale hard-coded yardstick. | 50/04 surfaces + the gate's self-check | **resolved at verify — 12/12 green, Rust 85/85** |
| F-50-D | design conformance | non-blocker | Design conformance is unrenderable: the deployed payload pre-dates story 04, so `:4181` serves a build without the UI. | Deploy, then render R-A…R-H at 390/768/1280 + 760×520 and hand the screenshots to `aof-designer` to judge | **operator** (the one remaining gate) | **OPEN — deferred, not a gap** |
| F-50-E | inherited red | non-blocker | Three arch gates are red on `main`, unrelated to this milestone (`acd-graphify-backend-selection`, `acd-memory-backend-selection`, `acd-no-new-silent-catch`). | Defer to backlog as its own chore — not this milestone's contract, and byte-proven not its cause | **chore 64** | deferred — ledgered |
| F-50-F | inherited red | non-blocker | `test/mesh-terminal-input-path.test.mjs` "terminal-resume/worker" fails with `TypeError: completionResolve is not a function` — a TEST bug (line 471 lacks the `await waitFor(...)` guard its sibling at 519 has). Confirmed pre-existing with m50's `src/` stashed. | Defer to backlog as its own chore | **chore 64** | deferred — ledgered |
| F-50-H | fitness gate | non-blocker | The m49/ADR-010 typed-fixture self-check held its OWN hard-coded copy of the producer's key lists, so it refused every legitimate re-capture — found only because F-50-C's re-capture tripped it. | Derive the stub from `produceProducerShape()`, the same real-producer seam the main clause uses | the gate itself | **resolved at verify** — non-vacuity re-proven, all 7 planted rows still flag |
| F-50-I | design conformance | non-blocker | The designer read the trigger/selects/action **below** DESIGN §Accessibility req 8's ≥24 CSS px floor (23.5 / ~22.5) and logged a GAP. | Measure, don't read pixels: `getBoundingClientRect` at DPR 1 gives 26 / 25 / 24.66 at all three breakpoints. | — | **refuted at verify** — no gap; screenshot-edge reads are unsound below ~2px |
| F-50-J | evidence gap | non-blocker | **DG-50-1 is unjudged and the success path is unproven live.** The only presence-`live` node is the control node (never a dispatch target, deliberately); `umamis-msi-wsl` has been down since 2026-08-11 and `umamis-mac-mini` since 2026-07-27, so no node on this fleet can host a launched session. | Environmental, not a code defect. Declared as the milestone's open gap in `OUTCOME.md` with a discharge condition; the success path is covered in-process by 34 `mesh-session-spawn-handler` scenarios that spawn real PTYs. | `OUTCOME.md` ## Gaps | **OPEN — declared** |
| F-50-G | record accuracy | non-blocker | STATE's Verification checklist points `@manual` sign-off at a `UAT.md` that does not exist, and this milestone has no `@manual` or `@uat` scenarios at all. | Correct the STATE checklist at verify | STATE.md | **resolved at verify** |

Findings live here, never in a task folder. `TECH_DEBT` item 45 (SECURITY T2's live revocation
re-read is inert on every lane — no frame builder sets `issuer`) is already ledgered and is
deliberately out of this milestone's scope.

## Gate

`aof work validate 50` → **PASS — 50 is well-formed.**

## Accept decision

**ACCEPTED 2026-08-14**, with one declared gap (F-50-J) carried into `OUTCOME.md`.

Every gate is green and no blocker finding is open:

- **128 / 128** `@executable` scenarios across seven suites.
- **972 / 975** arch gates; all three remaining failures byte-proven inherited from `main` and
  ledgered as **chore 64**. **No milestone-50 gate is red.**
- **85 / 85** Rust tests on the cross-language surface whose fixtures this verify re-captured.
- `aof work validate` **PASS** — scoped to 50 and over the whole stream.
- **Design conformance: CONFORMS** on every judgeable region, against a real render of the deployed
  build (asset-hash verified), judged by `aof-designer`. Its one GAP was measured and **refuted**.
- **Honest failure verified live in production** — the route, the cross-process ADR-006 dispatch and
  the outcome lane all exercised end-to-end against the running fleet.

Resolved during this verify: F-50-B (the DESIGN rule), F-50-C (the producer fixture, re-captured from
the real producer), F-50-H (a self-check holding its own stale yardstick), F-50-I (the design finding,
refuted by measurement). F-50-E/F routed to chore 64. The file-budget booby trap was already closed.

**What is NOT proven, and is declared rather than implied.** DG-50-1 — a launched session's tile
rendering indistinguishably from an assignment-owned one — has never been observed against a real
launch, because this fleet has no live worker node to launch onto (control node excluded by design;
WSL down since 2026-08-11, mac since 2026-07-27). The success path is covered in-process by story
03's 34 scenarios, which spawn real PTYs and register real session records, so this is an
**evidence** gap rather than an unbuilt capability. It is recorded in `OUTCOME.md` `## Gaps` with its
discharge condition, which is where a declared-but-unfilled surface belongs.

Accepting on that basis is deliberate: every close condition an agent can reach is met, the one
outstanding condition is environmental, and its discharge is a single render once a worker is up.
