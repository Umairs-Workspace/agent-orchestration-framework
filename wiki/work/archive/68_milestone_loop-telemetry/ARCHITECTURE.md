---
doc: architecture
---
<!--
  Milestone ARCHITECTURE.md — answers ONE question: how did we decide to build it, and why that way?
  Owner: architect. A log of ADRs: numbered, IMMUTABLE, superseded-not-edited.
  Does NOT contain observable behaviour (→ task .feature files) — only the structure behind it.
-->
# 68 · Loop telemetry — Architecture Decisions

> **Inputs.** This milestone's `SPEC.md` (Objective + Scope), and upstream
> `wiki/planning/PRD-acd-loop-performance.md` + `wiki/planning/RESEARCH-agent-loop-economics.md`
> (every measured claim below cites the latter as `RESEARCH §n` rather than re-deriving it).
> Neighbours whose boundaries these ADRs must not cross: `69_milestone_loop-bounds/SPEC.md`
> (heartbeat, the four timeouts, the progress ledger, concurrency slots, `--max-turns` /
> `--max-budget-usd` — 68 measures, 69 enforces), `70_milestone_warm-start/SPEC.md` (the cache
> flags and per-role model/effort AT THE SAME SPAWN SITE this milestone edits),
> `78_milestone_loop-execution-record/SPEC.md` (the committed per-item loop graph + human
> sign-off — a different artefact from a run record). `53_milestone_loop-artifact` is **done**
> and is a hard pre-commitment: its loop declaration already rides `brief.loop` and already
> carries `phase` (ADR-002 below).
>
> **Graph grounding (measured, not inferred).** `aof graph build .` → **11,554 nodes / 27,905
> edges / 492 communities**, egress `none`, built `2026-08-20T13:48:49.307Z`. `aof graph impact`
> at each candidate boundary:
>
> | Module | Dependents ← | Dependencies → |
> |---|---:|---:|
> | `src/run-store.mjs` | **41** | 3 (`degrade`, `fs`) |
> | `src/agent-session-driver.mjs` | 18 | 6 (incl. `work-observe.mjs`) |
> | `src/work-observe.mjs` | 9 | **0** |
>
> Those three numbers drew the partition (§ Story partition). `run-store.mjs` is the milestone's
> god-node and lands **alone, first**; `work-observe.mjs` is a self-contained leaf (imports
> nothing) and is therefore safely partitionable by region; `agent-session-driver.mjs` sits
> between them and is edited only at its launch seam.

---

## ADR-001 — The run record gains ONE additive key, `spend`, appended last — not ten flat keys

**Status.** Accepted.

**Context.** The SPEC asks the run record to carry phase, attempt, model, effort, four token
classes, `costUsd` with a price-table version, turn and tool-call counts, and a typed
`exitReason`. That is ten-plus new facts against a record whose key set is **frozen and
enumerated positionally in four places**, measured on this tree:

- `test/run-resilience-record-keys.test.mjs:27`
- `test/run-store-record.test.mjs:24`
- `test/arch/acd-run-record-node-additive.test.mjs:25`
- `test/arch/acd-loop-state-rides-the-run-record.test.mjs:14`

The record's own comment block (`src/run-store.mjs:330-343`) documents a deliberate lineage:
nine keys (19) → thirteen (20) → fourteen (26, `node`) → fifteen (348, `resumeAfter` "appended
LAST"), each generation reading forward because **absence is benign**.

**Decision.** The sixteenth key is **`spend`**, an envelope object defaulting `null`, appended
last. Ten flat keys would rewrite four positional pins into a 25-element list and make every
future telemetry fact a fresh negotiation with the frozen set. One envelope is one amendment.

`spend`, when present, is exactly:

```
spend: {
  model, effort,
  tokens: { input, output, cacheRead, cacheCreate },
  costUsd, costSource, priceTable,
  turns, toolCalls, exitReason
}
```

`null` means *not measured* — never zero. A run that ends before anything is ingested, a run on a
runtime that reports nothing, and a fifteen-key record read forward are the same state, and it is
distinguishable from a genuinely free run (`costUsd: 0`).

**Consequences.** The four pin sites are amended, not duplicated — and the additive-discipline
guard `test/arch/acd-run-record-node-additive.test.mjs` is **extended** to cover the sixteenth
key rather than joined by a sibling. `attempt` is NOT re-declared: it is key 4 already.

**Alternatives considered.**

- *Ten flat keys* — rejected above.
- *A sidecar spend store keyed by runId* — rejected. It is a second truth that can disagree with
  the record, and the record already has a bag for opaque per-run data (`brief`) whose precedent
  argues for envelopes, not new stores.
- *Ride `brief`* — rejected, and this is the closest call. `brief` is persisted **OPAQUE and
  verbatim, never reshaped** (`src/run-store.mjs:337`), which is exactly the wrong contract for a
  field the writer must validate (ADR-003). Spend is aof's own measurement, not the caller's bag.

---

## ADR-002 — `phase` is NOT minted here; it is read from `brief.loop.phase`, which milestone 53 delivered

**Status.** Accepted.

**Context.** The SPEC's first scope bullet names `phase` as a run-record field. Milestone **53 is
`done`**, and its loop declaration is a seven-key envelope
`{loopRunId, scope, level, cap, phase, cycle, startedAt}` riding the `brief` bag of every run the
loop mints — `53/01/tasks/05_declaration-and-resume.feature:34`, read in production at
`src/commands/loop.mjs:396` as `record.brief?.loop?.loopRunId`.

**Decision.** `phase` **already has a home and a producer**. This milestone reads
`brief.loop.phase` and mints no rival. `spend` (ADR-001) carries no `phase` key.

**Consequences.** A run not minted by the loop shell has no phase, and reports as `null` rather
than being guessed — which is the honest answer and matches ADR-006's posture on absence. The
per-phase rollup (story 68/04) is a group-by over `brief.loop.phase`, not over a new column.
FF-6802 makes the single authority structural.

**Alternatives considered.**

- *A `phase` key on `spend`, populated from `brief.loop.phase` at write* — rejected. Two copies of
  one fact, and the copy is the one readers would reach for. This is `48/ADR-003`'s ruling
  (authority split by fact, the join runs one way only) applied to a second pair of records.
- *Promote `phase` out of `brief` onto the record proper* — rejected **for this milestone**: it
  breaks a delivered contract for a cosmetic gain, and 68 is not the item that owns the loop
  declaration.

---

## ADR-003 — Token buckets are MUTUALLY EXCLUSIVE, and the writer refuses a record that overlaps

**Status.** Accepted. *(Resolves the SPEC's second open question, and the STATE note that names
"the failure mode is not choosing".)*

**Context.** The vendor convention is genuinely split: Langfuse requires each token be counted in
exactly one key; Braintrust folds cached tokens into the prompt count (RESEARCH §5.6). aof has
already been bitten by not choosing — 18 of 143 agent rows double-counted, 7.07 h and 1,345k
output tokens billed twice (RESEARCH §0, §5.6).

**The measurement that decides it.** Claude Code's own per-turn `usage` object is *already*
disjoint. Verified on a live transcript this milestone (`~/.claude/projects/**/*.jsonl`), the
keys are `input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`,
`output_tokens` — where `input_tokens` **excludes** both cache classes. Adopting mutual exclusivity
therefore makes ingestion a **straight copy with no arithmetic**; adopting Braintrust's convention
would require aof to *add* numbers at write time and subtract them back out for any consumer
expecting the vendor shape.

**Decision.** Buckets are mutually exclusive. `input + output + cacheRead + cacheCreate` is a true
total with no term counted twice. **The writer enforces it** — a `spend` whose buckets are not all
present, or which carries a negative or non-integer bucket, is **refused at write** with a typed
error, never silently normalised. Enforcement in the writer is the whole point: a convention that
lives in a comment is the state that produced the double-count.

**Consequences.** Any future exporter that needs the inclusive convention derives it on the way
out (`input + cacheRead + cacheCreate`), which is lossless in that direction and not the reverse.
FF-6803 pins the enforcement to the writer.

---

## ADR-004 — Cost is stamped ONCE at settle and never recomputed; `costSource` says where it came from

**Status.** Accepted.

**Context.** The SPEC requires "ingested cost beats inferred cost" and `costUsd` "persisted at
write time and never recomputed". But a measured fact constrains it: **the transcript carries no
cost.** The live JSONL inspected for ADR-003 carries the four token classes, `model` and `effort`
— and no `costUSD` key of any kind. Authoritative USD exists in two places aof does not always
have: `claude_code.cost.usage` over OTLP (ADR-005), and `total_cost_usd` on the headless
`claude -p --output-format json` envelope, which is not the path aof spawns
(`src/agent-session-driver.mjs:619-658` builds an interactive PTY).

**Decision.** Three keys, one rule.

- `costUsd` — a number, stamped **once**, at settle.
- `costSource` — closed vocabulary `"reported" | "priced"`. `reported` = an authoritative USD
  figure the runtime emitted. `priced` = aof multiplied the ingested buckets by a price table.
- `priceTable` — the version string of the table used. Required when `costSource` is `"priced"`,
  `null` when `"reported"`.

**No read path recomputes cost.** A price-table correction changes what *future* runs are stamped
with; it never rewrites a run that has already settled. `reported` beats `priced` when both are
available, and the record says which it got — so a cost is never silently a guess.

**Consequences.** Historic runs stay comparable because the table version travels with the number
rather than being implied by the read date. This is the same discipline that ADR-007 applies to
snapshots, one layer down: **the framework does not rewrite its own evidence.**

---

## ADR-005 — Attribution is a JOIN on `sessionId`, not a regex — and aof ships NO OTLP receiver

**Status.** Accepted.

**Context.** Today `agentMatchesMilestone` (`src/work-observe.mjs:661-667`) attributes an agent
run to a milestone by **matching text**, which is why 18 of 143 rows land in two reports
(RESEARCH §5.6). The obvious modern fix is `OTEL_RESOURCE_ATTRIBUTES` at spawn — and the SPEC
scopes exactly that.

**But the emitter only covers a minority of the corpus, measured.** aof sets spawn env for the
sessions it spawns: `src/commands/drive.mjs` and `src/mesh-worker-execution.mjs`, both through
`resolveInteractiveDriverLaunch`. The 125-agent corpus behind every figure in RESEARCH is
overwhelmingly **Task subagents inside sessions an operator started in their own terminal** —
sessions aof never spawned and whose environment it cannot set. An OTel-only attribution design
would measure the path aof uses least and go blind on the path it uses most.

**And the join key already exists, unwritten.** The run record has modelled `sessionId` since
milestone 19 (`src/run-store.mjs:344-362`). The driver **already captures it mid-run** —
`onSessionIdCaptured` (`src/agent-session-driver.mjs:675`), wired at
`src/mesh-worker-execution.mjs:1665` — and forwards it to the **assignment**, never to the run
record. Every run record on disk confirms the consequence: `"sessionId": null` on all of them
(verified across `wiki/work/**/runs/**/*.json`). Transcripts carry `sessionId`, and subagent
transcripts carry `isSidechain` + `parentUuid` under `<projectsDir>/<sessionId>/`, so a populated
`sessionId` resolves parent **and** subagents deterministically.

**Decision.** Two halves, and the second is a boundary.

1. **Attribution is a join on `sessionId`.** The run record is the authority; the miner reads it.
   The text-matching path does not survive (FF-6805). An agent run belongs to **exactly one** item
   because it belongs to exactly one session, which belongs to exactly one run (FF-6806).
2. **`OTEL_RESOURCE_ATTRIBUTES` is set at spawn — and aof builds no receiver.** Setting
   `run.id`, `story.id`, `milestone.id`, `phase`, `machine.id`, `worktree.id` costs an env
   assignment and makes a project that *does* run a collector correctly attributed for free.
   Standing up an OTLP endpoint is explicitly out of scope in the SPEC ("a hosted observability
   stack is a project choice, not a framework deliverable"), and building one would put a daemon
   dependency between aof and its own numbers. FF-6808 keeps that boundary structural.

**Consequences.** aof's own ingest is the transcript (ADR-006, story 68/02), keyed by the
`sessionId` story 68/01 persists. The OTel attributes are an **export courtesy**, not a
dependency: every figure this milestone produces is correct with no collector running anywhere.

**Alternatives considered.**

- *Fold this into `48/ADR-003`'s existing surface
  (`test/arch/acd-session-attribution-single-authority.test.mjs`)* — **rejected, deliberately, and
  it was the first thing checked.** That guard governs a **different fact**: which record owns a
  *session's work attribution* (presence vs. assignment), and its rule is that the session record
  stores no item ref at all. This milestone's fact is which item owns an *agent run's spend*. Two
  facts, two guards; extending that file would make one arch-test answer to two ADRs in two
  milestones.
- *Keep the regex as a fallback when `sessionId` is null* — **rejected.** A fallback that
  double-counts is the defect, and a silent one is worse than a gap. An unattributable run is
  reported as unattributed (ADR-006).

---

## ADR-006 — `work-observe.mjs` is REPAIRED and demoted to a diagnostic companion, not retired

**Status.** Accepted. *(Resolves the SPEC's first open question.)*

**Context.** STATE asks whether the transcript miner is repaired or retired. The case for retiring
it is that ingested OTel data supersedes reconstruction. ADR-005 kills that case on measurement:
OTel covers only aof-spawned sessions, and the corpus is mostly not those.

The case for keeping it is independently strong. Its per-agent diagnostics — grind flag,
edit↔test interleave, thrashed files, stall gaps — **have no OTel equivalent** and are the only
place write-side thrash is visible. RESEARCH §2.4 is built entirely on them (199 edits / 1 test
run; 18.0 edits per verified run), and §2.2's largest single line item — 41.8% of a milestone's
tokens — was found by them.

**Decision.** Repair. The miner stays, with its authority narrowed: it is the **diagnostic
companion** to the run record, never the primary source of spend. Where the two disagree about
*what a run cost*, the run record wins, because it was stamped at settle by the writer that
enforced the convention (ADR-003/004). Where the record is silent — *why* a phase was slow — the
miner is the only answer and stays authoritative.

**One part IS retired: the toolchain classifier.** `TOOLCHAIN_RE` (`src/work-observe.mjs:67-68`)
matches `npm test` / `vitest` / `jest`, and `.claude/rules/build-deploy-restart.md` **forbids**
`npm test` in this repo. Measured consequence: **zero of sixty grind reasons were
toolchain-related** while a hand-written retro reported 33% (RESEARCH §1). A classifier that
reports zero on a repo where the true figure is non-zero is worse than no classifier, because
zero reads as a finding. It is replaced by classification over the tool-result events, which
reclassified **340 test-ish calls averaging 30.5 s** on the same corpus.

**Consequences.** Absence is reported, never inferred: a run with no resolvable session is
reported as unattributed with a count, not dropped and not guessed into a milestone.

---

## ADR-007 — Snapshots are append-only; the existing ones are MARKED, never rewritten

**Status.** Accepted.

**Context.** `observeMilestone` writes `observability/report.md` and `observability/agents.json`
**in place** (`src/work-observe.mjs:1114-1119`). The cost is already paid and is unrecoverable:
milestone 45's retrospective cites *"477h39m span, 30m17s active, one infra kill"*; the file it
cites now reads *25m21s span, 25m21s active, 0 infra kills* (RESEARCH §5.6). Every
`Refs: observability/report.md` in the corpus is unfalsifiable — a citation to a mutable path.

**Decision.** An observe run **never truncates an existing snapshot**. Each run writes a new
timestamped snapshot; the read path resolves the newest. FF-6807 makes "no write path opens an
existing snapshot for truncation" structural rather than a convention a later edit can lose.

Existing snapshots are **marked, not migrated**: a header stating they were derived by the
pre-68 miner, and are therefore subject to the double-count and the blind classifier. The SPEC
puts retro-fitting history out of scope, and rewriting the very files whose rewriting is the
defect would be self-refuting.

**Consequences.** A retrospective's citation becomes stable. Snapshots accumulate — acceptable:
they are small, they are the evidence, and the alternative is the state that produced this ADR.

---

## ADR-008 — The line 68 does not cross: it makes the numbers true, and enforces nothing with them

**Status.** Accepted.

**Context.** Every mechanism in RESEARCH §5.5 — heartbeat consumption, the four timeouts, the
progress ledger, concurrency slots, `--max-turns` / `--max-budget-usd` — is adjacent to code this
milestone edits. `run-store.heartbeat()` has zero production callers and sits **six lines** from
the record this milestone extends. The temptation to "just wire it while we're here" is real, and
milestone **69** owns it.

**Decision.** 68 records; it does not act.

- **No bound of any kind** is introduced — no cap, no timeout, no budget, no kill.
- **`heartbeat()` stays unwired.** Its caller is 69's.
- **No dispatch, lease or slot behaviour changes.**
- `exitReason` (ADR-001) is a **typed record of how a run ended**, written at settle from what
  already happened. It is not a decision procedure, nothing branches on it in this milestone, and
  its vocabulary is fixed here precisely so that 69 has a stable thing to enforce against:
  `final_output | max_turns | timeout | stall | budget_exceeded | abort | error`. Several of its
  members are **unreachable until 69 lands** — that is expected and is not a defect.
- **The spawn site is edited for attribution env only** (ADR-005). `--model`, `--effort` and the
  cache flags at that same seam are **milestone 70's**, and this milestone's edit is shaped to be
  additive to them rather than in their way.

**Consequences.** A reviewer can refuse any story in this milestone that changes what the loop
*does*, on this ADR alone.

---

## ADR-009 — 68 reaches the run fact through the TRANSITION SEAM, and pays for its spawn reach in TWO amended m53 declarations

**Status:** accepted, 2026-08-21 (F-09, fourth `aof:verify` pass — a repair ADR, written after the
milestone's delivery broke four controls belonging to milestones 42 and 53).

**Context.** Story 68/01 wired the local drive command (`src/commands/drive.mjs`) directly to
`startRun` / `completeRun`, and gave the spawn seam (`src/agent-session-driver.mjs`) a sixth direct
import. That turned four EARLIER declared controls red, and none of them belongs to this milestone,
so no lane 68 ran could have reported them — they surfaced only at the milestone gate sweep:

| control | milestone | what it says |
|---|---|---|
| `arch/m42-d2` | 42 | `completeRun` is reachable only through the store + the transition seam |
| `arch/m42-d4-port1` | 42 | the run MINT is reachable only through the store + the transition seam |
| `arch/53 FF-5301` | 53 | the driver's direct-import set, denied-transitive set and reach ceilings stay exact |
| `arch/53 FF-5302` | 53 | the assignment sink carries a shrink-only line-count ratchet |

The two classes are **not** the same, and the decision differs accordingly.

### Decision 1 — the m42 pair is RIGHT and 68's code was wrong. The code moved.

m42's controls say *the fact never lands without its event*: a mint or a settle that skips
`src/effects/run-transitions.mjs` raises no `run.started` / `run.completed`, so it inherits none of
the declared cascade — the status rollback on a failed run, the journal entry that survives a crash
between fact and cascade, the drain of the event's local-locus steps. 68/01 made the drive command a
**second, unledgered path to the same fact**, which is precisely the "8 call sites, exactly 1 does
the rollback" disease m42 exists to have killed. The sibling caller
(`src/mesh-worker-execution.mjs`) had gone through the seam since m42 and says so in its own comment.

So `drive.mjs` is ported to `transitionRunStart` / `transitionRunComplete`. No declaration is
amended, because none was wrong.

**One seam extension was required, and it follows the seam's own precedent.**
`transitionRunComplete` derived `projectsDir` (68/02's spend stamp) from `opts.workspace` — but
`workspace` ALSO sets the event's `workspaceRoot`, which is what makes a completion publish a global
work snapshot. The drive command needs its run **priced** and has never **published**, and there was
no way to express that. `projectsDir` is now a separate opt defaulting to `workspace.projectRoot`,
which is exactly the reasoning (recorded in that file) for `lock` being separate from `workspace`
under m43/ADR-003: *"reusing `workspace` would set the event's workspaceRoot and flip run-retry into
publishing as a side effect."* Every existing caller is unchanged.

### Decision 2 — FF-5301's frozen set is AMENDED to six, and its two reach numbers by exactly what the sixth costs.

The driver is the spawn seam, and the OTel resource attributes must be applied to the spawn env
**after** the IDE-attachment scrub in `resolveInteractiveDriverLaunch` — the scrub added on
2026-07-27 after a measured incident in which every spawned `claude` inherited `CLAUDE_CODE_SSE_PORT`
+ `VSCODE_*` and silently attached to the operator's own editor, killing PTY input. The alternative
to importing the builder — callers hand the driver a pre-built env bag — would re-open exactly that
vector, because a generic passthrough can re-inject the keys the scrub just removed. The driver
therefore keeps a typed `attribution` input and builds the env itself.

`otel-attribution.mjs` is a **pure leaf with zero imports**, so admitting it cannot widen the
driver's transitive reach by a single edge: the mesh-blindness FF-5301 exists to enforce is
untouched, and the control's denied-transitive and named-admission legs prove that independently of
the frozen list. The two numeric pins move by the amount the leaf provably costs — the driver's
root-inclusive reach ceiling `21 → 22` (one node, no edges), and the sink's contrast baseline
`55 → 57`. That second pin is a **non-vacuity contrast, not a constraint on the sink**: it exists so
the walk is measured rather than assumed, and the invariant it serves — the driver reaches far less
than the sink — holds at 22 vs 57 with the margin it held at 21 vs 55.

### Decision 3 — FF-5302's ceiling is RAISED, 2313 → 2331, and the extraction was done FIRST.

The ratchet exists to stop the extracted driver creeping back into the assignment sink. Milestone 68
did not do that: it made the sink a production caller of the spawn attribution (ADR-005 §2) and of
the session-id capture (ADR-005 §1), which is new behaviour the sink must carry. The ratchet's
purpose is intact; only its literal number is exceeded, and its own message says raising it is a
decision rather than a diff — so the decision is made here rather than the number quietly moved.

**The raise is minimal because the duplication was removed before the number was touched.** Both
production callers had hand-copied the same two things, and the sink's copies are what pushed it
past the ceiling:

- the attribution-object build (`ref.split("/")[0]` → milestone, story-if-story) → `buildRunAttribution` in `src/otel-attribution.mjs`;
- the persist-without-racing-the-settle shape F-04 established → `captureSessionIdOnRecord` in the new `src/run-session-capture.mjs`.

That took the sink from 2344 to 2331, so the raise is **+18 rather than +31**. The second extraction
matters beyond the line count: F-04's fix had to be ported by hand from the sink to the drive
command precisely because the shape lived in two places, and the drive command was originally
written without it. It now lives once.

### Alternatives rejected

- **Re-mark the controls `pending`.** Refused on the accept rule's own terms: what clears a control
  is landing the file or dropping the declaration, never re-marking it. A `pending` marker changes
  what `aof work doctor` prints, never whether the control holds.
- **Leave the drive command on the bare store and amend m42 instead.** Rejected: m42's invariant is
  load-bearing and the sibling caller already satisfies it. Amending it to admit one command would
  make the ledger optional, which is the whole defect it closed.
- **Remove the driver's sixth import and pass a pre-built env bag.** Rejected on the scrub argument
  above — it re-opens a measured incident's vector to satisfy a list.
- **Trim comments in the sink to fit under 2313.** Rejected: it would buy the number by deleting the
  reasoning a later reader needs, which is the opposite of what the ratchet is for.

### Consequence

68/01's `OUTCOME.md` gains the seam as delivered state. Nothing in 68's own eight controls changes.
The process lesson — a story that breaks ANOTHER milestone's control is structurally invisible until
the milestone gate, and the lifecycle has no `done → in-review` edge to express the rework it needs
— is carried to `RETROSPECTIVE.md`, not resolved here.

---

## Fitness functions

<!-- Each structural invariant from an ADR, paired with the arch-test that enforces it in CI.
     These replace "invariant-as-scenario" — they belong here, never in a task feature.

     Every arch-test lands with its subject story (the register's own rule). ALL EIGHT have now
     landed — FF-6801…FF-6804 (68/00), FF-6808 (68/01), FF-6805 + FF-6806 (68/03, this file),
     FF-6807 (68/05) — so no row below carries `pending` and none is admitted unresolved at accept.

     Each declared control also owes a RED PROBE in VERIFICATION.md once it lands: what was
     changed to make it fail, and the message observed.

     HARNESS SHAPE: every arch-test here exports an array of `{ name, run }` — never `{ name, fn }`
     — and is imported AND spread in the suite registry inside its own labelled story block, so the
     evidence lands with the contract. A suite exported under the wrong key is never invoked.

     NOT here (these are task .feature material — observable behaviour over the real seam):
     "observe answers for 68/00", "a run with no session reports as unattributed", "the report
     names the phase", "a second observe run leaves the first snapshot byte-identical". -->

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-6801 | The run record's **sixteenth** key is `spend`, appended LAST, defaulting `null`; a fifteen-key record reads forward unchanged (absence is benign). The existing additive-discipline guard is **EXTENDED**, never joined by a sibling. | `test/arch/acd-run-record-node-additive.test.mjs` *(extended)* | ADR-001 |
| FF-6802 | **One phase authority.** No `phase` key exists on the run record or on `spend`; every phase reader in `src/**/*.mjs` resolves it from `brief.loop.phase`. | `test/arch/acd-run-phase-single-authority.test.mjs` | ADR-002 |
| FF-6803 | Token buckets are **mutually exclusive and writer-enforced**: the four buckets are the only token keys, and the refusal of an overlapping/negative/partial `spend` happens in the write path — not in a caller, not in a comment. | `test/arch/acd-token-buckets-mutually-exclusive.test.mjs` | ADR-003 |
| FF-6804 | **Cost is stamped once.** No read path multiplies a price table; `costUsd` is written only at settle; `priceTable` is present exactly when `costSource` is `"priced"`; `costSource` is the closed two-member vocabulary. | `test/arch/acd-cost-stamped-once.test.mjs` | ADR-004 |
| FF-6805 | **Attribution is a join, not a match.** No attribution path in `src/work-observe.mjs` tests item identity against free text; the item is resolved from the run record's `sessionId`. The retired text-matcher has no surviving caller. | `test/arch/acd-observe-attribution-by-join.test.mjs` | ADR-005, ADR-006 |
| FF-6806 | **One agent run, one item.** Across a whole work stream, no agent-run identity appears in two items' attributed sets; a run with no resolvable session is reported as unattributed rather than assigned or dropped. | `test/arch/acd-observe-attribution-by-join.test.mjs` | ADR-005, ADR-006 |
| FF-6807 | **Snapshots are append-only.** No write path under `src/work-observe.mjs` opens an existing snapshot for truncation or rewrite; each run writes a new timestamped artefact. | `test/arch/acd-observe-snapshots-append-only.test.mjs` | ADR-007 |
| FF-6808 | **aof ships no OTLP receiver.** No module in `src/**` opens a listening socket for, parses, or serves an OTLP payload; the OTel surface is env-set-at-spawn only. | `test/arch/acd-no-otlp-receiver.test.mjs` | ADR-005 §2, ADR-008 |

## Story partition

Drawn from the `graph impact` measurements in the header, not from the SPEC's bullet order.

| Story | Subject | Graph rationale | Depends |
|---|---|---|---|
| **68/00** | The spend-bearing run record | `src/run-store.mjs` has **41 dependents** — the milestone's god-node. It lands **alone and first**; every other story reads its contract. Cutting it alongside anything else would make two stories race on the file 41 modules import. | — |
| **68/01** | Attribution at spawn | `src/agent-session-driver.mjs` (←18) at its launch seam, plus the two callers the graph names as its only production dependents (`src/commands/drive.mjs`, `src/mesh-worker-execution.mjs`) — which are also the only modules importing **both** the driver and `run-store`, so the sessionId persist belongs here and nowhere else. | 68/00 |
| **68/02** | Spend ingest at settle | A **new** module + the `completeRun` seam. New file ⇒ no inbound edges to disturb; it reads the record contract only. Parallel with 68/01 by construction: 01 populates `sessionId` at runtime, 02 consumes a record that *has* one. | 68/00 |
| **68/03** | The miner's core corrected | `src/work-observe.mjs` **imports nothing (→ 0)** — a self-contained leaf, which is what makes region-level cuts safe here. This story owns the attribution region (`:661-724`) and the classifier (`:67-71`). | 68/00, 68/01 |
| **68/04** | Story- and phase-scoped observe | Same leaf, **disjoint region**: the resolver (`:988-1006`) and the rollup/report path, plus `src/commands/observe.mjs` (the registered `--json` door, milestone-08 spine). | 68/00 |
| **68/05** | Append-only snapshots | Same leaf, **disjoint region**: the write block at `:1114-1119` and nothing else. | 68/00 |

**On 03/04/05 sharing one file.** This is a considered cut, not an oversight. `work-observe.mjs`
is the only module in the milestone with **zero outbound edges** — nothing it does can break a
dependency, and the three regions (attribution+classifier / resolver+rollup / write block) do not
call each other. The alternative — one 1,140-line story carrying five unrelated defects — was
rejected: each defect is independently valuable, independently testable, and independently
reviewable, and three stories on disjoint hunks of a leaf merge cleanly where three stories on a
41-dependent hub would not.

**Parallelism.** 68/00 first, alone. Then **68/01, 68/02, 68/04 and 68/05 are all parallel-eligible**;
68/03 wants 68/01's populated `sessionId` for its live evidence and is sequenced behind it.
