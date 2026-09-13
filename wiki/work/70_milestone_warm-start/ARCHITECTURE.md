---
doc: architecture
---
<!--
  Milestone ARCHITECTURE.md — the structural record. Answers ONE question: what was decided,
  and what must stay true? Owner: architect. ADRs + the fitness register.
  Behavioural acceptance lives in task .feature files, never here.
-->
# 70 · Warm start — Architecture

> **Measured on this tree at refine (2026-08-21).** Every number below was taken here, not
> inherited from the SPEC. Where a measurement CONTRADICTS the SPEC, the measurement wins and the
> contradiction is named — see ADR-006 and § Corrections to the SPEC's premises.

## Grounding — the coupling this partition follows

`aof graph build .` (code-only, `egress: none`, `builtAt: 2026-08-21T15:29:49.129Z`,
11,705 nodes / 28,231 edges; `unchanged: true` — already current). Then `aof graph impact` on every
candidate boundary. Dependents are counted whole; the `src/`-only count is what a boundary can
actually collide with.

| Module | deps | dependents (src-only) | Read |
|---|---|---|---|
| `src/agent-session-driver.mjs` | 7 | 18 (**2**: `commands/drive.mjs`, `mesh-worker-execution.mjs`) | **The spawn seam.** Exactly two production callers. |
| `src/otel-attribution.mjs` | 0 | 2 (**1**) | 68's pure-leaf precedent — the shape this milestone copies. |
| `src/commands/drive.mjs` | 5 | 3 (**1**: `command-core.mjs`) | The local phase caller. Small; two stories touch distinct statements in one `run()`. |
| `src/mesh-worker-execution.mjs` | 22 | 51 (**3**) | The mesh caller. Big — edited at its launch seam ONLY (68's rule, kept). |
| `src/run-store.mjs` | 4 | 45 (**17**) | The god-node. This milestone **reads** it and writes nothing. |
| `src/work-observe.mjs` | **0** | 11 (**3**) | Self-contained leaf — safely partitionable by region (68 proved this). |
| `src/work-doctor-budget.mjs` | **0** | 5 (**1**: `work-doctor.mjs`) | Self-contained leaf. The budget half of 70/03. |
| `src/work-artifacts.mjs` | 0 | 26 (**5**) | The artifact manifest — the constraint that kills the "split" (ADR-006). |
| `src/declared-id.mjs` | 0 | 8 (**3**, incl. `memory/local-indexing.mjs`) | The register's frozen file set — same constraint. |
| `src/work-bundle.mjs` | 4 | 34 (**7**) | m30's render-time role model. A **different** surface from the spawn (ADR-005). |
| `src/commands/loop.mjs` | 9 | 12 (**1**) | The loop shell. 70/04's home. |

Three facts drew the partition. The spawn seam has **two** callers, so a change there is cheap and
auditable. `run-store.mjs` has **seventeen** `src/` dependents, so this milestone touches it not at
all. And the two leaves with **zero** dependencies (`work-observe.mjs`, `work-doctor-budget.mjs`)
are where the measuring and the budgeting go, because a leaf can be cut without cutting anything
away from what imports it.

---

## Corrections to the SPEC's premises

Refine is the last honest place to check a SPEC's factual claims. Two did not survive.

1. **"Story frontmatter already declares which ADRs a story needs."** — **False on this tree.**
   Across **201** `STORY.md` files the frontmatter key set is exactly
   `{type, number, slug, title, parent, status, owner, created, updated, schema, aofVersion}` plus
   `depends` (32 files) and `origin` (1). **Zero** carry `adrs:`, and no `adr`-shaped key exists
   anywhere under `wiki/work/`. The declaration must be **introduced** (ADR-006), not consumed.

2. **"`ARCHITECTURE.md` split per ADR."** — **Refused as written** (ADR-006). The file is a pinned
   member of four separate reader surfaces; splitting it into siblings breaks all four for a gain
   the brief already delivers.

A third claim was checked and **held**: the cache flag is real, and it is admissible here. See
ADR-004 — it was verified against the installed binary rather than the documentation, because
STATE explicitly asked refine to.

---

## ADR-001 — The phase brief is the EXISTING `brief` bag, widened; aof mints no rival payload

**Status.** Accepted.

**Context.** The SPEC describes the brief as a new thing to build. It is not: the driver's own first
parameter **is already named `brief`** — `driveInteractiveClaudeSession(brief, options)`, where
`brief` carries `{ itemRef, worktreeCwd, task, command }` (`src/agent-session-driver.mjs:691`,
constructed at `src/mesh-worker-execution.mjs:1628`). A second `brief` bag already rides the run
record and carries milestone 53's loop declaration — `brief.loop.{loopRunId, scope, level, cap,
phase, cycle, startedAt}`, read in production at `src/commands/loop.mjs:396`.

So the milestone's headline artefact has **two** existing homes with that exact name. Introducing a
third concept — a "context payload", a "spawn digest" — would put three names on one idea and make
every future reader guess which is authoritative.

**Decision.** The phase brief is an **additive key on the bag that already exists**: `brief.context`,
compiled by the pure module of ADR-002 and handed to the driver by value. The four existing keys are
untouched and absence stays benign — a caller that supplies no `brief.context` gets exactly today's
behaviour.

**Consequences.** `every run record on disk reads "brief": {}` (the SPEC's finding) becomes a
*populated* bag through the same key path 53 already established, so 68's telemetry reads it with no
new join. The driver's export contract is untouched — which ADR-002 shows is not optional.

**Alternatives considered.**

- *A new `PhaseBrief` parameter beside `brief`* — rejected. Two payloads, one spawn; the second is
  the one readers would reach for, and `brief` would rot into a legacy bag.
- *Replace the four keys with a compiled brief* — rejected. `command`, `worktreeCwd` and `itemRef`
  are consumed by the PTY plumbing, not by the model; conflating transport with context is what
  makes a payload unbounded.

---

## ADR-002 — The compiler is a PURE LEAF (`src/phase-brief.mjs`); the seam only passes it

**Status.** Accepted.

**Context.** The obvious home for a brief compiler is the driver that sends it. That home is
**closed, and closed by an enforced control**: `test/arch/session/acd-session-driver-single-home.test.mjs`
(m53's FF-5302) asserts the driver's export set is **exactly the frozen seventeen**, by name. A
compiler exported from `agent-session-driver.mjs` fails that test on the first commit.

There is also a precedent built exactly one milestone ago, for exactly this problem. 68/ADR-005 §2
needed spawn-time OTel attributes; it put the **pure builder** in `src/otel-attribution.mjs`
(0 dependencies, 1 dependent) and had the driver merely *set* what the builder returned —
`import { buildOtelResourceAttributes } from "./otel-attribution.mjs"` at
`src/agent-session-driver.mjs:628`, "imported here, not re-exported — this module's own export
contract is frozen".

**Decision.** `src/phase-brief.mjs` — a new module that imports **nothing from `src/`**, performs no
filesystem read, reads no wall-clock, and exports a pure `compilePhaseBrief(inputs) -> brief.context`
plus its validator. The two callers read the item's documents (they already do) and hand the *text*
in; the seam sets the result on the bag. Same shape as `otel-attribution.mjs`, same reason.

**Consequences.** The compiler is unit-testable with no PTY, no worktree and no `claude` binary —
which is what makes ADR-003's bound testable at all. The driver's frozen seventeen stay seventeen.

**Alternatives considered.**

- *Compile inside `work-content-read.mjs`* — rejected: it has 17 dependents and reads the
  filesystem; purity would be lost and the blast radius is 17× the leaf's.
- *Compile in each caller* — rejected: two implementations of one bound is the failure mode ADR-003
  exists to prevent.

---

## ADR-003 — The bound is ENFORCED IN THE COMPILER, and an over-budget brief truncates loudly

**Status.** Accepted. **Amended by ADR-009 (2026-08-22)** — the ceiling and the write-path
enforcement stand unchanged; the *drop-whole* packing policy does not.

**Context.** A brief with a documented size target and no enforcement is a brief that grows. The
milestone exists because exactly that happened to the context as a whole: 927,588 cache-creation
tokens per spawn, a 316:1 context-in-to-output ratio, one run at 9.43 M cache-create tokens.

The size target is not arbitrary. Anthropic's sub-agent guidance puts a condensed hand-back at
**1,000–2,000 tokens**. SWE-agent's ablations resolve **18.0%** with a 100-line window against
**12.7%** showing the full file, and **18.0%** keeping the last 5 observations against **15.0%** on
full history. Chroma's context-rot study finds ~300 focused tokens beating ~113k of full history,
with Claude models showing the largest gap. Less is not a cost compromise here; it is the better
result.

**Decision.** The ceiling lives **in the write path** — `compilePhaseBrief` refuses to return an
over-ceiling brief. It is not a lint, not a caller's responsibility, and not a comment. This is
68/ADR-003's ruling (the writer refuses a lie) applied to the payload rather than the record.

When the assembled sections exceed the ceiling, the compiler **truncates by declared section
priority and states in the brief itself that it did so, naming what was dropped**. It never
silently ships the overflow, and it never returns an empty brief — a phase handed nothing is
strictly worse than a phase handed a truncated something, and a phase that cannot tell it was
truncated will confidently act on a partial contract.

**Consequences.** The ceiling is one number in one module, so 70/03 can add a section without
renegotiating the bound. `budget` here means characters at a declared chars-per-token ratio —
the compiler counts what it can count exactly, and the ratio is stated where it is applied.

**Alternatives considered.**

- *Warn and ship* — rejected. That is precisely the `architecture: 700` warn ADR-007 is cleaning up
  after: a budget nothing enforces is a budget that has already been exceeded 15 times.
- *Hard-fail the spawn on overflow* — rejected. A phase that refuses to start because its brief is
  40 characters long is a worse outcome than a phase that starts with a named truncation.

---

## ADR-004 — The cache flag is admissible ONLY because aof APPENDS its system prompt

**Status.** Accepted. *(Resolves STATE’s standing ask that refine verify the flag empirically.)*

**Context.** STATE declined to let the design assume the flag works. Verified here against the
**installed binary**, `claude 2.1.233`, not against documentation. Its help moves the per-machine
sections (cwd, env info, memory paths, git status) into the first user message to improve cross-user
cache reuse — and ends with the whole finding: *"Only applies with the default system prompt
(ignored with `--system-prompt`)."* **The flag is silently inert under `--system-prompt`.** So the
question is not "does the flag exist" but "does aof qualify". It does, and by construction: the spawn
seam builds `["--permission-mode", "auto", "--append-system-prompt", WORKER_SESSION_INSTRUCTION]`
(`src/agent-session-driver.mjs:646`), and a search of `src/**` finds **`--system-prompt` used
nowhere at all**. aof appends; it has never replaced.

This also resolves the tension STATE named as genuine rather than a bug — worktree-per-story is
load-bearing (a partition's independence claim is not reliable; two "independent" stories both
edited one file, ×9 and ×8), and the flag is what lets aof keep the isolation *and* share the
prefix, because cwd is exactly one of the per-machine sections it relocates.

**Decision.** `--exclude-dynamic-system-prompt-sections` is passed at the single spawn seam. And the
condition it depends on becomes **structural**: aof never replaces the system prompt. A future
migration from `--append-system-prompt` to `--system-prompt` would turn this milestone's headline
lever into a no-op **with no error, no warning, and no change in observable behaviour** — the single
most expensive silent regression this tree can sustain. FF-7004 makes it loud.

**Consequences.** cwd, env info, memory paths and git status still reach the model in the first user
message, where the docs note they carry marginally less weight. That is the stated trade, accepted.

### Amendment (2026-08-24, `m70/F-21`) — the directive crosses as a BRACKETED PASTE plus a SEPARATE Enter

ADR-013 invariant 2 (m38/05 task 01) requires the directive to reach the PTY as **one atomic input**,
never as argv. Its 2026-07 spelling of atomic — a single `` `${command}\r` `` write — stopped being
atomic when 70/00 made the directive multi-line: on `claude 2.1.241` a 43-line directive written raw
arrives as **eight user turns**, and with `\r` inside a paste body it is never submitted at all.
**Decision:** the body is wrapped in bracketed paste (`ESC[200~`…`ESC[201~`) and the Enter is a
separate write, after a settle **derived** from the caller's readiness delay rather than a second knob.
Invariant 2 is **unchanged and still binds**; only the bytes achieving atomicity moved, and m38's
`.feature` stays exactly as delivered — this amendment is where the superseding spelling lives, per
*new rules go in the accepting item's contract*. `m70/F-21` records the measurement, the 38 doubles it
invalidated and their single-home fix; `m70/F-28` carries the framing being **unconditional across
providers while only `claude` is measured to enable paste mode**.

---

## ADR-005 — Model, effort and cache TTL are CHOSEN at the spawn — and the ROLE model is a different surface

**Status.** Accepted.

**Context.** The cache key includes **model and effort level**. aof passes neither, so its cache key
is whatever the session happened to default to — the SPEC's "no flags at all"
(`src/agent-session-driver.mjs:634`). Verified present on `claude 2.1.233`: `--model <model>`,
`--effort <level>`.

The SPEC bullet is titled "per-role model and effort routing", and there is a trap in that phrasing.
**Two distinct surfaces both legitimately called "the model" already exist:**

- **The role model** — milestone 30 (`done`) ships `work.agents.models`, a `role -> model` map
  merged onto the bundle resource before render so the rendered agent's `model:` frontmatter line
  carries the override (`src/work-bundle.mjs:238-272`). This governs **Task subagents inside a
  session**. It is shipped, it works, and this milestone does not touch it.
- **The session model** — the `--model` / `--effort` argv of the `claude` process aof itself spawns.
  This governs **the phase session**. It does not exist, and it is what "no model reaches the spawn"
  actually means.

**Decision.** This milestone owns the **session** surface only: `--model` and `--effort` resolved
per phase and passed explicitly at the spawn seam, so the cache key is chosen rather than inherited.
The two surfaces resolve from **distinct config paths** and neither reads the other's — FF-7006.

**Scope — per-phase routing binds the PHASE-SCOPED caller only.** Per-phase session model/effort
resolves wherever a **phase** is in scope. There are two production callers of the spawn seam
(`resolveInteractiveDriverLaunch`):

- the **local drive command** (`src/commands/drive.mjs`) — phase-scoped by construction (one of
  `refine`/`continue`/`verify` is a parameter of `createPhaseDriverCommand`), so it resolves
  `session: resolveSessionLaunch(config, phase)` and the spawn carries `--model`/`--effort`;
- the **mesh worker dispatch** (`src/mesh-worker-execution.mjs`) — **assignment-scoped and
  phase-less by its own source**: its brief is `{ itemRef, worktreeCwd, task, command }` and carries
  no `phase` (its own source notes this at the spawn seam). Per-phase routing does **not** map onto
  it, so it passes no `session` and its spawn carries no `--model`/`--effort`.

This is an **intended, explicit boundary**, not a silent under-delivery: the two callers differ in
kind — one routes by phase, the other by assignment — and there is no phase value on the mesh
assignment path to route against. The mesh launch still receives the shareable-prefix flag (ADR-004)
and the held 1-hour cache TTL (below), which are unconditional at the seam; only the per-phase
`--model`/`--effort` are phase-scoped. A future that gives the mesh assignment a phase (e.g. 70/00's
loop declaration riding the directive) can extend the routing to it without changing this boundary.

The **1-hour TTL is held deliberately**: the spawn env sets `ENABLE_PROMPT_CACHING_1H=1` at the same
seam, and for the same reason, as 68/01's `OTEL_*` keys — after the IDE-attachment scrub, so the
scrub can never delete it. The docs are explicit that the 1-hour TTL is automatic on a subscription
but **drops to 5 minutes on usage credits** unless that variable is set; a lever that silently
halves its own window depending on how the account is billed is a lever held by accident.

**Consequences.** 68's `spend.model` and `spend.effort` currently read from the transcript and fall
back to the literal `"unknown"` (`src/run-spend-ingest.mjs:223-224`). Once the spawn chooses them,
those fields record a **decision** rather than an observation — and a mismatch between what was
passed and what the transcript reports becomes a detectable fault instead of an invisible one.

**Alternatives considered.**

- *Extend `work.agents.models` to cover the session too* — rejected. One map answering two questions
  ("which model renders into this agent's frontmatter" and "which model launches this phase") is
  exactly the authority split 48/ADR-003 rules against. Two facts, two homes, no join.
- *Add `effort` to the rendered agent frontmatter as well* — **deferred, not refused.** Whether
  Claude Code's agent frontmatter accepts an effort key is unverified on this tree, and refine does
  not invent a schema it has not seen. Recorded as open in STATE.

---

## ADR-006 — `ARCHITECTURE.md` is NOT split into sibling files; the story reads its slice through the brief

**Status.** Accepted. *(Refuses the SPEC's scope bullet as written, and delivers its stated intent.)*

**Context.** The SPEC asks for "`ARCHITECTURE.md` split per ADR", so "a story should read its slice".
The intent is right and the mechanism is not available. `ARCHITECTURE.md` is a **pinned member of
four independent reader surfaces**, measured here:

1. **The artifact manifest** — `WORK_ITEM_ARTIFACTS` in `src/work-artifacts.mjs` (5 `src/`
   dependents: `artifact-sync`, `board-worker-stream`, `commands/doc`, `global-work-store`,
   `work-content-read`) enumerates one `ARCHITECTURE.md` entry and derives `WORK_ITEM_DOC_FILES`
   from it. Sibling files are invisible to streaming, hashing and sync.
2. **The register's frozen file set** — `REGISTER_BLOCKS` in `src/declared-id.mjs` pins
   `{ file: "ARCHITECTURE.md", heading: "fitness functions", kind: "declaring" }`. **The fitness
   register itself lives in this file.** Split it and the ids in this very document stop resolving.
3. **The controls checker** — `src/work-doctor-controls.mjs` reads `texts["ARCHITECTURE.md"]` to
   pair each declaration against its `VERIFICATION.md` red probe.
4. **Memory** — `src/memory/local-indexing.mjs` parses one `adr` record per `## ADR-NNN` block out
   of `ARCHITECTURE_FILE`. This is what answered the architect's own recall at the top of this
   refine. A split silently drops the ADR corpus to zero.

Splitting is a four-surface rewrite of frozen sets, to move text between files. And it is a
**sibling** where a single home already exists — the pattern this project has been bitten by
repeatedly.

**Decision.** The file stays **one artifact**. The SPEC's actual intent — *a story reads its slice* —
is delivered by the brief, which is the mechanism that exists for exactly this: handing a phase the
part it needs instead of the tree.

Two things land to make that possible, and both are additive:

- **`adrs:` becomes a story frontmatter key** — a list of ADR ids this story is bound by. It does
  not exist today on any of 201 stories (§ Corrections); it is introduced exactly as `depends:` was,
  as an optional key whose absence is benign. Absent ⇒ the story is bound by its milestone's ADRs as
  now, and the brief carries the register only.
- **An ADR block is addressable** — a pure extractor returning the `## ADR-NNN` block for a
  requested id, following the parse `local-indexing.mjs` already proves works against these
  documents. The brief carries the declared slices; the compiler's ceiling (ADR-003) governs the
  result.

**Consequences.** The 3,975-line `ARCHITECTURE.md` (m53) is still 3,975 lines — it is simply no
longer *read whole* by a phase that needs two ADRs from it. The bloat itself is ADR-007's problem,
and it is the right one to solve by writing less rather than by filing more.

**Alternatives considered.**

- *Split, and extend all four surfaces* — rejected. Four frozen sets amended, `memory`'s ADR corpus
  put at risk, and `declared-id.mjs`'s own comment records that its file set was chosen from
  measured evidence rather than assumed. The gain over slicing is zero.
- *Leave the SPEC bullet undelivered* — rejected. "A story reads its slice" is a real outcome and it
  ships here; only the file-level mechanism is refused.

---

## ADR-007 — The architecture budget binds AT ACCEPT, on the item being accepted — never retroactively

**Status.** Accepted.

**Context.** `DEFAULT_BUDGETS = { spec: 300, architecture: 700, story: 150, feature: 300 }`
(`src/work-doctor.mjs:590`), and `doc-over-budget` fires at **`warn`**
(`src/work-doctor-budget.mjs`). The SPEC asks that the budget bind. Measured across the stream:
**15 milestones exceed 700 lines**, the worst at **3,975** (m53), then 2,922 (m43), 2,552 (m49),
2,232 (m47), 2,103 (m38), 2,016 (m52).

Making the sweep fail turns 15 `done` milestones red at once. That is the inherited-red pathology
chore 64 exists to clean up, and its own record names the cost precisely: a genuinely new red hides
in a suite already expected to be red — which is how three of seven survived a whole milestone
unnoticed. The mechanism that would normally absorb this is milestone 55's **frozen set**; 55 is
`not-started` and no frozen-set machinery exists in `src/**` today. A design that leans on it would
be leaning on nothing.

**Decision.** The budget **binds at the accepting item's own gate**: an item being accepted must be
within its own artifact budgets. The stream-wide sweep stays `warn`.

This is 68's `pending` posture applied to bloat rather than to controls — *admitted while open,
refused at accept* — and it uses the same reporting surface (`aof work doctor <ref>` scoped to one
item) rather than inventing a second one. Items already `done` are never re-accepted, so nothing is
re-litigated and no baseline file is needed.

**Consequences.** This document is subject to its own rule and is written to it. Every milestone
opened from here carries a 700-line ceiling that is real at exactly the moment it can still be acted
on. The 15 existing exceedances remain visible as `warn` — a standing, honest backlog rather than a
wall of red, and reducible by whoever owns those milestones next.

---

## ADR-008 — Warm the FIX loop only; the reviewer stays cold, and 70 introduces no bound

**Status.** Accepted.

**Context.** `--resume` is verified present on the binary, and the driver **already accepts a resume
target** — `options.resumeSessionId` appends `["--resume", id]` (`src/agent-session-driver.mjs:653`),
built for m42's terminal re-attach. Separately, 68/01 made the session id a **persisted fact** on the
run record (`recordSessionId`, imported at `src/commands/drive.mjs:10`). The capability and the join
key both already exist; nothing has ever connected them.

The temptation is to resume everything. The evidence says one specific thing not to resume: Cognition,
after publicly reversing their anti-multi-agent position, report that code review "works best when the
coding and review agents do not share any context beforehand". SPEC and STATE both record this as
out-of-scope, STATE explicitly "because it is the obvious-looking move and the evidence says it is
wrong".

**Decision.** A **fix** respawn resumes the build session that produced the code. A **review** phase
never does. The two are distinguished by phase, structurally, not by a caller's discretion — FF-7007.

**And the line 70 does not cross** (68/ADR-008's posture, kept):

- **No cap, no round limit, no timeout, no budget, no kill.** Milestone 69 owns bounds. Note that
  the in-process caps are not merely declined here — they are **unavailable on this path**:
  `--max-turns` does not appear in `claude --help` at all, and `--max-budget-usd` reads *"only works
  with `--print`"*, which `test/arch/acd-worker-driver-no-headless-print.test.mjs` forbids on the
  worker launch. Measured on `claude 2.1.233`; see 69/ADR-004, which makes out-of-process
  enforcement 69's design rather than its fallback.
- **No lane parallelism and no review-lane changes.** Milestone 71's.
- **No change to what a phase decides** — only to what it is handed and how it is launched.
- **No write to `src/run-store.mjs`** (17 `src/` dependents). This milestone reads the record 68
  made true and adds no key to it.

**Consequences.** A reviewer can refuse any story in this milestone that changes what the loop
*does*, on this ADR alone.

---

## ADR-009 — A section is CONDENSED to fit, never dropped for size alone; the ceiling stands

**Status.** Accepted. Amends ADR-003. Raised at the refine of 70/05, against F-11.
**Amended by ADR-010 (2026-08-23)** — §1's ceiling and §4–§7 stand unchanged; §2's bounded set and
§3's packing share are settled there.

**Context.** ADR-003 is enforced and correct, and the briefs it produces are nearly empty. Compiled
through the real reader (`compileBriefForItem`) over this milestone's own seven stories, `refine`
retained `[item, story]` for **every story without exception** and `verify` retained `item` alone at
**247 chars** — `objective`, `tasks`, `fitness` and `dependencies` dropped throughout (the full
before-and-after is `m70/F-11`). Briefs land at 3,122–4,047 chars against an 8,000-char ceiling. **The defect is not a shortage of
budget — it is a policy that cannot spend it.** Less than half the ceiling is used while the
acceptance criteria and the architecture are dropped entirely. The two stories that *do* retain
their contract (70/05, 70/06) do so only because they have no tasks yet and the placeholder is
tiny — the packing works precisely when there is nothing to pack.

Three causes, all in the write path:

1. **Sections that cannot fit whole.** `assemble` retains or drops a section entire. Task contract
   sets measure **7,115 / 7,780 / 11,428 / 12,310 / 12,846** chars — all but one exceed the whole
   ceiling alone, so the acceptance criteria can never appear at any ceiling this milestone would
   accept.
2. **Packing stops at the first miss.** `lowerPriorityDropped` turns one miss into a prefix cut:
   every subsequent section drops regardless of its own size. 70/03's 5,306-char ADR slice is
   evicted with ~4,400 chars unused.
3. **The sections are WHOLE DOCUMENTS, not extracts** — the largest cause, and the one F-11 did not
   record. `compileBriefForItem` passes `objective: spec`, the entire `SPEC.md` (**9,514** chars),
   and `story`, the entire `STORY.md` including frontmatter and scaffold HTML comments. A 9,514-char
   section at priority 3 can never fit, and cause 2 then drops `tasks`, `fitness` and `dependencies`
   behind it. **That is why every `refine` brief in the stream retains `[item, story]` and nothing
   else** — one un-addressed document poisons the four sections below it.

**Decision.**

**§1 — The ceiling stands, at 2,000 tokens / 8,000 chars.** ADR-003's evidence base is untouched by
this measurement and is confirmed by it: the briefs are *under* budget, not over. Anthropic's
1,000–2,000-token hand-back guidance, SWE-agent's 18.0%-at-a-100-line-window against 12.7% on the
full file, and Chroma's context-rot result all still hold. Raising the ceiling would admit a
12,846-char Gherkin dump into a milestone whose entire thesis is that a 927,588-token spawn should
be answered with a 2,000-token brief. **Rejected as self-defeating, not merely as costly.**

**§2 — ADDRESSING and CONDENSING are two different operations.** Conflating them is what made the
first draft of this ADR wrong, so they are separated by name:

- **Addressing** is *unconditional* and belongs to the reader (§4). A document is never handed over
  whole; what is handed over is the block the section means. It happens at every size, is never
  announced, and a section that is merely addressed is **not** "condensed".
- **Condensing** is *budget-triggered* and belongs to the compiler (§5). It reduces an already
  addressed section further when the budget cannot hold it, and it is always announced (§6).

The addressing rules, measured over the whole work stream (219 `STORY.md`, 64 `SPEC.md`):

| section | addressed to | measured on the real stream |
|---|---|---|
| `objective` | the SPEC's `## Objective` block | 9,514 → **2,638**; present in **all 64** specs |
| `story` | `## User story` + `## Notes`, matched **case-insensitively** | 3 real stories write `## User Story` |
| `architecture` | the declared ADR blocks, else the register | unchanged from 70/03 |
| `tasks` | the story's `.feature` set | unchanged |
| `dependencies` | the `depends:` frontmatter edge, **CRLF-tolerant** | see §7 |

The declared condensers, and the sections that declare **non-condensable** explicitly — because an
absent entry is exactly what let drop-whole hide in the first place:

| section | condenser | measured on the real stream |
|---|---|---|
| `tasks` | `Feature:` / `Rule:` / `Scenario:` / `Scenario Outline:` headlines and tag lines, **bounded** (below) | **13%** — 12,310 → 1,555, 11,428 → 1,529 |
| `architecture` | each declared ADR's heading + its `**Decision.**` paragraph | all 9 ADRs here yield one; 407–4,800 |
| `fitness` | each register row's **id and invariant**, not the row whole | stripping the comment alone is a near **no-op** outside this milestone — m43 5,210→5,209, m49 19,016→19,015 |
| `story` | the `## User story` block alone, dropping `## Notes` | 3,108 → 715 |
| `objective` | none — addressing is its whole reduction | non-condensable **beyond** addressing |
| `item` | **non-condensable**, and never sacrificed — ADR-003's never-empty guarantee governs it | ~50 |
| `dependencies` | **non-condensable**; already an edge list | one line |

**A condenser may itself be BOUNDED, and a bounded condenser states its own count.** Measured over
all 211 stories that have contracts, the headline condenser carries the contract for 191 and still
overflows for **13** — `53/05` at 130,884 → 10,699, `43/04` at 121,787 → ~11.3k, `52/00` at
106,782 → 10,599. There is no single-stage headline condenser that fits these at 8,000 chars, and
pretending otherwise is how a contract comes to lie. A bounded condenser therefore carries as many
scenarios as the budget holds and **states how many it left out and where they are read** — never a
silent prefix. Counting what was omitted is what keeps it honest at any size.

A phase's acceptance criteria as a scenario-title index *is* the contract in the sense that matters
to a brief: it states what must be satisfied and is addressable. Embedding 12 KB of Gherkin steps
would buy the phase detail it can read at need and cost it the architecture it cannot.

**§3 — A section leaves the brief by one of TWO dispositions, and they are not the same thing.**
`lowerPriorityDropped` is deleted, and in its place:

- **SACRIFICED** — a section that *could* have been carried, given up to make room. Sacrifice is
  strictly **bottom-up**: the lowest-priority retained section goes first, then the next-lowest,
  until the brief fits.
- **UNSHIPPABLE** — a section that cannot be carried in *any* declared form, because even its
  bounded condenser exceeds the whole ceiling. It is skipped **in place**. It is not a triage
  decision and it frees nothing, so it never cascades onto the sections below it.

**This is a real behavioural change, and the first draft of this ADR was wrong to claim otherwise.**
That draft asserted 70/00's delivered step — *"the lowest-priority sections are the ones dropped
first"* — remained literally true. It does not. The counterexample is live on this repo's data, not
hypothetical: story `43/04` has a `tasks` section (priority 4) measuring 121,787 chars that is still
~11.3k condensed and therefore unshippable, and a `fitness` register (priority 6) of 5,210 that fits
comfortably. Under this ADR the lower-priority section is carried while the higher-priority one is
not, and that step is false as written.

The resolution is to scope the step rather than to pretend it holds. **70/00's sentence governs
SACRIFICE, which is the only disposition that existed when it was written** — in 70/00's world an
over-large section took everything below it, so the dropped set was always a suffix and the sentence
was true by construction. UNSHIPPABLE is a disposition 70/00 never contemplated, and it is
introduced here, deliberately, by 70/05.

`01_bounded-and-truncated.feature` is delivered and **is not edited** — no annotation, no tag. The
new rule lands in 70/05's own contract, which is where a new rule belongs; the test implementing
70/00's scenario is code and may change to reflect the scoped reading. A reviewer who wants the old
behaviour back should refuse this ADR, not the feature file.

The alternative — dropping `fitness` because `tasks` is unshippable — was considered and rejected:
it destroys a section that fits, buys nothing, and would make the brief *worse* on 13 real stories
purely to keep one sentence unqualified.

**§4 — The compiler is handed EXTRACTS, never documents.** The reader performs I/O and nothing else;
every section value it passes is the output of a pure addressing helper exported by
`src/phase-brief.mjs`. This is not a new shape — `extractAdrBlocks` and `extractFitnessRegister`
already live in the pure compiler and are already called by the reader. §4 finishes the job that
`objective` and `story` were left out of.

**An ABSENT block and an UNREPRESENTABLE section are different, and produce different briefs.** The
reader yields **no section value** when the block it addresses is absent — the section is omitted
exactly as if the document were absent, and **no notice is raised**, because nothing was lost that
the brief ever had. The compiler **drops** a section it *was* handed but cannot represent, and that
**does** raise a notice. Without this ruling a `story` with no `## User story` block would silently
become "absent" rather than "dropped", and 70/00's delivered *"it still carries a truncation
notice"* would fail on a real record.

**§5 — Condensation lives in the PURE COMPILER, so ADR-002 is untouched.** Both addressing and
condensation are total functions from string to string: no `src/` import, no filesystem, no
wall-clock. Placing them in the reader would put the policy *outside* the bound it serves and
recreate ADR-003's own named failure mode — two implementations of one rule. **One bound, one
policy, one home.**

**§6 — The notice distinguishes CONDENSED from DROPPED, and says where the rest is.** `buildNotice`
already renders "Dropped or shortened"; that is no longer specific enough to act on. A condensed
section is named as condensed, with the form that survived ("scenario headlines only") and a pointer
to where the full text lives (`tasks/`, `ARCHITECTURE.md`). A phase must be able to tell a condensed
contract from a complete one — a phase that cannot will confidently act on a partial contract, which
is the harm ADR-003 exists to prevent, arriving by a new route.

The notice must name all three dispositions distinguishably — **condensed**, **sacrificed**,
**unshippable** — and a bounded condenser must state its own count (§2). **The literal phrase
"Dropped or shortened" is retained**: two delivered suites assert it
(`test/arch/acd-phase-brief-bounded-in-writer.test.mjs`, `test/phase-brief-compile.test.mjs`). The
new detail is **added** alongside it, never substituted for it.

**§7 — Two real-data defects in the reader are 70/05's to fix**, because they are the same failure
as F-11 — a section silently absent on real data — and they are invisible to every fixture:

- **`readDepends` is CRLF-blind.** `src/phase-brief-read.mjs` matches `/^---\n([\s\S]*?)\n---/`
  while `declaredAdrsInStory` in the compiler already uses `\r?\n`. Measured: **201 of 219**
  `STORY.md` in this stream are CRLF and **31 of the 41** that declare `depends:` therefore get no
  `dependencies` section at all. It has never been noticed because no fixture is CRLF.
- **`## User story` is matched case-sensitively.** 3 real stories under `50_milestone_session-launcher`
  write `## User Story`; a case-sensitive addresser drops the story section for all three.

**Consequences.** At the unchanged ceiling, a `continue` brief for 70/00 measures
`item ~50 + story 2,294 + tasks 1,555 + fitness 2,845 ≈ 6,800` — the full contract and the binding
constraints, inside budget, with room to spare. **70/03's declared-ADR slice becomes reachable on
real data**, which is the discharge condition its `OUTCOME.md` names. The section list stays open
(ADR-003's "one number in one module"), with one added obligation: a new section arrives with its
condenser or it does not arrive.

**Alternatives considered.**

- *A larger ceiling* — rejected, §1. The measurement says the budget is half-spent; a bigger budget
  spends none of the extra and contradicts the evidence ADR-003 rests on.
- *Byte-truncation within a section* — rejected. Cutting Gherkin at an arbitrary offset hands a
  phase half an acceptance criterion, which reads as a whole one. Structure-aware condensation
  costs one function per section and never produces a fragment that lies about its own extent.
- *A per-section reserved budget* — rejected as the primary mechanism. Fixed floors waste budget on
  absent sections (a story with no tasks, a milestone with no ADR slice) and still drop-whole when a
  section exceeds its floor. Bottom-up sacrifice over condensed sections needs no floors.
- *Summarising the contract in prose rather than embedding it* — rejected. A generated prose summary
  is unfalsifiable and non-deterministic; scenario headlines are the author's own words, exact, and
  free.

---

## ADR-010 — THREE condensers are bounded, not one; and no section takes budget the sections below it need

**Status.** Accepted. Amends ADR-009 §2/§3. Raised at the structural review of 70/05 (2026-08-23); §4 added at the same review, on a
witness found applying its fixes. ADR-009 shipped with two rules the implementation could not decline to decide and this record did not
settle; both were decided in code comments, which are not a record a reviewer can refuse. Every number below was measured at review,
through the real reader.

**§1 — The bounded set is `tasks`, `architecture` and `fitness`.** ADR-009 §2 states the general rule ("a condenser MAY itself be BOUNDED,
and a bounded condenser states its own count") while its table marks only `tasks`. Unbounded, at the unchanged ceiling: 70/05's own
declared slice is **17,401** chars addressed and **10,908** condensed, so the *only* story in this stream that declares its ADRs would
receive **none** of them and 70/03 would stay inert — the condition its `OUTCOME.md` names as its discharge; and **six** registers exceed
the ceiling even condensed (worst m53 29,003, m38 25,494), leaving those milestones' **39** stories with no constraints at all.

A bounded condenser always carries its section's SKELETON — every declared ADR's heading, the register's frame, the contract's
`Feature:`/`Rule:` lines — because which decisions bind a story is a fact a phase must not lose; only the passages beneath them are
bounded, and the count says what was left out. Which condensers are bounded is **declared** (the frozen `BRIEF_BOUNDED_CONDENSERS`, beside
the condenser map and the non-condensable set) rather than left to §2's general grant, because bounding changes a condenser's kind: its
output is a function of the **room it is given**, not its input alone — and §2 exists because an absent entry let drop-whole hide.

**§2 — A section may take everything left EXCEPT `min(what each live section below needs, an equal share)`** — *need* being the smaller of
a section's full and best-condensed size, *live* excluding the absent and the unshippable. A section over its share is CONDENSED, never
dropped — and the cap binds only what CAN be condensed to it: a non-condensable section reserves its WHOLE size, having no smaller form to
be capped to. Capping it prices the sections above against a fiction and starves the bounded condensers below; measured, five refine
briefs whose `tasks` section named **0** of its scenarios, `70/06` among them. ADR-009 §3 is silent here and silence is not neutral: the
packer must decide, and both directions fail. Over the 204 stories that have contracts — without the cap, **66** are left with no
architecture and no fitness section and **2** name zero of their own scenarios; with it, **17** (all in the four milestones that record no
register) and **0**.

**This is not the per-section reserved budget §Alternatives rejects**, checked against that rejection's own two defects: nothing is
reserved for an absent or unshippable section and a section needing less than its share reserves only its need (no floor wasted), and a
section over its share is offered its condenser (the deleted drop-whole path is unreachable). And §Alternatives' *"bottom-up sacrifice
over condensed sections needs no floors"* is **false on this data**, by the 66 above — as ADR-009 §3 corrected 70/00 on measurement, this
corrects ADR-009.

**§3 — ADR-009 §3's counterexample is void; its ruling stands.** `43/04`'s `tasks` is not unshippable — §2 declares it bounded — and
across **633** briefs UNSHIPPABLE and SACRIFICE each fire **zero** times. The scoping of 70/00's "lowest-priority first" sentence holds on
other ground: UNSHIPPABLE stays reachable wherever the reduction is NOT bounded (`objective`/`dependencies` non-condensable, `story`
unbounded), a designed guarantee that one miss cannot cascade, not a description of this stream's data.

**§4 — CONDENSATION IS EXHAUSTED BEFORE ANY SACRIFICE.** Every retained section still carried WHOLE is offered its condenser, lowest
priority first, before any section is given up: **priority means LAST TO PAY, not full form first**, the alternative being ADR-009's
deleted drop-whole re-entering one level up. Measured — a 1,456-char `story` (→449) beneath a 5,463-char non-condensable `objective`
otherwise sacrifices `tasks`, `fitness` and `dependencies`. Engages only on overflow: **0** of the 633 briefs above, **255** within 600
chars of it.

**Consequences.** The brief spends its budget: mean **7,244 of 8,000 chars (91%)** over those 633, against the 3,122–4,047 (~45%) ADR-009
measured. A new section arrives with its declared reduction (ADR-009) **and** with whether it is bounded — only a bounded one absorbs
slack. *Alternatives:* leaving the bounded set at `tasks` is rejected on §1's measurement; bounding `story` too is rejected because its
condenser selects a block, not a list, so it would cut a user story mid-sentence.

---

## Fitness functions

<!-- Each structural invariant from an ADR, paired with the arch-test that enforces it in CI.
     The arch-test lands with its subject story, so `pending` clears story by story.
     `pending` reports at warn while 70 is open and is NOT admitted at accept —
     `aof work doctor 70` reports each unresolved control as `control-unresolved`.

     Each declared control also owes a RED PROBE in VERIFICATION.md once it lands: what was
     changed to make it fail, and the message observed.

     HARNESS SHAPE: every arch-test here exports an array of `{ name, run }` — never `{ name, fn }` —
     and is imported AND spread in the suite registry inside its own labelled story block. A suite
     exported under the wrong key is never invoked.

     FOUR OF THE EIGHT EXTEND AN EXISTING GUARD rather than adding a sibling — the file named is the
     one already in service, and the extension lands in it.

     NOT here (these are task .feature material): "a brief over the ceiling is truncated and says
     so", "a story with no adrs: gets the register only", "observe reports the ratio for a phase",
     "a fix respawn resumes the build session". -->

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-7001 | **One brief bag.** The phase context rides `brief.*` and nothing else: no module constructs a rival context/payload/digest object passed to the driver, and the four existing `brief` keys keep their meaning. | `test/arch/acd-phase-brief-single-bag.test.mjs` | ADR-001 |
| FF-7002 | **The compiler is a pure leaf.** `src/phase-brief.mjs` imports nothing from `src/`, performs no filesystem read and reads no wall-clock; `agent-session-driver.mjs` imports it without re-exporting, and the driver's export set stays the frozen seventeen. The existing single-home guard is **EXTENDED**, never joined by a sibling. | `test/arch/session/acd-session-driver-single-home.test.mjs` *(extended)* | ADR-002 |
| FF-7003 | **The bound is in the writer.** The brief's size ceiling is enforced inside `compilePhaseBrief` — not in a caller, not in a lint, not in a comment; the ceiling is one literal in one module, and the truncation path names what it dropped. | `test/arch/acd-phase-brief-bounded-in-writer.test.mjs` | ADR-003 |
| FF-7004 | **aof never replaces the system prompt.** No `--system-prompt` argv is constructed anywhere in `src/**`; the spawn seam carries `--append-system-prompt` and `--exclude-dynamic-system-prompt-sections` together, so the cache flag can never be silently inert. The existing launch-argv guard is **EXTENDED**. | `test/arch/acd-worker-driver-no-headless-print.test.mjs` *(extended)* | ADR-004 |
| FF-7005 | **One launch seam.** Every production `claude` argv is built by `resolveInteractiveDriverLaunch`; no other module assembles one, so the flags of ADR-004/005 cannot be bypassed by a second spawn site. The existing single-home guard is **EXTENDED**. | `test/arch/session/acd-session-driver-single-home.test.mjs` *(extended)* | ADR-004, ADR-005 |
| FF-7006 | **Two model surfaces, never conflated.** The render-time role model resolves from `work.agents.models` and the session model from its own distinct config path; neither resolver reads the other's path, and no module derives one from the other. The existing role-model source-map guard is **EXTENDED**. | `test/arch/acd-agent-model-source-map.test.mjs` *(extended)* | ADR-005 |
| FF-7007 | **The reviewer is never resumed.** No path passes a build session's id to a review phase's launch; the resume target is derived from the phase, and a review phase resolves none. | `test/arch/acd-review-never-resumed.test.mjs` | ADR-008 |
| FF-7008 | **`ARCHITECTURE.md` stays ONE artifact.** `WORK_ITEM_ARTIFACTS` holds exactly one architecture entry and `REGISTER_BLOCKS`'s declaring file remains `ARCHITECTURE.md`; no sibling per-ADR artifact is enumerated, and the ADR extractor reads the single file. | `test/arch/acd-work-artifact-set-single-home.test.mjs` *(extended)* | ADR-006 |
| FF-7009 | **No section without a declared reduction.** The compiler exports frozen declarations — the condenser map, the non-condensable set and the bounded set (ADR-010 §1) — the first two of whose union is exactly `BRIEF_SECTION_PRIORITY` and whose intersection is empty, with the bounded set a subset of the condenser map. A section can therefore never be added that is droppable-for-size-alone *by omission*: an eighth section without a declared reduction fails on its first commit. The existing bound guard is **EXTENDED**. (The behavioural half — that no packing path drops a section it never offered condensed — is a task-01 `@executable` property, deliberately NOT here.) | `test/arch/acd-phase-brief-bounded-in-writer.test.mjs` *(extended)* | ADR-009 |
| FF-7010 | **The compiler is handed extracts, never documents.** In `src/phase-brief-read.mjs`, no identifier bound directly from a disk read appears in any section value at the `compilePhaseBrief` call site, and every section is bound to a named `const …Section = <helper>(…)` whose helper is imported from `./phase-brief.mjs`. Binding each section before the call is what keeps this a cheap exact check rather than a brittle expression parse. Today `objective: spec` and `story` both violate it — that is the red probe. The existing single-bag guard is **EXTENDED**. | `test/arch/acd-phase-brief-single-bag.test.mjs` *(extended)* | ADR-009 |

## Story partition

Drawn from the `graph impact` measurements in § Grounding, not from the SPEC's bullet order.

| Story | Subject | Graph rationale | Depends |
|---|---|---|---|
| **70/00** `phase-brief` | The brief compiled and passed by value | New leaf `src/phase-brief.mjs` (0 deps, ADR-002's shape) + the **payload** seam of both callers: `drive.mjs`'s `phaseCommand`, `mesh-worker-execution.mjs`'s `directiveCommand`. The milestone's spine — two stories enrich it. | — |
| **70/01** `cache-stable-launch` | The four things the spawn never passed | The **argv/env** seam only: `resolveInteractiveDriverLaunch` (2 src callers) + a session-model resolver. Disjoint from 70/00 by function — 00 owns the typed command, 01 owns the launch vector. | — |
| **70/02** `cache-economics` | `cacheRead ÷ cacheCreate` per phase, against a target | `work-observe.mjs` — **0 dependencies**, a self-contained leaf 68 already proved partitionable by region. Read-only over 68's `spend`; writes no record. Fully independent. | — |
| **70/03** `architecture-slice` | `adrs:` declared, the block addressable, the budget binding | The ADR extractor feeds 70/00's compiler (a new section, ADR-003's priority list); the budget half is `work-doctor-budget.mjs` — **0 deps, 1 dependent**. | 70/00 |
| **70/04** `warm-fix-loop` | A fix resumes the build; a review never does | `commands/loop.mjs` (1 src dependent) + `drive.mjs`'s resume target. Consumes 68/01's persisted `sessionId` and the driver's existing `resumeSessionId`. The fix payload is a brief. | 70/00 |

**This table predates 70/05 and 70/06**, both added at the milestone gate (2026-08-22) on
measurement rather than at refine. Neither is entered above, because the graph rationale in the
other five rows was measured at the original partition and none has been measured for these two.
70/05 is sequenced behind 70/00 by the same reasoning as 70/03 and 70/04 — it changes that story's
compiler — and it is the discharge condition 70/03's `OUTCOME.md` names.

**Sequencing.** **70/00, 70/01 and 70/02 are parallel-eligible and start together** — three disjoint
seams (payload, launch vector, reporting leaf). 70/03 and 70/04 are sequenced behind 70/00, which
supplies the compiler each extends.

**The one declared overlap.** 70/00 and 70/01 both edit `src/commands/drive.mjs` — 70/00 the
`command` const, 70/01 the `driverOptions` object, roughly twenty lines apart in one `run()` body.
It is named here rather than discovered later, because STATE records the exact failure this repo has
already paid for: two stories an architect had partitioned as independent both edited one file, ×9
and ×8. `drive.mjs` has **one** `src/` dependent and the two edits are to distinct statements, so
this is a routine merge — but it is a **known** one, and whichever lands second rebases rather than
re-derives.
