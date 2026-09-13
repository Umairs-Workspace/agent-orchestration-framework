---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 66 · Controls That Run — State

## Progress

- [x] `00_story_contract-parses` — **done** · 22 scenarios / 59 rows green, FF-6601 + FF-6602 green
      with red probes recorded. Two review rounds: 4 blocking + 3 follow-on findings, all closed at
      source; 6 findings open by decision (3 → 66/02, 2 → backlog, 1 recorded). See `VERIFICATION.md`
- [x] `01_story_declaration-form` — **done** · 10 scenarios / ~42 rows green, FF-6603 + FF-6604 green
      with red probes recorded; 727 records byte-identical across the extraction (proven three ways).
      Two review rounds: 4 blocking + 10 follow-on findings closed, 5 open by decision. **ADR-010**
      authored as the closure ruling — the reviewer's own measurement was the thing that was wrong
- [x] `02_story_the-controls-lane` — **done** · 25 scenarios / 89 rows green; FF-6605 + FF-6606 +
      FF-6607 green with red probes. The lane reports **20 error / 17 warn** on this repo and is
      **purely additive** (299 pre-existing findings, 0 added, 0 dropped). Two review rounds: 3
      blocking + 7 follow-on findings, 2 open by decision. **ADR-011** (rulings A–F) supersedes two
      infeasible contract rows and lands the accept gate ADR-004 §3 never had a surface for
- [x] `03_story_the-ask` — **done** · 84 `@executable` lanes + **3 `@manual`** run and recorded;
      FF-6608 green with **seven** on-disk red probes. Ships **seven asks** where there were none,
      and discharges the finding's measured zero (8 falsifiability terms, 0 files → present). Two
      review rounds: 6 blocking + 9 follow-on findings, 2 open by decision. **ADR-012** (closure
      round five) resolved the milestone being refused by its own gate

Scaffolded 2026-08-15, spine only. **Refined 2026-08-15** (`aof:refine 66 --autonomous`): the
architect authored `ARCHITECTURE.md` (7 ADRs, 8 fitness functions), the partition was **revised**,
four stories exist on disk and every task contract is authored. Ready to build.

## Notes & decisions in flight

**Provenance.** This milestone was written from
[FINDING-acd-executable-gate.md](../../planning/FINDING-acd-executable-gate.md), an investigation
into whether ACD has an executable-gate problem. Read the finding before refining: the story
partition, the out-of-scope list and the build order are all derived from measurements in it, and
several are non-obvious (why mutation testing is rejected; why the C0 detector must stay narrow; why
the staging hole is a design defect rather than indiscipline).

**Two mechanisms already exist and are precedent, not scope.** Chore-free, landed 2026-08-15 as
adhoc work: `.githooks/pre-commit` and `test/arch/acd-no-internal-project-names.test.mjs`. They are
this milestone's thesis in miniature — one control at authorship time, one at merge time, both
red-probed in both directions before being trusted, both skipping cleanly when their input is
absent. Story `03` should treat them as the shape to generalise, not as work to redo.

**The unifying idea, so refine does not widen it.** ACD never runs a project's tests. A *control* is
a resolvable citation with three properties — declared once, located where a runner can see it,
carrying a recorded red observation. Every story below checks one of those three properties. A
proposal that requires ACD to execute a suite is out of scope by construction.

**Two known tensions for the architect to rule on:**
1. **The declaration form is the hard part, not the check.** The finding measured a duplicate/dangling
   check at 100% precision *once two conventions were added*, and unbuildable for two of three
   registers without them, because each register declares entries differently (heading vs bullet vs
   table row). Story `01` owns that ruling and `02`/`03` inherit it — hence the `depends` edges.
2. **A red-probe field is a claim, not a proof.** It converts an invisible absence into a checkable
   assertion in a reviewed document. Do not let the contract promise more than that.

**Ordering.** `00` first: cheapest gate, largest measured catch (33 of 37 files in one milestone),
and it shares nothing with the rest.

---

### Refine, 2026-08-15 — decisions taken and the partition revised

**Both tensions are ruled on.** Tension 1 (the declaration form) is **ADR-001**, and the ruling is
that the rule is about **position, not prefix** — which dissolves the finding's two false positives
as consequences of one rule rather than as two special cases. Tension 2 (a red probe is a claim, not
a proof) is **ADR-005 §4**, whose scope boundary names all three things it cannot catch: a fabricated
probe, any assertion that is not a declared control, and whether the probe was performed on the bytes
that shipped.

**The partition was REVISED, not confirmed** — `SPEC.md` invited either. The scaffolded cut was **by
check**; three of its four checks land in one module and one shared array, so it was re-cut **by
seam**. `SPEC §Stories` records the reason; `ARCHITECTURE.md §Story partition` records the
graph-derived coupling per boundary. No deliverable in `## Scope` is dropped, deferred or widened.

**Default decisions taken (none blocking, all recorded):**
- **No `RESEARCH.md`.** The research artifact is `wiki/planning/FINDING-acd-executable-gate.md`,
  which measured every load-bearing number this milestone rests on. Authoring a second research
  document would restate it in a place the finding is already cited from.
- **No `DESIGN.md`, and no designer was spawned.** The milestone's surfaces are the CLI and the
  shipped bundle documents; there is no UI, so there is no mock to elicit and no binding checklist to
  fill.
- **No `SECURITY.md` / `COMPLIANCE.md`.** No attack surface and no regulated or personal data — the
  milestone reads documents already in the repo and writes findings.
- **A new ADR-002 was admitted that no scope item asked for** — the *acceptance horizon*. It is not
  scope creep: `aof work validate` has no severity and exits 1 on any finding, and 12 of the 13
  unparseable `.feature` files in this repo are under `done` milestones whose records may not be
  edited. Without it, story `00`'s gate is a permanent red no legal act can clear, so the milestone's
  cheapest deliverable is unlandable. It lands in `00` and `02` imports it.

**Deferred, with the trigger named** (ADR-003 §6): `work.checks` (a project-declared check list) is a
plugin architecture the SPEC does not ask for — deferred until a project asks for a check ACD does
not ship. A bundle gate hook is deferred with it; the retro-lesson→check graduation is its natural
successor once `work.checks` exists.

**What refine did not settle, for the builder to know:** ACD's registers cite 32 `test/arch/…` paths
that do not exist — 13 in the in-flight m53 and 20 across seven `done` milestones (**20 (item, path)
pairs over 19 distinct paths** — one test is cited by both m23 and m26, so the baseline is keyed by
the pair). The twenty become a named shrink-only baseline when `02` lands. **Milestone 53 is this
milestone's first real subject** and will have to resolve or explicitly `pending` its thirteen before
it can be accepted.

**Three closure rounds, and what they changed.** The Three Amigos raised **thirty** findings against
the architecture across four QA passes and two developer feasibility passes. Rounds one and two are
**ADR-008** and **ADR-009**, authored as superseding ADRs because an ADR body is immutable. Round
three — the developer feasibility findings — was carried in the **fitness-register rows and the
partition table** instead, because `ARCHITECTURE.md` sits at exactly its 700-line budget with zero
headroom, and a table row is a single line that absorbs arbitrary text. That is the better home
anyway: each ruling now sits on the control it governs, where a builder reads it, rather than in a
separate document to cross-reference.

The round-three rulings that changed what a story builds:

- **The horizon predicate moves to a new zero-import leaf `src/acceptance-horizon.mjs`** (66/00), with
  `VALID_STATUS`. Homing it in `src/work.mjs` would have failed **66/02's own FF-6605 on day one**,
  because the god node imports `node:fs`.
- **The controls lane is a TRUE leaf and the dependency direction inverts** (66/02) — the spine
  imports the lane, not the reverse. Both existing doctor lanes import the spine, so the house idiom
  is itself impure under FF-6605; the guard is now scoped to **direct** imports plus a named leaf
  allowlist.
- **Citations resolve against the UNION** — register-block declarations for `FF`/`F`/`D`, memory's
  whole-document headings for `ADR`/`R`. The literal reading of the frozen block set yields **1,302
  citation-pairs, 125 at error**; the union yields **88**, and with a `(?<![-\w])` lookbehind on the
  item ref (the house writes `ADR-001/ADR-008`, which the naive grammar reads as item `001`) it is
  **57**.
- **ADR-004 §5's 20-entry baseline is DROPPED** — measured, **0 of 20** sit in an id-bearing row, so
  neither the baseline nor its "twenty-first fails" clause could ever fire. A control whose passing
  state cannot be falsified is the exact defect this milestone refuses.
- **FF-6604 carries no constant.** The `599` was wrong twice — `buildRecords` returns **600**, and its
  ADR half moved 340 → 342 when ADR-008 and ADR-009 were appended *to this very register*. It is now a
  self-comparison against pre-extraction literals held in the test, with a non-vacuity floor. It also
  walks the **real** `wiki/work`: all 22 dependent suites plant temp-dir fixtures, so a re-home defect
  is a **silent shrink** every one of them would stay green through.

The rulings from rounds one and two that changed what a story builds:

- **The id namespace is a closed set of FORMS, not one pattern** (ADR-008 §1) — `ADR-<n>`,
  `FF-<n>[suffix]`, `F-<n>[suffix]`, `D-<n>[suffix]`, and **`R<n>` with no hyphen**. This is what
  unblocked `01`: both of memory's call sites stay byte-identical, *and* FF-6604's "no id pattern in
  `local-indexing.mjs`" survives — which scoping the re-home to `parseArchitecture` would have given
  up.
- **The declaration leaf exports two independent bindings** (ADR-008 §2) — `ID_FORMS` (whole-document,
  memory's) and the `DECLARATION` recogniser + register-block predicate (register-scoped, `02`'s).
  Importing the block predicate into `local-indexing.mjs` is a defect, not a shortcut: **0 of 340**
  ADR and **0 of 259** lesson headings sit inside a register block.
- **A register block is DECLARING or CITING** (ADR-008 §4). `VERIFICATION.md`'s fitness register
  **cites** — its rows must resolve to a declaration in the sibling `ARCHITECTURE.md` register and
  never declare one. That is what keeps one id to one declaration while evidence lives in its own
  document.
- **`register-dangling-citation` polices qualified citations only** (`m?<itemRef>/<ID>`) plus bare ids
  **inside their own item's documents** (ADR-009). A bare cross-item id has no addressable target, so
  calling it dangling asserts what the model cannot know. Measured: **61 unresolved of 1,762
  qualified**, against an unscoped universe of 8,250 bare `ADR-NNN` + 345 `FF-NN`. That is the
  difference between a check that ships and one that reports thousands on its first run.
- **`pending` is a token in the declaration's entry, not a position in it** (ADR-009) — so a table row
  carries it in any cell. Milestone 66's own nine citations now carry it, and FF-6607's resolve leg
  passes on day one instead of firing nine.
- **No ninth doctor code** (ADR-009): a doctor parse code would be a second reader of `.feature`
  files, TECH_DEBT item 51's shape, already rejected in ADR-003. The grandfathered population is
  **silent in the gating lane by design**, and the cost is named rather than hidden.
- **The horizon follows the owning item's own status** (ADR-009) — a task feature's is its story, a
  milestone record doc's is the milestone. It bites immediately: `00` reaches `done` while `66` is
  still `in-progress`.
- **The placeholder literal is frozen in the ADR rather than `02` gaining an edge on `03`** (ADR-009)
  — the same instrument ADR-001 §2 uses for the grammar, so `03` stays dependency-free.
- **`register-dangling-citation` gains its ask** (ADR-009) — the citation form and "cite only ids that
  resolve" become a fifth ask shipped by `03`, because ADR-007 §1 forbids a refusal no prompt asked
  for.

Five record corrections are routed to `VERIFICATION.md` rather than edited into an ADR body: the
grandfathered population (14/40/9, not 12/35/7); ADR-004 §4's retired-suite attribution (29 of 32,
and two of the others are not under a `reference/` directory); ADR-004 §5's baseline key (the pair);
ADR-005's claim that `bundle.json` is edited (it declares `milestone` as a **dir**, so only
`manifest.json` gains an entry); and ADR-001 §1's heading count (37 exact / 45 normalised, not 43).

## Verification

<!-- Pointers, not restatements. -->
- [x] `@executable` suite green — 263 tests / 17 suites, 0 failures; see `VERIFICATION.md`
- [x] Fitness functions green — FF-6601…FF-6608, each with its red probe recorded
- [x] `@manual` run and recorded — 3 scenarios (66/03); **no `@uat` exists in this milestone**, so no
      human sign-off applied and there is no `UAT.md`

## Feedback (for retro) — ARCHIVED at Accept, 2026-08-16

The raw notes taken during this milestone have **graduated** into
[`RETROSPECTIVE.md`](RETROSPECTIVE.md) as lessons `R1`–`R9`, exactly as durable decisions graduate
into ADRs, and are now recallable through `aof work memory ingest` (756 records). The blow-by-blow is
archived rather than restated here; the nine lessons and their measurements are the record.

Where each note went: the six instances of a control wrong about the tree → **R1**, **R2**; the
severity claim frozen without running the accept → **R3**; the rule frozen in an ADR and never shipped
as an ask → **R4**; the two prose defects only a reader could catch → **R5**; the partition blind to
duplicated derivations → **R6**; the cross-feature contradiction inside one story → **R7**; the
ledgered-and-deferred control, and a retrospective "Carry" that was never a tracked artifact → **R8**;
the number that licensed skipping an act → **R9**.
