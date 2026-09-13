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
# 58 · Supervising loops — Architecture

## Context this milestone inherits

Four facts arrive from upstream items and are not re-litigated here.

**From 52 (done).** The registry is hand-authored markdown under `.aof/loops/`, shipped from
`src/bundle/loops/` (52/ADR-001). Edges are five closed frontmatter keys — `data-feed`,
`target-setting`, `monitoring`, `veto`, `parameter-tuning` — declared on the **source** node only,
outbound (52/ADR-004). The checks are **pure functions** over the parsed model emitting doctor's
`{code, severity, path, message}` envelope, land ONLY in `work:loops validate`, and `validateWork`
and `work:doctor` are not edited (52/ADR-007). Cadence is typed on **deliberately incomparable
axes**, and the check reports `not-comparable` rather than inventing a conversion (52/ADR-006 §5) —
*"no mapping from an `event:` trigger to a duration exists anywhere in the implementation, and none
may be added."* 52/ADR-006 §4 assigns this milestone the rule and not the grammar: *"The separation
ratio is 3, and 58 owns the rule … which may supersede the value without touching this grammar."*

**From 55 (done).** `kind: anchor` widened `NODE_KINDS` **additively** and deleted nothing
(55/ADR-001). `ground:` is a six-member flat enum including **`frozen-rule` — "a rule the optimizer
is not permitted to touch"** — which no shipped record instantiates today. And the ruling that binds
every schema decision below: **a required field is satisfiable by fabrication, so the missing edge is
COMPUTED rather than required as a key** (55/ADR-002 §2). The anchor edge is `data-feed`, declared
outbound from the anchor; no sixth edge key exists (55/ADR-002 §1).

**From 57 (done).** `kind: watcher` widened `NODE_KINDS` to four, again additively, and the kind
**admits no `actuator`** — *"a node that cannot declare an actuator cannot declare that it acts on
what it watches"* (57/ADR-001 §3). Severity became a property of the CODE via a frozen `GATING_CODES`
set, with **the exit decision only on the face** and **no inherited red** (57/ADR-003 §1–§3). And the
ordering trap this milestone must not repeat, in 57's own words (ADR-007 §6): *"a gate that arrives
first turns the tree red for work that is merely not finished yet."*

**Measured at refine (2026-08-28), live, `AOF_GLOBAL_HOME=$(mktemp -d) aof work loops validate
--json`.** **39 findings, `error: 0`, `warn: 39`.** Per check: `grounding` 9, `anchor-grounding` 4,
`pairing` 0, **`reference-ownership` 5**, **`actuator-arbitration` 3**, **`timescale` 0**. The five
`loop-unowned-reference` lines name `loop:build-to-green`, `loop:mesh-assignment-reclaim`,
`loop:retrospective-memory-ingest`, `loop:review-fix-rereview`, `loop:run-resilience`. The three
`loop-shared-actuator-unarbitrated` lines name `prose:src/bundle/agents/aof-developer.md` (four
contenders), `prose:src/bundle/agents/aof-product-owner.md` (two) and
`prose:src/bundle/agents/aof-qa.md` (two). **`timescale` reports 0 because no `kind: loop` record
declares an outbound `target-setting` edge at all** — the check runs and has nothing in its domain
(RESEARCH §Q2). Those three numbers — 5, 3, 0 — are what this milestone is judged against at accept.

**Measured at refine over a PROTOTYPE registry** (the ADR-001 edges plus the ADR-003 arbiter,
authored into a scratch copy of `.aof/loops/` and driven through the real `loadLoops` and the real
checks): **39 → 36 → 32 findings** across the milestone's two landings (the per-stage table is
ADR-005 §6), `loop-unowned-reference` **5 → 0**, `loop-shared-actuator-unarbitrated` **3 → 3 → 0**,
`loop-timescale-not-comparable` **0 → 2 → 0**, `loop-graph-ungrounded-component` **7 → 4**,
`loop-graph-grounded-exogenous-only` **2 → 6**. Every number below that describes an outcome was
produced this way, not estimated.

**Codebase coupling, from `aof graph impact` against a graph built this session** (12851 nodes,
31465 edges, `egress: none`, built 2026-08-28T17:57:28.998Z). Every boundary in ADR-007 is drawn on
these numbers:

| module | dependents (production) | imports | 58 |
|---|---|---|---|
| `src/work-loops.mjs` | 30 (**4** — the four `commands/loops-*`) | 3 | **edited** (58/00) |
| `src/work-loops-checks.mjs` | 14 (**2** — `commands/loops-validate`, `commands/loops-groundedness`) | **0** | **edited** (58/02) |
| `src/commands/loops-show.mjs` | 2 (**1** — `command-core`) | 1 | **edited** (58/03) |
| `src/commands/loops-graph.mjs` | 3 (**1** — `command-core`) | 2 | **edited** (58/03) |
| `src/commands/loops-validate.mjs` | 4 (**1** — `command-core`) | 2 | not edited |
| `src/work-doctor-loop-ready.mjs` | 6 (**1** — `commands/doctor`) | 1 | **not edited** (ADR-006 §3) |
| `src/loop-bounds.mjs` | 18 (**10**) | **0** | **not edited** (ADR-002 §6) |
| `src/commands/loop.mjs` | 28 (**1** — `command-core`) | 16 | **not edited** (ADR-004 §2) |
| `src/work.mjs` | **264** — the god node | 7 | **not edited** |

**Coverage gap, stated rather than inferred.** `aof graph impact src/bundle/loops/operator.md
src/bundle/bundle.json` reports both as **NOT COVERED BY THIS GRAPH** — graphify extracts `.mjs`
call/dependency edges, so the registry's markdown records and the bundle descriptor have **unknown**
coupling, not zero. 58/01's boundary is therefore drawn from the loader's own declared home
(`loadLoops` reads `<workspace.aofDir>/loops`, 53/FF-5312) and `bundle.json`'s membership list, which
are exact, and not from a graph answer that does not exist.

---

## ADR-001: A reference has exactly three admissible owners — a slower LOOP, an ACTOR, or a `frozen-rule` ANCHOR — and each of the five new edges is AUTHORED as a design act and says so in its own record

**Status:** Accepted
**Date:** 2026-08-28

**Context.** RESEARCH §Q1 is unambiguous: five of seven loops have no citable owner, and three of the
five would trace to roles (`aof-architect`, `aof-qa`, `aof-developer`) that have **no `actor:` node**
in the registry. Four shapes were available and only one of them expresses the relation the SPEC
asks for.

*(a) Add `actor:` nodes for the agent roles and let them own the loops.* Admissible by precedent —
`actor:product-owner` is already an agent role rather than a human — and it would clear all five
findings in one commit. **Rejected, and this is the decision the ADR exists for.** The SPEC's
hierarchy is a hierarchy of **scopes** (*"task ← story ← milestone ← PRD ← human"*), not of **roles**.
A role-actor edge says who does the authoring; it says nothing about which cycle is slower, so it
cannot be inverted, cannot be separated, and — decisively — **`checkTimescale` never visits an actor
as an edge source** (`src/work-loops-checks.mjs:525-529`). Role-actors would clear
`loop-unowned-reference` at the exact cost of making this milestone's other two deliverables,
timescale layers and sparse inter-layer edges, structurally unreachable. That is a check satisfied
without the relation it checks for — 55/ADR-002's failure mode, and the temptation 55 named by name
(*"declaring an operator edge to every loop just to clear the check"*).

*(b) An `item:` endpoint.* `item` is already in `ENDPOINT_SCHEMES` and no record uses it. **Rejected
on the measured predicate:** `checkReferenceOwnership` counts an endpoint only when
`ids.has(endpoint.raw)` — the set of **declared node ids** (`src/work-loops-checks.mjs:445-450`). An
`item:` endpoint resolves to no declared node, so it satisfies nothing today, and making it satisfy
something would mean teaching the ownership check to resolve work items — a second resolver over the
item tree, inside the module 52/ADR-007 froze as import-free.

*(c) A loop owns a faster loop.* This is what *"put a slower loop above it"* means in the SPEC's own
sentence, and it is the classical cascade relation the PRD cites: the outer loop's output IS the
inner loop's setpoint. It is the only shape on which ADR-002's separation rule can bite.

*(d) A frozen authority supplies a reference no cycle revises.* RESEARCH §Q1.5 found that
`loop:run-resilience`'s reference is the closed `isLegalTransition`/`isRetryable` sets, hardcoded in
source — *"nobody 'sets' it at runtime"*. Inventing a supervisor for it would be fabrication. 55
already shipped the vocabulary for exactly this and never instantiated it: `ground: frozen-rule`.

**Decision.**

**1 — The admissible sources of a `target-setting` edge are frozen at three, and the rule is
CHECKED.** A `target-setting` edge may originate only from `kind: loop`, `kind: actor`, or a
`kind: anchor` whose `ground:` is **`frozen-rule`**. Any other source — a `watcher`, an `arbiter`, or
an anchor whose ground is `process-exit` / `build-stamp` / `landed-commit` / `live-soak` /
`exogenous` — is **`loop-target-setting-not-admitted`**, emitted by `checkReferenceOwnership` at the
source node's path. Two of those exclusions are load-bearing and not bookkeeping: a **watcher** that
sets a target acts on what it watches through a door 57/ADR-001 §3 closed on the front; and an
**arbiter** that sets a target has stopped arbitrating and become a supervisor (ADR-003 §5). And
restricting the anchor branch to `frozen-rule` is what stops (d) becoming a loophole — *"declare an
anchor for any loop whose owner you cannot find"* — because only a frozen rule is an authority that
by definition no cycle revises.

**2 — The seven references, their real authorities, and who owns each. `authored` means this
milestone declares the relation as a design act; `discovered` means the repository already stated
it.** Every row's evidence is a citation, and a row with no evidence is not in the table.

| loop | what the reference actually IS | owner declared by 58 | source kind | status |
|---|---|---|---|---|
| `loop:autonomous-cascade` | the operator's range argument, threaded to `work:loop`'s `scope` (`src/bundle/commands/autonomous.md:15`; `src/commands/loop.mjs:702-708`) | `actor:operator` | actor | **discovered** (52) |
| `loop:verify-triage-accept` | VERIFICATION evidence and the PO's blocker/non-blocker/design-gap triage (`src/bundle/commands/verify.md:112-113`) | `actor:product-owner` | actor | **discovered** (52) |
| `loop:build-to-green` | the task `.feature` of the item the cascade selected (`src/bundle/commands/continue.md:186-189`) | `loop:autonomous-cascade` | loop | **AUTHORED** |
| `loop:review-fix-rereview` | the contract and the ADRs of the item the cascade selected (`src/bundle/commands/continue.md:196-201`) | `loop:autonomous-cascade` | loop | **AUTHORED** |
| `loop:run-resilience` | the closed transition/retry sets, hardcoded (`src/run-store.mjs:281` `isLegalTransition`, and `isRetryable`) | `anchor:run-lifecycle-policy` | anchor (`frozen-rule`) | **AUTHORED** |
| `loop:mesh-assignment-reclaim` | two config-settable numbers — `work.loop.heartbeatMs`, `mesh.presence.stalenessSeconds` (RESEARCH §Q1.6) | `actor:operator` | actor | **AUTHORED** |
| `loop:retrospective-memory-ingest` | what counts as a lesson worth making recallable — an aggregate with no single author (RESEARCH §Q1.7) | `actor:operator` | actor | **AUTHORED** |

**3 — The cascade edges are authored, and what is discovered inside them is stated separately.** What
is *discovered* is that the cascade dispatches refine, continue and verify per ready item, and that
`work:next` determines **which** item. *(Corrected 2026-08-28 at 58/01s structural review: this
paragraph originally cited `src/bundle/commands/autonomous.md:60-81`. That file is **47 lines** and
names neither refine, continue, verify nor `work:next` — milestone 53 rewrote it into a thin wrapper
over `aof work loop` (`src/bundle/commands/autonomous.md:29-41`), moving the per-item dispatch into
`src/commands/loop.mjs`. The citation was inherited unchecked from 52s `autonomous-cascade.md`. The
RELATION is unaffected — it was always the AUTHORED half — but the discovered half must name where
the dispatch lives today, and `FF-5810` now makes this class of rot fail CI instead of waiting for a
reviewer.)* What is *authored* is the
claim that this dispatch **is** target-setting: the cascade's output (the selected item) is what
determines the build loop's setpoint (that item's `.feature`) and the review loop's setpoint (that
item's contract and ADRs). That is a faithful cascade relation, and it is the ADR's judgment, not a
citation. Each record's body says so in those words. **A citation the repository does not supply is
never manufactured** — 52's `operator.md:22-24` and `product-owner.md:18-19` both refused to invent a
second edge, and this milestone does not retroactively invent one either: it adds edges and declares
them as decisions.

**4 — `actor:operator` gets THREE new edges — two to loops and one to the arbiter — and the
admission rule is stated PER TARGET so the next milestone cannot drift.** *(Amended 2026-08-28,
raised at contract authoring. §4 originally said "exactly two new edges", counting only the loop
targets, and so contradicted ADR-003 §6, which widens `ENDPOINT_SCHEMES` precisely so the third can be
declared. **The third edge exists**; the count was the defect.)*

- **To a LOOP** — admissible **only** when that loop's reference is (i) a configuration key the
  operator hand-edits (RESEARCH §Q3 measured that *every* knob in this system is changed that way and
  that **no command or agent prompt writes any of them**), or (ii) a governance judgment with no
  declared revising cycle. `mesh-assignment-reclaim` is (i); `retrospective-memory-ingest` is (ii).
- **To the ARBITER** — `actor:operator --target-setting--> arbiter:speed-thoroughness-autonomy`, and
  this is the **only** non-loop target admitted, now or later. What it sets is the arbiter's
  `priority:`, which is the SPEC's root reference in the SPEC's own words: *"The human owns what is
  worth controlling at all."* An arbiter whose priority no one is recorded as setting is the evening's
  mood again, one level up. This edge is also what makes ADR-003 §6's `ENDPOINT_SCHEMES` widening
  **exercised rather than dead vocabulary** — 58 widens that enum for exactly one declared edge, and
  this is it.

A **fourth** operator edge, or any second non-loop target, added for another reason is the catch-all
55 warned about, and is refused here in advance.

**5 — Ownership IS transitive to `actor:operator`, and the transitivity is the grounding flood, not a
new algorithm.** After 58 every reference traces to `actor:operator`, to `actor:product-owner`, or to
a `frozen-rule` anchor. `checkGrounding` already computes exactly this — it floods forward from every
`ground:`-bearing actor/anchor along all five edge keys (`src/work-loops-checks.mjs:194-208`) — so
making the hierarchy explicit **improves the grounding report as a side effect and adds no second
traversal**. Measured on the prototype: `loop-graph-ungrounded-component` **7 → 4**;
`loop-graph-grounded-exogenous-only` **2 → 6**; net grounding findings 9 → 10. The **+1** is the
arbiter's **own** component reporting `exogenous-only` — its own, not the operator's, because
`target-setting` is one-way and an SCC needs a cycle, while the *flood* crosses the edge and carries
the exogenous class into it. That is not a defect: the arbiter's priority is set by a human and by
nothing else, which is exactly what `exogenous-only` says. It is reported, not hidden, and it stays
`warn` (ADR-005 §2).

**The measured cost of NOT declaring §4's third edge.** With the operator→arbiter edge removed from
the prototype and nothing else changed, `loop-graph-ungrounded-component` is **6** and
`loop-graph-grounded-exogenous-only` is **4** — **two** components strictly worse, not one:
`arbiter:speed-thoroughness-autonomy` itself, **and `loop:verify-triage-accept`**, whose only path to
ground runs operator → arbiter → `veto` (its own owner, `actor:product-owner`, is an agent role and
declares no `ground:`, 52/ADR-005 §1). The finding total is 34 either way, so this is not a count
argument: it is that two components report the worse verdict, and one of them is a loop this
milestone claims to have brought under supervision.

**6 — `owner:` is NOT touched, and the two notions are held apart by a control rather than merged.**
`owner:` is a scalar `actor:` ref meaning *the role accountable for the loop*; a `target-setting`
edge means *the node that sets its reference*. They are adjacent and they are not the same fact, so
58 leaves the six `loop-owner-unknown` warns exactly where 52 put them. What 58 adds is the rule that
they may never **disagree**: if a loop declares `owner: actor:X`, then `actor:X` must declare a
`target-setting` edge to it. Today that holds once (`verify-triage-accept` ← `product-owner`) and is
vacuous elsewhere; `FF-5806` makes it a standing control rather than a coincidence. Merging the two
is refused: `owner:` admits only an `actor:` ref (`src/work-loops.mjs:303-306`), so it cannot express
a loop-owned or anchor-owned reference, and half-filling it would put ownership in two homes that
disagree by construction.

**Rejected.** *Adding `actor:aof-architect` / `actor:aof-qa` / `actor:aof-developer`* — (a) above.
*A second `target-setting` edge from `actor:product-owner` to `loop:build-to-green`* — RESEARCH §Q1.3
found the `.feature` is co-authored by three roles in one refine session; a PO-only edge would name a
partial author as the owner, which is worse than an authored cascade edge because it looks
discovered. *A new `loop:refine-contract` record* — it would be a real loop with real citations, but
it adds a fifth contender to `prose:src/bundle/agents/aof-developer.md`, widens the arbitration set
this milestone is trying to close, and 52/ADR-010's discipline is that a new loop record is reviewed
on its own evidence, not added as a side effect of another milestone's need.

**Invariant.** Every `kind: loop` record in `src/bundle/loops/` has an inbound `target-setting` edge
from another node; every `target-setting` edge's source is a `loop`, an `actor`, or an `anchor` whose
`ground:` is `frozen-rule`; no `watcher` and no `arbiter` declares `target-setting`; and `owner:`
never names an actor that does not declare the matching edge. (Enforced by `FF-5806`.)

---

## ADR-002: Timescale separation is a SECOND, ordinal axis — `layer:` declared on the loop and CORROBORATED by a loader-computed scope rank — with exactly one boundary per edge; the ratio stays 3, stays a frozen literal, and the cadence cross-product stays byte-identical

**Status:** Accepted
**Date:** 2026-08-28

**Context.** RESEARCH §Q2 measured the trap precisely. Six of seven loops are `event:`-cadenced and
one is `periodic:15s`, and `checkTimescale` can compute a ratio only when **both** ends are periodic
— so the moment ADR-001's loop→loop edges land, every such pair emits
`loop-timescale-not-comparable`. Measured on the prototype: exactly **2**. A milestone whose headline
is *"timescale separation"* cannot ship by converting five `unowned` findings into two
`not-comparable` ones.

Two things are frozen and must not be contradicted. 52/ADR-006 §5 bans converting an `event:` trigger
to a duration *anywhere in the implementation*, and
`test/arch/acd-loop-timescale-comparability.test.mjs:67-68` enforces it as a **grep over
`src/work-loops-checks.mjs`**: no `EVENT_TRIGGERS` member may appear in that file at all. And the
same suite freezes the whole 36-pair cadence cross-product to **exactly one finding per pair**, plus
the `periodic(45_000)`/`periodic(15_000)` boundary at ratio 3 producing **none**.

The way through is that **a duration and an ordinal are different things**. `EVENT_TRIGGERS` is a
closed four-member set — `per-run-start`, `per-phase`, `per-item`, `per-milestone` — whose members
stand in a real containment relation in *this* system: a run-start happens inside a phase, a phase
inside an item, an item inside a milestone. That is the SPEC's own *"task ← story ← milestone"*
hierarchy, and it is a structural fact about ACD, not an estimate like *"per-item ≈ minutes"*. An
ordinal over it can be computed; a duration cannot.

**Decision.**

**1 — `layer:` is an OPTIONAL scalar key on `kind: loop` only, taking a frozen three-member enum:
`operational` | `management` | `governance`.** Optional, not required, and the reason is mechanical:
making it required would make all seven shipped loop records emit `loop-missing-field` the instant
the schema lands, coupling 58/00 to 58/01 through a red tree. The *requirement* is therefore
**computed** — a `kind: loop` node with no `layer:` is `loop-layer-undeclared`, emitted **per node
by `checkReferenceOwnership`** — which is 55/ADR-002 §2's ruling applied verbatim. `layer:` is
admitted on no other kind: an actor, anchor, watcher or arbiter has no cadence and therefore no place
on this axis.

**1a — THE LANE RULE, and why the per-node census is not the timescale check's.** *(Amended
2026-08-28, raised at contract authoring: §1 originally said "from the timescale check", which
cannot coexist with `FF-5802`'s identity leg.)* The rule, stated generally so the next layer-shaped
code has a home without another ADR:

> **A per-node claim about what a loop DECLARES is `reference-ownership`'s lane. A per-edge claim
> about SEPARATION between two loops is `timescale`'s. `checkTimescale` emits no per-node finding at
> all — every finding it emits is anchored to a `target-setting` edge.**

So `loop-layer-undeclared` and `loop-layer-contradicts-cadence` (§3) are emitted by
`checkReferenceOwnership`, and `loop-layer-inversion` and `loop-layer-skipped` (§4) by
`checkTimescale`. Three reasons:

- **It is the only shape that keeps ADR-005 §5's arithmetic and `FF-5802` both true.** A per-node
  census inside `checkTimescale` breaks the frozen guard in **five** places, not one: the 36-pair
  cross-product asserts exactly one finding per pair, and four further fixtures — the self-edge, the
  actor-source pair, the actor-target pair and the dangling endpoint — assert `[]` over models that
  contain a layerless loop (`test/arch/acd-loop-timescale-comparability.test.mjs:39-56`). Scoping the
  census to the edge domain instead would contradict ADR-005 §5's count of **7** and, worse, would let
  a layerless loop with **no supervising edge** slip the gate entirely — which is exactly
  `loop:run-resilience`, whose owner is an anchor and which therefore has no loop→loop edge at all.
- **The subject is the same one `reference-ownership` already owns.** That check is already per-node
  and already answers *"has this loop declared its place in the supervision hierarchy?"* —
  `loop-unowned-reference` is the who half, `loop-layer-undeclared` is the where half. ADR-001 and
  ADR-002 are the two halves of one claim, and this puts their completeness findings in one lane.
- **It costs no check id.** ADR-005 §3 keeps `CHECK_IDS` at six because `COMPOSED_CHECK_IDS`
  duplicates it; a seventh id would silently leave doctor scoring six of seven. *Rejected: a seventh
  check id* on that ground. *Rejected: making `layer:` a required KEY* so the loader reports absence —
  §1's own reason, it reddens all seven records the instant 58/00 lands. *Rejected: weakening
  `FF-5802`* — the identity leg IS ADR-002's defence; losing it means the layer axis is no longer
  demonstrably additive over the frozen cadence axis, which is the one claim this ADR rests on.

**2 — The ordering has ONE home, and it is the loader.** `src/work-loops.mjs` owns two maps and the
checks own neither:

| declared | loader attaches | meaning |
|---|---|---|
| `layer: operational` \| `management` \| `governance` | `rank` = 0 \| 1 \| 2 on the parsed `layer` field | slower is higher |
| `cadence: event:per-run-start` \| `event:per-phase` | `scopeRank: 0` on the parsed `cadence` field | inside a phase |
| `cadence: event:per-item` | `scopeRank: 1` | one item |
| `cadence: event:per-milestone` | `scopeRank: 2` | one milestone |
| `cadence: periodic:*` \| `unknown` | **no `scopeRank`** | a clock says nothing about scope |

This rides on the parsed field exactly as `ms` rides on a periodic cadence today
(`src/work-loops.mjs:277`). The checks read `fields.layer.rank` and `fields.cadence.scopeRank` and
**never spell a layer name or a trigger token**, so `acd-loop-timescale-comparability`'s grep leg
survives untouched and is *extended* to ban the three layer literals from the checks module too
(`FF-5802`). **No duration is derived from either map, and none may be:** a rank is compared with
`<` / `===`, never divided.

**3 — The declaration is cross-checked, so it is not fabricable where it can be checked.** A `layer:`
whose rank differs from its cadence's `scopeRank` is **`loop-layer-contradicts-cadence`**. A loop
cannot declare itself `governance` to dodge an inversion while its cadence says `event:per-phase`.
For a `periodic:` or `unknown` cadence there is no scope rank and the declaration stands on its
record's own narrative — the honest residue of the two-axis problem, and the reason `FF-5806` bounds
the number of uncorroborated layer declarations in the shipped registry at **one** and names it,
rather than pretending the gap is closed.

**4 — "Sparse inter-layer edges", made computable: exactly ONE boundary per `target-setting` edge.**
For an edge from source layer S to target layer T, with `Δ = rank(S) − rank(T)`:

| Δ | outcome | why |
|---|---|---|
| `Δ ≤ 0` | **`loop-layer-inversion`** | the SPEC's sentence verbatim: *"An outer loop that is not several times slower than its inner loop does not supervise it; it fights it."* A **same-layer** target-setting edge is an inversion, not a permitted case — that is the ruling this row exists to make. |
| `Δ === 1` | no finding | the supervision relation the milestone is for |
| `Δ ≥ 2` | **`loop-layer-skipped`** (warn) | a governance cycle reaching past the management layer to set an operational setpoint. Legible, sometimes right, never silent — and never gating, because sparseness is a preference and an inversion is a break. |

**5 — The decision table, and why the frozen cross-product is untouched.** For each non-self
loop→loop `target-setting` edge whose endpoints are both declared:

- **both ends carry `layer`** → decide on the layer axis (§4);
- **exactly ONE end carries `layer`** → the layer axis **cannot decide, and emits nothing**. There is
  no crossing to measure against a rank that was never declared, so the pair falls to the branches
  below exactly as if neither end were layered; the undeclared end is reported once, on its own
  record, by §1a's `loop-layer-undeclared`. *(Amended 2026-08-28: §4's Δ table covers only the
  both-declared case and §5 left this inferred.)* Reporting a crossing here would require inventing
  the missing rank, which is the move this whole ADR exists to refuse;
- **both ends are `periodic`** → *also* apply the ratio rule, unchanged from 52/ADR-006 §3;
- **neither axis can decide** → `loop-timescale-not-comparable`, message unchanged.

With **no layer declared** the first branch does not run, so the 36-pair cross-product, the ratio-3
boundary and the `data-feed`-produces-nothing case all behave byte-identically to 52. The layer axis
is **additive over the cadence axis**, which is what makes `FF-5802` a real assertion rather than a
promise. A pair that is both layer-inverted and ratio-inverted yields two findings, one per axis —
two independent slips, not one slip double-reported (52/ADR-012's rule read correctly).

**6 — The minimum separation ratio stays `3`, stays a frozen literal, and is EXPORTED as
`MIN_SEPARATION_RATIO` from `src/work-loops-checks.mjs`.** Three homes were possible and two are
refused on measured grounds. *A config key* — refused twice over: `resolvesLoopBoundConfigKey` lives
in `src/loop-bounds.mjs`, which has **10 production dependents**, so widening its vocabulary for a
number no runtime reads would touch a hot module for nothing; and `src/work-loops-checks.mjs`
**imports 0 modules** by 52/ADR-007's purity ruling, so it *cannot* read config without breaking
`FF-5503`. There is also a principle: a control whose threshold the optimizer may lower is not a
control. *Per-layer ratios* — refused: with three layers and a one-boundary rule the layer axis
already carries the separation, and the registry has exactly one periodic loop, so per-layer ratios
would be unexercised vocabulary. **The value does not move.** 52/ADR-006 §4 permitted 58 to supersede
it; nothing measured here supports 5 or 10 over 3, and moving it would invalidate a frozen boundary
for no gain. 58 supersedes the *rule* — by adding the ordinal axis — not the number. Exporting it
replaces the bare numeral at `src/work-loops-checks.mjs:539` so `FF-5802` can assert the literal
instead of grepping for a digit.

**7 — The day-one layer assignment, and it must be consistent with §3.**

| loop | cadence | scope rank | `layer:` |
|---|---|---|---|
| `loop:build-to-green` | `event:per-phase` | 0 | `operational` |
| `loop:review-fix-rereview` | `event:per-phase` | 0 | `operational` |
| `loop:run-resilience` | `event:per-run-start` | 0 | `operational` |
| `loop:mesh-assignment-reclaim` | `periodic:15s` | — (uncorroborated) | `operational` |
| `loop:autonomous-cascade` | `event:per-item` | 1 | `management` |
| `loop:verify-triage-accept` | `event:per-item` | 1 | `management` |
| `loop:retrospective-memory-ingest` | `event:per-milestone` | 2 | `governance` |

ADR-001's two loop→loop edges are both `management → operational`, `Δ = 1`. Measured consequence:
**`loop-layer-inversion` 0, `loop-layer-skipped` 0, `loop-timescale-not-comparable` 2 → 0.**

**8 — Additive on every shipped record, as a checkable claim.** `layer:` is optional and admitted on
one kind; `scopeRank` is an added key on an existing field object; no enum loses a member; no key
changes shape. **All fourteen records shipped before 58 parse with zero new findings** — asserted by
`FF-5801`, not asserted by this paragraph.

**Rejected.** *Computing the layer entirely from cadence* — it works for the four event triggers and
is undefined for `periodic:`, and defining it would be the invented conversion 52 refused.
*Declaring the layer with no cross-check* — fabricable, and 55/ADR-002 exists to stop exactly that.
*A `loop-layer-declared-unverifiable` warn on every periodic loop* — refused on a measured cost:
`computeLoopReady`'s `clearsL3` requires **zero findings in every composed check**
(`src/work-doctor-loop-ready.mjs:107-121`), so a permanent census warn inside the timescale check
would permanently block the L3 unlock 55 shipped. The same fact is carried by `FF-5806`'s bound,
where an architect reads it and a gate does not trip on it.

---

## ADR-003: The arbiter is a FIFTH node kind that RECORDS the trade-off and CANNOT act — `resolves`, `priority`, `dwell`, an outbound `veto` to every contender and `parameter-tuning` to the knobs it owns; it declares no actuator and no target

**Status:** Accepted
**Date:** 2026-08-28

**Context.** RESEARCH §Q3 quotes the predicate exactly (`src/work-loops-checks.mjs:498-501`): a shared
actuator counts as arbitrated when **some node that is not itself a contender declares a `veto:` edge
naming every single contending loop id** — of *any* kind, since `veto` is admitted to every kind. A
partial veto clears nothing. Because `{PO contenders} ⊂ {developer contenders}` and
`{QA contenders} ⊂ {developer contenders}`, **one** node vetoing all four loops clears all three
findings — verified on the prototype: `actuator-arbitration` **3 → 0**.

That is also the trap. Adding `veto: [loop:autonomous-cascade, loop:build-to-green,
loop:review-fix-rereview, loop:verify-triage-accept]` to `operator.md` clears the check in one line
and records **nothing**: no priority, no owned knobs, no statement of the conflict. The SPEC's
requirement is *"an arbiter that owns the trade-off … recording the trade-off as an owned decision
rather than an evening's mood"*, and a bare veto edge is the evening's mood with a checkbox. Three
shapes were available, argued the way 57/ADR-001 argued the watcher.

*(a) A key on the contending loops — `priority:` or `arbitrated-by:` on each.* **Rejected:** each
contender would declare its own precedence, which is the contenders arbitrating themselves, and two
of them could disagree with nothing to resolve it — the two-ended-edge failure 55/ADR-002 §1 refused.

*(b) Reuse `kind: actor`.* **Rejected on three measured grounds.** An actor is a node that **acts**,
and in this registry every actor is either the human or an agent role that is itself one of the
contended actuators — `actor:product-owner` corresponds to
`prose:src/bundle/agents/aof-product-owner.md`, which is contended finding #2. **An arbiter that is
also a contender is the maker judging itself**, the coupling 57/ADR-002 §3 named. Second, `actor`
admits `ground:`, so an arbiter-as-actor could declare `ground: exogenous` and make a written policy
report as human ground. Third, reusing the kind means widening `ACTOR_KEYS` with `priority`/`dwell`,
which would then be legal on `actor:operator` — a second, uncheckable home for the same policy.

*(c) A fifth node kind.* Additive, exactly as 55 widened to three and 57 to four.

**Decision.**

**1 — `NODE_KINDS` widens to five frozen literals: `loop`, `actor`, `anchor`, `watcher`, `arbiter`.**
Nothing is removed; every record 52, 55 and 57 shipped parses with **zero new findings**.

**2 — An arbiter's admitted keys are frozen here:** `id`, `kind`, `title`, `resolves`, `priority`,
`dwell`, and the five existing edge keys. **All of `id`, `kind`, `title`, `resolves`, `priority`,
`dwell` are required.**

**3 — The arbiter admits NO `actuator`, NO `measurement`, NO `cadence` and NO `ground`.** The first is
57/ADR-001 §3's rule applied to the new kind and it is the independence rule made *unspeakable*
rather than merely checked: an arbiter that could declare an actuator could declare that it acts on
what it arbitrates, and a node carrying `actuator:` is `loop-key-not-admitted-for-kind` from the
existing loader with no new code. `ground:` is excluded so an arbiter can never issue itself
authority (55/ADR-001 §3's rule, same reason). `cadence:` is excluded because an arbiter is not a
cycle and therefore has no place on ADR-002's axis.

**4 — `resolves:` is a scalar PHRASE naming the CONFLICT, and it follows the `counter` rule
exactly — phrase-only.** *(Amended 2026-08-28, raised at contract authoring. §4 originally said
"in the same register as a loop's `controlled:` and a watcher's `counter:`". Those are **two different
rules** in `src/work-loops.mjs:289-301`: `controlled` is `machineField(key, raw) ?? phrase`, so it
admits `module:` / `command:` / `config:` / `prose:`; `counter` is phrase-only. The register is
`counter`'s, and `controlled` is no longer cited as a model.)* Concretely: `resolves` admits a
non-empty string that is **not** a `SENTINEL_TOKENS` member (`src/work-loops.mjs:98`) and does **not**
begin with a `RESERVED_FIELD_PREFIXES` entry (`:178`); anything else is `loop-bad-value`. So
`resolves: prose:src/bundle/agents/aof-developer.md`, `resolves: config:work.loop.reviewRounds` and
`resolves: unknown` are all **refused**. Three reasons, in order of weight.

- **(a) A pointer would restate the contended actuator, which is already COMPUTED.** The only
  pointers that could plausibly sit here are the three shared agent definitions — and those are
  exactly what `checkActuatorArbitration` derives its contender set from. ADR-003 already refused a
  declared `governs:` on that ground (55/ADR-002: prefer the computed requirement); admitting a
  pointer on `resolves` re-opens the same door under a different key, and an arbiter whose statement
  of the conflict is a path to the thing being contended has said nothing a reader could not already
  compute.
- **(b) `resolves` is the REVIEWABLE half, and a pointer defers the statement.** This is 57/ADR-001
  §4's justification for `counter`, verbatim: a reader must be able to see *which* standing conflict
  this node owns **without running anything and without opening another file**. A phrase is that; a
  path is a promise that some other file says it.
- **(c) A sentinel would be an arbiter that cannot name its own conflict** — the same reasoning
  ADR-004 §3 used to refuse `unknown` on `dwell`. Both of the arbiter's policy scalars refuse
  sentinels for one reason: neither is a fact the repository supplies, so neither has a gap to
  declare.

**One branch, not two copies.** `counter` and `resolves` are now the same rule, so `scalarField`
handles them in **one** branch (`if (key === "counter" || key === "resolves")`) rather than carrying a
second copy of the predicate. A duplicated three-line predicate is how `ITEM_RE` came to exist in four
places. `FF-5801` asserts that the two keys **accept and reject identically**, which is the property;
it does not assert the branch's shape.

**5 — `priority:` is an ORDERED list of `loop:` refs, most-important-first, and the check binds it to
the veto set.** It is the recorded trade-off in machine-readable form: when these loops' demands on a
shared actuator conflict, the earlier one wins. **`priority` must be a permutation of the arbiter's
own `veto` endpoint set** — no duplicates, no extras, no omissions — or
**`loop-arbiter-priority-incomplete`**. The two keys carry different information (`veto` is the edge
the graph and the existing predicate read; `priority` is the ordering over it) and the check makes
disagreement impossible.

**A defective `priority` does NOT un-clear the actuator — the two codes are independent.** *(Ruling,
2026-08-28: §9 conditioned clearing on the vetoing node's KIND alone and §5 left the interaction
unstated.)* An arbiter of the right kind vetoing every contender clears
`loop-shared-actuator-unarbitrated`; a defective order is reported **separately** as
`loop-arbiter-priority-incomplete`, on the arbiter's own record. The stronger-sounding reading — *an
arbiter that has not recorded the trade-off has not arbitrated, so it clears nothing* — is refused
because it **buys nothing and costs precision**: `loop-arbiter-priority-incomplete` is itself in
`GATING_CODES` (ADR-005 §1), so a defective order already fails CI, and the gate outcome is identical
either way. What un-clearing would add is a **second finding for one slip**, anchored at
`model.source` rather than at the arbiter, naming an actuator and a contender list that are not the
defect — the noise 52/ADR-012 legislated against with *one slip, one finding*, and a reader sent to
the wrong artifact.

**That independence is CONDITIONAL on both codes gating, and the condition is binding.** If a later
milestone demotes `loop-arbiter-priority-incomplete` to `warn`, a defective arbiter would clear a
shared actuator against nothing but a warning — the hole this ADR was written to close. Demoting it
without simultaneously re-coupling the two codes is **refused in advance**; `FF-5805` asserts the
membership, and `FF-5803` pins the severity that makes it safe.

*Rejected: letting `veto:`'s declaration order carry the ordering* — edge
order is invisible to a reader, undocumented in 52/ADR-004, and a future re-sort would silently
change policy. *Rejected: dropping `veto` and having the check read `priority`* — it would break the
frozen arbitration predicate and would leave the arbiter with no edge at all, hence outside the
grounding graph.

**6 — The arbiter is a graph node, and the line that makes it one belongs to 58/02.**
`isGraphNode` (`src/work-loops-checks.mjs:116-118`) gains `arbiter`, and `ENDPOINT_SCHEMES`
(`src/work-loops.mjs:96`) gains `arbiter` so an actor can declare a `target-setting` edge **to** it.
*(Amended 2026-08-28: the two halves have different owners. `ENDPOINT_SCHEMES` is 58/00's;
`isGraphNode` is 58/02's, because 58/02 is the sole writer of `src/work-loops-checks.mjs`. The
membership BEHAVIOUR is therefore contracted in 58/02 and asserted by `FF-5805`, a 58/02 control —
ADR-007 §1a.)* Both are load-bearing: without the first the arbiter is invisible to every check, including
the one it exists to clear; without the second `actor:operator --target-setting--> arbiter:…` is
`loop-bad-value`, and the node the human's priority belongs to could not say so. `watcher` and
`anchor` are **not** added to `ENDPOINT_SCHEMES` — 58 widens it for the one edge it actually
declares, and speculative widening for kinds nothing points at is refused.

**7 — The knobs it owns are declared with the EXISTING `parameter-tuning` edge, used for its literal
meaning.** No new key. **"Bounds" means one thing and it is checkable: a knob an arbiter claims must
be cited as a `ceiling:` pointer by one of the loops it vetoes.** *(Ruled 2026-08-28: §7 originally
claimed FOUR knobs "the contending loops themselves cite as bounds", but
`config:work.loop.progressMaxResets` is cited by **no** loop record — it exists only as
`DEFAULT_PROGRESS_MAX_RESETS` / `resolveProgressMaxResets` in `src/loop-bounds.mjs:13,:40`. The claim
was false on its own criterion, so the row drops to three rather than the criterion being widened to
rescue it.)* The three, each verified against the record that cites it:
`config:work.loop.reviewRounds` (`review-fix-rereview.md:11`),
`config:work.loop.buildNoProgressRounds` (`build-to-green.md:11`) and
`config:work.autonomous.maxAttempts` (`autonomous-cascade.md:11`).

Reading "bounds" as *"appears anywhere in `loop-bounds.mjs`"* is **rejected**: it would admit all
eight resolver keys, make the claim unfalsifiable, and let an arbiter declare authority over knobs
nothing it arbitrates runs within. The `ceiling:`-citation reading is the one that is both true today
and computable, and `FF-5806` turns it into a standing control instead of a sentence.
`work.rubric.report.floor` and `mesh.presence.stalenessSeconds` are **not** claimed: RESEARCH found
both sit entirely outside the loop-bounds vocabulary and no loop record cites either.
`loop:verify-triage-accept` declares `ceiling: none` and contributes no knob — the gate's
thoroughness is not a number, which is itself part of the trade-off being recorded.

**8 — ONE arbiter, and its priority order is a decision with a reason.**
`arbiter:speed-thoroughness-autonomy`, `resolves:` *how much of the same agent's effort each loop may
spend*, with

1. `loop:verify-triage-accept` — the acceptance gate wins. `src/bundle/commands/verify.md:106-107`
   says its `@uat` lane must *"stop and prompt the user"*, so it is the one demand that structurally
   cannot be waived.
2. `loop:review-fix-rereview` — confirmed findings are applied before anything reclaims the actuator.
3. `loop:build-to-green` — the build keeps iterating inside its no-progress tolerance.
4. `loop:autonomous-cascade` — autonomy yields last, because an unattended pass that skips a gate is
   the failure the rest of this system exists to prevent.

Priority is **not** layer order and does not claim to be: ADR-002 ranks how fast a cycle turns,
ADR-003 ranks whose demand wins when two cycles want the same agent. Two axes, stated apart.

**9 — The check narrows: only a `kind: arbiter` node clears `loop-shared-actuator-unarbitrated`.**
This is what stops a veto edge on `operator.md` clearing the finding without recording anything. It
changes no existing behaviour — measured: no shipped record vetoes any contender today, so the
narrowing has nothing to break — and the code stays **one** code (52/ADR-012: one slip, one finding),
with the message naming what was found instead.

**Invariant.** `NODE_KINDS` equals its five frozen literals and is a superset of 57's four;
`ADMITTED_KEYS.arbiter` equals its frozen set and omits `actuator`, `measurement`, `cadence` and
`ground`; `resolves`, `priority` and `dwell` are required for the kind; arbitration clears only on a
`kind: arbiter` node; `priority` is a permutation of that node's `veto` endpoint set; no arbiter
declares `target-setting`. (Enforced by `FF-5801`, `FF-5805`.)

---

## ADR-004: Ordering and dwell are DECLARED and not binding, and the item that binds them is named; the dead-band is REFUSED, with the thing that would have to exist first stated

**Status:** Accepted
**Date:** 2026-08-28

**Context.** RESEARCH §Q4 is the most useful negative result in the milestone. **Ordering** has real
precedent — the gate ladder's fixed, short-circuiting rung order (`src/commands/loop.mjs:208-234`) —
but it orders *rungs within a phase gate*, never two loops. **Backoff** and an event **debounce**
have real precedent (`src/worker-stream-client.mjs:63-66`; `src/degrade.mjs:13,28-33`). **Dwell** and
**dead-band**, in the senses this SPEC means, have **none**: the nearest neighbours pull the opposite
way (escalate after N stalls, `src/loop-progress.mjs:172-198`) or are strict rather than tolerant
(`madeProgress`, `src/loop-progress.mjs:136-142`, fires on any difference at all). And the SPEC puts
the self-tuning proposer (62) and its acceptor (61) **out of scope**, so nothing in 58 executes an
adjustment.

**Decision.**

**1 — The restraint, stated once and applied to all three devices: 58 DECLARES, the registry has
always declared, and a declaration is admitted here only if a check can read it or a reviewer can
judge it.** That is 52's whole tradition — the registry declares, the checks compute — and it is why
this ADR admits two devices and refuses one.

**2 — Ordering ships, and it is `priority:` on the arbiter (ADR-003 §5).** It is read by a check
(permutation-of-the-veto-set), it is legible without running anything, and it is the SPEC's
*"which loop runs first"* expressed as *whose demand wins*. It does **not** bind execution:
`src/commands/loop.mjs` is not edited (28 dependents; 1 production), and the gate ladder remains the
only ordering in this system that actually executes.

**3 — `dwell:` ships as a REQUIRED scalar on the arbiter with a closed grammar: `cycles:<n>` (n ≥ 1)
or `none`. `unknown` is deliberately NOT admitted.** The sentinel vocabulary exists for facts the
repository does not supply (52/ADR-002); a dwell is not a discovered fact but a policy its author
chooses, and *"no dwell"* already has a name. A malformed value is `loop-bad-value` from the existing
loader, so no new finding code is needed and `LOADER_FINDING_CODES` stays at seventeen.

**4 — What `dwell: cycles:2` MEANS when nothing in 58 executes an adjustment, said plainly.** It
means: *when 62's proposer and 61's acceptor commit a change to one of the knobs this arbiter owns
(ADR-003 §7), that change must stand for two cycles of the loop that received it before a reversion
is considered.* Units are **cycles of the receiving loop**, not wall-clock, because six of seven
loops have no clock (RESEARCH §Q2) and a wall-clock dwell would be the invented conversion ADR-002
refuses. **Today nothing reads it.** It is worth declaring now because the arbiter is the node that
owns the trade-off, and an anti-oscillation policy is *part* of the trade-off; deferring it means 62
authors policy inside a proposer, which is precisely where policy stops being reviewable. `2` is not
arbitrary: `DEFAULT_BUILD_NO_PROGRESS_ROUNDS` and `DEFAULT_PROGRESS_MAX_RESETS` are both **2**
(`src/loop-bounds.mjs:12-13`), so the dwell matches the no-change tolerance this system already
applies before it acts.

**5 — The dead-band is REFUSED, and here is what would have to exist first.** A dead-band is a
*magnitude* threshold: *"small variations do not trigger a reversion; only clear regressions do."* A
magnitude needs a comparable quantity, and the loops sharing these actuators control incommensurable
ones — *executable scenarios and fitness functions green*, *open review findings*, *items reaching
done over a work range*. A single scalar dead-band across them would be a fabricated conversion over
a set that has no common unit, which is exactly the move 52/ADR-006 refused for cadence and the one
this milestone spent ADR-002 avoiding. Three things must exist first: **(i)** a per-knob measured
quantity reported in a stable unit before and after an adjustment — 57 shipped the counters
(`work:ratchet`, `work:counters`) but neither reports per-knob; **(ii)** an audit that the instrument
producing that number actually ran — **59**; **(iii)** something that can compute a delta at all,
which is the proposer — **62**. The dead-band belongs to **62**, on its record, and 58 declaring an
unreadable `dead-band:` field would put a number in the registry that no reader could interpret and
no check could refuse. An empty field is not honesty; a stated refusal is.

**6 — "Nothing acts on the order or the dwell today" is FITNESS-REGISTER material, not a scenario.**
*(Ruled 2026-08-28, in answer to 58/01's task 03.)* Its only honest `When` is *"the loops it orders are
run"*, which in an `@executable` feature means spawning agents to prove a negative — unbuildable, and
unbuildable in a way no amount of rewording fixes, because the claim is about **what the tree does not
contain**. That is the definition of a structural invariant, and this ADR's own Invariant already
assigns it: `FF-5801` (no `dead-band` key exists in any admitted set) and `FF-5804` (`priority` and
`dwell` reach no execution path; `src/commands/loop.mjs`, `src/loop-progress.mjs` and
`src/loop-bounds.mjs` are not edited). The register's preamble already excludes it from `.feature`
material. **QA should cut the scenario**; nothing is lost, because the two controls assert strictly
more than a scenario could.

**Invariant.** No key admitted by this milestone is read by any execution path: `priority` and
`dwell` are consumed only by `work:loops` checks and faces; `src/commands/loop.mjs`,
`src/loop-progress.mjs` and `src/loop-bounds.mjs` are not edited; and no `dead-band` key exists in
any admitted key set. (Enforced by `FF-5801` and `FF-5804`.)

---

## ADR-005: Eight codes gate, and the ordering consequence is named — the records land before the gate turns on, and nothing inherited turns red

**Status:** Accepted
**Date:** 2026-08-28

**Context.** 57/ADR-003 made severity a property of the code via `GATING_CODES`, put the exit decision
only on the face, and added a step to `src/bundle/commands/validate.md` — which already reads *"Any
error-severity finding is a hard gate"* (`src/bundle/commands/validate.md:25-28`, `:68`). So a
promotion here reaches `aof:validate` repo-wide the moment it lands. 57 also hit the ordering trap
this milestone must not repeat (57/ADR-007 §6).

**Decision.**

**1 — `GATING_CODES` gains eight members and reaches thirteen.**

| code | check | gate? | why |
|---|---|---|---|
| `loop-unowned-reference` | reference-ownership | **error** | 58's subject; measured 5 → 0 |
| `loop-target-setting-not-admitted` | reference-ownership | **error** | a watcher or arbiter setting a target is an independence break |
| `loop-shared-actuator-unarbitrated` | actuator-arbitration | **error** | 58's subject; measured 3 → 0 |
| `loop-arbiter-priority-incomplete` | actuator-arbitration | **error** | an arbiter whose order omits a contender has recorded nothing |
| `loop-timescale-inversion` | timescale | **error** | 58's subject, inherited from 52; measured 0 |
| `loop-layer-inversion` | timescale | **error** | an outer loop that is not slower does not supervise |
| `loop-layer-undeclared` | **reference-ownership** | **error** | ADR-002 §1's computed requirement — per NODE, so it reaches a loop with no supervising edge (ADR-002 §1a) |
| `loop-layer-contradicts-cadence` | **reference-ownership** | **error** | a fabricated declaration, caught — per node, same lane |
| `loop-layer-skipped` | timescale | `warn` | sparseness is a preference; legible, not a break |
| `loop-timescale-not-comparable` | timescale | `warn` | an honest *"cannot decide"* is never a gate — 52/ADR-006's whole point |

**2 — No inherited red** (57/ADR-003 §2). Everything outside the table keeps its present severity:
the four grounding/anchor codes stay `warn` and belong to 55 and 59, `loop-watcher-is-judge` stays
`warn`, and all seventeen loader codes are untouched. The three codes promoted from 52's inheritance
are promoted **because they are this milestone's subject**, which is the same warrant 57 used for
`loop-unpaired-optimizer`.

**3 — `CHECK_FINDING_CODES` goes 15 → 21 and `CHECK_IDS` stays SIX.** No new check id, deliberately.
`COMPOSED_CHECK_IDS` in `src/work-doctor-loop-ready.mjs:16-23` is a second copy of the same six, kept
in step by nothing; adding a seventh id would silently leave doctor scoring six of seven and would
force an edit to a module 52/FF-5202 bans loop tokens from. The four layer codes and the
ownership-source code therefore land inside the **existing** `reference-ownership` and `timescale`
checks — split by ADR-002 §1a's lane rule, per-node claims to the first and per-edge claims to the
second — which is where they belong on the merits anyway. `FF-5807` binds the two copies so the next
milestone that wants a seventh id fails loudly instead of quietly.

**4 — The exit decision stays exactly where 57 put it.** `work:loops validate`'s `cli.exit` already
returns 1 when `summary.error > 0` (`src/commands/loops-validate.mjs:73`). No face is edited and
`run()` stays byte-identical with and without a failing gate.

**5 — THE ORDERING CONSEQUENCE, named as an edge in the partition.** Promoting these eight before
58/01's records land turns the tree red for work that is merely unfinished — 5 unowned + 3
unarbitrated + 7 undeclared layers would arrive as **fifteen error-severity findings** through
`aof:validate`'s hard loop lane. **58/01 lands before 58/02**, and 58/02's own acceptance evidence is
the re-measured baseline (§6) taken *after* 58/01 is in.

**6 — The expected state at EACH landing, measured on the prototype; the last row is the accept
criterion.** *(Amended 2026-08-28: the middle row was previously folded into the end state. It is
not the same number, because the arbiter is not a graph node until 58/02 — ADR-007 §1a/§1b.)*

| after | total | error | ownership | arbitration | timescale | grounding | anchor-grounding |
|---|---|---|---|---|---|---|---|
| baseline (today) | **39** | 0 | 5 | 3 | 0 | 9 | 4 |
| **58/01** lands — records shipped, `isGraphNode` not yet widened | **36** | 0 | **0** | 3 | 2 | 9 | 4 |
| **58/02** lands — layer axis, arbiter membership, kind narrowing, promotion | **32** | **0** | **0** | **0** | **0** | 10 | 4 |

The end state is 12 `loop-field-prose-only`, 6 `loop-owner-unknown`, 6
`loop-graph-grounded-exogenous-only`, 4 `loop-graph-ungrounded-component`, 4 `loop-anchor-absent` —
all `warn`. A different number at accept is a finding to triage, never a number to quietly update.

**6a — The interim→end delta reconciled: it is −4, not −3.** *(Added 2026-08-28 after the
figure was queried: the table gave per-check columns and never reconciled the totals, so the middle
row read as unexplained. Re-measured on the prototype; **36 is correct**.)* 58/02 moves **three**
things, not one:

| movement | Δ total |
|---|---|
| `loop-shared-actuator-unarbitrated` 3 → 0 — the arbiter enters the traversal and clears its actuators | **−3** |
| `loop-timescale-not-comparable` 2 → 0 — the layer axis decides the two loop→loop edges (ADR-002 §5) | **−2** |
| grounding 9 → 10 — see §6b | **+1** |
| | **−4** → 36 − 4 = **32** |

**6b — The interim's grounding count is LOWER for a bad reason, and this is the sharpest thing the
table records.** Grounding reads **9** at both the baseline and the interim, which invites the
reading that 58/01 changed nothing there. It changed the composition entirely, and the interim's
composition is the worse one:

| | `exogenous-only` | `ungrounded` | `loop:verify-triage-accept` |
|---|---|---|---|
| interim — arbiter NOT traversed | 4 | 5 | **`self-referential`** |
| end — arbiter traversed | 6 | 4 | `exogenous-only` |

Two components move when `isGraphNode` admits the arbiter (ADR-003 §6): the arbiter's **own**
singleton component appears and reports `exogenous-only`, and **`loop:verify-triage-accept` stops
being `self-referential`** — because the arbiter is the relay that carries the operator's exogenous
ground onward through its `veto` edges, and its own owner `actor:product-owner` is an agent role that
declares no `ground:` (ADR-001 §5's counterfactual, same mechanism). So the interim reports **one
fewer grounding finding while a loop this milestone claims to have brought under supervision sits at
the worst verdict in the taxonomy.** A node kind filtered out of the traversal does not merely fail to
report itself — it silently degrades the verdict of every node that reached ground through it. That is
the concrete cost `FF-5805`'s `isGraphNode`-parity leg exists to prevent, and it is what `FF-5806`'s
red probe should be measured against: the probe is `loop:verify-triage-accept`'s verdict, not a total.

**7 — THREE existing suites go red on the severity change alone, all updated in place, with the reason cited, and no delivered `.feature` touched.** *(Amended 2026-08-28: this said "two"; `test/watcher-independence-gate.test.mjs:186-192` pins `GATING_CODES` exhaustively at five and ADR-005 §1 takes it to thirteen. ADR-007 §3's table is the complete list — this clause names only the ones the SEVERITY decision reddens.)* `test/arch/acd-loop-timescale-comparability.test.mjs`
asserts `["loop-timescale-inversion", "warn"]` across the cross-product; and
`test/work-loops-registry-census.test.mjs:990` asserts `finding.severity === "warn"` for every
`loop-unowned-reference` in its day-one projection. The census's floors and ceilings live in the
**test**, not in the feature — the feature supplies only the code names and the reason text
(`test/work-loops-registry-census.test.mjs:971-974`) — and that suite already carries the precedent
verbatim: a row superseded in place by a later milestone with a named reason (*"milestone 69 replaced
both day-one uncapped declarations with resolved pointers"*, `:948`). Both are edited by 58/02, the
sole writer of the severity decision.

**8 — What 58/01 does NOT break, verified rather than assumed.** The census projects the model to the
day-one nine ids before running the checks (`test/work-loops-registry-census.test.mjs:190-198`), so
the arbiter and the new anchor are projected out. Measured over the prototype in that projection:
`loop-unowned-reference` **1** (floor 1, ceiling 7 — the floor survives *because* run-resilience's
owner is an anchor the projection excludes), `loop-shared-actuator-unarbitrated` **3** (*"at least
1"*), `loop-timescale-not-comparable` **2** (ceiling = 2 loop→loop `target-setting` edges),
`loop-unpaired-optimizer` **3** (pinned), `loop-owner-unknown` **6** (pinned),
`loop-timescale-inversion` **0** (pinned). 58/01 lands green.

---

## ADR-006: Three module clusters, ZERO new files under `src/`, and the blast radius stated with its numbers

**Status:** Accepted
**Date:** 2026-08-28

**Context.** The header's coupling table is the whole input. The risk in a milestone shaped like this
one is not that a change is hard — it is that a small vocabulary change reaches a hot module.

**Decision.**

**1 — Every change lands in modules that already exist, and `src/` gains no sibling.**

| module | production dependents | what 58 does |
|---|---|---|
| `src/work-loops.mjs` | 4 | `arbiter` kind + key set; `layer` key + `LAYER_VALUES` + rank; `scopeRank` on event cadences; `resolves`/`priority`/`dwell` parsers; `arbiter` in `ENDPOINT_SCHEMES` and the intra-registry scheme set; `FIELD_KINDS` gains `cycles`; **and two sites a vocabulary widening is easy to miss** — `KEY_ORDER` (`:158-166`) takes `layer`, `resolves`, `priority` and `dwell`, or an absent key falls to `KEY_ORDER.length` and a record with two malformed values reports its findings in an order nobody chose; and `splitUri`'s id-shape regex (`:246`) admits `arbiter` alongside `loop` and `actor`, or `arbiter:Some Thing` parses as a valid endpoint |
| `src/work-loops-checks.mjs` | **2**, imports **0** | `arbiter` in `isGraphNode`; the layer axis and its two per-EDGE codes in `checkTimescale`; the admissible-source rule and the two per-NODE layer codes in `checkReferenceOwnership` (ADR-002 §1a); the kind narrowing and priority rule in `checkActuatorArbitration`; `MIN_SEPARATION_RATIO` exported; `GATING_CODES` +8 |
| `src/commands/loops-show.mjs`, `src/commands/loops-graph.mjs` | 1 each | render the layer, the computed owner, and a distinct glyph per kind |
| `src/bundle/loops/`, `src/bundle/bundle.json` | *(not graph-covered)* | **2 new records, 8 edited** — all seven loops take a `layer:` (ADR-002 §7) and `operator.md` takes ADR-001 §4's three edges; `product-owner.md` and the five watcher/anchor records are untouched *(amended 2026-08-28: the cell said "3 edited", five short of what `FF-5806` requires)* |

**2 — The checks stay a PURE, ZERO-IMPORT leaf.** Every rule added above reads only the parsed model:
the layer rank and the scope rank ride on the parsed fields (ADR-002 §2), and the arbiter's priority
and veto set are both already in the model. 52/ADR-007's purity ruling and 55's `FF-5503` survive
untouched, which is what keeps `src/work-loops-checks.mjs` at **0 imports** and trivially testable.

**3 — `src/work.mjs` (264 dependents), `src/work-doctor-loop-ready.mjs`, `src/loop-bounds.mjs` (10
production dependents) and `src/commands/loop.mjs` are NOT edited.** The doctor scorer is untouched
because `CHECK_IDS` stays six (ADR-005 §3); `loop-bounds` is untouched because the separation ratio
is a frozen literal in the checks module (ADR-002 §6); `loop.mjs` is untouched because ordering is
declared, not bound (ADR-004 §2). `src/work-doctor-loop-ready.mjs`'s L3 gate benefits without being
edited: three composed checks go to zero findings, which is three of the ten rows `clearsL3` requires.

**4 — `.aof/loops/**` is NOT hand-edited by anyone.** The frozen set denies it —
`.aof/frozen-set.jsonc` member `anchors`, compiled live into `.claude/settings.json:124-125` as
`Edit(.aof/loops/**)` / `Write(.aof/loops/**)`. 58/01 edits `src/bundle/loops/`, appends to
`src/bundle/bundle.json`, regenerates `src/bundle/manifest.json` via
`scripts/generate-bundle-manifest.mjs`, and lets `aof work update` write the installed copies and
their `.aof/aof.lock.json` hashes. `acd-registry-framework-owned` requires the installed bytes to
equal the source bytes, so the install is part of the story, not an afterthought.

### Codebase health, measured, with each finding routed

- **58 is net-zero on `src/` siblings.** `src/` holds **143** flat `.mjs` files and `src/commands/`
  holds **89** — TECH_DEBT item 10's standing subject, last measured there at 108. This milestone adds
  **none**, by extending three modules that exist. Stated as evidence, not as credit: the trend line
  is unchanged, not improved.
- **Two homes for the finding-code census — fits this milestone, so it is REQUIRED here.**
  `test/arch/acd-loop-vocabulary-closed.test.mjs:53-54` asserts `CHECK_FINDING_CODES.size === 15` and
  `LOADER_FINDING_CODES.length === 17`, while `test/arch/acd-loop-finding-envelope.test.mjs:246-249`
  asserts **both sets exhaustively, by name, against a 32-row literal table**. The counts are a
  strictly weaker second home for a fact already pinned. 58/00 removes the two count assertions and
  the envelope table becomes the single home; `FF-5807` names that as the surviving control. This is
  not a shrink: it removes the weaker of two guards on one fact, and 58/02 is the story that extends
  the stronger one.
- **Three homes for the six check ids — fits, so it is REQUIRED here.** `CHECK_IDS`
  (`src/work-loops-checks.mjs:72-79`), `COMPOSED_CHECK_IDS` (`src/work-doctor-loop-ready.mjs:16-23`)
  and a third literal in `test/loop-ready-json-key.test.mjs:13`, with nothing binding any pair.
  52/FF-5202's token ban is *why* the production copy exists, so merging is refused; `FF-5807` binds
  the two production copies instead. This is the ratchet: the seventh check id now fails CI instead of
  needing an architect's eyes.
- **`isGraphNode` is a THIRD hand-copied restatement of `NODE_KINDS`, bound by nothing — fits, so
  it is REQUIRED here.** `src/work-loops-checks.mjs:116-118` spells the four admitted kinds as a
  disjunction because 52/ADR-007 forbids the checks from importing the loader, so the duplication is
  *forced* and is not the finding; that **nothing binds the copy to the original** is. 55 and 57 each
  had to remember to update it, and a kind added to `NODE_KINDS` without being added here is silently
  filtered out of every traversal — a whole node class invisible to four checks, with no finding
  anywhere. `FF-5805` gains the parity leg, in 58/02's own file so it lands with the code that
  satisfies it. (This is the third forced-duplication instance this milestone catalogued, after
  `COMPOSED_CHECK_IDS` and the `FrozenSet` class carried verbatim in both loop modules; the latter is
  inert and is left alone.)
- **Three node kinds render as one glyph — fits, so it is REQUIRED here.**
  `src/commands/loops-graph.mjs:63-67` renders `loop` and `actor` distinctly and falls every other
  kind through to `[/"id"/]`, so `anchor`, `watcher` and (after 58) `arbiter` are visually identical.
  58 makes it worse by adding a fifth kind, so 58/03 fixes it and `FF-5808` ratchets it.
- **Three registry fixtures hand-list a subset that is not endpoint-closed — fits, so it is REQUIRED here.** `acd-anchor-taxonomy-additive`, `acd-watcher-taxonomy-additive` and `watcher-node` each copy a literal list of records and then assert an exact finding set, so amending ANY shipped record to point at a record outside the list reddens all three for a reason unrelated to what they test. 55 and 57 each paid this; 58 is the third. Fixed in 58/00 by one closing helper and ratcheted by `FF-5809` (ADR-007 §3a).
- **`test/arch/` is 348 flat siblings and 58 adds four — does NOT fit; route to TECH_DEBT.**
  Reorganising the arch tree plus `scripts/test.mjs`'s registry is a milestone of its own, and
  TECH_DEBT item 10's fix names only `src/`. **Entry to add:** *"`test/arch/` has no interior
  structure — 348 flat siblings and one ~4,000-line registry. It bites the way `src/` does: a suite's
  subject is discoverable only by filename, `acd-loop-*` spans four milestones, and item 17's
  dead-suite failure was invisible because nothing groups the family. Fix: group by subject with a
  per-directory index the registry spreads, plus a sibling-count ratchet."*
- **`test/work-loops-checks.test.mjs` has crossed 2,116 lines and 58/02 will grow it — does NOT fit;
  route to TECH_DEBT.** Splitting a 2,100-line suite inside the story that also changes the module it
  tests is how a real regression hides in a rename. **Entry to add:** *"`test/work-loops-checks.test.mjs`
  is 2,116 lines covering six independent checks; 55, 57 and 58 each added to it. Fix: split per check
  id, one file each, registered in the same labelled block."*

---

## ADR-007: The partition — four stories, one sole writer per module and per contended test file, and two ordering edges

**Status:** Accepted
**Date:** 2026-08-28

**Context.** The coupling table above was produced by `aof graph impact` against a graph built this
session; the registry assets are not graph-covered and their boundary comes from the loader's home
and `bundle.json`. The risk here is not finding a partition — it is two stories editing one **test**
file and discovering it at merge, which is where the vocabulary assertions live.

**Decision.**

**1 — Four stories. Each contended module AND each contended test file has EXACTLY ONE owning
story.**

| story | owns (sole writer) | production dependents of what it touches |
|---|---|---|
| 58/00 the supervision vocabulary | `src/work-loops.mjs` + the suites that assert its literals | 4 |
| 58/01 the reference hierarchy and the arbiter record | `src/bundle/loops/`, `src/bundle/bundle.json`, `src/bundle/manifest.json` | — (not graph-covered) |
| 58/02 layer separation, arbitration and the gate | `src/work-loops-checks.mjs` + the suites that assert its behaviour and severity | **2** |
| 58/03 the supervision face | `src/commands/loops-show.mjs`, `src/commands/loops-graph.mjs` | 1 each |

**1a — Graph membership is 58/02's, on the merits and not only on the sole-writer rule.**
*(Ruling, 2026-08-28, raised at contract authoring.)* ADR-003 §6 requires a `kind: arbiter` node to be
a member of the graph the structural checks traverse. The line that does it is `isGraphNode`
(`src/work-loops-checks.mjs:116-118`), which **58/02** solely writes — so the scenario contracting
that behaviour belongs to 58/02, and it moves there. Two reasons, and the second decides it even if
the first were ever waived:

- **It is not a vocabulary claim.** `NODE_KINDS` says which kinds the *registry* admits; `isGraphNode`
  says which nodes *this module's traversals consider*. They agree by discipline, not by definition —
  `isGraphNode` is a hand-written disjunction precisely because 52/ADR-007 forbids the checks from
  importing the loader. "An arbiter is traversed" is a property of the checks module, and contracting
  it in the vocabulary story would be contracting one module's behaviour in another module's story.
- **Its blast radius is not arbitration.** `isGraphNode` gates `validNodes` and `graph()`, so it is a
  precondition of **four** checks, not one: without it `checkGrounding` never reaches the arbiter's
  component, `checkReferenceOwnership` cannot see an arbiter as a `target-setting` source — so
  ADR-001 §1's `loop-target-setting-not-admitted` would be undetectable on exactly the kind it most
  needs to catch — and `checkActuatorArbitration` finds no arbiter at all.

**It lands as its OWN task in 58/02, not folded into `02_only-an-arbiter-arbitrates.feature`.**
Folding it there would contract a four-check precondition as an arbitration precondition and leave
the other three consequences unstated, including the grounding movement ADR-005 §6's table measures. The
alternative — 58/00 writing that one line as a minuted exception to the sole-writer rule — is
**refused**: ADR-007's defining property is that no two stories write one file, and an exception
granted for one line is still an exception; the first one always is. **58/00's `files:` is unchanged
and does not list `src/work-loops-checks.mjs`.**

**1b — The transient this creates is honest, and it is 58/02's red probe.** Between 58/01 and 58/02
the registry ships an arbiter the checks do not yet recognise, so the three
`loop-shared-actuator-unarbitrated` findings **remain, at `warn`** — measured, ADR-005 §6's middle
row. Nothing is red and nothing is wrong: the checks report what they can see, which is 52's whole
discipline. It also means 58/02's acceptance evidence is a real state flip (**3 → 0**) rather than a
tautology, which is what a red probe is for.

**2 — The vocabulary is FROZEN in ADR-002 §1/§2 and ADR-003 §1/§2/§5 and the finding codes in
ADR-005 §1, so 58/02 and 58/03 can be BUILT in parallel with 58/00.** 57/ADR-007 §2's practice: a
story codes against the frozen literals without waiting for the story that lands them. Only the
*landing* order is constrained, by §5.

**3 — EVERY test file this milestone turns red is assigned, by name, to exactly one story.**
*(Amended 2026-08-28 after a developer feasibility sweep: the table listed only suites asserting a
frozen literal and so missed five files — three unowned, one owned by the wrong story, one needed by
two. A partition that names the source files and not the suites they redden is not a partition; this
is the defect ADR-007 exists to prevent, found in ADR-007 itself.)*

| file | what turns it red | owner |
|---|---|---|
| `test/arch/acd-loop-vocabulary-closed.test.mjs` | `ADMITTED_KEYS`, `NODE_KINDS`, `ENDPOINT_SCHEMES`, `FIELD_KINDS`, `CHECK_IDS` | **58/00** |
| `test/arch/acd-registry-framework-owned.test.mjs` | `NODE_KINDS`, `ENDPOINT_SCHEMES` (`:150-152`) | **58/00** |
| `test/arch/acd-anchor-taxonomy-additive.test.mjs` | `NODE_KINDS` (`:22`) **and** the fixture subset (§3a) | **58/00** |
| `test/arch/acd-watcher-taxonomy-additive.test.mjs` | `NODE_KINDS` (`:79`) **and** the fixture subset (§3a) | **58/00** |
| `test/watcher-node.test.mjs` | the fixture subset only (§3a) — **was unowned** | **58/00** |
| `test/work-loops-record.test.mjs`, `test/work-loops-value.test.mjs` | loader parse shapes | **58/00** |
| `test/support/registry-fixture.mjs` *(new)* | §3a's one closing helper | **58/00** |
| `test/arch/acd-registry-fixture-closed.test.mjs` *(new)* | `FF-5809` | **58/00** |
| `test/work-loops-home-and-delivery.test.mjs` | `:51` pins the anchor count at 2 and 58/01 ships a third — **was unowned** | **58/01** |
| `test/arch/acd-day-one-supervision-complete.test.mjs` *(new)* | `FF-5806` | **58/01** |
| `test/arch/acd-loop-finding-envelope.test.mjs` | the 32-row code/severity/lane table | **58/02** |
| `test/arch/acd-loop-timescale-comparability.test.mjs` | the cadence cross-product, the ratio boundary, the trigger-token grep | **58/02** |
| `test/arch/acd-loop-checks-pure.test.mjs` | purity and the no-self-declaration keys | **58/02** |
| `test/watcher-independence-gate.test.mjs` | `:186-192` pins `GATING_CODES` exhaustively at five — **was unowned** | **58/02** |
| `test/work-loops-commands.test.mjs` | `REGISTRY_STATE_CASES` / `RAN_CASES` severity and error counts (§3b) — **was 58/03's** | **58/02** |
| `test/work-loops-registry-census.test.mjs` | the day-one census bounds and the `warn` severity assertion | **58/02** |
| `test/work-loops-checks.test.mjs` | the six checks' behaviour | **58/02** |
| `test/arch/acd-arbiter-records-the-tradeoff.test.mjs` *(new)* | `FF-5805` | **58/02** |
| `test/loops-supervision-face.test.mjs` *(new)* | 58/03's glyph and reference-setter contracts (§3b) | **58/03** |
| `test/arch/acd-loop-graph-kind-legible.test.mjs` *(new)* | `FF-5808` | **58/03** |
| `test/arch/acd-loop-render-deterministic.test.mjs` | **nothing** — its fixture holds only `loop`, `actor` and undeclared endpoints, so the new glyphs cannot reach it. `reads:` for 58/03, and it must stay green | *(none)* |

**3c — FOUR MORE FILES, and the axis the table was blind to. AMENDED 2026-08-28 at 58/01's structural
review.** §3's amendment enumerated the suites reddened by a **schema or check** change and still
missed every suite reddened by the **registry simply growing**. 58/01 adds two records to
`src/bundle/loops/`, and four further suites turn red on that alone — none of them named anywhere in
§3, all five discovered by the developer at build, which is the second discovery §3 was written to
prevent.

| file | what turns it red | owner by §3 | verdict at review |
|---|---|---|---|
| `test/arch/acd-arbiter-taxonomy-additive.test.mjs` | its compatibility corpus was the whole directory, which is no longer the fourteen pre-58 records | **58/00** | 58/01 wrote it; re-pointing the corpus at a NAMED `PRE_58_RECORDS` seed is faithful and strictly stronger than the count it replaced |
| `test/arch/acd-registry-fixture-closed.test.mjs` | `THROUGH_THE_HELPER` is an append-only register and 58/01 ships a suite that reaches the shipped registry | **58/00** | 58/01 wrote it; a registration, not a weakening |
| `test/work-loops-registry-census.test.mjs` | `edges.length === 2` over the nine day-one records, which 58/01's five authored edges break | **58/02** | 58/01 wrote it; the pin stayed at 2 and the projection is asserted both ways — faithful, but the file now has two writers |
| `test/anchor-taxonomy.test.mjs` | a two-element anchor roster literal and a third shipped anchor | *(unassigned)* | 58/01 wrote it |
| `test/bundle-asset-manifest-complete.test.mjs` | the `src/bundle/**` file-count tripwire, 82 → 84 | *(unassigned)* | 58/01 wrote it; the load-bearing set-equality is untouched |

**The rule the table was missing, stated so the next milestone does not rediscover it:** *a suite is
reddened by the story that ships the RECORDS as often as by the story that ships the CODE, so a
partition that assigns test files by module alone is incomplete by construction.* The five rows above
are reassigned to **58/01**, which has already written them.
`test/work-loops-registry-census.test.mjs` is the one real casualty: it is 58/02's by §3 and now has
two writers, which is the exact property ADR-007 exists to hold. **58/02 rebases onto 58/01's edit
rather than re-deriving the projection**, and that merge is a review point, not a formality. This is
the third defect found in ADR-007 itself — §1a, §3, now §3c — and all three are one defect: a
partition drawn over MODULES in a milestone whose real seam is RECORDS-then-CODE.

**The tie-breaker for anything this table still misses: it is 58/02's.** Nine suites reach
`checkReferenceOwnership` or the validate command (`acd-day-one-pairing-complete`,
`acd-loop-checks-pure`, `acd-loop-finding-envelope`, `acd-loop-registry-not-an-item-type`,
`acd-loop-suite-registration`, `watcher-independence-gate`, `work-loops-checks`,
`work-loops-commands`, `work-loops-registry-census`), and 58/02 is the story that changes what those
checks emit. A suite discovered red at build belongs to 58/02 unless this table says otherwise — no
second discovery, no exception.

**3a — A registry fixture must copy an ENDPOINT-CLOSED subset, and that is now one helper.** Three
suites copy a hand-listed subset of `src/bundle/loops/` into a temp registry and then assert an exact
finding set or a zero-error sweep (`acd-anchor-taxonomy-additive.test.mjs:10-13,:48`,
`acd-watcher-taxonomy-additive.test.mjs:24-36,:151`, `watcher-node.test.mjs:10-22,:110`). ADR-001
§4's operator-to-arbiter edge makes all three red — `loop-bad-value` before 58/00, then
`loop-graph-dangling-endpoint`, `error` either way — not because the widening broke anything, but
because each subset names `operator.md` while omitting the record its endpoint resolves to. The claim
those fixtures mean to encode (*"every record already on disk still parses exactly as it did"*) is
only meaningful over a subset **closed under the endpoints its members declare**. 58/00 replaces the
three hand-lists with one helper that takes a seed set and transitively adds every record named by a
copied record's endpoints, and asserts against the closed set's size rather than a literal.
`FF-5809` ratchets it. This is the **third** milestone to pay for the same latent defect — 55 and 57
each had to remember to extend these lists — which is what makes it a control and not a fix.

**3b — `test/work-loops-commands.test.mjs` is 58/02's ALONE, and 58/03 gets a new suite — ruled
against the TRACEABILITY BINDING, not against the file list.** That suite binds each of its case
tables to an Examples table in **milestone 52's delivered features** by exact row count
(`:1843-1852`). Those features are shipped and their acceptance criteria are immutable: tests are
code and may change, a delivered `.feature` may not. So a story may re-derive a bound table's
**values** and may not change its **row count**. That asymmetry decides both halves:

- **58/02 can absorb the census by re-derivation, and the mechanism was confirmed rather than
  assumed.** The row driver asserts `errors.length` exactly but only `reported.length > 0` for the
  row's own code (`:801-813`), so an extra error breaks a row and an extra warn does not. The repair
  is the **fixture builder, not the thirty expectations**: `registryStateFiles` (`:445-455`) emits a
  minimal loop record with no `layer:`, so after ADR-002 §1a every fixture gains
  `loop-layer-undeclared`. Giving the builder's default loop record a `layer:` returns **27 of 30
  rows to byte-identical**, and only the three rows whose codes ADR-005 §1 promotes change value
  (`warn`→`error`, `errors: 0`→1, `exit: 0`→1). The `loop-timescale-inversion` row needs one further
  value change — a **management→operational** layer pair on its two records — or it would also emit
  `loop-layer-inversion` and carry two errors where its shape names one code. No row is added or
  removed, so the binding holds. **Re-deriving all thirty would be the wrong repair even though it
  passes**: three changed rows are a real event a reviewer must see, and thirty changed rows are the
  noise that hides them.
- **58/03 may NOT extend `GLYPH_LINE_CASES`**, pinned at 9 rows against `F_GRAPH`'s delivered table.
  Its new glyph and `referenceSetters` contracts therefore land in
  **`test/loops-supervision-face.test.mjs`**, a new suite bound to 58/03's own feature, and 58/03 does
  not touch `test/work-loops-commands.test.mjs` at all. Both stories get what they need and the
  sole-writer rule survives without an exception.

**4 — `src/bundle/bundle.json` is an APPEND-ONLY REGISTRATION HUB** (57/ADR-007 §4, 55/ADR-007 §4,
53/ADR-011). 58/01 appends two asset entries and regenerates `manifest.json`. No other story touches
either.

**5 — TWO ordering edges, both named with their reason. Everything else is parallel-eligible from day
one.**

- **58/00 → 58/01.** A record declaring `kind: arbiter` or `layer:` before the schema admits them is
  `loop-bad-value` / `loop-unknown-key`. 57 had this same dependency between its watcher kind (57/00)
  and its records story (57/05) and did not name it; naming it here is the correction.
- **58/01 → 58/02.** ADR-005 §5: the gate must not arrive before the records that clear it. Fifteen
  error-severity findings through `aof:validate`'s hard loop lane is exactly 57/ADR-007 §6's trap.
- **58/01 → 58/03.** *(Amended 2026-08-28 — this clause previously read "58/03 is independent of all
  three… its arbiter-glyph leg drives a hand-built fixture and needs no loader change". That was
  FALSE, and it is 57's unnamed ordering edge repeating inside the milestone written to avoid it. I
  asserted how a story's scenarios would be written, which is not mine to assert: both 58/03 tasks
  drive the CLI over records on disk, and neither command has an injection seam —
  `loops-show.mjs:18` and `loops-graph.mjs:88` both call `loadLoops(ctx.workspace)`.)* Landing 58/03
  first fails three ways, each measured: `layer:` is `loop-unknown-key` and `node.fields.layer` is
  never set, so the required show line is unreachable; `kind: arbiter` leaves `usableKind` null so the
  node renders `· unknown ·` and falls into the **fallback parallelogram** its own Examples row
  forbids; and the operator edge is `loop-bad-value`, so `referenceSetters` is `[]` where a row
  requires `["actor:operator"]`. The edge is to **58/01**, not 58/00, because all three need the
  RECORDS, not only the schema.
- **Giving the two commands an injection seam was considered and refused.** It would make the
  independence claim true, but it adds a test-only door into a production command for a scheduling
  benefit — the second-door shape TECH_DEBT item 0 is about — and it would be scoped by nothing.
  `renderLoopGraph` is already exported and pure, and **that is where the glyph table belongs**, not
  in the CLI face: it is what lets `FF-5808` assert the glyph set without a workspace. A story that
  wants a fixture-driven glyph leg has one available without a new seam.
- **The honest shape of this milestone is therefore a chain of three stages with one parallel pair:**
  58/00 → 58/01 → {58/02, 58/03}. That is less parallelism than §5 originally claimed, and saying so
  is worth more than the claim was.

**6 — The suite registry is an append-only hub and every story registers its OWN suites in its own
labelled block — import AND spread.** 56 found **26 fitness suites carrying 117 test entries de-armed
in one commit with the imports left behind**, unrun for a month. A suite imported and not spread is
not registered. Every arch-test in this repo exports an array of `{ name, run }` — never
`{ name, fn }`.

**7 — 58/01 does not hand-edit `.aof/loops/**`** (ADR-006 §4). Its diff contains the installed copies
and the lock hashes, produced by `aof work update`, not typed.

**Invariant.** No two stories in this milestone write the same file — source or test; the vocabulary
literals in `src/work-loops.mjs` and the literals consumed by `src/work-loops-checks.mjs` agree
exactly. (Enforced by `FF-5801` and `FF-5802` jointly; the partition rule itself is a review
property, not an arch-test.)

---

## Fitness functions

<!-- Each structural invariant from an ADR, paired with the arch-test that enforces it in CI.
     The arch-test lands with its subject story, so `pending` clears story by story.
     `pending` reports at warn while 58 is open and is NOT admitted at accept —
     `aof work doctor 58` reports each unresolved control as `control-unresolved`, and what clears
     it is landing the file or dropping the declaration, never re-marking it `pending`.

     Each declared control also owes a RED PROBE in VERIFICATION.md once it lands: what was
     changed to make it fail, and the message observed.

     HARNESS SHAPE: every arch-test here exports an array of `{ name, run }` — never `{ name, fn }` —
     and is imported AND spread in `scripts/test.mjs`'s suite registry inside its own labelled story
     block. A suite imported and not spread is not registered (56's finding: 26 suites, 117 entries,
     dead for a month with the imports left behind).

     FOUR EXTEND A GUARD ALREADY IN SERVICE rather than adding a sibling: FF-5802 extends 52's
     timescale-comparability guard, FF-5803 extends 52's finding-envelope guard, FF-5804 extends 52's
     purity guard, and FF-5807 extends 52's vocabulary guard. For those the red probe is the only
     evidence the change is armed.

     NOT here (these are task .feature material — observable behaviour over the real seam):
     "an unowned loop is named and `aof work loops validate` exits 1", "an arbiter whose priority
     omits a vetoed loop is reported", "a governance loop reaching two layers down is reported as
     skipped", "`aof work loops show --id <loop>` names the node that sets its reference", "a
     malformed `dwell` is refused with the value quoted", "a periodic pair at exactly ratio 3
     produces no finding". -->

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-5801 | **The supervision vocabulary widens additively and admits nothing that could act.** `NODE_KINDS` equals its five frozen literals and is a superset of 57's four; `ADMITTED_KEYS.arbiter` equals its frozen key set and **omits `actuator`, `measurement`, `cadence` and `ground`**; `resolves`, `priority` and `dwell` are required for the kind; **`resolves` and `counter` accept and reject identically** — both admit a non-empty phrase and refuse every `SENTINEL_TOKENS` member and every `RESERVED_FIELD_PREFIXES` entry, so `resolves: prose:…`, `resolves: config:…` and `resolves: unknown` are each `loop-bad-value` — while `controlled` keeps its distinct pointer-or-phrase rule unchanged; `dwell` admits exactly `cycles:<n≥1>` and `none` and not `unknown`; `LAYER_VALUES` equals its three frozen literals; `layer` is admitted on `kind: loop` **only** and is **not** required; `ENDPOINT_SCHEMES` gains exactly `arbiter`; no sixth edge key and no `dead-band` key exists in any admitted set; and **every one of the fourteen records shipped before 58 parses with zero new findings**. | `test/arch/acd-arbiter-taxonomy-additive.test.mjs` — **landed** (58/00) | ADR-002, ADR-003, ADR-004 |
| FF-5802 | **The layer axis is additive over the cadence axis, and the ordering has one home.** `checkTimescale` emits **no per-node finding at all** — every finding it emits is anchored to a `target-setting` edge (ADR-002 §1a), which is what makes the next clause durable rather than accidentally true; with no `layer:` declared, its output over the closed cadence cross-product, the ratio-3 boundary, the four single-node `[]` fixtures and the non-`target-setting` case are all **identical** to 52's; the layer→rank and trigger→scope-rank maps exist **only** in `src/work-loops.mjs` and ride on the parsed fields; `src/work-loops-checks.mjs` contains no `EVENT_TRIGGERS` member **and no `LAYER_VALUES` member**; the separation ratio is the exported literal `MIN_SEPARATION_RATIO === 3` and no config key resolves it; and no code path derives a duration from a trigger or a layer. 52's comparability guard is **EXTENDED**, not joined by a sibling. | `test/arch/acd-loop-timescale-comparability.test.mjs` *(extended)* — **landed** (58/00 + 58/02) | ADR-002 |
| FF-5803 | **Severity is a property of the code, and only this milestone's subject codes are promoted.** `GATING_CODES` equals its frozen thirteen-member set; the code/severity/lane table equals `LOADER_FINDING_CODES` and `CHECK_FINDING_CODES` exhaustively by name; every grounding, anchor and watcher-census code and all seventeen loader codes retain their present severity; `loop-timescale-not-comparable` and `loop-layer-skipped` resolve to `warn`; no finding is constructed with a hardcoded severity; and the exit decision exists **only** on the face — `run()` returns an identical result whether or not the gate fires. 52's envelope guard is **EXTENDED**. | `test/arch/acd-loop-finding-envelope.test.mjs` *(extended)* — **landed** (58/02) | ADR-005 |
| FF-5804 | **Supervision is computed, never self-declared, and the checks stay a pure leaf.** No filesystem, process, clock or dynamic-import read is reachable from `src/work-loops-checks.mjs`, which still imports **nothing**; no kind admits a key by which a node asserts its own supervision, layer authority or arbitration (no `supervised-by`, `arbitrated-by`, `dead-band` or `independence` key exists in any admitted set, and `owner` is admitted on `kind: loop` alone); and the ownership requirement, the layer requirement and the arbitration requirement are all emitted as findings rather than required as keys. 52's purity guard is **EXTENDED**. | `test/arch/acd-loop-checks-pure.test.mjs` *(extended)* — **landed** (58/02) | ADR-001, ADR-002, ADR-004 |
| FF-5805 | **The arbiter records the trade-off and cannot act.** `checkActuatorArbitration` clears a shared actuator **only** on a non-contending node whose `kind` is `arbiter` — a vetoing `actor`, `loop`, `anchor` or `watcher` does not clear it; every arbiter's `priority` is a permutation of its own `veto` endpoint set, with no duplicate, extra or omission; no arbiter declares `target-setting`; and **`isGraphNode` accepts every member of `NODE_KINDS`** — so a `kind: arbiter` node is a member of the graph all four structural traversals see, and a sixth kind added to the loader without being admitted here fails CI instead of being silently filtered out of every check. | `test/arch/acd-arbiter-records-the-tradeoff.test.mjs` — **landed** (58/02) | ADR-003 |
| FF-5806 | **The day-one supervision hierarchy is complete, admissible and corroborated.** Over the records shipped in `src/bundle/loops/`: every `kind: loop` record has an inbound `target-setting` edge from another node; every `target-setting` edge's source is a `loop`, an `actor`, or an `anchor` whose `ground:` is `frozen-rule`; every `kind: loop` record declares a `layer:`; every declared layer is corroborated by its cadence's scope rank **except at most one**, which the test names; no `owner:` names an actor that does not declare the matching edge; **every `config:` endpoint of an arbiter's `parameter-tuning` is cited as a `ceiling:` pointer by one of the loops that arbiter vetoes** (ADR-003 §7's definition of "bounds", made standing); and the shipped registry produces **zero** findings whose code is in `GATING_CODES`. | `test/arch/acd-day-one-supervision-complete.test.mjs` — **landed** (58/01) | ADR-001, ADR-002, ADR-005 |
| FF-5807 | **The six check ids have one authority and every production copy agrees; the finding-code census has one home.** `CHECK_IDS` and `src/work-doctor-loop-ready.mjs`'s `COMPOSED_CHECK_IDS` have identical members in identical order; and the two magic-number code counts are gone from the vocabulary guard, whose surviving authority for that fact is the exhaustive by-name table in `acd-loop-finding-envelope`. *(The check-id parity leg is the ratchet on a third instance of a duplicated derivation — ADR-006 §Codebase health.)* | `test/arch/acd-loop-vocabulary-closed.test.mjs` *(extended)* — **landed** (58/00) | ADR-005 §3, ADR-006 |
| FF-5808 | **Every declared node kind renders as a distinct shape, and none of them is the fallback.** Two legs. **(a)** `renderLoopGraph` emits a rendering for every member of `NODE_KINDS`, and the set of distinct shapes it emits has the same cardinality as `NODE_KINDS`, so no two kinds collide. **(b)** **No declared kind's shape equals the shape used for an endpoint no record declares** — the fallback `test/arch/acd-loop-render-deterministic.test.mjs:28-34` pins for `command:`, `config:`, `module:` and dangling `loop:` endpoints. Leg (a) alone is satisfiable by the very collision this control repairs: a sixth kind handed the fallback shape still yields six distinct shapes across six kinds while an `anchor` is drawn identically to a dangling reference. Together, the sixth kind fails CI until it is given a glyph of its own. | `test/arch/acd-loop-graph-kind-legible.test.mjs` — **landed** (58/03) | ADR-006 §Codebase health |
| FF-5809 | **A registry fixture copies an ENDPOINT-CLOSED subset, through one helper.** Every test that copies records out of `src/bundle/loops/` into a temp registry does so through the single helper in `test/support/registry-fixture.mjs`, which transitively adds every record named by a copied record's endpoint; no such fixture produces `loop-graph-dangling-endpoint`; and no test file reaches `src/bundle/loops/` to build a fixture by any other route. *(The ratchet on a third instance: 55, 57 and 58 each had to remember to extend three hand-written subset lists — ADR-007 §3a.)* | `test/arch/acd-registry-fixture-closed.test.mjs` — **landed** (58/00) | ADR-007 §3a |
| FF-5810 | **Every `<path>:<line>` a shipped loop record writes resolves, and every `` `<symbol>` at `<module>:<line>` `` names the line that symbol is actually defined on.** Over `src/bundle/loops/**`: no cited path is missing; no cited line or range starts past the file's last line; and where a record writes `` `<name>` at `<module>.mjs:<n>` `` and `<name>` is an exported symbol of that module, `<n>` is the line of its `export`. *(The ratchet. 52/ADR-013 deliberately routed prose-body line citations OUT of the census as `not-black-box` (`test/work-loops-registry-census.test.mjs:29-31`), so NOTHING has ever read them — and at 58/01's review the cost was measured: THREE citations of `src/bundle/commands/autonomous.md` name lines 49-81 of a **47-line** file, and SIX `<symbol> at <module>:<line>` claims across `run-resilience.md`, `mesh-assignment-reclaim.md` and `retrospective-memory-ingest.md` are off by 100-300 lines because the modules grew. The registry's entire value is that an authored edge is honest and a discovered one cites; a citation nothing checks is the one that rots first, and this is the milestone that declared "a citation the repository does not supply is never manufactured" as its own integrity trap. In-range and defining-line are both computable without reading content, so the guard cannot go stale on an unrelated edit the way asserting the CONTENT of a line would.)* | `test/arch/acd-day-one-supervision-complete.test.mjs` *(extended)* — **landed** (58/01, at the verify gate) | ADR-001 §3, ADR-006 §Codebase health |

## Story partition

Authored at refine, per ADR-007 §1. The landing order is **58/00 → 58/01 → {58/02, 58/03}** — a chain
of three with one parallel pair at the end (ADR-007 §5, amended 2026-08-28: 58/03 was wrongly called
independent). All four may be BUILT concurrently against the literals frozen in ADR-002, ADR-003 and
ADR-005 (§2).

- **58/00** — the supervision vocabulary: `src/work-loops.mjs`
- **58/01** — the reference hierarchy and the arbiter record: `src/bundle/loops/`, `src/bundle/bundle.json`, `src/bundle/manifest.json`
- **58/02** — layer separation, arbitration and the gate: `src/work-loops-checks.mjs`
- **58/03** — the supervision face: `src/commands/loops-show.mjs`, `src/commands/loops-graph.mjs`
