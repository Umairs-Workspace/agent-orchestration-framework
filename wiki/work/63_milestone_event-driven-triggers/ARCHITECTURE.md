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
# 63 · Event-driven triggers — Architecture

## Context this milestone inherits

Nine facts arrive from upstream items and are not re-litigated here. Every figure below was measured
at HEAD on 2026-09-01 against the codebase graph built that day (14,091 nodes / 34,497 edges, egress
none, `builtAt 2026-09-01T19:33:21Z`, reported `unchanged` on a rebuild at this decision point).

**From 08 (done).** Every observable is a registered command in one in-process registry
(`src/command-core.mjs`, 141 dependents / 86 imports — the registry god-node), and both faces couple
through it. A command that reaches another command does so through `invoke`, deferred behind a dynamic
import so the registry ring is not closed at module scope — `src/commands/loop.mjs:147-151` is the
worked example, and TECH_DEBT item 26 is what that comment is avoiding.

**From 53 (done — the enabler).** `aof work loop <driver|NN-MM> [--level L1|L2|L3] [--cap N]
[--review-claims JSON] [--resume] [--dry-run] [--json]` is registered as `work:loop`
(`src/commands/loop.mjs:1729-1777`). Its scope forms are `LOOP_SCOPE_FORMS` — driver `^\d+$`, range
`^\d+-\d+$` (`src/work-loop.mjs:15-18`) — a story-shaped scope is a coded refusal, never a silent
whole-stream walk (53/ADR-003). Default level is L2. **53/ADR-005 is the fact this whole milestone
turns on: the registered `run()` is a promptly-returning PROBE, and the real loop lives behind
`cli.launch`.** `src/work-loop.mjs` **imports nothing by contract** (53's `work-loop-determinism`) —
confirmed at source; the single graph edge to `loop-progress.mjs` is extracted from the module's own
header COMMENT, which quotes the import that was removed, and is a graph artifact rather than a
dependency.

**From 55 (done — the bound).** L3 is UNLOCKED: `LOOP_LEVELS = ["L1","L2","L3"]`,
`LOCKED_LOOP_LEVELS = {}` (`src/work-loop.mjs:20-22`). `resolveLoopLevelGate`
(`src/work-loop.mjs:447-463`) is the ONE home for admission, and L3 needs BOTH halves — Loop-Ready
`score === 100 && clears === "L3"`, and a groundedness report with zero failing components.
`src/commands/loop.mjs:741-748` already gathers both at the command boundary through `invoke` and
refuses before entering the loop. **55/FF-5508 holds the whole of `src/**`: no config key, env var or
flag admits L3.** The frozen set (55/ADR-004) compiles a declaration to enforcement points aof already
owns; three of its four points compile and the fourth does not.

**From 55, again — the OPEN GAP this milestone closes.** `FROZEN_ENFORCEMENT_POINTS` has FOUR members
but `COMPILED_POINTS = FROZEN_ENFORCEMENT_POINTS.slice(0, 3)` (`src/frozen-set.mjs:15-22`), so *"the
worker launch envelope"* is **declared and deferred**. Member `gate-order`
(`.aof/frozen-set.jsonc:43-49`, `rule: { "argument": "--aof-gate-order" }`) lands in
`compileFrozenSet(...).deferred`. Two delivered records carry the same discharge condition verbatim —
`wiki/work/55_milestone_anchors-and-frozen-set/OUTCOME.md:86-90` and
`.../stories/04_story_the-frozen-set-compiled/OUTCOME.md:48-54`.

**From 38 and 42 (done — the substrate).** A mesh assignment today IS a session-as-orchestrator:
`assignmentDirectiveCommand(phase, itemRef)` (`src/mesh-assignment-directive.mjs:59`) maps
`ASSIGNMENT_PHASES = ["refine","continue","verify","autonomous"]` to a **slash-command string typed
into an interactive `claude` PTY** (`/aof:refine <ref> --autonomous`, `/aof:autonomous <ref>`). The
worker reads that string at `src/mesh-worker-execution.mjs:1333` and threads it to
`brief.command`; a directive carrying no command *"degrades to null, never a crash — the interactive
session below is still spawned, simply with nothing typed into it"* (`:1331-1333`).

**The worker launch envelope is exactly ONE function.** `resolveInteractiveDriverLaunch`
(`src/agent-session-driver.mjs:661`) builds the argv at `:689` and scrubs the env below it.
Graph-derived, actual and not inferred: `src/agent-session-driver.mjs` has **exactly two `src/`
dependents** — `src/commands/drive.mjs` (the local loop path) and `src/mesh-worker-execution.mjs` (the
mesh path) — out of 23 total, the other 21 being test files. One enforcement point, two callers, zero
edits required at either.

**From 52 and 58 (done — the cadence grammar, and a hard constraint).** `cadenceField`
(`src/work-loops.mjs:450-469`) already parses `periodic:<n>{ms|s|m|h|d}` and `event:<trigger>` and
carries the comparison operand on the parsed field (`ms`, or `scopeRank` from the private
`SCOPE_RANKS`). `EVENT_TRIGGERS` are **scope ordinals** — a containment relation — **not external
signal sources**, so a trigger's SOURCE is a different axis from its cadence. Milestone 52's delivered
`00_frozen-vocabulary.feature:22` requires *"no twelfth set is exported"* from `src/work-loops.mjs`,
and a delivered acceptance criterion is immutable.

**From 55/ADR-005 (done).** `work:feedback` captures RAW ONLY and refuses any classification key at
capture with `feedback-classification-deferred` (`src/commands/feedback.mjs:28,47`).

**From 61, 62 and 66 (done).** `.aof/` declarations are the shipped idiom: `.aof/frozen-set.jsonc` is a
bundle **asset** (`src/bundle/bundle.json:22` → target `.aof/frozen-set.jsonc`, hashed in
`src/bundle/manifest.json`), and `.aof/loops/*.md` ship the same way. `src/loop-bounds.mjs` (zero
imports, 11 `src/` dependents) is the one home for `work.loop.*`; `src/work-ref-scope.mjs` (zero
imports, 5 dependents) is the item-scope resolver, distinct from `LOOP_SCOPE_FORMS`. 66/FF-6604
refuses a second copy of the id/heading grammar anywhere in `src/`.

**Recall, acknowledged.** The role-scoped recall surfaced five near-misses; each is honoured or
departed from on the record. **53/ADR-016** (*the autonomous door enters the HUMAN launcher without
`--json`; the machine face stays the frozen probe*) — **honoured**: 63's face is a machine face and it
never enters a launcher (ADR-003). **53/ADR-005** — **honoured**, and it is the load-bearing premise of
ADR-003. **53/ADR-006** (*L3 LOCKED, a frozen two-member vocabulary*) — its **fact** is consciously
departed from, because 55/ADR-006 shipped the unlock; its **rule** — no config key, env var or flag
admits L3 — is honoured verbatim by ADR-004 and is the reason a trigger declaration is not one.
**52/ADR-007** (*the five checks are pure and land ONLY in `work:loops validate`*) — **honoured**: 63
adds no check to `validate` or `doctor`. **62/ADR-005** (*`aof work tune` WRITES NOTHING and raises no
effect*) — **honoured and extended**: ADR-003 makes the same rule structural for `work:trigger`.

---

## ADR-001: A trigger is a DECLARATION plus a RESOLUTION, and the resolution's whole output is one `work:loop` input — the trigger layer is a CALLER, not a coordinator

**Status:** Accepted
**Date:** 2026-09-01

**Context.** 63/SPEC §Objective states the shape in one sentence: *"a trigger just calls the CLI… The
mesh is the execution substrate; the trigger is a caller, not a coordinator."* The failure mode is
easy to name and easy to build by accident: a trigger layer that grows a scheduler, then a dispatcher,
then a policy for what to do when two triggers fire at once — which is 63/SPEC §Out of scope's
*"fleet-level orchestration… its own arc"* arriving one noun at a time. Every clause in this milestone
that looks restrictive exists to keep that from happening.

**Decision.**

**1 — A trigger is two things and no third.** A **declaration** (ADR-002) says which signal may wake
which scope at which level. A **resolution** turns one signal into one object: `{ scope, level }`, the
input `work:loop` already declares (`src/commands/loop.mjs:1731-1740`), plus the exact argv that
carries it. That object is the trigger layer's **whole output**.

**2 — The four things the trigger layer NEVER does.** It never spawns or execs a process; it never
drives a phase; it never decides a gate; and it never composes a slash command. Those are, in order,
`work:loop`'s launcher, `work:drive-<phase>`'s job (53/ADR-002), `resolveLoopLevelGate`'s
(`src/work-loop.mjs:447`) and the prompt layer's. A trigger that did any of them would be a
coordinator with a different noun, and FF-6301 is the control that says so.

**3 — "Resolves to `aof work loop <ref>`" is read literally.** 63/SPEC §Scope's first bullet names
four sources and one destination. The destination is one command with one input shape. There is no
per-source output shape, no trigger-specific loop entry and no second loop face — a source's whole job
is to answer *which scope, at which level*, and to be refused when it cannot.

**4 — The non-vacuity clause, as an acceptance condition.** 63 may not be accepted while the shipped
`.aof/triggers.jsonc` resolves nothing. At accept, **every declared source must have at least one
declared trigger that resolves to a well-formed `work:loop` input**, and every declared trigger's scope
must resolve through `LOOP_SCOPE_FORMS`. Green tests over fixtures do not discharge this: a trigger
vocabulary with no member that resolves is a declaration nobody can act on, which is the species this
repository indicts by name. FF-6308 is its one home, at stage 2, so no stage-1 story lands a control it
cannot clear (62/ADR-013 §7's lesson, adopted).

**Alternatives considered.**

- *A trigger emits a phase directive rather than a loop input* — **rejected**: it re-creates the
  session-as-coordinator one layer down, and 53/ADR-002 already owns the per-phase family.
- *A trigger carries its own cap, model or review-claims* — **rejected**: `work:loop` already declares
  those and `src/loop-bounds.mjs` is the one home for the bound. A trigger that carried a cap would be
  the second home, and the loop's own flags remain available to the caller.
- *One resolution shape per source (a "cron trigger", a "CI trigger")* — **rejected** on §3: four
  shapes converging on one command is one shape with four producers, and the extra typing buys a
  vocabulary that must be kept in step with `work:loop`'s input.

**Invariant.** No module under `src/work-trigger/` and not `src/commands/trigger.mjs` spawns a process,
drives a phase, decides a gate or composes a slash-command string; the resolution's output is a
`work:loop` input object and its argv, and nothing else; and over this repository's own declaration the
resolved set is non-empty. (Enforced by `FF-6301`, `FF-6308`.)

---

## ADR-002: The declaration is DATA at `.aof/triggers.jsonc`, shipped as a bundle asset with ONE compiler; the cadence grammar is IMPORTED through one additive FUNCTION export, and the SOURCE vocabulary is 63's own

**Status:** Accepted
**Date:** 2026-09-01

**Context.** This repository has settled the shape of a reviewable declaration three times — 52's
`.aof/loops/*.md`, 55's `.aof/frozen-set.jsonc`, 61's criterion record — and 53/ADR-012 fixed the
delivery rule: `src/bundle/` is the single source, the installed `.aof/` copy is an artifact aof
dogfoods, *"so the registry a consumer runs is the registry aof ships"*. Only `frozen-set.jsonc` and
`loops/*.md` are actually bundle ASSETS today (`src/bundle/bundle.json:22,27-43`); 61's
`.aof/acceptor-criterion.jsonc` is created on demand and ships no copy, which is a real difference from
the idiom and is not copied here.

The second half is a hard constraint. `cadenceField` (`src/work-loops.mjs:450-469`) is **private**, and
52's delivered `00_frozen-vocabulary.feature:22` freezes the loader at eleven exported sets. Copying
the cadence regex into a trigger module is the species 66/FF-6604 and TECH_DEBT item 68 exist to
refuse; exporting a twelfth SET would break a delivered criterion.

**Decision.**

**1 — `.aof/triggers.jsonc`, with `src/bundle/triggers.jsonc` as the single source.** A new bundle
asset member, targeted at `.aof/triggers.jsonc`, installed by `aof work update` through the existing
content-hashed, drift-protected path. A member declares `{ id, protects, source, scope, level }` and,
optionally, `cadence`. `protects` is 55/ADR-004 §1's discipline carried over: a declaration says what
it is for, not what it matches.

**2 — One compiler, `src/work-trigger/declaration.mjs`, and it is PURE.** Declaration in, compiled
triggers or one coded refusal out — `compileFrozenSet`'s shape (`src/frozen-set.mjs:129`), including
55/ADR-004 §4's rule that **a member that does not compile is a refusal with a code, never a warning**.
A trigger set with a silently-skipped member is worse than none, because it reports as armed.

**3 — The cadence grammar is IMPORTED, through ONE additive FUNCTION export.** `src/work-loops.mjs`
gains `parseCadence` — the existing private `cadenceField` re-expressed under a public name, its
answers byte-unchanged — and no set is added. **This is a precedent already set in this tree one
milestone ago**: 62/04 added `loopPointersIn`, a function, and the loader's export census was widened
by exactly one name while the eleven-SET claim at `:22` stayed untouched
(`test/work-loops-record.test.mjs:1119-1140` records the reading in full). 63/00 repeats that move
line-for-line, and it is the milestone's **one sole-writer carve-out** into a module it does not own.

**3a — Why the cadence is worth importing at all, rather than dropped.** Because it is *checkable*. A
trigger may point at a loop-registry entry (`loop:<id>`); when it does and both declare a cadence, the
two are compared on the operands `parseCadence` already carries (`ms` for a duration, `scopeRank` for
an ordinal — 58/ADR-002's axis), and a trigger that fires faster than the loop it wakes declares is a
computable contradiction rather than a matter of taste. A cadence aof merely stored would not be worth
the import; a cadence aof can contradict is.

**4 — The SOURCE vocabulary is 63's own and lives in `src/work-trigger/declaration.mjs`.** It is not a
new export in `src/work-loops.mjs`, not a widening of `EVENT_TRIGGERS`, and not a set anywhere in that
loader. `EVENT_TRIGGERS` are scope ordinals in a containment relation; a source is *where the signal
came from*. Merging them would give the loop registry a vocabulary about the outside world, which is
exactly what the delivered criterion refuses and what the two axes were separated to prevent.

**Alternatives considered.**

- *Triggers as a section of `.aof/aof.config.json`* — **rejected**: a config key is the shape 55/ADR-006
  refuses for anything that governs autonomy, and it would put the declaration outside the
  drift-protected, hash-checked path the other declarations already use.
- *Triggers as `.aof/loops/*.md` records* — **rejected**: 52/ADR's registry is a graph of loops, actors
  and anchors, and a trigger is none of those. Adding a sixth node kind widens a frozen taxonomy for an
  edge nothing declares, which 58/ADR-003 §6 and 59/ADR-001 §3 both refused before.
- *Copy the cadence regex into the trigger compiler so the leaf stays import-free* — **rejected** by
  66/FF-6604's precedent and item 68's species; the third copy is where a species becomes a habit.
- *Export `CADENCE_SOURCES` from `src/work-loops.mjs`* — **rejected**: a twelfth set, and a delivered
  acceptance criterion is immutable.

**Invariant.** The declaration is data under `.aof/`, shipped from `src/bundle/` and byte-identical to
its bundled source; exactly one module compiles it and a member that does not compile is a coded
refusal; no cadence grammar is authored under `src/work-trigger/`; `src/work-loops.mjs` exports eleven
frozen sets and one additional FUNCTION; and no trigger source vocabulary is exported from that loader.
(Enforced by `FF-6302`.)

---

## ADR-003: aof ships NO clock and NO receiver — and the face therefore RESOLVES rather than launches, because 53/ADR-005 already put the loop's only launcher behind `cli.launch`

**Status:** Accepted
**Date:** 2026-09-01

**Context.** *"A trigger just calls the CLI"* reads, on first pass, as an instruction to build
something that calls. The reason it is not is structural rather than cautious. 53/ADR-005 made
`work:loop`'s registered `run()` a **promptly-returning probe** and put the loop body behind
`cli.launch`. So `invoke("work:loop", …)` from another command returns a probe and drives nothing —
**there is no in-process path by which a second registered command can run the loop.** A trigger face
that wanted to launch would have to spawn a process or open a second door onto `runLoopBody`; the first
is a scheduler, the second is a second launcher for one body.

63/SPEC §Out of scope closes the other side: fleet-level orchestration is *"its own arc"*. A clock in
`src/` is a supervisor with one entry in its table.

**Decision.**

**1 — aof declares the cadence, validates it, and answers when called. It never schedules.** No timer,
no daemon, no polling loop, no webhook listener and no inbound HTTP route ships in this milestone. The
caller is the OS scheduler, the CI job, or the mesh dispatch that already exists.

**2 — `aof work trigger [trigger] [--signal JSON] [--json]` is a READ face.** It writes no file,
mutates no config, raises no event and declares no `cli.launch`. It emits the resolution — the
`work:loop` input and the argv that carries it — and the caller runs that argv. This is 62/ADR-005 §1's
rule, surfaced at recall and adopted whole: *not "writes only under a flag": no write path exists to be
flagged.* And, as there, **there is no `--dry-run`**, because a command with no wet path has nothing to
withhold.

**3 — Which makes the milestone's real shape legible, and it should be said plainly.** Three of the
four sources resolve for a caller that already exists outside aof. **The mesh is the one source with an
executor inside aof**, and that is why ADR-006 is where the milestone's live wake actually lands. A
document that implied four equal wake paths would be describing a fleet supervisor nobody built.

**4 — The precedent for the caller side is already shipped.** 53/ADR-008 reduced `autonomous.md` to *a
thin shell-out* to `aof work loop`. Shelling out is the sanctioned way to reach the loop from outside
it, and a crontab line, a CI step and a prompt are the same kind of caller.

**Alternatives considered.**

- *A `--exec` flag that runs the resolved argv* — **rejected** on §2: it is a second launcher for one
  body, and the first flag on a read face is how a read face stops being one.
- *A `work:trigger` `cli.launch` that enters `runLoopBody` directly* — **rejected**: it either statically
  imports a registered command module (closing the registry ring, a measured failure in this tree) or
  duplicates the launcher, and 53 deliberately left exactly one.
- *A long-lived `aof work trigger serve` watching the clock* — **rejected by 63/SPEC §Out of scope**
  verbatim, and it would need a supervisor, a backoff policy and a concurrency rule before it did
  anything useful.
- *A webhook receiver for the CI source* — **rejected**: the CI job is already a process that can run a
  command; an inbound listener adds an authenticated network surface to solve a problem an outbound
  call does not have.

**Invariant.** No timer, interval, cron expression evaluator, listening socket or HTTP server is
reachable from `src/commands/trigger.mjs` or any module under `src/work-trigger/`; the family performs
no filesystem write, config write or `appendEvent`; `work:trigger` declares no `cli.launch`, no
`--strict` and no `--dry-run`; and `--json` and the human face render one object.
(Enforced by `FF-6303`, `FF-6301`.)

---

## ADR-004: The declared level is a CEILING REQUEST, never an admission — resolved at every fire through the ONE gate home, never cached, and never silently downgraded

**Status:** Accepted
**Date:** 2026-09-01

**Context.** 63/SPEC §Objective is unusually direct about why this milestone waited on 55: *"A loop a
human started is bounded by the human watching it. A loop a webhook started is bounded only by what the
machinery will refuse."* The temptation a declaration file creates is precise and it has been refused
twice already in this arc: 53/ADR-006 rejected `work.loop.allowL3` outright — *"it makes the most
dangerous rung reachable by editing a JSON file, with no diff a reviewer sees"* — and 55/ADR-006
restated the rejection *"because this is the milestone where the temptation actually arrives"*. It
arrives again here, wearing a better disguise: a `level: "L3"` line in a declaration is not spelled like
a config key, but if it admitted anything it would be one.

**Decision.**

**1 — A declared level is a CEILING REQUEST. Admission is `resolveLoopLevelGate`'s and nobody else's.**
`src/work-loop.mjs:447-463` stays the one home. 63 builds no second gate, no threshold, no score
arithmetic and no groundedness reading. `src/work-trigger/level.mjs` **imports** `resolveLoopLevel` and
`resolveLoopLevelGate` and is **handed** the two gate facts — the doctor's `loopReady` and the
groundedness report — by the face, exactly as `src/commands/loop.mjs:741-748` gathers them through
`invoke`. That keeps the leaf pure and honours 53/ADR-007's rule that gate facts are gathered at the
command boundary.

**2 — Resolution happens at FIRE time, on every fire, and is never cached from declaration time.** A
declaration is a request made once; a workspace's anchors, its Loop-Ready score and its groundedness
all move. A cached admission is a stale permission, and an unattended run is where a stale permission
does its damage. Nothing in the compiled trigger carries an admission verdict.

**3 — There is NO silent downgrade to L2.** This is the clause that matters most and it is the one a
reasonable implementer gets wrong. `resolveLoopLevel` defaults an absent level to L2; a *declared* level
that fails its gate is a different case entirely. **A trigger declaring L3 over a workspace that does
not pass the gate is REFUSED, and the refusal names the failing half by name** — the score with its
failing check ids, or the components that are `self-referential`/`stale` (55/ADR-006 §3). An unattended
run at a level nobody declared is the failure this milestone exists to prevent; quietly running it at
L2 would be that failure with a friendly face.

**4 — The trigger's answer is a PRE-FLIGHT, not an admission, and the surface says so.**
`src/commands/loop.mjs:741-748` gates again at fire time, so the authority is unchanged and unreachable
from here. What the trigger buys is that an unattended caller learns *before* the launch, in a machine
-readable refusal, that the level it declared is not available — instead of discovering it in a log
nobody is watching.

**5 — The declaration file is NOT the config key 55/FF-5508 bans.** It admits nothing; it *requests*.
The distinction is only true if §1 through §3 hold, which is why FF-6304 asserts them together.
**55/FF-5508 already walks the whole of `src/**` for the config/env/flag ban, so this register does not
restate it** — it is named here and discharged there.

**Alternatives considered.**

- *Resolve the level when the declaration is compiled and store the verdict* — **rejected** on §2: a
  compiled admission is a permission with no expiry.
- *Downgrade a refused L3 to L2 and run* — **rejected** on §3: the caller asked for an unattended run
  and would get an attended one with nobody attending.
- *Let the trigger skip the pre-flight and rely on `work:loop`'s own gate* — **rejected**: the refusal
  would arrive inside a launched process whose output an unattended caller does not read, and the
  declared level would never be checkable at review time.
- *A per-trigger override that admits L3 for "trusted" sources* — **rejected** by 55/ADR-006 §2 and by
  53/ADR-006; a trust list is a config key with a nicer name.

**Invariant.** `src/work-trigger/level.mjs` contains no score threshold, no groundedness predicate and
no level literal beyond those imported from `src/work-loop.mjs`; the gate facts are handed in and never
read from disk by the leaf; no compiled trigger carries an admission verdict; a declared level that
fails its gate is a coded refusal naming the failing half, and no code path substitutes a lower level
for a refused one. (Enforced by `FF-6304`.)

---

## ADR-005: The worker launch envelope COMPILES — the fourth enforcement point becomes real and what it compiles to is the UNATTENDED LAUNCH SHAPE ITSELF; attended launches are byte-unchanged, and 55/04's delivered feature is untouched

**Status:** Accepted
**Date:** 2026-09-01

**Supersedes, in record only:** 55/04's delivered scenario row *"the worker launch envelope | accepted
and not yet compiled"*
(`wiki/work/55_milestone_anchors-and-frozen-set/stories/04_story_the-frozen-set-compiled/tasks/00_the-declaration.feature:44`).
**That file is NOT edited.** 63 is the accepting item that records the supersession — 53/ADR-014's
precedent exactly, where milestone 15's `.feature` stayed untouched and the pinning suite widened by
the minimum, owned by one named story.

**Context.** 63/SPEC §Scope's third bullet is *"Bounding by the frozen set — what an unattended trigger
may touch is the declared capability grant, enforced at the boundary, not a convention."* The boundary
for an unattended run is its launch, and the launch has one function. The fourth enforcement point has
had a spelling and no enforcement since 55 shipped, recorded honestly in two delivered OUTCOMEs with an
identical discharge condition. This milestone is the one that owed it.

The declared rule is `{ "argument": "--aof-gate-order" }` — a spelling with **no referent**. It is not a
`claude` flag; appending it to the session argv would break every worker launch. So the first question
is not *how* to compile it but *what it means*, and the answer comes from what the member protects:
*"the continue, validate, doctor, grade and verify gate order"* — which is `GATE_ORDER`
(`src/work-loop.mjs:67-73`), a declaration walked in code by `commands/loop.mjs`'s gate block. **A
session cannot skip a gate the loop runs. What can skip it is a launch that is a session instead of a
loop.** That is the thing the envelope can actually refuse.

**Decision.**

**1 — The fourth point compiles, and its compiled artifact is the UNATTENDED LAUNCH SHAPE.**
`COMPILED_POINTS` becomes all four; `gate-order`'s rule is re-declared from the referent-free
`{ "argument": "--aof-gate-order" }` to a declared launch — the program and the leading argv an
unattended run may be. `compileFrozenSet(...)` gains an `unattendedLaunch` output beside `hooks`,
`permissions` and `agentScopes`, and `gate-order` moves from `deferred` to `installed`. Changing a
member's rule from a spelling with no referent to one with a referent is precisely the diff a
reviewable declaration exists to make visible (55/ADR-004 §1).

**2 — `resolveInteractiveDriverLaunch` gains ONE branch: an UNATTENDED launch resolves the declared
shape, and anything else is a coded refusal.** Asked for an unattended launch, the envelope returns the
compiled program and argv; asked for an unattended launch that does not match the declaration, it
refuses with a code rather than launching (55/ADR-004 §4). **Every attended launch — every human
session, every `work:drive-<phase>` session, all three single-phase mesh directives — resolves
byte-identically to HEAD**, argv and scrubbed env alike. That byte-identity is not a nicety: this
function is the sole producer of the NEEDS_INPUT sentinel and of the OTel and cache-key decisions
milestones 68 and 70 landed in it, and it has 23 dependents.

**3 — Why this is enforcement and not decoration.** The grant is mechanical: an unattended run may only
be the program the frozen set declares, so the gate order it walks is `GATE_ORDER` in code rather than
an order a prompt describes. And the *other* three points already travel: `.claude/settings.json` and
`.aof/frozen-set.jsonc` are both tracked in git, so a minted worker worktree carries the compiled
denials and the declaration with the clone. The fourth point was the only one that did not reach an
unattended run, which is why it is the one this milestone owed.

**4 — Two delivered test pins widen, by exactly their deferral lines, owned by 63/02.** `deferred`
becomes empty and `installed` gains `gate-order`, so the two `deepEqual`s that pin today's deferral —
one in 55/04's behavioural suite, one in its arch control — change, and so does the `installed`
exclusion beside the first. Tests are code and may change; the `.feature` may not. **A third citation is
NOT a pin and must not be edited**: the `REMAINING` table in the framework-stops-shipping guard
(`test/framework-stops-shipping-guard.test.mjs:48-54`) asserts each member's `[id, enforcementPoint]`
pair, and both stay exactly as they are after compilation. Correcting that reading is part of this ADR
because a story briefed to "widen three pins" would have edited a control that was already true.

**5 — What the envelope does NOT gain.** No per-launch `--settings` document, no `--disallowedTools`
list, no system-prompt rule. All three are reachable (`claude --settings` takes inline JSON), and all
three would put a **second** copy of the permission-denial rule shape at a second carrier while the
first is already installed and travelling with the clone. **Recorded as the shape to reuse** if a future
milestone needs a per-launch grant for a worktree aof did not write — not as a gap, because nothing
today is unbounded by it.

**Alternatives considered.**

- *Compile `gate-order` to `--append-system-prompt` prose describing the order* — **rejected**: a prose
  lock, which 53/ADR-006 rejected in terms and 55/ADR-004 §4 restates. An instruction is not an
  enforcement point.
- *Append `--aof-gate-order` literally, as declared* — **rejected on measurement**: `claude` has no such
  flag, so the first compiled launch would fail. A spelling with no referent must be replaced, not
  honoured.
- *Retire `gate-order` and declare a different member at the envelope* — **rejected**: the discharge
  condition in two delivered records names `gate-order` by name, and retiring a member to close a gap
  about that member is closing the record rather than the gap.
- *Leave the point deferred and bound unattended runs by convention* — **rejected by 63/SPEC §Scope**
  verbatim: *"enforced at the boundary, not a convention."*

**Invariant.** `compileFrozenSet(bundledFrozenSet()).deferred` is empty and `installed` contains
`gate-order`; the fourth enforcement point produces a compiled artifact; an unattended launch resolves
only to the declared shape and any other request is a coded refusal; and every attended launch's argv
and env are byte-identical to HEAD. (Enforced by `FF-6305`.)

---

## ADR-006: A mesh assignment resolves to a LOOP CALL for the ONE phase that has a coordinator to remove — the other three are byte-unchanged, and no dispatch topology, PTY, streaming or NEEDS_INPUT machinery is touched

**Status:** Accepted
**Date:** 2026-09-01

**Context.** This is the milestone's live wake (ADR-003 §3) and its largest hazard. The graph is blunt
about the blast radius: `src/mesh-assignment-directive.mjs` has **six `src/` dependents**
(`board-mesh-execution.mjs`, `effects/table.mjs`, `mesh-assignment-reclaim.mjs`, `mesh-assignment.mjs`,
`mesh-recovery-push.mjs`, `mesh-ui-serve.mjs`) and imports nothing; `mesh-assignment-reclaim.mjs` has 13
dependents and 15 imports; `mesh-worker-execution.mjs` has 54 dependents and 29 imports and is the
mesh's god-node. 63/SPEC §Out of scope fences the topology — *"leasing, reclaim, presence, routing…
only the trigger→loop seam is touched here."*

**Decision.**

**1 — Only `autonomous` changes, because only `autonomous` has an orchestrator session to remove.**
`/aof:autonomous <ref>` is the whole-item cascade: one session decides the order of refine, build and
verify. That session **is** the coordinator 63/SPEC says the trigger path must not require, and it is
the only one of the four. So the `autonomous` phase resolves to `aof work loop <scope> --level <L>`,
and `refine`, `continue` and `verify` keep today's directive **byte-identically**.

**1a — And `refine --autonomous` stays a session, deliberately.** It cascades *within* the refine
phase; `GATE_ORDER` has no rung for it and `work:loop` has no scope form that expresses it. Moving it
would be a behaviour change on a live path that 63/SPEC does not ask for. `aof work drive refine|
continue|verify <ref>` already exists (`src/commands/drive.mjs:331`) and is the door a later milestone
may move the three through; this milestone records that and does not walk through it, because doing so
would change three live paths to buy nothing this SPEC scopes.

**2 — The resolution lives in the ONE home that already maps phases.** `mesh-assignment-directive.mjs`
gains a sibling resolver returning `{ kind, command, program, argv }`; `assignmentDirectiveCommand`
keeps its four answers **byte-unchanged**, so five of its six dependents are untouched. A phase list
spelled anywhere but that module is the defect its own header records costing a wrong-base build on
2026-07-27, and this milestone does not add a second speller.

**3 — The wire field is ADDITIVE and the worker reads it in exactly one place.** The directive gains a
`launch` field beside the existing additive `baseBranch` and `commit`, resolved by the dispatch tick
(`src/mesh-assignment-reclaim.mjs:349-352`) and **placed on the wire frame that `buildDirectiveFrame`
assembles at `src/mesh-assignment-reclaim.mjs:380-389`**, beside `command`, `baseBranch` and `commit` —
the resolution site and the frame site are ten lines apart and only the second one puts the field on the
wire. Read where the worker already builds its driver options
(`src/mesh-worker-execution.mjs:1678`). The **assignment record stays frozen at its ten keys** — the
phase already rides a side-table and the launch rides the directive, never the record.

**4 — No PTY, streaming, output-chunk, completion-detection or NEEDS_INPUT machinery is edited.** All of
it operates on `{ bin, args, env }` and a pty; ADR-005 §2 changes what those three values are for one
kind of launch and nothing above them. **A loop launch produces no NEEDS_INPUT sentinel, and that is
correct rather than missing**: an unattended loop halts on a member of 53's frozen `LOOP_STOPS`
(`src/work-loop.mjs:26-39`), which is the machine-readable halt the sentinel exists to provide for a
session. 63 adds no new completion signal and no new stop.

**5 — Version skew is NAMED, and its symptom is bounded.** Control and worker deploy from one tree per
node, so skew is an operator-visible deploy state rather than a designed-for condition. A pre-63 worker
receiving a `loop` directive sees no `launch` and a null `command`, and *"the interactive session below
is still spawned, simply with nothing typed into it"* (`src/mesh-worker-execution.mjs:1331-1333`) — an
idle session that settles on its existing deadline. That is wasteful and observable; it is **not** the
wrong work at the wrong level, which is what a fallback to `/aof:autonomous` would have been. Capability
negotiation would fix the waste and is presence/routing, which 63/SPEC puts out of scope.

**Alternatives considered.**

- *Move all four phases to `aof work drive`/`aof work loop`* — **rejected** on §1a: three live paths
  change for nothing 63/SPEC asks for.
- *Add a second execution kind to `mesh-worker-execution.mjs` with its own lifecycle* — **rejected**:
  the mesh's god-node gains a parallel path, which is dispatch topology by another name and would
  swallow the milestone.
- *Keep `command` populated with the loop's argv rendered as a string, for old workers* — **rejected**:
  an old worker would type `aof work loop 63 --level L2` into a claude PTY as a prompt, whose effect is
  ambiguous and whose failure mode is a model deciding what to do about it.
- *Let the control negotiate the worker's capability before dispatching* — **rejected as out of scope**
  (presence/routing), and recorded in §5 with the symptom it would remove.

**Invariant.** Exactly one module maps an assignment phase to a directive, and no slash-command literal
appears outside it; `assignmentDirectiveCommand`'s four answers are byte-unchanged; only the
`autonomous` phase resolves to a loop launch; the assignment record's key count is unchanged; and no
file this milestone writes edits leasing, reclaim, presence, routing, PTY spawn, output chunking,
completion detection or the NEEDS_INPUT path. (Enforced by `FF-6306`.)

---

## ADR-007: The three signals that are not the mesh — and a finding-triggered wake NEVER CLASSIFIES, while every source resolves its scope through `LOOP_SCOPE_FORMS` or is refused

**Status:** Accepted
**Date:** 2026-09-01

**Context.** 63/SPEC §Scope names four sources; ADR-006 owns one. The other three — a cadence, a PR/CI
signal, an inbound `aof:feedback` finding — share one job (turn a signal into a scope) and one hazard
each, and the finding source's hazard is already ruled on. 55/ADR-005 made raw capture structural, and
`src/commands/feedback.mjs:28,47` refuses any classification key at capture with
`feedback-classification-deferred`: *"Feedback capture accepts raw text and attribution only;
classification belongs to later triage."* A trigger that woke a loop *because a finding was a bug*
would be performing exactly the classification capture refuses, one layer away, where nothing would
catch it.

**Decision.**

**1 — A finding-triggered wake keys on the EXISTENCE of a capture, never on its content.** It may read
that a capture exists and which item it is attributed to. It may not read, infer, score or branch on
what the capture says. That is not a caution; it is 55/ADR-005's rule holding at its second consumer,
and it is why the finding source is a legitimate trigger rather than an untriaged triage.

**2 — Every source resolves its scope through `LOOP_SCOPE_FORMS`, and authors no grammar.** A signal
naming a story (`63/01`) does not silently become a whole-stream walk: 53/ADR-003 made a story-shaped
scope a **coded refusal**, and that stands. A source either widens to the driver the item belongs to —
by an explicit, declared rule — or is refused by name. TECH_DEBT item 49 measured what a fourth scope
parser costs; this milestone does not write one, and `src/work-ref-scope.mjs` is a **different**
resolver for a different question and is not conscripted.

**3 — A CI signal is a signal, not a verdict.** The source reads which ref the signal names and answers
with a scope. It does not read a build's status, decide whether a failure is worth a loop, or hold a
policy about which pipelines matter. A source that graded its input would be a coordinator (ADR-001 §2)
and, for the finding source, a classifier (§1).

**4 — A cadence source resolves a declared scope, and the clock is the caller's.** Per ADR-003 §1 there
is no timer here. The cadence source exists so a crontab line's scope and level are **declared and
reviewable** in `.aof/triggers.jsonc` rather than buried in a scheduler nobody reads, and so ADR-002
§3a's contradiction check has something to check.

**5 — A source that cannot answer is a REFUSAL with a code, never an empty resolution.** An empty
resolution from an unattended caller is indistinguishable from "nothing to do", which is how a wake
path dies silently. This is 59/ADR-004 §1a's discipline — *a sweep that read nothing is a finding
rather than a pass* — applied to a resolution that resolved nothing.

**Alternatives considered.**

- *Let the finding source read the capture's text to pick a scope* — **rejected** on §1; the attribution
  the capture already carries is the only scope input it needs.
- *Let a CI source carry a failure-class filter* — **rejected** on §3: a filter over signal content is a
  verdict with a threshold.
- *Resolve a story-shaped signal by walking up to its milestone implicitly* — **rejected**: an implicit
  widening is a scope the caller did not ask for, and 53/ADR-003 refused the silent walk for the same
  reason. A declared widening rule is fine; an inferred one is not.
- *One generic "external" source with a free-form payload* — **rejected**: it makes the source axis
  unfalsifiable and FF-6308's per-source non-vacuity leg unmeasurable.

**Invariant.** No module under `src/work-trigger/` reads a feedback capture's body or contains any
classification vocabulary; scope is resolved only through `LOOP_SCOPE_FORMS` and no scope or range
grammar is authored in the family; no source reads a build status or holds a content filter; and a
source that cannot resolve emits a coded refusal rather than an empty result.
(Enforced by `FF-6307`, `FF-6301`.)

---

## ADR-008: What this milestone deliberately does NOT do

**Status:** Accepted
**Date:** 2026-09-01

1. **A scheduler, a daemon, a poller or a webhook receiver** — ADR-003. The caller owns the clock.
2. **A second loop launcher, or any path that runs the loop from inside `work:trigger`** — ADR-003 §2.
3. **A second autonomy gate, threshold or score** — ADR-004 §1. `resolveLoopLevelGate` stays the one
   home, and 55/FF-5508 already walks all of `src/**` for the config/env/flag ban.
4. **Any change to leasing, reclaim, presence or routing** — 63/SPEC §Out of scope, ADR-006 §5.
5. **Any new runtime beyond `claude` / `codex`** — 63/SPEC §Out of scope. `PROVIDER_IDS` is unchanged.
6. **A `/aof:trigger` bundle command.** No work command outside the `work insert` family ships one, and
   `acceptor`, `audit`, `grade`, `counters`, `ratchet` and `tune` all ship without one; the CLI↔bundle
   parity control is scoped to that family (62/ADR-009 §5).
7. **A board route.** `trigger` joins `acceptor`, `audit`, `grade` and `tune` in `BOARD_DEFERRED` for
   their reason: the level pre-flight reaches `work:doctor` and `work:loops-groundedness`, so a served
   route would let a page load walk the whole work tree. Recorded as a deferral, not an oversight.
8. **A per-launch `--settings` or `--disallowedTools` grant** — ADR-005 §5, recorded as a shape to reuse.
9. **A twelfth exported set in `src/work-loops.mjs`, or a widened `EVENT_TRIGGERS`** — ADR-002 §3, §4.
10. **Any edit to a delivered `.feature`.** ADR-005's supersession is recorded here, in the accepting
    item, and two test assertions change. That is 53/ADR-014's precedent and the project's standing rule.

---

## ADR-009: The partition — six stories, one sole writer per module and per contended test file, two stages

**Status:** Accepted
**Date:** 2026-09-01

**Context.** 61/ADR-012 and 62/ADR-010 proved the discipline: one sole writer per module **and per
contended test file**, with stage-1 stories carrying no edge between them, because 61/R5 measured what
two concurrent reviewers mutating source for red probes in one worktree costs.

### 1 · The coupling this is drawn from

Graph-derived at `builtAt 2026-09-01T19:33:21Z`, cited as **actual** structure. Nothing below was
reported `present: false`; the new modules under `src/work-trigger/` have no graph coverage because they
do not exist yet, which is a different fact from an uncovered one, and their coupling is *declared*
here as a star: four leaves importing existing homes and each other not at all, plus one face importing
the four.

- **`src/agent-session-driver.mjs`** ← 23, of which **exactly two are `src/`**: `commands/drive.mjs` and
  `mesh-worker-execution.mjs`. This is why ADR-005 §2 is a one-function change with zero edits at the
  callers, and why 63/02 and 63/03 do not collide: 63/02 owns the envelope, 63/03 owns the caller that
  asks it for the new kind.
- **`src/frozen-set.mjs`** ← 10 (3 in `src/`: `claude-settings.mjs`, `work-acceptor/criterion.mjs`,
  `work-bundle.mjs`) → 1. A small, well-fenced hub; 63/02 is its sole writer.
- **`src/mesh-assignment-directive.mjs`** ← 9 (**6 in `src/`**) → **0 imports**. A zero-import mapper
  with six readers — the safest possible place to add a resolver, and the reason `assignmentDirective
  Command`'s answers must stay byte-unchanged (§2 of ADR-006).
- **`src/mesh-worker-execution.mjs`** ← 54 → 29 — the mesh god-node. 63/03 makes **one additive read**
  in it and nothing else; a story that restructured it could not be independent of anything.
- **`src/work-loops.mjs`** ← 50 (8 in `src/`) → 3. The one additive FUNCTION export (ADR-002 §3) lands
  here, which is why it is a named carve-out with a byte-unchanged leg rather than a widening.
- **`src/work-loop.mjs`** ← 26 (1 in `src/`) → **0**, and it stays 0: 63/01 imports *from* it and adds
  nothing *to* it.
- **`src/command-core.mjs`** ← 141 → 86 — the registry god-node. Exactly **one** story may append to it,
  and it is the terminal one (59/ADR-008 §1's rule, applied again).
- **`src/loop-bounds.mjs`** ← 26 (11 in `src/`) → 0 and **`src/work-ref-scope.mjs`** ← 5 → 0 — zero-import
  rule leaves, read by this milestone and written by none of it.

### 2 · Sole writers

| module / contended file | sole writer |
|---|---|
| `src/work-trigger/declaration.mjs`, `.aof/triggers.jsonc`, `src/bundle/triggers.jsonc` | 63/00 |
| `src/bundle/bundle.json` | 63/00 |
| `src/work-loops.mjs` (one additive function export), `test/work-loops-record.test.mjs` | 63/00 |
| `src/work-trigger/level.mjs` | 63/01 |
| `src/frozen-set.mjs`, `src/agent-session-driver.mjs`, `.aof/frozen-set.jsonc`, `src/bundle/frozen-set.jsonc` | 63/02 |
| 55/04's two deferral pins (its behavioural suite and its arch control) | 63/02 |
| `src/bundle/manifest.json` | 63/02, **regenerated last** — see §2a |
| `src/mesh-assignment-directive.mjs`, `src/mesh-assignment-reclaim.mjs`, `src/mesh-worker-execution.mjs` | 63/03 |
| `test/mesh-assignment-directive.test.mjs` | 63/03 |
| `src/work-trigger/sources.mjs` | 63/04 |
| `src/commands/trigger.mjs`, `src/command-core.mjs` | 63/05 |
| `test/command-core-contract.test.mjs`, and the work-command bijection and route-coverage controls | 63/05 |
| `scripts/test.mjs` | every story, in its own labelled block only |

**2a — `src/bundle/manifest.json` is GENERATED, and its contention is resolved by ordering, not by
locking.** Two stories change a hashed bundle input: 63/00 adds `triggers.jsonc`, 63/02 edits
`frozen-set.jsonc`. The file is produced by `scripts/generate-bundle-manifest.mjs`, so the answer is
that **both stories run the generator and 63/02 regenerates last**, with the generator's output — never
a hand-edited hash — being what lands. A hand-edited hash in this file is rejected at review; TECH_DEBT
item 8 is what a silently-wrong bundle hash costs on this platform.

**2b — `scripts/test.mjs` is an append-only registration hub** (53/ADR-011). Each story appends **one
labelled block** of imports and **one labelled block** of spreads carrying its own story number, and
edits no other line. The registry is 4,509 lines and a story that reformats it is rejected at review.

### 3 · Ordering, and what may be built in parallel

**Stage 1 — 63/00 ‖ 63/01 ‖ 63/02 ‖ 63/03 ‖ 63/04.** Five stories, no edge between them. 63/00, 63/01 and
63/04 are pure leaves over data handed in. 63/02 and 63/03 sit on opposite sides of one graph edge
(`mesh-worker-execution.mjs → agent-session-driver.mjs`) and are still edge-free at build time, because
63/03's deliverable is that the directive **carries** a loop launch and the worker **passes it through**
to the driver options — assertable against a stubbed driver, exactly as `baseBranch` and `commit`
already are — while the envelope branch that consumes it is 63/02's. Neither story lands a control that
needs the other's module.

**One ORDERING note, which is not a stage edge and is stated rather than hidden.** ADR-010 §4 puts the
`.aof/**/*.jsonc` line-ending pin in 63/00, and 63/02's byte-identity leg is repaired by it. On a
Windows working tree with `core.autocrlf=true`, 63/02's leg therefore passes only once that line has
landed and the file has been re-checked-out; in CI both pass regardless, because the mismatch is a
working-tree artifact and git holds one blob for both copies. This is a **one-line dotfile ordering
preference, not a module dependency** — neither story needs the other's code, and FF-6305's other legs
are unaffected. An operator building on Windows should land 63/00's line first; an operator building
anywhere else may ignore it entirely.

**Stage 2 — 63/05.** The face composes the four `src/work-trigger/` leaves, obtains the two gate facts
through `invoke`, registers the command and renders. It has an edge to all four and to nothing else.

**It therefore owns THREE of the eight controls, and that follows from the edge-free rule rather than
from convenience.** `FF-6301` and `FF-6303` are **family-wide** claims — the four absences, and the
no-clock/no-receiver/no-write claim, over `src/work-trigger/**` *and* the face together — and `FF-6308`
is the claim over the shipped declaration. None of the three can be evaluated until the family and the
face both exist, so a stage-1 leaf that declared any of them would be declaring a control it could not
clear. The other five controls each sit on the story that writes their subject, one row to one file.
The distribution is **63/00, 63/01, 63/02, 63/03, 63/04 → one control each; 63/05 → three**.

### 4 · The stories

Each story's `files:` and `reads:` are stated once here, project-root-relative with forward slashes, and
are the authority until the story's own `STORY.md` frontmatter carries them.

**63/00 · `the-trigger-declaration` — stage 1.** A trigger is reviewable data with one compiler: the
declaration, its bundled source, its installed copy, and the cadence grammar reached by import rather
than by copy.
- **files:** `src/work-trigger/declaration.mjs`, `.aof/triggers.jsonc`, `src/bundle/triggers.jsonc`,
  `src/bundle/bundle.json`, `src/bundle/manifest.json`, `src/work-loops.mjs`, `.gitattributes`,
  `test/work-loops-record.test.mjs`, `test/trigger-declaration.test.mjs`,
  `test/arch/acd-trigger-declaration-is-data.test.mjs`, `scripts/test.mjs`
  <br>`.gitattributes` gains **one line** — `.aof/**/*.jsonc text eol=lf` (ADR-010 §4) — and 63/00 is
  its sole writer.
- **reads:** `wiki/work/63_milestone_event-driven-triggers/ARCHITECTURE.md#ADR-002`,
  `wiki/work/63_milestone_event-driven-triggers/SPEC.md#Scope`, `src/frozen-set.mjs`,
  `src/bundle/frozen-set.jsonc`, `src/work-loops.mjs`, `src/work-bundle.mjs`,
  `scripts/generate-bundle-manifest.mjs`,
  `wiki/work/52_milestone_loop-registry-and-graph/stories/00_story_loop-model-and-loader/tasks/00_frozen-vocabulary.feature`
- **depends:** —

**63/01 · `the-level-is-a-ceiling-not-an-admission` — stage 1.** A declared level is a request resolved
at every fire through the one gate home, never cached, and refused by name rather than downgraded.
- **files:** `src/work-trigger/level.mjs`, `test/trigger-level-ceiling.test.mjs`,
  `test/arch/acd-trigger-level-is-a-ceiling.test.mjs`, `scripts/test.mjs`
- **reads:** `wiki/work/63_milestone_event-driven-triggers/ARCHITECTURE.md#ADR-004`, `src/work-loop.mjs`,
  `src/commands/loop.mjs`, `wiki/work/55_milestone_anchors-and-frozen-set/ARCHITECTURE.md#ADR-006`,
  `wiki/work/53_milestone_loop-artifact/ARCHITECTURE.md#ADR-007`
- **depends:** —

**63/02 · `the-launch-envelope-compiles` — stage 1.** The fourth enforcement point stops being a
spelling: `gate-order` compiles to the unattended launch shape, an unattended launch that does not match
it is refused, and every attended launch is byte-identical to HEAD.
- **files:** `src/frozen-set.mjs`, `src/agent-session-driver.mjs`, `.aof/frozen-set.jsonc`,
  `src/bundle/frozen-set.jsonc`, `src/bundle/manifest.json`, `test/frozen-set-compiled.test.mjs`,
  `test/arch/acd-frozen-set-compiled.test.mjs`, `test/unattended-launch-envelope.test.mjs`,
  `test/arch/acd-unattended-launch-is-declared.test.mjs`, `scripts/test.mjs`
- **reads:** `wiki/work/63_milestone_event-driven-triggers/ARCHITECTURE.md#ADR-005`,
  `wiki/work/55_milestone_anchors-and-frozen-set/ARCHITECTURE.md#ADR-004`,
  `wiki/work/55_milestone_anchors-and-frozen-set/OUTCOME.md`,
  `wiki/work/55_milestone_anchors-and-frozen-set/stories/04_story_the-frozen-set-compiled/OUTCOME.md`,
  `src/claude-settings.mjs`, `src/work-bundle.mjs`, `src/terminal-providers.mjs`, `src/work-loop.mjs`
- **depends:** —

**63/03 · `a-mesh-assignment-resolves-to-a-loop-call` — stage 1.** The one phase with a coordinator to
remove stops being a slash command; the other three are byte-unchanged, and the wire field is additive.
- **files:** `src/mesh-assignment-directive.mjs`, `src/mesh-assignment-reclaim.mjs`,
  `src/mesh-worker-execution.mjs`, `test/mesh-assignment-directive.test.mjs`,
  `test/mesh-assignment-loop-directive.test.mjs`,
  `test/arch/acd-assignment-resolves-to-a-loop-call.test.mjs`, `scripts/test.mjs`
- **reads:** `wiki/work/63_milestone_event-driven-triggers/ARCHITECTURE.md#ADR-006`,
  `src/agent-session-driver.mjs`, `src/commands/loop.mjs`, `src/work-loop.mjs`,
  `src/control-stream-server.mjs`, `src/assignment-record.mjs`,
  `wiki/work/38_milestone_cross-machine-worker-execution/ARCHITECTURE.md`
- **depends:** —

**63/04 · `the-signals-that-are-not-the-mesh` — stage 1.** A cadence, a CI signal and an inbound finding,
each answering only *which scope*; the finding source never reads what the capture says.
- **files:** `src/work-trigger/sources.mjs`, `test/trigger-sources.test.mjs`,
  `test/arch/acd-trigger-never-classifies.test.mjs`, `scripts/test.mjs`
- **reads:** `wiki/work/63_milestone_event-driven-triggers/ARCHITECTURE.md#ADR-007`,
  `src/commands/feedback.mjs`, `src/work-loop.mjs`,
  `wiki/work/55_milestone_anchors-and-frozen-set/ARCHITECTURE.md#ADR-005`,
  `wiki/work/53_milestone_loop-artifact/ARCHITECTURE.md#ADR-003`
- **depends:** —

**63/05 · `the-triggers-face` — stage 2.** One registered command whose bare face is a read: it composes
the four leaves, obtains the two gate facts through `invoke`, emits the `work:loop` input and its argv,
and launches nothing.
- **files:** `src/commands/trigger.mjs`, `src/command-core.mjs`, `test/trigger-command.test.mjs`,
  `test/command-core-contract.test.mjs`, `test/arch/acd-work-command-cli-bijection.test.mjs`,
  `test/arch/acd-work-command-route-coverage.test.mjs`,
  `test/arch/acd-trigger-is-a-caller-not-a-coordinator.test.mjs`,
  `test/arch/acd-trigger-holds-no-clock.test.mjs`,
  `test/arch/acd-trigger-is-non-vacuous-over-this-repo.test.mjs`, `scripts/test.mjs`
- **reads:** `wiki/work/63_milestone_event-driven-triggers/ARCHITECTURE.md`, `src/work-trigger/`,
  `src/commands/loop.mjs`, `src/commands/tune.mjs`, `src/command-core.mjs`,
  `wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-002`
- **depends:** 63/00, 63/01, 63/02, 63/03, 63/04

### 5 · Codebase health

Measured at HEAD, and every degradation below is routed rather than noted.

- **`src/` root siblings: 144, against 11 subdirectories.** 63 adds **zero** root siblings — four modules
  under a new `src/work-trigger/`, following `src/work-audit/` (59), `src/work-acceptor/` (61) and
  `src/work-tune/` (62). The directory is created up front and the trend line moves the right way.
- **`src/commands/` is at 92 flat siblings and gains a 93rd.** Same species as 62 flagged, and it is
  **already ledgered as TECH_DEBT item 78** (*"the fastest-growing flat directory in the tree — 18 to 91
  siblings in two months"*, the entry 62 was owed and wrote). Noted, cited, **not re-ledgered**; a
  ratchet here would police 92 files this milestone does not touch, and item 78 is its home.
- **`test/arch/` is at 380 flat siblings and `scripts/test.mjs` at 4,509 lines.** 63 adds 7 control files
  and ~14 registry lines. Already ledgered as item 63; noted, not re-ledgered.
- **`src/mesh-worker-execution.mjs` is a god-node at 54 dependents and 29 imports**, and it is the one
  file in this milestone's write set that a reviewer should be uneasy about. 63 makes **one additive
  read** in it (ADR-006 §3). It is not covered by item 10 (which counts `src/` root modules) or item 78
  (which counts `src/commands/`), and a split is far outside this milestone. **Routed to `TECH_DEBT.md`
  as a new entry** — the mesh worker handler is a 1,700-line god-node with 54 dependents through which
  every worker-side concern is threaded, so each milestone that touches the mesh adds one more additive
  field read and no one ever removes one — **and that entry is OWED**, because this pass may write only
  architecture and story documents.
- **A species worth watching, recorded for whoever meets it third.** `src/work-audit/`,
  `src/work-acceptor/`, `src/work-tune/` and now `src/work-trigger/` are four instances of the same
  shape: a pure-leaf family plus one registered face that composes it and reaches the registry through a
  deferred `invoke`. Four is where a shape stops being a coincidence. If a fifth arrives, the composition
  wants a shared home rather than a fifth hand-rolled `commands/<x>.mjs`; that is not this milestone's
  refactor, and it is written down so the fifth architect does not have to notice it alone.
- **Leg B of the control gate does not run in this repository, and that is NOT a 63 gap.**
  `aof work doctor 63` warns `control-runner-unchecked` for all eight declarations here — *"no
  `work.controls.runners` is configured — leg B (does a runner name this file?) did not run"*. Measured:
  `.aof/aof.config.json` sets no `work.controls` key at all, and `aof work doctor 62` emits the identical
  warning, so this fires for **every** milestone in the tree and has since the check shipped. It is
  **already ledgered as TECH_DEBT item 69**, which names both the key (`RUNNERS_CONFIG_KEY`,
  `src/work-doctor-controls.mjs:93`) and the consequence — leg A alone has been deciding control
  resolution. Its fix is one project-config setting pointing at the runner, and its home is item 69, not
  this milestone: setting it here would arm a repository-wide gate from inside one milestone's refine,
  which is exactly the kind of unreviewed blast radius the frozen set exists to refuse. Recorded so that
  the warning on 63's eight declarations is read as the standing gap it is rather than as a defect in
  this register.
- **TECH_DEBT item 60** (a long prose line hangs `aof work doctor <ref>`) bounds how this document is
  written, not what it decides: every paragraph is wrapped at ~112 characters, and the register's rows
  are long by design — item 60 measured 763-char table rows as safe and a 748-char *prose* line as fatal.

---

## ADR-010: The closure round — the eleven rulings the Three Amigos pass forced out of ADRs 001–009, each measured at source before it was decided

**Status:** Accepted
**Date:** 2026-09-01

**Amends:** ADR-006 §1 (the dispatch argv carries no `--level` — ruling 1), ADR-006 §2 (the resolver's
return shape loses `program` and `argv` — ruling 2), ADR-005 §4 (the arch pin's shortfall and a third
stale artifact — ruling 5), ADR-004 §1 (the precondition check — ruling 7) and ADR-004 §4 (the
unusable-reading exit code — ruling 11). Every amended clause's original text is left standing above;
nothing here is deleted, and each ruling below states what it replaces.

**Context.** Six contracts authored against ADRs 001–009 found eleven places where a decision implied a
clause it did not state. The pattern is the one 62/ADR-014 named and it is worth naming again: **every
one sits at a seam between something an ADR deliberately left open and something it silently assumed.**
An abstention with an unstated boundary is not an abstention; it is a decision nobody made. Seven were
genuinely open; four were rulings QA took from precedent and are confirmed here so the precedent is a
decision rather than an inference.

**1 — The mesh path takes the loop's DEFAULT and declares NO level source; ADR-006 §1's `--level <L>`
is struck.** Measured: `--level` appears **nowhere** in `src/` outside `src/commands/loop.mjs`; the
assign verb records only a phase (`src/mesh-assignment.mjs:186-189`); the assignment record is frozen at
ten keys. So a level on the mesh path would need a **new carrier** — an assign argument, a side-table
column or a config key — and every one of those is the operator-editable admission for an unattended run
that 55/FF-5508 bans and that 53/ADR-006 rejected in terms. **The dispatch argv is `aof work loop
<scope>`, with no `--level` flag at all**, so `resolveLoopLevel`'s default applies and there is nothing
to breach. This is not a gap: a mesh assignment is the one trigger source whose **signal carries no
level**. A run that wants a level states it in `.aof/triggers.jsonc`, where it is declared, reviewable
and subject to ADR-004's ceiling rule in full. **Discharge condition** if the mesh should ever carry a
declared level: it arrives through the trigger declaration, not through a second carrier on the
assignment.

**2 — The DECLARATION is the sole speller of the program; the resolver carries only the SCOPE.**
ADR-006 §2's `{ kind, command, program, argv }` becomes `{ kind, command, scope }`. This is the ruling
that removes a whole failure class rather than documenting it: 63/02 and 63/03 build in parallel, and
two independently-authored program literals — `aof` against a payload path against `node <cli>` — would
make **every autonomous dispatch a coded refusal, green in both suites and red only at accept**. After
this ruling **there is exactly one program literal in the milestone and it is data**: the compiled
`gate-order` artifact. The resolver has nowhere to write a second one, and the worker composes the
launch by handing the compiled declaration a scope. ADR-005 §2's refusal then only ever fires on a
genuine tamper, never on a spelling disagreement between two stories.

**3 — A story-shaped ref on the autonomous phase is refused AT THE CONTROL, at dispatch, before a
worktree is minted.** The case is real: assignments are minted from `item.ref` and the scope lock
explicitly contemplates a story being assigned (`src/mesh-assignment.mjs:152-172`), while
`LOOP_SCOPE_FORMS` admits only `^\d+$` and `^\d+-\d+$`. Launching and letting the loop refuse burns a
worktree, a lease and a deadline and leaves the reason inside a process nobody reads. The refusal is
raised by **the resolver of ruling 2**, reported through the dispatch tick's existing
assignment-failure path, and **no directive is sent**. Two boundaries make it safe: it is scoped to the
**autonomous phase only**, so a story assigned on `continue` or `verify` keeps working exactly as
today; and it is **not** added to the assign verb's gate ladder, whose refusal ORDER is a pinned wire
contract with m38 features asserting it and whose own comment warns that a new gate must not steal an
earlier gate's answer. Implicit widening to the parent driver stays forbidden (53/ADR-003).

**4 — `.gitattributes` gains ONE line, it belongs to 63/00, and FF-6302 gains the ratchet.** Measured,
and it is a defect in the tree today rather than a hazard 63 introduces: `.gitattributes:12` pins
`.aof/**/*.json`, which does **not** match `.jsonc`. `git ls-files --eol` reports `.aof/frozen-set.jsonc`
as `w/crlf attr/` against `src/bundle/frozen-set.jsonc`'s `w/lf attr/text eol=lf`, their on-disk sha256
differ (`bf298169…` against `f68c1974…`), and `f68c1974…` is the hash `src/bundle/manifest.json` records
— so the installed copy already fails a byte-comparison on every Windows checkout while passing on Linux
CI. **The line is `.aof/**/*.jsonc text eol=lf`**, one pattern beside the existing `.json` pin, which
repairs `frozen-set.jsonc` and covers every future `.aof` declaration at once — strictly better than two
path-specific lines. **It belongs to 63/00**, because 63/00 is the story that installs a *new*
`.aof/*.jsonc` file and a declaration arriving without its line-ending pin is the defect.

**4a — And because this is the THIRD instance, it gets a ratchet rather than a fix.** The repository has
now paid for this shape three times: TECH_DEBT item 8 (*CRLF jams the bundle drift-guard — `aof work
update` was silently dead on Windows*), the `.aof/loops/*.md` pin whose own comment reads *"Pin the
dogfood copy too so `core.autocrlf=true` cannot manufacture drift"*, and this. **FF-6302 therefore
asserts the property, not the line**: every `.aof/**` target the bundle declares as an asset is covered
by an `eol=lf` attribute, driven from `src/bundle/bundle.json`'s own asset list, so the N+1th declaration
cannot arrive unpinned. Item 74 is the neighbouring species (a byte-freeze control reading working-tree
line endings) and is why the leg is asserted over the **attribute** as well as the bytes.

**5 — ADR-005 §4 is CORRECTED: the arch pin needs a fourth map entry, not a changed line, and there are
THREE stale artifacts rather than two.** Confirmed at source and it is the most dangerous finding of the
eleven. `test/arch/acd-frozen-set-compiled.test.mjs:37-42` holds a **local three-entry** `COMPILED_POINTS`
map with the comment *"'the worker launch envelope' is deliberately absent"*, and `traceProblems`
(`:74-79`) `continue`s any member whose enforcement point is not a key of it. So editing only the
`deepEqual` at `:129` leaves `gate-order` **invisible to the trace loop**: the control would go green
while tracing nothing at the very point this milestone just armed — *"report as enforced while holding
nothing, which is worse than no control"*, in that file's own words at `:5-21`, describing the repair it
was re-aimed to make. **The pin gains a fourth entry carrying the `rules`/`declaredBy` accessors for the
compiled unattended-launch artifact, and its comment is rewritten** rather than deleted. The third stale
artifact is the sibling suite's test **name** at `test/frozen-set-compiled.test.mjs:105`, which ends
*"…and the worker launch envelope is explicitly deferred"*. FF-6305 gains the leg that makes this
checkable: the fourth point must be **traced**, not merely counted.

**6 — FF-6303's exit rule is widened, and the two sides are named by their CAUSE rather than by a list.**
Read as a closed list, the row put an unreachable registry at 0 while ADR-004 §1's discipline puts it at
1, and both readings passed their own author. The precedent is one line: `src/commands/tune.mjs:590`,
`exit: (result) => (result.failure == null ? 0 : 1)`. The rule is therefore stated as a **cause**, not an
enumeration: **a run that produced a resolution exits 0 no matter how many refusals it carries; a run
that produced no resolution — an unparseable declaration, an unreachable registry, an unreadable
invocation — is a failure, reported first in `--json` and then exited non-zero.** A refusal is an answer;
an absence of answer is not.

**7 — A fact that was never SUPPLIED and a fact that FAILED are different answers, and 63/01 refuses on
its own precondition before delegating.** Measured: `l3ScoreFailure(undefined)` returns
`{ score: null, clears: "none", … }` and `l3GroundednessFailure(undefined)` returns
`{ state: "unavailable", … }` (`src/work-loop.mjs:414-444`) — shapes a real failure also produces. So the
gate alone cannot tell "the question could not be asked" from "it was asked and does not stand", which
is exactly the distinction 62/ADR-014 §3 already had to draw. **The leaf checks that both facts are
PRESENT before it delegates, and reports a missing fact as its own coded refusal naming which fact was
absent.** That is an input-presence check, not a second gate: it computes no score, compares no
threshold and reads no component verdict, so ADR-004 §1 is untouched and FF-6304's no-second-gate leg
still holds.

**8 — CONFIRMED: a cadence contradiction is REPORTED, never refused.** ADR-002 §2's refusal rule governs
a member that does not **compile** — a malformed declaration. A cadence contradiction is a *semantic*
disagreement between two well-formed declarations, and refusing the trigger set because a loop record
disagrees would let the registry's content silently disarm a trigger. Reported by name, never silent,
and a contradictory declaration's answer differs from the same declaration with the contradiction
removed — the implementation-agnostic form 63/00's QA contracted, which is 59/ADR-004's finding-rather
-than-failure discipline. Confirmed as written; the stronger form is declined.

**9 — CONFIRMED, and ADR-007 §1 is extended to say it: a later TRIAGE CLASSIFICATION is equally
unreachable.** `src/feedback-records.mjs:11` carries `FEEDBACK_CLASSIFICATION_KEYS` beside
`RAW_FEEDBACK_KEYS`, so one `FEEDBACK.ndjson` may hold triage's verdict as well as raw captures. ADR-007
§1 banned reading what the capture says and was silent on the verdict. **Branching on triage's
classification is the same classification wearing someone else's answer** — one indirection further from
55/ADR-005, and no further from the failure it prevents. The whole record body is unreachable; only
existence and attribution are read.

**10 — CONFIRMED: a well-formed driver ref bearing no item RESOLVES.** *"Does this ref name an item on
disk"* is a question about the **tree**, and the sources are pure leaves over data handed in (ADR-009
§3). Answering it inside a source would make the leaf a tree reader and would break its own
same-answer-beside-any-tree claim. Existence is decided where the tree is already read — and `work:loop`
itself refuses a scope that resolves to nothing, so the answer is not lost, merely given by the right
component. The pure-leaf claim stands as written.

**11 — CONFIRMED, in ADR-004 §4: a registry that answers with a reading no gate half can be read from is
EXIT 0**, with each affected trigger refused by name and carrying no resolution at any level. It is
neither an unreachable registry (ruling 6's non-zero side — no answer was produced) nor a passing gate: a
resolution *was* produced and its content is a refusal. This is 62/04's analogous ruling and it keeps
ruling 6's rule coherent — the exit code turns on whether a resolution exists, never on what it says.

**Alternatives considered.** *Give the mesh a declared level on the assignment* — **rejected** on ruling
1: it is FF-5508's banned carrier with a new name. *Let both stories spell the program and reconcile at
accept* — **rejected** on ruling 2: green twice, red once, at the latest possible moment. *Refuse a
story-shaped ref at the assign verb* — **rejected** on ruling 3: its refusal order is a pinned wire
contract. *Two path-specific `.gitattributes` lines* — **rejected** on ruling 4: one pattern covers both
and every successor. *Edit only `:129`* — **rejected** on ruling 5: it arms an enforcement point and
blinds its own trace in the same commit. *Leave the exit rule as an enumeration* — **rejected** on ruling
6: a list cannot answer for a case nobody listed.

**Invariant.** The mesh dispatch argv carries no `--level`; exactly one program literal exists in the
milestone and it is the compiled declaration's; a story-shaped ref on the autonomous phase is refused
before a directive is sent; every `.aof/**` bundle asset target is `eol=lf` pinned; the fourth
enforcement point is traced rather than counted; exit code turns on whether a resolution exists; a fact
never supplied is refused as absent rather than rendered as failed; and no module in the trigger family
reads a feedback record's body, classification included. (Enforced by `FF-6302`, `FF-6303`, `FF-6304`,
`FF-6305`, `FF-6306`, `FF-6307`.)

---

## ADR-011: The level-less trigger is REAL and is defended at the resolver, not admitted at the compiler; and the FACE PROJECTS the `work:loop` input rather than passing a leaf's answer through

**Status:** Accepted
**Date:** 2026-09-02

**Context.** 63/01's structural review surfaced three questions that ADRs 001-010 leave a builder to
guess at, and all three are cross-story: one is a disagreement between 63/00's delivered compiler and
63/01's delivered task matrix, and the other two are constraints on 63/05 that only become visible
once 63/01's answer object exists and one reads it against the seam it will be composed at. None can
be settled in a review verdict, because the story that has to honour them has not been built and will
not read that verdict.

**Decision.**

**1 - A level-less trigger is a REAL shape, `resolveTriggerLevel` must answer for it, and
`compileTriggerDeclaration` must go on refusing it.** Both halves are correct and they are not in
tension. Measured: `src/work-trigger/declaration.mjs:222-231` refuses a member whose `level` is
absent, `null`, empty, or outside `LOOP_LEVELS`, with the coded refusals `trigger-level-missing` and
`trigger-level-unknown` - a delivered 63/00 criterion, immutable. `src/work-trigger/level.mjs:131`
nonetheless defaults an absent level through `resolveLoopLevel` (`src/work-loop.mjs:395`), which is
what 63/01 task 02's first four rows require. So the declaration FILE cannot produce a level-less
trigger, and 63/01's rows for that case are not reachable from `.aof/triggers.jsonc`.

They are still not decorative, for a reason this milestone has already decided: **ADR-010 ruling 1
makes the mesh assignment the one trigger source whose signal carries NO level.** A mesh-sourced
trigger is trigger-shaped and level-less by construction, and 63/04 and 63/05 compose the sources
through the same leaf the declaration path uses. `resolveTriggerLevel`'s contract is `(trigger,
facts)` over a trigger SHAPE, not over a compiled declaration member, and the level-less shape is the
one ADR-010 ruling 1 put into the milestone on purpose.

**The compiler is therefore NOT loosened.** A declaration file is reviewed as a diff, and a member
that omits its level would be a silent request for whatever the loop happens to default to today -
exactly the unreviewed admission ADR-004 exists to refuse. Requiring the level in the FILE while
defaulting it in the RESOLVER is the correct asymmetry: the file must state its request, and the leaf
must answer for a caller that has none.

**2 - The face PROJECTS `{ scope, level, argv }`; it never passes a leaf's answer through. FF-6301's
key set governs the PROJECTION, and it admits the trigger's IDENTITY.** 63/01's leaf answers
`{ triggerId, resolved, level, preflight, resolvedFor, gatedAgainAt }` - the last three because task
00's *"the answer says which moment it belongs to"* demands them, and `triggerId` because ADR-010
ruling 11 demands each affected trigger be refused BY NAME. That object is a PRE-FLIGHT, not a
resolution. Read as a resolution it would break FF-6301's positive key-set on four keys.

It would also not run. Measured, and this is the decisive fact rather than a fitness-function
preference: `src/commands/loop.mjs:1729-1742` declares `work:loop`'s input with
`additionalProperties: false` over `{ scope, level, resume, cap, reviewClaims, dryRun }`. Handing the
leaf's answer through as a `work:loop` input is rejected by the schema before any gate is consulted.
ADR-001 section 1 already said the resolution's whole output is `{ scope, level }` plus the argv
carrying them; ADR-011 states the consequence for the builder: **63/05 composes that object, and a
leaf's answer is an input to the composition, never the composition's output.**

**And FF-6301's key set admits an identity key on the RESOLVED side.** Read literally, *"every key a
resolved trigger emits is `scope`, `level`, or the argv"* forbids naming which trigger produced the
argv - and the fitness register's own task-material note requires *"`aof work trigger --json` lists
each declared trigger with its resolved argv"*, which is unanswerable by an anonymous row. One
identity key is admitted and no other: it names the declaring member, carries no verdict, and is not
part of the `work:loop` input. The FF-6301 row is amended to say so, and the amendment adds no file.

**3 - The face may NOT copy `src/commands/loop.mjs:747`'s `?? null` when it gathers the two facts,
because at the trigger seam that idiom collapses ADR-010 §7's two answers back into one.** Measured:
the loop command builds its gate facts as `{ loopReady: doctor?.loopReady ?? null, groundedness:
groundedness ?? null }`, which is correct THERE - the command asked the registry itself, so a nullish
reading can only mean the registry had nothing. It is wrong at the trigger seam.
`src/work-trigger/level.mjs:145` reads `null` and `undefined` as NOT HANDED IN and answers
`trigger-level-facts-not-supplied`; ADR-010 §11 requires a registry that ANSWERS with an unusable
reading to be a GATE refusal at exit 0. A face that writes `?? null` therefore reports "you did not
give me the readings" for a workspace whose doctor answered and could not compute - sending the
operator to fix the caller instead of the workspace, and moving the case across ruling 6's exit
boundary. **The face passes an answered-but-unusable reading THROUGH as the object the registry
returned**, and reserves absence for a registry it did not ask or that produced no answer at all.
This is the third sighting of one species in this milestone - 63/00's `?? []` finding, ADR-010 §7,
and this - so it is written down rather than left for 63/05 to meet alone.

**Alternatives considered.**

- *Loosen `validateMember` to admit an absent level* - **rejected** on ruling 1: it makes the rung a
  file can request implicit, which is the reviewable-diff property ADR-004 turns on. It would also
  edit a delivered 63/00 criterion.
- *Drop 63/01's absent-level rows as decorative* - **rejected**: ADR-010 ruling 1 put a level-less
  trigger shape into this milestone, so the rows defend a live path.
- *Let 63/05 pass the leaf's answer straight through and widen FF-6301* - **rejected** on ruling 2:
  `work:loop`'s schema refuses it, so the widening would buy a green control over a wire that fails.
- *Strip `triggerId` from the resolved side to satisfy FF-6301 as written* - **rejected**: it makes
  `--json` unable to say which trigger produced a launch, and makes ADR-010 ruling 11's refuse-by-name
  rule true on one side of the answer only.

- *Let the face normalise an unusable reading to `null` for a tidier leaf contract* - **rejected** on
  ruling 3: it is 63/00's `?? []` finding one seam over, and it moves a case across the exit boundary
  ADR-010 ruling 6 states as a cause.

**Invariant.** `compileTriggerDeclaration` refuses a member with no level while `resolveTriggerLevel`
defaults one; the object 63/05 emits per resolved trigger carries only `scope`, `level`, one identity
key and the argv carrying them, and validates against `work:loop`'s declared input; no leaf's
pre-flight answer reaches a launch unprojected; and no gather at the trigger seam turns an answered
reading into an absent one. (Enforced by `FF-6301`, `FF-6303`, `FF-6304`.)

---

## ADR-012: The compiled declaration is INJECTED into the launch seam, never imported — and the obligation that creates lands on 63/03, the story that composes the launch

**Status:** Accepted
**Date:** 2026-09-02

**Extends** ADR-005 §2 (the seam's one branch) and **confirms** ADR-010 §2 (the declaration is the sole
speller). Nothing above is struck; this states the clause ADR-005 §2 assumed and did not write.

**Context, measured at 63/02's structural review.** ADR-005 §2 said the seam "gains ONE branch" and was
silent on *how the compiled artifact reaches it*. The obvious reading — `import { compileFrozenSet } from
"./frozen-set.mjs"` inside `src/agent-session-driver.mjs` — is **forbidden by two delivered controls,
neither of which is in 63/02's write set**: `test/arch/acd-session-driver-mesh-blind.test.mjs:96`
`deepEqual`s the driver's direct source-import set against a frozen `EXPECTED_DIRECT` (an *equality*, so
an addition fails exactly as a removal does) and caps its root-inclusive transitive reach at **24** at
`:100`, whose own message reads *"raising it requires an ADR"*; and
`test/arch/acd-session-driver-single-home.test.mjs:41,84` pins the driver's export set at exactly
**seventeen**. The graph agrees that these two subtrees are meant to stay apart: at this decision point
(`builtAt 2026-09-02T00:28:48Z`, 14,277 nodes / 34,719 edges, egress none)
`aof graph impact` reports `src/agent-session-driver.mjs` with **25 dependents** — only two in `src/`,
`src/commands/drive.mjs` and `src/mesh-worker-execution.mjs` — against **9** outbound, and
`src/frozen-set.mjs` with **12 dependents** (three in `src/`: `claude-settings.mjs`,
`work-acceptor/criterion.mjs`, `work-bundle.mjs`) against **1** outbound. An import would have fused a
2-dependent leaf onto a 3-dependent leaf for one value, through a door a delivered control holds shut.

**Decision.**

**1 — The compiled artifact is an INJECTED input, and the seam owns no reader.** The launch seam takes
`options.declaredLaunch` — the value of `compileFrozenSet(...).unattendedLaunch` — and
`options.unattended`, the caller's *request*. The seam imports nothing new, exports nothing new, reads no
file and spells no token of the declared launch (`src/agent-session-driver.mjs:690-740`). Presence, not
truthiness, decides the branch: `Object.hasOwn(options, "unattended")`, so *"no unattended launch was
asked for"* and *"one was asked for with nothing in it"* stay two answers rather than collapsing onto the
attended path — the milestone's `?? <empty>` species (ADR-011 §3) refused at the one seam where its
consequence is an unattended session nobody asked for.

**2 — RULED: injection satisfies ADR-010 §2 in full.** §2's requirement is that the declaration be the
sole *speller* and that the resolver have nowhere to write a second program literal, not that the seam
*import* the compiler. Injection is the stronger form of the same rule: the seam is a pure function of
its options bag, so a launch it admits was spelled by the declaration that was handed to it and by
nothing else. §2's own sentence — *"the worker composes the launch by handing the compiled declaration a
scope"* — describes injection.

**3 — The forward obligation is 63/03's, not 63/04's.** The build report routed it to 63/04; that is the
wrong story and the correction matters, because 63/04 (`src/work-trigger/sources.mjs`) is a pure leaf
that launches nothing and 63/05's face *"declares no `cli.launch`"* (ADR-003, FF-6301). The one component
that composes an unattended launch is **the worker** — `src/mesh-worker-execution.mjs`, in 63/03's
`files:` set. **63/03 therefore passes `compileFrozenSet(await readFrozenSet(dir)).unattendedLaunch` as
`declaredLaunch` alongside its `unattended` request**, and a caller that omits it receives the coded
refusal `unattended-launch-declaration-not-supplied` rather than a session. 63/03 is unbuilt at the time
of writing, so this arrives before the build rather than after it — which is the whole reason it is an
ADR and not a line in a report 63/03 will never read.

**4 — The three refusal codes are three answers and may not be collapsed.**
`unattended-launch-declaration-not-supplied` (the caller never consulted the declaration),
`unattended-launch-not-declared` (the declaration admits no unattended launch) and
`unattended-launch-refused` (the request is not the declared launch) fail for different reasons and a
caller acts on each differently. They are module-private constants observable on the returned value,
because the driver's export set is the frozen seventeen.

**5 — DELIBERATELY LEFT OPEN, and named so it is not assumed.** Whether an *admitted* unattended launch
is driven through `driveInteractiveClaudeSession`'s PTY, transcript-watch and NEEDS_INPUT machinery — a
path that today accepts the unattended launch object without objection, since it reads only
`launch.bin`/`args`/`env` — is **63/03's decision**, not settled here. ADR-006 forbids touching that
machinery; it does not say whether a loop call should travel through it. 63/03 states the answer.

**Alternatives considered.**

- *Import `frozen-set.mjs` into the seam* — **rejected on measurement**: it fails
  `acd-session-driver-mesh-blind`'s `deepEqual` and pushes the reach ceiling whose own message demands an
  ADR, in two controls 63/02 was not the sole writer of. The design an arch pin forbids is a design that
  needs the pin's ADR, not a quiet ceiling bump.
- *Export a declaration reader from the driver so callers share one wiring helper* — **rejected**: the
  export set is pinned at seventeen and *"an extra export is as much a defect as a missing export"*.
- *Read the installed declaration lazily inside the seam, cached at module scope* — **rejected**: it
  makes the seam impure over its options bag, and ADR-005 §2's byte-identity guarantee for every attended
  launch is only checkable because the seam is a pure function of what it is handed.
- *Leave it in the build report as a note for 63/03's brief* — **rejected**: 63/03's `reads:` set names
  `src/agent-session-driver.mjs` and this milestone's `ARCHITECTURE.md#ADR-006`, and no build report at
  all. An obligation that lives only where the obliged story does not read is an obligation nobody has.

**Invariant.** The launch seam imports no compiler, exports nothing new, spells no token of the declared
launch, and reads the declaration only from `options.declaredLaunch`; an unattended request arriving
without it is `unattended-launch-declaration-not-supplied` and never a session; and every component that
composes an unattended launch supplies `compileFrozenSet(await readFrozenSet(dir)).unattendedLaunch`.
(Enforced by `FF-6305`'s seam leg, landed 2026-09-02, and `FF-6306`'s caller leg.)

---

## ADR-013: The transcript watch is SESSION-SHAPED, so a loop launch must be handed a different one — the composition defect 63/03 exposed, and the three rulings its build asked for

**Status:** Accepted
**Date:** 2026-09-02

**Amends** ADR-006 §4 (what "no completion-detection machinery is edited" does and does not fence — §1)
and the `FF-6306` row (§3, §3a). **Confirms** ADR-012 §5 (§2) and ADR-012 §3's caller-side read (§4).
Nothing above is struck. Every claim below was checked at source at 63/03's structural review.

**1 — THE HAZARD IS REAL, and it is a COMPOSITION defect rather than a defect in 63/03's diff.**
`driveInteractiveClaudeSession` arms the session-id watch over `claudeProjectsDir({ cwd:
brief.worktreeCwd })` (`src/agent-session-driver.mjs:1028-1032`, dir at `:199`) and takes the FIRST NEW
`*.jsonl` basename to appear (`:231-252`). The worker passes `worktreeCwd: worktreePath` and forwards
both watch seams as bare shorthand (`src/mesh-worker-execution.mjs:1756`, `:1771-1772`);
`mesh-launcher.mjs` supplies neither, so production gets the real defaults. The launch carries no level,
so `resolveLoopLevel` defaults to **L2** (`src/work-loop.mjs:396`) and `GATE_ORDER` (`:67-72`) walks
`drive continue`, the gates, then `drive verify` — each rung invoking `work:drive-<phase>`
(`src/commands/loop.mjs:872-873`), which calls the SAME driver with `worktreeCwd:
ctx.workspace.projectRoot` (`src/commands/drive.mjs:266`). The inner `aof` process's cwd IS the worktree
(`workspacePaths(process.cwd())`, `src/workspace.mjs:5-9`), so both resolve the SAME projects
directory. Every attended launch appends `WORKER_SESSION_INSTRUCTION` (`agent-session-driver.mjs:792`),
which carries the `AOF_DIRECTIVE_COMPLETE` producer (`:169-181`) — so the inner session's finished turn
is a DECLARED outcome and the completion watch settles after `DECLARED_COMPLETION_IDLE_MS` = **10
seconds** of quiet on that session's own tree (`:578-582`, `:320`), which arrives at once because the
next rung writes a different transcript. The driver then calls `stopForOutcome({ outcome: "done" })`
(`:1330`), which `term.kill()`s (`:1161-1181`) the PTY running `aof work loop`.

**An unattended mesh run is therefore killed about ten seconds after its FIRST inner session finishes,
and reported `done`** — a premature-done reported as success on a machine nobody is watching, the
failure class `COMPLETION_IDLE_MS`'s own note records the system paying for twice (`:295-316`). It
breaks task 00 (the order is the loop's) and task 04's halt table (a human gate halts on `uat-gate`),
and no `@executable` lane can see it: every lane injects a scripted PTY that exits on the tick after
spawn, so no inner transcript ever appears.

**The fix is CALLER-SIDE and edits no machinery.** The precedent is in the same module, written for the
same class of reason: the resume path already overrides `watchTranscriptSessionId` with an immediate
resolver because *"the default watch looks for a NEW transcript file, which never appears on a resume"*
(`src/mesh-worker-execution.mjs:2331-2340`). A loop launch is the mirror image — the default watch finds
the WRONG new transcript file. **Supplying a seam VALUE appropriate to the launch kind is not "editing
completion detection"; it is using the injection point that machinery already exposes.** ADR-006 §4
fences EDITING those paths and adding a parallel lifecycle; it does not fence handing an injected seam a
different value. This is stated explicitly because 63/03's build read it the other way and was
reasonable to.

**Left to the follow-up, not decided here:** what settles a loop run instead. The loop PROCESS exits
(unlike an interactive `claude`, which is why the transcript watch exists at all), so `term.onExit` and
its exit code are available — but mapping a `LOOP_STOPS` halt onto `done`/`failed`/`needs-input` has a
wrong answer (a `uat-gate` halt reported `failed` is not the same fact) and needs a lane whose PTY is
not a script that exits immediately.

**Routing.** **Not TECH_DEBT** — debt is what you schedule; this is the milestone's live wake not
working. **A follow-up story in 63**, which cannot be 63/03: the fix's shape is forbidden by 63/03's own
task 04 (the six seam forwards are pinned as bare shorthand) and by `FF-6306` as delivered. **63/03 may
MERGE with this open** — no permissible edit inside it fixes this, and the follow-up must build on its
landing. **The block sits at the MILESTONE gate: 63 is not acceptable while this is open**, because
63/SPEC's live wake would ship terminating after one rung.

**2 — ADR-012 §5 is RATIFIED IN FULL: an admitted unattended launch travels the PTY, transcript and
NEEDS_INPUT machinery, with only `{bin, args, env}` and two options-bag keys differing.** All three
grounds hold at source. Task 04's first Scenario Outline drives each situation on a session assignment
*and again on an autonomous one* and requires the two to answer identically, naming the terminal spawn,
the env scrubbing and the output chunking — so routing the loop AROUND that machinery would break the
contract, not honour it. ADR-006's Alternatives reject a second execution kind as *"dispatch topology by
another name"*, verbatim, and task 04's prose repeats it. And the NEEDS_INPUT asymmetry is genuinely
passive: `resolveInteractiveDriverLaunch` returns from the unattended branch at
`src/agent-session-driver.mjs:768-770`, **before** the argv builder at `:792` that appends the
sentinel's only producer — *not produced*, never produced-and-missed. §1 does not weaken this: the
launch still travels the same seam and lifecycle; §1 changes one INPUT to it, for one launch kind, at
the one caller that knows the kind.

**3 — `FF-6306`'s out-of-scope fence is CORRECTLY STRUCTURAL, and its diff-shaped specification was a
defect in this register.** The row asked for *"a self-comparison of those regions against HEAD"* — true
while a story is unmerged and **vacuously true the moment it merges**, which is exactly when the fence
must hold. The builder implemented the structural form instead
(`test/arch/acd-assignment-resolves-to-a-loop-call.test.mjs:321-356`), drove both detectors against
plants (`:359-370`), and pinned the false negative it found (a naive shorthand regex reads the trailing
identifier of a conditional forward as a shorthand and passes the plant — hence the helper rather than
an inline regex per call site). **Ratified; the row is amended.** THE RULE, for every row here: **a
fitness function asserts a property of the TREE, never a property of the DIFF. "Compare against HEAD" in
a control specification is a defect, because HEAD is what the control becomes part of.**

**3a — And the fence leg gains ONE named exception, in advance of §1's fix.** Of the six fenced
forwards, `watchTranscriptSessionId` and `watchTranscriptCompletion` — and only those two — may become
launch-conditional, solely to supply a loop-shaped watch. The invariant the leg protects is that **no
launch DECISION reaches the fenced machinery**; choosing which injected watch a launch kind receives is
not such a decision. `ptySpawn`, `which`, `onOutputChunk` and `onSessionEnd` stay unconditional. 63/03's
delivered control is STRICTER (all six bare) and stays green; the follow-up relaxes exactly two and owes
the red probe for the relaxed form.

**4 — Reading the declaration from the WORKER'S OWN WORKSPACE ROOT rather than the dispatched worktree
is CORRECT, and being security-shaped it belongs in an ADR — this one.**
`composeDirectiveLaunchOptions(directiveLaunch, ws.projectRoot)`
(`src/mesh-worker-execution.mjs:1521`) reads `<projectRoot>/.aof/frozen-set.jsonc`
(`src/frozen-set.mjs:65-81`), with `ws` just repointed at the assigned workspace's own checkout
(`:1498-1508`). Reading it from the minted worktree instead would let the declaration that says WHAT MAY
RUN UNATTENDED arrive on the branch being dispatched — a branch widening its own launch envelope in the
same push that exploits it, i.e. the enforcement point enforcing whatever its subject says. **The
reduction is real but not hermetic, and the boundary is stated so it is not over-read:** the workspace
checkout is itself a working tree carrying a tracked `.aof/frozen-set.jsonc`, so this moves the trust
from *the branch under dispatch, chosen per assignment* to *the checkout's own branch, moved only by
this worker's clone/fetch* — reviewed state rather than proposed state. **Discharge condition** if that
is ever not enough: read the declaration from the INSTALLED framework copy rather than any working tree,
which changes `readFrozenSet`'s contract and is its own ADR.

**Alternatives considered.**

- *Ledger §1 as TECH_DEBT* — **rejected**: the live wake terminating after one rung is the feature not
  working, not a cost to schedule; it would accept a milestone on a path that has never completed.
- *Block 63/03's merge on it* — **rejected**: no edit permitted inside 63/03 fixes it, so the block
  strands a correct branch and buys nothing. The gate moves to the milestone.
- *Disarm the watch inside the driver for `options.unattended`* — **rejected**: that IS an edit to the
  machinery ADR-006 §4 fences, and it puts a launch-kind decision inside the seam ADR-012 §1 keeps a
  pure function of its options bag.
- *Route the loop around the PTY/transcript machinery (a second execution kind)* — **rejected** on
  ADR-006's own Alternatives and §2: dispatch topology by another name.
- *Keep the diff-shaped fence beside the structural one* — **rejected**: a control that goes vacuous on
  merge reports green while holding nothing, which ADR-010 §5 already indicted once.

**Invariant.** No component composing an unattended launch hands the driver a transcript watch aimed at
a directory the launched program itself writes sessions into; those two watch forwards are the only
fenced forwards that may be launch-conditional; the declaration an unattended launch is admitted against
is read from the worker's own workspace checkout, never from the dispatched worktree; and no fitness
function in this register asserts a property of a diff. (Enforced by `FF-6306` as amended — §1's leg
lands with the follow-up story that fixes it, not with 63/03.)

---

## ADR-014: The leaf RETYPES three source spellings rather than importing `TRIGGER_SOURCES`, and the coupling is pinned in the CONTROL — because the import would cost the leaf its two-file closure and turn `FF-6307`'s strongest leg from a STRUCTURAL fact into a behavioural one

**Status:** Accepted
**Date:** 2026-09-02

**Extends** ADR-007 §2 (what *"no grammar is authored here"* costs to prove) and **applies** ADR-012's
own precedent from the other side. Nothing above is struck.

**Context, measured at 63/04's structural review.** 63/04's build was told to import an existing
vocabulary rather than retype it, and declined. `src/work-trigger/sources.mjs:94-96` spells `cron`,
`ci-signal` and `feedback-finding` as module-private constants; `src/work-trigger/declaration.mjs:48-53`
already declares all four in `TRIGGER_SOURCES`. On the face of it that is a second copy of a
vocabulary, which TECH_DEBT item 68's species and 66/FF-6604's family-wide ban both indict. **The
import was measured before it was refused, and the measurement is decisive.** Transitive import
closures, computed at source over comment-stripped text:

- `src/work-trigger/sources.mjs` → **2 source files** (itself and `src/work-loop.mjs`), **0** node
  builtins. `src/work-loop.mjs` contains no `import` or `require` statement at all (53's determinism
  contract).
- `src/work-trigger/declaration.mjs` → **14 source files** (`asset-base`, `work-loops`, `work`,
  `loop-bounds`, `workspace`, `paths`, `fs`, `degrade`, `feature-parse`, `mesh-log`, `node-identity`,
  `acceptance-horizon`, `work-loop`, itself), **7** node builtins including `node:fs`,
  `node:fs/promises`, `node:crypto` and `node:os`.

So `import { TRIGGER_SOURCES } from "./declaration.mjs"` moves the leaf from **2 files / 0 builtins**
to **15 files / 7 builtins, one of which is `node:fs`**. Two delivered claims are paid for out of that
difference. `FF-6307/8` proves *"the leaf performs no filesystem read at all"* **structurally** —
`moduleSpecifiers(leaf) === ["../work-loop.mjs"]` and `moduleSpecifiers(work-loop) === []`
(`test/arch/acd-trigger-never-classifies.test.mjs:456-458`) — and with `node:fs` in the closure that
argument is gone; what replaces it is a runtime spy over `fs`, which asserts *this call did not read*
rather than *no call can*. And task 03's movement rows copy the leaf beside a patched
`src/work-loop.mjs` into a scratch tree (`test/trigger-sources.test.mjs:919-946`); with the import
they must copy fifteen files, including `asset-base.mjs`, whose bundle-asset resolution is the kind of
load-time work a two-file copy exists to avoid.

**The graph was consulted and is NOT the ground for this.** At this decision point
(`builtAt 2026-09-02T10:02:39Z`, 14,377 nodes / 34,981 edges, backend none, egress none,
`unchanged: false`, artifact under the 63/04 worktree) `aof graph impact` reports `src/work-loop.mjs`
with an outbound edge to `src/loop-progress.mjs` — **which does not exist in code.** Its only two
occurrences are prose, at `src/work-loop.mjs:7` (quoting the import 69/06 *removed*) and `:265`. It
also reports `src/work-trigger/declaration.mjs → test/arch/acd-migrate-command-cli-bijection.test.mjs`,
a src module importing a test. **Both are comment-derived, and this class of phantom has now misled a
reviewer three times in this milestone.** The closure figures above were taken at source. The graph's
*useful* readings here are the ones it cannot invent: `src/work-trigger/sources.mjs` has **2
dependents, both its own test files**, and `src/work-loop.mjs` has **36** — the leaf is a true leaf,
and the module it depends on is this milestone's most-depended-upon decider.

**Decision.**

**1 — RATIFIED: the three spellings are retyped, and this is not the duplication item 68 indicts.**
The prohibition those rules carry is against a second *authority* — two places a reader must keep in
step, either of which could be wrong. That is not the shape here. The leaf does not hold a **set**: it
holds three dispatch **keys**, and `SIGNAL_SOURCES` is DERIVED from the dispatch table
(`sources.mjs:302-308`), not declared beside it, so *"a source added and not wired, or wired and not
named"* is unrepresentable. The declaration remains the sole home of the trigger source vocabulary;
this module answers for three of its members and says so.

**2 — The coupling is asserted where an assertion is possible, and MEMBERSHIP IS NOT DISPATCH.**
`test/trigger-sources.test.mjs:1004-1050` imports **both** modules and pins
`SIGNAL_SOURCES ⊆ TRIGGER_SOURCES` with the complement asserted to be exactly `["mesh-assignment"]` —
so a source added to the declaration and not answered for here, or renamed in either place, fails. It
then drives the **dispatcher** over every member of `SIGNAL_SOURCES` and over five names outside it,
because a set-membership pin says nothing about whether the name reaches a function; that is 63/03's
own lesson applied by the story that came after it.

**3 — THE GENERAL RULE, so the next reader does not "fix" this by adding the import.** A one-home
import may be replaced by a retyped spelling **only** when all three hold, and 63/04 is the worked
example rather than an exception: (a) importing would cost a **declared control its structural form**,
measured, not asserted; (b) a control imports **both** modules and pins the relation between them,
including the complement, so the two spellings cannot drift silently; and (c) the retyping module
**derives** its own vocabulary from the structure that uses it, so it holds no second list to maintain.
Absent any of the three, the import is required and item 68's rule stands unqualified.

**4 — `FF-6307`'s two deliberately-scoped bans are RATIFIED, and the register row is amended to say
so.** `verdict` is not banned family-wide because `src/work-trigger/level.mjs:191` legitimately renders
the *gate's* groundedness component verdict — a different noun from a finding's classification — and
`/^`, `$/`, `.replace(` and `.trim(` are banned in the LEAF only because
`src/work-trigger/declaration.mjs:104` legitimately holds the one-line JSONC banner stripper. The
alternative the builder rejected — a per-file exclusion census inside the control — is **exactly
TECH_DEBT item 81 form 1**, a closed literal keyed to a growing set, in the one control that
deliberately *discovers* its family rather than listing it
(`test/arch/acd-trigger-never-classifies.test.mjs:89-96`). The scoping is correct and so is the
reasoning. **What is owed is that any future widening use a DERIVED partition** — a property the tree
answers, such as *"a family module whose closure holds no `node:fs`"* — never a named list of files.

**Alternatives considered.**

- *Import `TRIGGER_SOURCES` and keep everything else* — **rejected on measurement**: it trades a
  structural proof for a behavioural one, and a two-file movement fixture for a fifteen-file one, to
  remove a duplication a control already pins in both directions. ADR-012 refused an import a delivered
  pin forbade; this refuses an import that would **dissolve the pin this story is landing**, which is
  the same ruling read from the other end.
- *Move `TRIGGER_SOURCES` into `src/work-loop.mjs` so both can import it* — **rejected**: it puts a
  trigger vocabulary inside the loop decider, which ADR-002 §4's invariant forbids, and would leave
  `FF-6302`'s sweep unable to tell a leak from a home.
- *Split a third module holding only the four spellings* — **rejected**: a fourth file in
  `src/work-trigger/` whose whole content is one frozen array, to serve one importer that derives its
  own three from a dispatch table it already has. The control that pins the relation costs no file.
- *Say nothing and leave it to the build report* — **rejected** on ADR-012 §3's precedent: the reader
  who would "fix" this is a later story that reads this register and `src/`, and never a report.

**Invariant.** `src/work-trigger/sources.mjs`'s import closure is `["../work-loop.mjs"]` and that
module's is empty; `SIGNAL_SOURCES` is derived from the dispatch table rather than declared; a control
imports both `sources.mjs` and `declaration.mjs` and pins `SIGNAL_SOURCES ⊆ TRIGGER_SOURCES` with the
complement named and every member driven through the dispatcher; and no ban in `FF-6307` is narrowed by
a named list of files. (Enforced by `FF-6307` legs 4 and 8, and by `test/trigger-sources.test.mjs`'s
declared-source row.)

---

## ADR-015: The face's seven rulings — the unscoped gate reading is RATIFIED and ADR-004 §1's citation amended; `FF-6303`'s timer clause is a RATCHET; the fire-time scope re-decision stands with its only defender named; and two prose invariants gain the legs that hold them

**Status:** Accepted
**Date:** 2026-09-02

**Amends** ADR-004 §1 (its citation, not its rule) and **completes** ADR-011 §3 (the mechanism that
ADR argues from does not currently bite). **Extends** the `FF-6301` and `FF-6303` rows. No row gains
a file, so ADR-009 §4's eight paths and the register↔`files:` correspondence are unchanged, and all
three of 63/05's markers stay `pending` — they flip when the story MERGES, which is the rule
ADR-012's round stated once for every remaining row.

**Context.** 63/05 is the milestone's one convergence and the first story in a position to RUN the
family rather than reason about it. Its build routed three questions here; four more were measured at
its structural review. All seven were decided over a graph built at this decision point
(`builtAt 2026-09-02T11:23:23Z`, 14,467 nodes / 35,230 edges, egress none) and, where a control was
in question, by mutation — restored by content, verified by digest, one fresh process per mutation,
after the harness failures ADR-013's round and this story's own build both paid for.

**Decision.**

**1 — RATIFIED: the face gathers `work:doctor` UNSCOPED, and ADR-004 §1's *"exactly as
`src/commands/loop.mjs:741-748`"* is amended to mean THROUGH THE REGISTRY AT THE COMMAND BOUNDARY,
never with the loop's own input.** The loop asks `work:doctor` for one scope because it is about to
run over one scope. The face has many, and task 02 requires *"every trigger in one run is decided
against the same two readings"* and *"the report states those readings once for the run"* — which a
per-trigger scoped reading makes impossible by construction. The literal citation and the delivered
contract cannot both hold, and the contract governs. "The workspace's reading" is the noun task 02
itself uses.

The ruling turns on a measured DIRECTION rather than on convenience. Scope narrows `work:doctor` in
exactly two places: `filterFindingsToScope` returns every finding when the scope is absent
(`src/work-doctor.mjs:676-679`), and `baseChecks` filters stories through `inScope`
(`src/work-doctor-loop-ready.mjs:43`). The composed checks take no scope at all. An unscoped reading
is therefore a SUPERSET of every scoped reading's failure surface — `stream-coherent` counts at
least as many error findings, `tasks-authored` at least as many unauthored stories, and the score is
monotone in both. **An unscoped pre-flight can only over-refuse; it can never over-admit.** That is
the only asymmetry a pre-flight may have: ADR-004 §4 already places the authority at `work:loop` and
has it re-exercised at fire time, so a false refusal costs a caller a re-run while a false admission
costs an unattended run nobody declared. Ratified in that direction and in no other — a later face
that narrowed the reading in order to let more triggers resolve would be reversing the sign of this
ruling, and it is refused here in advance.

**2 — `FF-6303`'s clock clause is a RATCHET over the closure, and the row is amended to say so.**
Read absolutely, *"no `setTimeout` … is reachable"* was RED ON ARRIVAL, and the story that had to
implement it is the first party that could know: the family's static import closure holds exactly one
timer — `renameWithRetry`'s bounded backoff at `src/fs.mjs:73` — reached because
`src/work-trigger/declaration.mjs` imports that module to READ a file. It is not a scheduler, and the
module granularity of an import closure is the only reason it is in scope at all. The leg therefore
holds the closure to exactly one timer at that one site, and a second timer anywhere in the closure
fails; driven, and it fires (a planted `setTimeout` in `src/work-loop.mjs` reds it). The absolute
reading is DECLINED, because the only way to satisfy it would be for the family to stop performing
the file read it exists to perform.

**2a — The pin is NARROWED, and that is a required change rather than a preference.** The leg
currently asserts the backoff as a byte-exact expression (`25 * (attempt + 1)`) inside a module with
**52 `src/` dependents** — graph-derived, actual — that this milestone neither owns nor touches. A
legitimate tuning of that constant, which is the Windows rename-contention case the retry exists for,
would red a control named `acd-trigger-holds-no-clock` with a message about triggers and send its
reader hunting a defect in a family that did not change. That is precisely what `FF-6308`'s own row
forbids in another context: *a control that fails for a reason unrelated to what it was written to
catch.* The invariant is **"the one timer in the closure is a bounded retry inside `renameWithRetry`,
not a schedule"**, and the leg is to assert that SHAPE — the site, the enclosing function, a numeric
delay — never the arithmetic.

**3 — RATIFIED, with its only defender named: the fire-time scope re-decision stands, and the
`compiled` seam is a legitimate injection whose contract row is discharged over an input no shipped
caller supplies.** Measured, and this is the fact the ruling has to survive: removing
`decideLoopScope` from `resolveOne` leaves `FF-6301`, `FF-6303` and `FF-6308` ALL GREEN and reds
exactly two behavioural legs, both of which drive the face through `ctx.trigger.compiled`. The branch
is unreachable on both of today's production paths — `compileTriggerDeclaration` refuses an
inadmissible scope for the whole declaration (`src/work-trigger/declaration.mjs:211-219`), and
`resolveTriggerSignal` puts a signal's scope through the same function before the face ever sees it.

It is kept, and the justification is **not** ADR-004 §2 generalised. §2 forbids caching a verdict
about a MOVING fact — anchors, a Loop-Ready score, a groundedness report. `LOOP_SCOPE_FORMS` is a
frozen code constant that cannot move between compile time and fire time within one process, so the
never-cache rule does not reach the scope and the module header's citation of it overstates the case.
The reason that does survive is the one worth writing down: **the argv is composed HERE, so the claim
"every emitted argv carries a scope `LOOP_SCOPE_FORMS` admits" must hold HERE, by construction,
rather than by a control reading two other modules and concluding it.** A validation at the
composition point that is redundant against today's callers is defence in depth, not dead code, and
`ctx.trigger.compiled` is the dependency bag's own existing idiom — the same shape `declaration`,
`registry`, `resolveCommand` and `invoke` already take. It is a contrivance only if one reads the
test as the point; the branch is the point, and the seam is how it is observed.

**3a — What is NOT ratified is the reported content on the SHIPPED path, and this is payable.** Task
03's row *"a declared trigger's scope matches no admitted loop scope form → a code, the scope, and
each admitted form with an example → successfully"* is answered on the injected path and NOT on the
declaration path, where the run exits 1 — correctly, on ADR-010 §6, because no resolution was
produced — carrying only `{ code, member, path, message }`. The compiler already builds
`{ scope, admits }`, `{ source, sources }`, `{ level, levels }` and `{ cadence }` onto the
`TriggerDeclarationError` (`src/work-trigger/declaration.mjs:159-165`, via `Object.assign(this,
details)`), and the face DROPS every one of them at `src/commands/trigger.mjs:452-460`. **The face is to carry the error's own structured
details through into `failure`.** That is the entire distance between the delivered row and the
shipped behaviour that can be paid without touching either a delivered `.feature` or 63/00's
delivered compiler; after it, the conflict is purely about the exit code, which ADR-010 §6 settles as
a cause. A row that is true on an injected input and false on the real one is the shape this
milestone indicts everywhere else, and it is closed here rather than left for accept to discover.

**4 — RATIFIED: the ONE identity key may be a NESTED PAIR, and that is not an evasion of ADR-011
§2.** Task 01 requires both *"the id of the trigger it resolved from"* and *"the source that trigger
declares"* present on a resolved trigger, while ADR-011 §2 admits one identity key; the two are
reconcilable only by nesting. Nesting is the right answer rather than the clever one, because the
rule ADR-011 §2 protects is that the PROJECTION validate against `work:loop`'s closed input and that
the row carry no verdict and no second home for a bound the loop already owns. `{ id, source }`
carries neither. And it is BOUNDED rather than trusted: `FF-6301` pins `Object.keys(row.trigger)` to
exactly `["id", "source"]` — driven, and adding a `verdict` key reds it — and pins the row's whole
key set exhaustively, which a planted fifth key also reds. An identity key that could quietly grow a
verdict would have been an evasion; one a control closes is a projection.

**5 — REQUIRED: the level flag the face composes is pinned to the loop's DECLARED flag vocabulary,
because the control that claims to pin it does not.** `src/commands/trigger.mjs:130-133` states that
`acd-trigger-is-a-caller-not-a-coordinator` *"pins it against `work:loop`'s declared flag vocabulary
so a renamed flag cannot leave this face composing an argv the loop refuses."* It does not, and the
absence is measured in both directions: renaming `LEVEL_FLAG` leaves `FF-6301`, `FF-6303` and
`FF-6308` all green, and renaming the LOOP's own declared `level` flag key leaves them green too —
caught only by a behavioural leg that happens to dereference `cli.spec.flags.level.description`
(`test/trigger-command.test.mjs:989`) while checking something else entirely. A comment asserting a
control that does not exist is this milestone's own measured species, and the register already
carries `FF-6305`'s *"report as enforced while holding nothing"*. It is worse than silence here,
because the next reader who tidies that incidental assertion into a proper `LOOP_LEVELS` read would
remove the only thing standing there and would not know it. **`FF-6301` gains the leg:** the token
the face composes is read back from `getCommand("work:loop").cli.spec.flags`, so the flag and the
input key it carries are one fact and the argv a caller is handed stays one the loop accepts.

**6 — REQUIRED, and it is the SIXTH sighting: the no-coercion rule at the gather is given a leg, and
ADR-011 §3's stated mechanism is recorded as not yet biting.** The face is CORRECT —
`facts[reading.fact] = reading.read(answer)`, no `??`, `undefined` included, with `present` as the
discriminator that survives JSON and no `null` stand-in anywhere. But **nothing enforces it**:
writing the exact idiom ADR-011 §3 forbids (`value ?? null`) leaves all three controls and the whole
behavioural suite green. The reason it is inert deserves recording rather than being left for the
seventh sighting: `src/work-trigger/level.mjs:145` reads `undefined` and `null` as ONE answer, so the
difference ADR-011 §3 argues from — *"reports 'you did not give me the readings' for a workspace
whose doctor answered and could not compute"* — has no downstream consequence today. The rule is
right and its mechanism is not yet load-bearing, which is exactly the state in which a rule is
undone by a tidy-up nobody reviews as a decision. **`FF-6301` gains the ban:** no `??`, `\|\|` or `?.`
fallback stands between a gate reading as the registry returned it and the leaf, driven against a
plant. This is the control 63's own STATE.md asked for after the fifth sighting, landed at the seam
where the sixth appeared rather than as another paragraph.

**7 — CONFIRMED, and it is a SCOPE rather than a hole: `work:trigger` needs no `/aof:trigger` bundle
command and no edit to the parity control.** Measured at source:
`test/arch/acd-work-insert-command-bundle-parity.test.mjs:24-26` derives its whole domain from
`listCommands().filter((command) => command.id.startsWith("work:insert-"))`, so `work:trigger` is
outside it by construction. The story pinned that claim positively rather than trusting it — every
`work:insert-*` command is asserted to still ship its wrapper, so the exemption cannot silently
become a hole — and `FF-6301` reads `BOARD_DEFERRED` from the control that declares it rather than
retyping the set. ADR-008 §6 and §7 hold exactly as written.

**Alternatives considered.**

- *Have the face gather `work:doctor` once per distinct declared scope* — **rejected** on ruling 1:
  it breaks task 02's *"the report states those readings once for the run"*, and it makes the number
  of work-tree walks a function of the declaration's size, which is the cost ADR-008 §7 board-defers
  this command to avoid in the first place.
- *Keep ADR-004 §1's citation literal and overturn the deviation* — **rejected**: the citation names
  an implementation line to be imitated, while the RULE it stands for — gate facts gathered at the
  command boundary through the registry, never read from disk by the leaf — is honoured exactly.
- *Read `FF-6303`'s timer clause absolutely and drop `src/fs.mjs` from the closure* — **rejected** on
  ruling 2: the only way out of the closure is to stop reading the declaration.
- *Delete the fire-time scope re-decision as dead code* — **rejected** on ruling 3: the property
  would then hold only by inspection of two other modules, at the one place the argv is composed.
- *Delete the `compiled` seam as test-only surface* — **rejected**: it is the dependency bag's own
  idiom and it is what makes the branch observable at all. What is payable is 3a, not the seam.
- *Widen `FF-6301`'s key set to admit `id` and `source` as two top-level keys* — **rejected** on
  ruling 4: two identity keys is the beginning of a list, and the nesting is already closed by a leg.
- *Leave rulings 5 and 6 as prose, since both are true of the delivered code* — **rejected**: both
  are the shape this milestone has now paid for four times, and a true statement nothing checks is
  the state a codebase decays FROM.

**Consequences.** Three amendments land in the register and no new file: `FF-6303`'s timer leg is
restated as a ratchet and its `src/fs.mjs` pin is narrowed to a shape; `FF-6301` gains the declared-
flag pin and the no-coercion ban. One change lands in the face: the compile refusal carries the
compiler's structured details. ADR-004 §1's citation is amended and its rule is untouched. Nothing
here re-opens ADR-011 §2, whose projection ruling is confirmed by measurement rather than merely
honoured.

**Invariant.** The face gathers the two gate readings ONCE per run, unscoped, through the registry,
and hands them on uncoerced; the level flag it composes is read back from `work:loop`'s declared
flags; a compile refusal carries the compiler's own structured details into `failure`; the resolved
row's identity key is a closed `{ id, source }` pair; and the family's import closure holds exactly
one timer, at `renameWithRetry`, asserted as a bounded-retry SHAPE rather than as an arithmetic
expression. (Enforced by `FF-6301` and `FF-6303`.)

---

## ADR-016: What settles a loop run is the process EXIT it already has — the one question ADR-013 §1 left open, answered by taking the delivered mapping rather than authoring a second one

**Status:** Accepted
**Date:** 2026-09-02

**Closes** ADR-013 §1's *"Left to the follow-up, not decided here"*. **Confirms** ADR-013 §3a (the two
relaxed forwards) and ADR-006 §4's fence over the other four. Nothing above is struck.

**1 — The fix is two INJECTED seam VALUES at the one caller that knows the launch kind, and nothing
else.** `loopShapedTranscriptWatch(launchOptions)` (`src/mesh-worker-execution.mjs`) answers `null` for
every session launch and, for an unattended loop, supplies both watch seams as functions that resolve
`null`. Each is the driver's OWN documented no-op on that seam: a null session id skips
`onSessionIdCaptured` and never arms the completion watch (`src/agent-session-driver.mjs:1051-1060`,
`:1298`), and a null completion result is ignored (`:1329`). No line of `agent-session-driver.mjs` moves,
no parallel lifecycle is added, and the launch still travels the same PTY, streaming, withdraw and
NEEDS_INPUT machinery.

**2 — Settlement falls through to `term.onExit`, and the delivered mapping is TAKEN rather than
replaced.** ADR-013 worried that *"mapping a `LOOP_STOPS` halt onto `done`/`failed`/`needs-input` has a
wrong answer (a `uat-gate` halt reported `failed` is not the same fact)"*. Measured: `aof work loop`
sets no exit code, so a completed walk and a halt both exit 0, and `:1211-1214` settles exit-0 as `done`
and non-zero as `failed`/`agent_error`. **That is the right answer, because `done` on an assignment has
never meant "the item is complete".** It means *this dispatch ended normally* — exactly what it already
means for a session that ends without the sentinel, and exactly what a halted loop did: it walked to a
declared stop, left the item's own status telling the truth, and left `aof work loop <scope> --resume`
as the continuation. The wrong answer ADR-013 named was reporting a halt as `failed`; nothing here does.

**Therefore no thirteenth stop, no new completion signal, and no halt vocabulary in the mesh files.**
Reading the loop's terminal line out of the output stream to classify its stop was **rejected**: it is
output-scraping, it is the second completion signal `FF-6306` bans by name, and it would put
`LOOP_STOPS` spellings in a mesh module that must hold none.

**3 — An INJECTED seam wins over the loop shape.** What the loop shape replaces is the SESSION-SHAPED
DEFAULT the driver would otherwise reach; a caller supplying its own watch keeps it. The alternative —
the launch kind overriding a supplied producer — makes an injected seam inert for one kind of run, which
is the F12 species (*"a producer reachable only through the test-injection spread is one revision from
being inert"*) pointed the other way, in the one place this milestone can least afford it.

**4 — The observability cost is REAL, is named, and is a gap rather than a silence.** With no session
id, this run's terminal frames carry a null tuple and the fleet mirror drops them (ADR-014 invariant 4),
so an unattended loop is not visible in the terminal view. That trades a FALSE binding — frames stamped
with an inner session's id, on a run killed ten seconds in — for no binding, which is the honest state:
a loop PROCESS has no claude session id. **Inventing one** (the run id, the assignment id) was rejected:
the seam's contract is *the session id a transcript is written under*, and a synthetic value there is
written onto the run record by `captureSessionIdOnRecord` and read downstream as if a transcript
existed. Routing an unattended loop's output is its own arc; it is recorded as an open gap on 63/06's
`OUTCOME.md` with its discharge condition, not smuggled in here.

**5 — The sink's shrink-only line ratchet moves from 2462 to 2482, and that is this ADR's decision
rather than the diff's.** `FF-5302`'s ceiling says in terms that raising it is an ADR decision; ADR-013
§1 routes this fix to the CALLER that knows the launch kind, and that caller is this sink, so twenty
lines is the smallest place the fix can live. The prose that would have doubled it is here instead —
TECH_DEBT item 84's rule applied to this file rather than to the registry. **No headroom is taken**: the
new ceiling is the measured count, so the next line still has to come back here and be argued for. The
file remains a 54-dependent god-node carried by TECH_DEBT item 83, and a ratchet that only ever moves up
is the evidence that entry exists to hold.

**Invariant.** No component composing an unattended launch hands the driver a transcript watch aimed at
a directory the launched program itself writes sessions into; exactly two forwards may be
launch-conditional and each takes exactly one expression — the injected seam, else the loop shape; an
unattended loop run settles on its own process exit through the delivered mapping, with no new stop,
completion signal or halt vocabulary anywhere in the mesh files. (Enforced by `FF-6306`.)

---

## Fitness functions

<!-- Each structural invariant from an ADR, paired with the arch-test that enforces it in CI.
     The arch-test lands with its subject story, so `pending` clears story by story.
     `pending` reports at warn while 63 is open and is NOT admitted at accept — `aof work doctor 63`
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
       · "no config key, env var or flag admits L3" — 55/FF-5508 walks all of `src/**`; ADR-004 §5
         names it and is discharged there.
       · "no second `R<n>` / `ADR-NNN` heading grammar" — 66/FF-6604 walks all of `src/`.
       · "no eighth core command declaring `--strict`" — 59/FF-5911 asserts a CLOSED set over the
         registry, so `trigger` declaring one fails there rather than here.
       · "every compiled frozen rule traces to the member that declared it" — 55/FF-5505 already
         asserts it over the whole declaration, and it keeps asserting it once the fourth point
         compiles; FF-6305 asserts only what CHANGES.
     Each is named in the ADR whose invariant it discharges; none is a gap.

     ONE ROW, ONE CONTROL FILE, ONE RED PROBE — and THREE ROWS LAND ON THE FACE (63/05). Eight rows
     name eight distinct paths, and ADR-009 §4's `files:` sets name exactly those eight; a row whose
     file no story creates is a declaration nobody can honour, which is the defect this note exists
     to have already fixed. FF-6301, FF-6303 and FF-6308 are 63/05's, and the reason is structural
     rather than a matter of load-balancing: the first two are FAMILY-WIDE claims over
     `src/work-trigger/**` AND the face together, and the third is over the shipped declaration —
     none is evaluable until stage 2 composes the family, so a stage-1 leaf declaring any of them
     would be declaring a control it could not clear (62/ADR-013 §7's lesson, and ADR-009 §3 states
     the distribution). The other five sit on the story that writes their subject.

     Two rows were NOT merged onto one file to make the arithmetic tidier. FF-6301 asks whether the
     family coordinates; FF-6303 asks whether it holds a clock or writes. They fail for different
     reasons and their red probes mutate different things, and a shared control file would make one
     probe's red indistinguishable from the other's.

     Each stage-1 control keeps every leg it can prove over its own module and over PLANTED fixtures,
     including its own non-vacuity; what moved to stage 2 is only the claim about the REAL tree.

     AMENDED 2026-09-01 at the Three Amigos pass (ADR-010). Six rows gained legs and NONE gained a
     file, so the eight paths above are unchanged and the register↔`files:` correspondence still
     holds one-to-one. The amendments are: FF-6302's eol ratchet (§4a), FF-6303's exit rule restated
     as a CAUSE rather than an enumeration (§6), FF-6304's supplied-vs-failed and unusable-reading
     legs (§7, §11), FF-6305's trace-the-fourth-point and one-program-literal legs (§2, §5),
     FF-6306's no-program-no-level and story-ref-refused-at-dispatch legs (§1, §2, §3), and
     FF-6307's classification-record and driver-ref-resolves legs (§9, §10).

     AMENDED AGAIN 2026-09-02, at 63/01's structural review (ADR-011 §2). ONE row gained a clause and
     no row gained a file, so the eight paths are unchanged and the register↔`files:` correspondence
     still holds one-to-one. FF-6301's output-shape leg now names its SUBJECT — the object the FACE
     PROJECTS, never a leaf's pre-flight answer — admits ONE identity key, and asserts the projection
     against `work:loop`'s own declared input. This was findable only the way it was found: by reading
     63/01's delivered answer object against a control declared for a story not yet built, where the
     leaf's `{ triggerId, resolved, level, preflight, resolvedFor, gatedAgainAt }` would have broken
     the leg on four keys at stage 2. FF-6304 is unchanged and is NOT re-opened.

     AMENDED AGAIN 2026-09-02, at 63/02's structural review (ADR-012). TWO rows gained clauses and no
     row gained a file, so the eight paths are unchanged and the register<->`files:` correspondence
     still holds one-to-one. FF-6305 gains the seam-consults-rather-than-imports leg and, more
     importantly, NAMES THE RESIDUE its one-program-literal leg cannot cover: the delivered control
     bans the launch as an ADJACENT literal run, which is the only tree-wide form that is keepable
     (`src/graph-faces.mjs:47` spells `"aof"` as a program and `src/commands/loop.mjs:1746` holds
     `["work", "loop"]`, so a blanket ban reds eleven unrelated files) but which cannot see
     `{ program: "aof", args: [...] }` — the exact shape ADR-010 §2 struck from ADR-006 §2. A narrowing
     that is sound only because another row covers the residue must SAY which row: FF-6306 therefore
     gains that leg in the form the defect would actually take, plus the caller-side obligation
     ADR-012 §3 places on 63/03. FF-6305 KEEPS its `pending` marker: the file is built and green on
     `aof/mesh/63-02` but is NOT on the milestone branch, and `aof work doctor 63` proves the
     difference — clearing the marker early turns that row's `control-unresolved` from a WARN into an
     unmarked ERROR. This is 63/01's review recording the same rule for FF-6304, and the architect
     re-made the mistake here before doctor caught it. THE RULE, stated once for every remaining row:
     a control's marker flips when its story MERGES, never when its story is reviewed, and the row
     says so in its own cell so the next reader does not have to re-derive it.

     AMENDED AGAIN 2026-09-02, at 63/03's structural review (ADR-013). ONE row gained clauses and no
     row gained a file, so the eight paths are unchanged and the register<->`files:` correspondence
     still holds one-to-one. FF-6306's out-of-scope fence is restated STRUCTURALLY: its original
     wording asked for "a self-comparison of those regions against HEAD", which is a property of the
     DIFF and goes VACUOUS on merge — the one moment the fence has to hold. The builder implemented
     the structural form, drove it against a plant and pinned the plant's false negative, and the row
     now says what the control actually asserts. THE RULE, for every row in this register: a fitness
     function asserts a property of the TREE, never a property of the DIFF; "compare against HEAD" in
     a control specification is a defect, because HEAD is what the control becomes part of. The same
     row also gains ADR-013 §3a's named exception (two transcript-watch forwards may be
     launch-conditional, and no other forward may) and ADR-013 §1's leg, which lands with the
     FOLLOW-UP story rather than with 63/03. FF-6306 KEEPS its `pending` marker and now carries the
     flips-at-merge rule in its own cell, as FF-6305's did.

     FF-6305's trace leg is the one to read twice: the delivered arch pin it widens holds a LOCAL
     three-entry enforcement-point map and skips every member outside it, so the cheapest conforming
     edit would have armed the fourth point and blinded its own trace in one commit. The control that
     file's header describes itself as having been re-aimed to be would have gone green holding
     nothing. That is why ADR-010 §5 corrects ADR-005 §4 rather than merely elaborating it.

     NOT here (these are task .feature material — observable behaviour over the real seam):
     "`aof work trigger --json` lists each declared trigger with its resolved argv", "a trigger
     declaring L3 on an ungrounded workspace is refused naming the failing half", "an unknown source
     is refused by name and the message lists the sources that exist", "an assignment on the
     autonomous phase dispatches a loop launch", "a cadence faster than the loop it wakes is
     reported as a contradiction", "a signal naming a story is refused with the driver it belongs to
     named".      AMENDED AGAIN 2026-09-02, at 63/05's structural review (ADR-015). TWO rows gained clauses
     and no row gained a file, so the eight paths are unchanged and the register<->`files:`
     correspondence still holds one-to-one; all three of 63/05's markers KEEP their `pending`,
     because a marker flips when its story MERGES and not when it is reviewed. FF-6303's timer
     clause is restated as the RATCHET it had to be built as — the closure holds one
     `setTimeout`, `renameWithRetry`'s bounded backoff, reached through the file READ the family
     exists to perform — and its cross-module pin is narrowed from an arithmetic expression to a
     shape. FF-6301 gains the two legs ADR-015 §§5-6 require, and BOTH were found the same way:
     by mutating the delivered code and watching every control stay green. THE RULE THIS ROUND
     ADDS, for every row here: a register clause quantified over a CLOSURE is a hypothesis until
     someone walks it, and the story that implements the row is the first party in a position to
     falsify it — the third such defect this milestone found only at implementation time, after
     FF-6306's diff-shaped fence and FF-6305's unassertable one-program-literal claim. AND ITS
     COROLLARY, which cost two legs here: a COMMENT in the code naming the control that pins it
     is not a pin, and it is worse than silence — the next reader who tidies the incidental
     assertion that happened to be standing there removes the only thing standing there. -->

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-6301 | **The trigger layer is a caller, not a coordinator — asserted as four absences and one output shape.** No module under `src/work-trigger/` and not `src/commands/trigger.mjs` contains: a process spawn or exec of any spelling (`child_process`, `spawn`, `exec`, `execFile`, `fork`, `node-pty`); a phase drive or any member of the phase vocabulary used as a directive; any gate arithmetic (a score comparison, a threshold, a groundedness predicate); or a slash-command literal — asserted as the absence of any `/aof:` token anywhere in the family, which is the one spelling that would make a trigger a prompt author. The resolution's output shape is asserted **positively and exhaustively**: every key a resolved trigger emits is `scope`, `level`, or the argv carrying them, and the argv's leading tokens are `work loop`, so a resolution that reached any other command fails here rather than at review. **The subject of this leg is the object the FACE PROJECTS, plus ONE identity key naming the declaring member and no other** (ADR-011 §2): a leaf's pre-flight answer is an INPUT to the composition and never its output, so the projection is additionally asserted to VALIDATE against `work:loop`'s own declared input (`src/commands/loop.mjs:1729-1742`, `additionalProperties: false` over `{ scope, level, resume, cap, reviewClaims, dryRun }`) — a face that passed 63/01's answer through fails here rather than on the wire, and an anonymous resolved row fails the `--json` claim that lists each declared trigger with its resolved argv. **The level flag the face composes is READ BACK from `work:loop`'s declared flags** (ADR-015 §5, amending this row after the claim `src/commands/trigger.mjs:130-133` makes about this control was measured FALSE in both directions — renaming `LEVEL_FLAG`, and renaming the loop's own `level` flag key, each left every control green): the token in the argv and the input key it carries are ONE fact, taken from `getCommand("work:loop").cli.spec.flags`, so a renamed flag cannot leave this face composing an argv the loop refuses. **And no fallback stands between a gate reading as the registry returned it and the leaf** (ADR-015 §6): the gather spells no `??`, `\|\|` or `?.` fallback over `reading.read(answer)`, driven against a plant — the delivered code is correct and NOTHING held it, which is this milestone's `?? <empty>` species at its SIXTH sighting and the control 63's own STATE.md asked for after the fifth. `work:trigger` declares **no `cli.launch`**, asserted from the registered command object rather than from source text, and is present in `BOARD_DEFERRED`. The static-import ban on `src/command-core.mjs` covers the **whole family**, not the face alone (62/ADR-013 §2's measurement — a leaf closes the registry ring exactly as well as a face does), asserted with a fresh `node -e 'import("<module>")'` process **per module**, which is the only probe that sees this class because every suite reaches these modules through a warmed cache. | `test/arch/acd-trigger-is-a-caller-not-a-coordinator.test.mjs` | ADR-001, ADR-003 §2, ADR-007 §3, ADR-011 §2 |
| FF-6302 | **The declaration is data with one compiler and one home, and no grammar is written twice.** Exactly one module under `src/work-trigger/` parses the declaration; a member that fails validation raises a coded refusal and **no partially-compiled set is ever returned** — asserted by planting one bad member among good ones and requiring the whole compile to refuse, which is 55/ADR-004 §4's rule and the difference between a frozen set and a folder of scripts. No cadence regex, duration-unit table or `periodic:`/`event:` literal is authored in the family: the grammar is reached through the **imported** `parseCadence`, asserted by import **and** by the absence of any equivalent literal, so a re-home reaching only one half is caught. `src/work-loops.mjs`'s namespace census is asserted as a **census, not a count** — the exported names are compared as a sorted list, and the frozen-SET subset is separately asserted to be **eleven**, so the delivered *"no twelfth set is exported"* criterion is proven rather than assumed while the additive FUNCTION is admitted; this is the shape `loopPointersIn` established one milestone ago and it is followed line-for-line. No trigger source vocabulary appears in that loader at all. The shipped declaration and its installed copy are asserted **byte-identical** and the bundled asset is asserted to be registered as a bundle member with a target under `.aof/`, so a declaration that ships without installing — or installs without shipping — fails here. **The byte-identity leg is asserted over the ATTRIBUTE as well as the bytes, and it is a RATCHET rather than a fix** (ADR-010 §4, §4a): every `.aof/**` target the bundle declares as an asset is covered by an `eol=lf` attribute, driven from the bundle's own asset list rather than from a list of paths kept here, so the N+1th declaration cannot arrive unpinned. This is the **third** instance of one measured species — TECH_DEBT item 8, the `.aof/loops/*.md` pin, and this — and the bytes alone would not catch it: git holds one blob for both copies, so the working-tree mismatch is invisible in a diff and shows up only as a hash the manifest disagrees with, on Windows, never in CI. | `test/arch/acd-trigger-declaration-is-data.test.mjs` | ADR-002, ADR-010 §4, §4a, §8 |
| FF-6303 | **aof holds no clock and no receiver, and the face writes nothing.** No `setInterval`, `setImmediate`, cron-expression evaluator, `node:http`/`node:https` server, `listen(` call or socket bind is reachable from `src/commands/trigger.mjs` or any module under `src/work-trigger/` — asserted statically **and** by a closure walk over the family's own imports, so a timer reached through a helper is caught. **`setTimeout` is a RATCHET over the closure rather than the absolute this row first stated** (ADR-015 §2, amending it: read absolutely the clause was RED ON ARRIVAL, and the story that had to implement it was the first party that could know). The family's own files hold none; the closure holds EXACTLY ONE, and it is `renameWithRetry`'s bounded backoff at `src/fs.mjs:73`, in scope only because `declaration.mjs` imports that module to READ a file — a second timer anywhere in the closure fails, driven and fired against a plant. **The site is pinned as a SHAPE, never as its arithmetic** (ADR-015 §2a): the enclosing function and a numeric delay, because `src/fs.mjs` has 52 `src/` dependents this milestone neither owns nor touches, and a legitimate tuning of that constant must not red a control named `acd-trigger-holds-no-clock` with a message about triggers — which is the defect `FF-6308`'s own row forbids by name. "Writes nothing" is proven the only honest way (53/FF-5306's idiom): snapshot the fixture tree's file list **and every byte**, run the command over it in both faces, assert both identical — a static grep cannot see where a path variable resolves. The command is run **twice** over one tree and nothing accumulates between the runs, so the read claim cannot be satisfied by a write that is merely idempotent. The family declares no `--strict` and no `--dry-run`, and `--json` and the human face render from **one** object. **The exit code is a two-sided rule stated as a CAUSE rather than as a list** (ADR-010 §6, correcting an earlier enumeration that put an unreachable registry on both sides depending on who read it): **a run that produced a resolution exits 0 no matter how many refusals it carries** — driven over an unresolved scope, an ungated level, a refused source and an empty declaration, so no findings gate arrives by the back door — **while a run that produced NO resolution is a failure**, reported first in `--json` and then exited non-zero, driven over an unparseable declaration, an unreachable registry (through a stubbed registry that refuses the id) and an unreadable invocation. A refusal is an answer; an absence of answer is not. The `exit` mapping is asserted to be the single-expression form `src/commands/tune.mjs:590` already ships, so the two sides cannot drift into a per-case table. | `test/arch/acd-trigger-holds-no-clock.test.mjs` | ADR-003, ADR-008 §7, ADR-010 §6 |
| FF-6304 | **A declared level is a ceiling request, and admission stays in one home.** `src/work-trigger/level.mjs` contains no score threshold, no `100`, no groundedness predicate, no component-state literal and no level literal beyond what it imports from `src/work-loop.mjs`; `resolveLoopLevel` and `resolveLoopLevelGate` are reached by import and the gate facts are **handed in**, asserted by the absence of any filesystem read and any `invoke` in the leaf. No compiled trigger carries an admission verdict, asserted over the compiled object's keys, so a declaration-time answer has nowhere to be cached. **The no-silent-downgrade leg is driven positively**: over a fixture whose gate fails, a trigger declaring L3 resolves to a **refusal** whose payload names the failing half — and the resolved set is asserted to contain **no** entry for that trigger at any level, so a downgrade cannot hide as a successful resolution at L2. The refusal's failing-half vocabulary is asserted to come from `resolveLoopLevelGate`'s own object rather than being re-phrased. Resolution is asserted to be a **pure function of the facts handed in**: the same trigger with two different gate readings yields two different answers within one process, which is what "never cached" means operationally. **A fact never SUPPLIED and a fact that FAILED are different answers** (ADR-010 §7): the leaf checks both gate facts are present **before** delegating and reports an absent fact as its own coded refusal naming which one was missing — asserted by handing in an absent reading and a failing reading and requiring the two refusals to differ in code, because `l3ScoreFailure` and `l3GroundednessFailure` render them identically and the leaf is the only place the difference survives. That check is asserted to compute **no** score, threshold or component verdict, so it is a precondition and not the second gate this row forbids. **A registry answering with a reading no gate half can be read from is EXIT 0** (ADR-010 §11): a resolution was produced and its content is a refusal, so each affected trigger is refused by name and carries no resolution at any level — distinguished here from FF-6303's non-zero side, where no resolution was produced at all. *That the whole shipped declaration resolves or refuses is `FF-6308`'s.* | `test/arch/acd-trigger-level-is-a-ceiling.test.mjs` | ADR-004, ADR-010 §7, §11 |
| FF-6305 | **The fourth enforcement point compiles, and every attended launch is byte-identical.** `compileFrozenSet(bundledFrozenSet()).deferred` is **empty** and `installed` contains `gate-order`; `COMPILED_POINTS` equals `FROZEN_ENFORCEMENT_POINTS` in full, asserted against the exported constant rather than against a retyped list of four. The fourth point produces a compiled artifact whose program and argv come **from the declaration**, asserted by changing the declared shape in a fixture and observing the compiled artifact change with it — a compiled value that ignores its member is the defect this whole enforcement point exists to remove. An unattended launch request that does not match the declaration returns a **coded refusal and no launch object**, asserted for a mismatched program and for mismatched argv independently. **Byte-identity for attended launches is the safety leg and is asserted exhaustively**: for the human session, for each of the three single-phase directives and for the resume, `--model`/`--effort` and no-session variants, the resolved `{ bin, args, env }` is compared key-by-key against the same call with the fourth point compiled out, and must be identical — this function is the sole producer of the NEEDS_INPUT sentinel and of two milestones' cache and telemetry decisions, and it has 23 dependents. The re-declared member is asserted to keep its `id`, its `protects` text and its `enforcementPoint`, so the member→point census a delivered guard already pins stays true and is not edited. **The fourth point is TRACED, not merely counted** (ADR-010 §5): the compiled unattended-launch artifact is asserted to carry the id of the member that declared it, and a declared, owned member at that point that reaches no output is a failure — the same trace the other three points already get. This leg exists because the delivered arch pin holds a **local three-entry** enforcement-point map and skips any member outside it, so a build that edited only its `deepEqual` would arm this point and blind its own trace in one commit, going green while tracing nothing — *"report as enforced while holding nothing"*, which that file's own header says it was re-aimed to refuse. **The milestone's ONE program literal is asserted to be the declaration's** (ADR-010 §2): the compiled artifact's program is derived from the declaration and no program spelling appears anywhere in `src/` outside it, so the launch a resolver requests and the launch the frozen set admits cannot disagree. **The seam CONSULTS the declaration and never imports a compiler** (ADR-012 §1): the launch seam's source is asserted to spell no token of the declared launch and to reach the declaration only through its injected `declaredLaunch` option — the leg that makes "the declaration is the sole speller" true of the ADMITTING side as well as the requesting one. **The tree-wide leg is DELIBERATELY NARROWED and its residue is named**: it bans the launch as an adjacent literal sequence rather than banning the program token, because `src/graph-faces.mjs:47` legitimately spells `"aof"` as a program and `src/commands/loop.mjs:1746` legitimately holds `["work", "loop"]`, so a blanket ban would red eleven files that have nothing to do with this point. What the adjacency form cannot see is a second speller that interleaves anything between the tokens — `{ program: "aof", args: ["work", "loop"] }` is the shape ADR-010 §2 struck from ADR-006 §2 and is invisible to it — so that residue is carried by `FF-6306`'s no-program-literal leg over the mesh files, which is where the second speller would actually be authored. | `test/arch/acd-unattended-launch-is-declared.test.mjs` | ADR-005, ADR-010 §2, §5, ADR-012 |
| FF-6306 | **One home maps a phase to a directive, and only the phase with a coordinator changes.** Exactly one module in `src/` contains a `/aof:` slash-command literal for an assignment phase, asserted as a tree-wide sweep — a second speller is the measured defect that built a milestone off the wrong base on 2026-07-27. `assignmentDirectiveCommand`'s four answers are asserted **byte-unchanged** against their delivered strings, so five of its six dependents are provably untouched. Exactly **one** phase resolves to a launch whose program is not a session, and it is `autonomous`; the other three resolve to the session kind, driven from `ASSIGNMENT_PHASES` rather than from a literal list of four so a fifth phase cannot be added silently. The assignment record's key count is asserted unchanged (the frozen ten). **The out-of-scope fence is asserted STRUCTURALLY, over the TREE — never as a self-comparison against HEAD** (ADR-013 §3, amending this row's original diff-shaped wording, which was true only while the story was unmerged and VACUOUSLY TRUE the moment it merged — exactly when the fence must hold): the milestone's write set contains no file under the leasing, reclaim-policy, presence or routing surfaces; the module that OWNS the PTY spawn, the output chunking, the completion detection and the NEEDS_INPUT sentinel (`src/agent-session-driver.mjs`) contains NONE of this story's identifiers, asserted after a non-vacuity check that those four concerns really do live in that file; and inside `src/mesh-worker-execution.mjs` every one of them is still forwarded to the spawn seam as a BARE SHORTHAND KEY that no launch decision reaches, with `deadlinePolicy`/`readHeartbeatAt` — the two forwards that were never shorthand — pinned to their delivered expressions rather than excused from the census. The shorthand detector is driven against a PLANT (a forward turned into a launch-conditional) and the plant additionally pins the FALSE NEGATIVE it exposed: a naive `[\s{,]key\s*,` regex reads the trailing identifier of `key: cond ? a : key,` as a shorthand and passes, which is why the helper exists rather than an inline regex per call site. **TWO forwards — and only two — may become launch-conditional** (ADR-013 §3a): `watchTranscriptSessionId` and `watchTranscriptCompletion`, for the single purpose of supplying a loop-shaped watch, because the invariant this leg protects is that no launch DECISION reaches the fenced machinery and choosing which injected watch a launch kind is handed is not one; `ptySpawn`, `which`, `onOutputChunk` and `onSessionEnd` stay unconditional. **No component composing an unattended launch hands the driver a transcript watch aimed at a directory the launched program itself writes sessions into** (ADR-013 §1, LANDED with 63/06) — the composed loop launch's watch seams are asserted not to be the session-shaped defaults over the run's own worktree, driven over a launch whose program writes a transcript into that worktree, because the delivered composition settled `done` roughly ten seconds after the loop's FIRST inner session and reported success. **The driven leg carries its own POSITIVE CONTROL and that half is load-bearing**: the session-shaped default is run FIRST over that same worktree and must bind the planted inner transcript, because a leg asserting only *"the loop's watch resolves nothing"* would pass equally over an empty directory, a watch that never ran and a seam that was never wired. **The fence is SPLIT rather than shortened** (ADR-013 §3a): `ptySpawn`, `which`, `onOutputChunk` and `onSessionEnd` stay bare shorthand and a FIFTH that stops being one still fails here, while `watchTranscriptSessionId` and `watchTranscriptCompletion` are pinned to the ONE expression they may take — the injected seam, else the loop shape — so *launch-conditional* cannot become *reads a gate*, *reads the declaration* or *picks a program*, driven against three plants including the revert to bare shorthand, which is the shape that reinstates the defect and is this leg's red probe. Settlement is the process exit the loop already has (ADR-016 §2). **No new stop or completion signal is introduced**: `LOOP_STOPS` is asserted equal to 53's frozen twelve, and no halt vocabulary is authored in the mesh files. **The resolver holds NO program literal and NO level** (ADR-010 §1, §2): it returns a scope and nothing else for the loop kind, asserted as the absence of any program spelling and of any `--level` token in the mesh files — the dispatch argv carries no level at all, so `resolveLoopLevel`'s default applies and no carrier exists that 55/FF-5508 could be breached through. **A story-shaped ref on the autonomous phase is refused BEFORE a directive is sent** (ADR-010 §3), asserted two ways: the resolver refuses it with a code, and the dispatch tick is driven over such a row and asserted to send nothing — while the same story-shaped ref on `continue` and on `verify` resolves exactly as today, so the refusal is proven scoped to the one phase rather than a new gate on story assignment. The assign verb's refusal ladder is asserted unedited. **The no-program-literal leg is asserted over the mesh files in the FORM ADR-010 §2 actually forbids, not only as an adjacent token run** (ADR-012 §3): no `program`/`bin`/`command` key in `src/mesh-assignment-directive.mjs`, `src/mesh-assignment-reclaim.mjs` or `src/mesh-worker-execution.mjs` is assigned any string literal, and no template literal in those files interpolates a scope after a command-shaped prefix — because `{ program: "aof", args: [...] }` and `` `aof work loop ${scope}` `` are the two spellings a second speller would actually take, and FF-6305's tree-wide adjacency sweep is blind to both by construction. **The worker SUPPLIES the compiled declaration** (ADR-012 §3): the composed unattended launch is asserted to carry `compileFrozenSet(await readFrozenSet(dir)).unattendedLaunch` as its `declaredLaunch`, driven positively over a workspace whose declaration is installed **and** negatively over a call that omits it, which must produce the `unattended-launch-declaration-not-supplied` refusal and start no process — so "the worker composes the launch by handing the compiled declaration a scope" is proven at the caller rather than assumed from the seam. | `test/arch/acd-assignment-resolves-to-a-loop-call.test.mjs` | ADR-006, ADR-010 §1, §2, §3, ADR-012, ADR-013 |
| FF-6307 | **A triggered wake never classifies, and never invents a scope.** No module under `src/work-trigger/` reads a feedback record's body — **raw capture and later TRIAGE CLASSIFICATION alike** (ADR-010 §9): both `RAW_FEEDBACK_KEYS`'s text field and `FEEDBACK_CLASSIFICATION_KEYS`'s verdict field are asserted **unreachable** from the family, read from their declaring module (`src/feedback-records.mjs`) rather than retyped here so a vocabulary that grows is covered with no edit, because branching on triage's verdict is the same classification wearing someone else's answer. Only existence and attribution are read. The family contains no classification vocabulary of its own, asserted the same way against `src/commands/feedback.mjs`'s refusal set. The finding source is driven positively over planted captures whose bodies differ and whose attribution is identical: the resolutions must be **byte-identical**, which is the only assertion that proves content did not reach a decision. Scope is resolved only through `LOOP_SCOPE_FORMS` — asserted by import and by the absence of any `^\d` scope pattern, range grammar or item-ref regex in the family — and a story-shaped signal produces a **coded refusal naming the driver it belongs to**, never a whole-stream walk and never an implicit widening. No source reads a build status, a pipeline name or a failure class, asserted as the absence of any such field read over a planted CI signal carrying all three. A source that cannot resolve emits a **coded refusal**, and the refused and resolved sets are asserted disjoint, so nothing is dropped between them. **A well-formed driver ref bearing no item RESOLVES** (ADR-010 §10) — existence is a question about the tree, and the leaf is asserted to perform no filesystem read at all, which is the same leg that proves its answer is identical beside any tree; `work:loop` refuses an empty scope where the tree is already read, so the answer is given by the right component rather than lost. **Two bans here are deliberately SCOPED, and ADR-014 §4 ratifies both:** `verdict` is not banned family-wide (`src/work-trigger/level.mjs:191` renders the *gate's* groundedness verdict — a different noun), and the pattern-machinery bans (`/^`, `$/`, `.test(`, `RegExp`, `.replace(`, `.trim(`) hold in the LEAF only (`declaration.mjs:104` holds the JSONC banner stripper); a per-file exclusion census would be TECH_DEBT item 81 form 1 in the one control that DISCOVERS its family rather than listing it, so any future widening must use a DERIVED partition and never a named file list. **Three gaps were measured at 63/04's structural review and land with its fix round, not as a new row:** the family-wide half of the grammar ban covers the DIGIT species alone, so a non-digit scope grammar authored outside the leaf is not yet caught; `containingDriver`'s head is not asserted to go back through `decideLoopScope`, which is the one claim that makes the driver it names move when the loop's forms move; and an absent signal SET is answered as an empty one (`sources.mjs:351`), which is this milestone's `?? <empty>` species inside the file whose own header refuses it. | `test/arch/acd-trigger-never-classifies.test.mjs` | ADR-007, ADR-010 §9, §10, ADR-014 §4 |
| FF-6308 | **The pass over THIS REPOSITORY'S OWN declaration says something, and says it completely.** ADR-001 §4's non-vacuity condition is a milestone-level acceptance condition and this is its one home; four stage-1 controls each holding a fragment of it would have been four partial claims nobody read together. Driven over the shipped `.aof/triggers.jsonc` and this workspace's real gate facts, not a fixture: **every declared source has at least one declared trigger**; **every declared trigger resolves or refuses, and none does neither**; **every resolved trigger's scope resolves through `LOOP_SCOPE_FORMS`**; **every resolved trigger's argv begins `work loop` and names a registered command**, resolved through `getCommand` rather than spelled; **every refusal carries a code and, for a level refusal, the failing half by name**; and **no resolved trigger carries a level the workspace's current gate would refuse**. Each failure names what was missing rather than reporting a count, because the point of this control is to be readable at accept by someone deciding whether the milestone did anything. It holds no expected figure: a stored count would go stale on the next declaration, which is the declaration this control reads. | `test/arch/acd-trigger-is-non-vacuous-over-this-repo.test.mjs` | ADR-001 §4, ADR-009 §3 |

---

## Story partition

The landing order is **{63/00 ‖ 63/01 ‖ 63/02 ‖ 63/03 ‖ 63/04} → 63/05** — two stages, **five** stage-1
stories with no edge between them, and one convergence: the face is the only module that composes the
leaves, obtains the gate facts through `invoke`, and touches the registry.

**Stage 1 is edge-free at the CONTROL level as well as the module level**: every claim about the shipped
declaration or the composed resolution lives in `FF-6308`, which 63/05 owns, so no stage-1 story lands a
control it cannot clear.

**The write set is the union of the `files:` blocks in ADR-009 §4**, and it includes **21 test files the
stories create or edit, counted here rather than estimated**: **8** arch controls created — one per
register row, and the register's eight paths and §4's eight are the same eight — **6** behavioural
suites created, one per story, and **7** delivered suites edited (63/00's loader census; 63/02's two
frozen-set deferral pins; 63/03's directive suite; and 63/05's three registration census files).
`scripts/test.mjs` is excluded from that count and governed separately by §2b. ADR-009 §2's table lists only
**contended** files; the distinction is what hid `test/command-core-contract.test.mjs` from 62's first
partition, and it is why the registration census files are named explicitly on 63/05.

- **63/00** — the trigger declaration: `src/work-trigger/declaration.mjs` (stage 1)
- **63/01** — the level a trigger may ask for is a ceiling: `src/work-trigger/level.mjs` (stage 1)
- **63/02** — the launch envelope compiles: `src/frozen-set.mjs`, `src/agent-session-driver.mjs` (stage 1)
- **63/03** — a mesh assignment resolves to a loop call: `src/mesh-assignment-directive.mjs` (stage 1)
- **63/04** — the signals that are not the mesh: `src/work-trigger/sources.mjs` (stage 1)
- **63/05** — the trigger's face: `src/commands/trigger.mjs`, `src/command-core.mjs` (stage 2)
