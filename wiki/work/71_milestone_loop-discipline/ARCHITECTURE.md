---
doc: architecture
---
<!--
  Milestone ARCHITECTURE.md — answers ONE question: what did we decide, and why?
  Owner: architect. ADRs are append-only; a superseded decision is marked, never deleted.
  Structural invariants belong here as FITNESS FUNCTIONS (the register at the foot), not in a
  task .feature — a .feature states observable behaviour over a seam, a fitness function states a
  property of the tree.
-->
# 71 · Loop discipline — Architecture

## Grounding: what was measured before these decisions

**The codebase graph, built fresh at this pass.** `aof graph build .` over the project root reported
`unchanged: true` against **14091 nodes / 34497 edges / 0 hyperedges, egress none, built
2026-09-01T19:33:21.114Z** — graphify rewrites only on a topology change, so an untouched artifact
means the graph is current (`11/ADR-003`). `aof graph impact` over the files these ADRs reach:

| file | dependents ← | dependencies → |
|---|---|---|
| `src/bundle/commands/continue.md` | **NOT COVERED** | **NOT COVERED** |
| `src/work-loop.mjs` | 26 (1 production: `src/commands/loop.mjs`) | 1 (`src/loop-progress.mjs`) |
| `src/loop-bounds.mjs` | 26 (11 production, incl. `src/commands/{acceptor,drive,grade,loop,resume,run-start}.mjs`, `src/agent-session-driver.mjs`, `src/mesh-worker-execution.mjs`, `src/work-loops.mjs`) | 0 |
| `src/commands/loop.mjs` | 29 | 16 |
| `src/commands/promote-gap-to-chore.mjs` | **1** (`src/command-core.mjs`) | 5 |
| `src/commands/insert-shared.mjs` | 6 | 7 |

**Prompt markdown is absent from the code graph, and that is a COVERAGE GAP, not a no-coupling
finding.** `continue.md` is the subject of this whole milestone and the graph can say nothing about
it; every boundary drawn over `src/bundle/` below was drawn by reading, and is labelled as inference
rather than as measured structure. The two runtime hubs (`src/loop-bounds.mjs`, `src/commands/loop.mjs`)
are high fan-in, and that is the measured fact behind ADR-004 and ADR-008: 71 stays prompt-first, and
its one runtime touch lands on the lowest-fan-in seam available (`promote-gap-to-chore.mjs`, one
dependent) rather than on a hub.

**Memory recall (`--area architecture`), acknowledged.** Five near-misses surfaced; each is honoured
or consciously departed from, and named where it bites:

- `07/ADR-002` (the conformance verdict is a render + a structured verdict, `INCONCLUSIVE` never a
  guess) — **honoured and extended**, not overturned: ADR-005 supersedes only its RENDER MECHANISM
  clause and leaves the verdict triple untouched.
- `11/ADR-002` (milestone 11 is pure prompt-wiring over existing commands; aof adds no new grounding
  helper) — **honoured as the default posture and departed from once, deliberately**: ADR-003 adds
  one runtime seam, because a promotion that only a prompt performs has no idempotence and no
  provenance. The departure is argued, not assumed.
- `11/ADR-003` (freshness is build-fresh-at-the-decision-point over a git-ignored derived artifact) —
  **honoured**: the build above was run at this pass and its `builtAt`/counts are printed.
- `57/ADR-003` (the gate is severity-by-code plus an exit code on the face; `work.mjs` is not edited
  and no seventh doctor lane is created) — **honoured**: ADR-001 adds no rung and no lane; it makes
  the prompt walk the ladder that already exists.
- `52/ADR-013` (a total ordering for placeless findings; "declared here" is the definition test) —
  **honoured and generalised**: ADR-003 is the same shape one layer up — an ORDERED question set, so
  a finding cannot be placeless and cannot land in two homes.

---

## Context this milestone inherits

This section exists so that **no story re-decides a closed question**. Much of SPEC 71's scope has
already shipped; a story that rebuilds any of it is out of scope on this section alone.

### Closed by 69 (loop-bounds) — the values, and their single home

`src/loop-bounds.mjs` is the one declaration and resolution home (`69/ADR-001`). Verified at HEAD:
`DEFAULT_REVIEW_ROUNDS = 1`, `MAX_REVIEW_ROUNDS = 3`, `DEFAULT_BUILD_NO_PROGRESS_ROUNDS = 2`,
`MAX_BUILD_NO_PROGRESS_ROUNDS = 4`, `DEFAULT_PROGRESS_MAX_RESETS = 2`, plus the eight-key
`LOOP_BOUND_CONFIG_RESOLVERS` / `LOOP_BOUND_VALUE_RESOLVERS` pair and `61/ADR-009`'s range probe.
**71 chooses no value and adds no knob.** It speaks what 69 declared.

The loop registry's ceilings are likewise closed: `src/bundle/loops/build-to-green.md:11` reads
`ceiling: [config:work.loop.buildNoProgressRounds]` and `review-fix-rereview.md:11` reads
`ceiling: [config:work.loop.reviewRounds]`, guarded by
`test/arch/acd-no-uncapped-framework-loop.test.mjs`. **SPEC's "the loop registry's `ceiling:` fields
stop reading `uncapped`" is DONE.** The only surviving `uncapped` outside the vocabulary's own
declaration is in `dist-sea/`, a derived build artefact — not a source fact and not this milestone's
work.

### Closed by 83 (agent-layer bounds) — the round cap and the reporting bar

Story 83 is `done`. It landed, and 71 inherits unchanged:

- **The reporting bar in all five reviewer lenses** (`src/bundle/agents/aof-architect.md:117-119` and
  its four siblings): >80% confidence, a four-gate evidence checklist, "a clean review is a valid
  review", Blocker/Important/Nit, at most five Nits, and a do-not-flag list. **SPEC's "Reviewers told
  what to report" is DONE.** No story re-authors it.
- **`<review_rounds>` and `<stall_detection>` in `continue.md:209-228`** — one round by default, a
  second only for a named Blocker, reproduce-and-deduplicate before round two, three rounds hard cap,
  and a monotone-decrease stop. The mirror lives at `code-review.md:75-88`.
- **The runtime that owns the counter.** `REVIEW_BLOCKER_CLASSES` (`src/work-loop.mjs:98-102`) is
  frozen as exactly `production-defect` / `guard-protects-nothing` / `locked-contract-violation` —
  word for word SPEC 71's three named blockers. `decideReviewRound` makes the admission, hard-cap and
  no-progress decisions; `src/commands/loop.mjs` persists the counters across resume.
- **`reads:` / `files:` on the story record**, and `aof work next --json`'s `wave` / `heldSet`
  partition by declared writes (`src/ready-wave.mjs`).

**The one thing 83 left dangling is this milestone's centre.** `reviewFindingDisposition`
(`src/work-loop.mjs:142-148`) already answers `{ disposition: "work-item" }` for a non-blocker
finding — and **nothing anywhere consumes that answer**. There is no path from a review finding to a
work item. `aof work promote-gap` promotes a declared GAP; a finding has no promoter.

### Closed by 70 (warm-start) and 68 (loop-telemetry) — the lines 71 must not cross

- `70/ADR-008` hands lane parallelism and review-lane changes to this milestone **by name**, and in
  the same breath fixes what 70 owns: the cache flag (`70/ADR-004`), the phase brief, and the rule
  that a review phase never resumes a build session. **71 sets no cache flag, changes no model
  routing, and composes no brief.**
- `68/ADR-008` — 68 makes the numbers true and enforces nothing with them. **71 gates on no
  telemetry**; it is the prompt layer's half of 69's contract, measured later by 68's numbers.
- `70/ADR-007` — the architecture budget binds at accept on the item being accepted. This document
  stays under `work.doctor.budgets.architecture` (1400 lines) for that reason.

### Closed elsewhere, and load-bearing here

- `54/ADR-007` — the gate is a monotone COST LADDER. `invokeGateLadder` (`src/commands/loop.mjs`)
  walks `work:validate` then `work:doctor` at the driven item's own scope, short-circuiting on the
  first red rung, with the admitted doctor code set DERIVED by filter from `CONTROL_FINDING_CODES`.
- `37/ADR-001` — `spike` and `chore` are **top-level drivers**. `DOCS_BY_TYPE` in
  `src/commands/insert-shared.mjs:57-60` is `{ milestone, uat, chore }`: the top-level insert engine
  **cannot** create a story, and a chore **cannot** be nested. ADR-003 is built on that fact.
- `39/ADR-001` — `work:promote-gap` reuses `runInsertTopLevel({ type: "chore" })` and seeds the DoD
  from the gap's own discharge condition, with a `## Notes` back-reference. It is the existing
  promotion seam and ADR-004 extends it rather than adding a rival.
- `66/ADR-006` — reviewers report findings **unnumbered**; the id is allocated by the SINGLE WRITER
  at the moment of landing the finding in the register. `66/ADR-001` / `66/ADR-008` give the
  declaration grammar and the qualified-citation form; `66/ADR-002` gives the acceptance horizon.
- **A delivered acceptance criterion is IMMUTABLE.** A shipped `.feature` is never edited, never
  annotated, never tagged `@superseded`. A new rule lands in the ACCEPTING item's own contract. Tests
  are code and may change. This is the house rule ADR-005 turns on.

---

## ADR-001 — The prompt walks the gate ladder the shell already walks, and names its rungs from the shell's own module

**Status:** Accepted — §Decision and §Consequences **amended by ADR-009** (A: the ladder re-runs before round two; E: a throwing rung is a red rung)
**Date:** 2026-09-01

**Context.** `continue.md`'s story lane goes step 3 **Build** → step 4 **Review** with nothing
between them. The loop SHELL does better: `invokeGateLadder` (`src/commands/loop.mjs`) runs
`work:validate` at the item's scope, and only on a clean result runs `work:doctor`, admitting exactly
the `error`-severity findings whose code survives a derived filter — and only then reaches the review
gate. **A direct `aof:continue` never enters that shell**, so every reviewer this repository spawns
by hand is spawned without the free deterministic gate having run. That is a pure ordering defect:
two commands that cost seconds run after two agent lanes that cost tens of minutes.

**Decision.** `continue.md`'s story lane runs the gate ladder **before** spawning any reviewer, in
the shell's own order and at the driven item's own scope: `aof work validate <ref>`, then — only if
clean — `aof work doctor <ref>`. A red first rung **short-circuits**: report the rung that answered
and its findings, fix, and re-run; do not spawn a review lane on a red gate. The prompt names the
same two rungs `invokeGateLadder` invokes and **no others**.

**Alternatives considered.**
- *Add a third rung (the `@executable` suite, or the full repo suite) before review.* Rejected — the
  ladder is `54/ADR-007`'s and is monotone by cost; `verify.md:85-92` already scopes a story's suite
  to the story and runs the full one once at the milestone gate. A third rung here would be a second
  ladder, and `57/ADR-003`'s "no seventh lane" posture refuses it.
- *Leave the ordering to the shell.* Rejected — this IS the gap. The shell is not on the path an
  operator types.
- *Have the prompt run `aof work loop` so the shell does it.* Rejected — `continue.md:82-84` states
  that this command is the walk's one implementation and calls no other command; inverting that is a
  much larger change than the milestone's subject.

**Consequences.** Reviewers only ever see green-gated work, which is what makes ADR-007's delta
re-review safe: a lens that reported clean in round one is not re-spawned, and the regression it
would have caught is caught by this ladder instead. The cost is one extra command pair per story lane
(seconds). The risk is drift: the prompt could name a rung the shell does not run, which is exactly
what FF-7105 refuses.

**Invariant.** The set of gate command ids `continue.md` names before its review step **equals** the
set `invokeGateLadder` invokes, derived from that module rather than from a literal list. → **FF-7105**

---

## ADR-002 — The build's terminator is spoken; and a bound stated in a prompt names its home and equals it

**Status:** Accepted
**Date:** 2026-09-01

**Context.** Two halves of one defect.

*The build's terminator is missing from the prompt.* `continue.md:188-190` says only "until every
task's `@executable` scenarios/rows are green and fitness functions pass". The runtime's
failure-to-progress bound — stop after `work.loop.buildNoProgressRounds` (default 2) consecutive
rounds with no reduction in the failing count — exists in `src/loop-bounds.mjs` and is declared by
`src/bundle/loops/build-to-green.md`, and appears **nowhere in the command prompt layer**. So a build
that cannot converge has, from the agent's point of view, no stopping condition at all. MAST attributes
9.82% of multi-agent failures to exactly this: being unaware of a stopping condition.

*And where the prompt DOES state a bound, it states a bare numeral.* Measured at HEAD:
`src/bundle/loops/*.md` name the config key and state **no** numeral (`build-to-green.md:30`,
`review-fix-rereview.md:27`) — the correct shape. `src/bundle/commands/*.md` do the opposite:
`continue.md:210` "Review runs once by default", `continue.md:217` and `code-review.md:87` "Three
rounds is the hard cap", and the string `work.loop.` appears in **zero** bundled commands. Three
untethered numerals, and nothing that fails when 69 changes one.

**Decision.** Two moves, one story.

1. **`continue.md` step 3 states the build's terminator in full**: green `@executable` scenarios,
   clean typecheck/lint, passing fitness functions — **and** the failure-to-progress stop, naming
   `work.loop.buildNoProgressRounds` and its default of 2, with the same "stop and report, do not
   start another round" hand-back the review lane already has.
2. **Every loop bound a bundled asset states carries its home beside the value.** The numeral STAYS
   and the citation is ADDED: a `work.loop.*` key for a configurable bound, or the exported constant
   name for a clamp (`MAX_REVIEW_ROUNDS`, `src/loop-bounds.mjs`). "Three rounds is the hard cap"
   survives verbatim — it gains ", the `MAX_REVIEW_ROUNDS` clamp on `work.loop.reviewRounds`".

**Alternatives considered.**
- *Remove the numeral and cite only the key.* Rejected, and this is the decision's crux. **No shipped
  surface prints the resolved value.** `aof work loops show` renders the ceiling POINTER, not the
  number; `loadLoops` only checks that a pointer RESOLVES (`src/work-loops.mjs:935-948`); and
  `.aof/aof.config.json` carries no `work.loop` block at all, so an agent that went looking would
  find nothing and guess. An agent reads the prompt cold. A citation without a value is a worse
  instruction than a value without a citation.
- *Generate the prompt text from the constants.* Rejected — the bundle is hand-authored prose and a
  generator over it is a larger surface than the drift it prevents. A control is cheaper than a
  compiler.
- *Add a `work loops resolved` read face so the prompt can cite only the key.* Rejected **for this
  milestone** — it is a new command surface on a milestone whose SPEC is the prompt layer, and
  `src/commands/` is already TECH_DEBT item 78's subject. Recorded as the natural successor if a
  second repository ever configures these knobs away from the defaults.
- *Leave it.* Rejected — two numerals in two files with no tether is precisely the second-home
  species `61/ADR-009`'s comment indicts ("two homes for one number become two different numbers the
  first time either is edited").

**Consequences.** `test/story-context-contract.test.mjs:191-196` asserts the literal phrases "Three
rounds is the hard cap" and "not strictly lower than the previous round" in the bundle. Because the
decision ADDS rather than removes, that assertion keeps passing and **no delivered 83 scenario
moves** — 83's prompt-facing scenarios read the review-rounds section for behaviour, never for a
numeral. The stagger interval of ADR-006 is deliberately OUT of this invariant's reach: it is not a
`work.loop.*` bound, and widening the control into a numeral hunt over prose would make it
unmaintainable.

**Invariant.** Over every bundled asset: every `work.loop.*` key named resolves through
`LOOP_BOUND_VALUE_RESOLVERS`; every value stated for such a key equals that key's resolver default;
and the three bound facts the commands state — the review default, the review hard cap, the build
failure-to-progress stop — each name their home. → **FF-7101**

---

## ADR-003 — The triage rule: four ordered questions, and the loop's creation authority is exactly one type in exactly one place

**Status:** Accepted — **amended by ADR-009** (B: the router lands as code; and the type impossibility is a TypeError, not a refusal)
**Date:** 2026-09-01

**Context.** This is STATE.md's one open question, and the milestone's load-bearing decision:
*"'findings become work items' needs a home… getting it wrong turns a bounded loop into an unbounded
backlog."* The cap on rounds is only survivable if the findings it stops chasing go somewhere named;
but a promotion path with no bound converts a bounded round loop into an unbounded work loop, which
is strictly worse — the queue would then be produced by the same agent whose thoroughness the cap
exists to bound.

Three facts constrain every candidate answer, and all three were measured rather than assumed:

- **`runInsertTopLevel` creates TOP-LEVEL items only, and its type set is `{ milestone, uat, chore }`**
  (`src/commands/insert-shared.mjs:57-60`). It **cannot** create a story; a nested story needs
  `runInsertStory` with an explicit `--under NN`. And `37/ADR-001` makes a chore top-level by
  construction.
- **A top-level item is invisible to the walk that created it.** `aof work next <NN> --through-review`
  is scoped to the milestone; `continue.md:116` forbids asking it unscoped. So an item created
  top-level cannot re-enter the current milestone walk, while an item created UNDER the milestone
  would appear in the next `readySet` and be built and reviewed inside the very pass that spawned it.
  That is the unbounded loop, exactly.
- **The loop cannot allocate a finding id.** `66/ADR-006` gives id allocation to the single writer at
  the moment of landing the finding in a register, and the only findings register is
  `VERIFICATION.md` — a MILESTONE document, authored at `aof:verify` by the PO (there is no story
  `VERIFICATION.md` template; `src/bundle/templates/story/` ships `STORY.md` alone). At review-close
  time inside `aof:continue`, no register and no allocator exist.

**Decision.** At the CLOSE of the review pass — once, never during a round — each surviving
non-Blocker finding is put to **four ordered questions**, and the first one that answers wins:

1. **Does it require a change to a LOCKED CONTRACT (a delivered `.feature`, or an ADR)?** → It is an
   **amendment**, ratified in the beat that raised it (ADR-007), landed in the ACCEPTING item's own
   contract or as a new superseding ADR. **No item is created.** The delivered `.feature` is never
   touched.
2. **Is it discharged by a checklist against existing code, with no new acceptance criteria?** → a
   **top-level `chore`**, created by the loop through the existing seam
   (`runInsertTopLevel({ type: "chore" })`), born `not-started`, its `## Definition of Done` seeded
   from the finding's own remedy, carrying a `## Notes` back-reference naming the reviewed item's ref,
   the review round, and the finding's own one-line title and `file:line`.
3. **Does it need new acceptance criteria that a `.feature` must state?** → **the loop creates
   nothing.** It records the finding with the routing `story (operator)` and the shape the story would
   take, and hands back. When the operator refines that story, its scenarios carry `@finding-<id>` —
   the convention `verify.md:112` and `refine.md:160` already ship.
4. **Otherwise** → it stays a **recorded finding** on the path `continue.md:191` already uses (the
   milestone's `STATE.md` `## Feedback (for retro)`), and is landed in `VERIFICATION.md`'s `## Findings`
   register with its allocated id by the PO at `aof:verify`, where `routed-to` names the chore
   already created or the story to be refined.

**The bounds that keep this from becoming a backlog**, each structural rather than numeric:

- **No promotion ever creates a milestone.** That is the operator's call, never the loop's.
- **No promotion ever creates a story.** Authoring acceptance criteria is a refine act; a story born
  without criteria is precisely the unbounded backlog STATE.md names. Question 3 is where the loop
  stops and the human starts.
- **The loop's creation authority is exactly one type — `chore` — in exactly one place — top level.**
  Both follow from `37/ADR-001` plus the insert engine's own type set; neither is invented here.
- **A promotion APPENDS and shifts nothing.** `defaultAt` (`promote-gap-to-chore.mjs:94-97`) appends
  after every existing top-level item, so `shifted === 0`. A renumber mid-walk would invalidate every
  ref in flight.
- **Promotion is idempotent per finding.** The key is (reviewed item ref + finding title); a second
  promotion of the same pair creates nothing and reports the existing chore.
- **The eligible population is already bounded by 83's reporting bar.** Only findings that met the
  >80% bar and are severity Important reach question 2 at all; Nits are recorded (question 4) and are
  never promoted. The promotion rate therefore cannot exceed the Important-finding rate, which the
  bar caps. This is the load-bearing bound — the round cap and the promotion path share one throttle.

**Alternatives considered.**
- *Promote question 3 to a story under this milestone, tagged `@finding-<id>` (the candidate rule).*
  **Rejected on the measured re-entry fact above**: `work next <NN>` would return it as ready and
  `continue.md:91-97`'s "loop on the CLI's `state`" would build and review it inside the same pass.
  That converts a capped round loop into an uncapped story loop — the failure STATE.md predicts.
- *Let the loop create a nested story but mark it excluded from the current walk.* Rejected — it needs
  new runtime state ("not admitted to this walk") that fights `work next`'s dependency answer, for a
  case where "stop and tell the operator" is the correct answer anyway.
- *Allocate a finding id at continue-time so promotions can carry `@finding-<id>`.* Rejected —
  `66/ADR-006` gives allocation to the register's single writer, and opening a register early would
  put a second writer into `VERIFICATION.md`. The back-reference-by-title idiom `39/ADR-001` already
  ships needs no id, and `routed-to` closes the trace in the other direction at `aof:verify`.
- *Defer ALL promotion to `aof:verify`, where the register exists.* Rejected — the round cap is only
  survivable if the finding is scheduled at the moment the loop declines to chase it. A finding held
  for the gate is a finding the operator meets as a surprise.
- *A numeric per-pass promotion budget.* Rejected — it would be an arbitrary N and a ninth bound with
  no declared range (`61/ADR-009` would have nothing to probe). The structural bounds above are
  stronger and need no value.

**Consequences.** `reviewFindingDisposition`'s `disposition: "work-item"` finally has a consumer. The
worst case is bounded and legible: a review pass can add at most one top-level chore per Important
finding, appended, never renumbering, never entering the walk that created it. The honest cost is that
question 3 stops the machine and asks a human — deliberately, because that is the only question whose
answer is new acceptance criteria.

**Invariant.** No module on the promotion path can emit an item type other than `chore`, no bundled
command instructs the creation of a milestone or a story from a finding, and the promotion shifts zero
items. → **FF-7103**

---

## ADR-004 — One promotion engine, two faces — the finding promoter EXTENDS the gap promoter's seam and adds no rival

**Status:** Accepted — **amended by ADR-009** (the engine/face layering is fixed: no upward `../commands/` import)
**Date:** 2026-09-01

**Context.** ADR-003 needs a promoter. `work:promote-gap` already performs 90% of it: reuse the chore
insert engine, seed the DoD from a close criterion, append a `## Notes` back-reference, refuse when
there is nothing to schedule. What it does **not** have is (a) provenance that says *finding* rather
than *gap*, (b) an idempotence check, and (c) an originating item ref. Calling it as-is would write
`- **Promoted from gap:** "…"` onto a chore that came from a review finding — a provenance lie in a
record whose whole purpose is traceability.

Graph-measured: `src/commands/promote-gap-to-chore.mjs` has **1** dependent (`src/command-core.mjs`)
and `src/commands/insert-shared.mjs` has 6. This is the lowest-risk runtime seam in reach; the hubs
this milestone must NOT touch are `src/loop-bounds.mjs` (26 dependents) and `src/commands/loop.mjs`
(29).

**Decision.** Extract the promotion mechanics — DoD seeding, back-reference authoring, append-position,
and the new idempotence scan — into **one engine module under a family directory**, `src/work-promote/`,
and leave two thin faces on it:

- `src/commands/promote-gap-to-chore.mjs` — edited to delegate; `work:promote-gap`'s observable
  behaviour comes out **unchanged**, with 39's own suite as the control.
- `src/commands/promote-finding-to-chore.mjs` — new; registers `work:promote-finding`, whose
  back-reference names the reviewed item ref, the round and the finding, and which is idempotent on
  (ref + finding title).

**No `/aof:` bundle wrapper is added.** `work:promote-gap` ships without one, and the promotion is a
VERB the review lane calls, exactly as `aof work status` is. The reason is not cost — 71/01 already
writes `src/bundle/manifest.json` for the triage-rule prose — it is the BOUND: a `/aof:promote-finding`
door is a second entry point to an act whose whole discipline is the four ordered questions of ADR-003.
A door invites promotion outside the triage rule, and the rule is the only thing standing between this
milestone and the backlog STATE.md warns about. The verb stays reachable to a human who wants it; it
just is not advertised as a phase.

**Alternatives considered.**
- *Generalise `work:promote-gap` with a `--from finding` flag.* Rejected — it changes a shipped CLI
  contract with delivered 39/03 criteria behind it, for a saving of one thin face.
- *Import the two helpers directly from `promote-gap-to-chore.mjs`.* Rejected — it makes a module
  named for one of its two callers the home of both, which is the shape that rots.
- *Copy the seeding logic into a standalone finding promoter.* Rejected outright — two chore-seeding
  writers is the duplication this whole register exists to refuse.
- *Land the engine as two more flat siblings in `src/commands/`.* Rejected — `src/commands/` is
  TECH_DEBT item 78's subject at 91 flat siblings; `src/work-tune/`, `src/work-audit/` and
  `src/work-acceptor/` are the in-tree precedent item 78's own fix section endorses. Net effect: 71
  adds **one** file to `src/commands/`, and its trend line moves the right way.

**Consequences.** `work:promote-gap`'s fan-in stays at 1; the new face adds a second. The extraction
is behaviour-preserving by construction and its proof is 39's untouched suite — a behavioural claim
over a seam, so it belongs in 71/01's `.feature`, not in this register.

**Invariant.** The DoD seed, the back-reference author and the idempotence scan live in exactly one
module; both faces reach them by import and contain no copy of either. → **FF-7104**

---

## ADR-005 — The render lane is GATED on renderability, and this milestone supersedes 07's `npx playwright` clause

**Status:** Accepted — **§3 superseded in part by ADR-009** (the schema claim is measured FALSE; the arch-test count is three, not two; the invocation carries `--window-size`; "resolvable" is defined)
**Date:** 2026-09-01

**Context.** `continue.md:234` and `verify.md:100` both mandate:
`npx playwright screenshot "<baseUrl><Route>" <out>.png`, reading the base URL from `work.ui.baseUrl`.
On this machine `npx playwright` is **policy-blocked**, and `.aof/aof.config.json` has **no `work.ui`
key at all** — verified at HEAD. So every UI story burns three breakpoints × N surfaces of failed
invocations plus two agent spawns to arrive at an `INCONCLUSIVE` the config had already determined
before the first spawn. The lane's verdict rule is stated as a VERDICT *after* the attempt
(`continue.md:239`: "It is `INCONCLUSIVE` when no base URL / screenshot is available"), never as a
PRECONDITION *before* it. There is no renderability precondition anywhere in the layer.

Meanwhile the substitute already exists and no prompt states it: the cached `ms-playwright` Chromium
driven directly, `--headless=new --screenshot=<ABSOLUTE forward-slash path>`, used by **seven**
existing records (35/03, 36/01, 36/02, 43/04, 45/03, 46/04, 49/05 among them).

**And the `npx` path is locked by DELIVERED acceptance criteria.**
`wiki/work/07_milestone_design-conformance/stories/02_story_review-wiring-and-convention/tasks/01_review-renders-and-judges.feature:25`
requires the commands to render "via `npx playwright screenshot`", and
`.../tasks/03_conformance-loop-bundled.feature:49-50,76` requires the marker
"render via npx playwright + hand to designer" in both bundled commands. Both are enforced in CI by
`test/arch/acd-conformance-verdict-contract.test.mjs:73-79` and
`test/arch/acd-design-conformance-bundled.test.mjs:40-41,79`.

**A delivered `.feature` is IMMUTABLE.** It is never edited, never annotated, never tagged
`@superseded`. The record of what 07 accepted stays exactly as 07 accepted it.

**Decision.** Three parts, and the order matters.

1. **The supersession is stated in 71's OWN contract.** 71/03's task `.feature` states the new rule —
   "the review renders via the cached Chromium, never `npx playwright`, and only after a renderability
   precondition passes" — and states that it supersedes the render-mechanism clause of
   `07/ADR-002` as carried by 07/02's tasks 01 and 03. **07's files are not touched.** This ADR is the
   record of the supersession and of why it is legitimate: the mechanism 07 chose is unavailable on
   the platform 07 ships to, and the verdict contract 07 actually cared about is unchanged.
2. **The arch tests are amended.** Tests are code and may change.
   `acd-conformance-verdict-contract.test.mjs` and `acd-design-conformance-bundled.test.mjs` assert
   71's rule instead of 07's: the render marker becomes the cached-Chromium invocation plus the
   precondition, and the "Playwright is not a `package.json` dependency" leg — which is `07/ADR-002`'s
   real invariant and unaffected by the mechanism — plus `acd-design-role-split.test.mjs:68` (the designer body never names `npx playwright`) and `:92-97` (the hand-off, the QA spawn, "not instruct the designer to run the browser"), and `acd-conformance-verdict-contract.test.mjs:55-68`'s three Verdict literals, which 71/03 preserves verbatim rather than amending that file a fourth time.
3. **The render step gains a precondition, and a skip that is a first-class outcome.** Before any
   render is attempted, resolve **(a)** a base URL — `--url`, else `work.ui.baseUrl` — and **(b)** a
   renderer binary — `work.ui.renderer` when declared, else discovery in the platform's `ms-playwright`
   cache. If either is missing: **do not attempt the render.** Record the reason naming the missing
   key or the missing binary, return `INCONCLUSIVE`, and continue the story lane. `work.ui.renderer` is
   one additive key in the `work.ui` namespace `07/ADR-004` already opened, and the config schema is
   `additionalProperties: true` throughout, so nothing else moves.

`07/ADR-001`'s role split is untouched: the orchestration renders, the read-only designer judges the
screenshot it is handed, QA runs the harness. Only the renderer binary changes.

**Alternatives considered.**
- *Delete the design lane.* Rejected — SPEC and STATE both say gate, not deletion; the lane catches
  real design gaps cheaply at build.
- *Keep `npx playwright` and add a precondition that always fails here.* Rejected — it makes the lane
  permanently INCONCLUSIVE on this machine and preserves a mechanism seven records have already
  abandoned in practice. The prompt would be documenting a fiction.
- *Amend the 07 features.* **Refused on the immutability rule.** The rule is not a preference; a
  shipped criterion is the record of what was accepted.
- *Hard-code the Windows Chromium path.* Rejected — the bundle ships to every platform. Hence
  `work.ui.renderer` plus per-platform cache discovery.
- *Discovery only, with no config key.* Rejected as the sole mechanism — a repo whose browser is not
  in the `ms-playwright` cache would have no way to say so — but discovery remains the fallback, so a
  repo that configures nothing still works.

**Consequences.** UI stories stop paying spawn-and-fail cost for a determinable answer. The
INCONCLUSIVE verdict now carries a *reason with a key name in it*, which is actionable
("set `work.ui.baseUrl`") where the old one was not. The residual risk is a repo that sets
`work.ui.renderer` at a broken binary: that fails at the render and is INCONCLUSIVE with the reason
recorded — the same outcome as before, at the same cost, and it is a config error rather than a
framework one.

**Invariant.** No bundled asset names `npx playwright` as its render invocation, every render step in
a bundled command is preceded by the renderability precondition, and the two 07 arch tests assert 71's
rule. → **FF-7102**

---

## ADR-006 — Review lanes are spawned concurrently with a small stagger, and execution mode is read off the wave rather than off static config

**Status:** Accepted — **amended by ADR-009** (B: the mode derivation lands as code; and the pinned literals 71/02 must preserve are named)
**Date:** 2026-09-01

**Context.** `continue.md:135` says it for builds — "Spawn the builds together … and wait for all of
them" — and the review step (`:198-199`) names three lanes plus a craft pass and says nothing about
how they run. Measured in SPEC: `aof-architect` concurrency **1.00×** with a serial-chain cost of
30m46s, `aof-qa` 32m01s — **1h03m of pure serialisation in one milestone**, on a lane one sentence
would have parallelised.

Separately, `work.agents.mode` is static (`.aof/aof.config.json` says `orchestrated`) while
`aof:continue` has already computed the ready set and the write-disjoint `wave` before it spawns
anything. A wave of one is knowably solo, and a five-agent fan-out over it pays full cold-start cost
for no parallelism at all.

**Decision.**

- **The review lanes spawn together and are waited on together**, in the same terms `:135` uses for
  builds — structural, behavioural, design-when-UI, and the automated craft pass. They are
  independent lenses over one diff; nothing in the review step reads another lane's output.
- **Spawn them with a small stagger** (a handful of seconds between spawns) so the first warms the
  shared prompt prefix the rest read. The interval is prose in the prompt, **not a config knob and not
  a `work.loop.*` bound** — see the alternatives.
- **Execution mode is derived, then overridden.** After `aof work next <ref> --through-review --json`
  answers, a `wave` of exactly one member runs **inline** — no dispatch, no spawn for the build phase —
  because there is nothing to parallelise. `--solo` still overrides to solo; an explicitly
  `solo`-configured workspace is still solo. The derivation only removes fan-out that could not have
  paid for itself; it never *adds* fan-out against a solo setting.
- **What 71 does NOT touch here:** no cache flag, no model routing, no session resume. `70/ADR-004`
  owns the flag and `70/ADR-008` owns "a review phase never resumes a build session"; the stagger is a
  spawn ORDERING decision and changes neither.

**Alternatives considered.**
- *Make the stagger a `work.loop.reviewStaggerMs` knob.* Rejected — it would be a ninth `work.loop.*`
  key, and `61/ADR-009` would then need a declared range for a value whose failure mode when wrong is
  "the prefix cache misses". A knob with no consequence is a ratchet waiting to walk.
- *Derive mode from the ready set rather than the wave.* Rejected — `readySet` is the dependency
  answer and `continue.md:121` is explicit that it is not a dispatch instruction. `wave` is what will
  actually run.
- *Also derive mode for the REVIEW lanes (a single reviewer when the diff is small).* Rejected — the
  lenses are not interchangeable and dropping one is "removing review lanes", which SPEC puts out of
  scope.

**Consequences.** The measured 1h03m of serialisation becomes wall-clock bounded by the slowest lens.
Contention is bounded by `aof work dispatch --list --json`'s `bound`, which `continue.md:123` already
forbids exceeding.

**Invariant.** None declared. "The lanes are spawned together", "the stagger is applied" and "a wave
of one runs inline" are observable behaviours over a seam, and belong in 71/02's `.feature` — a
grep for the word "together" in a prompt would be a control that proves nothing.

---

## ADR-007 — Re-work is bounded: round two re-reviews the DELTA, and an amendment ratifies in the beat that raised it

**Status:** Accepted — **amended by ADR-009** (F: one deduplicated Blocker re-spawns exactly one lens)
**Date:** 2026-09-01

**Context.** Two shapes of the same waste.

*Round two currently re-runs everything.* `continue.md:198-199` describes one review composition, and
`<review_rounds>` says a second round may run without saying what it reviews. The default reading is
the full three-lane pass over the whole story — paying the full cost of round one to check a handful of
named fixes. Huang et al. (ICLR 2024) is the reason this is not merely expensive: intrinsic
self-correction without an external oracle is net-negative (GPT-4 on GSM8K 95.5% → 91.5% → 89.0%), so
a broad second pass is a second chance to *introduce* findings, not only to confirm them.

*Amendments are applied after the fact.* In milestone 52, **thirteen agent runs existed only to
re-apply ADR deltas to contracts that had already been authored** — 38% of agent-active time and
**661.6k output tokens, 41.8% of the whole milestone**, against five authoring runs and one build run
at 7%. `refine.md`'s `--autonomous` cascade authors every story's contract in one fan-out; an ADR
amended after that fan-out re-opens every contract it touches.

**Decision.**

- **Round two is a DELTA review.** It re-spawns only the lens(es) that raised a surviving Blocker, and
  hands each exactly: the fix diff, the Blocker that lens raised, and the contract clauses those
  Blockers cite. Not the story's whole `reads:` set, and not the lenses that reported clean. The
  design lane re-runs only if a design-gap Blocker survived, and then only for the surfaces it named.
  The reproduce-and-deduplicate step `continue.md:216-217` already requires is what names the delta.
- **An ADR amendment ratifies in the beat that raised it.** Concretely: (a) under `refine.md`'s
  milestone cascade, the ADR set closes **before** contract authoring fans out — a delta raised during
  the architecture pass is folded in there, never re-applied afterwards; (b) a delta raised **after**
  contracts are authored is a FINDING, routed by ADR-003's four questions — question 1 for a locked
  contract, and it lands in the ACCEPTING item's contract, never as an edit to a delivered `.feature`;
  (c) the one case that still earns its round is a delta that would ship a *wrong* criterion, which is
  a `locked-contract-violation` and therefore already a Blocker under 83's frozen class set.

**Alternatives considered.**
- *Re-run the full pass in round two for safety.* Rejected — that is the measured status quo, and the
  regression it fears is caught more cheaply by ADR-001's gate ladder plus the `@executable` suite,
  which run before any lens is spawned.
- *Freeze ADRs entirely once contracts are authored.* Rejected — a genuinely wrong criterion must be
  fixable, which is why (c) exists as a named exception rather than a loophole.
- *Let the fix round re-author contracts.* Rejected — it is m52's exact failure, and it puts a second
  writer into documents with declared single writers.

**Consequences.** Round two's cost falls from "one full review" to "one lens over one diff". The trade
is real and named: a defect that a clean-in-round-one lens would only have caught after the fix lands
is caught at `aof:verify` instead, or not at all. That is the same trade `verify.md:85-92` already
takes for suite scoping, and ADR-001's gate ladder is what makes it survivable.

**Invariant.** None declared. "Round two spawns only the lenses that raised a Blocker" and "the ADR
set closes before the contract fan-out" are behaviours over seams — 71/02's `.feature` states them.

---

## ADR-008 — The partition: FOUR stories, `depends: []`, and an honest wave width of ONE

**Status:** Accepted — **write sets amended by ADR-009** (the rendered runtime copies, the schema, and four guards were missing)
**Date:** 2026-09-01

**Context — and the fact that decides it.** Almost every candidate story for this milestone writes
`src/bundle/commands/continue.md`. Worse, **every story that edits any bundled file also writes the
generated `src/bundle/manifest.json`** — it is a whole-bundle content address (`renderBundleOutputs` +
`hashContent`, guarded by `test/arch/acd-bundle-manifest-hashes.test.mjs`), so any bundle edit changes
it. And **every story that lands an arch test also writes `scripts/test.mjs`**, the runner's one
registry.

`partitionReadySetByDeclaredFiles` (`src/ready-wave.mjs:44-78`) is a greedy exact-overlap partition
with **no exemption for generated or registry files**: any shared declared write puts a member in
`heldSet`. So two stories that both edit the bundle are serialised no matter what their `depends` say.
This is not hypothetical — measured across `wiki/work`, all six of milestone 62's stories declare
`scripts/test.mjs`, so 62's real wave width was **1** despite its ARCHITECTURE describing "five
stage-1 stories with no edge between them".

**Decision — the partition.** Four stories, cut by ARTEFACT OWNERSHIP rather than by concern, because
with a wave width of one the story count IS the serial cost: every extra story is another dispatch,
another cold start, another merge, another cleanup.

- **71/00 — the build's terminator, and the gate before review.** ADR-001 + ADR-002. Sole writer of
  `continue.md`'s build step and of the gate insertion; lands FF-7101 and FF-7105.
  Touches: `src/bundle/commands/{continue,code-review}.md`, `src/bundle/manifest.json`,
  `test/story-context-contract.test.mjs`, two new `test/arch/*`, `scripts/test.mjs`.
- **71/01 — a finding that is not a Blocker becomes a named work item.** ADR-003 + ADR-004. The
  heaviest, and the milestone's **only** runtime work; lands FF-7103 and FF-7104.
  Touches: `src/work-promote/*`, `src/commands/promote-gap-to-chore.mjs`,
  `src/commands/promote-finding-to-chore.mjs`, `src/command-core.mjs`,
  `src/bundle/commands/continue.md` (the triage rule at the review close),
  `src/bundle/manifest.json`, tests, `scripts/test.mjs`.
- **71/02 — one review pass: concurrent, staggered, mode-derived, and re-reviewed on the delta only.**
  ADR-006 + ADR-007. Declares no fitness function, by decision.
  Touches: `src/bundle/commands/{continue,refine,code-review}.md`, `src/bundle/manifest.json`, tests.
- **71/03 — the render lane gated on renderability.** ADR-005; lands FF-7102.
  Touches: `src/bundle/commands/{continue,verify}.md`, `test/arch/acd-conformance-verdict-contract.test.mjs`,
  `test/arch/acd-design-conformance-bundled.test.mjs`, `src/bundle/manifest.json`, `scripts/test.mjs`.

**The change from the five-story candidate, and why.** The candidate's 00, 02, 03, 04 and 05 are five
serial beats where four do the same work: 2g (execution mode from the ready set) is the same
`<config>`/dispatch decision surface as 2e (concurrency) and has no runtime component, so folding it
into 71/02 costs nothing; and the amendment-ratification rule is the same "re-work is bounded" theme as
delta re-review, so it rides 71/02 rather than buying its own beat. Splitting them back out is the
clean seam if the PO wants finer grain — it costs one extra serial beat and buys one smaller diff.

**`depends: []` on all four, deliberately.** There is no dependency in the CONTENT sense: each story's
contract is independently satisfiable, and 71/01 owns BOTH halves of the promotion (the verb and the
prompt text that calls it), so no story waits on another's artefact. The serialisation is a **write**
fact, and `work next` already owns write facts. Declaring false `depends:` edges would (a) duplicate a
fact `files:` already carries, (b) make the ready set unable to distinguish dependency-blocked from
write-held, which is the distinction `heldSet` exists to report, and (c) survive after the overlap is
gone. This is story 83's FIX-4 mechanism used as designed.

**The wave width this milestone can actually achieve is ONE, and it is stated rather than wished.**
All four stories write `src/bundle/manifest.json`; three also write `scripts/test.mjs`. Under the
greedy partition the first ready member takes the wave and the rest are held, every round. **71 is a
serial milestone.** No cut of this scope changes that, because the contention is on two files the
scope cannot avoid:

- *Could one story own `manifest.json` and the others skip it?* No — the bundle drift guard fails
  between merges, so the tree would be red for the duration.
- *Could the stories under-declare `files:`?* That is the exact corruption FIX-4 exists to prevent
  (two stories an architect had partitioned as independent both edited one file, ×9 and ×8).
- *Could the region granularity be finer than the file?* `heldSet` is file-granular by design; two
  stories editing disjoint regions of `continue.md` still collide.

What the partition CAN do — and what this cut does — is minimise the number of serial beats and keep a
single writer per region of `continue.md` per beat, so the serial merges are clean rather than
conflicting.

**Codebase health, routed.** Two observations, neither blocking, both named rather than waved through:

- **The generated-sibling contention is a recurring shape, and FF-7106 is its ratchet.** Measured over
  all 26 stories in `wiki/work` that declare `files:`: exactly **one** under-declares — 61/01 declares
  `src/bundle/frozen-set.jsonc` (a real bundle source, rendering to `.aof/frozen-set.jsonc`) without
  `src/bundle/manifest.json` — and it is `done`, so `66/ADR-002`'s acceptance horizon excludes it.
  Zero arch-test stories under-declare `scripts/test.mjs`. The control is therefore landable green over
  open items today, and it stops the N+1th instance from corrupting a wave.
- **The prompt layer's duplication is real and is NOT this milestone's** — `continue.md` is 300 lines /
  12.4 KB, and four sites carry ~10 KB of duplicated graph-grounding prose. SPEC puts prompt-layer size
  reduction out of scope and it stays there; no `TECH_DEBT.md` entry covers it today, and one should be
  written (a sibling to items 10 / 63 / 78, the flat-growth family). This document does not write it,
  because this pass authored ADRs rather than reviewing a diff — it is reported to the orchestrator as
  a recommended entry instead.

**Alternatives considered.**
- *The five-story concern cut as offered.* Rejected as above: five serial beats for four beats of work.
- *One story for the whole prompt layer plus one for the runtime.* Rejected — the render supersession
  (ADR-005) carries its own contract and amends two other milestones' arch tests; burying it inside a
  general prompt story would hide the supersession in a diff.
- *Claim parallelism from `depends: []` and hope.* Refused. That is exactly the claim
  `continue.md:148-152` tells the orchestrator not to believe, and 62's register is the standing
  example of an ARCHITECTURE that made it.

**Invariant.** A story's declared write set includes the generated siblings its own change requires:
a bundle source implies `src/bundle/manifest.json`, a `test/arch/*.test.mjs` implies `scripts/test.mjs`.
Scoped to OPEN items, per `66/ADR-002`. → **FF-7106**

---

## ADR-009 — Amendments ratified at the Three Amigos and feasibility passes

**Status:** Accepted
**Date:** 2026-09-01

**Context.** ADR-007 says an ADR delta raised while contracts are being authored is ratified **in the
beat that raised it**, never re-applied to already-authored contracts afterwards. The QA and developer
amigo passes raised nine such deltas against this document. This ADR is that rule applied to itself:
one ADR, landed in the same beat, rather than seven edits to seven accepted decisions. The house
precedent is `62/ADR-011`–`62/ADR-013`, which did exactly this at the same two passes.

**Five were DEFECTS — a control that could not land green, or a claim measured false. Every one was
re-measured here before ratifying; none is disputed.**

**§1 — FF-7103 leg (c) contradicted a delivered CLI contract (verified).** `work:promote-gap` ships
`--at <P>`: `promote-gap-to-chore.mjs:129` passes `rawAt` through and `:183` documents the flag, and
`test/promote-gap-to-chore.test.mjs` passes `at: 0` at seven sites (`:69,109,147,179,204,222,247`).
"No call site passes a caller-chosen `at`" could only be landed by deleting that flag, which ADR-004
forbids in terms. **The claim is split at the seam where it is actually true**: the OPERATOR may
choose a position on a promotion they type; the **LOOP** never may, because a renumber mid-walk
invalidates every ref in flight. So leg (c) binds the FINDING face and the loop's call site only, and
the general claim becomes "the engine's default position is append, and no promotion the loop takes
renumbers".

**§2 — FF-7104's sweep was red on landing (verified).** Two live, unrelated homes match "a `## Notes`
heading matcher" and "a section-range walk": `src/phase-brief.mjs:311`
(`extractH2Block(text, (title) => /^notes$/i.test(title))`, with siblings at `:309` and `:470`) and
`src/memory/local-indexing.mjs`'s `splitSections`. A tree-wide sweep for those two shapes fails on
code that has nothing to do with promotion. **The sweep is re-scoped to a promotion SIGNATURE** — a
module that matches `Definition of Done` **and** writes a chore record doc. Measured: `Definition of
Done` has exactly one live home in `src/` today (`promote-gap-to-chore.mjs:28`; the two hits in
`command-core.mjs:304` and the same file's header are comments), so that leg is safe standing alone
and the conjunction only tightens it.

**§3 — FF-7106 missed the real generated siblings (verified).** The bundle renders to **git-tracked
runtime copies**. `git ls-files` confirms `.claude/commands/aof/continue.md`,
`.codex/skills/aof-continue/SKILL.md` and `.opencode/commands/aof/continue.md` are all tracked, and the
last commit to touch the source (`231ee134`) moved **five** files as one: the bundle source, the
manifest, and those three. Stopping at `manifest.json` would pass a story that leaves three tracked
files stale — the drift TECH_DEBT item 54 already records for the installed copies. **The control now
demands every git-tracked rendered output of the bundle members a story declares**, derived from
`renderBundleOutputs()` intersected with `git ls-files`, never from a hand-listed runtime set.
Two further corrections to the same row: the registration leg is **dropped**, because
`test/arch/acd-test-suite-registration.test.mjs` already walks the whole test tree recursively and in
service — restating it here would be the duplication this register refuses; and the remaining legs bind
what a story **lands**, not what it **names**, so a story that merely EDITS an already-registered file
(71/03 edits three) is not forced to declare a runner it does not change.

**§4 — ADR-005 §3's "nothing else moves" is measured FALSE.** `schemas/aof.schema.json`
`$defs/work/properties/ui` is **`additionalProperties: false`** with exactly `{ baseUrl, a11y }`.
`additionalProperties: true` is true of `$defs/work`, not of `work.ui` — I generalised from the parent
to the child and did not check. **`work.ui.renderer` therefore requires a schema edit, and
`schemas/aof.schema.json` joins 71/03's write set.** The addition survives
`test/arch/acd-a11y-config-schema.test.mjs`: its three negative assertions (`:96,103,116`) all pin the
**`a11y` subtree's** enum and type, and `:33-34` assert only that an absent `ui`/absent `a11y`
validates — nothing there closes `ui` itself.

**§5 — ADR-005 named two arch tests; there are THREE (verified).**
`test/arch/acd-design-role-split.test.mjs:91` also asserts `has(cmd, "npx playwright")` for both
`verify.md` and `continue.md`, inside the entry declared at `:88`. Its other legs survive untouched —
`:92-97` (the hand-off, the QA spawn, "not instruct the designer to run the browser") and `:68` (the
designer body never names `npx playwright`), which this milestone actively wants kept. **And a trap
worth stating rather than discovering:** `acd-conformance-verdict-contract.test.mjs:55-68` pins three
literals inside the Verdict bullet 71/03 rewrites — `"no baseline exists"` (or its two accepted
alternates), `"inferring from component code"`, and `"no renderable"` + `"route"`. 71/03 preserves them
verbatim, or that file needs a fourth amendment it should not need.

**§6 — FF-7101 leg (b) carried an implementation trap.** After 71/00's edit the sentence reads
"Three rounds is the hard cap, the `MAX_REVIEW_ROUNDS` clamp on `work.loop.reviewRounds`" — the
numeral **3** adjacent to a key whose default resolves to **1** (measured:
`LOOP_BOUND_VALUE_RESOLVERS["work.loop.reviewRounds"](undefined) === 1`, `MAX_REVIEW_ROUNDS === 3`).
A naive proximity check reds on the correct sentence. **A value binds to the CLAMP NAME when an
exported clamp identifier is present in the same sentence, and to the config key otherwise** — the
clamp is the nearer authority, and both are read from `src/loop-bounds.mjs` rather than listed here.

**Four were QUESTIONS the contracts could not answer. Decided:**

**A. The gate ladder RE-RUNS after every fix round, before any re-review is admitted.** QA is right
that this was the sharpest gap: ADR-001's Consequences argues that delta re-review is safe *because*
reviewers only see green-gated work, and nothing said the ladder runs again after the fixes land — so
a fix that reddened `validate` or `doctor` would be caught only by the lenses ADR-007 has just decided
not to re-spawn, and the safety argument did not close. It closes now. **And a red ladder after a fix
round does not consume a round**: the counter advances on review rounds, and a red gate means the fix
is not finished — return to fix, do not spawn. Otherwise a fix that reddened the gate would burn one
of the three rounds on work no reviewer ever saw.

**E. A gate rung that THROWS is a RED rung, never a clean one.** ADR-001 decided only
"findings ⇒ short-circuit", which left a crashed gate followed by three spawned reviewers forbidden by
nothing. The rule becomes **findings OR an error ⇒ short-circuit**: report the rung, the ref and the
error, and stop. This is not a new principle — `continue.md:276-279` already states that a non-zero
exit from a work verb is a stop signal, always; ADR-001 simply failed to apply it.

**B. The triage rule lands as CODE, and so does the mode derivation.** The developer is right that
71/01's contract was otherwise grep-shaped: a four-question router stated only in prose is a claim no
scenario can drive, and `reviewFindingDisposition` (`src/work-loop.mjs:143-148`) is a 2-way classifier
that cannot express it. **A pure `routeFinding()` decider lands in `src/work-loop.mjs`**, returning
ADR-003's closed four-member routing, beside the classifier whose dangling `disposition: "work-item"`
it finally consumes — the right home, because the triage is a REVIEW decision about *whether* to
promote, not a promotion mechanic. **`decideExecutionMode()` lands in the same module** for the same
reason: `(configured mode × --solo × wave size) → solo | orchestrated` is a decidable function and a
prose-only version is untestable. The fan-in objection does not reach either: `src/work-loop.mjs` has
26 dependents but **one** production dependent (`src/commands/loop.mjs`, measured), and both are
ADDITIVE exports nothing existing reads. This grows two write sets — 71/01 and 71/02 both gain
`src/work-loop.mjs` — and that is a shared write between them, which costs nothing this milestone had:
the wave width is already one (ADR-008).

**C. The render invocation CARRIES the breakpoint width.** ADR-005's substitute named
`--headless=new --screenshot=…` and no window size, which would have silently dropped 07's
`390`/`768`/`1280` breakpoints — a real regression in a delivered conformance contract, wearing a
mechanism swap's clothes. The invocation is the developer's verified form:
`--headless=new --disable-gpu --hide-scrollbars --window-size=<W>,<H> --screenshot="<abs forward-slash path>" "<url>"`
(confirmed on this machine, 7,835-byte PNG). One render per breakpoint, exactly as before. FF-7102
asserts the width token, so a breakpoint-less render fails CI rather than passing quietly.

**D. "Resolvable renderer" means EXISTS AND IS EXECUTABLE, checked at the precondition.** ADR-005's
residual-risk paragraph implied the weaker "the key is set" reading; that was a defect in my reasoning,
not a deliberate trade. The precondition exists to convert a spawn-and-fail into a determined answer
*before* spawning, and a key set to a path that is not there produces exactly the failure the ADR was
written to remove. **Discovery GLOBS, never templates**: the cache layout is not stable — measured
`chromium-1169/1181/1187 → chrome-win/chrome.exe`, `chromium-1200…1234 → chrome-win64/chrome.exe`,
plus `chromium_headless_shell-<rev>` — so a templated path is a bug with a release-number fuse.
Highest revision wins, in a deterministic order. A declared-but-broken binary is now the
PRECONDITION's finding, named with the path that failed, not a render-time crash.

**F. One deduplicated Blocker re-spawns exactly ONE lens.** Reproduce-and-deduplicate
(`continue.md:216-217`) already collapses two lenses' reports of one defect into one claim; re-spawning
both raisers for that one claim is the duplicated effort this milestone exists to remove. The
re-reviewer is the lens whose type owns the claim's class — structural → architect, behavioural → QA,
design-gap → designer — and where the class is ambiguous, the lens whose report survived reproduction.

**Three structural facts recorded, each changing a sentence rather than a decision:**

- **`runInsertTopLevel` performs NO type validation.** `type: "story"` indexes
  `DOCS_BY_TYPE["story"] → undefined` and crashes in `preflightTopLevelScaffold`
  (`insert-shared.mjs:182`). ADR-003's "cannot create a story" is true **structurally, by TypeError,
  not by refusal** — which makes FF-7103 leg (a) load-bearing rather than belt-and-braces: it is the
  only thing between a wrong type and a crash.
- **`DOCS_BY_TYPE` is module-private** (`insert-shared.mjs:56`, no `export`). FF-7103's "read from the
  engine's own `DOCS_BY_TYPE`" is implemented by **source-parsing**, deliberately: exporting it to
  satisfy a control would widen a module's public surface for a test's convenience, which is the
  inversion this register should never cause.
- **The engine must NOT import upward.** `src/work-tune/`, `src/work-audit/` and `src/work-acceptor/`
  contain **zero** `../commands/` imports (measured), and ADR-004 would have made `src/work-promote/`
  the first. **The layering is fixed**: the engine owns seeding, the back-reference, idempotence and
  append-position over data handed to it; the two FACES call `runInsertTopLevel`. The family stays a
  leaf, as its three siblings are.

**Write sets, corrected (ADR-008's `Touches:` lines were incomplete).** The PO owns the `files:`
blocks; these are the facts they need:

- **Every story editing a bundled asset also writes `src/bundle/manifest.json` AND the three tracked
  rendered copies** of each member it edits (§3).
- **71/00** gains nothing — it remains the one story with no runtime file at all. **71/01** gains
  `src/work-loop.mjs` (`routeFinding`), `test/arch/acd-work-command-cli-bijection.test.mjs` (its
  `argsFor` throws `unmapped subcommand` without a `case` near `:272`) and
  `test/arch/acd-work-command-route-coverage.test.mjs` (`BOARD_DEFERRED` needs the new id) — both go
  red on a new `work:promote-finding` until updated.
- **71/02** gains `src/work-loop.mjs` (`decideExecutionMode`), and must preserve
  `test/story-context-contract.test.mjs`'s pinned literals verbatim — highest risk
  ``"Do not recompute or widen `wave`"`` (`:188`) and ``"never substitute `readySet` for `wave`"``
  (`:189`), which sit in `continue.md:126-128`, the exact paragraph the mode derivation edits.
- **71/03** gains `schemas/aof.schema.json` (§4) and `test/arch/acd-design-role-split.test.mjs` (§5).

**Consequences.** Six of this document's declarations could not have landed green as written; they can
now. The cost is one more shared write (`src/work-loop.mjs`, between 71/01 and 71/02) and one more file
in 71/03's set (`schemas/aof.schema.json`) — neither changes the wave width, which was already one.
The gain that matters most is A: without it, ADR-007's central trade had no argument behind it.

---

## Fitness functions

<!-- Each structural invariant from an ADR, paired with the arch-test that enforces it in CI. The
     arch-test lands with its subject story, so `pending` clears story by story.

     `pending` reports at warn while 71 is open and is NOT admitted at accept — `aof work doctor 71`
     reports each unresolved control as `control-unresolved`, and what clears it is landing the file
     or dropping the declaration, never re-marking it `pending`. Each declared control also owes a
     RED PROBE in VERIFICATION.md once it lands: what was changed to make it fail, and the message
     observed.

     HARNESS SHAPE: every arch-test here exports `archTests` as an array of `{ name, run }` — never
     `{ name, fn }` — and is imported AND SPREAD in `scripts/test.mjs`'s suite registry inside its own
     labelled story block. A suite imported and not spread is not registered.

     DELIBERATELY NOT DECLARED HERE, because they are observable behaviour over a seam and belong in a
     task `.feature` (`aof:refine` authors them):
       · "the review lanes are spawned together, with a stagger" and "a wave of one runs inline" (ADR-006)
       · "round two spawns only the lenses that raised a Blocker" and "the ADR set closes before the
         contract fan-out" (ADR-007)
       · "a promoted chore's DoD is seeded from the finding's remedy" and "a second promotion of the
         same finding creates nothing and reports the existing chore" (ADR-003)
       · "`work:promote-gap`'s observable behaviour is unchanged by the extraction" (ADR-004) — its
         control is 39's own untouched suite, which is a test, not a property of the tree
       · "a missing base URL yields INCONCLUSIVE naming `work.ui.baseUrl`" (ADR-005)
     A grep for the word "together" in a prompt would be a control that proves nothing; each of these
     is checkable only by driving the seam.

     ALSO NOT RESTATED, because a guard already in service would fail on the breach:
       · "no framework loop declares an `uncapped` ceiling" — `test/arch/acd-no-uncapped-framework-loop.test.mjs` (69).
       · "no second home for a `work.loop.*` bound in code" — `test/arch/acd-loop-cap-single-home.test.mjs`
         walks all of `src/**/*.mjs` (69/61). FF-7101 is its complement over `src/bundle/**`, which that
         guard does not read.
       · "the shipped manifest is a true content address of the bundle" — `test/arch/acd-bundle-manifest-hashes.test.mjs` (01).
       · "a qualified citation resolves" — `work:doctor`'s `register-dangling-citation` lane (66), which is
         what checks a promoted chore's back-reference once the finding has an id. -->

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-7101 | **A bound stated in a bundled prompt names its home, and equals it.** Over every asset under `src/bundle/` (commands, agents, loops, templates): (a) every `work.loop.*` key named RESOLVES through `LOOP_BOUND_VALUE_RESOLVERS`, imported from `src/loop-bounds.mjs` rather than enumerated here, so an invented or renamed key fails; (b) every value stated as a bound's value equals that bound's own declared answer — **binding to the CLAMP when an exported clamp identifier stands in the same sentence, and to the config key otherwise** (ADR-009 §6), both read from `src/loop-bounds.mjs`; measured, this is what keeps "Three rounds is the hard cap, the `MAX_REVIEW_ROUNDS` clamp on `work.loop.reviewRounds`" green, where a bare proximity check would red on the numeral 3 beside a key whose default is 1; (c) the three bound facts the COMMANDS must state each name their home: the review default (`work.loop.reviewRounds`), the review hard cap (`MAX_REVIEW_ROUNDS`, as the clamp on that key), and the build failure-to-progress stop (`work.loop.buildNoProgressRounds`). Measured at HEAD before freezing (`66/ADR-009`): `src/bundle/loops/*.md` name four `work.loop.*` keys and all four resolve, and `src/bundle/commands/*.md` name **zero** keys while stating three numerals — so leg (a) is green today, legs (b) and (c) are red and are what 71/00 lands. **Scope is a key's neighbourhood, never a numeral hunt**: a numeral in prose that names no `work.loop.*` key and no exported clamp — ADR-006's spawn stagger, the `390`/`768`/`1280` breakpoints — is out of reach by construction, and the control asserts that it is (a planted "wait a few seconds" line leaves it green). Non-vacuity is proven by plants in both directions: a key renamed to one the resolver map does not carry fails leg (a); a stated default changed to any other integer fails leg (b); deleting the `buildNoProgressRounds` citation fails leg (c). | `test/arch/acd-prompt-bounds-name-their-home.test.mjs` | ADR-002 |
| FF-7102 | **No bundled asset renders through `npx playwright`, and no render is attempted before a renderability precondition.** (a) The token `npx playwright` appears in **no** file under `src/bundle/` — the render invocation named in `continue.md` and `verify.md` is the cached-Chromium form (`--headless=new`, `--screenshot=` with an absolute forward-slash path). The ban is on the RENDER INVOCATION only: `aof-qa.md`'s "runs the Playwright harness" and the `toHaveScreenshot` regression are QA's own lane and are asserted still present, so the control cannot be satisfied by deleting design conformance. The invocation **carries a `--window-size=<W>,<H>` token** (ADR-009 §C), so a render that silently drops 07's breakpoints fails here rather than passing quietly. (b) In both commands the render step is preceded by the precondition — a resolvable base URL (`--url` / `work.ui.baseUrl`) AND a resolvable renderer, where **resolvable means exists-and-executable** and discovery **globs** the `ms-playwright` cache rather than templating a path (ADR-009 §D; the layout is not stable — `chromium-1187 → chrome-win`, `chromium-1234 → chrome-win64`, plus `chromium_headless_shell-<rev>`) — with the skip-and-record outcome named, asserted by ORDER within the step rather than by mere presence, so a precondition stated after the render fails. (c) **THREE** milestone-07 controls this supersedes are amended in place and assert 71's rule (ADR-009 §5): `acd-conformance-verdict-contract.test.mjs`, `acd-design-conformance-bundled.test.mjs` and **`acd-design-role-split.test.mjs`** (whose `:91` leg also pins the `npx playwright` render for both commands) contain no `npx playwright` render assertion for `verify.md`/`continue.md`, while three legs of those files are asserted STILL ENFORCED — `07/ADR-002`'s untouched leg — Playwright absent from `package.json` `dependencies`/`devDependencies` — is asserted still enforced by the first of them. **No file under `wiki/work/07_*` is written by this milestone**, asserted against 71's story `files:` sets, because the delivered criteria are immutable and the supersession lives in 71's own contract. | `test/arch/acd-render-lane-is-gated.test.mjs` | ADR-005 |
| FF-7103 | **The loop's item-creation authority is one type, one placement, and zero shifts.** (a) No module on the promotion path — the `src/work-promote/` family and both `src/commands/promote-*-to-chore.mjs` faces — passes any `type` to the insert engine other than the literal `"chore"`, and none of them imports `runInsertStory` or names `"milestone"`/`"story"` as an insert type; the admissible set is read from `insert-shared.mjs`'s own `DOCS_BY_TYPE` **by source-parsing, because it is module-private and exporting it to satisfy a control would widen a module's public surface for a test's convenience** (ADR-009), so a fourth top-level type cannot silently join. This leg is load-bearing rather than belt-and-braces: `runInsertTopLevel` performs **no** type validation, so a wrong type does not refuse — it indexes `DOCS_BY_TYPE[type] → undefined` and crashes at `insert-shared.mjs:182`, and this control is the only thing standing between the two. (b) No bundled command instructs the creation of a milestone or a story from a review finding — asserted over `src/bundle/commands/*.md` at the review-close step, whose four routings are the closed set ADR-003 declares. (c) **The LOOP's promotion is append-only — the operator's is not, and the two are separated at the seam where the claim is actually true** (ADR-009 §1): `work:promote-gap` ships `--at <P>` as a delivered flag (`promote-gap-to-chore.mjs:129,183`, exercised at `at: 0` by seven sites in `test/promote-gap-to-chore.test.mjs`) and keeps it, so the leg binds the FINDING face and the review-close call site only — neither accepts nor forwards a caller-chosen position, both resolve through the engine's append default, and `shifted` is asserted zero on the path the loop takes. Non-vacuity by plants: a face passing `type: "milestone"`, a face importing `runInsertStory`, and the FINDING face gaining an `at` parameter each fail their leg — while the gap face's existing `--at` leaves the control green, which is the assertion that proves the two seams are really separated. | `test/arch/planning/acd-promotion-creates-one-type.test.mjs` | ADR-003 |
| FF-7104 | **One promotion engine, two faces — no second chore-seeding, back-reference or idempotence writer, and the engine does not import upward.** The DoD seed, the back-reference author, the append-position resolver and the idempotence scan exist in exactly one module under `src/work-promote/`; both `src/commands/promote-gap-to-chore.mjs` and `src/commands/promote-finding-to-chore.mjs` reach them BY IMPORT and contain no equivalent. **The tree-wide sweep matches a PROMOTION SIGNATURE, never a bare shape** (ADR-009 §2): a module qualifies as a rival promoter only if it both matches `Definition of Done` AND writes a chore record doc. That conjunction is what makes the sweep landable — a bare "`## Notes` heading matcher or section-range walk" sweep reds on `src/phase-brief.mjs:311` and `src/memory/local-indexing.mjs`, two live homes with nothing to do with promotion — while `Definition of Done` has exactly one live home in `src/` today, so the leg is non-vacuous standing alone. It still runs over ALL of `src/`, so a third promoter landing anywhere fails here rather than passing unseen. **The engine imports no `../commands/` module** — `src/work-tune/`, `src/work-audit/` and `src/work-acceptor/` contain zero such imports and this family stays a leaf beside them; `runInsertTopLevel` is called by the two FACES. Non-vacuity by plants: a copied seeding routine in either face or in a third module is reported naming the file; an `../commands/` import inside `src/work-promote/` fails the layering leg; and `phase-brief.mjs`/`local-indexing.mjs` are asserted NOT reported, which is the leg that proves the signature is doing the narrowing. | `test/arch/acd-one-promotion-engine.test.mjs` | ADR-004 |
| FF-7105 | **The prompt's gate ladder is the shell's, derived from the shell's own module.** The set of gate command ids `src/bundle/commands/continue.md` names before its review step EQUALS the set `invokeGateLadder` invokes — obtained by reading the invoked ids out of `src/commands/loop.mjs` rather than from a literal pair here, so a rung added or removed there fails until the prompt agrees. Equality in BOTH directions: a rung the shell runs and the prompt omits fails, and a rung the prompt names and the shell never runs fails. Order is asserted too — validate before doctor, both before the review step — because the ladder is monotone by cost (`54/ADR-007`) and a prompt that ran them in the other order would be documenting a different ladder. | `test/arch/acd-prompt-gate-ladder-parity.test.mjs` | ADR-001 |
| FF-7106 | **A story's declared write set includes EVERY generated sibling its own change lands.** Over every `STORY.md` under `wiki/work` whose item is OPEN (`66/ADR-002`'s horizon — a `done` item is immutable and therefore un-actionable): if `files:` names any path that is a MEMBER OF THE RENDERED BUNDLE — derived from `loadBundle()` / `renderBundleOutputs()`, never from a `src/bundle/` string prefix, because `src/bundle/frozen-set.jsonc` renders to `.aof/frozen-set.jsonc` and a prefix test is what missed it — then it must also name `src/bundle/manifest.json` **AND every GIT-TRACKED rendered output of that member**, computed as `renderBundleOutputs()` intersected with `git ls-files` rather than from any hand-listed runtime set, so a fourth runtime is covered with no edit here (ADR-009 §3). Measured: `.claude/commands/aof/continue.md`, `.codex/skills/aof-continue/SKILL.md` and `.opencode/commands/aof/continue.md` are all tracked, and commit `231ee134` moved all five files as one — a control stopping at the manifest would pass a story that left three tracked files stale, which is TECH_DEBT item 54's drift one layer earlier. **The claim binds what a story LANDS, not what it NAMES**: editing an already-rendered or already-registered file is not a new sibling, so 71/03 is not forced to declare a runner it does not change. **The registration leg is deliberately absent** — `test/arch/acd-test-suite-registration.test.mjs` already walks the whole test tree recursively and in service, and restating it here would be the duplication this register refuses. Measured at HEAD before freezing: 26 stories declare `files:` and the only violator of the manifest leg is 61/01 (`done`, excluded by the horizon), so the control is green over open items today. Non-vacuity by plants: an open story declaring a bundle member without the manifest, and one declaring it without its tracked rendered copies, are each reported naming the story and the missing sibling. | `test/arch/acd-declared-writes-include-generated-siblings.test.mjs` — **pending** | ADR-008 |
