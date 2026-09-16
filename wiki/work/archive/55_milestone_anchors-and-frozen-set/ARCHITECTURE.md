---
doc: architecture
---
<!--
  Milestone ARCHITECTURE.md — answers ONE question: how did we decide to build it, and why that way?
  Owner: architect. A log of ADRs: numbered, IMMUTABLE, superseded-not-edited.
  Does NOT contain observable behaviour (→ task .feature files) — only the structure behind it.
-->
# 55 · Anchors & the frozen set — Architecture Decisions

> **Inputs.** This milestone's `SPEC.md` (Objective + Scope — six deliverables: the anchor taxonomy,
> an anchor edge per loop plus the groundedness report, provenance stamped at write time, anchor
> integrity, the frozen set declared and compiled, L3 unlocked) and `RESEARCH.md` (measured
> 2026-08-26 at `5038d5c`; every line reference and count below is cited as `RESEARCH §Qn` rather
> than re-derived). Upstream: `wiki/planning/PRD-acd-loop-engineering.md`,
> `wiki/planning/PRD-graph-engineering.md`.
>
> **Neighbours whose boundaries these ADRs must not cross.** `57` (paired loops), `59` (audit
> loops), `61` (the acceptor) and `63` (event triggers) all carry `55` in their `depends`, so every
> contract frozen here is one four milestones read. `78` (the loop execution record) is `not-started`
> and depends on `52, 53, 79` — **not** on 55 — and its scope names *"an authority that could not be
> resolved"* as a row in its own per-item record. ADR-002 §5 draws that line explicitly so the two do
> not both build a resolver.
>
> **Graph grounding (measured, not inferred).** `aof graph build .` → **12504 nodes / 30557 edges**,
> `builtAt 2026-08-26T12:53:44.452Z`, egress none. `aof graph impact` on every candidate boundary:
> `src/work-loops.mjs` — 18 dependents, **3 production** (the three `loops-*` commands);
> `src/work-loops-checks.mjs` — 8 dependents, **1 production**, imports **nothing**;
> `src/work-loop.mjs` — 22 dependents, **1 production** (`src/commands/loop.mjs`);
> `src/claude-settings.mjs` — 9 dependents, **4 production** (the install doors);
> `src/work-doctor-loop-ready.mjs` — 5 dependents, **1 production**;
> `src/work-grade.mjs` — 15 dependents, **3 production**, imports **nothing**.
> Four almost-disjoint clusters, each with a single production door. `src/work.mjs` (the stream's
> god-node) is touched by **no** boundary in this milestone, exactly as in 52. RESEARCH §Q7.
>
> **Memory recall (role-scoped, run once).** `aof work memory recall "<the decision in a few words>"
> --area architecture --block` and the PO's item-scoped recall both returned **empty blocks** on
> 2026-08-26 — nothing to surface, memory may be off. Proceeding unchanged, and recording the empty
> result rather than implying a recall was skipped.

---

## ADR-001: An anchor is a NODE (`kind: anchor`) carrying a widened `ground:` class, not a field on a loop — the taxonomy widens two frozen enums additively and deletes nothing

**Status:** Accepted
**Date:** 2026-08-26

**Context.** 52 pre-authorised this milestone's shape twice, in writing. `52/ADR-002` freezes `kind`
as a CLOSED set with the note *"55 may ADD members; it may not remove one"*. `52/ADR-005 §4` is more
explicit still: 55 *"widens the `ground:` value enum (adding `process-exit`, `build-stamp`,
`landed-commit`, `live-soak`, `frozen-rule`, …), widens the `kind:` enum if it wants anchor nodes,
and adds provenance keys"*, with every 52-era record staying **valid verbatim**. The design question
is therefore not *whether* to widen but *where the anchor lives* — and one measured fact decides it.

`checkGrounding` (`src/work-loops-checks.mjs:163`) computes groundedness as forward reachability
over the five edge keys, seeded by exactly one predicate: `node.kind === "actor" && ground.kind ===
"enum" && ground.value === "exogenous"` (`:169-172`). The flood (`:176-184`) and the Tarjan SCC
decomposition (`decomposeLoopGraph`, `:118-161`) are entirely generic — **only the seed is
exogenous-specific** (RESEARCH §Q4). An anchor expressed as a node bearing `ground:` therefore
requires widening a predicate; an anchor expressed as a field on a loop would be a *second,
parallel* grounding mechanism the SCC algorithm cannot see, and the milestone whose headline
algorithm is "which components have no path to ground" would have two answers to that question.

**Decision.**

**1 — `kind` gains exactly one member: `anchor`.** `NODE_KINDS` becomes
`frozenSet("loop", "actor", "anchor")` (today `("loop", "actor")`, `src/work-loops.mjs:84`). Nothing
is removed. `kind: actor` keeps its meaning unchanged.

**2 — `ground:` widens to the SPEC's three taxonomy branches, as a flat closed enum.**

| `ground:` value | branch | what it asserts |
|---|---|---|
| `process-exit` | external validation | a test process was observed exiting, and the code was read |
| `build-stamp` | external validation | the build id on the binary that is actually running |
| `landed-commit` | external validation | a commit that is in the repository's history |
| `live-soak` | external validation | an observation of the running system over time |
| `frozen-rule` | frozen rules | a rule the optimizer is not permitted to touch (ADR-005) |
| `exogenous` | exogenous human judgment | **52's, unchanged** — the human's ruling |

`GROUND_VALUES` (today `frozenSet("exogenous")`, `src/work-loops.mjs:91`) becomes the six above.
The enum is **flat, not nested by branch**: the branch is a property of the taxonomy's prose, and a
two-level value would not survive `parseFrontmatter`'s flat-scalar grammar (`52/ADR-001 §5`).

**3 — `ground:` is admitted on `kind: actor` and `kind: anchor`, and on NO `kind: loop` node, ever.**
`52/ADR-005`'s sharpest rule is preserved verbatim: *"a loop asserting its own ground is the circular
confirmation the check exists to detect."* Widening the enum must not widen the *host*. Today
`ground` appears in `ACTOR_KEYS` and not `LOOP_KEYS` (`src/work-loops.mjs:77-78`); after this
milestone it appears in `ACTOR_KEYS` and `ANCHOR_KEYS` and still not `LOOP_KEYS`.

**4 — `ground: exogenous` on an actor stays legal, and stays the WEAKEST class.** `52/ADR-005 §3`
requires that no grounded verdict is ever reported unqualified. That survives: the report names the
class (ADR-002), and a component whose only ground is `exogenous` still reports as
`loop-graph-grounded-exogenous-only`. 52's day-one records — nine of them, delivered through the
bundle — parse **byte-unchanged**, and `loops/operator.md`'s `ground: exogenous` is now a member of
the taxonomy rather than a placeholder awaiting removal.

**5 — The anchor node's required keys.** `id: anchor:<slug>` (matching the filename stem, as
`52/ADR-002` requires of every node), `kind: anchor`, `title`, `ground: <class>`, and **`observes:`**
— a single pointer, in 52's three schemes, naming the authority that PRODUCES the reading. An anchor
whose `observes:` is `prose:` or `unknown` is **refused at schema level**: the whole point of an
anchor is that the reading has a machine-readable producer, so the honesty sentinels that rescue a
loop's fields would here be an anchor that anchors nothing. This is the one place in the registry
where `prose:` is not admitted, and it is deliberate.

**Alternatives considered.**

- *An `anchor:` field on each loop record* — **rejected on the measured algorithm.** It creates a
  second grounding mechanism invisible to `checkGrounding`'s traversal, so "is this component
  grounded" gets two computable answers that can disagree. It also puts a ground claim on the loop
  itself, which is exactly the self-issued-anchor failure `52/ADR-005` rejects.
- *Reuse `kind: actor` for anchors* — **rejected:** an actor is an agent that acts; an anchor is a
  reading that is taken. Collapsing them makes `ground: process-exit` legal on `actor:product-owner`
  and re-opens the door `52/ADR-005 §1` closed (*"an LLM agent is not exogenous ground"*).
- *A nested `ground: { class, …}` map* — **rejected:** outside `parseFrontmatter`'s grammar
  (`52/ADR-001 §5`), and widening the 240-dependent god-node's parser for one field is the trade 52
  refused and this milestone has no better reason to make.
- *Admit `prose:` on `observes:`* — **rejected:** it would let the registry's honesty measurement
  ("how much is still paragraph-backed") read a *paragraph* as an anchor. An anchor is precisely the
  node class where a paragraph is not enough.

**Consequences.** The widening is a strict superset in both enums, so 52's records, 53's delivered
`.aof/loops/` install, and every consumer reading `Field.kind` are unaffected. The day-one anchor set
(ADR-006) is what turns the widening from a vocabulary into a fact.

**Invariant.** `NODE_KINDS` and `GROUND_VALUES` equal their new frozen literals exactly and are
supersets of 52's; `ground:` is admitted on `kind: actor` and `kind: anchor` and on no `kind: loop`
node; every `kind: anchor` node carries `observes:` as a pointer in one of the three schemes, never
`prose:` and never `unknown`; every record delivered by 52 parses with zero new findings.
(Enforced by `FF-5501`.)

---

## ADR-002: An anchor edge is declared OUTBOUND from the anchor, the missing one is COMPUTED rather than required as a key, and the groundedness report is a first-class `--json` face over four verdicts

**Status:** Accepted
**Date:** 2026-08-26

**Context.** `52/ADR-004` fixed edge declaration: five closed keys, **declared on the SOURCE node
only, outbound**, meaning `<this node> --<type>--> <each endpoint>`. The SPEC asks for *"an anchor
edge per loop"*, which reads like a key on the loop — and would be, if edges were declarable at
either end. They are not, and making them so would let the anchor and the loop disagree about
whether an edge exists, with nothing to arbitrate.

The SPEC also promotes the groundedness report *"from a 52 finding to a first-class report"*, naming
three states — **anchored / self-referential / stale**. 52 issues two findings today
(`loop-graph-grounded-exogenous-only`, `loop-graph-ungrounded-component`,
`src/work-loops-checks.mjs:48-51`) and has no notion of stale at all, because it never resolves a
pointer (`52/ADR-003`).

**Decision.**

**1 — The anchor declares the edge, outbound, using the existing `data-feed` key.** An anchor's
output is an input to the loop it grounds; that is `data-feed`'s meaning verbatim (`52/ADR-004`). No
sixth edge key is introduced — the vocabulary stays closed at five, and `57`, `59` and `61` inherit
the same five.

**2 — "An anchor edge per loop" is a COMPUTED property, never a required frontmatter key.** A
`kind: loop` node with no inbound edge from any `kind: anchor` node yields **`loop-anchor-absent`**.
Absence is the finding; there is no sentinel for it and none is wanted (`52/ADR-004 §1`'s own rule
for edge absence). A required `anchor:` key would be satisfiable by fabrication, which is the failure
`52/ADR-002` was written to prevent.

**3 — The report is FOUR verdicts per component, and every one names its ground class.**

| verdict | meaning |
|---|---|
| `anchored` | reachable from a node whose `ground:` is an external-validation or frozen-rule class, and every anchor on that path RESOLVES |
| `exogenous-only` | reachable from ground, but only via `ground: exogenous` — 52's warn, preserved verbatim |
| `self-referential` | a component with no path from any ground node — 52's `loop-graph-ungrounded-component`, renamed in the report and kept as the finding code |
| `stale` | reachable from an anchor whose `observes:` pointer **no longer resolves** — the branch `52/ADR-003` assigns to this milestone by name |

`stale` is the only genuinely new verdict, and it is **strictly worse than `anchored` and strictly
better than `self-referential`**: an anchor that resolved once and does not now is a different fact
from one that never existed, and collapsing them repeats the `unknown`-vs-`uncapped` mistake
`52/ADR-002` refused.

**4 — Resolution happens at the COMMAND boundary; the checks module stays PURE.** `52/ADR-003`'s
purity invariant (`acd-loop-checks-pure`) is why `src/work-loops-checks.mjs` imports nothing
(measured: 0 imports, RESEARCH §Q7) and why its 8 dependents can test it trivially. The resolver
therefore lives at the command face, which gathers `{ resolved: boolean }` per anchor and passes it
IN — the same shape `53/ADR-007` uses for the Loop-Ready score and `54` uses for `compileGrade`'s
injected observation. The pure check consumes a resolution map; it never performs one.

**5 — The line against 78, stated so neither milestone builds the other's resolver.** 55 resolves
**registry pointers** — an anchor's `observes:`, and the `reference`/`measurement`/`actuator` fields
`52/ADR-003` deferred — and reports staleness **per component, framework-wide**. `78` reports *"an
authority that could not be resolved"* **per work item, in a committed per-item document**, and
depends on `52, 53, 79`, not on 55. If 78 lands first it consumes 55's resolver when 55 exists and
reports the gap plainly until then; if 55 lands first, 78 has a resolver to call. Neither is blocked
on the other, and **neither writes a second resolver** — 78's record is a face over 55's answer.

**6 — Where the resolution VERDICT may be recorded.** Nowhere, in this story, without a provenance
stamp — see ADR-003. A `stale` verdict is a claim about the world, and `52/ADR-003` rejected shipping
one in 52 precisely because *"a resolver without provenance is an instrument nobody can audit"*.

**Alternatives considered.**

- *A sixth edge key, `anchoring`* — **rejected:** the five-key vocabulary is frozen and read by four
  downstream milestones; `data-feed` already means what an anchor edge means. A sixth key buys a
  synonym and costs every consumer's closed set.
- *Require `anchor:` on every loop record* — **rejected:** it is satisfiable by fabrication, and
  `52/ADR-005 §Consequences` already warns story authors off *"declaring an operator edge to every
  loop just to clear the check"*. The same temptation, one milestone later, with higher stakes
  because L3 gates on the result.
- *Fold `stale` into `self-referential`* — **rejected:** they are opposite epistemic states (one
  anchor decayed, the other never existed), and the distinction is exactly what tells an operator
  whether to fix a pointer or build an anchor.
- *Resolve inside the pure checks* — **rejected:** it breaks the invariant that lets 55/01 be built
  and tested in parallel with everything else, and it would make the SCC decomposition
  filesystem-dependent for the benefit of one field.

**Invariant.** No sixth edge key exists; `loop-anchor-absent` is emitted for every `kind: loop` node
with no inbound `data-feed` from a `kind: anchor` node; the report's verdict set equals the four
frozen literals; and no module under `src/work-loops-checks.mjs` performs a filesystem, process or
dynamic-import read. (Enforced by `FF-5502`, `FF-5503`.)

---

## ADR-003: Provenance is a frozen four-key envelope, stamped by ONE writer seam at write time, with every value INJECTED into a pure compiler — and a claim that arrives without one is refused, never back-filled

**Status:** Accepted
**Date:** 2026-08-26

**Context.** `SPEC §Scope` states both halves of the rule and the reason for the second:
*"`{producing node, run, commit, timestamp}` on recorded claims, so an anchor reading is defensible
rather than asserted"*, and — in the Objective — *"back-filling it from transcripts is guesswork"*.

RESEARCH §Q3 measured that all four values are already available and none is stamped: `deriveNodeId`
(`src/node-identity.mjs:169`), the run record under `runsDir(item)` (`src/run-store.mjs:233-235`),
`headCommit` (`src/mesh-worktree.mjs:345-350`, which returns `null` rather than throwing when git is
unavailable), and an injected timestamp. The gap is sharpest on the arc's most claim-shaped artifact:
the grade record carries `gradedAt` and **nothing else of the four** (`src/work-grade.mjs:341-348`).

`compileGrade` also supplies the discipline to copy. It is a pure compiler over an injected
observation — *"gradedAt an INJECTED timestamp; this module reads no clock"* (`src/work-grade.mjs:391`)
— with the impure edge gathering facts at the command boundary. That is why it is trivially testable
and why 54's verdict rules are auditable at all.

**Decision.**

**1 — The frozen envelope.** Four keys, all required, no fifth:

```js
Provenance = {
  node:   <nodeId>,            // the producing node's id — never a hostname
  run:    <runId> | null,      // the run under which the claim was produced
  commit: <sha> | null,        // the checkout's HEAD at write time
  at:     <ISO-8601 instant>,  // INJECTED; no module in this milestone reads a clock
}
```

`run` and `commit` are **nullable and the null is meaningful** — a claim produced outside a run, or
in a checkout with no git, is a weaker claim and says so. `node` and `at` are never null: a claim
whose producer or instant is unknown is not defensible in any degree, and admitting a null there
would recreate the "declared gap equals filled field" collapse `52/ADR-002` exists to prevent.

**2 — One stamper, and the compiler stays pure.** A single module owns the envelope's shape and the
predicate "is this record stamped". The values are gathered at the impure command edge and INJECTED;
the module that builds a record reads no clock, no filesystem and no git — `compileGrade`'s shape,
for `compileGrade`'s reason.

**3 — A claim without a stamp is REFUSED at the write, not stamped with a guess.** The writer
refuses with a coded finding rather than synthesising a plausible `{node, run, commit, at}`. This is
the rule the SPEC calls out and it is the one that makes the whole envelope worth having: a stamp
that the writer will invent when absent is not evidence, it is decoration.

**4 — NO BACK-FILL, structurally.** No module in this milestone derives provenance from a transcript,
a log, an mtime or a directory listing. This is `FF-5504`'s second leg and it exists because the
cheapest wrong implementation — walk `~/.claude/projects` and infer the producing session — is
exactly what the Objective names as guesswork.

**5 — An anchor READING rides the run record, and specifically NOT `.aof/loops/`.** RESEARCH §Q3
measured the trap: `53/ADR-012` made the registry an INSTALLED bundle artifact whose single source is
`src/bundle/loops/`, with a consumer's edit drift-warned. A per-workspace reading written there is
clobbered or drift-warned by the next `aof work update`. Run records live under `<item.dir>/runs/`,
inside the work item, committed with the work and reviewed in the PR — which is `53/ADR-004`'s
precedent verbatim (*"no new record type, no new store, no new directory"*) and satisfies PRD
§Constraints' governance test. **The registry declares anchors; the run record carries readings.**

**Alternatives considered.**

- *A fifth key for the build stamp* — **rejected:** `readBuildInfo` (`src/build-info.mjs:89`) is the
  *subject* of the `build-stamp` anchor class, not provenance about a claim. Putting it in the
  envelope would make every claim carry an anchor reading it has no relationship to.
- *Stamp lazily, at read time* — **rejected in one line:** the read is not where the fact was true.
- *Back-fill missing provenance from the transcript store* — **rejected** by the Objective, by name.
- *A new `.aof/anchors/` store for readings* — **rejected:** a second non-item directory in the
  workspace, against `52/ADR-001 §3`'s explicit ratchet, for data that already has a committed home.
- *Make `node` nullable too, for a hermetic test* — **rejected:** tests inject a fixture node id,
  which is what injection is for. Nullability exists for facts that are genuinely sometimes absent.

**Invariant.** The provenance envelope equals its four frozen keys; exactly one module in `src/**`
constructs one; the record compiler reads no clock, no filesystem and no git; a claim record written
without a complete stamp is refused with a coded finding; and no module derives any provenance value
from a transcript, log or mtime. (Enforced by `FF-5504`.)

---

## ADR-004: The frozen set is a DECLARATION compiled to the enforcement boundary aof already owns; the permissions merge is made surgical FIRST, and a rule that does not compile is a refusal rather than a warning

**Status:** Accepted
**Date:** 2026-08-26

**Context.** `SPEC §Objective` states the whole case: *"This repo has one hand-written proof that the
mechanism works: a PreToolUse hook that blocks unisolated test runs, merged surgically into a
co-authored `.claude/settings.json`. One rule, hand-wired, derived from no declaration."*

RESEARCH §Q1 measured four enforcement points and found them unequally ready. RESEARCH §Q2 measured
the block protocol — **exit 2 + stderr blocks; any other exit allows** — and measured, twice during
this refinement, the precise defect a hand-wired rule has: the guard's `isTestRun` is a substring
match on a path, so it BLOCKED a read-only `grep` naming that path, and then BLOCKED the heredoc
writing `RESEARCH.md`, because the document quotes the path in prose. A rule that cannot state its
subject can only match text about its subject.

The `permissions` target carries a real hazard, measured: `spliceSettings` merges the settings patch
by top-level spread (`const merged = { ...current, ...settingsPatch }`, `src/claude-settings.mjs:211`),
so a rule compiled into `settings.claude.permissions` would **replace the operator's entire
`permissions` object**. This tree's live file would lose four hand-authored entries
(`.claude/settings.json:107-124`). That is `m43`'s own `writeLock` defect — one writer assuming sole
ownership of a document with several authors — arriving through the module written to prevent it.

**Decision.**

**1 — The frozen set is a declaration in the work stream, under git, reviewable as a diff.** Its
members are the ones `SPEC §Scope` names: the locked contract, the litmus, the tag vocabulary, gate
order, the test-isolation guard, and the anchors themselves. Each member declares what it protects,
not the text that matches it — which is the difference from the hand-wired guard.

**2 — Three compile targets, each through the writer that already owns its file.**

| target | writer | discipline |
|---|---|---|
| `.claude/settings.json` hook entries | `mergeClaudeSettings` (`src/claude-settings.mjs:161`) | marker-based surgical splice, already correct |
| `.claude/settings.json` `permissions.deny` | the same merge, **extended array-wise** | must be made surgical — decision 3 |
| bundled agent `tools:` scope | the whole-file bundle render | aof owns these files outright (`src/claude-settings.mjs:10-13`) |

The mesh worker envelope's argv seam (`src/agent-session-driver.mjs:689`) is a **declared, unused**
fourth target: it is named in the declaration's vocabulary so `63` and the mesh arc have a spelling,
and nothing compiles to it in this milestone. Declaring-without-compiling is `53/ADR-006`'s own
pattern for L3 and is honest in a way that a silent omission is not.

**3 — The permissions merge is made surgical BEFORE anything compiles to it.** Per-entry ownership,
mirroring the hook path's `aofManaged` marker discipline: aof's entries are identifiable, an
operator's entries survive in position, retraction removes exactly aof's, and an entry an operator
edits is drift-reported rather than silently restored-and-forgotten. **No frozen rule compiles to
`permissions` until this lands** — shipping the compilation first would destroy operator
configuration on the first `aof work update` in every installed repo.

**4 — A rule that does not compile is a REFUSAL, with a code.** Not a warning, not a skip. A frozen
set with a member that silently failed to reach the boundary is worse than no frozen set, because it
reports as enforced. This is the same reasoning `53/ADR-006` used to reject a prose lock.

**5 — Tampering is a coded event, and the seam already exists.** `mergeClaudeSettings` computes
`drift[]` for every aof-marked entry whose on-disk value differs from the configured one
(`src/claude-settings.mjs:240`), and `formatClaudeSettingsOutcome` prints a drift-warning naming the
escape hatch. 55 promotes drift **on a frozen-set member** from a warning line to a coded event:
the frozen set is what makes some drift a **tamper** rather than a preference. The existing escape
hatch — remove the marker key and the entry becomes the operator's forever — is **preserved
verbatim**: a frozen set that cannot be opted out of by a human is a frozen set that owns the human,
which is the inversion `PRD §Constraints` forbids (*"'Better' at the root is exogenous"*).

**6 — The test-isolation guard becomes the first COMPILED member, and its subject is stated.** It
stops being a hand-wired entry derived from nothing and becomes the compiled output of a declaration
that says what it protects (the real `~/.aof` global store) rather than what it matches. Whether the
narrowing that fixes the read-vs-run false positive lands here or is ledgered is 55/04's call at
build time; what this ADR fixes is that the rule has a **declaration to be narrowed in**.

**Alternatives considered.**

- *A general policy engine (Rego/Cedar)* — **rejected by `SPEC §Scope` verbatim**: a small
  declarative grammar compiled to the boundary aof already owns; a policy engine is a later decision
  *if that grammar provably outgrows itself*.
- *Compile to `permissions` now and fix the merge later* — **rejected on the measured blast radius:**
  four entries lost in this repo, unbounded in installed ones, on the first update.
- *Whole-file render of `.claude/settings.json`* — **rejected** by `m43/ADR-002`, which exists
  because that is precisely the defect. Restating it here because a frozen set is exactly the kind of
  deliverable that tempts a writer to claim sole ownership.
- *Make the frozen set unremovable (no escape hatch)* — **rejected:** it inverts the exogenous root.
  The hatch is deliberate, documented in the drift-warning text, and preserved.

**Invariant.** Every aof-authored rule at an enforcement point traces to a frozen-set declaration —
no hand-wired aof rule remains without one; a declared member that fails to compile is a coded
refusal, never a warning; the permissions merge preserves every operator entry and position; and
drift on a frozen-set member is a coded event carrying its member id. (Enforced by `FF-5505`,
`FF-5506`.)

---

## ADR-005: Anchor integrity — the raw human input is written verbatim FIRST, and classification is a strictly later, separate write; the rule is structural, because prose is what it already has

**Status:** Accepted
**Date:** 2026-08-26

**Context.** `SPEC §Objective`: *"raw human input is captured verbatim before any classification is
offered, because a feedback loop that presents a menu collects selections from the menu rather than
what the person meant. `aof:feedback` already does this by instinct; this makes it a rule the arc
cannot later undo."*

RESEARCH §Q6 measured how thin "by instinct" is. `src/bundle/commands/feedback.md:6-8` states the
rule three times in thirty lines — *"capture now, classify never"*, *"must **never** stop to ask the
user how or where to file it"* — and routes by the target's TYPE rather than by asking (`:16-25`).
The CLI half (`aof work feedback <ref> --note "…" --actor <who>`) takes free text and an actor and
has no classification argument at all. **Nothing would fail** if a later change added `--severity` or
`--type` to it.

This is the failure class `66` measured directly: a prior lesson *"recalled, cited by id, and marked
'Honoured' in the architecture document — then violated inside the paragraph that cited it"*, with
the conclusion *"recall is not a weak form of enforcement; against this class it is not a form of
enforcement at all"* (`66/SPEC.md §Objective`). Emphasis is what this rule currently has.

**Decision.**

**1 — Two writes, ordered, never one.** The verbatim text is persisted first, as its own record.
Any classification — severity, type, routing, finding-vs-lesson — is a **separate, later write that
references the raw record**, and never replaces or rewrites it. The raw text is immutable once
written.

**2 — The capture surface offers no enumerated classification.** No flag, no prompt, no menu on the
capture path. Triage is a different command at a different time (`aof:verify` triages findings,
`aof:retrospective` distils feedback) — which is already the arc's design, now with something
holding it up.

**3 — This is a frozen-set member (ADR-004 §1), and its enforcement is structural.** `FF-5507`
asserts the capture path admits no classification argument and that the raw write precedes any
classified one. A guard, not a paragraph, because RESEARCH §Q6 measured that the paragraph is what
already exists and `66` measured what paragraphs are worth against this class.

**4 — It applies wherever the arc collects human judgment, not only to `aof:feedback`.** `61` (the
acceptor) and `78` (a human signature on an execution record) both collect exactly this, and both are
downstream. The rule is declared once here so neither invents its own answer.

**Alternatives considered.**

- *Strengthen the prose in `feedback.md`* — **rejected:** it is already emphatic three times, and
  `66/SPEC` measured the yield of emphasis against this exact failure class.
- *One write with a nullable classification field* — **rejected:** a nullable field is a menu with a
  blank option, and it makes "was this classified after the fact or at capture" unanswerable from the
  record.
- *Allow a classification flag but ignore it* — **rejected:** it collects the selection anyway, in
  the caller's mind, which is the harm the rule exists to prevent.

**Invariant.** No capture path in `src/**` or the bundled commands accepts a classification argument
or offers an enumerated classification; the verbatim record is written before any classified record
that references it; and a raw capture record is never rewritten in place. (Enforced by `FF-5507`.)

---

## ADR-006: L3 unlocks by a bounded, reviewable diff whose GATE IS COMPUTED — never a config value, never a flag — and the day-one anchor set is what makes the gate answerable

**Status:** Accepted
**Date:** 2026-08-26

**Context.** `53/ADR-006` locked L3 structurally and named this milestone's diff in advance:
*"widen `LOOP_LEVELS`, empty `LOCKED_LOOP_LEVELS`, and delete FF-5305's third leg."* It also rejected
the cheap unlock in terms — *"Ship L3 behind a config flag (`work.loop.allowL3`) — **rejected
outright:** it makes the most dangerous rung reachable by editing a JSON file, with no diff a
reviewer sees"*. That rejection binds this milestone: 55 must not deliver by config what 53 refused
to deliver by config.

`SPEC §Scope` sets the gate: *"L3 unlocked on 53's ladder, gated on the Loop-Ready score and a green
groundedness report."* RESEARCH §Q5 measured that both halves already compute — the Loop-Ready score
is a pure projection at `work:doctor`'s command boundary composing 52's five checks by id
(`src/work-doctor-loop-ready.mjs:6-20`), and a registry that cannot be read yields `not-applicable`
rather than a false pass (`:73-80`).

**Decision.**

**1 — The diff is exactly what 53 named.** `LOOP_LEVELS` becomes `["L1", "L2", "L3"]`;
`LOCKED_LOOP_LEVELS` becomes empty; the L3-lock arch-test's third leg (no executing `L3` branch in
`src/`) is **deleted, not weakened** — it is necessarily false once L3 executes, and a leg kept alive
by narrowing its grep is a control that has stopped meaning anything.

**2 — Admission to L3 is COMPUTED at request time from two facts, and from nothing else.** The
Loop-Ready score at its declared threshold, and a groundedness report carrying **no
`self-referential` component and no `stale` anchor** (ADR-002 §3). Both are gathered at the command
boundary and passed in, composing through `invoke()` rather than importing a loop module —
`53/ADR-007`'s rule, unchanged. **No config key admits L3.** A workspace that wants L3 earns it by
having anchors, which is the entire point of this milestone.

**3 — The refusal keeps its shape and gains a reason.** `--level L3` on a workspace that does not
pass the gate is a coded refusal naming **which half failed and by what margin** — the score with
its failing check ids, or the components that are `self-referential`/`stale` by name. `52`'s
computability claim is what makes this possible: *"'ungrounded' is computable, not a matter of
taste… the command can say so by name"* (`55/SPEC §Objective`).

**4 — `loop-level-locked` does not disappear; it is retargeted or retired with its vocabulary
intact.** `53` froze the refusal codes and `62`/`63` name the level. Whether L3-refused-by-gate
reuses `loop-level-locked` or takes a new code is 55/05's call at build time; what this ADR fixes is
that a refusal still carries a machine-readable reason and never degrades to a bare boolean.

**5 — The day-one anchor set is a deliverable of this milestone, not a later exercise.** A gate over
an empty anchor set is a gate that answers `self-referential` for everything, forever. 55/00 declares
anchors for the framework's own loops with the same discipline `52/ADR-010` used for the day-one
registry: **declare what the evidence supports and no more.** A fabricated anchor to clear the gate
is the same failure as a fabricated owner, one milestone later, with L3 behind it.

**Alternatives considered.**

- *A config flag or an env var* — **rejected by `53/ADR-006` and restated here** because this is the
  milestone where the temptation actually arrives.
- *Unlock L3 unconditionally now that anchors exist* — **rejected:** anchors existing in the
  *framework* says nothing about a *consumer's* workspace, which is where an unattended loop would
  run. The gate is per-workspace and computed for that reason.
- *Keep FF-5305's third leg with a narrowed grep* — **rejected:** a control kept alive by narrowing
  it until it passes is `66`'s "green for the wrong reason" verbatim.
- *Gate on the score alone* — **rejected:** the score composes 52's grounding check, which today can
  only report `exogenous-only` — the weakest ground there is. Gating on it alone would unlock
  unattended operation on the exact configuration `53/SPEC §Objective` calls *"the configuration the
  self-evolving-agent literature has repeatedly measured failing"*.

**Invariant.** `LOOP_LEVELS` and `LOCKED_LOOP_LEVELS` equal their new frozen literals; no
config key, env var or flag in `src/**` admits L3; L3 admission is computed from the Loop-Ready score
and a groundedness report with zero `self-referential` and zero `stale` entries; a refused L3 request
carries a machine-readable reason naming the failing half. (Enforced by `FF-5508`.)

---

## ADR-007: The partition, the cross-story seams, and the append-only registration hubs

**Status:** Accepted
**Date:** 2026-08-26

**Context.** `SPEC §Scope` carries six deliverables and RESEARCH §Q7 measured four almost-disjoint
module clusters, each with a single production door. The risk in a milestone this shaped is not
finding a partition — it is two stories editing one file and discovering it at merge.

**Decision.**

**1 — Six stories, partitioned by module cluster. Each contended module has EXACTLY ONE owning
story.**

| story | owns (sole writer) | production dependents of what it touches |
|---|---|---|
| 55/00 anchor taxonomy | `src/work-loops.mjs`, new records under `src/bundle/loops/` | 3 |
| 55/01 anchor edge + groundedness report | `src/work-loops-checks.mjs`, `src/commands/loops-*.mjs` | 1 |
| 55/02 provenance | the new stamper module + its write sites | 0 (new) |
| 55/03 anchor integrity | `src/bundle/commands/feedback.md`, the capture path | — |
| 55/04 the frozen set | `src/claude-settings.mjs`, the hook asset | 4 |
| 55/05 L3 unlocked | `src/work-loop.mjs`, `src/commands/loop.mjs`, `src/work-doctor-loop-ready.mjs` | 1 |

**2 — The schema is FROZEN HERE so 55/00 and 55/01 build in parallel.** ADR-001 §2/§5 and ADR-002 §3
freeze the vocabulary, the anchor node's keys and the four verdicts. 55/01 codes against those
literals without waiting for 55/00 to land them — `52`'s own practice, where story 03 authored
records in parallel with the code that read them, against a schema frozen in `52/ADR-002`.

**3 — `src/work-doctor-loop-ready.mjs` is owned by 55/05, not 55/01.** 55/01 adds a check id; 55/05
registers it in `COMPOSED_CHECK_IDS` (`src/work-doctor-loop-ready.mjs:14-20`), because 55/05 is the
story that gates on the result and must not inherit a half-registered score. The id is declared in
ADR-002 §3 so both stories can name it before either lands.

**4 — `src/bundle/bundle.json` and `src/bundle/manifest.json` are APPEND-ONLY REGISTRATION HUBS**,
following `53/ADR-011`'s ruling for the test registry. 55/00 appends anchor records; 55/04 appends a
hook and its asset. Appends at different points in a list are not a semantic conflict, and declaring
it here stops either story treating the file as contended and serialising on it.

**5 — Every story lands its own evidence.** `53/ADR-011`: the partition gives each story its
behavioural suites AND their registration. There is no separate fitness-functions story; each
`FF-55nn` lands with the story that owns its subject, which is why the register below carries
`pending` per entry rather than a single blanket note.

**6 — The one genuine ordering constraint, named.** ADR-004 §3: **no frozen rule compiles to
`permissions` until the surgical merge lands**. That is an ordering *inside* 55/04, not between
stories. Every other pair of stories is parallel-eligible from day one.

**Invariant.** No two stories in this milestone write the same module under `src/**`; the anchor
schema literals in `src/work-loops.mjs` and the verdict literals consumed by
`src/work-loops-checks.mjs` agree exactly. (Enforced by `FF-5501`, `FF-5502` jointly; the partition
rule itself is a review property, not an arch-test.)

---

## Fitness functions

<!-- Each structural invariant from an ADR, paired with the arch-test that enforces it in CI.
     The arch-test lands with its subject story, so `pending` clears story by story.
     `pending` reports at warn while 55 is open and is NOT admitted at accept —
     `aof work doctor 55` reports each unresolved control as `control-unresolved`.

     Each declared control also owes a RED PROBE in VERIFICATION.md once it lands: what was
     changed to make it fail, and the message observed.

     HARNESS SHAPE: every arch-test here exports an array of `{ name, run }` — never `{ name, fn }` —
     and is imported AND spread in the suite registry inside its own labelled story block. A suite
     exported under the wrong key is never invoked.

     TWO OF THE EIGHT EXTEND A GUARD ALREADY IN SERVICE (FF-5503 extends 52's purity guard;
     FF-5508 supersedes the third leg of 53's L3-lock guard by DELETING it and re-arming the rest).
     For those two the red probe is the only evidence the change is armed.

     ALL EIGHT have landed with their subject stories; no entry remains `pending` (cleared at the
     2026-08-27 milestone gate, when 55/05 landed FF-5508's arch-test).

     NOT here (these are task .feature material — observable behaviour over the real seam):
     "a loop with no anchor is named in the report", "a stale anchor reports stale rather than
     ungrounded", "a claim written without provenance is refused", "an operator's permissions entry
     survives a compile", "a capture with a classification flag is refused", "an L3 request on an
     ungrounded workspace is refused by name". -->

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-5501 | **The taxonomy widens additively and the host does not widen.** `NODE_KINDS` and `GROUND_VALUES` equal their new frozen literals and are supersets of 52's; `ground:` is admitted on `kind: actor` and `kind: anchor` and on **no** `kind: loop` node; every `kind: anchor` node carries `observes:` as a pointer in one of the three schemes, never `prose:` and never `unknown`; and every record 52 delivered parses with zero new findings. | `test/arch/acd-anchor-taxonomy-additive.test.mjs` | ADR-001 |
| FF-5502 | **Grounding is seeded by `ground:`, not by `kind`, and the traversal is untouched.** The seed set is every node bearing an admitted `ground:` value of any class; the forward flood and the SCC decomposition are byte-unchanged from 52's; the report's verdict set equals the four frozen literals; and `loop-anchor-absent` is emitted for every `kind: loop` node with no inbound `data-feed` from a `kind: anchor` node. No sixth edge key exists. | `test/arch/acd-anchor-grounding-seed.test.mjs` | ADR-002 |
| FF-5503 | **Resolution never enters the pure checks.** No module reachable from `src/work-loops-checks.mjs` performs a filesystem, process or dynamic-import read; the resolution map is a parameter, not a computation. The existing purity guard is **EXTENDED** to cover the anchor resolution map rather than joined by a sibling. | `test/arch/acd-loop-checks-pure.test.mjs` *(extended)* | ADR-002 |
| FF-5504 | **Provenance is stamped at write time, injected, and never back-filled.** The envelope equals its four frozen keys with `node`/`at` non-nullable; exactly one module in `src/**` constructs one; the record compiler reads no clock, no filesystem and no git; a claim record written without a complete stamp is refused with a coded finding; and **no** module derives any provenance value from a transcript, log, mtime or directory listing. | `test/arch/acd-provenance-stamped-at-write.test.mjs` | ADR-003 |
| FF-5505 | **Every enforcement-point rule traces to a declaration, and the merge stays surgical.** No aof-authored rule exists at any enforcement point without a frozen-set member declaring it; a declared member that fails to compile is a coded refusal, never a warning; and the permissions merge preserves every operator entry, value and position — no top-level spread over `permissions`. | `test/arch/acd-frozen-set-compiled.test.mjs` | ADR-004 |
| FF-5506 | **Tampering is a coded event, and the human escape hatch survives.** Drift on a frozen-set member emits a coded event carrying the member id, distinct from the existing preference-drift warning; and an entry with its ownership marker removed is neither edited nor retracted nor re-marked. | `test/arch/acd-frozen-set-tamper-coded.test.mjs` | ADR-004 |
| FF-5507 | **Raw capture precedes classification, structurally.** No capture path in `src/**` or the bundled commands accepts a classification argument or offers an enumerated classification; the verbatim record is written before any classified record referencing it; and a raw capture record is never opened for rewrite in place. | `test/arch/acd-raw-capture-before-classification.test.mjs` | ADR-005 |
| FF-5508 | **L3 is earned, never configured.** `LOOP_LEVELS` and `LOCKED_LOOP_LEVELS` equal their new frozen literals; **no** config key, env var or flag in `src/**` admits L3; admission is computed from the Loop-Ready score and a groundedness report with zero `self-referential` and zero `stale` entries; and a refused L3 request carries a machine-readable reason naming the failing half. 53's L3-lock guard has its third leg **deleted** (necessarily false once L3 executes) and its remaining legs re-armed here. | `test/arch/acd-loop-level-l3-gated.test.mjs` | ADR-006 |
