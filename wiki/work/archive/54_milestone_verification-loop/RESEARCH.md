---
doc: research
---
<!--
  Milestone RESEARCH.md — blocking unknowns resolved by measurement.
  Owner: researcher. Read-only on the codebase; never writes code or design decisions.
-->
# 54 · Verification as a feedback loop — Research

Delegation gate (`work.agents.delegation`) is **off** in this workspace's `.aof/aof.config.json` (no
`agents.delegation` key present at all — checked directly). Every fact below was gathered by reading
source myself; no `codex exec`/`gpt-5.6-sol` delegation was used.

Structured around the six numbered questions in the brief. Each has a **Finding** with `file.mjs:line`
evidence, measured against HEAD (`aof graph build` fresh at 2026-08-22T09:47:47Z, per the brief).
Anything not determinable by reading is called out in **Unknowns** rather than guessed. I report facts
and the constraints they impose — no ADRs, no story partition; that is the architect's.

---

## Q1 — What the deterministic gate emits today, and what subject is recoverable from it

### `validateWork` (`src/work.mjs:904-1093`) — 21 finding classes, almost all file-level

`validateWork` builds its findings through one closure, `add(target, problem)` (`src/work.mjs:907`,
`findings.push({path: target, problem})`). Counting every call site that emits a finding (not the
`Set.add` at `:1090`, which is unrelated bookkeeping) gives **exactly 21 distinct finding classes**,
4 inside `checkFeature` (`:852-869`, the per-`.feature` check) and 17 inside the main body
(`:904-1093`):

| # | Line | Problem template | Recoverable subject |
|---|---|---|---|
| 1 | `:856` | `structural parse failure: free text in step position at line N …` (from `feature-parse.mjs:225-236`) | a **line number** inside the feature file — finer than the file, but not a scenario name |
| 2 | `:859` | `tag "X" — milestone membership is structural, not a tag` | **a tag** |
| 3 | `:860` | `unknown tag "X" (outside the closed vocabulary)` | **a tag** |
| 4 | `:866` | `scenario "X" carries N verification tags …` | **a scenario name** |
| 5 | `:987` | `missing or empty record doc (DOC)` | none beyond the doc filename |
| 6 | `:992` | `digest record doc … only valid for a milestone, not a "TYPE"` | an item type |
| 7 | `:993` | `digest milestone "X" ≠ folder "Y"` | a milestone number |
| 8 | `:994` | `digest slug "X" ≠ folder "Y"` | a slug |
| 9 | `:995` | `invalid status "X"` | a status value |
| 10 | `:997` | `frontmatter type "X" ≠ folder type "Y"` | a type value |
| 11 | `:998` | `frontmatter number "X" ≠ folder "Y"` | a number value |
| 12 | `:999` | `frontmatter slug "X" ≠ folder "Y"` | a slug |
| 13 | `:1000` | `invalid status "X"` | a status value |
| 14 | `:1001` | `missing created date` | none |
| 15 | `:1002` | `missing updated date` | none |
| 16 | `:1004` | `parent "X" does not resolve to a milestone` | a parent ref |
| 17 | `:1022-1025` | `schema N is behind the current schema M …` | a schema version pair |
| 18 | `:1034` | `depends "X" does not resolve to a milestone/uat item` | a `depends` ref |
| 19 | `:1048` | `depends "X" does not resolve to a sibling` | a `depends` ref |
| 20 | `:1071` | `depends cycle: A → B → …` | a cycle chain |
| 21 | `:1081` | `depends cycle: A → B → …` (per-parent story graph) | a cycle chain |

**Exact counts, as asked:** of 21 classes, **1** carries a scenario name (#4), **2** carry a tag
(#2, #3), **1** carries a structural line-number location inside the artifact (#1), and **0** carry a
fitness-function id — `validateWork` has no concept of a fitness function at all; that vocabulary
exists only in `work-doctor-controls.mjs` (below). The remaining **17** classes carry either nothing
beyond the finding's own `path` (a record-doc or `.feature` file) or a bare metadata value (a status
string, a `depends` ref, a cycle chain) — never anything scenario/task/fitness-shaped. Every one of
the 21 always carries `path` (`docPath`/`featurePath`/`workDir`), so file-level attribution is
universal; scenario-level attribution is the rare exception (1 of 21), and fitness-function-level
attribution does not exist in this engine at all.

### `work-doctor-controls.mjs`'s 8 `CONTROL_FINDING_CODES` — the opposite shape

`CONTROL_FINDING_CODES` is frozen at `src/work-doctor-controls.mjs:64-73`:
`register-duplicate-id`, `register-dangling-citation`, `verification-register-missing`,
`verification-missing-red-probe`, `control-unresolved`, `control-unregistered`,
`control-runner-unchecked`, `staged-control`.

| Code | Subject in `message` | Line |
|---|---|---|
| `register-duplicate-id` | a declared id (e.g. an `FF-NNNN`) | `:433` |
| `register-dangling-citation` | the citing entry's id + the target it cites | `:453,470` |
| `verification-register-missing` | the **list** of declared fitness-function ids | `:510` |
| `verification-missing-red-probe` | a fitness-function id | `:523,532` |
| `control-unresolved` | a fitness-function id + the missing control path(s) | `:616-619` |
| `control-unregistered` | a fitness-function id + the unregistered path(s) | `:630` |
| `control-runner-unchecked` | none — an item-level count, no id | `:603` |
| `staged-control` | a file basename, not a fitness-function id | `:586` |

**6 of the 8** carry a fitness-function id as their recoverable subject; the other 2
(`control-runner-unchecked`, `staged-control`) are item-/file-level. This is the inverse of
`validateWork`'s profile: the deterministic engine that already knows how to say "which fitness
function" is `work-doctor-controls.mjs`, not `validateWork` — and (Q3 below) it is not in the loop's
gate at all.

### Which envelope is CONSUMED, and by whom

`work:validate`'s `run()` returns `{findings: [{path, problem}]}` (`src/commands/validate.mjs:27`);
its `--json` CLI face **unwraps to a bare array** (`validate.mjs:63-67`, "the CLI's historical
quirk, preserved by the adapter"). `work:doctor`'s `run()` returns
`{findings: [{code, severity, path, message}], loopReady}` (`src/commands/doctor.mjs:213-221`).

Readers, measured by grep across `src/`, `test/`, `ui/`:
- **`src/board-ui.mjs:125`** — `GET /api/work/validate`, re-projects `{path, problem}` verbatim.
- **`src/board-ui.mjs:144-152`** — `GET /api/work/doctor`, re-projects `{code, severity, path,
  message}` **but drops `loopReady` entirely** — the board face sends `{findings}` only, no
  `loopReady` key, even though `run()` returns it. So `work:doctor`'s Loop-Ready score has no board
  consumer today.
- **`src/commands/loop.mjs:282,558`** — the only production, non-board reader of `work:validate`
  (both `invokeRegistered("work:validate", …)`); nothing in `src/` invokes `work:doctor` outside its
  own command module and `board-ui.mjs`.
- **`ui/src/board/api.ts:247-249`** — a `validate()` client method exists. Grepping `ui/src` for
  `doctor` returns **zero matches** — the UI has no client for `/api/work/doctor` at all, despite the
  server route existing.
- **Tests:** `test/arch/acd-doctor-finding-envelope.test.mjs:54-98` pins `work:doctor`'s
  `{code, severity, path, message}` shape and RAW-ABSOLUTE `path` (ADR-001/15). `test/arch/acd-controls-finding-envelope.test.mjs:52-103`
  pins the 8-code set-equality, per-lane membership, non-vacuity (every code reachable by a fixture)
  and the `{code, severity, path, message}` envelope for the controls lane specifically. Both are
  **CI-enforced consumed contracts**.

**Conclusion:** `work:validate`'s `{path, problem}` shape is the one `aof work loop` actually reads
today (`commands/loop.mjs:558`); `work:doctor`'s richer `{code, severity, path, message}` + `loopReady`
is CI-pinned and board-served but has **no loop consumer and no UI consumer** for its richer half.

### Is `src/work.mjs` editable in practice?

`aof graph impact src/work.mjs` (2026-08-22T09:47:47Z graph): **256 dependents**, 6 outbound edges —
verified at source, matching the brief's figure exactly (53's own RESEARCH measured 241 on
2026-08-15; the file has grown 15 more dependents since).

Milestone 37 (`wiki/work/37_milestone_spike-chore-item-types/ARCHITECTURE.md:327-358`) is where the
rule originates: `src/work.mjs` is named **"the stream's god-node"**, and the partition's first rule
is *"Story 00 — Vocabulary & structural validation. Edits `src/work.mjs` ONLY … neither re-edits the
`src/work.mjs` god-node 00 owns"* — i.e., **at most one story per milestone may edit it.** 53 restates
this verbatim and honours it: *"m37's rule is 'at most one story may edit `work.mjs`'; 52 achieved
zero; **53 achieves zero.**"* (`53/ARCHITECTURE.md:386`), and 53 explicitly declined to widen
`nextWork`'s `inRange` for exactly this reason (`53/ARCHITECTURE.md:383-390`, "**241-dependent**
god-node … it would make the drift *worse*"), instead ledgering the fix as `TECH_DEBT.md` item 49.

It is edited when a story is willing to pay the cost and own it alone: the most recent edit
(`git log --oneline -- src/work.mjs` → `8167486`, PR #21, "Stories 74 and 80 … milestone 68 refined")
is the standalone story `wiki/work/80_story_outcome-per-delivered-item`, whose own in-file comment is
still on the line `validateWork`'s `inScope` closure sits on today (`src/work.mjs:909-915`, "NOTE
(story 80 / task 02)"). So: **editable, but expensive and gated by an enforced one-story-per-milestone
discipline** — a 54 story that needs a new `validateWork` finding class (e.g. to carry a
scenario/fitness-function id where today it doesn't) would be the ONE story in its milestone allowed
to touch it, and would need to justify doing so over composing through `work-doctor-controls.mjs`
instead (which already carries that vocabulary and is a fresh, low-dependent module).

---

## Q2 — Does the loop drop the gate's findings, and where exactly

**Yes, in two independent places, both measured.**

**1 — The pure engine computes the right decision; the command body never reads it.**
`src/work-loop.mjs`'s `decideLoopPhase` (`:217-293`), when a story's continue phase is done and a
`gate` result is supplied, computes (`:260-274`):

```js
const gate = findingsOf(input.gate);
if (gate) {
  if (gate.count === 0) return boundedDrive(ref, "verify", input.verifyCycle, input.cap);
  ...
  return drive(ref, "continue", input.cycle + 1, { findings: copyPlain(gate.value) });
}
```

`drive()` (`:58-64`) builds `{act: "drive", ref, phase, cycle, ...detail}` — so this branch's return
value is literally `{act: "drive", ref, phase: "continue", cycle, findings: [...]}`, the gate's
findings riding the pure engine's own decision object.

`src/commands/loop.mjs:557-597` calls this engine (`decideLoop({..., gate, lastPhase: "continue",
cycle, ...})` at `:558-568`) and gets `gateDecision` back — then **ignores the findings it computed**:

```js
// src/commands/loop.mjs:569-574
if (gateDecision.act?.act === "halt") {
  ...
  await reportLine(report, state, { cap: resolved.cap, findings: gate.findings });
  return state;
}
if (gate.findings.length > 0) continue;
```

The halt branch prints `gate.findings` (the raw validate result, not `gateDecision.act.findings`) into
a **console report line only** (see below) and returns. The non-halt branch (findings > 0, not yet at
cap) does a bare `continue` — jumping back to the outer `for(;;)` loop's top, which calls
`nextDecision(resolved.scope, resolved.level, resolved.cap, ctx)` (`:416`) with **no `extra`
argument at all** — `nextDecision`'s default `extra = {}` (`:195`), so the fresh `decideLoop` call
carries no `gate`/`findings` key whatsoever. The eventual re-`drivePhase` call (`:497`,
`invokeRegistered('work:drive-continue', {ref}, ctx)`, only `{ref, phase, cycle, declaration,
retryRecord, now}` in scope) never sees the findings the pure engine already computed for it.

**Confirmed: the findings payload never reaches the re-driven session.** The engine
(`work-loop.mjs:274`) already produces the shape a re-drive would need; `commands/loop.mjs` computes
`gateDecision` for the sole purpose of checking `.act === "halt"` and otherwise discards it.

**2 — Even if it were read, the frozen `LoopState.act` shape has no field for it.**
`commands/loop.mjs`'s `actShape(act)` (`:64-71`) whitelists exactly `["ref","phase","stop","producer"]`
(or `["ref","stop","producer"]` for a halt) before anything reaches `loopState()`'s returned/`--json`
document. `findings` is not in that list — even a fix that threaded `gateDecision.act.findings`
through would be stripped before it reached a `--json` caller. `test/arch/acd-loop-probe-contract.test.mjs:13,41`
pins `LoopState`'s exact ten top-level keys (`exactKeys(state, TOP_KEYS, ...)`), none of which is a
findings/feedback field.

**Drive commands — `drivePhase` and `phaseCommand`.**
`drivePhase` (`commands/loop.mjs:297-314`) calls `invokeRegistered('work:drive-${phase}', {ref}, ctx)`
— `{ref}` only. `createPhaseDriverCommand`'s input schema
(`src/commands/drive.mjs:37-45`) is `{ref: string, dryRun?: boolean}`,
**`additionalProperties: false`** — there is no findings/feedback field to pass even if the caller
wanted to. `phaseCommand(phase, ref)` (`drive.mjs:26-28`) is `` `/aof:${phase} ${ref}` `` — literally
the whole directive typed into the session (confirmed: no interpolation point for anything else).

**`continue.md` has no findings channel.** `argument-hint: <item ref> [--solo]`
(`src/bundle/commands/continue.md:3`); *"Parse `$ARGUMENTS` into the item **ref** and an optional
**`--solo`** flag."* (`:19`). Grepping the whole file for finding/feedback/loop language finds only
the **inner** build-to-green loop — *"spawn `aof-developer` to implement code … until every task's
`@executable` scenarios/rows are green and fitness functions pass"* (`:134-135`) — entirely inside one
spawned session's own turn, invisible to aof's shell (this is the PRD's *"Agent loop — present …
uncapped"* line). The prompt's only "re-run" instruction is unrelated to a gate failure: *"stopped:
blocked on `<waitingOn>` … finish what it names, then re-run `aof:continue <ref>`"* (`:210-211`), a
dependency-blocked recovery, not a rubric-feedback one.

**`cap-exhausted` carries no accumulated feedback.** Every `halt("cap-exhausted", ...)` site in the
pure engine (`work-loop.mjs:180,237,267,280`) builds its detail object from `{ref, phase, cycle, cap}`
only — no `findings` key anywhere. `commands/loop.mjs`'s own top-level cap check
(`:454-459`) reports `{cap: resolved.cap, findings: []}` — **a hardcoded empty array**, regardless of
what happened on any prior cycle. The one place `findings` does appear in a cap-exhausted report
(`:571`, the continue-gate's own halt) is the **current cycle's** raw `gate.findings` only, and it
rides the `report` callback — a `console.log` printer (`suppliedCtx.report ?? NO_PRINT`, `:361`; wired
to `console.log` only inside the real launcher body at `:656`) formatted through `reportFacts`
(`:246-250`, `JSON.stringify`'d into a text line) — **never returned, never persisted, never
accumulated across cycles.** There is no code path today that accumulates findings across a
gate-retry's multiple cycles into one record; each cycle's `gate.findings` is discarded the moment the
next cycle's `work:validate` call overwrites the local variable.

---

## Q3 — Is the fitness-function lane in the gate at all

**No.** Grepping `src/commands/loop.mjs` and `src/work-loop.mjs` for `doctor`, `controls`,
`loops-validate` and `fitness` returns **zero matches** in either file. `GATE_ORDER`
(`src/work-loop.mjs:39-43`) is `{act: "drive", phase: "continue"} → {act: "gate", command:
"work:validate"} → {act: "drive", phase: "verify"}` — `work:validate` is the *only* gate command named
anywhere in the loop shell, and `commands/loop.mjs`'s two `invokeRegistered` calls (`:282, :558`) are
both `work:validate`. `work:doctor` (and therefore the controls lane's fitness-function-aware
`control-unresolved`/`verification-missing-red-probe`/`staged-control` findings, per Q1) is never
invoked from `aof work loop`.

54's SPEC says *"validate **and the fitness functions** grade before any review turn is spent"*
(`SPEC.md:50-51`). Measured: only the first half is wired. The fitness-function lane exists, is
CI-pinned (Q1), and is subject-rich (6 of 8 codes carry an `FF-NNNN` id) — but it grades nothing in
the loop today. This is a plain gap between the SPEC's stated scope and the code as shipped, not an
inference.

---

## Q4 — Does anything in aof execute a project's test suite, and what did 66 rule

**Nothing in `src/` spawns a test runner or dynamically imports project test code.** Grepping
`src/**` for `spawn(`/`execFile`/`exec(`/`spawnSync` returns 31 files; every hit that is not a false
positive (`RegExp.prototype.exec`, or `git` plumbing in `src/work-dispatch.mjs:99`) is either the
`claude`/`codex` PTY driver (`src/agent-session-driver.mjs:709,731`, spawning an **agent session**,
never a test command) or `git` worktree operations. Nothing spawns `npm test`/`vitest`/`node --test`/
any project runner anywhere in `src/`.

**`work.controls.runners` (`RUNNERS_CONFIG_KEY`, `src/work-doctor-controls.mjs:93`) never executes
anything.** It is read at the snapshot boundary (`src/work-doctor.mjs:439-450`) as a list of **file
paths whose text is read** (`readFile(...)`, not spawned) — `runnerTexts[relative] = await
readFile(...)`. The controls lane's leg B (`namedByARunner`, `work-doctor-controls.mjs:568-569`)
then does a **substring search** over that text for the cited control's basename. Leg A
(`control-unresolved`) is `stat` (`work-doctor.mjs:426`, `.isFile()`), not an import or a run. The
module header states this as the design, not an accident: *"NOTHING IS EXECUTED: no spawn, and above
all no dynamic `import()` of the cited module, because importing runs its module scope, which is ACD
running a project's test code"* (`work-doctor.mjs:409-411`).

**What 66 ruled, and to whom it applies.** `66/SPEC.md §Out of scope` item 1: *"**Running the
project's tests.** ACD checks that a control exists where something else will run it and that someone
has seen it fail. It never executes the suite. Every story below holds to this."*
(`66/SPEC.md:72-73`). `66/ARCHITECTURE.md`'s ADR-004 §Decision 2 is explicit about scope: *"**ACD
never executes anything.** Leg A is `stat`; leg B is a text read. No spawn, no dynamic `import()` …
`SPEC §Scope` out-of-scope item 1, held structurally rather than by intention."*
(`66/ARCHITECTURE.md:305-306`), and ADR-004's **Invariant** names the exact module: *"`src/
work-doctor-controls.mjs` performs no process spawn, no dynamic `import()`, and no filesystem read
outside the snapshot"* (`:369-370`), enforced by `test/arch/acd-controls-never-execute.test.mjs`
(scoped, at source, to `THE_LANE = "src/work-doctor-controls.mjs"` and `THE_SPINE =
"src/work-doctor.mjs"`, `:44-45`).

**The prohibition is scoped to the deterministic-gate module, not to aof as a whole.** Nothing in 66's
SPEC, ADR-004 or its arch test reaches `aof work loop` or the agent-session driver — aof already
spawns interactive `claude`/`codex` sessions (`agent-session-driver.mjs`) as the acknowledged mechanism
for building/testing code, and 66/ARCHITECTURE never argues otherwise. The rule is: **the deterministic
engine (`validate`/`doctor`/the controls lane) never runs a project's suite itself** — it checks that a
control *exists where something else will run it*. Whether "something else" (a spawned agent turn) runs
the suite is untouched by 66 and is, in fact, what `continue.md`'s inner build-to-green loop already
does today (Q2).

**Consequence, stated plainly.** If nothing deterministic in aof runs the suite, "which scenario
failed, and the observed delta" cannot come from a deterministic aof grader. Candidate producers,
measured:

| Candidate | Exists today? | What it actually carries |
|---|---|---|
| The maker session's own reported outcome | **Yes** — `driveInteractiveClaudeSession` resolves `{outcome: "done"\|"failed"\|"needs-input", sessionId, failureReason?}` (`agent-session-driver.mjs:705-707`) | Coarse three-way outcome. No scenario name, no delta — `failureReason` is one of a small fixed set (`agent_error`, `session_limit`, …), never a rubric detail. |
| Transcript telemetry (`aof work observe`, 68) | **Yes**, but narrow — `classifyToolCallResult` (`src/work-observe.mjs:90-92`) classifies a Bash result as `"test"`/`"other"` via `TOOLCHAIN_RESULT_RE` (`:85`, a count-bearing/TAP-ish pattern) | A binary "did something test-shaped run" signal for grind/rhythm telemetry (`toolchain-wait`, edit↔test rhythm). No scenario name, no pass/fail delta extraction. |
| A configured runner (`work.controls.runners`) | **Exists as config**, never executed (above) | Only answers "does a runner file's text mention this control's basename" — cannot know what ran or what failed. |
| The `.feature` parse (`src/feature-parse.mjs`) | **Yes** — parses scenario names + tags structurally (`parseFeature`, `feature-parse.mjs`) | Static document parse only. Knows scenario *names* exist; has no runtime pass/fail knowledge at all. |
| The `verify` session's own written record | **Yes**, model-authored — `verify.md` step 1 instructs *"Run the `@executable` suite + fitness functions and confirm green"* and step 3 *"Log each defect/gap found … under `## Findings` (id, observed, type, …)"* in `VERIFICATION.md` (`src/bundle/commands/verify.md:80-114`) | The only producer today that actually names a failing scenario and an observed delta — but it is prose, written by a model, post-hoc (after verify runs, not fed back into a re-drive), and it is exactly 54's stated gap: verify's findings "route back to continue" only as a coarse stage today. |

No deterministic aof command produces "which scenario, which fitness function, the delta" as
structured data. The only existing producer of that content is the model's own prose record in
`VERIFICATION.md`, written during `verify`.

---

## Q5 — The `brief` bag, and what 70 and 69 are doing to this exact code

**Two things share the name "brief" in this codebase, and they are not the same object.**

1. **The run-store's persisted bag**, `record.brief` — an opaque field on every run record
   (`buildRecord`, `src/run-store.mjs:524-543`; `normalizeRecord`, `:551-569`; *"the brief is persisted
   OPAQUE/verbatim (never reshaped)"*, `:510-511`). 53/ADR-004 freezes one key on it:
   `brief.loop = {loopRunId, scope, level, cap, phase, cycle, startedAt}`, written by
   `transitionRunStart`'s `edge.brief` (`src/effects/run-transitions.mjs:52,63-64`) and set at
   `commands/loop.mjs:304,474,521` (`brief: {loop: declaration}`). It already carries a **sibling**
   key from a different producer — the mesh worker mints `brief: {assignmentId, itemRef}`
   (`mesh-worker-execution.mjs:1593`) and `{assignmentId, itemRef, resumedFrom}` on resume (`:2108`)
   — so the bag already demonstrably admits more than one namespaced key with no observed
   conflict; `run-start.mjs:219` documents it plainly as *"opaque JSON brief persisted on the run"*.
   **The record shape itself is not static either**: `buildRecord`/`normalizeRecord` grew from the
   15 keys ADR-004 cites to **16** — `spend` was appended last by 68/ADR-001 (`run-store.mjs:519-523`,
   *"The SIXTEENTH key (68/ADR-001) SUPERSEDES the fifteen"*), via the same additive discipline
   ADR-004's own "reject a 16th key" alternative once ruled against for `loopRunId`. So a new
   top-level key is not permanently closed — it has since been done once, earning its own ADR.

2. **The session driver's spawn-time parameter**, also literally named `brief` —
   `driveInteractiveClaudeSession(brief, options)`, `brief = {itemRef, worktreeCwd, task, command}`
   (`src/agent-session-driver.mjs:689-691`), constructed at the call sites
   (`src/commands/drive.mjs:104-109`, `mesh-worker-execution.mjs:1628`). This is a **separate,
   ephemeral** object — it is never persisted as such; the run-store's `brief` is set independently
   (via `transitionRunStart`'s own `brief` argument, item 1 above).

**70 (warm-start) widens object 2, not object 1.** 70/ADR-001 states this explicitly: *"The SPEC
describes the brief as a new thing to build. It is not: the driver's own first parameter is already
named `brief` … A second `brief` bag already rides the run record and carries milestone 53's loop
declaration … So the milestone's headline artefact has **two** existing homes with that exact name."*
(`70/ARCHITECTURE.md:64-76`). 70's decision: *"an additive key on the bag that already exists:
`brief.context`"* (`:79-81`) — on the **driver's spawn parameter** (object 2 above), compiled by a new
pure leaf, `src/phase-brief.mjs` (ADR-002, `:98-118`; confirmed **does not exist on disk** —
`test -f src/phase-brief.mjs` → not found). 54's Q6 candidate home (an accumulated-feedback record)
would more naturally sit on object 1 (the persisted run record), which 70/00 does not touch — but the
naming collision is real and worth the architect knowing before writing anything that says "the brief
bag" without qualifying which one.

**70's story statuses:** all five (`00_story_phase-brief`, `01_story_cache-stable-launch`,
`02_story_cache-economics`, `03_story_architecture-slice`, `04_story_warm-fix-loop`) are
`status: not-started` (each `STORY.md`'s frontmatter). The milestone itself is `status: in-progress`
(`70/SPEC.md:6`). `src/phase-brief.mjs` and `src/loop-bounds.mjs` **both do not exist yet**.

**70/04 (`warm-fix-loop`) is the story most directly adjacent to 54's re-drive problem.** Its task 00:
*"a fix respawn resolves the build run's recorded session id and resumes it, carrying the findings as
its message"* (`70/04/STORY.md:41`) — this is the exact mechanism 54's SPEC gestures at ("re-drives the
maker for a bounded number of cycles" with "structured feedback"), but built via **session resume**
(`--resume <sessionId>` + an appended message to the *same* build session,
`agent-session-driver.mjs:653` / `recordSessionId`, 68/01) rather than a cold `/aof:continue <ref>`
respawn. It owns `commands/loop.mjs` (the resume-target selection) and `commands/drive.mjs` (the
resume path), sequenced behind 70/00. Not started.

**69 (loop-bounds)**: `status: in-progress` (`69/SPEC.md:6`); all six stories `not-started`. 69/00
(`the-declared-cap`) is explicitly slated to touch `src/work-loop.mjs` (0 deps, **12 dependents, 1
production — `commands/loop.mjs`**, matching `aof graph impact` exactly) and land a new
`src/loop-bounds.mjs` (69/ARCHITECTURE.md:25,110,137,383). Neither file has changed
(`git log`/`aof graph impact` both confirm `work-loop.mjs` is at its unmodified 53-era shape; the new
file does not exist). 69's own ARCHITECTURE.md already names a cross-milestone overlap with 70:
*"69/01, 69/02 and milestone 70/01 all touch `src/agent-session-driver.mjs` … 69 and 70 are sibling
children of 68 and may run concurrently"* (`69/ARCHITECTURE.md:402-405`), and explicitly carves prose
loop-bound wording (`continue.md`) out to milestone **71**: *"The prose bound in `continue.md`, the
review-round wording, and findings-become-work-items are **71**'s"* (`:408-409`).

**The overlap, stated plainly, for a 54 story:**

| File | Function/seam | Who else is there | Status |
|---|---|---|---|
| `src/work-loop.mjs` | `decideLoopPhase`'s gate branch (`:260-274`) — exactly where a 54 fix would make the "drive the retry with findings" branch actually reach the caller | 69/00 — `resolveLoopBound`/cap-resolution, a **different function** in the same file | 69/00 not-started |
| `src/commands/loop.mjs` | the continue-gate block (`:557-597`) — where `gateDecision` is currently discarded | no other live story owns this block directly, but it is the file 69/00's cap changes ripple through (1 production dependent = this file) | — |
| `src/commands/drive.mjs` | `phaseCommand`/the `command` const (`:26-28,63`) | 70/00 (same const, per its own note: *"Declared overlap with 70/01. Both edit `src/commands/drive.mjs` — this story the `command` const, 70/01 the `driverOptions` object"*, `70/00/STORY.md:56-57`) | both not-started |
| `src/commands/drive.mjs` | the input schema (`:37-45`, `additionalProperties: false`) — would need widening for a fresh cold-spawn findings channel | shared surface with 70/00's `brief.context` widening, if 54 wants findings to ride the same seam | 70/00 not-started |
| The driver's spawn `brief` object 2 (`agent-session-driver.mjs:689-691`) | `brief.context` (70/00's new key) | 70/00's whole spine; ADR-001 there explicitly forbids "aof mints no rival payload" | 70/00 not-started |
| `src/run-store.mjs` | `buildRecord`/`normalizeRecord` (`:524-569`) — the persisted `brief` bag (object 1) | not touched by 69 or 70; 68/ADR-001 already extended it once (`spend`, 16th key) | — |

A 54 story that wants structured findings to ride an ACTUAL re-drive (cold or warm) is landing on
`src/work-loop.mjs`, `src/commands/loop.mjs` and — if it wants a fresh (non-resumed) drive to carry
findings — `src/commands/drive.mjs`'s directive-construction and input schema, all three of which are
also where 69/00 and 70/00 are about to land. None of the three overlaps are in the SAME function yet
measured (69/00's cap logic and a hypothetical 54 gate-branch fix are different functions in
`work-loop.mjs`; 70/00's `command` const and drive.mjs's `command` const are already a *declared*
overlap between 70/00 and 70/01 before 54 is even in the picture) — but three stories from three
different milestones converging on `commands/drive.mjs`'s directive construction inside one release
window is exactly the shape 66/ARCHITECTURE and 69/ARCHITECTURE both flag by name as merge friction
worth declaring rather than discovering.

---

## Q6 — Where an accumulated feedback record would live, and what 78 already claims

**78's SPEC, read directly (`78/SPEC.md`).** Status `not-started`, `depends: [52, 53, 79]`. Its
objective: *"aof declares its loops and renders them. It cannot show you the ones that **ran**."*
It reads the same join 53 supplies: *"Milestone 53 supplies the missing join. Its loop declaration is
the seven-key envelope `{loopRunId, scope, level, cap, phase, cycle, startedAt}` riding the `brief`
bag of every run the loop mints"* (`78/SPEC.md`, quoting `53/01/tasks/05…feature:8-11,31-33`), and its
own out-of-scope is explicit: *"**Instrumenting the loops.** The join key is `brief.loop` and it
belongs to **53**. This milestone reads it; if 53 has not populated it, this milestone renders the
absence honestly."* 78 ships a **new per-item markdown document**, written by a registered command,
committed with the work, carrying the executed graph + cycles/attempts/outcome against the
declaration + a frozen, checkable human sign-off section — explicitly contrasted with a generated,
ignorable report (*"aof's own evidence says a generated report nobody is obliged to read changes
nothing … only 2 of ~20 items have one"*). 54's own SPEC is internally consistent with this: its
out-of-scope names 78 by number and the same phrase 78 uses back — *"reads `brief.loop` from 53
rather than anything this milestone produces"* (`54/SPEC.md:61-64`).

**Candidate homes that already exist, and what a new writer would cost:**

| Candidate | Exists today? | What already writes there | Cost of a new writer |
|---|---|---|---|
| Run record's `brief` bag (object 1, Q5) | Yes, frozen envelope at `brief.loop` (ADR-004) | `transitionRunStart`'s `edge.brief` (one write per mint/retry, i.e. per **cycle**, not accumulating across cycles) | A sibling key (e.g. `brief.grader`) is mechanically cheap (precedent: `brief.assignmentId` coexists with `brief.loop` today) but is **per-run**, not per-loop — an "accumulated across cycles" record would have to be a query that unions several run records' `brief` values, exactly the shape ADR-004 already argues for aggregate loop history ("a one-key filter over runs rather than a document"). |
| The run store itself, a new top-level key | Grew once already: `spend`, 16th key (68/ADR-001, `run-store.mjs:519-523`) | `buildRecord`/`normalizeRecord` | Precedented but not free — needs its own ADR, its own additive-supersession justification, and both pinning tests (`test/run-store-state-machine.test.mjs`'s closed-table assertion, `test/arch/acd-run-retry-classification.test.mjs`) stay loop-blind per 53/ADR-004, so a new top-level key must not touch either. |
| The `LoopState` `--json` document (53/ADR-005 §3) | Yes, but it is a **computed probe output**, not a persisted store — recomputed fresh on every `aof work loop … --json` call | `commands/loop.mjs`'s `loopState()` (`:81-94`) | `test/arch/acd-loop-probe-contract.test.mjs:13,41` asserts `Object.keys(state)` **deep-equals** the ten frozen `TOP_KEYS` exactly (`["scope","level","cap","loopRunId","state","next","act","stops","resumable","driven"]`). Adding an eleventh key (e.g. `accumulatedFeedback`) fails this assertion outright — this is a genuine, CI-enforced **contract widening**, not a free addition; it needs an ADR the way 53/ADR-005 itself was one. |
| `VERIFICATION.md` | Yes — the `verify` session already writes `## Findings` here (Q4) | The model, during `aof:verify`, post-hoc | 54's own SPEC explicitly declines this shape: *"This milestone's 'record' is the grader's accumulated feedback, not a document"* (`54/SPEC.md:62-63`) — ruled out as 54's target by 54's own scope, even though it is the closest existing analogous artefact and is exactly what 78 is chartered to build a **structured, committed, signed** replacement for. |

**Does the frozen LoopState admit a new key without an ADR?** No — measured directly.
`test/arch/acd-loop-probe-contract.test.mjs:13` freezes `TOP_KEYS` as an exact ten-member array and
`:41`'s `exactKeys(state, TOP_KEYS, "LoopState")` asserts `Object.keys(state)` deep-equals it
(order included). Independently, `commands/loop.mjs`'s `actShape()` (`:64-71`) already strips
anything outside `["ref","phase","stop","producer"]` from `state.act` before it is returned at all —
so even a narrower widening (adding `findings` to `act` alone, rather than a new top-level key) is
blocked by the same enforced whitelist. Any accumulated-feedback field on the probed/returned
`LoopState` is therefore an ADR-level act, exactly as 53/ADR-005 framed its own frozen contract:
*"frozen 2026-08-15 — 54, 62 and 63 consume this, so it is a contract, not a render."*
(`53/ARCHITECTURE.md`, ADR-005 §3 preamble).

---

## Unknowns

- **Whether "the accumulated feedback as the record" (54/SPEC.md:34-36) means a per-cycle value or a
  cross-cycle union is not settled by any code or ADR measured here.** Q2 shows each cycle's
  `gate.findings` is discarded before the next cycle overwrites it; nothing in 53 or 54's own SPEC
  states whether "accumulated" means "the last gate's findings" or "every cycle's findings, unioned."
  Both readings are mechanically available; this is a design decision, not a research finding.
- **Whether 54's grader-loop feedback should ride 70/04's session-resume mechanism or a cold
  `/aof:continue <ref>` respawn is not decided anywhere I can find.** 70/04's task 00 ("carrying the
  findings as its message") is the only existing plumbing that could carry structured findings into a
  re-drive at all, but 70/04 is scoped to loop-performance's warm-start economics, not to 54's rubric
  shape, and neither SPEC cross-references the other's mechanism explicitly.
- **Whether `work:doctor`'s controls lane should be added to `GATE_ORDER` at all, or whether 54 is
  meant to extend `validateWork` itself, is left open by the code.** Q3 only establishes that the
  fitness-function lane is unwired today; which of the two existing engines (or a third) becomes the
  fitness-function half of "validate and the fitness functions grade" is an architectural choice, not
  something the codebase already implies.
- **Live behaviour of a real gate-retry cycle under `aof work loop` was not exercised here** — this
  research is a read of the source and the arch-test contracts, not a run of the loop against a live
  fixture; whether the discarded-findings defect in Q2 is also visible in `aof work loop`'s human
  console output (as opposed to its `--json` contract) in a real terminal was not separately verified
  by execution.
