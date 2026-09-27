---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 62 · The self-improvement loop — State

## Progress

<!-- Story-by-story, mirroring the SPEC Stories list. The source of truth for each story's status
     is its own STORY.md frontmatter; this is the at-a-glance roll-up. -->

Broken down 2026-08-31 into **six stories, two stages** — `{00 ‖ 01 ‖ 02 ‖ 03 ‖ 05} → 04` (re-authored at
the developer's feasibility pass, ADR-013). Fourteen ADRs and a nine-row fitness register in
`ARCHITECTURE.md`. **Accepted 2026-09-01**: all six stories `done`, all nine controls green, and all
nine carrying an observed red probe. Evidence, findings and the accept decision are in
`VERIFICATION.md`; capability statements in `OUTCOME.md`; process lessons in `RETROSPECTIVE.md`.
| story | title | stage | depends | status |
|---|---|---|---|---|
| 62/00 | the corpus and its floor | 1 | — | done |
| 62/01 | the proposal, its lane and its patch | 1 | — | done |
| 62/02 | provenance that resolves | 1 | — | done |
| 62/03 | the distance to a live proposal | 1 | — | done |
| 62/05 | candidate formation | 1 | — | done |
| 62/04 | the tuner's face | 2 | 00, 01, 02, 03, 05 | done |

## Notes & decisions in flight

<!-- Surprises, corrections, mid-build discoveries. Decisions that prove durable graduate to ADRs at
     Accept — don't leave them only here. Strike-through corrected assumptions to keep history honest. -->

- **Shattered 2026-08-13** from `PRD-acd-loop-engineering.md` + `PRD-graph-engineering.md`, taken
  together as one arc.

### Refine, 2026-08-31 — the Decide + Break-down pass (architect, under `--autonomous`)

**D-62-1 (default decision, the milestone's one genuinely open question) — 62 ships the proposer over
the corpus that exists and takes NO limb of spike 60's prerequisite; the distance to a live proposal is
the deliverable.** Recorded as `ARCHITECTURE.md#ADR-001`. The reason it is not a coin-toss is that two
of the spike's three limbs measure differently at HEAD:

- **Limb (ii) — "give one instrument an append-only observation log" — is already CLOSED.**
  `observeMilestone` writes a new timestamped snapshot per run and never rewrites one (68/05,
  68/ADR-007), and 8 snapshot directories exist on disk. Spike 60's Lane A grep covered
  `src/commands/{counters,grade,ratchet,audit}.mjs` and `src/work-audit/` and did not reach
  `src/work-observe.mjs`, which is why it reported zero persistence stream-wide.
- **Limb (iii) — "make one knob live by having `continue.md` read `work.loop.reviewRounds`" — removes
  ONE refusal of two and admits no knob.** Measured by running `assessProposal` over the real loop
  model and the real `src/` unit set: all three knobs carry `not-admissible` *and*
  `harness-not-introspectable` today. Naming the key in the prompt lifts only the second, and cannot
  lift the first, because `src/bundle/**` is shipped assets excluded from the program read by
  construction (`src/work-acceptor/admissibility.mjs:169`). So the spike's *"a few lines… converts the
  whole arc from unfalsifiable to testable"* is true about the harness **switch** and false about
  **admissibility**.

The prerequisite is therefore **two** limbs, not three — (a) a decision-site consumer, (b) the
run-record→session join — and 62 measures and reports both rather than owning either. Guarding against
the vacuous-control failure, `ARCHITECTURE.md#ADR-001` §4 adds a **non-vacuity acceptance condition**:
62 may not be accepted while `aof work tune` over this repository's own corpus emits zero proposals.

**D-62-2 (default decision) — the tunable lane's verdict is obtained by INVOKING `work:acceptor`, and
62 becomes the producer of the input seam 61 declared with none.** `ARCHITECTURE.md#ADR-002`.
`acceptorCommand.input.proposals` has been declared-but-unproduced since 61 shipped (its CLI maps only
`--commit`). 62 reaches it through `invoke` behind the deferred dynamic import `src/commands/loop.mjs`
established, so no `--proposals` flag is added and no file of 61's is edited. Reason: any local scoring
or thresholding in 62 would be the weaker acceptance rule SPEC forbids.

**D-62-3 (default decision) — `aof work tune` writes nothing, and 62 ships no auto-apply.**
`ARCHITECTURE.md#ADR-005`. Two consequences worth flagging because they **depart from 62/SPEC's own
words**, which predate 61 and 53's shipped decisions:

- SPEC says applications are *"logged to the run store"*. Superseded by 61/ADR-006 and 61/ADR-007: the
  record is `.aof/acceptor-ledger.jsonl` via `harness.ruled`, and 61/FF-6108 makes
  `src/work-acceptor/store.mjs` its only writer in `src/`. 62 opens no second log.
- SPEC says low-risk classes *"auto-apply"*. 62 ships **no apply code at all**: auto-apply is an L3
  act, and 53/ADR-006 / 53/FF-5305 assert that no module under `src/` may contain an executing branch
  keyed on `L3`. The only commit path stays the explicit `aof work acceptor --commit <key>` 61 ships.

**D-62-4 (default decision) — the positional is `[scope]`, not `<range>`.**
`ARCHITECTURE.md#ADR-008`. SPEC and the PRD both write `aof work tune <range>`; the shipped contract on
`validate`, `doctor` and `audit` is scope-as-filter through `src/work-ref-scope.mjs`, and the `NN-MM`
range form exists only in `nextWork`'s `inRange` — one of TECH_DEBT item 49's three parsers, and the one
that fails open. A fourth reader of a fourth grammar was refused. **This is a deliberate departure from
SPEC's wording; the PO should confirm it or re-word SPEC.**

**D-62-5 (default decision) — three of SPEC's four proposal classes are permanently L2, and the lane
split is computed rather than typed.** `ARCHITECTURE.md#ADR-003`. Only cap adjustment targets a key on
the arbiter's `parameter-tuning:` edge; model reallocation is already non-ordinal by 61/ADR-001 §5, and
a prompt revision and a sizing hint are not steps on an integer at all. The surface states this as a
property of the class rather than as a current limitation.

**Memory recall (near-misses surfaced, and how each was treated).** Two broad `--area architecture`
calls were made before any ADR was written.

- **58/ADR-003** — an arbiter *records* the trade-off and **cannot act**; it declares no actuator.
  **Honoured**: the proposer is the same shape one layer over — it proposes and owns no apply path.
- **54/ADR-003** — *one registered command whose BARE face is a READ; execution is opt-in and never on
  the board*. **Honoured**, minus the opt-in half: `tune` has nothing to execute, so it is read-only
  outright and joins the board-deferred set for 54's own reason.
- **14/ADR-001** — a digest *"summarises and POINTS"* with a resolving `source:line`, never a
  duplicate-as-authority. **Honoured** as `ARCHITECTURE.md#ADR-006`'s citation rule.
- **13/ADR-002** — read-only on the source with a `--dry-run` that materialises nothing.
  **Consciously departed from on the flag**: a command with no write path has nothing for a dry run to
  withhold, and shipping the flag would imply a wet path that does not exist (`#ADR-005` §1a).
- **61/ADR-008**, **53/ADR-006**, **55/ADR-006** — consumed directly as inherited constraints.

**D-62-4 CONFIRMED by the PO at the same refine (inline product-owner).** `[scope]` stands and
`SPEC.md`'s two `<range>` spellings were amended to match, in the Objective and in `## Scope`. The
reasoning in `ARCHITECTURE.md#ADR-008` is accepted as written: `<range>` is PRD language that predates
the scope contract this repository shipped, and a fourth reader of a fourth grammar to reach a form no
other read command offers is TECH_DEBT item 49's species. When item 49 is paid, `tune` inherits
whatever the single parser admits with no edit here. Nothing else in `SPEC.md` was re-worded — in
particular the *"logged to the run store, and reversible"* clause is left standing, because
`#ADR-005` §3 records its supersession explicitly and an ADR superseding an earlier record is this
stream's normal mechanism rather than a defect to edit away.

**Left open, deliberately.**

- **The clustering rule that turns 392 lesson sections into candidate proposals is the build's to
  choose**, within `ARCHITECTURE.md#ADR-007` §4's floor of two distinct source documents. The
  architecture fixes the floor, the provenance obligation and the non-vacuity condition; it does not
  fix the similarity criterion, because that is a judgement best made against the real corpus at the
  Three Amigos pass.
- **Whether `aof work tune` ever earns a `/aof:tune` bundle wrapper** (`#ADR-009` §5). No work command
  outside the `work insert` family ships one; recorded as a separate decision, not an oversight.

**Owed at 62/04's Three Amigos pass — its `reads:` is short ON PURPOSE and only until stage 1 lands.**
`aof work validate` fails a `reads:` entry naming a path not on disk, so 62/04 cannot yet declare the
four `src/work-tune/*.mjs` modules it composes. The four sibling `STORY.md` files stand in their place
today. This is 61/R6's measured failure mode (short read contracts, every escape load-bearing) being
re-created by the validation contract rather than by an author, and it is noted in 62/04's own `##
Notes` so the completion is not left to memory.

**Owed at build — PAID at this same refine, by the orchestrator.** `TECH_DEBT.md` **item 78**:
`src/commands/` is the fastest-growing flat directory in the tree and the one flat layer no ledger
entry covers. The architect routed it from `#ADR-010` §4 and could not write it (that pass was scoped
to architecture and story documents); the PO/orchestrator pass wrote it and measured the claim rather
than restating it — walking the git history gives **18 → 91** command files over two months (**5.1x**)
against `test/arch/` **94 → 371** (3.9x) and `src/` root **51 → 144** (2.8x), so "fastest-growing" is
now a number. Item 78's first fix is to give item 10's own table a `src/commands/` column, because the
underlying defect is that the measurement is blind where the growth is.

### Three Amigos closure, 2026-08-31 — two verified findings and ten rulings (architect)

The QA pass over the 23 authored task features returned two findings that survived independent
verification at source, plus a set of questions the ADRs were silent on. Recorded as two superseding
ADRs — `ARCHITECTURE.md#ADR-011` and `#ADR-012` — because 03/R3's rule holds: extend a frozen seam with
a superseding record, never by editing one.

**D-62-6 (correction, BLOCKER) — ADR-006 §1 named an extractor that cannot extract a provenance
citation, and the fix separates the GRAMMAR from the control PREDICATE.** Verified:
`controlPathsIn` filters every match through `isControlFileName`
(`src/work-doctor-controls.mjs:143-152`, `:102-106`), so ADR-006 §1's own worked example
(`…/RETROSPECTIVE.md:150`) is dropped on the way out; and `normalizeCitedPath` (`:128-133`) strips the
locator, so the line a citation names never survives. The filter is deliberate and measured — 18 of 56
path tokens in fitness registers are prose — and it stays. `ARCHITECTURE.md#ADR-011` lands two
**additive** exports, `pathCitationsIn` and `splitPathLocator`, and re-expresses `controlPathsIn` over
them with its answers **byte-unchanged** (asserted as a self-comparison over every register in
`wiki/work`). This is 66/ADR-008 ruling 2's move one level over. **It is the milestone's one
sole-writer exception**: 62/02's `files:` gains `src/work-doctor-controls.mjs` scoped to those two
exports, ADR-010 §2's table stands for every other module, and the re-home of the grammar into
`src/declared-id.mjs` is recorded as owed debt rather than taken.

**D-62-7 (correction, Important) — the snapshot figure was wrong and the lane's basis was wrong with
it.** Verified: **8 snapshot directories across 7 items, of which 6 carry an `agents.json`** (two under
milestone 70 hold only a `report.md`), and `readLatestSnapshot` returns **at most one reading per item**
— so the lane can see 7 series and 6 readings, never 8. `ARCHITECTURE.md#ADR-012` §1–§3 corrects the
figure in ADR-001 §1/§2 and ADR-007 §1, and **withdraws ADR-007 §3's "live example" claim**, which
conflated two different faults: the lane *reads* 6 series successfully, so it is not
`tune-ran-on-nothing`; what is zero is their *content*. The lane now reports three numbers — series
walked, readings counted, readings carrying an attribution — its floor is over **readings**, and the
zero third number reaches no lane code because it is limb (b), which 62/03 already owns. **This is the
milestone's own indicted mistake**, made in the document that indicts it: a count asserted at one
altitude and never checked against the reader that would have to produce it.

**D-62-8 (correction, Important) — the advisory lane's `from` had no reader, and now reads through its
target's own accessor.** The acceptor resolves the tunable lane's `from` (`declaredKnob`/`valueAt`) but
never sees `work.agents.models`, and none of the three evidence lanes reads config.
`ARCHITECTURE.md#ADR-012` §4: the **face** supplies `ctx.workspace.config` and nothing more (the
`audit.mjs:147` / `grade.mjs:306` precedent), and `src/work-tune/proposal.mjs` resolves the advisory
target through `agentModelMap` / `AGENT_MODEL_MAP_PATH` (`src/work-bundle.mjs:249-256`) — *"the ONE
accessor both render and validation call"* — staying pure, since that accessor is a function of the
config handed in. The two lanes stay asymmetric on purpose: one rule (*read the target's value through
the target's own home*), two homes, because the targets have two owners. 62/01's `reads:` gains
`src/work-bundle.mjs`; no `files:` set changes.

**Ten rulings, all in `ARCHITECTURE.md#ADR-012` §5–§14.** Eight confirm QA's reading; one reverses it;
one closes a nit.

- §5 **confirmed** — a refusal and a limb naming one fact render ONCE, on 61/ADR-013 §1b's precedent.
- §6 **confirmed** — limb (b) closes when `roundsToAccept` answers with a number, the only computable
  threshold; it can close while most records still carry no session id.
- §7 **REVERSED** — an unreachable `work:acceptor` **exits non-zero**. QA wrote exit 0; the
  counter-argument wins, because `work:acceptor` is in the same `COMMANDS` array, so unreachable means
  broken installation, not a fact about the work stream. The line: a refusal about the WORK is exit 0;
  a failure of the command's own machinery is not.
- §8 **ruled** — `from === to` is a `already-in-force` finding, never a no-op proposal, because
  ADR-001 §4's non-vacuity condition counts emitted proposals.
- §9 **confirmed** — the patch/applier asymmetry is intended; ADR-004 §2's headline reads as a
  biconditional and is not one.
- §10 **confirmed** — a non-ordinal key on the tuning edge routes to the tunable lane and 61 refuses it
  there. Routing is not committing.
- §11 **confirmed** — an id citation and a path citation on one document are ONE source for the floor.
- §12 **confirmed** — demotion outranks the floor, except where there is no citation to demote.
- §13 **confirmed** — lane floors do not vary with scope; each finding names the scope it was measured
  under, and a scope matching nothing raises no lane finding.
- §14 **nit closed** — the path shapes in these documents are documentation of what each source IS;
  FF-6205's row now says so beside the prohibition, so a build cannot copy a sentence into a constant
  without meeting the answer.

**Register impact.** Six of seven rows amended (FF-6202, FF-6203, FF-6204, FF-6205, FF-6206, FF-6207);
FF-6201 unchanged. No id added, no id retired, every intended path unchanged, all seven still `pending`.

**Owed at build, added by this pass.** A `TECH_DEBT.md` entry for the path-grammar re-home
(`CITED_PATH` into `src/declared-id.mjs` beside `QUALIFIED_REF`), trigger: a third consumer —
`ARCHITECTURE.md#ADR-011` §4. This is in addition to the `src/commands/` flat-sibling entry already
owed.

### Feasibility closure, 2026-08-31 — the partition re-authored (architect)

The developer's feasibility pass returned 12 items, four blocking, one demonstrated by running code
rather than by argument. 61/ADR-012 was re-authored at exactly this pass; this partition is re-authored
here for the same reason, as `ARCHITECTURE.md#ADR-013`. Story roll-up above updated: **six stories, five
at stage 1.**

**D-62-9 (BLOCKER, correction) — the milestone's central deliverable had no owner, and now it is
`62/05`.** Every task contract takes a *candidate* handed in; nothing turned 392 lesson sections and 61
run records into one. This collided head-on with ADR-001 §4, which makes "emits at least one proposal"
an acceptance condition — so the one artifact that made the acceptance condition satisfiable was the one
nobody had been given. **The mistake was mine and it was a category error**, the same species this
milestone indicts: `STATE.md` said the clustering rule was *"the build's to choose"*, which was a
decision about a **criterion**, and it was read as a decision about a **module, an owner and a seam**.
Those are different abstentions. ADR-013 §1/§1a now fixes the module, its owner, its seam, its output
shape and its losslessness, and leaves only the similarity criterion open — with `FF-6209` requiring it
to be a named parameter a test can vary rather than a constant buried in an expression.

**D-62-10 (BLOCKER, correction) — the registry-ring ban is FAMILY-WIDE, and the applier resolver is
injected at the face.** Demonstrated, not argued: with the three-module shape built, `import
proposal.mjs` and `import command-core.mjs` resolve, and `import tune.mjs` throws `ReferenceError:
Cannot access 'tuneCommand' before initialization`. FF-6201 had scoped the ban to `src/commands/tune.mjs`
alone, so 62/01 could have taken the static import, passed its own suite, and reddened 62/04's probe on a
line 62/01 wrote — invisible from the story that caused it. ADR-013 §2 widens the ban to every module in
the family and injects a `resolveCommand` bound to `getCommand`; §2a keeps FF-6201's fresh-process probe
and runs it per module, because it is the only probe that sees this class.

**D-62-11 (BLOCKER, ruling) — provenance id citations are QUALIFIED ONLY; the bare-id form is dropped.**
There is no exported bare-id *citation* extractor: `qualifiedRefsIn` matches `m?<itemRef>/<ID>`, and
`declaredIdOn` recognises a declaration at a heading or table row. So D-7's confirmation had no grammar
to implement it, and the choices were a second sole-writer carve-out or dropping the form. Dropped — and
on the merits rather than the cost: a bare id is addressable only inside its own item, a provenance
citation is read outside every item, and 62 constructs its citations from records it read out of a known
item, so it can always emit the qualified form.

**D-62-12 (BLOCKER, correction) — limb (a) is READ from the acceptor's report; 62 builds no unit set.**
FF-6206 said limb (a) was derived from `consumptionReport` over "the real unit set", whose only producer
is `sourceUnits`, private to a file ADR-009 §4 forbids touching — so 62 would have hand-rolled the fourth
`{rel, code}` walker. It never needed one: `executedConsumerRefusal` already returns `sites`,
`inspections`, `consumers` and `declaringHome`, and `reportOne` puts that object on every row. **The
dispositions arrive with the verdict.** This is ADR-002 §3's own rule — *render 61's answer, never
re-derive it* — applied to the one place this milestone had quietly broken it, and it needs no carve-out.

**D-62-13 (HIGH, correction) — corpus-wide non-vacuity is ONE control at stage 2, `FF-6208`.** Four
stage-1 controls each carried a leg asserting over "the emitted set" or "this repository's own corpus",
objects that do not exist until 62/04 composes — so each stage-1 story would have landed a control it
could never clear, which this register's own rule does not admit at accept. ADR-013 §7 moves those legs
whole into `FF-6208`, owned by 62/04. It is the better home anyway: ADR-001 §4 is a milestone-level
acceptance condition, and scattering it made it four partial claims nobody read together. **Stage 1 is
now edge-free at the control level as well as the module level**, which the first draft claimed and was
not.

**Six further amendments, each in `ARCHITECTURE.md#ADR-013`.**

- §5 — `test/command-core-contract.test.mjs` joins 62/04's `files:`. `WORK_IDS` is a hand-kept census
  asserted as *"exactly the known work ids, no more, no fewer"*; 61/06 had to edit it for
  `work:acceptor`. ADR-010 §2's table also omitted the 13 test files the stories create — a table of
  **contended** files is not a write set, and that distinction is what hid this one.
- §6 — the lessons lane does its own join; only the **parse** is mandated. Routing through
  `buildRecords` would drop **34 of 392** lesson sections (7 top-level `NN_story_*` items) and break
  slug scoping. A lane that loses evidence to satisfy its own purity control is the failure this
  milestone exists to refuse.
- §8 — "writes nothing" is restated as **no write inside the workspace tree**, and the two reachable
  escapes are NAMED: `reportDegrade`'s mesh-log append (a trigger 62/00 task 02 contracts by name) and
  `censusSnapshot`'s `mkdtemp`/`copyFile`/journal-open inside `work:acceptor`. Both land outside the
  workspace, so the byte-walk never saw them and the register's sentence was untrue — worse than a
  control that fails.
- §9 — **`from` is the value in force at the layer the patch writes, and `absent` is a value.** At HEAD
  the config carries no `work.loop` section and no model map, so "absent ⇒ no patch" would have made
  every tunable proposal patchless except the one permanently refused. §9a: 62 does **not** read the
  shipped bundle default — that would be a fourth reader and a second answer to "what is in force".
- §10 — a control needing mutated source **reads a copy** (temp dir, rewrite, `import()`); only red
  probes touch the working tree, and they are serialised at verify. 61/R5 is why.
- §11 — `tune-ran-on-nothing`'s finding shape is re-authored and asserted **key-by-key** against
  `readFinding` to differ in the code string alone — 61/FF-6107's own resolution of the same case.

**Register impact.** All seven original rows amended; **FF-6208** and **FF-6209** added. No id retired,
no intended path changed, all nine `pending`. `ARCHITECTURE.md` is 1,258 lines against a 1,400 budget.


### Authoring closure, 2026-08-31 — nine clauses, three of them rulings (architect)

The 28 authored task features surfaced nine places where an amendment implied a clause it did not
state. Recorded as `ARCHITECTURE.md#ADR-014`, which closes ADR-013 §1a/§9 and ADR-012 §5 without
reversing anything. **The pattern is the finding**: every one sat at a seam between something this
milestone deliberately left open and something it silently assumed. An abstention with an unstated
boundary is not an abstention; it is a decision nobody made — and this is the third time this
milestone has made that mistake, after D-62-9's formation gap and D-62-10's one-file control scope.

**D-62-14 (ruling) — formation is a PARTITION.** Every source record lands on exactly one candidate.
The reason is this stream's own subject, not arithmetic tidiness: a record carried on two candidates
lets **one observation stand behind two proposals**, each reporting it as its own evidence — the
multiple-testing inflation spike 60 exists to indict and 61 exists to gate, arriving one stage
upstream of the acceptor where nothing would catch it. The cost is accepted with its answer stated: a
lesson bearing on two changes lands on one, and if only one observation exists that can be read two
ways, there is one candidate rather than two. QA's reading **confirmed**; a defensible overlapping
design is now excluded by text rather than by a contract nobody could point at.

**D-62-15 (ruling) — the tie-break is FIXED here; §1a's abstention does not reach it.** §1a leaves the
*similarity criterion* open; a tie-break is a **shape** decision, and a tie broken by input position
satisfies the abstention while breaking order-independence. Ruling: the tie-break is a function of
**content, never of arrival** — no input index, position or iteration order may reach it — with the
lexicographically least source citation as the admitted default and a shuffled-input equality check as
the control.

**D-62-16 (ruling) — the criterion declares an ORDERED RANGE.** A bare categorical rule has no
ordering, and the contract's loosest/tightest rows and out-of-range refusal need one. Requiring a range
is what makes §1a's abstention **reviewable** — a reader sees the space the criterion can occupy rather
than one point in it. It bans less than it looks: the categorical design the corpus invites expresses
itself as *how many of `Kind`/`Area`/`Stage`/`Owner` must agree*, which is scalar and ordered, 1 to 4.
**Requiring a range does not ban categorical clustering; it makes a categorical rule declare its own
strength.**

**Six clauses, confirming the contracts as authored** (`#ADR-014`): §1 — `from` is compared against the
base the **evidence assumed**, not against non-null, with the four-row table enumerated (the collision
QA found on exactly the `work.loop.*` keys this milestone depends on); §2 — FF-6207's workspace
narrowing is paid for by a **no-carry-back** leg, now in the register, because without it §8's
restatement is a weakening rather than a correction; §3 — over an empty tuning edge limb (a) is
**`unknown`**, and `unknown` (the question could not be asked) is a different answer from a limb that
was asked and does not stand; §7 — a target is a **bare ref or null**, and a typed vocabulary is
refused because it would be a constant shared between two stage-1 stories, an edge the partition says
does not exist; §8 — **every lane the registry declares** reaches formation and none is rejected, with
the contract row driven from 62/00's lane registry rather than the literal three; §9 —
`src/work-counters.mjs` dropped from 62/05's `reads:` as a copy-paste with no connection to formation.

**One structural change taken while amending, worth its own line.** `ARCHITECTURE.md`'s story-partition
section restated each story's `files:`/`reads:` sets, duplicating the `STORY.md` frontmatter that owns
them — and this pass had already had to edit both copies twice. The section now points at the
frontmatter as the single home. It reclaimed 49 lines against the 1,400 budget, but the reason to do it
is that a milestone whose whole subject is not having two of anything should not carry two copies of
its own write contract.

**Register impact.** `FF-6203`, `FF-6206`, `FF-6207` and `FF-6209` amended; no id added or retired; all
nine still `pending`. `ARCHITECTURE.md` is 1,341 lines against 1,400.


## Verification

<!-- Pointers, not restatements. -->
- [x] `@executable` suite green — 143/143 in the 62 lane; 8007 of 8013 assembled with one
      pre-existing failure outside this milestone (`VERIFICATION.md` D-05). The 6 unrun tests are
      `global-work-propagation`, which binds `:4182`.
- [x] Fitness functions green — all nine, each with an observed red probe recorded in `VERIFICATION.md`.
- [x] `@manual` — **not applicable**: no `@manual` and no `@uat` scenario exists across the 28 task
      features, and there is no `DESIGN.md`, so no human lane and no design-conformance review applied.
      No `UAT.md` was written, which is a decision rather than an omission.

## Feedback (for retro) — ARCHIVED at Accept, 2026-09-01

<!-- Compaction (aof:verify step 5). The 4 notes that stood here have GRADUATED into
     `RETROSPECTIVE.md` and are not restated, exactly as durable decisions graduate into ADRs:
       · the spike-directive re-measurement note  → R5
       · the ADR-names-an-extractor note          → R6
       · the unchecked-figure note                → R7
       · the forward `reads:` note                → R8
     R1 – R4 were raised at the acceptance gate itself and were never notes here.
     The section stays, empty, because it is where the NEXT milestone's notes go. -->

_Archived — see `RETROSPECTIVE.md`._
