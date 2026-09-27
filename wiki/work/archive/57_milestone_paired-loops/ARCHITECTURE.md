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
# 57 · Paired loops — Architecture

## Context this milestone inherits

Three facts arrive from upstream items and are not re-litigated here.

**From 52 (done).** The registry is hand-authored markdown under `.aof/loops/`, shipped from
`src/bundle/loops/` (52/ADR-001). Edges are five closed frontmatter keys — `data-feed`,
`target-setting`, `monitoring`, `veto`, `parameter-tuning` — declared on the **source** node only,
outbound (52/ADR-004). The six checks are **pure functions** over the parsed model emitting doctor's
`{code, severity, path, message}` envelope, and they land ONLY in `work:loops validate`;
`validateWork` and `work:doctor` are not edited (52/ADR-007). `checkPairing`
(`src/work-loops-checks.mjs:297`) already emits `loop-unpaired-optimizer` and
`loop-self-referential-edge` — **at `warn`, from a hardcoded constant** (`:100`).

**From 55 (in-progress, five of six stories landed).** `kind: anchor` widened `NODE_KINDS`
**additively** and deleted nothing (55/ADR-001); an anchor's authority is a pointer in one of three
schemes, never `prose:` and never `unknown`. The missing edge is **computed rather than required as
a key** (55/ADR-002) — because a required field is satisfiable by fabrication. `ground:
landed-commit` is an admitted ground class.

**From 56 (done).** The build loop's counter-metric is settled: a **contract-integrity ratchet**, not
coverage and not a judge. Its three legs, the fourth leg the review forced, the discharge rule's
scope, and two definitions 57 must supply are carried into ADR-004 and ADR-005 below. Two rulings
bind everything here: **the oracle diffs the failure MESSAGE, not the pass/fail count**, and
**arch-failure count is an unusable optimisation metric** — banking five real violations into a
shrink-only ratchet made the arch set report one *fewer* failure.

**Measured at refine (2026-08-27).** `aof work loops validate` reports **39 findings, all `warn`**,
of which **three** are `loop-unpaired-optimizer`: `loop:build-to-green`, `loop:review-fix-rereview`,
`loop:autonomous-cascade`. Those three are this milestone's whole subject. `loop:run-resilience`,
`loop:mesh-assignment-reclaim`, `loop:retrospective-memory-ingest` and `loop:verify-triage-accept`
declare `optimizing: false` and are out of scope by their own declaration.

**Codebase coupling, from `aof graph impact` against a graph built this session** (12651 nodes,
30994 edges, `egress: none`, built 2026-08-27T13:43:51Z; the build reported already-current, so the
topology below is this build's output and not a stale artifact). Every boundary in ADR-007 is drawn
on these numbers:

| module | production dependents | imports |
|---|---|---|
| `src/work-loops-checks.mjs` | **2** (`commands/loops-groundedness`, `commands/loops-validate`) | **0** |
| `src/work-loops.mjs` | **4** (all `commands/loops-*`) | 3 |
| `src/feature-parse.mjs` | **3** (`work.mjs`, `commands/tasks.mjs`, `work-doctor-rubric.mjs`) | **0** |
| `src/work-doctor-rubric.mjs` | 2 (`commands/doctor`, `work-doctor`) | 2 |
| `src/work.mjs` | **262** — the god node, and this milestone does not edit it | 7 |

---

## ADR-001: A watcher is a FOURTH node kind whose counter-metric is a required field — not a flag on the loop, not a role played by an existing node

**Status:** Accepted
**Date:** 2026-08-27

**Context.** The pairing must be declared somewhere a check can read it. Three shapes were available.
(a) A `watcher:` key on the optimizing loop record — rejected outright: it puts the declaration of
independence inside the artifact the optimizer's own actuator edits, which is the exact coupling this
milestone exists to break, and 55/ADR-002 already refused a required key for the same reason (*a
required field is satisfiable by fabrication*). (b) Reuse `kind: actor` — an actor is a human, and
`ground: exogenous` means "a person looked"; calling a deterministic counter an actor would make the
groundedness report claim human ground for a shell command. (c) A new node kind.

**Decision.**

**1 — `NODE_KINDS` widens to four frozen literals: `loop`, `actor`, `anchor`, `watcher`.** Additive,
exactly as 55/ADR-001 widened it to three. Nothing is deleted, and every record 52 and 55 shipped
parses with **zero new findings**.

**2 — A watcher's admitted keys are frozen here:** `id`, `kind`, `title`, `counter`, `determinism`,
`measurement`, and the five existing edge keys. **Required:** `id`, `kind`, `title`, `counter`,
`determinism`, `measurement`.

**3 — A watcher has NO `actuator` key, and the key is not admitted for the kind.** This is the
independence rule made unspeakable rather than merely checked: a node that cannot declare an actuator
cannot declare that it acts on what it watches. `ADMITTED_KEYS.watcher` omits it, so a watcher record
carrying `actuator:` is `loop-key-not-admitted-for-kind` from the existing loader, with no new code.

**4 — `counter:` is a scalar phrase naming the counter-metric** — what is counted, in the same
register as a loop's `controlled:`. It is the reviewable half: a reader must be able to see that the
counter is a *different quantity* from the thing being optimised, without running anything.

**5 — `determinism:` is a frozen two-value enum: `counter` | `judge`.** `counter` asserts the metric
is computed by code; `judge` asserts a model produces it. There is no third value and no default —
an absent `determinism` is `loop-missing-field`, not an assumed `judge`.

**6 — `measurement:` reuses the loop field's existing semantics verbatim** — a list of
`module:`/`command:`/`config:` pointers or `prose:` authorities. Reusing the key is what makes the
loader's existing `loop-field-prose-only` finding fire on a prose-only watcher with no new code, and
what lets ADR-002's checks read one field shape rather than two.

**7 — The pairing itself is the EXISTING `monitoring` edge, declared OUTBOUND from the watcher.** No
sixth edge key. `checkPairing` already reads inbound monitoring edges
(`src/work-loops-checks.mjs:299-310`) and already treats a self-referential one as a finding.
55/ADR-002's shape is followed exactly: the watched loop declares nothing, and the requirement on it
is **computed**.

**Consequences.** A watcher is legible without executing anything: kind, what it counts, whether a
machine or a model produces the number, and which loop it watches — five lines of frontmatter. The
cost is a fourth kind in a vocabulary that was three; ADR-007 §2 freezes the literals here so 57/00
and 57/01 build in parallel against them.

---

## ADR-002: Independence is COMPUTED from the records on four legs, each its own finding code — never declared, and never asserted by the node claiming it

**Status:** Accepted
**Date:** 2026-08-27

**Context.** `SPEC §Objective` states the rule: *a watcher is a different node reading a different
artifact, and where a model must judge, not the same model instance grading its own output.* An
`independence: true` key would be a claim the maker writes about itself — the same failure as a
`watcher:` key on the loop. Independence must fall out of what the records already say.

**Decision.** `checkPairing` is extended. Each leg emits its own code, so one slip yields one finding
(52/ADR-012's rule).

**1 — Different node.** Already shipped: `loop-self-referential-edge`. Unchanged.

**2 — Different artifact — `loop-watcher-shares-measurement`.** The watcher's `measurement` pointer
set must be **disjoint** from the watched loop's `measurement` pointer set. A watcher that reads the
same artifact the optimizer optimises reports the optimizer's own number back.

**3 — Not the same model instance — `loop-watcher-shares-actuator`.** The watcher's `prose:`
authorities must be **disjoint** from the watched loop's `actuator` list. In this repo a model
instance is spelled as an agent definition (`prose:src/bundle/agents/aof-developer.md`), so this leg
is exact rather than approximate: a `determinism: judge` watcher whose prose authority is the agent
that also actuates the loop is the maker grading itself, and is named as such.

**4 — The counter is a different quantity — `loop-counter-equals-controlled`.** The watcher's
`counter` must not equal the watched loop's `controlled`, compared after whitespace normalisation and
case folding. This catches the cheapest decoration: a "watcher" that re-counts scenarios-green.

**5 — `determinism: counter` REQUIRES pointer-only measurement — `loop-counter-not-deterministic`.**
Every entry in a `counter` watcher's `measurement` must be a `module:` or `command:` pointer. This is
where *counters beat judges* stops being a preference and becomes a shape: a record may not call
itself deterministic while pointing at prose.

**6 — `determinism: judge` is REPORTED, never silently accepted — `loop-watcher-is-judge`, at
`warn`.** Whether a counter-metric *admits* a deterministic computation is not decidable from the
records, so no check can demand one. What a check can do is refuse to let a judge be invisible. The
finding is permanent and non-gating by design: it is a standing census of where this system still
relies on a model's opinion, which is precisely what 59 audits.

**7 — The checks stay PURE and the module keeps ZERO imports.** Every leg reads only the parsed
model. Measured at refine: `src/work-loops-checks.mjs` has **0 imports and 2 production dependents**.
52/ADR-007's purity ruling and 55's `FF-5503` both survive this milestone untouched.

**Rejected.** *Requiring a watcher to run on a different node of the mesh.* Structurally appealing and
operationally useless — the registry is a declaration, and nothing in it can bind execution to a host.
That claim belongs to 59, which audits whether the instrument ran at all.

---

## ADR-003: The gate is SEVERITY-BY-CODE plus an exit code on the face — `work.mjs` is not edited, and no seventh doctor lane is created

**Status:** Accepted
**Date:** 2026-08-27

**Context.** `SPEC §Scope` requires *unpaired optimizing loops become validate findings — 52's report
becomes a gate*. Today every loop finding is `severity: "warn"` from a hardcoded constant
(`src/work-loops-checks.mjs:100`) and `work:loops validate` declares no exit policy at all, so the
report is unreadable as a gate even by a CI step that wants to honour it. Three homes were available.

**Decision.**

**1 — Severity becomes a property of the CODE, via a frozen `GATING_CODES` set in
`src/work-loops-checks.mjs`.** `finding()` looks the code up instead of writing `"warn"`. The set
contains exactly this milestone's structural codes: `loop-unpaired-optimizer`,
`loop-watcher-shares-measurement`, `loop-watcher-shares-actuator`, `loop-counter-equals-controlled`,
`loop-counter-not-deterministic`.

**2 — Every inherited code outside `GATING_CODES` stays `warn`. No inherited red.**
`loop-unpaired-optimizer` is the one inherited code deliberately promoted by §1; the other nine of
52's check codes and all seventeen loader codes keep their present severity, and
`loop-watcher-is-judge` joins them. This is 54/04's ruling applied again: a gate that arrives as a
wall of unrelated pre-existing red is a gate that gets silenced.

**3 — The FACE owns the exit code.** `work:loops validate` gains a `cli.exit` returning 1 when
`summary.error > 0`, following `src/acceptance-horizon.mjs`'s explicit ruling (*"The FACE still owns
the exit code"*) and doctor's ADR-002. The `run()` result is byte-identical with and without a
failing gate — the finding set never depends on how it is being read.

**4 — `aof:validate`'s bundle command gains one step that runs `aof work loops validate`.** This is
how the gate reaches the operator, and it EXTENDS the validate surface that exists rather than adding
a sibling. It is also the `/aof:*` wrapper 52/ADR-008 deliberately deferred.

**5 — `validateWork` (`src/work.mjs`) is NOT edited, and doctor gains NO lane.** Two reasons, both
measured. `src/work.mjs` has **262 dependents**; 54/04 already declined to put a lane inside it for
exactly this reason. And `src/work-doctor.mjs:594` carries a recorded ratchet — *"the SIXTH folds the
family into `src/work-doctor/`"* — so appending a seventh `work-doctor-*` lane file would either trip
a refactor this milestone did not scope or quietly break a recorded commitment. 52/ADR-007 assigned
the checks to `work:loops validate` and they stay there.

**Consequences.** The gate lands in three files with a combined production dependent count of **2**.
The cost: an operator who runs only `aof work doctor` does not see the gate. That is accepted and
named — `aof work doctor` scores pairing through `COMPOSED_CHECK_IDS`
(`src/work-doctor-loop-ready.mjs:14-20`) and always has; scoring it and gating it are different jobs
with different homes.

---

## ADR-004: The build loop's counter is the contract-integrity ratchet — FOUR legs, discharge by pre-existing authority, and a base commit defined here or the ratchet refuses

**Status:** Accepted
**Date:** 2026-08-27

**Context.** 56 settled the metric and handed 57 two definitions the repo does not supply. This ADR
supplies them and adds nothing 56 did not measure.

**Decision.**

**1 — Four legs, all deterministic, all computed from the diff and the two trees.**

- **(a) The item's `@executable` scenario count may not decrease — extended to Examples ROWS.** A
  scenario Outline's rows are acceptance criteria; the shipped parser cannot see them, and 56
  measured **1,044 of 5,194 scenarios (20%)** as Outlines. Deleting rows is therefore the cheapest way
  to shrink a criterion in this tree, and it is exactly the QA-owned surface. The leg counts scenarios
  **and** Examples rows; ADR-005 makes the rows visible.
- **(b) On files present at the base commit, a closed-set assertion may not be relaxed to an open
  bound.**
- **(c) A skip / only / todo marker ADDED to a pre-existing test is a fire.** 56's measured baseline
  for this leg is **zero fires in 656 modification events**, so it costs nothing and catches a real
  move.
- **(d) The compensating-assertion exemption, which is a LEG and not a footnote.** Leg (b) does not
  fire when a closed-set assertion was **added to the same file in the same commit**. 56's review
  found both sharpest instances did exactly this, so leg (b) without (d) fires on every legitimate
  count-to-bijection conversion. It is computable from the diff the counter already reads, with no
  model and without reading any justification comment.

**2 — "Closed-set assertion" is defined, in this repo's idiom, and the definition is frozen.** An
assertion is closed-set when it fixes the whole of a set: a deep-equality over an array or object
literal; an equality against a literal `.length` or `.size`; a `Set`/`FrozenSet` compared for
equality; or an exhaustive membership assertion over a frozen literal. It is **relaxed to an open
bound** when replaced by an inequality, a truthiness check on a length, or an existential
(`some` / `includes` / `find`). Anything the rule cannot classify is reported `ratchet-unclassified`
and counted as neither — an honest third answer, never a silent pass.

**3 — "The story's base commit" is defined: the first commit, in `--first-parent` order over the
item's own record document, whose version of that document carries `status: in-progress`.** That is
the moment the contract was locked and the build began. Two consequences are deliberate: it is a
property of the record rather than of a branch (this repo has no merge commits, so there is no
natural base), and it is stable under rebase of the work that followed.

**4 — When the base commit cannot be resolved, the ratchet REFUSES.** A shallow clone, an unborn ref,
or a record never committed at `in-progress` yields `ratchet-base-unresolved` and **no legs are
computed**. It never falls back to `HEAD~1`, to the item's creation commit, or to a guess. A counter
that invents its own baseline is worse than no counter, because it reports a number. `--base <commit>`
is admitted as an explicit operator override and is recorded in the output.

**5 — Discharge is by PRE-EXISTING AUTHORITY, and its scope is stated in full.** A fired leg is
discharged when **the ADR id cited by the weakened artifact** resolves in **the owning item's
`ARCHITECTURE.md`**, **at the base commit**. All three qualifiers are load-bearing: 56's review found
the rule reads false repo-wide and would clear virtually every weakening if left unscoped. The ratchet
**never reads the justification comment inside the weakened artifact** — that comment is the
optimizer's own output, and a watcher reading it is re-coupled to the maker.

**6 — Disposition routes to the architect node, never to a judge.** The ratchet's output is
`fired` / `discharged` / `unclassified` per leg. It does not decide whether a weakening was
legitimate — 56 settled that no cheap signal can, and that the question is answered by whether an
independently-authored authority **pre-existed** the change, which is exactly what §5 tests.

**7 — Precision is reported as measured, not as a rate.** 56 measured ~89% file-level over **n=8
commits from a single milestone**, not covering the compensating-assertion shape. The command's
`--json` carries no precision claim, and neither does its rendering.

---

## ADR-005: `parseFeature` gains Examples rows ADDITIVELY — the five existing scenario keys are untouched, and no consumer changes behaviour

**Status:** Accepted
**Date:** 2026-08-27

**Context.** `parseFeature` (`src/feature-parse.mjs:90`) returns scenarios as
`{name, outline, lane, verification, line}`. Table lines are consumed by the `line.startsWith("|")`
branch at `:137` as *carrying no step position* and are discarded; `Examples:` is recognised only as
a structural header. Leg (a) of ADR-004 cannot see 20% of this repo's acceptance criteria until that
changes. The parser has **3 production dependents**, one of which is the 262-dependent god node.

**Decision.**

**1 — Each scenario gains ONE new key, `examples`,** an ordered list of `{ header, rows, line }` —
the `Examples:` caption, the count of data rows beneath it excluding the column-header row, and the
caption's line number. An Outline with no Examples block yields `[]`, not `null`.

**2 — The five existing keys are unchanged in name, order and value** for every input, including the
`firstViolation` / `freeTextLines` litmus fields the strict lane reads. The table branch at `:137`
keeps closing the free-text region exactly as it does now — the row counter rides alongside it and
changes no control flow.

**3 — No consumer is edited.** `work.mjs`, `commands/tasks.mjs` and `work-doctor-rubric.mjs` read the
keys they read today and are behaviourally unchanged. This is what makes a change to a 262-dependent
node's dependency safe, and `FF-5704` asserts it rather than trusting it.

**4 — `executableScenariosOf` (`src/work-doctor-rubric.mjs:111`) is REUSED, not copied, and not
edited.** The ratchet imports it. 56 named it; copying it would put the definition of "an executable
scenario" in two places, which is how `ITEM_RE` came to exist in four.

---

## ADR-006: The oracle diffs the MESSAGE, and arch-failure count is banned as an optimisation metric — structurally, not by convention

**Status:** Accepted
**Date:** 2026-08-27

**Context.** 56's decisive result: banking five real violations into a shrink-only ratchet's baseline
made the arch set report one **fewer** failure, 9 → 8. *The gaming move does not evade the signal — it
improves it.* And 9 of 341 gates are standing red, so on those a real break is invisible to a count
oracle.

**Decision.**

**1 — Any probe or counter in this milestone compares failure MESSAGES, never pass/fail counts.** A
count oracle is refused wherever a gate's own health is the subject.

**2 — No loop record may declare an arch-failure count as its `controlled:`, and no watcher may
declare one as its `counter:`.** Enforced as a fitness function over the shipped registry, not as
guidance — this is the specific metric 56 proved is gamed by improvement.

**3 — The ban is recorded where the next milestone will look for it.** 59 inherits the tier table and
the same ruling; stating it once, here, in the register, is what stops 59 re-deriving it.

---

## ADR-007: The partition — six stories, one sole writer per module, and the milestone's single ordering edge

**Status:** Accepted
**Date:** 2026-08-27

**Context.** The coupling table above was produced by `aof graph impact` against a graph built this
session. The risk in a milestone shaped like this one is not finding a partition — it is two stories
editing one file and discovering it at merge.

**Decision.**

**1 — Six stories, partitioned by module cluster. Each contended module has EXACTLY ONE owning
story.**

| story | owns (sole writer) | production dependents of what it touches |
|---|---|---|
| 57/00 the watcher node | `src/work-loops.mjs` | 4 |
| 57/01 independence + the gate | `src/work-loops-checks.mjs`, `src/commands/loops-validate.mjs`, `src/bundle/commands/validate.md` | 2 |
| 57/02 Examples rows | `src/feature-parse.mjs` | 3 |
| 57/03 the contract ratchet | `src/work-ratchet.mjs`, `src/commands/ratchet.mjs` (both new) | 0 |
| 57/04 escape + intervention counters | `src/work-counters.mjs`, `src/commands/counters.mjs` (both new) | 0 |
| 57/05 the pairing table | `src/bundle/loops/*.md` (new records), `src/bundle/bundle.json` | — |

**2 — The vocabulary is FROZEN in ADR-001 §1/§2/§5 and the finding codes in ADR-002, so 57/00 and
57/01 build in parallel.** 57/01 codes against `kind: watcher`, `counter`, `determinism` and the new
codes without waiting for 57/00 to land them — 52's own practice, and 55/ADR-007 §2's.

**3 — The command ids are frozen here so 57/05 can cite a counter before it lands:** `work:ratchet`
(route `work ratchet`) and `work:counters` (route `work counters`). A watcher record declaring
`command:work:ratchet` is valid frontmatter the day it is written; `FF-5707` is what turns the
citation into a resolution requirement.

**4 — `src/bundle/bundle.json` is an APPEND-ONLY REGISTRATION HUB** (55/ADR-007 §4, 53/ADR-011).
57/05 appends its asset entries. No other story touches it.

**5 — The suite registry is the second append-only hub, and every story registers its OWN suites in
its own labelled block** — import **and spread**. This is not boilerplate: 56 found **26 fitness
suites carrying 117 test entries de-armed in one commit (`15e0a92`) with the imports left behind**,
unrun for a month. A suite imported and not spread is not registered.

**6 — The milestone's ONE genuine ordering edge: 57/05 lands before 57/01's gate turns on.** ADR-003
makes `loop-unpaired-optimizer` gating; the three optimizing loops measured at refine are unpaired
today, so a gate that arrives first turns the tree red for work that is merely not finished yet.
Every other pair of stories is parallel-eligible from day one.

**7 — 57/03 and 57/04 are new modules with zero dependents**, so they carry no merge risk and may be
built in any order relative to everything else. 57/03 imports 57/02's widened parser and
`executableScenariosOf`; it does not edit either, so the dependency is one-way and needs no seam.

**Invariant.** No two stories in this milestone write the same file; the vocabulary literals in
`src/work-loops.mjs` and the literals consumed by `src/work-loops-checks.mjs` agree exactly.
(Enforced by `FF-5701` and `FF-5702` jointly; the partition rule itself is a review property, not an
arch-test.)

---

## Fitness functions

<!-- Each structural invariant from an ADR, paired with the arch-test that enforces it in CI.
     The arch-test lands with its subject story, so `pending` clears story by story.
     `pending` reports at warn while 57 is open and is NOT admitted at accept —
     `aof work doctor 57` reports each unresolved control as `control-unresolved`, and what clears
     it is landing the file or dropping the declaration, never re-marking it `pending`.

     Each declared control also owes a RED PROBE in VERIFICATION.md once it lands: what was
     changed to make it fail, and the message observed.

     HARNESS SHAPE: every arch-test here exports an array of `{ name, run }` — never `{ name, fn }` —
     and is imported AND spread in the suite registry inside its own labelled story block. A suite
     imported and not spread is not registered (56's finding: 26 suites, 117 entries, dead for a
     month with the imports left behind).

     TWO EXTEND A GUARD ALREADY IN SERVICE rather than adding a sibling: FF-5702 extends 52's purity
     guard, and FF-5703's severity leg extends 52's finding-envelope guard. For those the red probe
     is the only evidence the change is armed.

     NOT here (these are task .feature material — observable behaviour over the real seam):
     "a watcher sharing the optimizer's agent is named", "the gate exits non-zero", "a ratchet with
     no resolvable base refuses", "an Outline's rows are counted", "the escape counter names the
     item a finding escaped from". -->

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-5701 | **The watcher kind widens additively and admits no actuator.** `NODE_KINDS` equals its new four frozen literals and is a superset of 55's three; `ADMITTED_KEYS.watcher` equals its frozen key set and **omits `actuator`**; `counter`, `determinism` and `measurement` are required for the kind; `determinism` admits exactly `counter` and `judge` with no default; and every record 52 and 55 delivered parses with **zero new findings**. No sixth edge key exists. | `test/arch/acd-watcher-taxonomy-additive.test.mjs` | ADR-001 |
| FF-5702 | **Independence is computed, and the checks stay a pure leaf.** Every independence leg is a pure function of the parsed model — no filesystem, process, clock or dynamic-import read is reachable from `src/work-loops-checks.mjs`, which still imports **nothing**; no node kind declares its own independence (no `independence` key exists in any admitted key set); and the watched loop declares no key by which to claim a watcher. 52's existing purity guard is **EXTENDED**, not joined by a sibling. | `test/arch/acd-loop-checks-pure.test.mjs` *(extended)* | ADR-002 |
| FF-5703 | **Severity is a property of the code, and only this milestone's codes gate.** `GATING_CODES` equals its frozen literal set; every inherited check code outside that set remains `warn`; every loader code retains its existing `warn`/`error` severity; `loop-watcher-is-judge` resolves to `warn`; no finding is constructed with a hardcoded severity; and the exit decision exists **only** on the face — `run()` returns an identical result whether or not the gate fires. | `test/arch/acd-loop-finding-envelope.test.mjs` *(extended)* | ADR-003 |
| FF-5704 | **The parser widens additively and no consumer changes.** For every `.feature` in the tree the five existing scenario keys (`name`, `outline`, `lane`, `verification`, `line`) and the litmus fields are byte-identical before and after the widening; `examples` is present on every scenario as an array; and none of `src/work.mjs`, `src/commands/tasks.mjs` or `src/work-doctor-rubric.mjs` is edited by this milestone. | `test/arch/acd-feature-parse-examples-additive.test.mjs` | ADR-005 |
| FF-5705 | **The ratchet is pure over injected inputs and its discharge is scoped.** No git, filesystem or process read is reachable from `src/work-ratchet.mjs` — every input arrives as a parameter and the reads live at the command boundary; the discharge resolver takes the OWNING item's `ARCHITECTURE.md` text at the base commit as an argument and reads no other register; and no code path reads a comment out of the weakened artifact. The engine's import set is CLOSED at three members — `./feature-parse.mjs`, `./work-doctor-rubric.mjs`, `./declared-id.mjs` — and the third is admitted on a checked condition rather than on trust: it must itself import nothing and reach no I/O, and the engine may take only the ADR **id fragment** from it, never its heading recogniser. *(Amended at the milestone gate, `F-57-M-4`: the engine spelled `ADR-\d+` itself and was a second copy of 66/FF-6604's one-home grammar. The set is widened by one and stays closed; the admission's condition is a new leg of this control, red-probed.)* | `test/arch/acd-ratchet-pure-and-discharge-scoped.test.mjs` | ADR-004, 66/ADR-001 §7 |
| FF-5706 | **No oracle in this milestone is a count, and arch-failure count is declared nowhere.** No module added by 57 compares a pass/fail tally to decide whether a gate is healthy; and no record in `src/bundle/loops/` declares an arch-failure count as a `controlled:` or a `counter:`. | `test/arch/acd-oracle-is-a-message-not-a-count.test.mjs` | ADR-006 |
| FF-5707 | **Every declared counter resolves.** Each `kind: watcher` record's `measurement` pointers resolve — a `command:` pointer to a registered route in the command registry, a `module:` pointer to an exported symbol that exists — with no pointer resolving into the work tree, and none marked `prose:` while `determinism: counter`. | `test/arch/acd-watcher-counter-resolves.test.mjs` | ADR-001, ADR-007 |
| FF-5708 | **The day-one pairing table is complete.** Every `optimizing: true` loop shipped in `src/bundle/loops/` has an inbound `monitoring` edge from a `kind: watcher` node; every watcher watches at least one loop; and the shipped registry produces **zero** findings whose code is in `GATING_CODES`. | `test/arch/acd-day-one-pairing-complete.test.mjs` | ADR-007 |

## Story partition

Authored at refine, per ADR-007 §1. Every story is parallel-eligible except the single ordering edge
in §6 (57/05 before 57/01's gate turns on).

- **57/00** — the watcher node: `src/work-loops.mjs`
- **57/01** — independence computed, and the gate: `src/work-loops-checks.mjs`, `src/commands/loops-validate.mjs`, `src/bundle/commands/validate.md`
- **57/02** — Examples rows in the parser: `src/feature-parse.mjs`
- **57/03** — the contract-integrity ratchet: `src/work-ratchet.mjs`, `src/commands/ratchet.mjs`
- **57/04** — the escape and intervention counters: `src/work-counters.mjs`, `src/commands/counters.mjs`
- **57/05** — the pairing table: `src/bundle/loops/`, `src/bundle/bundle.json`
