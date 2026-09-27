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
# 96 · The declaration earns its keep — Architecture

## Context this milestone inherits

Every figure below was measured at HEAD on 2026-09-04. The codebase graph was rebuilt at this
decision point over the project root with no `--backend`: **15,394 nodes / 37,585 edges, egress
`none`, `builtAt 2026-09-04T14:19:30.577Z`**. All coupling stated as ACTUAL is `aof graph impact`,
deterministic from the graph's edges; where it is inferred, it says so.

Four corrections to the SPEC were measured at this pass. Three of them change a decision, and two
of them delete a module the break-down asked for.

**1 — THE SELECTOR ALREADY EXISTS, AND STORY 03 MUST NOT BUILD A SECOND ONE.** Milestone 72 shipped
`src/work-test-select.mjs` (287 lines) — `selectSuites({ projectRoot, changed, allSuites, roots })`,
a frozen `WIDENING_REASONS` set of four, three named refusals, `SELECTION_SCOPES`, and the
one-directional invariant stated in the module's own header: *"coupling the graph knows narrows the
run; coupling the graph does not know widens it."* Its changed-set producer is a second module,
`src/work-test-changed.mjs`, deliberately beside it rather than inside it so the selector stays
spawn-free and stays FF-7202's censused subject. Its face is `aof test --scope impacted|file|all`
(`src/commands/test.mjs`), which already refuses an absent scope rather than defaulting one.
96/03's declared `src/test-selection.mjs` is therefore **deleted from the partition**: it would be a
second selection authority, and the failure mode m72's module exists to prevent — *"an agent handed
a subset derived from a gap has been told a falsehood in the shape of an answer"* — is exactly what
two disagreeing selectors produce. ADR-007.

**2 — `aof test --scope all` ALREADY EMITS THE GATE BOOLEAN.** `src/commands/test.mjs:262` computes
`gate: scope === "all" && widened.length === 0`. Story 04's SPEC line *"a milestone regression gate
that is load-bearing"* is therefore not a new test run; it is **durability and a door** over a
result the command already produces and then discards. ADR-008.

**3 — `src/acceptance-horizon.mjs` CANNOT HOLD THE DOOR, and 96/04's declared `files:` is corrected
here.** That module is a ZERO-IMPORT leaf by 66/ARCHITECTURE ROUND 3/3, and 66/02's FF-6605 forbids
the controls lane reaching `node:fs` through its direct imports. A gate that must read a recorded
result cannot live there. The lifecycle table stays where it is; the refusal lands in the command
layer, in `src/commands/item-status.mjs` — which is where `--if-applicable` (74/00) already
established the idiom this gate needs. ADR-008 §3.

**4 — `CLAUDE_SESSION_ID` IS UNSET IN A TOOL SHELL, MEASURED HERE.** `node -e "process.env
.CLAUDE_SESSION_ID"` from this session's own Bash tool returns undefined, as does
`CLAUDE_PROJECT_DIR`. 48/ADR-001's id ladder has three rungs — the `--session` flag, the hook
payload's `session_id`, then the env var — and on the phase path **only the first is reachable**.
The id exists in exactly one place a phase command can read: the live session record the
`UserPromptSubmit` hook writes. That store is a LIVENESS store with a 120-second TTL
(`DEFAULT_SESSION_TTL_SECONDS`, `src/mesh-session.mjs:49`) and a reaper that runs at every write
seam — measured directly: this session's own record was absent from `~/.aof/mesh/sessions/` while
two records for another workspace, written 60 seconds earlier, were present. **A phase cannot read
its own session id at its close.** That single fact decides ADR-001.

## Graph-derived coupling at each boundary

`aof graph impact`, from the edges, at the build stamped above:

| module | imported/called by | imports/calls |
|---|---|---|
| `src/story-contract.mjs` | `src/commands/validate.mjs`, `src/ready-wave.mjs` (+2 suites) | **(none)** |
| `src/ready-wave.mjs` | `src/commands/next.mjs` (+1 suite) | `src/story-contract.mjs` |
| `src/commands/validate.mjs` | `src/command-core.mjs` (+4 suites) | `src/phase-brief.mjs`, `src/story-contract.mjs`, `src/work-ref-scope.mjs`, `src/work.mjs` |
| `src/work-observe.mjs` | 5 production + 13 suites | `src/degrade.mjs` |
| `src/commands/continue.mjs` | `src/command-core.mjs` (+3 suites) | 7, incl. `src/effects/item-transitions.mjs` |
| `src/acceptance-horizon.mjs` | 6 production + 13 suites | **(none)** |
| `src/effects/item-transitions.mjs` | — | `src/work.mjs`, `src/effects/{dispatch,journal,table}.mjs`, `src/degrade.mjs` |

Two of those rows are load-bearing and both say the same thing: **`story-contract.mjs` and
`acceptance-horizon.mjs` import nothing, and two production modules each depend on the first.**
Every decision below that puts new code beside one of them rather than inside it is that row, not a
preference.

---

## ADR-001 — Attribution is captured at the mint, from the liveness store, and never guessed

**Status:** accepted · **Story:** 96/00

**Context.** `aof work observe` attributes an agent run to an item by joining a transcript's
`sessionId` against the item's own run records (`src/work-observe.mjs:670-693`), and the regex
fallback that once matched prose was retired under FF-6805, correctly. `buildSessionItemIndex`
builds that index from `readItemRuns`. No run records exist on the phase path, so the index is
empty and both committed snapshots report `runs.count: 0` against 408 and 216 unattributed runs.

Three facts constrain the repair, and all three were measured at this pass:

1. `CLAUDE_SESSION_ID` and `CLAUDE_PROJECT_DIR` are **unset** in a tool shell. The env rung of
   48/ADR-001's ladder is not reachable from a phase command.
2. The session presence store is a **liveness** store: `DEFAULT_SESSION_TTL_SECONDS = 120`, with
   `reapExpiredSessions` unlinking every expired leaf of this node at each `startSession` /
   `pingSession`. A record is guaranteed fresh for seconds, not for the length of a phase.
3. Two live records can share one `workspaceId` — measured, two `claude-code` sessions on
   `dea6d19a03529da6` at once. "The session for this workspace" is not a unique answer.

**Decision.**

§1 — **The run is minted at the TOP of the phase, never at its close.** The `UserPromptSubmit` hook
fires `aof session ping` on the very prompt that invoked the phase, so at mint time this session's
record is seconds old — inside the 120-second TTL by construction. At the close it may be gone. The
mint's position is therefore a correctness requirement, not sequencing taste.

§2 — **The ladder gains ONE rung, at the CALLER, and `resolveSessionIdentity` stays pure.**
`src/commands/mesh-session.mjs:71`'s resolver is pure over `{ stdinText, env }` and must stay so.
The new rung reads the store and therefore lives in the store's own home,
`src/mesh-session.mjs`, beside `readLiveSessions` — never as a second store reader elsewhere.
`work:run-start` consults it only when `--session` was not supplied; the flag keeps priority, which
is 48/ADR-001's order unchanged.

§3 — **Ambiguity resolves to ABSENCE, never to a guess.** The resolver returns a record only when
one live record for `(nodeId, workspaceId)` has a `lastPingAt` **strictly newer** than every other.
A tie, an empty store, or a store fault resolves `null`, and the run is minted with
`sessionId: null`. Reported honestly, an unattributable run costs one row in a snapshot; guessed,
it silently moves another item's tokens — which is the defect FF-6805 was retired for, rebuilt in a
different module.

§4 — **The source is reported by the FACE, and nothing is added to the run record's shape.**
`work:run-start --json` names which rung answered (`flag`, `live-store`, or none). The record
carries what `recordSessionId` already writes. A new field on the record would be a second
attribution vocabulary for `work-observe` to interpret.

**Consequences.** A phase run minted on an item at `not-started` moves it to `in-progress` through
`effects/table.mjs`'s existing `run.started` reactor — so the mint **replaces** the phase prompt's
hand-written `aof work status <ref> in-progress --if-applicable` step rather than adding one. Two
sessions driving the same item concurrently is refused by the existing `duplicate-run` guard, which
is correct and unchanged.

---

## ADR-002 — The phase closes its own run, and a phase that dies is reclaimed, not heartbeated

**Status:** accepted · **Story:** 96/00

**Context.** `src/run-store.mjs:593` enforces *"no duplicate non-terminal run per item"* and throws
`duplicate-run` (409) on a second mint. A phase that mints and never completes therefore blocks the
next phase on that item. The obvious mitigation is the heartbeat — but
`.claude/hooks/aof/run-heartbeat-enqueue.mjs` arms itself from `AOF_RUN_ITEM_DIR` and `AOF_RUN_ID`
**in the environment**, which only a driver-spawned session has. In an operator's own session both
are unset and the hot hook is a no-op on every prompt.

**Decision.**

§1 — The phase calls `work:run-complete` at its close, in the same position the phase prompt
already writes its status move.

§2 — **The phase run carries no heartbeat, deliberately.** Recovery is `work:run-start`'s existing
stale reclaim (`transitionStaleRunsReclaimed`, gated by `shouldRetry` and the configured attempt
ceiling), which already runs before every mint. A crashed phase's run goes stale and the operator's
next phase reclaims it — which is the behaviour wanted — and a live phase is unaffected because the
operator drives one phase at a time in one session.

§3 — **The hot hook is NOT armed from a pointer file.** Its header contract is that it *"derives no
workspace identity, opens no aof store, imports no framework module"*; a pointer would make it a
second authority for which run is live, on the one component in the system that must never block a
tool call. If §2's reclaim proves insufficient in practice, the repair is a bound on the phase run,
not a read inside that hook.

**Consequences.** An interrupted phase leaves a non-terminal run visible in `aof work run-status`
until the next mint reclaims it. That is a true statement about what happened, and it is the first
time the phase path has been able to make one.

---

## ADR-003 — `unattributedAgentRuns` gains a body, not a wider join

**Status:** accepted · **Story:** 96/00

**Context.** Today the figure is a bare count. 216 unattributed runs reported as `216` is honest and
unusable; the same 216 reported with their windows and token totals is the same truth, actionable.

**Decision.** The count becomes a count **and** a list: each unattributed run reports its session,
its active window and its spend, marked unattributed. The join itself does not widen — no prose
match, no ref-substring match, no heuristic. This is a face change and it is asserted as one:
FF-9601 requires that no module 96 touches introduces a second path from a transcript to an item
ref.

---

## ADR-004 — Derivation is a PROPOSAL, homed beside the parser, and the parser keeps its zero imports

**Status:** accepted · **Story:** 96/01

**Context.** The declaration concept has exactly three homes today, enumerated from the graph and
confirmed by grep: `src/story-contract.mjs` (the parser and path resolver — `storyContractList`,
`resolveStoryContractPath`, `namesBackslashPath`, `storyAnchorResolves`), `src/commands/validate.mjs`
(the gate) and `src/ready-wave.mjs` (the wave partition). There is no derivation home. The parser
**imports nothing**, and both production consumers depend on it.

**Decision.**

§1 — Derivation lands in `src/story-contract-derive.mjs`, a new leaf beside the parser. Putting it
inside `story-contract.mjs` would give `validate.mjs` and `ready-wave.mjs` a transitive dependency
on a graph reader, on the strength of a concern neither of them has. The graph row above is the
argument: that module's `imports → (none)` is a property worth keeping.

§2 — **The graph is READ, never BUILT**, through the shipped `normalizeGraph` / `computeImpact`
only — 72/ADR-002 §1's rule, restated because a second module now depends on it. No second graph
reader, no second parse of `graph.json`. An absent or unreadable artifact yields a proposal derived
from the citations alone, saying so.

§3 — **Three sources, ranked, and each names why it proposed a path.** The subject files the author
names; the graph's imports and call sites around them; and the contract's own `file:line` citations
in `SPEC.md` and the ADRs. Every proposed entry carries its reason, because a proposal an author
cannot audit is one they will accept wholesale.

§4 — **The test lane is derived from the source set, not recalled.** A story writing `src/x.mjs`
whose write set omits the suite that owns `src/x.mjs` has an incomplete write set. This is the leg a
downstream retrospective records missed three stories running, and it is the one leg that is pure
convention rather than graph coupling — so it is derived by the repository's own root/extension
rule (`isSuiteFile`'s predicate shape) and never inferred at build time.

§5 — **It PROPOSES. It never writes a declaration.** The author subtracts. An over-broad proposal
costs a serialised wave — cheap and visible. A tool that silently narrowed an author's set would
manufacture the exact defect this milestone exists to cure, and FF-9602 asserts the module holds no
write path to a `STORY.md`.

**Consequences.** Refine does more work per story; the milestone only pays if `aof-developer`'s
2,059,059 cache-create falls further than `aof-architect`'s 793,788 rises. 96/00 is what turns that
from an argument into a number, which is why it lands in the same wave.

---

## ADR-005 — The frontmatter is the single home of the file table; `PLAN.md` restates no path

**Status:** accepted · **Story:** 96/02 · **Answers:** 96/STATE's open question, *"where does the
file table live?"*

**Context.** STATE named the fork and refused to default it: either `PLAN.md` carries the table and
the frontmatter is generated from it, or the frontmatter is the home and the plan references it.
`ready-wave.mjs` already consumes `files:`, `validate.mjs` already checks it, and 96/01 now derives
it.

**Decision.** The frontmatter is the single home. **`PLAN.md` restates no declared path at all** —
not as a table, not as a list, not in prose. It carries exactly the two things the frontmatter
cannot: **the mechanism** (the seam, in a few sentences) and **the verification step** (the check
that proves the story works). Those two are precisely the vendor guidance's remaining half; the
other half is already `reads:` and `files:`.

15/R1's lesson is the reason: *"a sanctioned count generalised in two places usually lives in a
third."* A plan that carried the table would be the second list, and the third would be whichever
agent transcribed it.

**Consequences.** The one-page limit becomes nearly self-enforcing — a document forbidden from
listing files has little left to be long about. FF-9603 asserts the restatement ban structurally,
over the shipped template and over any `PLAN.md` in the stream.

---

## ADR-006 — The plan's length is the existing doc-budget lane's business, not a new check

**Status:** accepted · **Story:** 96/02 · **Answers:** 96/02's open question, *"is over-length a
`validate` finding or a refine-time stop?"*

**Context.** Milestone 16 shipped per-artifact line budgets: `BUDGET_KEY` maps a filename to a kind
(`src/work-doctor-budget.mjs:21`), `DEFAULT_BUDGETS` holds the numbers in one place
(`src/work-doctor.mjs:689`), `budgetsFromConfig` resolves `work.doctor.budgets` over them, and
`doc-over-budget` fires at **warn** on a stream sweep and becomes a **refusal** only in the
accepting item's scoped preflight (m16/ADR-007). This repo already sets
`work.doctor.budgets.architecture: 1400`.

**Decision.**

§1 — `PLAN.md` joins that family: one row in `BUDGET_KEY`, one key in `DEFAULT_BUDGETS`
(`plan: 80`), one key in `budgetsFromConfig`. No new check, no new finding code, no new severity.

§2 — **Not a refine-time stop.** A stop authored and evaluated by the same agent is the thing this
milestone's story 04 argues is not a gate; adding one here would be arguing both sides in one
milestone. The existing ladder — warn on the sweep, refusal at the accepting item's preflight — is
already the right shape and is already built.

§3 — The authoring guidance in the template is tighter than the budget (≈60 lines against 80),
mirroring the `feature` kind's own ~150-against-300 convention: advisory guidance ahead of the hard
warning.

§4 — The gate is `work.plan.enabled` (boolean, default **false**), validated in
`src/config-inspect.mjs` beside the other `work.*` validators. No module in `src/` needs to read it
to make the plan work: the refine command already reads `.aof/aof.config.json` itself, and the
budget lane budgets a `PLAN.md` if one is present and is silent if one is not.

---

## ADR-007 — Story-scoped selection is a new INPUT to the shipped selector, never a second selector

**Status:** accepted · **Story:** 96/03 · **Supersedes** the SPEC's `src/test-selection.mjs`

**Context.** See "Context this milestone inherits" §1. Milestone 72's selector, its changed-set
producer, its four widening reasons, its three refusals and its two controls are all in service.

**Decision.**

§1 — 96/03 adds a **changed-set source**, beside `src/work-test-changed.mjs`'s git source: the
story's own declared `files:`, read through `story-contract.mjs` — the parser, not a fourth reader.
`selectSuites` is called unchanged.

§2 — **No fourth scope.** `TEST_SCOPES` stays `impacted | file | all`, and `src/commands/test.mjs`
keeps refusing an absent scope rather than defaulting one. The story lane runs
`aof test --scope impacted --story <ref>`, where `--story` swaps which producer supplies `changed`.
A `--story` naming an unresolvable ref is a refusal, never an empty changed set — the same shape as
`SINCE_REV_UNRESOLVABLE`, and for the same reason.

§3 — **The widening invariant does the hard part for free, and this is why the design is safe.**
The tests a developer is about to write do not exist yet; a declared path the graph reports
`present: false` therefore widens under `not-in-graph`, exactly as a file created this turn already
does on the git path. Nothing new is needed to handle the case the SPEC flagged as the trap, and
nothing may be added that narrows it — FF-9604 asserts no narrowing path enters the selector.

§4 — `--story` and `--since` are mutually exclusive: two changed-set sources in one run is two
answers, and picking one silently is the narrowing this family forbids.

**Consequences.** The saving is per-run and concentrated in the review lanes (58.6% of one measured
behavioural review's wall was `vitest`), not per-milestone (7.8% of span here). The contract states
that, so nobody later reads a modest milestone number as a failure of the mechanism.

---

## ADR-008 — The regression gate: an existing boolean made durable, and a door that refuses with an override that is data

**Status:** accepted · **Story:** 96/04 · **Answers:** 96/04's open question, *"does an ungated
milestone refuse `done`?"*

**Context.** `aof test --scope all` already computes `gate: scope === "all" && widened.length === 0`
and then discards it. 63/R7 records the escape that proves the gate is load-bearing (F-63-H: a story
lane green, the failure appearing only at the full-suite gate). Against that: m66 faced this exact
choice for the observability report and declined — *"the measure→decide path already works through a
human"* — and 63/R12 records a milestone accepted with two rows unobserved because the environment
could not host them, which a hard gate would have blocked.

**Decision — the door refuses, and the override is recorded.**

§1 — **The result is a record, not a boolean.** A peer document in the milestone's own folder,
`REGRESSION.md`, following 78/ADR-001's law verbatim: a frozen `h2`, a frozen table header row, one
row per gate run carrying the commit, the instant, the scope, the result and what failed. Never a
section of `VERIFICATION.md` (whose single writer is the product owner) and never under `runs/` or
`observability/`, both declared rebuildable or deletable by their own headers. A boolean cannot be
diffed against the next milestone; a table can.

§2 — **The gate runs where nothing else is writing.** The verb refuses on a dirty tree and names the
commit it ran against. A gate run inside whichever lane happens to hold the tree measures that lane,
not the milestone — a downstream retrospective records two agents red-probing on one checkout and
getting silently unreliable results.

§3 — **The door is in the COMMAND layer.** `src/commands/item-status.mjs` refuses the move to `done`
with `regression-gate-missing` or `regression-gate-red`. `src/acceptance-horizon.mjs` is untouched:
it imports nothing by 66/ARCHITECTURE ROUND 3/3 and 66/02's FF-6605 forbids the controls lane
reaching `node:fs`, so the predicate cannot read a record and stay legal.

§4 — **The override is data, and it is recorded.** `--gate-override "<reason>"` permits the move and
writes the reason into `REGRESSION.md` as its own row. This is `--if-applicable`'s idiom (74/00 — an
expected refusal rendered as data rather than a 409) applied to the one case m66 and 63/R12 both
name: an environment that genuinely cannot host the run. An override with no reason is refused; the
reason is the whole mechanism. What is NOT admitted is an agent reporting the gate as passed, which
is the sentence 96/04 exists to write.

§5 — **Scope of the refusal: milestones only.** A story's `done` is unaffected — the gate is bought
back at the milestone door, which is where 03 sold it.

**Consequences.** This is the first hard gate on the accept door in this stream, and it will block a
real milestone one day. §4 is the answer, and the reason it lands as a recorded row rather than a
flag is that a silent override is indistinguishable from no gate at all within two milestones.

---

## Fitness functions

<!-- Each structural invariant from an ADR, paired with the arch-test that enforces it in CI.
     The arch-test lands with its subject story, so `pending` clears story by story.
     `pending` reports at warn while 96 is open and is NOT admitted at accept — `aof work doctor 96`
     reports each unresolved control as `control-unresolved`, and what clears it is landing the file
     or dropping the declaration, never re-marking it `pending`.

     Each declared control also owes a RED PROBE in VERIFICATION.md once it lands: what was changed
     to make it fail, and the message observed.

     ONE ROW, ONE CONTROL FILE. Six rows name six distinct paths, and the partition below creates
     exactly those six — every row's file appears in exactly one story's `files:`, and every story
     except 96/02 creates at least one (96/02's single control, FF-9603, is its own).

     HARNESS SHAPE: every arch-test here exports an array of `{ name, run }` — never `{ name, fn }` —
     and is imported AND spread in `scripts/test.mjs`'s registry inside its own labelled story block.
     A suite imported and not spread is not registered; that is 59/FF-5903's finding, and it is why
     `scripts/test.mjs` appears in every story's `files:`.

     DELIBERATELY NOT RESTATED, because a control already in service walks the whole subject:
       · "the selector never narrows on an unknown, and no flag exists to make it" — 72/FF-7202.
         ADR-007 §3 adds a changed-set SOURCE inside a rule that control already asserts over the
         selector; FF-9604 asserts the new source cannot smuggle a narrowing past it, which is a
         different claim about a different module.
       · "which suite file contributed which entries is decided once" — 72/FF-7203.
       · "`src/work-toolchain.mjs` is the only module in `src/` that may read `work.test.*`" —
         72/FF-7201. ADR-007's producer reads a story's frontmatter, never config, and is covered
         on arrival.
       · "the acceptance horizon is one predicate with one home" —
         66/`acd-acceptance-horizon-single-predicate`. ADR-008 §3 puts the door OUTSIDE it precisely
         so that control stays green; FF-9605 asserts the outside-ness rather than restating it.
       · "a doc at its budget is healthy, and over-budget is a warn that refuses only at the
         accepting item's preflight" — m16/ADR-007's controls. ADR-006 adds a row to their map and
         claims nothing about their behaviour. -->

| id | invariant | enforced by (arch-test) | from |
| --- | --- | --- | --- |
| FF-9601 | **Attribution is CAPTURED or ABSENT, and there is exactly one path from a transcript to an item ref.** No module 96 touches introduces a second transcript→item join: the `sessionId` join in `src/work-observe.mjs` is asserted to be the only one, with no ref-substring, prose or heuristic match anywhere in the 96 module set — the retired FF-6805 path asserted absent by shape, not by comment. The session-id rung is asserted to live in `src/mesh-session.mjs` and nowhere else — no second reader of `~/.aof/mesh/sessions`, and `resolveSessionIdentity` (`src/commands/mesh-session.mjs`) asserted STILL PURE over `{ stdinText, env }`, reading no filesystem. Ambiguity is asserted to resolve to `null`: driven with zero live records, with two records tied on `lastPingAt`, and with one strictly-newest record, the first two must yield no id. The `--session` flag is asserted to win over the store rung. The run record's field set is asserted UNCHANGED — the answering rung is reported by the command's own envelope, never written onto the record. | `test/arch/acd-attribution-is-captured-or-absent.test.mjs` | ADR-001, ADR-003 |
| FF-9602 | **Derivation PROPOSES, reads a graph it never builds, and the parser it sits beside keeps its zero imports.** `src/story-contract.mjs` is asserted to import nothing at all — the property ADR-004 §1 protects, asserted over the module rather than assumed from the graph. `src/story-contract-derive.mjs` is asserted to hold no write path to any `STORY.md`: no `writeFile`/`writeText`/`Edit` of an item document, and no import of `src/fs.mjs`'s write seam. It is asserted to reach the graph ONLY through `normalizeGraph`/`computeImpact` — no second `JSON.parse` of a graph path, no `graph build` invocation of any form, no child process — the same census shape 72/FF-7204 runs over its own family, over a different subject. Every proposed entry is asserted to carry a reason drawn from a CLOSED exported set, so a seventh source is an edit with an ADR behind it. An absent and an unreadable graph artifact are each driven and required to yield a citation-only proposal that SAYS so, never an empty one. | `test/arch/acd-derivation-proposes-never-writes.test.mjs` | ADR-004 |
| FF-9603 | **The plan restates no declared path, and its length is governed by the one budget family.** The shipped `src/bundle/templates/story/PLAN.md` is asserted to contain no `files:`/`reads:` key, no path-shaped literal under a source root, and no table whose header names a file column — asserted over the template AND over every `PLAN.md` present in `wiki/work`, so the ban is a property of the stream rather than of one file. `PLAN.md`'s budget is asserted to be resolved through `budgetKeyFor` and `budgetsFromConfig` with the number living ONLY in `DEFAULT_BUDGETS` — no literal at a comparison site — and the plan kind is asserted to fire the EXISTING `doc-over-budget` code, with no new finding code and no new severity introduced by 96. `work.plan.enabled` is asserted to default false and to be read by no module in `src/` outside its validator. | `test/arch/acd-plan-restates-no-declared-path.test.mjs` | ADR-005, ADR-006 |
| FF-9604 | **ONE selector, and a declared path the graph does not know WIDENS.** No module 96 adds exports a suite-selection function, and `selectSuites` is asserted to be the only one in `src/` — the second-authority species stated structurally rather than trusted to review. The declared-set producer is asserted to reach a story's `files:` through `storyContractList`/`resolveStoryContractPath` and through no second parse of frontmatter. A declared path the planted graph reports `present: false` is driven and required to WIDEN under an existing `WIDENING_REASONS` member — never to be dropped, and never under a fifth reason, with `WIDENING_REASONS` asserted still four. `--story` with `--since` is asserted refused, and a `--story` naming an unresolvable ref is asserted to be a refusal rather than an empty changed set. `TEST_SCOPES` is asserted still three. | `test/arch/acd-one-selector-one-changed-set.test.mjs` | ADR-007 |
| FF-9605 | **The gate door lives in the command layer, and the acceptance horizon still imports nothing.** `src/acceptance-horizon.mjs` is asserted to import nothing and to name no gate, record or path literal — the 66/ADR-002 property that ADR-008 §3 exists to preserve. The two refusal codes are asserted to be raised in `src/commands/item-status.mjs` and to be disjoint from `CONTROL_FINDING_CODES` and from doctor's own set. The refusal is asserted to be scoped to `type: milestone`: a story moving to `done` with no gate record is driven and required to pass. `--gate-override` is asserted to require a non-empty reason, and the override is asserted to be recorded — a permitted move with no new row in the record is a failure of this control. | `test/arch/acd-gate-door-lives-in-the-command-layer.test.mjs` | ADR-008 §3, §4, §5 |
| FF-9606 | **The gate's result is EVIDENCE: a record with a frozen shape, in the item's own folder, that a rerun appends to rather than overwrites.** `REGRESSION.md` is asserted to be written only under the milestone's own directory — never under `runs/` or `observability/`, asserted by the resolved write path, which is 78/ADR-001's rule applied to a second record. Its `h2`, header row and divider are asserted to be exported frozen constants with no second copy at a comparison site. Every row is asserted to carry a commit, an instant, a scope and a result, with a row missing any of the four asserted UNREADABLE rather than silently ignored — a half-parsed row rendering as a green gate is the one failure this document cannot have. A second gate run is asserted to APPEND: the earlier row survives, so the door reads the newest and the milestone can be diffed against the last one. A run whose scope is not `all`, or whose selection widened, is asserted to be recorded and to NOT satisfy the door. | `test/arch/acd-gate-result-is-evidence.test.mjs` | ADR-008 §1, §2 |

## Story partition

The landing order is **{96/00 ‖ 96/01} → {96/02 ‖ 96/03} → {96/04}** — three stages. 96/00 and
96/01 share no file and no concept; 96/02 and 96/03 both consume 96/01's accuracy and are
independent of each other; 96/04 needs 96/03's narrowing to exist before its gate is load-bearing.

- **96/00** — the run record on the phase path: `src/mesh-session.mjs`,
  `src/commands/run-start.mjs`, `src/work-observe.mjs`, the two phase command documents
  (stage 1) — FF-9601
- **96/01** — the sets are derived: `src/story-contract-derive.mjs`, `src/commands/validate.mjs`,
  `src/bundle/commands/refine.md` (stage 1) — FF-9602
- **96/02** — the plan document: `src/bundle/templates/story/PLAN.md`,
  `src/work-doctor-budget.mjs`, `src/work-doctor.mjs`, `src/config-inspect.mjs` (stage 2,
  needs 01) — FF-9603
- **96/03** — the test run matches the story: `src/work-test-declared.mjs`,
  `src/commands/test.mjs` (stage 2, needs 01) — FF-9604
- **96/04** — the regression gate: `src/commands/regression-gate.mjs`,
  `src/commands/item-status.mjs`, `src/regression-record.mjs` (stage 3, needs 03) — FF-9605, FF-9606

**Two write-set overlaps are real and are named rather than discovered.** `scripts/test.mjs` is in
every story's `files:` — the registry every new suite must be spread into (59/FF-5903), which the
house already accepts as a serialising edge. And `src/bundle/commands/refine.md` is written by
96/01 alone: 96/02's plan-authoring instruction is a **96/01-authored** line in the same file, added
in 96/01's own beat, because two stories writing one prompt document in one wave is the collision
`ready-wave` exists to prevent.

## Default decisions taken under `--autonomous`

Recorded here rather than raised, per the cascade's own rule. Each was a non-critical fork with a
defensible default; none is unsafe or irreversible.

1. **The gate record's basename is `REGRESSION.md`** (ADR-008 §1) rather than a section of an
   existing document — following 78/ADR-001's precedent for `EXECUTION.md`, whose reasoning about
   `VERIFICATION.md`'s single writer transfers verbatim.
2. **`plan: 80` lines** (ADR-006 §1), with template guidance at ≈60 — calibrated to the existing
   family's advisory-ahead-of-warning convention, not measured, because no `PLAN.md` exists yet to
   measure. The number lives in `DEFAULT_BUDGETS` and is a one-line change once there is a
   distribution to calibrate against.
3. **`--story <ref>` as the flag name** on `aof test` (ADR-007 §2), over `--declared` or
   `--item` — it names what the caller has.
4. **96/00's phase set is `refine` and `continue`**, as the story declared. `verify` is not
   included: it is the accept phase, its agent spend is small beside the two build phases, and
   96/04 is already changing its prompt. Adding it later is a two-line change in one document.
