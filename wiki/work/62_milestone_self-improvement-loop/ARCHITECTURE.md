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
# 62 · The self-improvement loop — Architecture

## Context this milestone inherits

Eight facts arrive from upstream items and are not re-litigated here.

**From 08 (done).** Every observable is a registered command in one in-process registry
(`src/command-core.mjs`), and both faces couple through it — the CLI is a thin `argv → invoke →
render`/`--json` adapter. A command that reaches another command does so through `invoke`, deferred
behind a dynamic import so the registry ring is not closed at module scope
(`src/commands/loop.mjs:147-151`, and TECH_DEBT item 26 is what that comment is avoiding).

**From 53 (done).** The autonomy ladder ships **L1 and L2 with L3 LOCKED STRUCTURALLY**: two frozen
level sets, a coded `loop-level-locked` refusal naming 55, and 53/FF-5305's assertion that **no module
under `src/` contains an executing branch keyed on `L3`**. 55/ADR-006 says L3 unlocks by a bounded diff
whose gate is computed. Auto-apply is an L3 act; nothing in `src/` may branch toward it.

**From 55 (done).** The frozen set decides what may be tuned at all, compiled to enforcement points
aof already owns. This milestone neither widens it nor reads around it.

**From 57 and 58 (done).** `arbiter:speed-thoroughness-autonomy` declares `parameter-tuning:
[config:work.loop.reviewRounds, config:work.loop.buildNoProgressRounds, config:work.autonomous.maxAttempts]`
(`src/bundle/loops/speed-thoroughness-autonomy.md:10`). **That edge is the tunable set** — and 58/ADR-003
is the shape this milestone's proposer copies: an arbiter *records* the trade-off and **cannot act**;
it declares no actuator.

**From 59 (done).** `aof work audit` established the read-record discipline every sweep now owes —
declare what you read against a floor, and a sweep that read nothing is a **finding rather than a
pass** — in one home, `src/work-audit/reads.mjs`, which imports nothing. 59/FF-5911 holds the set of
core commands declaring `--strict` **closed**.

**From 61 (done — the gate this milestone walks up to).** The rule is one object and its commit
predicate has exactly one leg, `E >= 1/alpha` (61/ADR-001). The criterion is frozen within an epoch and
**the evidence is the ledger's — a proposal supplies none of it** (61/ADR-005 §1a). `harness.ruled` is
the ninth event and `src/work-acceptor/store.mjs` is the only module in `src/` that writes the ledger or
the `work.*` config section (61/ADR-007, 61/FF-6108). No executed **consumer**, no proposal, and the
tunable set is the registry's (61/ADR-008). Report-only is the permanent default and the ruling lane is
a frozen **eight** (61/ADR-010, 61/ADR-013). 61/ADR-011 §2 hands this milestone its subject in four
words: *"Proposals — 62's. This is the gate; that walks up to it."*

**From 66, 68 and 69 (done).** `src/declared-id.mjs` is the one home for the `R<n>` / `ADR-NNN` heading
grammar and for `QUALIFIED_REF`, with 66/FF-6604 asserting exactly one module under `src/` carries any
of those shapes. `aof work observe --write` lands an **append-only timestamped snapshot** under
`observability/snapshots/<ts>/` and never rewrites one (68/05, 68/ADR-007). `src/loop-bounds.mjs` is the
one home for `work.loop.*`.

**From 60 (done — the spike this milestone is sequenced by), and one correction it is owed.** Spike 60
tells 62 by name that *"its auto-apply path is bounded to approximately nothing"* and names a
three-limb prerequisite *"neither 61 nor 62 owns"*: (i) populate `sessionId` on the path that builds
items; (ii) give one instrument an append-only observation log; (iii) make one knob live by having
`continue.md` read `work.loop.reviewRounds`. **Two of those three measure differently at 62's refine,
and ADR-001 §2 states both measurements with their method.**

---

## ADR-001: `aof work tune` ships over the corpus that EXISTS, 62 takes NO limb of the prerequisite, and the DISTANCE to a live proposal is a deliverable rather than an apology

**Status:** Accepted
**Date:** 2026-08-31

**Context.** This is the milestone's one genuinely open decision and it was posed as a dilemma. Read
literally, 62/SPEC §Scope puts *"trace collection and telemetry economics"* out of scope and says this
milestone **consumes** them; 61/ADR-011 §1 calls the observation-series prerequisite *"the prerequisite
neither 61 nor 62 owns"*. Taken that way 62 ships a proposer every one of whose proposals is refused and
whose evidence input is empty — a **vacuous control**, a species this repository indicts by name.
Taken loosely, 62 annexes another milestone's subject.

The dilemma dissolves once the prerequisite is *measured* rather than quoted. Both measurements below
were taken at HEAD on 2026-08-31 and both are reproducible.

**Decision.**

**1 — 62 ships the proposer over the corpus that exists, and takes NO limb of the prerequisite.** The
corpus is not empty and it is not thin: **63 `RETROSPECTIVE.md` documents carrying 392 `## R<n>` lesson
sections**, **61 run records across 52 items**, and **8 append-only observability snapshots**. That is
enough material to generate real, evidenced, reviewable proposals today. What it is not enough for is a
*paired trial*, and that is exactly the thing 61 already refuses to pretend it has.

**2 — The prerequisite, re-measured. Limb (ii) is already CLOSED, and limb (iii) does not do what the
spike says it does.** Both corrections matter, because a milestone that inherits an upstream document's
arithmetic without re-running it is the failure mode 60's own review passes kept finding.

- **(ii) is closed.** `observeMilestone` writes a new timestamped snapshot per run and *"NEVER truncates
  or rewrites an existing snapshot"* (`src/work-observe.mjs`, 68/05 / 68/ADR-007), and **8 snapshot
  directories exist on disk** across 7 items. An append-only observation series exists. Spike 60's
  Lane A grep covered `src/commands/{counters,grade,ratchet,audit}.mjs` and `src/work-audit/` and did
  not reach `src/work-observe.mjs`, which is why it reported zero persistence.
- **(iii) removes one refusal of two, and admits nothing.** Measured by running `assessProposal`
  (`src/work-acceptor/admissibility.mjs`) over the real loop model and the real `src/` unit set: **every
  one of the three knobs carries TWO refusals today**, `not-admissible` *and*
  `harness-not-introspectable`. `work.loop.reviewRounds` is reported `resolved-then-discarded` at
  `src/commands/loop.mjs:1047`; `buildNoProgressRounds` at `src/commands/loop.mjs:1048` and
  `src/loop-progress.mjs:167`; `maxAttempts` at four sites. Naming the key in `continue.md` lifts only
  the second refusal — and it cannot lift the first, because `src/bundle/**` is **shipped assets** and
  `isShippedAsset` excludes it from the program read by construction
  (`src/work-acceptor/admissibility.mjs:169`). So *"a few lines that converts the whole arc from
  unfalsifiable to testable"* is true about the harness **switch** and false about **admissibility**.

**2a — The prerequisite is therefore TWO limbs, and 62 states them by name instead of owning them.**
**(a)** a **decision-site consumer** for at least one admitted knob — a resolved value that reaches a
decision, not a value computed and thrown away; **(b)** the **run-record → session join**, `sessionId`
populated by the path that actually builds items (**0 of 61** records carry one, and the newest record
is dated **2026-08-16**, so the prompt-driven harness mints none at all). Limb (b) is what makes
`roundsToAccept` return `run-attribution-absent` rather than a number
(`src/work-counters.mjs:149-155`). Both are engineering in another milestone's blast radius; neither is
in 62/SPEC §Scope; and neither is guessed at here.

**3 — The distance to a live proposal is the surface's HEADLINE, and it is computed.** For every
proposal 62 emits, the report says which limb or refusal stands between it and a commit, and what would
remove it — the shape 61 already ships as `REFUSAL_REMOVALS`. A milestone whose honest steady state is
*"no proposal can commit today"* must make that statement **precise and falsifiable**, not decorous.
This is 61/ADR-010 §1's discipline one level up: report-only is not a waiting room, and the report is
the product.

**4 — The non-vacuity clause, stated as an acceptance condition rather than a hope.** 62 may not be
accepted while `aof work tune` over **this repository's own corpus** emits zero proposals. At accept the
command must emit **at least one** proposal whose provenance resolves (ADR-006) and must state a
distance for **every** proposal it emits (§3). Green tests over fixtures do not discharge this: a
proposer that cannot find one thing to say about 392 lesson sections and 61 run records is the vacuous
control, whatever CI reports.

**5 — What "consumes them" is honoured to mean.** 62/SPEC §Scope's *"this milestone consumes them"* is
read as: 62 **reads** every instrument that exists, through that instrument's own home, and **adds no
instrument**. Reading a series that reports zero is consuming it; the zero is then reported as a
finding rather than rendered as an empty result (ADR-007 §3).

**Alternatives considered.**

- *Take limb (iii) — teach `continue.md` to name `work.loop.reviewRounds`* — **rejected on the
  measurement in §2**: it removes one refusal of two and admits no knob, so it buys the appearance of
  progress and none of it. It is also a change to the harness of record, which is the one document whose
  content 61/FF-6109's fail-closed switch evaluates — 62 moving it would mean this milestone editing the
  input of the control that judges its own output.
- *Take limb (b) — populate `sessionId`* — **rejected as out of scope and out of proportion**: nothing
  has minted a run record since 2026-08-16, so the work is not "write one field" but "make the
  prompt-driven harness mint runs at all", which is 53's and the loop-performance arc's subject.
- *Ship nothing until the prerequisite lands* — **rejected**: it makes 62 a dependency of an unowned,
  unscheduled piece of work, and it forgoes the proposals the existing corpus genuinely supports. The
  reviewable half of the hill-climbing loop does not need the commit half to be useful.
- *Ship the proposer and let it claim success on an empty result* — **rejected** by §4, and by the whole
  reason this milestone was sequenced after 61.

**Invariant.** No module of this milestone writes `sessionId`, mints a run record, adds an instrument or
edits the harness of record; every proposal carries a computed distance naming what stands between it
and a commit; and the emitted proposal set over the repository's own corpus is non-empty.
(Enforced by `FF-6205`, `FF-6206`.)

---

## ADR-002: The proposer holds NO acceptance predicate — the tunable lane's verdict is obtained by INVOKING `work:acceptor`, and 62 is the producer of the input seam 61 declared with none

**Status:** Accepted
**Date:** 2026-08-31

**Context.** 62/SPEC §Out of scope is explicit: *"The acceptance rule — 61 owns it; this milestone may
not carry its own weaker one."* The temptation is a soft one — a proposer naturally wants to rank its
own proposals, and a ranking with a cut-off **is** an acceptance rule wearing a different noun.

There is a seam waiting for exactly this. `acceptorCommand.input` already declares
`proposals: { type: "array", items: { type: "object" } }` and `reportOne` already reads a proposal's
`{ key, proposed, from, to, moves, arms, observedYield, counterMetric, epochId, provenance }` — but the
CLI adapter maps only `--commit`, so **there is no path today by which a proposal reaches the acceptor
at all**. A declared input with no producer is TECH_DEBT item 38's species, measured twice before.

**Decision.**

**1 — 62 becomes that producer, and the route is the registry.** `src/commands/tune.mjs` obtains the
tunable lane's verdict by `invoke("work:acceptor", { proposals }, ctx)` behind the **deferred dynamic
import** `src/commands/loop.mjs:147-151` established, so `command-core` is never statically imported by a
module `command-core` imports (TECH_DEBT item 26's TDZ ring). One seam, one rule, no second face.

**2 — No new flag on the acceptor, and no edit to 61's modules.** The seam 61 declared is used as
declared. `src/commands/acceptor.mjs` and everything under `src/work-acceptor/` are outside this
milestone's write set entirely. A `--proposals` CLI flag would be a second producer and would change a
delivered command's flag surface to solve a problem the registry already solves.

**3 — The verdict is rendered VERBATIM, never re-derived.** `tune` renders the acceptor's rows —
`verdict`, `eligible`, `evidence`, `refusals`, `distance` — as they arrive. It computes no e-value, no
threshold, no ledger sum, and no ordering over the ruling vocabulary. Its own ordering is over
*proposals*, by evidence count and lane, and that ordering is explicitly **not** a gate: it changes
which proposal a reader sees first and nothing else.

**4 — The acceptor's census comes back for free, which is why 62 never opens the effects journal.**
`buildAcceptorReport` already returns `census`, filtered for fixtures and collapsed across dispatch
worktrees in the one home 61/02 built. 62 consumes that object and **opens no journal of its own** —
61/FF-6107 already refuses a second classifier anywhere in `src/`, which is why this register does not
restate it (see the register comment).

**Alternatives considered.**

- *A `--proposals <file>` flag on `aof work acceptor`* — **rejected** on §2: a second producer, and an
  edit to a delivered command's surface for something the registry already reaches.
- *A static `import { invoke } from "../command-core.mjs"`* — **rejected**: it closes the registry ring
  at module scope, which is a measured, reproduced failure in this tree.
- *Let `tune` rank proposals by a confidence score with a publish threshold* — **rejected**: a threshold
  over evidence that decides what a reader sees is a weaker acceptance rule with a friendlier name, and
  62/SPEC forbids exactly that.
- *Duplicate the acceptor's report shape so `tune` can run without it* — **rejected**: two renderings of
  one verdict is the species this whole stream exists to refuse.

**Invariant.** No module under `src/work-tune/` and not `src/commands/tune.mjs` contains a member of
61's ruling vocabulary, a threshold, an e-value, a lattice or a `work.loop.*` / `work.autonomous.*` key
literal; the tunable-lane verdict is reached only through `invoke("work:acceptor", …)`; `command-core`
is not statically imported from a registered command module; and no file under `src/work-acceptor/` or
`src/commands/acceptor.mjs` is written by this milestone. (Enforced by `FF-6201`.)

---

## ADR-003: A proposal's LANE is COMPUTED from the registry's `parameter-tuning:` edge — one lane can reach a commit and the other never can, and three of SPEC's four classes are permanently L2

**Status:** Accepted
**Date:** 2026-08-31

**Context.** 62/SPEC names four proposal classes: role-model reallocation, cap adjustment, prompt/brief
revision, story sizing. Exactly **one** of the four — cap adjustment — targets a key on the arbiter's
`parameter-tuning:` edge. The other three target `work.agents.models`, a bundle prompt document, and a
refine-time judgement, none of which is a tunable knob. If the classes are a typed table in 62, the
milestone has re-declared the tunable set that 61/ADR-008 §4 says belongs to the registry.

**Decision.**

**1 — Two lanes, and lane membership is computed, never typed.** A proposal whose target is a
`config:` key on the arbiter's `parameter-tuning:` edge — resolved through `tunableSet(model)`, the
registry's own answer — is in the **tunable lane** and is routed to `work:acceptor` (ADR-002). Every
other proposal is in the **advisory lane** and there is no code path from it to a commit. 62 holds no
list of tunable keys and no class table keyed by a key literal.

**2 — The advisory lane is permanent, not provisional, and the surface says so.** 61/ADR-001 §5 already
rules model maps non-ordinal — *"`+1` has no meaning on them… they stay a human diff, permanently"* —
and a prompt revision and a story-sizing hint are not steps on an integer at all. So three of four
classes can never auto-apply, under any future evidence, and the report states that as a property of the
class rather than as this quarter's limitation.

**3 — Which makes the milestone's real shape legible.** The hill-climbing loop 62 closes is
**three-quarters a human-review loop and one-quarter a machine one**, and the machine quarter is
currently refused by 61 on two independent grounds. Saying that plainly on the surface is worth more
than a fourth class of proposal.

**Alternatives considered.**

- *A typed class → lane table* — **rejected**: it is a second home for the tunable set and it drifts the
  moment 55 or 58 changes the edge.
- *Route model reallocations through the acceptor too, so the lane is uniform* — **rejected**: the
  acceptor would refuse them `key-outside-declared-set`, so the uniformity would be a round trip whose
  only product is a refusal 62 can compute from the edge without asking.
- *Drop the three advisory classes and ship only cap adjustment* — **rejected**: it would leave the
  milestone with one class, every instance of which is refused today — the vacuous control ADR-001 §4
  forbids — and it would discard the classes the existing corpus actually supports.

**Invariant.** Lane membership is derived from `tunableSet(model)`; no module under `src/work-tune/`
contains a tunable key literal or a class→lane table; and no advisory-lane proposal is reachable from
any commit path. (Enforced by `FF-6202`.)

---

## ADR-004: No computable patch, no applier — the L2 diff is a complete before→after over a DECLARED target, applied by a REGISTERED command, and git is the acceptance

**Status:** Accepted
**Date:** 2026-08-31

**Context.** 62/SPEC §Scope asks for *"L2: the human-accepted diff — proposals written as a review
surface, applied through the existing `work.agents.models` / bundle machinery"*. The failure mode here
is the half-diff: a proposal that renders a plausible-looking change it cannot actually produce, which a
reader then hand-applies approximately. 61/ADR-010 §4 already settled the symmetric case for reversal —
*"git already reverts; the missing half was the why"*.

**Decision.**

**1 — A proposal carries a patch only when the change is COMPUTABLE as a complete before→after over a
declared target.** A cap adjustment is: this key, this current value, this proposed value, in
`.aof/aof.config.json`. A model reallocation is: this role, this current model, this proposed model,
under `work.agents.models`. Both are complete and both are reviewable as a `git diff` after the human
applies them. A prompt or brief revision is **not** computable — 62 cannot author the replacement prose
— and a story-sizing hint has no target file at all.

**2 — No computable patch, no applier; and the proposal says why rather than shrinking.** A proposal
with `patch: null` carries `applier: null` and a coded reason naming what makes it uncomputable. It is
still emitted, still carries its evidence, and is still worth reading — it is a **finding addressed to a
human**, not a defective diff. What it may never be is a half-rendered change.

**3 — Every `applier` is a REGISTERED COMMAND ID resolved from the registry, never a spelled string.**
`getCommand(id)` must return a command, or the proposal is refused its applier. This is 08/ADR-002's
spine used as intended: the set of things that can change this system is the command registry, and a
proposal that names an applier outside it is naming a hand-edit and should say so.

**4 — `git` is the acceptance, and nothing is built for it.** The human reviews the rendered patch,
applies it with the named command or their editor, and commits. There is no accept verb, no proposal
state machine and no accepted/rejected store — those would be a second acceptance rule (ADR-002) with a
persistence layer (ADR-005) attached.

**Alternatives considered.**

- *Emit a unified-diff blob for every class, including prose* — **rejected** on §1: for a prompt
  revision the blob would be model-authored text presented with the authority of a computed change.
- *Ship an `aof work tune --apply <id>`* — **rejected**: it is a new writer (ADR-005) and, for the
  tunable lane, a second commit path around 61's gate.
- *Let `applier` be a documented shell string* — **rejected**: unresolvable, undiffable, and outside the
  registry that 08 made the single source of truth.

**Invariant.** Every emitted `applier` resolves through `getCommand`; a proposal with a null patch
carries a null applier and a coded reason; no proposal renders a partial patch. (Enforced by `FF-6203`.)

---

## ADR-005: `aof work tune` WRITES NOTHING and raises no effect — the only write in this arc stays 61's store, and 62 ships NO auto-apply because auto-apply is L3 and L3 is locked

**Status:** Accepted
**Date:** 2026-08-31

**Context.** 62/SPEC §Scope says auto-apply is *"logged to the run store, and reversible"*. That clause
predates 61, which then decided the question differently and shipped it: the harness change and its
justification land in `.aof/acceptor-ledger.jsonl` through `harness.ruled`, and
`src/work-acceptor/store.mjs` is **the only module in `src/`** that may write it (61/FF-6108). Meanwhile
53/ADR-006 and 53/FF-5305 lock L3 structurally — **no module under `src/` may contain an executing
branch keyed on `L3`** — and auto-apply is precisely an L3 act.

**Decision.**

**1 — `aof work tune` is a pure read face. It writes no file, mutates no config, and raises no event.**
Not "writes only under a flag": no write path exists to be flagged. This follows 54/ADR-003's rule for
the rubric runner — *one registered command whose bare face is a READ* — surfaced at recall and honoured
here without the "execution is opt-in" half, because there is nothing for `tune` to execute.

**1a — Which is why there is no `--dry-run`.** 13/ADR-002's import command needed one because its
non-dry face materialises; a command with no write path has nothing for a dry run to withhold, and
shipping the flag would imply a wet path that does not exist.

**2 — 62 ships NO auto-apply, and the reason is structural rather than cautious.** The only path from a
proposal to a committed harness change is `aof work acceptor --commit <key>` — an explicit operator act
61 already ships, gated by 61's rule, recorded by 61's event, reverted by `git`. 62 adds no second path,
and it may not: an autonomy-level branch toward auto-apply would put an `L3` decision branch in `src/`,
which 53/FF-5305 fails. **62/SPEC's "auto-apply strictly through 61's acceptor" is therefore satisfied by
62 owning no apply code at all**, which is the strongest available reading of "strictly".

**3 — The application log is 61's ledger; 62 opens no second record.** SPEC's "logged to the run store"
is superseded on this point by 61/ADR-006 and 61/ADR-007, which shipped after 62/SPEC was written. A
proposal store would additionally be a **record of a guess** — a durable artifact asserting that a change
was worth making, produced by the half of the loop that is not allowed to decide that.

**Alternatives considered.**

- *An append-only proposal log under `observability/`, mirroring 68/05's snapshot writer* — **rejected**
  on §3, and noted as the shape to reuse if a future milestone ever needs one. It is not needed to review
  a proposal: `--json` piped to a file is a record the operator chose to keep.
- *Write the L2 diff to a file so it can be reviewed in an editor* — **rejected**: `--json` and the human
  render already carry it, and a file makes 62 a writer for a formatting convenience.
- *A `--level L3` branch that auto-applies when the operator asks* — **rejected** by 53/FF-5305, and by
  55/ADR-006, which reserves the unlock to a computed gate in another milestone.

**Invariant.** No filesystem write, config write, journal open or `appendEvent` call is reachable from
`src/commands/tune.mjs` or any module under `src/work-tune/`; the family declares no `--strict` and no
`--dry-run`; `tune` joins the board-deferred set; and no `L3` token or autonomy-level branch appears in
the family. (Enforced by `FF-6207`.)

---

## ADR-006: Provenance is a set of citations that RESOLVE, through the two homes that already own the grammars — an unresolvable citation demotes a proposal to a finding

**Status:** Accepted
**Date:** 2026-08-31

**Context.** 62/SPEC §Scope requires *"proposal provenance — which traces, which runs, which findings
produced this proposal"*. The repository has measured what happens when citations are written and never
read: TECH_DEBT item 68 — *"Nothing reads the `<path>:<line>` citations the loop registry is built on —
9 are wrong today"* — whose own status note records the count got **worse** after the fix was scheduled.
Surfaced at recall, 14/ADR-001 states the same rule for the digest: it *"summarises and POINTS"* with a
resolving `source:line`, and is never a duplicate-as-authority.

**Decision.**

**1 — A citation is one of two shapes, and both grammars are IMPORTED.** A **document citation** is a
work-relative path with an optional line (`wiki/work/61_…/RETROSPECTIVE.md:150`), read through
`normalizeCitedPath` / `controlPathsIn` (`src/work-doctor-controls.mjs`). An **id citation** is a
qualified ref (`m?<itemRef>/<ID>`), read through `qualifiedRefsIn` / `QUALIFIED_REF`
(`src/declared-id.mjs`). No module under `src/work-tune/` authors a citation regex; 66/FF-6604 already
refuses a second copy of the heading grammar anywhere in `src/`, and this clause extends the same
discipline to the citation grammar by importing rather than restating.

**2 — Resolving means the target EXISTS, checked at emit time.** A document citation resolves when the
file exists and, where a line is given, the file has that line. An id citation resolves when the ref
names an item on disk and the id is declared in that item's documents. Nothing is trusted because it
looks well-formed: item 68's nine wrong citations are all well-formed.

**3 — An unresolvable citation demotes the proposal to a FINDING; it never silently drops.** The
proposal leaves the emitted set and appears in `findings` with the citation that failed and why. Dropping
it would hide a defect in the proposer; emitting it would put an unfalsifiable claim in front of a
reader. The demotion is the honest third answer, and it is the same move 59/ADR-004 §1a makes for a sweep
that read nothing.

**4 — Provenance is a SET, and the evidence floor is over documents.** ADR-007 §4 sets the floor: at
least two **distinct source documents**. Two lines of one retrospective are one author's one moment.

**Alternatives considered.**

- *Free-text provenance ("derived from recent retrospectives")* — **rejected**: unfalsifiable, and the
  precise thing 62/SPEC asked for is the opposite.
- *Resolve citations lazily, at read time* — **rejected**: a proposal that cannot be traced is not a
  proposal, and deferring the check moves the failure to whoever trusted it.
- *Copy the two regexes into the tune family so the leaf stays import-free* — **rejected** by item 68's
  species and 66/FF-6604's precedent; purity is not worth a fourth copy of a grammar.

**Invariant.** No citation grammar is authored under `src/work-tune/`; both grammars are imported from
their existing homes; every citation on an emitted proposal resolves to an existing target; and a
proposal with an unresolvable citation appears in `findings` rather than in the emitted set.
(Enforced by `FF-6204`.)

---

## ADR-007: The corpus is THREE declared lanes with floors, each read through the home that already owns it — a lane that read nothing is a finding, and a proposal needs two independent source documents

**Status:** Accepted
**Date:** 2026-08-31

**Context.** 59/ADR-004 §1a's discipline — *a sweep that read nothing is a finding rather than a pass* —
has one home, `src/work-audit/reads.mjs`, and 61/02 already reused it rather than copying it. 62 is the
third consumer, and it is the one most exposed to the failure it prevents: an analysis pass whose input
is empty reports "no proposals" in exactly the same words it would use if the harness were perfect.

**Decision.**

**1 — Three lanes, declared in a registry with a floor each.** `lessons` — the `## R<n>` sections of
every `RETROSPECTIVE.md` in scope. `lineage` — the run records of every item in scope. `observations` —
the `observability/snapshots/<ts>/agents.json` series. The lanes are driven from one registry, so a lane
added without a floor fails CI (61/FF-6107's shape, and the reason it has that shape).

**2 — Every lane reads through the home that already owns its source, and none opens a raw path.**
Lessons through `parseRetrospective` (`src/memory/local-indexing.mjs`) — which also carries the
Kind/Area/Stage/Owner meta a clustering rule needs. Lineage through `readRuns` (`src/run-store.mjs`),
the run record's one reader; **TECH_DEBT item 59 records that a second home already exists**
(`work-observe.mjs` mirrors it to stay a zero-import leaf), and 62 will not be the third. Observations
through `readLatestSnapshot` (`src/work-observe.mjs`). The read record and the floor discipline are
imported from `src/work-audit/reads.mjs` — `readRecord`, `sweepDeclarationProblems`, `SWEEP_BASES` —
never restated.

**3 — A lane below its floor emits `tune-ran-on-nothing`, naming the lane, the root walked and the
floor missed.** This is the code that keeps ADR-001 §5 honest: reading a series that reports zero is
consuming it, and the zero is then said out loud. The `observations` lane at HEAD is the live example —
8 snapshots exist and every one reports 0 agents and 0 runs, because of limb (b).

**4 — The evidence floor for a PROPOSAL is two distinct source documents.** One document is one author's
one moment, and this milestone's entire subject is not believing a single reading. A candidate below the
floor is not silently dropped: it appears in `findings` as `below-evidence-floor` with its count, so the
surface never hides work it declined to do. **This number is 62's and is not 61's `N`** — `N = 8` is the
evidence required to **commit** a change, and a proposal is not a commit. The two are reported with their
own names, side by side, precisely so no reader conflates them.

**Alternatives considered.**

- *One "everything" corpus with no lanes* — **rejected**: a floor over a union cannot say which source
  went silent, which is the one thing this discipline exists to say.
- *A fourth lane counting off the effects journal* — **rejected**: the acceptor's report already brings
  the filtered census back (ADR-002 §4) and 61/FF-6107 refuses a second classifier in `src/`.
- *A floor of one document* — **rejected** on §4: it makes an anecdote a proposal.
- *Re-implement the retrospective parse to keep the corpus leaf import-free* — **rejected** by 66/FF-6604
  and by TECH_DEBT item 59's species; the third copy is where a species becomes a habit.

**Invariant.** Lanes are driven from one registry with a declared floor each; the read record is
imported from `src/work-audit/reads.mjs`; no module under `src/work-tune/` opens a `runs/*.json`,
`RETROSPECTIVE.md` or snapshot path directly or builds a heading grammar; a lane below its floor emits
`tune-ran-on-nothing`; a candidate below the evidence floor appears in `findings`.
(Enforced by `FF-6205`.)

---

## ADR-008: The positional is the shipped SCOPE-as-filter contract, not a new `<range>` grammar

**Status:** Accepted
**Date:** 2026-08-31

**Context.** 62/SPEC and the loop PRD both write `aof work tune <range>`. The word predates the scope
contract this repository actually shipped. TECH_DEBT item 49 measured what a fourth grammar costs:
*"The work stream has THREE independently-written scope parsers, and the one the loop depends on fails
OPEN."* `src/work-ref-scope.mjs` is the one home that came out of that (story 80/02) — zero imports,
shared by `validate`, `doctor` and both memory readers — and `aof work audit` and `aof work doctor`
already present the same `[scope]` positional with the same *an unresolved scope matches nothing*
semantics.

**Decision.**

**1 — `aof work tune [scope] [--json]` takes a scope and resolves it through `src/work-ref-scope.mjs`.**
A bare invocation is unscoped and reads the whole stream; `62`, `62/01` and a slug all mean what they
already mean everywhere else; an unresolved scope matches nothing and is reported as such at exit 0,
exactly as `audit` reports it.

**2 — The `NN-MM` range form is NOT introduced here.** It exists today only in `nextWork`'s `inRange`,
which is one of item 49's three parsers and the one that fails open. Adding a fourth reader of a fourth
grammar to reach a form no other read command offers would be the N+1th instance of a ledgered species.
When item 49 is paid, `tune` inherits whatever the single parser admits, with no edit.

**Alternatives considered.**

- *Implement `<range>` as SPEC words it* — **rejected** on item 49; the word is PRD language, the
  contract is the shipped one, and this departure is recorded in STATE.
- *Widen `src/work-ref-scope.mjs` to admit ranges* — **rejected as another milestone's work**: it is a
  zero-import leaf with four readers including a declared-pure retrieval path, and widening it for one
  new caller is how a shared rule acquires a caller-specific branch.

**Invariant.** Scope is resolved only through `src/work-ref-scope.mjs`; no scope or range grammar is
authored under `src/work-tune/` or in `src/commands/tune.mjs`. (Enforced by `FF-6205`.)

---

## ADR-009: What this milestone deliberately does NOT do

**Status:** Accepted
**Date:** 2026-08-31

1. **Any limb of the observation prerequisite** — ADR-001 §2a. 62 names the two limbs, measures them and
   reports the distance; it populates no `sessionId`, mints no run record and adds no instrument.
2. **An acceptance rule, a ranking cut-off, or any arithmetic over evidence** — ADR-002. 61 owns it.
3. **Any write, event, store or apply path** — ADR-005. Including auto-apply, which is L3 and locked.
4. **Any edit to `src/commands/acceptor.mjs` or to `src/work-acceptor/`** — the seam is used as declared.
5. **A `/aof:tune` bundle command.** No work command outside the `work insert` family ships one, and
   `acceptor`, `audit`, `grade`, `counters` and `ratchet` all ship without one; the CLI↔bundle parity
   control is scoped to that family. A prompt wrapper for an analysis pass is a separate decision.
6. **A board route.** `tune` joins `acceptor`, `audit` and `grade` in `BOARD_DEFERRED` for their reason
   (54/ADR-003 §4): a served route would let a page load walk the whole work tree, the run store and the
   transcript index. Recorded as a deferral, not an oversight.
7. **A second effects-journal counter or a second run-record reader** — 61/FF-6107 and TECH_DEBT item 59.
8. **Changing what is worth controlling.** Root references and the frozen set stay exogenous
   (62/SPEC §Out of scope, 55).
9. **Trace-seeded story sizing as a refine-time input.** The PRD lists it as an adjacent arc *"only worth
   exploring once `aof work tune` shows where failures cluster"*. 62 emits the story-sizing proposal as an
   advisory finding; nothing consumes it.

---

## ADR-010: The partition — five stories, one sole writer per module and per contended test file, two stages

**Status:** Accepted
**Date:** 2026-08-31

**Context.** 61/ADR-012 proved the discipline this milestone reuses: one sole writer per module *and per
contended test file*, with stage-1 stories carrying no edge between them. 61/R5 is the reason the second
half matters — two concurrent reviewers in one worktree, both mutating source for red probes.

### 1 · The coupling this is drawn from

Measured with `aof graph impact` against the graph built 2026-08-31T10:25:59Z (13,830 nodes / 33,846
edges, egress none). Every figure below is graph-derived, not inferred:

- **`src/commands/acceptor.mjs`** ← 4 (`src/command-core.mjs` and three test files) → 11. It is a leaf of
  the command layer, and 62 writes none of it — the invoke seam (ADR-002) touches it at run time only,
  which is why no story lists it in `files:`.
- **`src/run-store.mjs`** ← **59** importers — a genuine hub. 62 **reads** it (`readRuns`) and writes
  nothing in it, so it never appears in a `files:` set. A story that had to edit it could not be
  independent of anything.
- **`src/work-observe.mjs`** ← 16 (including `agent-session-driver.mjs`, `mesh-worker-execution.mjs`,
  `drive.mjs`) → 1. Same treatment: read `readLatestSnapshot`, write nothing.
- **`src/memory/local-indexing.mjs`** ← 28 → 8, and **`src/work-audit/reads.mjs`** ← 9 → 0. Both are
  read-only imports for the corpus story.
- **`src/command-core.mjs`** ← **139** → 85 — the registry god-node. Exactly **one** story may append to
  it, which is 59/ADR-008 §1's rule applied again, and that story is the terminal one.
- **`src/work-ref-scope.mjs`** ← 4 → 0 and **`src/declared-id.mjs`** ← 12 → 0 — zero-import rule leaves,
  imported by two different stories with no write in either.

The new modules are all under a **new `src/work-tune/` directory** and have no graph coverage yet by
construction; their coupling is therefore *declared* here rather than measured, and it is declared to be
a star: four leaves that import existing homes and each other not at all, plus one face that imports the
four. Nothing was reported `present: false` and then treated as isolated — the four are files that do
not exist yet, which is a different fact from an uncovered one.

### 2 · Sole writers

| module / contended file | sole writer |
|---|---|
| `src/work-tune/corpus.mjs` | 62/00 |
| `src/work-tune/proposal.mjs` | 62/01 |
| `src/work-tune/provenance.mjs` | 62/02 |
| `src/work-tune/distance.mjs` | 62/03 |
| `src/commands/tune.mjs`, `src/command-core.mjs` | 62/04 |
| `test/arch/acd-work-command-cli-bijection.test.mjs`, `test/arch/acd-work-command-route-coverage.test.mjs` | 62/04 |
| `scripts/test.mjs` | every story, in its own labelled block only |

`scripts/test.mjs` is the one file every story touches, and it is contended by construction. The rule is
59/01's: each story appends **one labelled block** of imports and **one labelled block** of spreads
carrying its own story number, and edits no other line. The registry is 4,459 lines and a story that
reformats it is rejected at review.

### 3 · Ordering, and what may be built in parallel

**Stage 1 — 62/00 ‖ 62/01 ‖ 62/02 ‖ 62/03.** Four leaves, no edge between them. Each takes its records
handed in — the discipline `src/work-counters.mjs` already ships — so none needs another's output to be
built or tested. `corpus.mjs` and `provenance.mjs` read disk; `proposal.mjs` and `distance.mjs` are pure
over data handed in.

**Stage 2 — 62/04.** The face composes the four, invokes `work:acceptor`, registers the command and
renders. It has an edge to all four and to nothing else.

Two stages rather than 61's four, because there is no equivalent of 61's rule → event → face chain: the
only persistence in this arc is 61's, and 62 writes none of it.

### 4 · Codebase health

- **`src/` has 144 root-level `.mjs` siblings against 10 subdirectories.** 62 adds **zero root
  siblings**: four modules under a new `src/work-tune/`, following 59's `src/work-audit/` and 61's
  `src/work-acceptor/`. The trend line moves the right way and the directory is created up front.
- **`src/commands/` is at 91 flat siblings and gains a 92nd.** This is a real accretion and it is **not**
  ledgered anywhere today — TECH_DEBT item 10 counts `src/` root modules, item 63 counts `test/arch/`,
  and neither covers the command directory. It does not fit this milestone: a ratchet landed here would
  police 91 files 62 does not touch, and the natural home is the sweep that pays item 10. **Routed to
  `TECH_DEBT.md` as a new entry** — one flat directory per layer growing one file per milestone, with
  the command directory now the fastest-growing of the three — and that entry is **owed**, because this
  pass may write only architecture and story documents.
- **`test/arch/` is at 371 flat siblings and `scripts/test.mjs` at 4,459 lines.** 62 adds 7 control files
  and ~14 registry lines. Same species, already ledgered as item 63; noted, not re-ledgered.
- **The proposer is the second consumer of a species worth watching**: a read-only analysis pass that
  reads many homes and writes none, declaring its lanes and floors by hand. 61/02 was the first. If a
  third arrives, that shape wants to be shared rather than hand-rolled a third time — recorded here for
  the architect who meets it.
- **TECH_DEBT item 60** (a long prose line hangs `aof work doctor <ref>`) bounds how this document is
  written, not what it decides: every paragraph is wrapped at ~112 characters, and the register's rows
  are long by design — item 60 measured 763-char table rows as safe and a 748-char *prose* line as fatal.

---

## ADR-011: The path-citation GRAMMAR is separated from the control PREDICATE at its own home — two additive exports, `controlPathsIn` byte-unchanged (supersedes ADR-006 §1 on the extractor named, and ADR-010 §2 for one module)

**Status:** Accepted
**Date:** 2026-08-31

**Supersedes:** ADR-006 §1 on **which extractor is named**, and ADR-010 §2's sole-writer table for
**one module only**. ADR-006 §2, §3 and §4 stand untouched, and so does §1's rule that no citation
grammar is authored under `src/work-tune/`.

**Context.** Raised at the Three Amigos pass over 62/02 and verified at source. ADR-006 §1 named
`controlPathsIn` as the document-citation extractor, and `controlPathsIn` **cannot extract a provenance
citation**: it filters every match through `isControlFileName`
(`src/work-doctor-controls.mjs:143-152`, `:102-106` — `/\.(?:test|spec)\.[A-Za-z0-9]+$/`), so ADR-006
§1's own worked example, `wiki/work/61_…/RETROSPECTIVE.md:150`, is dropped on the way out. A second
mechanism in the same home compounds it: ADR-006 §2 requires *"where a line is cited, the file has that
line"*, and `normalizeCitedPath` (`:128-133`) **strips** the locator through the unexported
`LOCATOR_SUFFIX` and returns the bare path. The unfiltered grammar `CITED_PATH` (`:118`) is
module-private. A 62/02 builder therefore had exactly two exits and both breached a contract: author
the pattern locally (FF-6204's *"absence of any equivalent literal"* leg refuses it) or write to a
module outside its declared `files:`.

**The filter is deliberate and must stay so.** That module's own comment (`:105-118`) records the
measurement behind it — 18 of 56 path-shaped tokens in fitness registers are prose naming modules a
guard *reads*, and counting them as control citations would put a permanent false
`control-unresolved` on `52/FF-5202` and ask a runner to name a `UAT.md`. Nothing here weakens that.

**Decision.**

**1 — The grammar and the control question are separated, at the home that already holds both.** Two
**additive** exports land in `src/work-doctor-controls.mjs`:

- `pathCitationsIn(cell)` — every path-shaped citation, **unfiltered**, de-duplicated, in source order,
  wildcards skipped, locator **retained**.
- `splitPathLocator(cited)` — `{ path, line }`, where `path` is `normalizeCitedPath`'s answer and `line`
  is the locator's number or `null`.

`controlPathsIn` is then expressed as `pathCitationsIn` composed with `isControlFileName` and
`normalizeCitedPath`. **Its answers are byte-unchanged**, and that is asserted as a self-comparison over
every `## Fitness functions` register in `wiki/work` rather than against a stored count — 66/FF-6604's
own idiom, chosen because the corpus grows.

**2 — This is 66/ADR-008 ruling 2's shape, one level over.** That ruling split a grammar leaf out so a
second consumer could use the grammar *"but never its block predicate"*. `CITED_PATH` is the grammar,
`isControlFileName` is the control question, `controlPathsIn` is the composition, and 62 needs the first
without the second. A *control* citation and a *provenance* citation are different questions asked of
one grammar, and after this they are two functions instead of one function that can only answer one.

**3 — The sole-writer amendment, with a named boundary.** 62/02's `files:` gains
`src/work-doctor-controls.mjs` **scoped to the two additive exports and the re-expression of
`controlPathsIn`'s body**; every other line stays as it is, and no other story writes that module. An
exception with a boundary, not a widening — ADR-010 §2's table stands for every other module. The
module has 16 importers, so the byte-unchanged leg in §1 is not a nicety: it is what makes the edit
safe to review.

**4 — The re-home is NOT taken here, and is recorded instead.** The architecturally cleaner end state
is `CITED_PATH` living in `src/declared-id.mjs` beside `QUALIFIED_REF` — that leaf is already the
citation-grammar home, is zero-import, and is already imported by `work-doctor-controls.mjs`. It is not
taken because it drags a second module, 66's single-home control and a 16-importer hub for a benefit 62
does not need. **Routed to `TECH_DEBT.md`**, and it is **owed**; the trigger is a third consumer of the
path grammar.

**Alternatives considered.**

- *Author the pattern inside `src/work-tune/provenance.mjs`* — **rejected** by ADR-006 §1 and by
  TECH_DEBT item 57's measurement: 123 of 309 arch gates already hand-roll a helper the tree already owns.
- *Relax `isControlFileName` so `controlPathsIn` returns everything* — **rejected**: it is the
  deliberate part, and relaxing it breaks the doctor's control lane on 18 measured prose tokens.
- *Export the raw `CITED_PATH` regex* — **rejected**: it carries the `g` flag, so a shared instance
  carries `lastIndex` across consumers. `declared-id.mjs`'s own control asserts a flagless grammar for
  exactly this reason; the export is a function, not a regex.
- *Give the two exports their own story* — **rejected**: a story for two additive exports, gating the
  only consumer that wants them.

**Invariant.** `pathCitationsIn` and `splitPathLocator` are exported from
`src/work-doctor-controls.mjs`; `controlPathsIn`'s answers over the whole `wiki/work` register corpus
are unchanged by the split; no citation grammar or locator pattern is authored under `src/work-tune/`;
and no story other than 62/02 writes that module. (Enforced by `FF-6204`.)

---
## ADR-012: The observations lane counts READINGS, the advisory lane's `from` is read through its target's own accessor, and ten closure rulings (supersedes ADR-001 §2, ADR-007 §1/§3 on the figure and the live example, and ADR-004 §1 on the advisory `from`)

**Status:** Accepted
**Date:** 2026-08-31

**Supersedes:** ADR-001 §2's snapshot figure; ADR-007 §1's observations-lane basis and §3's
"live example" claim; ADR-004 §1 on **where the advisory lane's `from` comes from**. Every other clause
of all three stands. §§4–13 below are closure rulings on questions the ADRs left silent; each names the
clause it settles and none of them reverses one.

**Context.** Raised at the Three Amigos pass over 23 authored task features and re-measured here. Two
of the corrections are the same species this milestone exists to indict — a figure asserted at one
altitude and never checked against the reader that would have to produce it.

**1 — The snapshot figure was wrong, and the corrected census is the one a reader can reproduce.**
At HEAD: **8 snapshot directories across 7 items**, of which **6 carry an `agents.json`** —
`wiki/work/70_milestone_warm-start/observability/snapshots/` holds two directories with a `report.md`
and no JSON. **ADR-001 §1's and §2's "8 append-only observability snapshots", and ADR-007 §1's and
§3's repetition of it, are corrected to that census** — here, and in 62/00's `STORY.md`. The figure is
also the one place this milestone made its own indicted mistake: a count asserted at one altitude and
never checked against the reader that would have to produce it.

**2 — The lane's basis is READINGS, and the lane reports three numbers, not one.** The reader ADR-007
§2 mandates, `readLatestSnapshot({ cwd, ref })` (`src/work-observe.mjs:1543`), returns **at most one
snapshot per item** — the lexically last — and `null` when there is none. So the observations lane can
see at most **7** series and **6** readings today, and a floor whose basis is "8 snapshots" would be
measured against a population the declared reader cannot produce. The lane therefore emits **series
walked**, **readings counted** and **readings carrying an agent attribution**, and its floor is compared
against **readings**. QA's contract on this point is **confirmed**.

**3 — And ADR-007 §3's "live example" is WITHDRAWN, because it conflated two different failures.**
At full scope the observations lane reads 6 series successfully, so it is **not**
`tune-ran-on-nothing` — that code is about how much the lane read. What is zero is the *content*: all 6
readings carry no agent attribution. Those are different faults with different fixes, and the third
number in §2 is what tells them apart. **The zero-attribution reading is not a second code**: it is
ADR-001 §2a's limb (b) surfacing, and 62/03 already owns it — a lane-local code for the same fact would
be the duplication D-4 below refuses one level down. `tune-ran-on-nothing` has no live example at full
scope today; it fires under a narrow scope (§12) and is otherwise proven by planting, which is the
honest position and better than manufacturing one.

**4 — The advisory lane's `from` is resolved through its TARGET's own accessor, in `proposal.mjs`,
over the config the face hands in.** ADR-004 §1 and FF-6203 require a patch's `from` to be the target's
value read at emit time, and for the advisory lane nothing was declared to read it: the acceptor never
sees `work.agents.models`, and none of ADR-007's three evidence lanes reads config. The resolution is:

- The **face** supplies `ctx.workspace.config` — it already holds it, and `src/commands/audit.mjs:147`
  and `src/commands/grade.mjs:306` are the precedent for a face doing exactly that and no more.
- `src/work-tune/proposal.mjs` resolves the advisory target through the accessor that **owns** it —
  `AGENT_MODEL_MAP_PATH` and `agentModelMap` (`src/work-bundle.mjs:249-256`), whose own comment says it
  is *"the ONE accessor both render and validation call — do not re-walk the path"*. The module stays
  **pure**: `agentModelMap` is a function of the config handed in, so no filesystem, clock or argv
  enters the leaf and 62/01's stage-1 independence is untouched.
- The two lanes stay **asymmetric on purpose**: the tunable lane's `from` comes back **from the
  acceptor's report**, where `declaredKnob`/`valueAt` already resolve it, and `proposal.mjs` may not
  re-resolve it — a second config read for a tunable key would be a second reader and would need a
  `work.loop.*` literal that FF-6201 refuses. One rule (*read the target's value through the target's
  own home*), two homes, because the targets have two owners.

62/01's `reads:` gains `src/work-bundle.mjs`; no `files:` set changes.

**5 — A refusal and a limb that name one fact are stated ONCE.** `REFUSAL_REMOVALS[NOT_ADMISSIBLE]` and
ADR-001 §2a's limb (a) are the same sentence about the same missing engineering. The entry is the
acceptor's — its `removal` text, verbatim — with the limb's **measurement** rendered beneath it as
evidence (the resolution sites and their dispositions). A standalone limb entry appears only where the
acceptor never spoke: an advisory-lane proposal, or a run in which the acceptor was not consulted.
QA's reading is **confirmed**, on 61/ADR-013 §1b's precedent — one code crosses into the lane and its
grounds render as detail beneath it, never lifted. Two entries would make one fix look like two.

**6 — Limb (b) closes when the COUNTER answers, not when the harness changes.** ADR-001 §2a gave two
thresholds and they are not the same: *"`sessionId` populated by the path that builds items"* is the
**cause**, and `roundsToAccept` returning a number rather than `run-attribution-absent`
(`src/work-counters.mjs:149-155`) is the **test**. Only the second is computable from the corpus — the
first is a claim about a future code path, and a limb that cannot be measured cannot shrink. The limb
therefore reports the counter's answer and names the cause as its detail. QA's reading is
**confirmed**, with the consequence stated plainly: the limb can close while most run records still
carry no session id, because one accepted item with all its consumed runs attributed is enough to make
an arm measurable. That is the right threshold — the limb is about whether the metric can be read at
all, not about how thoroughly the harness was fixed.

**7 — An unreachable acceptor is a FAILED RUN and exits non-zero.** The counter-argument wins.
`work:acceptor` is in the same `COMMANDS` array as `work:tune`, so a registry that cannot answer for it
is a broken installation, not a fact about the work stream. The line this milestone holds is: **a
refusal about the WORK is exit 0; a failure of the command's own machinery is not.** The failure is
reported in `--json` first, coded `acceptor-unreachable`, and then the process exits non-zero — this is
FF-6207's *"exits 0 unless it failed to run"* branch, and this clause says which side of it the case
falls on. It is not a second gate: no finding, refusal or empty result ever moves the exit code.

**8 — `from` equal to `to` is NOT emitted; it is a finding, `already-in-force`.** A proposal that
changes nothing is not a proposal, and the reason it may not be emitted as a no-op is specific:
ADR-001 §4's non-vacuity condition counts **emitted proposals**, so a no-op counting toward it would let
this milestone pass its own honesty test with nothing. It is not dropped either (ADR-006 §3's
discipline): it appears in `findings` naming the target and the value already in force.

**9 — The patch/applier asymmetry is INTENDED, and here is the state that produces it.** A patch with
no applier is real and reachable: ADR-004 §3 refuses an applier the registry cannot answer for, and the
computed patch survives that refusal — the human still has a complete change to apply by hand. An
applier with no patch is forbidden because it is a button with no payload. ADR-004 §2's headline reads
as a biconditional at a glance and is not one; FF-6203 has it right, and 62/01's task `03` depends on
exactly this direction.

**10 — A non-ordinal key on the tuning edge ROUTES to the tunable lane, and 61 refuses it there.**
ADR-003 §1 computes the lane from the edge and §2 calls the model-map class permanently advisory; if a
registry ever declared `config:work.agents.models` on `parameter-tuning:`, §1 wins on **routing**.
Deciding a key is non-ordinal before asking would be 62 pre-empting 61's ruling, which ADR-002 forbids
— and 61 already ships `not-an-ordinal-knob` in its ruling lane for precisely this case (61/ADR-013
§2, position 8). **Routing is not committing.** §2's "permanently advisory" describes the class as the
registry declares it today; it is not an override of the computation. QA's reading is **confirmed**.

**11 — An id citation and a path citation naming the same document are ONE source.** ADR-007 §4's floor
counts **distinct resolved source documents**, after normalisation: an id citation resolves to the
document that declares it, and that document is the unit. §4's own rationale — *"one author's one
moment"* — is about the moment, not the spelling, and a floor that two spellings of one document could
clear would be a floor in name only. QA's reading is **confirmed**.

**12 — Demotion outranks the floor, except where there is nothing to demote.** A proposal with an
unresolvable citation is demoted (ADR-006 §3) even if it would also miss the floor, because demotion
names a **specific broken citation** and the floor names an **absence** — where a specific fault exists,
report the specific fault. A proposal with **no** citations at all has no fault to name and falls to
`below-evidence-floor`. Both land in `findings`, so the choice changes which sentence a reader gets, not
whether they get one. QA's routing is **confirmed**.

**13 — A lane's floor is UNCHANGED under a narrow scope, and a scope that matched nothing raises no
lane finding.** A per-scope floor would be a second floor rule, and a floor that relaxes when the
evidence thins is the shape this whole stream refuses. So `aof work tune 62/00` over a story with no
retrospective and no runs does emit three `tune-ran-on-nothing` findings, and that is the correct
answer — **each finding names the scope it was measured under**, so it reads as *this scope holds no
evidence* rather than as a broken tool. A scope matching **no item at all** is the separate case ADR-008
§1 already settled by adopting `audit`'s semantics verbatim (`src/work-audit/report.mjs:572-576`): the
run reports that nothing matched and no lane finding is raised, because no lane ran. QA's reading is
**confirmed**.

**14 — The nit, closed by naming it.** ADR-007 §1 spells the observations source as a path in prose
while FF-6205 forbids that shape in the family's code. Both are right and the trap is real: a build that
copies the sentence into a constant trips its own control. **The path in these documents is
documentation of what the source IS; the reader is `readLatestSnapshot`, and the family names no
snapshot path.** FF-6205's row now says so, so the answer sits in the same place as the prohibition.

**Alternatives considered.**

- *Keep "8 snapshots" and define the floor over directories* — **rejected**: the declared reader cannot
  produce that population, so the floor would be measured against a number nothing computes.
- *Mint a lane code for "read but empty"* — **rejected** on §3: it is limb (b), which 62/03 owns, and a
  second name for one fact is the duplication §5 refuses one level up.
- *Read the advisory `from` in the face* — **rejected** on §4: it would put a target→accessor routing
  table in the face, which is what ADR-003 refuses for lanes.
- *Exit 0 on an unreachable acceptor* — **rejected** on §7: it lets CI sail past a broken spine.
- *Emit `from === to` as a no-op proposal* — **rejected** on §8: it inflates the set ADR-001 §4 counts.

**Invariant.** The observations lane reports series walked, readings counted and readings carrying an
attribution, and its floor is over readings; the advisory lane's `from` is resolved through
`agentModelMap` over the config the face supplies, and the tunable lane's comes from the acceptor's
report; a refusal and a limb naming one fact render once; an unreachable acceptor exits non-zero; a
`from === to` proposal and a zero-citation proposal are findings rather than emitted proposals; an id
and a path citation on one document count once toward the floor; and lane floors do not vary with
scope. (Enforced by `FF-6202`, `FF-6203`, `FF-6205`, `FF-6206`, `FF-6207`.)

---
## ADR-013: Candidate FORMATION is a story; the ring ban is family-wide; limb (a) is READ from the acceptor rather than re-derived; and non-vacuity over this repository is ONE control at stage 2 (supersedes ADR-010 §2/§3, ADR-006 §1 on the id form, ADR-005's write claim, and ADR-012 §4 on absence)

**Status:** Accepted
**Date:** 2026-08-31

**Supersedes:** ADR-010 §2's sole-writer table and §3's staging (§1, §5, §7 below); ADR-006 §1 on the
**id citation form** (§3); ADR-005's *"no filesystem write is reachable"* (§8); ADR-012 §4 on **what an
absent target means** (§9). ADR-011 stands untouched.

**Context.** The developer's feasibility pass returned 12 items, four of them blocking, and demonstrated
one empirically rather than by argument. 61/ADR-012 was re-authored at exactly this pass; this partition
is re-authored here for the same reason. The two findings worth naming as *classes*, because both are
mistakes this milestone's own subject is supposed to prevent:

- **The milestone's central deliverable had no owner.** Every task contract takes a *candidate* handed
  in, and no story turns 392 lesson sections and 61 run records into one. ADR-001 §4 makes "emits at
  least one proposal" an acceptance condition, so the one artifact that makes the acceptance condition
  satisfiable was the one nobody was assigned. *"The clustering rule is the build's to choose"*
  (`STATE.md`) was a decision about a **criterion**; it was silently read as a decision about a
  **module, an owner and a seam**, and those are not the same abstention.
- **A control's scope was one file where the hazard is a graph.** Measured, not argued: with the
  three-module shape built, `import proposal.mjs` and `import command-core.mjs` both resolve, and
  `import tune.mjs` throws `ReferenceError: Cannot access 'tuneCommand' before initialization`. A leaf
  closes the registry ring exactly as well as the face does.

**Decision.**

**1 — Candidate formation is a SIXTH story, `62/05`, at stage 1, and it is pure.**
`src/work-tune/formation.mjs` turns the lane records 62/00 produces into candidates: it clusters, it
counts sources, and it attaches the citations 62/02 will check and the target 62/01 will shape. It takes
records handed in, so it has no edge to 62/00 and builds beside it.

**1a — What is fixed here, and what genuinely stays the build's.** Fixed: the module, its owner, its
seam, its output shape, and that a cluster carries **every** source that contributed to it rather than a
representative sample (the floor in ADR-007 §4 counts sources, so a lossy cluster would make the floor
unmeasurable). Left open, deliberately and now explicitly: the **similarity criterion** — which lesson
sections belong in one cluster — because that is a judgement best made against the real corpus, and
because ADR-001 §4 already binds its outcome. An abstention about a criterion is not an abstention about
a home.

**1b — It is numbered 05 although it lands at stage 1, and that is deliberate.** The 23 authored task
features are addressed by story number; renumbering would move every one of them to spare this document
an ordering wrinkle. 61's partition already had number and stage disagree. The stage table in §7 is the
authority on order, not the number.

**2 — The registry-ring ban is FAMILY-WIDE, and the applier resolver is INJECTED at the face.**
FF-6201 scoped the static-import ban to `src/commands/tune.mjs`; the measurement above shows a leaf
closes the ring just as well, and 62/01's own suite would stay green while 62/04's probe went red on a
line 62/01 wrote — a defect invisible from the story that caused it. So: **no module under
`src/work-tune/` and not `src/commands/tune.mjs` statically imports `src/command-core.mjs`.** ADR-004
§3's applier rule is unchanged in substance and changes in mechanism: the **face** passes a
`resolveCommand` bound to `getCommand`, and `proposal.mjs` calls what it was handed. That is ADR-012
§4's discipline reused — the face supplies what only the face holds — and `src/command-core.mjs` stays
in 62/01's `reads:` as the contract it must satisfy, never as an import.

**2a — FF-6201's fresh-process probe is KEPT and is now the milestone's ratchet on TECH_DEBT item 26.**
It is the only probe that sees this class: every suite reaches these modules through a warmed module
cache, which is why the item's own record says nothing in CI can see it. It runs per module in the
family, not once for the face.

**3 — A provenance id citation is QUALIFIED ONLY; the bare-id form is DROPPED.** `qualifiedRefsIn` /
`QUALIFIED_REF` (`src/declared-id.mjs:242-259`) match `m?<itemRef>/<ID>` and nothing else, and the other
export recognises a **declaration** at a heading or table row, not a citation in prose. There is no
exported bare-id citation extractor, so ADR-006 §1's id form was unimplementable without authoring the
pattern FF-6204 forbids or taking a second sole-writer carve-out.

Dropping it is the better answer on its own merits, not merely the cheaper one. A bare id **is
addressable only inside its own item's documents** — that is the rule ADR-012 §11 confirmed — and a
provenance citation is read *outside* every item, on a proposal that spans the stream. So a bare id in
that position is ambiguous by construction. And 62 is never forced into one: it **constructs** its
citations from records it read out of a known item, so it can always emit the qualified form. A bare id
encountered *in a source document* is not a citation 62 propagates; it is text.

**4 — Limb (a) is READ from the acceptor's report. 62 builds no unit set and walks no source tree.**
FF-6206 said limb (a) was *"derived from `consumptionReport`'s dispositions over the real unit set"*,
and the only producer of that unit set is `sourceUnits`, private to `src/commands/acceptor.mjs` — a file
ADR-009 §4 forbids this milestone to touch. 62 would have hand-rolled the fourth `{rel, code}` walker.

It never needed one. `executedConsumerRefusal` already returns `sites`, `inspections`, `consumers` and
`declaringHome` (`src/work-acceptor/admissibility.mjs:505-530`); `assessProposal` carries that object in
`refusals`; and `reportOne` puts it on every row as `admissibility` and again under
`details["not-admissible"].grounds`. **The dispositions arrive with the verdict.** So limb (a) is
rendered from the report exactly as its removal text already is (ADR-012 §5) — which is ADR-002 §3's
rule, *render 61's answer, never re-derive it*, applied to the one place this milestone had quietly
broken it. No carve-out, no export, no walker, and one less way for 62 and 61 to disagree about the
same tree.

**5 — `test/command-core-contract.test.mjs` joins 62/04's `files:`, and the sole-writer table gains the
test tree.** `WORK_IDS` (`:51`) is a hand-kept census asserted at `:310` as *"exactly the known work
ids, no more, no fewer"*, so registering `work:tune` reddens it; 61/06 had to edit it for
`work:acceptor` and the file carries that edit in the working tree today. Everything else a new command
touches is registry-derived and needs no edit. ADR-010 §2's table also omitted the 12 files the stories
**create** — 8 arch controls and 5 `test/tune-*.test.mjs` suites (7 arch and 5 suites before this ADR
adds FF-6208's). They are uncontended by construction, but the omission is what hid this one: **a table
of contended files is not a write set**, and §7 restates it as a write set.

**6 — The lessons lane PARSES through `parseRetrospective` and does its OWN join.** `parseRetrospective`
(`src/memory/local-indexing.mjs:147`) is a pure text parser: the caller builds the path and reads it.
Routing instead through `buildRecords` — the one disk-reading home — breaks two things, both measured:
`isMilestoneSource` requires `type === "milestone" && parent == null` (`:664-668`), which makes **34 of
the 392 lesson sections invisible** (7 top-level `NN_story_*` items: 29, 73, 74, 80, 83, 84, 87); and it
scopes by `Number.parseInt` equality rather than `itemInScope`, so a **slug scope yields zero
retrospectives**, contradicting 62/00's own scope contract.

So FF-6205's *"opens no raw path"* leg is narrowed to the two shapes where a second reader is the real
hazard — `runs/*.json` and `snapshots/*/agents.json` — and the retrospective join is the lane's, with
`parseRetrospective` mandatory for the **parse**. **The shared thing is the grammar, not the walk**, and
requiring the walk would have silently dropped 8.7% of the corpus to protect a rule about parsers. A
lane that loses evidence to satisfy its own purity control is the failure this milestone exists to
refuse.

**7 — Non-vacuity over THIS REPOSITORY is one control at stage 2: `FF-6208`, owned by 62/04.**
FF-6202, FF-6203, FF-6204 and FF-6206 each carried a leg asserting over *the emitted set* or *the
repository's own corpus* — objects that do not exist until the face composes. So ADR-010 §3's *"none
needs another's output to be built or tested"* was true of the four **modules** and false of the four
**controls those stories own**: each would land `pending` and be unable to clear it, which this
register's own rule does not admit at accept.

Those legs move, whole, into **`FF-6208`**. It is the right home on the merits: ADR-001 §4's non-vacuity
condition is a **milestone-level acceptance condition**, and scattering it across four stage-1 controls
made it four partial claims nobody read together. Each stage-1 control keeps every leg it can prove over
its own module and over planted fixtures — including its own non-vacuity, planted — and stage 1 becomes
genuinely edge-free at the **control** level as well as the module level.

**8 — "Writes nothing" means NO WRITE INSIDE THE WORKSPACE TREE, and the two escapes are NAMED.**
ADR-005's *"no filesystem write is reachable"* is false as written, twice, and this milestone contracts
one of the triggers by name. **(a)** `readLatestSnapshot` calls `reportDegrade` on an unreadable
`agents.json` (`src/work-observe.mjs:1574,1580`), which reaches `mkdirSync` + `appendFileSync` into the
mesh log; `readRuns` does the same on a torn record (`src/run-store.mjs:650`) — and 62/00's task 02
contracts *"a readings file that will not parse"*. **(b)** `invoke("work:acceptor")` reaches
`censusSnapshot` (`src/commands/acceptor.mjs:354-371`): `mkdtemp`, `copyFile` and a journal open.

Both land outside the workspace, so 53/FF-5306's byte-walk over `fx.projectRoot` never sees them — the
control passes and the sentence is untrue, which is worse than a control that fails. The invariant is
restated as **no write inside the workspace tree**, and both escapes are named on the surface rather
than excluded quietly. Neither is incidental: (a) is a diagnostic about evidence 62 could not read, and
(b) is 61's own read discipline — the acceptor copies the journal *so that a report cannot mutate its
evidence source*. A milestone that hid them would be hiding the two places its own reads are visible.

**9 — `from` is the value in force AT THE LAYER THE PATCH WRITES, and ABSENT is a value.** At HEAD
`.aof/aof.config.json` carries no `work.loop` section and no `work.agents.models`; on the reading that
an absent target renders no patch, every `work.loop.*` proposal is patchless and the only patchable knob
is the one permanently refused `step-would-be-compound`. That is a vacuity this milestone would have
built into itself.

A patch writes a **layer**, and its `from` is that layer's value — `absent` included. Adding a key is a
complete, reviewable before→after: it is exactly what a `git diff` of the config will show, and *"this
role has no override"* is a true and useful starting state. So `from` carries the value **and its
source** (`config` or `absent`), and ADR-004 §1's completeness is unchanged: three fields, one of which
may say the target is unset.

**9a — And 62 does NOT read the shipped default.** The effective model is
`agentModelMap(config)[role] ?? bundleResource.model`, layered in `renderBundleOutputsWithConfig`
(`src/work-bundle.mjs:270-277`) — a render function, not a per-role accessor. Chasing it would give 62 a
fourth reader and a second answer to *"what is in force"*. The proposal states the layer it writes and
says the shipped default applies where the map is silent; the reader sees that default in the rendered
agent file. One layer, one `from`, no second reader.

**10 — A control that needs mutated source reads a COPY; only a red probe touches the working tree.**
Two contracts require rewriting a shared module to observe a failure, across `work-ref-scope.mjs`,
`declared-id.mjs` and `work-doctor-controls.mjs` — none of them in any story's `files:`, and 62/00 and
62/02 build **in parallel in one worktree**. That is 61/R5 exactly: two agents mutating source to run
red probes, in one tree. The admitted technique is stated once, here: **copy the tree to a temp
directory, rewrite the copy, `import()` the copy.** A control may not mutate a file it does not own, and
may not mutate one it does own while another story is building. Red probes still touch the working tree
— applied, run, reverted, `git status` clean — and are **serialised at verify**, one at a time.

**11 — `tune-ran-on-nothing`'s finding shape is re-authored and asserted KEY-BY-KEY against
`readFinding`.** `readFinding` (`src/work-audit/reads.mjs:152-159`) hardcodes
`code: "audit-ran-on-nothing"` with its severity, path and message shape, so it cannot be reused. This
is 61/FF-6107's situation exactly, and its resolution is adopted verbatim: the finding is re-authored,
`readFinding` is deliberately **not** imported (the code is the auditor's), and the two shapes are
asserted to differ **in the code string alone**, key by key — so the drift this home exists to prevent
is caught by comparison rather than by hope.

**Alternatives considered.**

- *Assign formation to 62/01* — **rejected**: three modules and three controls on one story, and
  clustering evidence is a different concern from shaping a target.
- *Renumber the stories so 05 sits first* — **rejected** on §1b: it moves 23 authored feature files to
  fix a cosmetic ordering.
- *Ban the ring only at the face* — **rejected** on the measurement: the failure is invisible from the
  story that causes it.
- *Add `citedIdsIn` to `src/declared-id.mjs`* — **rejected** on §3: a second sole-writer carve-out for a
  citation form that is ambiguous outside its own item anyway.
- *Export `sourceUnits`, or move the walker into `admissibility.mjs`* — **rejected** on §4: the
  dispositions already arrive with the verdict, and both options edit a file ADR-009 §4 protects.
- *Route the lessons lane through `buildRecords`* — **rejected** on §6: it drops 34 of 392 sections and
  breaks slug scoping.
- *Leave the four corpus legs on their stage-1 owners* — **rejected** on §7: a control its own story
  cannot clear is a declaration that cannot be honoured.
- *Narrow FF-6207 by excluding the two escapes silently* — **rejected** on §8: an exclusion nobody reads
  is how a true-looking sentence survives being false.

**Invariant.** Formation has a module, an owner and a seam; no module in the tune family statically
imports `command-core` and the applier resolver is injected; provenance id citations are qualified only;
limb (a) is read from the acceptor's report and no unit set is built; every corpus-wide non-vacuity claim
lives in `FF-6208` at stage 2; no write lands inside the workspace tree and the two outside escapes are
named; `from` carries its layer's value and its source; a control needing mutated source reads a copy;
and the lane finding's shape differs from `readFinding`'s in the code alone.
(Enforced by `FF-6201`, `FF-6203`, `FF-6204`, `FF-6205`, `FF-6206`, `FF-6207`, `FF-6208`.)

---
## ADR-014: Formation is a PARTITION with a content-derived tie-break and a scalar criterion; a target is a bare REF; and absence is compared against the base the evidence assumed (closes ADR-013 §1a, §9 and ADR-012 §5)

**Status:** Accepted
**Date:** 2026-08-31

**Closes:** ADR-013 §1a (what §1a's abstention does and does not cover), ADR-013 §9 (the case it
collides with), and ADR-012 §5 (the standalone-limb clause, for the empty-edge case). Nothing is
reversed; every clause below fills a hole a task contract had to guess at.

**Context.** The task-authoring pass over 28 features found nine places where an amendment implied a
clause it did not state; three could turn a defensible implementation red. The pattern is worth naming
once: **every one sits at a seam between something this milestone deliberately left open and something
it silently assumed** — §1a's abstention, §9's "absence is a value", ADR-012 §5's standalone limb.
An abstention with an unstated boundary is not an abstention; it is a decision nobody made.

**1 — `from` is compared against THE BASE THE EVIDENCE ASSUMED, not against non-null.** ADR-013 §9
made absence a value; ADR-004's moved-premise rule refuses a patch whose base has shifted. On every
`work.loop.*` key the evidence was gathered under an absence, so the two clauses met on exactly the
keys this milestone depends on. They are reconciled by reading the comparison as one over **values,
absence included**:

| the target, at emit time | the evidence assumed | outcome |
|---|---|---|
| holds no value | no value | **patch rendered**, `from` absent, `fromSource: absent` |
| holds no value | a value | **no patch** — a moved premise; both readings named |
| holds a value | that value | patch rendered, `from` that value |
| holds a value | a different value, or none | **no patch** — a moved premise; both readings named |

The rule is one sentence and the table is its enumeration: *a patch renders when the base in force
equals the base the evidence assumed, and absence is one of the bases that can be equal.* QA's split
is **confirmed** and is now a clause rather than an inference.

**2 — FF-6207's workspace narrowing rests on a NO-CARRY-BACK leg, and the register now carries it.**
Restating "writes nothing" as "no write inside the workspace tree" (ADR-013 §8) is a real weakening
unless nothing written outside the tree can carry state back in. That is the leg that makes the
exemption safe, and it was in 62/04's contract and not in the register — which is the same defect as
the sentence ADR-013 §8 corrected, one level over. FF-6207 now asserts it directly: **run twice over
one tree; nothing accumulates between the runs, inside the tree or outside it, and no byte written
outside the tree changes the second run's output.** The two named escapes are diagnostics and a
private snapshot copy, so they pass this — but it is asserted rather than assumed.

**3 — Over an empty tuning edge limb (a) is `unknown`, not absent.** When the registry declares no
tunable key the acceptor is never invoked (FF-6202's own leg), so no grounds object exists to read and
ADR-013 §4 leaves nothing to render. The honest answer is the one ADR-012 §5 already reserves:
`unknown`. The distinction FF-6206 turns on is stated here once — **`unknown` means the question could
not be asked; a limb not reported means it was asked and does not stand.** A fabricated walk to answer
it anyway is exactly what ADR-013 §4 removed. The single acceptor report a run obtains supplies the
grounds for advisory rows too, so no second invocation is needed to answer for them.

**4 — Formation IS a partition: every source record lands on exactly one candidate.** ADR-013 §1a
fixed losslessness only in the *carry* direction, so an overlapping-cluster design was excluded by no
text and fails both of FF-6209's legs. Ruling: **partition**, and the reason is this stream's own
subject rather than arithmetic convenience.

A record carried on two candidates lets **one observation stand behind two proposals**, each of which
then reports it as its own evidence. That is the multiple-testing inflation spike 60 exists to indict
and 61 exists to gate — re-using one observation across several hypotheses and reading the set as
independently supported — arriving one stage upstream of the acceptor, where nothing would catch it.
The evidence floor counts *how many independent times the world said this*; overlap makes the same
telling count twice across the set while looking correct within each proposal.

The cost is accepted with its answer stated: a lesson bearing on two changes lands on one, and the
other does not get to claim it. **If both are truly supported each has its own sources; if one
observation can be read two ways, there is one candidate, not two** — the conservative answer a
machine that must not manufacture evidence should give.

**5 — The tie-break is FIXED HERE, and §1a's abstention does not reach it.** §1a leaves the
*similarity criterion* open; a tie-break is a **shape** decision, and QA is right that a tie broken by
input position satisfies the abstention while breaking order-independence. Any tie-break is arbitrary;
what is not arbitrary is what it may be a function of. **The tie-break is a function of CONTENT, never
of ARRIVAL:** no input index, position or iteration order may reach it. The admitted default is the
candidate whose lexicographically least source citation sorts first — total, because citations are
unique, and stable under any permutation of the input. The control shuffles the input records and
asserts byte-identical candidates.

**6 — The criterion declares an ORDERED RANGE, and that does not exclude a categorical rule.** The
contract's *loosest / tightest it admits* rows and its out-of-range refusal need an ordering, and a
bare categorical rule has none. Requiring a range is what makes §1a's abstention **reviewable**: a
reader sees the whole space the criterion can occupy rather than one point in it, and a criterion that
drifts outside its declared range is refused instead of quietly re-tuned.

It forbids less than it looks: the categorical design the corpus invites — cluster records whose
`Kind`/`Area`/`Stage`/`Owner` meta agree — expresses itself as *how many fields must agree*, scalar and
ordered, loosest at 1 and tightest at 4. **Requiring a range does not ban categorical clustering; it
makes a categorical rule declare its own strength.**

**7 — A target is a bare REF, and no typed target vocabulary is introduced.** §1 said formation
attaches "the target 62/01 will shape" and typed nothing. It stays untyped: the candidate **names what
the cluster is about** and states no value, no layer and no `from` — the contract as authored is
confirmed. A cluster with no identifiable referent carries `target: null` and is still a candidate;
that is the story-sizing class, which is advisory and patchless by construction.

A typed vocabulary is refused structurally: it would be a constant **shared between two stage-1
stories**, and importing it either way puts an edge exactly where ADR-013 §7 says there is none.
Nothing needs it — whether a ref is a tunable knob is the registry's answer (ADR-003 §1), and whether a
patch is computable over it is the owning accessor's (ADR-012 §4): `agentModelMap` answers for a role,
a config path for a config key, and a ref neither answers for is patchless with a stated reason.
**A ref that looks like a config key but is not on the tuning edge still lands advisory**, so the lane
stays the registry's answer and formation has not pre-empted it.

**8 — Every lane reaches formation, and formation is AGNOSTIC about which lane a record came from.**
Each lane 62/00's registry declares hands its records over one common shape; formation clusters them
without knowing lane semantics and **rejects no lane shape**. A formation module that recognised lane
names would be a second home for the lane vocabulary 62/00 owns, and lane-specific handling is how a
records-handed-in leaf grows a reader.

The contract's *"records from all three lanes are carried"* row must therefore be **driven from
62/00's lane registry** rather than from the literal three — the idiom FF-6205 already uses, so a
fourth lane is covered with no edit and the row cannot go vacuous if a face hands in two. At HEAD the
observations lane contributes **6 readings carrying 0 attributed agents** (ADR-012 §2): they are
clustered like any other record and simply cluster poorly, which is a result, not a special case.

**9 — `src/work-counters.mjs` leaves 62/05's `reads:`.** It is `roundsToAccept`'s home and belongs to
62/03's limb (b); formation computes no counter and needs nothing from it. Dropped from the story and
from ADR-013's partition entry.

**Alternatives considered.** *Overlapping clusters* — **rejected** on §4: one observation behind two
proposals, upstream of the only gate that would notice. *Leaving the tie-break to the build* —
**rejected** on §5: a shape decision, and the cheapest conforming implementation breaks the contract.
*A categorical criterion with no range* — **rejected** on §6: the abstention stops being reviewable.
*A typed target vocabulary* — **rejected** on §7: a shared constant across two stage-1 stories is an
edge the partition says does not exist. *Skipping the observations lane while it reads zero* —
**rejected** on §8: a leaf that knows which lane is currently interesting is a reader.

**Invariant.** A patch renders only when the base in force equals the base the evidence assumed, with
absence a base like any other; nothing written outside the workspace tree carries state between runs;
limb (a) is `unknown` where no acceptor grounds exist; formation partitions its input, breaks ties on
content and never on arrival, declares its criterion as an ordered range, attaches a bare ref or null,
and treats every lane the registry declares alike. (Enforced by `FF-6203`, `FF-6206`, `FF-6207`,
`FF-6209`.)

---
## Fitness functions

<!-- Each structural invariant from an ADR, paired with the arch-test that enforces it in CI.
     The arch-test lands with its subject story, so `pending` clears story by story.
     `pending` reports at warn while 62 is open and is NOT admitted at accept — `aof work doctor 62`
     reports each unresolved control as `control-unresolved`, and what clears it is landing the file
     or dropping the declaration, never re-marking it `pending`.

     Each declared control also owes a RED PROBE in VERIFICATION.md once it lands: what was changed
     to make it fail, and the message observed.

     HARNESS SHAPE: every arch-test here exports an array of `{ name, run }` — never `{ name, fn }` —
     and is imported AND spread in `scripts/test.mjs`'s suite registry inside its own labelled story
     block. A suite imported and not spread is not registered; that is 56's finding and 59/01's
     subject, and TECH_DEBT item 50 is the control that now sees it.

     DELIBERATELY NOT RESTATED, because a guard already in service walks the whole tree and would
     already fail on the breach — restating it here would be the duplication this milestone indicts
     everywhere else:
       · "no second effects-journal fixture/worktree classifier" — 61/FF-6107 walks all of `src/`.
       · "no second `R<n>` / `ADR-NNN` heading grammar" — 66/FF-6604 walks all of `src/`.
       · "no `L3` executing branch" — 53/FF-5305 walks all of `src/`.
       · "no eighth core command declaring `--strict`" — 59/FF-5911 asserts a CLOSED set over the
         registry, so `tune` declaring one fails there rather than here.
     Each is named in the ADR whose invariant it discharges; none is a gap.

     AMENDED TWICE on 2026-08-31 — at the Three Amigos pass (ADR-011, ADR-012) and again at the
     developer's feasibility pass (ADR-013). ONE row reaches a module outside the family: FF-6204
     covers two ADDITIVE exports in `src/work-doctor-controls.mjs` (ADR-011), whose `controlPathsIn`
     must come out byte-unchanged — the only evidence the split is safe in a home with 16 importers.

     WHY FF-6208 EXISTS, since it is the one row not derived from a single ADR's invariant. Four
     stage-1 controls each carried a leg asserting over "the emitted set" or "this repository's own
     corpus" — objects that do not exist until stage 2 composes them, so each control's own story
     could never clear it. Those legs moved here whole (ADR-013 §7). Each stage-1 control keeps every
     leg it can prove over its own module and over PLANTED fixtures, including its own non-vacuity;
     what moved is only the claim about the REAL tree. That claim is ADR-001 §4's acceptance
     condition, and it now has one home a reviewer can read at accept instead of four fragments.

     NOT here (these are task .feature material — observable behaviour over the real seam):
     "`aof work tune --json` lists a proposal with its evidence citations", "a proposal on a knob with
     no consumer is reported with 61's refusal verbatim", "a candidate citing one document is reported
     below the evidence floor rather than emitted", "a lane that read nothing is reported as a finding
     naming the root it walked", "a prompt-revision proposal carries no patch and says why", "an
     unresolved scope matches nothing and exits 0". -->

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-6201 | **62 carries no second acceptance rule, and no module in the family closes the registry ring.** No module under `src/work-tune/` and not `src/commands/tune.mjs` contains: any member of 61's ruling vocabulary as a code literal (the eight of `61/ADR-013` §2, read from `RULING_REFUSAL_ORDER` at its declaring module rather than retyped here); any threshold, e-value, wealth multiplier, crossing lattice or ledger sum; or any `work.loop.*` / `work.autonomous.*` key literal in code (a quoted key inside a diagnostic message is excluded by the same code-only reading 69's guard already uses). The tunable-lane verdict is obtained **only** by `invoke("work:acceptor", …)`, asserted both statically (exactly one invoke call site, with the id resolved from `getCommand` rather than spelled twice) and behaviourally (a stubbed registry that refuses the id makes the lane report a construction failure rather than fall back to a locally computed verdict — a fallback is the second rule this control exists to prevent). **The static-import ban on `src/command-core.mjs` covers the WHOLE FAMILY, not the face alone** (ADR-013 §2): a leaf closes the ring exactly as well, measured — with the three-module shape built, `import proposal.mjs` and `import command-core.mjs` resolve while `import tune.mjs` throws `ReferenceError: Cannot access 'tuneCommand' before initialization`. So a fresh `node -e 'import("<module>")'` process is run **per module in the family**, which is the only probe that sees this class (every suite reaches these modules through a warmed cache — TECH_DEBT item 26's own record) and is this milestone's ratchet on it. The applier resolver is **injected by the face** and no leaf imports the registry to obtain it. And the milestone's write set excludes `src/commands/acceptor.mjs` and every file under `src/work-acceptor/`, asserted against the story `files:` sets. | `test/arch/acd-tune-carries-no-second-rule.test.mjs` — **pending** | ADR-002, ADR-013 §2, §2a |
| FF-6202 | **A proposal's lane is the registry's answer, never a table this milestone keeps.** Lane membership is computed from `tunableSet(model)`'s keys — the arbiter's own `parameter-tuning:` edge — so a knob removed from that edge leaves the tunable lane with no edit here; no module under `src/work-tune/` contains a tunable key literal, a class→lane map, or any `kind`/`class` string keyed to a config key. The class vocabulary is a frozen set equal to 62/SPEC's four, asserted from the constant at its declaring module. **No advisory-lane proposal is reachable from any commit path**, driven behaviourally: over a fixture whose tuning edge is empty, **every** proposal lands advisory and the acceptor is not invoked at all; over a fixture declaring one key, exactly that one proposal is routed. **Routing is not committing** (ADR-012 §10): over a fixture declaring a NON-ORDINAL key on the tuning edge, that proposal is routed to the tunable lane and its refusal comes back from the acceptor — no path in `src/work-tune/` decides ordinality, and no proposal is diverted to the advisory lane on the ground that 61 would refuse it. Non-vacuity is proven **over planted fixtures** — one of each lane, from a registry declaring one key — because a lane split empty on one side is a table with extra steps; *the same claim over this repository's own corpus is `FF-6208`'s* (ADR-013 §7). | `test/arch/acd-proposal-class-is-computed.test.mjs` — **pending** | ADR-003, ADR-012 §10, ADR-013 §7 |
| FF-6203 | **No computable patch, no applier — and every applier is a command the registry answers for.** Every `applier` an emitted proposal carries resolves through the **injected** `resolveCommand` (bound to `getCommand` at the face — ADR-013 §2) to a registered command; a proposal naming an applier the registry does not know is refused its applier and says so, and no applier is ever a shell string, a file path or a prose instruction (asserted over the emitted set and by a code sweep for a spawn/exec spelling in the family, of which there must be none). A proposal with `patch: null` carries `applier: null` and a coded reason. **The converse does NOT hold and the asymmetry is asserted in that direction** (ADR-012 §9): a patch with no applier is a REACHABLE state — planted by a registry that cannot answer for the intended applier, the computed patch survives and is still rendered — while an applier with no patch fails CI, because an applier with nothing to apply is a button with no payload. No proposal carries a patch without `from`, `to` and a target. **`from` is the value in force AT THE LAYER THE PATCH WRITES, and `absent` is a value rather than a missing one** (ADR-013 §9): a proposal over a key the config does not carry — which at HEAD is *every* `work.loop.*` key and the whole model map — renders a patch whose `from` says `absent` and whose `fromSource` says so, and the shipped bundle default is asserted to appear **nowhere** as a `from` (ADR-013 §9a; no second reader). The two lanes read `from` through **two different homes on purpose** (ADR-012 §4): the tunable lane's arrives on the acceptor's report and is asserted **not** re-resolved inside `src/work-tune/`, while the advisory lane's comes from `agentModelMap` / `AGENT_MODEL_MAP_PATH` (`src/work-bundle.mjs`) over the config the face supplies. **A patch renders only when the base IN FORCE equals the base THE EVIDENCE ASSUMED, and absence is a base like any other** (ADR-014 §1): the four-row table is driven whole — absent/assumed-absent renders, absent/assumed-a-value is a moved premise with both readings named, held/assumed-that-value renders, held/assumed-otherwise is a moved premise — so the two clauses that met on every `work.loop.*` key cannot be re-litigated at build time. A proposal whose `from` equals its `to` is **absent from the emitted set** and present in `findings` as `already-in-force` (ADR-012 §8). | `test/arch/acd-no-patch-no-applier.test.mjs` — **pending** | ADR-004, ADR-012 §4, §8, §9, ADR-013 §2, §9, ADR-014 §1 |
| FF-6204 | **Provenance resolves, and neither citation grammar is written twice.** No module under `src/work-tune/` contains a citation regex, a locator pattern or a ref/id pattern of its own: both grammars are imported from their homes — **`pathCitationsIn` and `splitPathLocator` (`src/work-doctor-controls.mjs`, the two additive exports ADR-011 §1 lands)** and `qualifiedRefsIn` / `QUALIFIED_REF` (`src/declared-id.mjs`) — asserted by import **and** by the absence of any equivalent literal, so a re-home reaching only one half is caught. **`controlPathsIn`'s answers are byte-unchanged by the split**, asserted as a SELF-COMPARISON over every `## Fitness functions` register in `wiki/work` rather than against a stored count (66/FF-6604's idiom, chosen because the corpus grows), and `isControlFileName`'s test-shaped filter is asserted still applied on that path — the deliberate part stays deliberate. **An id citation is QUALIFIED ONLY** (ADR-013 §3): every id citation an emitted proposal carries matches `m?<itemRef>/<ID>`, a bare id is asserted never to be emitted as a citation, and no bare-id extractor is authored or imported. Resolution is checked at emit time — file present, and where a line is cited, the file has that line — and a planted proposal carrying one unresolvable citation appears in `findings` with the failing citation named and is **absent** from the emitted set, the two sets asserted disjoint. Demotion outranks the floor except where there is nothing to demote: a zero-citation proposal is `below-evidence-floor` (ADR-012 §12). The floor counts **distinct resolved source documents**, so an id citation and a path citation naming one document count once (ADR-012 §11) — asserted over planted candidates; *the claim that the real corpus yields such proposals is `FF-6208`'s* (ADR-013 §7). | `test/arch/acd-proposal-provenance-resolves.test.mjs` — **pending** | ADR-006, ADR-007 §4, ADR-011, ADR-012 §11, §12, ADR-013 §3, §7 |
| FF-6205 | **The corpus declares what it read against a floor, in the ONE home, and reaches every source through that source's own reader.** The read record and the floor discipline are **imported** from `src/work-audit/reads.mjs` — `readRecord`, `sweepDeclarationProblems`, `SWEEP_BASES` — and the family declares no second copy of either. Every lane is emitted with a declared read record and a floor, driven from the lane registry so **a lane added without a floor fails CI**; a lane below its floor emits `tune-ran-on-nothing` naming the lane, the root walked, the floor missed **and the scope it was measured under** (ADR-012 §13). That finding's shape is **re-authored, and asserted key-by-key against `readFinding`'s output to differ in the CODE STRING ALONE** (ADR-013 §11): `readFinding` (`src/work-audit/reads.mjs:152-159`) hardcodes `audit-ran-on-nothing`, so it cannot be reused, and 61/FF-6107 met and solved this exact case the same way. The code is also asserted absent from 61's ruling lane (61/ADR-013 §3). **The observations lane emits THREE numbers — series walked, readings counted, readings carrying an attribution — and its floor is compared against READINGS** (ADR-012 §2); at HEAD that is 7 series, 6 readings and 0 attributed, so the lane is asserted **not** to emit `tune-ran-on-nothing` at full scope and the zero third number reaches no lane code at all (ADR-012 §3). Lane floors are asserted **invariant under scope**, and a scope matching no item raises no lane finding. **The raw-path ban covers `runs/*.json` and `snapshots/*/agents.json`** — TECH_DEBT item 59's ratchet — while **the lessons lane does its OWN join and only its PARSE is mandated** to be `parseRetrospective` (ADR-013 §6): routing through `buildRecords` would drop **34 of 392** lesson sections (7 top-level `NN_story_*` items) and break slug scoping, and a lane that loses evidence to satisfy a purity rule is the failure this milestone refuses. *The path shapes named in this register and in the ADRs are documentation of what each source IS, and this leg is what refuses a build that copies one into a constant* (ADR-012 §14). **Scope resolves only through `src/work-ref-scope.mjs`** and no scope or range grammar is authored in the family. Any leg needing mutated source **reads a COPY** — tree copied to a temp directory, rewritten there, `import()`ed — and mutates no file in the working tree (ADR-013 §10). | `test/arch/acd-tune-corpus-declares-its-reads.test.mjs` — **pending** | ADR-007, ADR-008, ADR-001 §5, ADR-012 §2, §3, §13, §14, ADR-013 §6, §10, §11 |
| FF-6206 | **The distance to a live proposal is computed from the acceptor's own report — never phrased, and never re-derived.** For a tunable-lane proposal the removal text is taken from the acceptor's refusal records (`refusals[].removal`), and **no removal sentence for any member of 61's ruling vocabulary is authored under `src/work-tune/`** — a code sweep for the eight codes and for the acceptor's own removal phrases, so a copy cannot drift from the original. **A refusal and a limb naming ONE fact render ONCE** (ADR-012 §5): where the acceptor reported `not-admissible`, limb (a) appears only as the measurement beneath that entry and never as a second entry, asserted by counting entries over a knob standing behind both; a standalone limb entry appears only where the acceptor never spoke. **Limb (a) is READ from the acceptor's report, not re-derived** (ADR-013 §4): its sites, inspections and dispositions come from `executedConsumerRefusal`'s object as it arrives on the row (`admissibility`, and `details["not-admissible"].grounds`), and **no module under `src/work-tune/` builds a `{rel, code}` unit set or walks `src/`** — asserted as the absence of any source-tree walk in the family, which is what keeps 62 from becoming the fourth such walker and from disagreeing with 61 about one tree. Limb (b) is derived from **`roundsToAccept`'s own answer** — `run-attribution-absent` versus a number (ADR-012 §6) — so one accepted item whose consumed runs are all attributed **drops the limb out**. The limb set is **shrink-only**, asserted by planting a closure for each limb; **`unknown` and not-reported are DIFFERENT answers, and both are driven** (ADR-014 §3): over a registry declaring no tunable key the acceptor is never invoked, so no grounds object exists and limb (a) is `unknown` — the question could not be asked — while a limb that was asked and does not stand is simply absent; a limb whose removal cannot be computed is likewise `unknown` and never zero. The **one** acceptor report a run obtains supplies the grounds for advisory rows too, asserted as a single invocation per run. *That the set is non-empty over this repository, and that every emitted proposal carries a distance, are `FF-6208`'s* (ADR-013 §7). | `test/arch/acd-distance-to-live-is-computed.test.mjs` — **pending** | ADR-001 §2a, §3, ADR-012 §5, §6, ADR-013 §4, §7, ADR-014 §3 |
| FF-6207 | **`tune` is a read face — no write lands inside the workspace tree, and no second commit path exists.** No write **inside the workspace tree**, proven the only honest way (53/FF-5306's idiom, `test/arch/acd-loop-l1-read-only.test.mjs:7-23`): snapshot the fixture tree's file list **and every byte**, run the command over it in both faces, assert both identical — a static grep cannot see where a path variable resolves. **The invariant is workspace-scoped because two writes outside it are REACHABLE and are named rather than excluded quietly** (ADR-013 §8): `reportDegrade`'s mesh-log append, reached from `readLatestSnapshot` and `readRuns` on an unparseable record — a trigger 62/00's task 02 contracts by name — and `censusSnapshot`'s `mkdtemp`/`copyFile`/journal-open inside `work:acceptor`, which is 61's own read discipline. Both are asserted to land **outside** the workspace and to leave it byte-identical; the family itself opens no journal. **The narrowing is safe only because nothing outside carries state back in, so that is asserted rather than assumed** (ADR-014 §2): the command is run TWICE over one tree and nothing accumulates between the runs, inside the tree or outside it — no byte written outside the workspace changes the second run's output. The command declares **no `--strict` and no `--dry-run`**, and `--json` and the human face render from **one** object. **The exit code is asserted as a two-sided rule** (ADR-012 §7): every refusal, finding, demotion, below-floor candidate and empty result exits **0** — driven over all of them, so no findings gate arrives by the back door — while an **unreachable `work:acceptor`** is a failed run, reported first in `--json` as `acceptor-unreachable` and then exited **non-zero**, driven through a stubbed registry. `tune` is present in `BOARD_DEFERRED` with `acceptor`, `audit` and `grade`; the bijection probe's argv for it is the bare read; and `WORK_IDS` in `test/command-core-contract.test.mjs` gains `work:tune`, which is a hand-kept census and the one non-derived registration edit (ADR-013 §5). The suite is registered: its own labelled block in `scripts/test.mjs` imports **and spreads** every 62 suite. | `test/arch/acd-tune-writes-nothing.test.mjs` — **pending** | ADR-005, ADR-009 §5, §6, ADR-012 §7, ADR-013 §5, §8, ADR-014 §2 |
| FF-6208 | **The pass over THIS REPOSITORY'S OWN CORPUS says something, and says it completely.** ADR-001 §4's non-vacuity condition is a milestone-level acceptance condition, and this is its one home — four stage-1 controls each holding a fragment of it was four partial claims nobody read together (ADR-013 §7). Driven over the real work tree, not a fixture: **at least one proposal is emitted**; **each lane is non-empty** (at least one tunable and one advisory); **every** emitted proposal cites **at least two distinct resolved source documents**, counted after normalisation; **every** citation on **every** emitted proposal resolves to an existing target; **every** emitted proposal carries a distance; and the prerequisite limb set is **non-empty** at HEAD. Each failure names what was missing rather than reporting a count, because the point of this control is to be readable at accept by someone deciding whether the milestone did anything. It runs over the corpus as it stands and holds no expected figure: a stored count would go stale on the next retrospective, which is the corpus this milestone reads. | `test/arch/acd-tune-is-non-vacuous-over-this-repo.test.mjs` — **pending** | ADR-001 §4, ADR-013 §7 |
| FF-6209 | **Formation PARTITIONS its input, breaks ties on content, and holds no similarity constant.** ADR-007 §4's floor counts distinct source documents, so a cluster that carried a representative sample instead of every contributing source would make the floor unmeasurable — the control therefore asserts a **partition** (ADR-014 §4) two ways — as membership (every record on exactly one candidate) and as arithmetic (the cluster sizes sum to the records handed in) — so neither a dropped record nor a double-carried one passes; overlap is refused because it lets one observation stand behind two proposals, upstream of the only gate that would notice. **The tie-break is a function of CONTENT, never of ARRIVAL** (ADR-014 §5): no input index, position or iteration order is reachable from it, and a shuffled input yields byte-identical candidates. The similarity criterion is the build's (ADR-013 §1a) and this control does not test it; what it does refuse is a criterion expressed as a **magic constant**, and it requires the parameter to **declare an ordered range** (ADR-014 §6) — a loosest and a tightest admitted value, with a coded refusal outside it — which makes the abstention reviewable without banning a categorical rule, since *how many meta fields must agree* is itself scalar and ordered. `src/work-tune/formation.mjs` is **pure**: records handed in, no filesystem, no clock, no argv, and no static import of `src/command-core.mjs` (FF-6201's family-wide ban covers it). A candidate emerges with its sources, its citations and a **bare ref** as its target — or `target: null`, still a candidate (ADR-014 §7) — stating no value, layer or `from`, with no typed target vocabulary to be shared across two stage-1 stories. **Every lane 62/00's registry declares reaches formation and none is rejected** (ADR-014 §8), asserted from that registry rather than from a literal three, so a fourth lane is covered with no edit and the leg cannot go vacuous. Formation attaches **no** lane, patch, applier, verdict or distance — those are other stories' answers, and a formation module that guessed one would be the second home this milestone refuses everywhere else. | `test/arch/acd-candidate-formation-is-lossless.test.mjs` — **pending** | ADR-013 §1, §1a, ADR-007 §4, ADR-014 §4–§8 |

---

## Story partition

Authored at refine and **re-authored at the developer's feasibility pass**, per ADR-010 as amended by
ADR-013. The landing order is **{62/00 ‖ 62/01 ‖ 62/02 ‖ 62/03 ‖ 62/05} → 62/04** — two stages, **five**
stage-1 stories with no edge between them, and one convergence: the face is the only module that
composes the five leaves, invokes `work:acceptor` and touches the registry.

**Stage 1 is edge-free at the CONTROL level as well as the module level** (ADR-013 §7), which was not
true of the first draft: every corpus-wide claim now lives in `FF-6208`, which 62/04 owns, so no
stage-1 story lands a control it cannot clear.

**The write set is the union of these `files:` blocks**, and it includes the 13 test files the stories
create — 8 arch controls and 5 `test/tune-*.test.mjs` suites. ADR-010 §2's table lists only CONTENDED
files, and ADR-013 §5 records that the distinction is what hid `test/command-core-contract.test.mjs`.

- **62/00** — the corpus and its floor: `src/work-tune/corpus.mjs`
- **62/01** — the proposal, its lane and its patch: `src/work-tune/proposal.mjs`
- **62/02** — provenance that resolves: `src/work-tune/provenance.mjs`, plus two additive exports
  in `src/work-doctor-controls.mjs` (ADR-011 §3, the milestone's one sole-writer exception)
- **62/05** — candidate formation: `src/work-tune/formation.mjs` (ADR-013 §1; numbered last, built at
  stage 1 — see §1b)
- **62/03** — the distance to a live proposal: `src/work-tune/distance.mjs`
- **62/04** — the tuner's face: `src/commands/tune.mjs`, `src/command-core.mjs`

### 62/00 · `00_story_the-corpus-and-its-floor` — stage 1

**Subject.** Three declared lanes over the material that actually exists — 392 lesson sections, 61 run
records, 8 observability snapshots — each read through the home that already owns its source, each
declaring what it read against a floor, and a lane that read nothing reported as a finding rather than
as a zero.

- **files / reads:** the story's own `STORY.md` frontmatter is the single home for both sets;
  they are not restated here, because this pass has already had to edit two copies twice.
- **depends:** —

### 62/01 · `01_story_the-proposal-its-lane-and-its-patch` — stage 1

**Subject.** The proposal object: a frozen shape, a lane computed from the registry's own tuning edge
rather than a table, a patch only where a complete before→after is computable, and an applier only where
the command registry answers for it.

- **files / reads:** the story's own `STORY.md` frontmatter is the single home for both sets;
  they are not restated here, because this pass has already had to edit two copies twice.
- **depends:** —

### 62/02 · `02_story_provenance-that-resolves` — stage 1

**Subject.** Which traces, which runs, which findings produced this proposal — as citations that are
checked against disk at emit time, through the two grammars this repository already owns, with an
unresolvable citation demoting its proposal to a finding.

- **files / reads:** the story's own `STORY.md` frontmatter is the single home for both sets;
  they are not restated here, because this pass has already had to edit two copies twice.
- **depends:** —

### 62/03 · `03_story_the-distance-to-a-live-proposal` — stage 1

**Subject.** The milestone's headline: for every proposal, what stands between it and a commit — 61's
own refusal removals for the tunable lane, and 62's two measured prerequisite limbs — each computed from
a probe over the tree, shrink-only, and never rendered as a phrase.

- **files / reads:** the story's own `STORY.md` frontmatter is the single home for both sets;
  they are not restated here, because this pass has already had to edit two copies twice.
- **depends:** —

### 62/04 · `04_story_the-tuners-face` — stage 2

**Subject.** One registered command whose bare face is a read: it composes the four leaves, obtains the
tunable lane's verdict by invoking `work:acceptor` through the registry, renders one object on both
faces, and writes nothing anywhere.

- **files / reads:** the story's own `STORY.md` frontmatter is the single home for both sets;
  they are not restated here, because this pass has already had to edit two copies twice.
- **depends:** 62/00, 62/01, 62/02, 62/03, 62/05

### 62/05 · `05_story_candidate-formation` — stage 1

**Subject.** The milestone's central deliverable, and the one the first partition left unassigned: the
rule that turns lane records into candidates. It clusters, counts the sources behind each cluster, and
attaches the citations and the target the downstream leaves need. Pure over records handed in.

- **files / reads:** the story's own `STORY.md` frontmatter is the single home for both sets;
  they are not restated here, because this pass has already had to edit two copies twice.
- **depends:** —
