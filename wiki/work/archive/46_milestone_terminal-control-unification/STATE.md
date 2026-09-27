---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 46 · One terminal control — State

## Progress

**Framed 2026-08-02** (`aof:shatter wiki/planning/PRD-web-ui-restructure.md`).

**Refined 2026-08-08** (`aof:refine 46 --autonomous`). Both gates were `done` before the break-down —
spike 44 (the session-source and origin decision) and milestone 45 (the shell). ARCHITECTURE.md (nine
ADRs), DESIGN.md (three surfaces, three design gaps, the merged state vocabulary) and `mocks/PROMPT.md`
authored; six stories broken down and every task contract written.

- [x] Decide — ARCHITECTURE (9 ADRs) + DESIGN (3 surfaces, 3 gaps) + `mocks/PROMPT.md`
- [x] Break down — 6 stories, 4 of them dependency-free
- [x] Contracts — every story's task `.feature` set authored
- [ ] Build — `aof:continue 46`

## Notes & decisions in flight

- **The PRD's "two-and-a-half implementations" is stale** (measured 2026-08-02). m42 item 6 (`54f6bbf`)
  already collapsed the bolt-on widget — the dock is one component with a local lane and a `remote`
  mirror lane, already carrying the fit-vs-scale split and input on both lanes. Two implementations
  remain (dock + `FleetTerminalView`), and the dock is already close to the target design. The
  extraction is smaller than the PRD implies.
- **Watch the arch-test coupling.**
  [acd-fleet-terminal-input-constrained.test.mjs](../../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs)
  does source-analysis over *named* files. Moving the dock will move what it inspects — update its file
  list, never its invariants. Invariant 4 (fleet page wires no input) must still hold when this
  milestone accepts; reversing it belongs to 49.

### Decided at refine, 2026-08-08

- **Operator ruling — the dead bridge is IN scope.** `wireTerminalBridge` is deleted and detector #4 is
  re-aimed at `mesh-launcher.mjs`'s real producer (ADR-007, story 46/01). The alternatives offered were
  "leave it as carried debt" and "ledger it as a chore"; the operator chose deletion.
- **Operator ruling — the operator supplies the mocks.** `mocks/PROMPT.md` is written for them to drive
  Claude's design tool; the three exports come back as `mocks/s1-board-dock.png`,
  `mocks/s2-fleet-card-peek.png`, `mocks/s3-fullscreen-overlay.png`. **Until they land, DESIGN's binding
  checklists are the baseline**, and a mock supersedes the checklist wherever the two differ.
- **The board dock GAINS expand-to-fullscreen.** Not a designer addition — `SPEC.md` §Scope already puts
  "drag-resize and expand-to-fullscreen" inside the one control, so the dock inherits it by construction.
- **ADR-006's finding is the sharpest thing here and is not a documentation nicety.** "Update the file
  list, never the invariant" is necessary and *not sufficient*: invariant 4's detector is a directory
  sweep over `ui/src/fleet/**`, so once the control moves the sweep goes **green while asserting
  nothing**. Re-expressed at equal strength in story 46/04, and that is the story's highest review risk.
- **Two coverage holes found by the graph, both routed into the milestone.**
  [geometry.mjs:20-23](../../../../ui/src/fleet/terminal-view/geometry.mjs#L20-L23) names a test file that
  **has never existed** — the mirror's scale math and the 80×24 cross-build tie were believed guarded and
  are not (story 46/03). And `wireTerminalBridge`'s gate (story 46/01).
- **Filed, not fixed:** [TECH_DEBT 25](../../TECH_DEBT.md) — the port map has four homes and `serveBoard`
  defaults to `4178`, another server's port, masked only because every caller passes one. ADR-004 routes
  around it rather than adding a fifth home.
- **Three small doc-vs-doc conflicts ruled at the feasibility pass, so the build does not settle them by
  typing.** (1) The `read-only` **label** binds to `mount.readOnly`, not to `!inputEnabled` — DESIGN's
  reading. An interactive mount whose input is off for some other reason is not a read-only host, and
  those rows are unreachable in m46 anyway. (2) The fleet peek panel's height is **header + 192px**, not
  a flat 192 — `h-48` is the byte-area column and the header sits above it. DESIGN's own S2 region table
  has this right; its constraint row and the `@uat` clause did not, and a reviewer measuring 192 would
  have failed a correct render. (3) `ended` with **no** exit code reads `normal` — DESIGN's ramp table
  offers only "clean / failure" and simply lacks the third value; the feature's derivation from
  `view-state.mjs:81` is the better answer.
- **`WebLinksAddon` ships on both surfaces — knowing visible change 13.** Once the gate finds ONE xterm
  construction site, the unified control loads it, which gives the fleet peek clickable links it lacks
  today. Not new exposure: the dock already renders `mirror` sessions and already loads it unconditionally,
  so a worker's output is already link-ified when watched from the dock. It is a render affordance,
  touches no input path, and removing the arbitrary difference is the milestone's thesis.
- **TECH_DEBT 18(a) is measurably worse** — `Fleet.tsx` imports five modules out of `ui/src/board/`. m45
  created `ui/src/app/`; ADR-001 creates `ui/src/terminal/`. The item stays **open**: migrating the five
  cross-imports is a scope explosion inside a terminal extraction.

### Build, 2026-08-08 (`aof:continue 46` → `aof:autonomous 46`)

Four dependency-free stories built in parallel in one working tree, as the break-down predicted.

- **46/01, 46/02, 46/03 built green** (46/00 in flight at the time of writing). Counts: 46/01 — 14/14
  signal-source, 18/18 relay-bridge, 6/6 the re-aimed gate; 46/02 — 8/8 + 6/6 + a new 5/5 cycle gate;
  46/03 — **189/189** across five suites.
- **The parallel fan-out paid for itself twice over, in findings neither story would have made alone.**
  46/01's developer found 46/02's regression; 46/03's developer found it independently. A serial build
  would have found it a story later, or at the milestone gate.

### The mocks LANDED mid-build, 2026-08-08 — the baseline changed under 46/04

The operator supplied them through Claude Design
([project `a1e976a1`](https://claude.ai/design/p/a1e976a1-e521-48df-9f0f-ec6e3a1b4ad5?file=Terminal+Panel+Spec.dc.html),
file `Terminal Panel Spec.dc.html`), imported to [`mocks/`](mocks/) with the `dc-runtime` it imports.
**The refine ruling now flips:** DESIGN's binding checklists were the baseline *until the mocks landed*;
from here a mock supersedes the checklist wherever the two differ, and DESIGN governs only where the mock
is silent. The delta list is [`mocks/CONFORMANCE.md`](mocks/CONFORMANCE.md), authored by the designer —
that file, not this note, is what a render is judged against.

They arrived **one export richer than expected**: not the three flat PNGs `mocks/PROMPT.md` asked for, but
a live spec carrying all three surfaces × their state fixtures, with every value legible at source
(`renderVals()`) rather than measured off a picture. The three PNG names it documents
(`s1-board-dock.png`, `s2-fleet-card-peek.png`, `s3-fullscreen-overlay.png`) survive as the render targets.

**Two things the mock says that no checklist did**, both routed rather than absorbed silently:

- **The ended/error bar is paid for out of the terminal area, so the mirror's scale RECOMPUTES against the
  reduced box while total panel height is unchanged** — S2 `0.47` live → `0.40` ended, S3 `1.83` → `1.76`.
  This is a behaviour, not a colour. 46/03's geometry core looks able to express it already (its scale rows
  include `163÷408` and `280÷408`), so the build must **derive** it, never hard-code the literals.
- **A restart (`↻`) affordance appears in the S1 header on `ended`/`error`.** Whether any locked `.feature`
  covers it is a PO question, deliberately not settled by typing.

#### PO rulings on the mock reconciliation, 2026-08-08

The designer's [`mocks/CONFORMANCE.md`](mocks/CONFORMANCE.md) reports **18 confirmations, 11 overrides**.
All three §Decided-at-refine rulings survived contact with the mock. Nine overrides are cosmetic and live
in that file. Three needed a decision:

- **The `streaming` word colour changes; the dot does not — and this is an accessibility fix, not a
  preference.** DESIGN and `palette.mjs` both say `text-primary` → `hsl(174 72% 27%)`, measured at
  **3.29:1** on the `#0f1629` chrome, which **fails AA for an 11px state word**. The mock's
  `hsl(174 58% 52%)` measures **9.06:1**. The dot correctly keeps the darker token: a non-text indicator
  needs only 3:1. `04/04.feature:264` requires a value outside DESIGN's five to be *raised before it is
  painted* — **raised here, and adopted**. It lands as a named constant in `palette.mjs` with the
  measurement in the comment. Note this edits a file 46/03 already delivered; that is correct, the mock
  landed after that story closed.
- **The `waiting` pane line gets its own descriptor field.** The mock's pane reads `connected · waiting for
  first output`, distinct from the chip's `waiting for output`. Routing it through `reason` would have been
  the obvious move and is a **trap**: `describeTerminalState` honours `reason` on `waiting` *and also
  rewrites the chip to `no live output`* ([state-ramp.mjs:461-469](../../../../ui/src/terminal/state-ramp.mjs#L461)),
  so it would silently assert a V10 assignment fact that is not true here.
- **Restart appears on `ended` (including `exited (0)`) and on `error`**, interactive host only — the mock's
  reading. Contracted at `04/04.feature:119` (presence) and `04/01.feature:84` (behaviour, `error` only);
  the mock adds `exited (0)`, and `04/01`'s affordance-form table has **no restart row** where every other
  control has one. A contract gap, recorded not edited.

**The bar-paid-out-of-the-terminal-area rule is confirmed and needs no new code.** `terminalFitScale` is
already pure over the measured box and `geometryPlanFor` passes `boxHeight` through, so the build
re-measures after the bar takes its space. S2 lands exactly (`min(510/640, 192/408) → 0.47`;
`163/408 → 0.40` — the same 163 DESIGN's constraint row records). **S3's `1.83`/`1.76` are illustrative,
not derivable** (739/408 = 1.811); the binding fact is the *difference*, proved twice over:
`(0.47−0.40)×408 = 28.6px` and `(1.83−1.76)×408 = 28.6px`, one bar height.

#### Carried to the `@uat` gate — two locked measurements are WRONG, and a human must not be misled by them

Recorded here rather than edited, because the contract is locked and these are instructions to a human
reviewer:

- **`04/04.feature:137`** says to measure the peek panel's **total** height as a constant `192px`. Against
  the mock the total is **≈232px**; 192 is the byte-area column. This is refine ruling (2) again — the
  region table had it right and the constraint row did not — but the locked prose still says "total", and
  **a reviewer following it fails a correct render**.
- **`04/04.feature:234`** promises a *"roughly 250-300px"* letterbox band on R-F. Against a 1280×800
  overlay it is **≈93px**. The rule is right; the magnitude is wrong and must be derived at review time.
- **Not an error, but the likeliest false positive:** the mock never draws **S1 hosting a `mirror`**, which
  produces a **≈916px empty band — 72% of the dock**. That is correct behaviour (a fixed 80×24 screen in a
  wide interactive dock), and it is the single most likely thing to be logged as a defect by someone
  meeting it cold.

### 46/04 built — the duplicate is deleted, 2026-08-08

`TerminalDock.tsx` (466) and `FleetTerminalView.tsx` (446) are **gone**, in the same diff that replaces them
with one `ui/src/terminal/TerminalControl.tsx` (821) plus two call-site mount modules. Net-negative across
the subtree: **1,366 → 1,123** lines. 85 `@executable` rows green across the four buildable features;
`04_the-two-terminals-agree` is `@uat` and is not ours to sign.

**Invariant 4 was proved by planting, and the third plant is the reason ADR-006 exists.** Plants 1 and 2
(a new `ui/src/fleet/*.mjs` wiring `onData`+`socket.send`; the fleet mount declaring `POSTURE_INTERACTIVE`)
both went RED. Plant 3 — `mountPosture(assignment?.posture ?? POSTURE_READ_ONLY)`, with **no `interactive`
literal anywhere** — **slipped the structural sweep entirely** and was caught only by the behavioural half.
The structural clause was then hardened to drive the real mount adversarially and re-planted: RED. A gate
that reads green while asserting nothing is exactly what ADR-006 predicted, and it took a plant to find it.

**The scale is genuinely derived, but "the literals appear nowhere in source" — recorded here first on the
build's own report — was WRONG, and QA measured it.** All four appear in comments
([TerminalControl.tsx:431](../../../../ui/src/terminal/TerminalControl.tsx#L431) and `:625`), and
`terminal-control-both-sources.test.mjs:386-395` asserts `toFixed(2) === "0.47"` and `"0.40"` directly. The
substance holds — every scale runs through `terminalFitScale` and three geometry mutants confirm it — but
the claim as first written would have failed a literal-grep gate, and `:625` asserts in prose that the code
produces the overlay pair, which it does not (it derives 1.811/1.740, not 1.83/1.76). **A build's summary of
its own evidence is not evidence.** The **S1-mirror band is on the record
before a reviewer meets it**: in the dock's 1264×222 box a 640×408 screen scales to 0.544 → 348×222,
leaving ≈916px (72%) of empty `#0b0f14` anchored top-left. Correct by the min-ratio rule, and asserted as
its own lane.

#### Three contract conflicts the build FLAGGED rather than forced — PO rulings

The developer stopped on all three instead of choosing. That is the behaviour the locked-contract rule
exists to produce, and it is worth more than the three rulings themselves.

1. **Task 02 row 4 — per-source transport copy.** The row wants the `error` cause line to differ by source;
   `DESIGN.md`, the committed mock (S1's `error` bar) and 46/03's shipped-and-accepted core all say **one**
   line, `disconnected — the stream dropped`, asserted from every socket-bearing state. **Three baselines
   against one row: the row is wrong.** State, chip and reads are asserted; the cause line is not. Carried
   to the `@uat` gate, not edited.
2. **Task 02 rows 5-6 — the `read-only` label when the SOURCE, not the mount, is why input is off.** The
   rows say the label is present; 46/03's accepted suite says `null`, explicitly. **This is refine ruling (1)
   restated** — the label binds to `mount.readOnly`, not to `!inputEnabled` — so the rows are stale against
   a ruling the milestone already made, and the state is unreachable in production anyway. Ruling stands;
   carried, not edited.
3. **Task 03 row 3 — `no fleet origin was ever handed`.** A genuine **design gap**: DESIGN fixes two
   `unavailable` causes and neither fits, because the missing server is the *fleet*, so
   `board unreachable`/`aof work ui` is the wrong pair. The build **invented no copy** and degraded to
   `origin-unreachable`. Routed to the designer, who owns "what's correct" — not settled by typing.

#### 46/04 review — 2 architect BLOCKERS, and the accessibility findings compound

**Structural verdict: VIOLATIONS.** The extraction is sound (graph-confirmed: one control, two consumers,
no cross-surface terminal edge, the fleet-local module genuinely fleet-local, the re-pointed suites are
**aliases onto the real core rather than replicas**). Both blockers are in the seams the story added, and
**both are the shapes their own ADR named as a rejected alternative:**

- **B1 — invariant 4 is still evadable after being hardened twice.** The fourth plant is at the *call site*:
  `mount={{ ...fleetTerminalMount(…), posture: { readOnly: !!0 } }}` in `Fleet.tsx` → every gate green, and
  the fleet card measurably becomes `inputEnabled: true`, `disableStdin: false`, `readOnlyLabel: null`,
  blinking cursor. Both remaining posture signals gone, CI silent. The needle also misses
  `readOnly: !typing`, `Boolean(0)` and `posture: peekPosture` — **the natural spellings m49's feature will
  use.** ADR-006 requires the *call site* asserted structurally; the clause asserts a word in a directory.
- **B2 — a sixth `fleet → board` edge, added by the milestone chartered to remove them.**
  `ui/src/fleet/terminal-mount.d.mts:5` imports the mount type from `../board/dock-mount.mjs`. ADR-001's
  rejected-alternatives section says it in terms: *"A sixth would be added by the one milestone chartered to
  reduce coupling."* It is **type-only, so `aof graph impact` cannot see it** and no gate sweeps it — the
  boundary review nearly missed it too. The mount contract has three homes, the canonical one inside a
  consumer's folder. Fix is one home under `ui/src/terminal/` plus the shrink-only ratchet TECH_DEBT 18(a)
  has never had in three milestones.

**The accessibility picture is worse than the one ruling.** The designer measured the whole ramp on
`#0f1629`: `text-zinc-400` 7.02:1 ✓, `text-red-400` 6.51:1 ✓, `text-zinc-300` 12.18:1 ✓ — **`streaming` was
the only failing state word**, which confirms the earlier ruling and bounds it. But measuring the pane
itself found a sharper one: the `unavailable` **recovery line** is `text-zinc-500` on the byte area =
**3.98:1, fails AA — and it is the command the operator must type.**

- **Ruled: recovery line → `text-zinc-400` (7.50:1).** This **deviates from the operator's committed mock**,
  which is a bigger call than overriding DESIGN — an accessibility floor is not a style preference, so it
  outranks the mock, and the deviation is **carried to the operator at the `@uat` gate rather than hidden.**
- **Carried, not changed:** `provider:` / `item` field labels measure 3.72:1 and also fail AA (WCAG's
  *incidental* exemption does not cover a visible field label), but they are decoration rather than
  actionable text and the change ripples through the chrome. Operator's call.
- **Standing, no change:** two state dots sit under SC 1.4.11's 3:1 — `bg-muted-foreground` 2.79:1 and
  `bg-destructive` **2.91:1, measured here for the first time**. Defensible only because the word always
  renders beside them; recorded so the defence is on the record rather than assumed.

**The third `unavailable` cause is ruled: `no fleet origin` / `aof mesh ui`.** Not a mapping onto
`board unreachable` / `aof work ui`, which names the wrong server and gives a command that cannot produce a
fleet — *a refusal naming the wrong cause is worse than one naming none*. The word is `no fleet origin`, not
`fleet unreachable`, on the same discipline that made `streaming` beat `running`: the client asked the fleet
nothing, so asserting a far-end state never observed would be a lie. **Three is the total set for m46**, and
a cause outside the three must never borrow one of the three pairs.

### Build complete, 2026-08-08 — stopped at the `@uat` gates

All six stories built. `46/01`, `46/02`, `46/03` **done**; `46/00`, `46/04`, `46/05` **in-review**, each
blocked only on a human gate or a deployed build, never on work. Whole fitness estate re-run by the
orchestrator at the close: **256 arch files, 861 assertions, 859 pass, 2 fail — both reproduce at pristine
HEAD.** This milestone's diff adds no red. Evidence in [VERIFICATION.md](VERIFICATION.md).

### 2026-08-09 — BLOCKER on the running system: the control connects to nothing

Deployed, restarted, driven in a real browser: **the one terminal control renders correctly and never opens
a socket.** Board dock `local-pty`, board dock `mirror`, fleet card peek `mirror` — all three sit on `idle`
forever. Zero `Network.webSocketCreated` over 21s against a harness control proving the listener works; no
`.xterm` node ever mounts. Reproduced headless and headful. **The server half is healthy** — dialling
`/ws/terminal` directly opens in 11ms, accepts the on-open resize and streams first bytes at 150ms.

**A closed loop, confirmed at source:**

```
state = idle → pane = PANE_EMPTY_HOST (state-ramp.mjs:583-588)
             → TerminalByteArea renders a <p>, not the paneRef host (TerminalByteArea.tsx:80-90)
             → inlineRef.current === null
             → the session effect returns early (TerminalControl.tsx:309-310)
             → no socket → setState(bindSource()) at :312 never runs → state stays idle ↺
```

The only line that moves the ramp off `idle` sits *after* the guard whose precondition `idle` makes
unsatisfiable. And because `idle`'s copy is *"No session. Press Run agent on an item."*, a session that IS
bound renders a **lie** as well as a deadlock.

**Why every gate missed it, and this is the retro item that matters more than the bug.** All three UI
harnesses stub the subject: `export const TerminalControl = () => null;`
([board-app-harness.mjs:42](../../../../test/support/board-app-harness.mjs#L42),
`fleet-app-harness.mjs:32`, `shell-app-harness.mjs:124`). So **537 green tests, a 71-mutant battery, three
structural reviews and two behavioural reviews all passed over a control that connects to nothing** —
every suite drove the framework-free model or a stub, and nothing rendered the real component and asserted a
socket. 46/05's QA even *named* this gap (its F-5: `readContentBoxHeight` is unreachable because the
component is stubbed everywhere) and it was recorded as a coverage nit rather than read as what it was: **the
component itself is untested at every call site.**

The milestone's model is excellent and its integration is unproven. ADR-001 made the framework-free split an
invariant and the gates enforced it beautifully — and the one thing no gate covered was the thin `.tsx`
seam where the model meets the browser.

### 2026-08-09 (late) — the blocker is CLOSED live, and the machine underneath it was broken too

Driven in a real browser against the deployed payload: the board dock leaves `idle`, opens
`ws://…/ws/terminal?ref=46%2F01&provider=claude`, mounts its xterm and reaches **`streaming`** with a live
`claude` TUI painting into the pane. Evidence in [VERIFICATION.md](VERIFICATION.md).

**The first live run reached `error`, not `streaming`, and the control was not at fault.** The far end
refused: `claude CLI failed to start: Cannot find module 'node-pty'`. The deploy's own lock tolerance had
**destroyed** the payload's `node-pty` — no `package.json`, no `lib/` — while printing `(kept existing … —
locked by a running process)` about the module it had just gutted ([TECH_DEBT 30](../../TECH_DEBT.md)). The
trigger is the ordinary one: the first install after any PTY has been spawned, i.e. every deploy during a
working session. Reproduced twice inside an hour — repaired by a clean install, destroyed again by the next
deploy. Fixed: the copy is file-by-file, so a lock costs that file and never the module, and the skipped
files are named.

**Three UI defects fixed and re-measured live** — the 390 dock header overflowing its own frame by 61px (so
`✕` laid out outside it and the identity collapsed to width 0), C1's yield keyed to the VIEWPORT instead of
the header (which inverted CONFORMANCE C13 on a 395px fleet card), and the fullscreen exit — the only exit —
squeezed to 17×28. A **fourth** was found by reasoning the third's fix through: the occupant is portaled into
a shell-owned node, so it inherits no container and would have rendered the most-yielded header in the
biggest box on screen. `acd-ui-surface-file-budget` then fired on the pass itself at 863/840, and the ceiling
was **not** raised — C1's identity fragment became `TerminalIdentity.tsx` and the control sits at 814.

### 2026-08-09 (late) — design conformance is CONCLUSIVE at last, and judging it found a fourth defect

12 renders of the deployed build (S1 × 390/768/1280 × waiting/streaming/ended, S3 × three widths)
handed to `aof-designer` against `mocks/CONFORMANCE.md`. First verdict **GAPS — three, none blocking**;
all three actioned. Evidence in [VERIFICATION.md](VERIFICATION.md).

**The sharpest result came from the two things the designer REFUSED to judge from a raster.** It named
them rather than guessing, and one of them — *"does the fullscreen pane actually re-fit its rows?"* —
was a real defect in the milestone's headline feature: S3 adopted the live node, grew its box to
1264×739 and left the terminal at the dock's **15 rows / 210px**, i.e. 529px of dead black under a
`local-pty`, which is exactly the band DESIGN says a *fit* source does not have. `relayout` stretched
the pane element; `fitAddon.fit()` was driven by an observer watching the **inline** host, whose box
does not change when the overlay presents. Fixed: **15 rows → 52, 210px → 728px.**

**And the picker gap was the blocker's shape again.** S3 wore the dock's provider picker — while
`host-model.mjs` had declared `[HOST_FULLSCREEN][AFFORDANCE_PROVIDER_PICKER] = notDeclared(…)` all
along. The identity fragment was built once against the opener's host and handed to the occupant
verbatim, so the JSX never asked the model. The model was right; the seam ignored it.

### 2026-08-10 — the sign-off pass: 10 `@manual` lanes green, and three more live defects

Driven autonomously against the deployed payload. Evidence in [VERIFICATION.md](VERIFICATION.md).

- **DG-46-1 FAILED at the desktop app's own 760×520 window** — an open dock covered all three of
  `+ Add feedback`, `✓ Validate`, `→ Next`, at the default height, at maximum, and again after exiting
  fullscreen. Found by **hit-testing** the gate's claim rather than looking at it. The dock was
  innocent: it took exactly its clamped 216px and the panel gave up exactly 216px. The overflow was
  the detail panel's own `shrink-0` header, which a four-line wrapped title made 228px — larger than
  the whole panel — pushing the action strip out of the box. Fixed in `DetailPanel.tsx`: context
  yields, actions survive.
- **The non-live bar covered the last row of output.** The byte area shrank by exactly the bar's 29px
  and the terminal kept all 15 rows. Third instance of one defect; the rule now has one home.
- **The fleet's `Board` nav tab is dead** ([TECH_DEBT 31](../../TECH_DEBT.md)) — one route table, two
  servers, and only one of them has a board API. Found by the operator asking which project's 46.
- **10 of 17 `@manual` lanes run and PASSED**; the other 7 are recorded not-run with reasons — four
  need a worker mirror, one needs a fixture the contract itself names, one has **no route in the
  product** (`idle`), one needs an ended session in fullscreen.

## Feedback (for retro)

- **THE GATE'S CLAIM WAS "REACHABLE", AND I NEARLY TESTED "VISIBLE".** DG-46-1 says *"every control
  the operator can still act on is reachable"*. A screenshot cannot answer that — a half-covered
  button still looks like a button, and at 1280 everything looked and was fine. Testing it as
  `document.elementFromPoint(centre) === the control` found a total failure at the one window size
  the operator actually uses. **Read the verb in the acceptance criterion and test THAT verb**:
  reachable is a hit test, visible is a screenshot, legible is a contrast measurement, and they are
  three different experiments.
- **Three defects, one root cause, three different triggers — and the fix kept moving because the
  RULE had no home.** "A `fit` source re-fits whenever its box changes" was implemented once per
  trigger: an observer for the drag (worked), nothing for the fullscreen transition (529px of dead
  black), and a socket-gated function for the bar (26px of output under an opaque bar). Each fix was
  correct and local, and the third only surfaced because a `@manual` lane forced the state. The rule
  now lives on `geometry.mjs`'s header — with all three triggers enumerated — because **a rule
  scattered across its triggers gets re-fixed once per trigger, forever.**
- **The ratchet fired four times in two days and was never raised — but twice I tried to satisfy it
  with prose, which is the wrong lever.** Trimming a comment to fit a line count is exactly the
  "delete explanation to fit a number" that ADR-014/E3 bars. What actually worked was noticing that
  the explanation had TWO homes (the ref declaration and the call site; the `.tsx` and the geometry
  module) and giving it one. **A file over budget is usually carrying someone else's explanation.**
- **A lane that fails because the PREVIOUS lane left state behind reports on the harness.**
  `04/00·c` failed in the aggregate run because `04/00·b` had typed a marker into the agent's prompt,
  so `/exit` became `AOFUATMARKER/exit` and the session never ended — the lane then judged a bar that
  was correctly absent. Both of that run's failures were mine, and both were one investigation away
  from being filed as product defects. **Before believing a red lane, reproduce it alone.**
- **Not being able to reach a state is a finding about the CONTRACT, not a gap in the evidence.**
  `idle` has no route in the product: every door into the dock binds a session first. The scenario
  asks for a render of a state the UI cannot produce. Recording that is more useful than either
  faking the render or quietly dropping the lane — and it is the same shape as `unavailable`, which
  the contract already anticipated by demanding a *forced fixture*.
- **I VERIFIED ONE STATE AND REPORTED THE HEADER FIXED — and the state I picked was the narrowest
  one.** The 390 dock was measured in `streaming` and declared conforming. The designer's re-judge
  found the owner ref truncated to `46…` in `waiting` and `46/_` in `ended` — the two WIDEST states,
  because `waiting for output` is the longest word in the ramp and `ended` gains the `↻` control. The
  fix is not just the code (chrome now yields before content, and the identity no longer carries
  `truncate` on S1): it is that a responsive claim must be verified across **the state space that
  changes the width**, not at one sample of it. The re-verification drives all eight ramp words through
  the live header. **The general form, and it is the same error as the mutation battery run in one
  process: a single green observation was allowed to stand for a set.**
- **When the state you must verify is a 124ms window, substitute — do not race.** `waiting` cannot be
  screenshotted reliably, which is exactly why it shipped broken and why my first fix "passed". Writing
  each ramp word into the live chip and measuring the header reproduces the identical layout
  deterministically. **A state that is hard to observe is not a state that is exempt from observation;
  it is the one most likely to be wrong.**
- **A judge that says "I could not see this from here" is worth more than one that renders a verdict
  on everything.** Two of the designer's findings were refusals — the 8px gutter, and whether the
  fullscreen pane re-fits — each with the measurement that would settle it. Both were then settled by
  **computed style in one command**: the gutter was fine, and the re-fit was a real defect that had
  survived a 9/9 green suite, five reviews and a browser pass by three people. **A judgement made from
  the wrong instrument is a coin toss wearing a verdict's clothes**; naming the instrument that would
  answer it converts an opinion into a next action. Budget for "I need a different measurement" as a
  first-class review outcome.
- **Adoption is not re-fitting, and a suite can be entirely right about its own subject while the gap
  sits between two subjects.** `terminal-fullscreen-adopts-live-node` is 9/9 and asserts one instance,
  one socket, no re-subscribe — all true, all still true. Nothing owned "and then the terminal fills
  the new box". The two halves lived in different effects, and only one ran on the transition. When a
  feature is "the same thing, somewhere else", the tests will cluster on the *identity* half; the
  *consequence* half is the one to go looking for.
- **A comment can promise behaviour the code does not perform, and it reads as evidence.** The relayout
  effect said in terms that *"a `fit` source re-fits (more rows and columns, glyphs unchanged)"* — and
  nothing called `fit()`. Three reviews read that comment. This is the milestone's own "a build's
  summary of its own evidence is not evidence", one level down: **a comment is a claim, and a claim
  next to code is the easiest kind to believe without checking.**
- **A render set is evidence only for what it actually captured.** Every S1 row in the first index
  recorded `"chip": ""` — the selector matched an empty shell announcer instead of the chip inside the
  terminal header — and the one gap that turned on chip copy could not be settled from it. The judge
  caught the hole; the harness's author (me) did not. **Assert your instrument is reading something
  before you trust a run of it**, the same non-vacuity rule this milestone applies to every gate.
- **A capture-timing artefact can be indistinguishable from a product lie.** The `streaming`-over-an-
  empty-pane render read exactly like the V10 dishonesty this milestone exists to kill, and would have
  been a blocker on the first reading. It was a screenshot fired 2.3s late: the chip goes `connecting…`
  at 14ms, socket at 39ms, first byte at 163ms, `streaming` at 273ms, first glyphs at 2643ms — the
  agent clears the screen before it paints. **Timing evidence needs a timeline, not a frame.**
- **A tolerance that reports what it INTENDED rather than what it DID is worse than no tolerance.**
  `install-local.mjs` deleted a module, failed to copy it back, and logged `(kept existing …)`. A loud
  failure became a silent corruption, and it spent the next hour of debugging pointing away from itself —
  the dock looked broken, the control looked broken, and the *deploy* was broken. The general form: an error
  handler's message must be derived from what the handler actually left behind, not from what the code
  above it was trying to do. Here that meant naming the files it kept and counting them.
- **A defect whose blast radius is "one file" must be implemented as "one file".** The old copy was a
  whole-tree `cpSync`, which cannot express *copy everything you can* — one throw ends the copy, and which
  files survive is then an accident of directory order. That is why a locked `conpty.node` cost the module
  its `package.json`. The fix is not a better catch, it is a walk that attempts every file.
- **A mutation battery run IN ONE PROCESS can kill plants it never tested.** The first battery for the new
  yield gates reported all five plants RED — but `palette.mjs` stayed cached with plant A's value, so lanes
  01/02 were red for every later plant, including one that cannot affect them. The tell was the RED PATTERN
  NOT MATCHING THE PLANT: plant C touches `shrink-0` and should redden lane 04 alone. One fresh process per
  plant, and a **control run with no plant at all**, is the whole fix. This is 46/02's import-cycle masking
  wearing a different hat: in-process is answered from the cache that does the masking.
- **A container query with no container ancestor never matches — so a portaled subtree silently renders
  every drop taken.** The inline header and the fullscreen occupant render the same identity fragment, and
  only one of them was a container. Nothing would have failed; the biggest box on screen would just have
  worn the narrowest header, permanently. Worth generalising: when a responsive rule moves from a viewport
  query to a container query, every place that fragment is rendered needs the container, and a portal is
  exactly where that is easiest to miss.
- **A responsive rule keyed to the viewport answers a question nobody asked.** The thing that runs out of
  room is the header, not the window — and the fleet card proves it: ~395px wide inside a 1280 viewport, so
  `md:` read TRUE and it kept the tail while truncating the ref. This was in the shipped code of a milestone
  whose own DESIGN spells the yield order out in three ordered steps. **The lesson is that a layout rule
  should name the box it measures**; `md:` names nothing, which is why nobody caught that it was measuring
  the wrong one.
- **The design gate could not have caught any of these, and that is the honest reading of INCONCLUSIVE.**
  Design conformance was blocked on "no render worth judging", and the reason was not scheduling — only
  `idle` and `unavailable` were reachable, because the control opened no socket and the machine had no
  working PTY. Two independent faults, each sufficient. A conformance verdict is downstream of a system
  that runs, and "we could not render it" was carrying strictly more information than a verdict would have.

- **`tsc --noEmit` is not `tsc -b`, and "the build is clean" was reported without running the build.**
  46/05 reported `tsc --noEmit` clean and `vite build` clean; both were true. The operator's deploy then
  failed on `scripts/ui-build.mjs`, which runs **`tsc -b`** — a project-references build that typechecks
  `.d.mts` declaration siblings the `--noEmit` invocation did not. Two real errors: a `Document | null`
  passed to `MutationObserver.observe`, and the framework-free request's `node: unknown` meeting the
  shell's `node: Element`. **The orchestrator repeated the claim without running the command the deploy
  actually runs** — the same defect the milestone spent itself correcting, one level up: a summary of
  evidence is not evidence. **Rule: the acceptance check is the command the deploy runs, not a nearby one.**
  (Fixes were type-level only: the request became generic over node/home/opener so the framework-free
  declaration stays free of DOM vocabulary, and the shell's `onLayout`/`onDismiss` were widened to `| null`
  to match what `Shell.tsx:857`/`:914` already do with `?.()` — the declaration was narrower than the code.)
- **A gate calibrated against its own plant is not calibrated.** 46/05's `fixed inset-0` gate was written
  with a self-check that synthesized a 7-line violation. Fed the **real deleted violation** (`git show
  HEAD:…FleetTerminalView.tsx`), its portal clause did not fire — a 1,593-character span against a
  400-character window — so the clause the story cited as its named carrier was inert against the very code
  it existed to catch. Nine other spellings slipped it. **Fix that generalises: commit the historical
  violation as a fixture and assert the detector fires on it**, with a length assertion so a trimmed fixture
  loses calibration loudly. A detector's plant should come from history, not from imagination.
- **"Shrink-only, and this reasoning is barred" in a header is prose until an assertion says it.** The same
  gate's exemption list was waved past with a one-line entry carrying *verbatim the reason its own header
  barred* — 3/3 green. `assert.equal(EXEMPTIONS.size, 0)` is the whole fix, and the general form is that an
  exemption needs an **expiry that is not a filename**: m45's exemption expired "when m46 deletes the file",
  m46 deleted the file, and the shape survived under a new name with the prohibition silently retired.
- **A milestone needs ONE whole-estate fitness sweep before it accepts.** Story 46/02's correct
  `MESH_UI_HOST` extraction broke `acd-mesh-ui-single-server`'s literal-matching detector. It was red in the
  working tree and green at HEAD **through three subsequent stories**, because every story ran focused
  suites — the right local discipline — and nobody owned the estate. Found only at the last structural
  review. The same sweep turned up a *third* unrecorded HEAD red, so [TECH_DEBT 27](../../TECH_DEBT.md) went
  from "TWO suites are RED" to three within a day of being written.
- **A conditional route must enumerate every file in its own finding.** ARCHITECTURE health finding 5 named
  `Shell.tsx` **and** `shell-layout.mjs` as "new, large, and unbudgeted", then phrased its route around only
  `Shell.tsx`. The story honoured the letter; `shell-layout.mjs` crossed 1,000 lines unbudgeted. The deeper
  fix is that `acd-ui-surface-file-budget` was **opt-in** — a large file acquired a ceiling only if a human
  remembered. It is now a ratchet, and it fired on its own author in the same pass (`TerminalControl.tsx` at
  859), who **extracted rather than raised the ceiling**.
- **`git checkout <file>` is not the inverse of a plant.** Reverting a plant that way reset `Shell.tsx` to
  HEAD and destroyed **ten edits from this story** in a tree carrying uncommitted work from five others.
  Rebuilt and re-verified (88/88), nothing lost — but plant-and-revert must apply an **inverse patch**, or
  work in an isolated replica the way both architects did. Worth a standing rule for reviewers and builders.
- **An ADR's predicted consequence is read as fact by the next milestone.** ADR-001 promised the terminal
  subtree would come out net file-negative (≈14 files / ≈1,370 lines); it shipped at 31 / ≈4,430 — 3.2× the
  lines, much of it genuine new capability. Filed as [TECH_DEBT 28](../../TECH_DEBT.md) with an amendment note
  owed on ADR-001, because milestone 49 will plan against a shrink that did not happen.

- **A gate whose detector is a filename *substring* over the runner's source text is satisfied by a
  COMMENT.** Found at 46/03: two authored-but-deliberately-red gates were kept out of the runner (correct
  per SPEC), and `acd-test-suite-registration` was satisfied by naming both basenames in a
  `scripts/test.mjs` comment — no import, gate green, nothing asserted. Ruled at build: use the convention
  that gate file already documents ([:54-55](../../../../test/arch/acd-test-suite-registration.test.mjs#L54-L55))
  — rename `*.test.mjs` → `*.mjs` so no runner or glob picks it up, and add no baseline entry. **The deeper
  point is the gate's own:** `acd-test-suite-registration` asserts "imported by a runner" but *measures*
  "basename appears in the runner's text". Hardening it to require a real `import … from` is a candidate
  for 46/04 (which owns gate moves) or TECH_DEBT — this milestone is the one arguing that a gate must
  measure what its name claims.
- **…and the deferral was then applied at the wrong GRANULARITY — by file, when the story ruled it by
  clause.** `46/03`'s [STORY.md:89-97](stories/03_story_shared-terminal-core/STORY.md#L89) says plainly:
  *register here, green on arrival* — no module in `ui/src/terminal/` names a port; the shared set imports
  no React, touches no DOM global, imports nothing from `ui/src/fleet/` or `ui/src/board/`. Both gates were
  parked whole instead, withholding **five assertions that pass today**, and `scripts/test.mjs` then
  narrated the misreading as fact ("the ONE gate 46/03 can also turn GREEN") — measurably false when the
  arrays are run by hand. **The orchestrator's own ruling caused this**: the instruction said "rename the
  files", not "register the green clauses and park the red ones". Cost, had it shipped: for the whole of
  46/04 and 46/05 — the stories that write the React component — ADR-001's invariant would have been
  unenforced, and ADR-001 ([:160-163](ARCHITECTURE.md)) is explicit that the gate *is* the difference
  between an invariant and a preference, because "no reviewer reliably notices an absence". **Two lessons:**
  a "register the green half" instruction must carry the clause list into the acceptance criteria, and a
  narrating comment that asserts what a story *could not* do should be checked by running it.
- **A module-scope read of an imported constant closed an import cycle, and the whole test suite was blind
  to it.** 46/02's `VALID_FLEET_ORIGIN_SHAPE` interpolated `DEFAULT_MESH_UI_PORT` at top level;
  `import("./src/mesh-ui-serve.mjs")` threw `ReferenceError … before initialization` while
  `import("./src/cli.mjs")` stayed green — load order masked it, so every assembled-suite run looked
  fine. Two independent stories hit it as *other* suites dying at import. **The cheap durable guard is
  "every server/command module imports cleanly on its own entry point"**, which nothing checks today.
- **A story title can promise what no task contract under it covers.** 46/03's `STORY.md` title names
  "the drag clamp"; no `.feature` under 46/03 covers one. Caught at build by the developer, not at refine.
  **Checked at the PO level, and the scope is sound** — 46/05 owns it properly:
  [task 01](stories/05_story_dock-shell-host/tasks/01_the-dock-inset-is-published-and-the-content-box-honours-it.feature)
  makes the clamp a pure function of the published content box (`100dvh` minus chrome height and dock
  inset, reading no viewport global), and
  [task 03](stories/05_story_dock-shell-host/tasks/03_an-open-dock-covers-nothing.feature#L184) pins the
  keyboard resize to *exactly* the same clamp. So this is a title-vs-contract mismatch in one STORY.md,
  not a coverage hole — the retro lesson is that refine should not let a story title carry a deliverable
  that lives in a different story.
- **An ADR forbade an import *as cycle avoidance* after measuring exactly one edge of the cycle.** ADR-004
  justified routing the fleet-port fact through the command layer because `mesh-ui-serve → board-serve` is
  a real edge, so the reverse import would close a ring. That edge was measured; the **return path** was
  not. `board-ui → command-core → commands/*` completes
  `mesh-ui-serve → board-serve → setup-ui → board-ui → command-core → commands/work-ui → mesh-ui-serve`,
  so the route the ADR *sanctioned* joined a ring the ADR did not know existed — and 46/02 paid for it at
  build (see [TECH_DEBT 25](../../TECH_DEBT.md), and [26](../../TECH_DEBT.md) for the general form). The refine
  had the graph in hand and asked it a **one-directional** question. **Next refine: when an ADR forbids an
  import because it closes a cycle, run `graph impact` on the sanctioned alternative too — a ring is a
  property of the whole path, not of the one edge you were looking at.**

- **The reviews kept finding what green suites could not, and the pattern is worth naming: every one came
  from EXECUTING a counterfactual, never from reading code.** Four instances in one build. (1) 46/03's QA
  ran a 30-mutant battery: 27 killed, and the **3 survivors were the 3 real findings** — including
  `inputPolicyFor(source, { readOnly: "yes" })` returning `inputEnabled: true`, i.e. a mount that *says*
  read-only is typeable, with 46/04 about to mount the control at two call sites. (2) 46/00's architect
  stood up a `WebSocketServer` in the gate's exact shape and measured that one malformed frame
  (`WS_ERR_INVALID_UTF8`) is an **uncaught exception that kills the board server** — pre-existing, invisible
  to 43 green behavioural cases, and it proved the `maxPayload` decision was right for a worse reason than
  the developer gave. (3) 46/01's architect moved the producers to a temp module and showed the old
  path-named detector read GREEN while the discovering one went RED. (4) 46/01's QA rebuilt the pinned
  envelopes from a real `git show HEAD:` extraction rather than trusting the table. **The lesson: a review
  that only reads is a second opinion; a review that runs a mutation is evidence.** Budget review time for
  running counterfactuals, and prefer "delete this line and watch a test go red" to any amount of prose.

### ACCEPTED 2026-08-10

All six stories `done`; the milestone `done`. Signed off by the operator against the deployed payload
on the running system, with the scope of that sign-off recorded in
[VERIFICATION.md](VERIFICATION.md) — including what it did **not** cover.

The milestone accepts with three things carried rather than closed, each named at the gate: the fleet
card peek (S2) was never seen alive because nothing in the mesh could produce a worker session;
`acd-bundle-manifest-hashes` is red at HEAD and this diff adds no red; and the board's small-window
composition is [TECH_DEBT 32](../../TECH_DEBT.md), ruled out of scope by the operator — *"this milestone
is not about board responsiveness"*.

Lessons distilled to [RETROSPECTIVE.md](RETROSPECTIVE.md) (15 entries). The through-line: **the model
was excellent and the integration was unproven**, and every serious defect lived in the thin seam
where the model meets the browser.

## Verification

<!-- Pointers, not restatements. -->
- [x] `@executable` suite green — focused suites 149/149 on the final tree
- [x] Fitness functions green — whole estate `256 files / 861 assertions / 859 pass`, the 2 fails
      pre-existing at HEAD ([TECH_DEBT 27](../../TECH_DEBT.md))
- [x] `@manual` — 10 of 17 run and passed; 7 not run, each with its reason, none counted as a pass
- [x] `@uat` — signed by the operator 2026-08-10; scope recorded in [VERIFICATION.md](VERIFICATION.md)
