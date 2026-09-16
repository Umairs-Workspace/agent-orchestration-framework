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
# 59 · The audit loop — Architecture

## Context this milestone inherits

Six facts arrive from upstream items and are not re-litigated here.

**From 52 (done).** The registry is hand-authored markdown under `.aof/loops/`, installed from
`src/bundle/loops/` (52/ADR-001). Edges are five closed frontmatter keys — `data-feed`,
`target-setting`, `monitoring`, `veto`, `parameter-tuning` — declared on the **source** node only,
outbound (52/ADR-004). `src/work-loops-checks.mjs` is a **pure leaf that imports nothing**
(52/ADR-007), emitting doctor's finding envelope; the exit decision lives on the face.

**From 55 (done).** Anchors are a node kind with a `ground:` taxonomy and an `observes:` authority;
`aof work loops groundedness` reports anchored / self-referential / stale, where **stale** today means
*the cited authority no longer resolves*. Provenance is stamped at write time. The frozen set is a
declaration compiled into `.claude/settings.json`.

**From 56 (done — the spike this milestone is sized on).** The affordability premise was wrong in our
favour: the whole 341-file fitness gate runs on this machine in **68–82 s sharded**, a Class-1
mutation sweep of every gate costs **~9 minutes**, and a **static liveness census of all 864 suites
costs 1.5 seconds**. The binding cost of the mutation tiers is *authoring valid mutations* — agent
turns, which are unmeasured. Two rulings bind us. **(a)** The oracle must diff the failure
**message**, not the pass/fail count, because 9 of 341 gates are standing red and a real break is
invisible to a count. **(b)** The probe that matters at HEAD is **liveness, not mutation**: 26 fitness
suites carrying 117 test entries were de-armed in one commit, `15e0a92`, with the imports left behind
so the files still look registered; the gate policing registration validates *import* and never
*spread*, so it cannot see any of it. No mutation campaign could — each of those gates is *correct*.

**From 57 (done).** A `watcher` is a node kind that declares a counter-metric and **has no vocabulary
in which to act** — `ADMITTED_KEYS.watcher` omits `actuator`, so a watcher that claims to act is
refused by the loader's existing `loop-key-not-admitted-for-kind` with no new code. Independence is
*computed from the records*, never self-declared.

**From 58 (in progress).** `target-setting` edges make reference ownership explicit — every loop has
a node that sets its reference — and `layer:` puts loops on an ordinal timescale axis. This
milestone's reporting rule stands on those edges: *who owns this loop's reference* is what the
question "who should hear this finding" resolves to. **58 is therefore a hard dependency, added at
refine** (see STATE).

**From 66 (done).** A declared control resolves, executes, and has been seen red. The controls lane in
`src/work-doctor-controls.mjs` is a **true leaf that never executes** — no `node:fs/promises`, no
`Date.now()`, no `void import()` — pinned by FF-6605, because *"a dynamic `import()` of a cited module
EXECUTES its module scope, which is ACD running a project's test code"* (66/ADR-004 §2).

---

## ADR-001: The auditor is a SIXTH node kind whose subject is the instruments, and which has no vocabulary in which to act

**Status:** accepted.

### 1 · The decision

`NODE_KINDS` widens from five to six with `auditor`, additively, deleting nothing.
`ADMITTED_KEYS.auditor` is frozen as:

```
id, kind, title, audits, measurement, cadence, escalation  +  the edge keys
```

`audits:`, `measurement:`, `cadence:` and `escalation:` are **required** for the kind.

- **`audits:`** — a non-empty list of pointers naming the instruments this auditor reads
  (`module:`, `command:`, `config:`, or a `loop:` / `watcher:` / `anchor:` id). This is the auditor's
  subject, and stating it is what makes *"the audit does not review the work"* checkable rather than
  promised: an `item:` endpoint is **not** admitted here, because a work item **is** the work.
- **`measurement:`** — reused from `loop` / `watcher` rather than given an audit-specific name,
  exactly as 57/ADR-001 §6 reused it for the watcher: reuse is what makes the loader's existing
  `loop-field-prose-only` fire for free and lets one field shape serve every reader. One rule is
  added: **an auditor's `measurement:` refuses every `prose:` pointer.** A prose authority means a
  person or a model read something and reported it; this milestone's out-of-scope is agent-as-judge
  auditing, and a `prose:` measurement is precisely that, wearing a machine's clothes.
- **`cadence:`** — admitted and required, unlike the arbiter's (58/ADR-003 §2 omits it because an
  arbiter is not a cycle). The audit **is** a cycle: the SPEC's first scope bullet is a *cadenced*
  pass, and 56's tier table is a cadence table.
- **`escalation:`** — a single endpoint, which must be an `actor:`. See ADR-006 §3.

### 2 · What the kind omits, and why each omission is load-bearing

Every omission below is enforced by the loader's existing `loop-key-not-admitted-for-kind`. **No new
finding code is added for any of them** — the same free enforcement 57 and 58 bought.

| omitted key | what declaring it would mean | why it is refused |
|---|---|---|
| `actuator` | the audit fixes what it finds | it would become the maker of the thing it audits; *"reports to reference-owners"* has no meaning if it can act |
| `optimizing` | the audit drives a metric to an extremum | an optimizing auditor would need a watcher of its own, and 57's regress has to stop somewhere: the audit is the node that **reports**, permanently |
| `controlled` / `reference` | the audit holds a setpoint | a setpoint is a thing an outer loop owns (58/ADR-001); an auditor that owned one would be supervising rather than reporting |
| `ground` | the audit grounds itself | the arbiter's rule, verbatim (58/ADR-003 §2): a node may not issue itself the authority that grounds the graph |
| `counter` / `determinism` | the audit is a watcher | a watcher pairs an **optimizer** with a counter-metric; the auditor's subject is the **instrument**, including a watcher's. Determinism is not an enum here because it would have exactly one legal value — it is enforced instead by §1's `prose:` refusal |
| `layer` | the audit sits on the supervision timescale axis | it supervises nothing. 58's one-boundary-per-edge rule is about `target-setting`, and an auditor declares none |
| `owner` / `ceiling` | — | `owner` is admitted on `kind: loop` alone (58/FF-5804) and stays there; the audit's bound is its cadence |

### 3 · `reporting` is the sixth edge key, and nothing points AT an auditor

`EDGE_KEYS` gains exactly one member: **`reporting`**, declared **outbound from the auditor** to the
node that should hear what it found. It is a sixth edge and not a reuse of `monitoring`, because
`monitoring` already carries a settled meaning that 57/01's independence legs read — *this node
computes a counter-metric on that optimizer* — and overloading it would make an audit finding
indistinguishable from a pairing.

`ENDPOINT_SCHEMES` is **unchanged**. 58/ADR-003 §6 set the precedent and the reason: widen the
endpoint vocabulary only for an edge that is actually declared. Nothing in this milestone points at an
auditor, so `auditor:` is not an admissible endpoint. An auditor is a **source, never a target** —
which is also the structural statement that nothing supervises the auditor into silence.

### 4 · What the vocabulary story does not ship

The kind, and nothing else. The checks that read it are 59/03's; the record written in it is 59/04's;
the lanes that produce its findings are 59/01's and 59/02's. The literals are frozen here precisely so
all five stories build against them in parallel — 52's, 55's, 57's and 58's practice, unchanged.

### 5 · The auditor is a GRAPH NODE, and the line that makes it one belongs to 59/03

*(Amended 2026-08-29, raised at 59/00's structural review.)* `isGraphNode`
(`src/work-loops-checks.mjs:158-161`) gains `auditor`. The two halves have **different owners**: the
**vocabulary** — `NODE_KINDS`, `ADMITTED_KEYS.auditor`, `EDGE_KEYS` — is 59/00's; **membership of the
traversals** is 59/03's, because ADR-008 §2 names 59/03 the sole writer of that module and the module
imports **nothing** (measured: `aof graph impact`, 2026-08-29 — 16 dependents, 0 imports), so the
parity can never be derived from the loader's enum and is restated by hand. The membership BEHAVIOUR
is therefore contracted in 59/03 and asserted by the **existing** `FF-5805`, a 58/02 control
deliberately general over `NODE_KINDS`. This is 58/ADR-003 §6's arrangement, repeated: 58 hit the same
split, amended its own ADR to name the owner, and that amendment is the only reason anyone was told to
close it.

**The ruling is that the auditor IS a member** — the same shape 58 settled for the arbiter, which
likewise admits no `ground:` and reaches ground only through its declared edges. Of the four lanes
`isGraphNode` gates, three are unreachable for the kind by construction: `checkActuatorArbitration`
needs an `actuator`, `checkPairing`'s optimizer leg needs `optimizing:`, and `checkTimescale` anchors
every finding to a `target-setting` edge — all refused by §2 and §5a. Only the **grounding
decomposition** is materially reached, and there the auditor must be visible: filtering it out would
silently exempt the one node in the registry whose subject is the instruments, which is the failure
this milestone exists to close. `loop-anchor-absent` does **not** follow, because `analyseGrounding`
scopes `unanchoredLoops` to `kind: loop` (`src/work-loops-checks.mjs:285-288`) — so §3's *nothing
points at an auditor* and the anchor lane do not collide.

**Until 59/03 lands, two `FF-5805` legs are RED at HEAD by construction**, which is the gate working
exactly as its own comment says it should: *a sixth kind admitted there and missing here fails CI
instead of being silently invisible four times over*. The red is bounded to stage 1 → stage 2 of this
milestone, it is named here, and **`aof:verify 59` refuses acceptance while either leg is red** rather
than inheriting it — the species TECH_DEBT 27 calls the worst, a red introduced by an item that closed
green. The two legs are `arch/58 FF-5805: a shared actuator clears only on a non-contending node whose
KIND is arbiter` and `arch/58 FF-5805: isGraphNode accepts every member of NODE_KINDS, so no declared
kind is filtered out of the traversals`.

### 5a · An auditor's admitted edge keys are `data-feed` and `reporting` ALONE, and the other four are refused at the ENDPOINT

*(Ruled 2026-08-29, raised at 59/00's structural review; §1 and §2 left this open and 59/00 built only
the one case a task named.)*

**The rule.** For `kind: auditor`, the four edge keys `target-setting`, `veto`, `parameter-tuning` and
`monitoring` admit **no endpoint at all**. Each entry on such a key is the loader's existing
`loop-bad-value` naming the edge key and quoting the value, and **nothing reaches `node.edges`**.
`data-feed` and `reporting` are unaffected and keep the whole of `ENDPOINT_SCHEMES`.

**Why the refusal is on the endpoint and not on the key.** §1 freezes `ADMITTED_KEYS.auditor` as the
four declarations **plus the edge keys**, and `FF-5901` asserts that set as an **equality** — so the
key cannot be dropped from the admitted set without contradicting a declared control, and
`loop-key-not-admitted-for-kind` is therefore **unavailable** for an edge. §2's omission table has no
edge row for the same reason. The endpoint is the only surface left, and 59/00 already built
`target-setting` this way against `02_an-auditor-cannot-act`'s *"the edge is reported rather than
accepted"*; this ruling extends that identical idiom to the other three rather than inventing a second
mechanism. No new finding code, as everywhere else in this milestone.

**Why each of the four.**

| refused edge | what declaring it would mean | why it is refused |
|---|---|---|
| `target-setting` | the audit sets a loop's setpoint | it would be an owner of some loop's `reference` — the one thing §2 refuses it in four separate rows. Built in 59/00 |
| `parameter-tuning` | the audit turns a knob on what it audits | the `actuator` row in edge clothing: acting on what it found, which makes it the maker of the thing it audits |
| `veto` | the audit blocks what it audits | the same act one step harder, and it would additionally make an auditor a candidate arbiter of a shared actuator |
| `monitoring` | the audit is a watcher of that loop | §2's `counter` / `determinism` row, arriving as an edge instead of a key — **and it silently clears a gate**, below |

**`monitoring` is the sharp one, and it is refused for a second, measured reason.**
`checkPairing` adds **any** source's `monitoring` endpoint to `paired`
(`src/work-loops-checks.mjs:409-412`) — the `source.kind !== "watcher"` guard sits *after* the
`paired.add`, and gates only the shared-measurement and shared-actuator legs. So once §5 admits the
kind to `isGraphNode`, an auditor declaring `monitoring: [loop:x]` would clear
**`loop-unpaired-optimizer` on `loop:x` — a `GATING_CODES` member — by auditing it.** The audit would
satisfy the pairing requirement it exists to be independent of, and `FF-5910`'s *"the shipped registry
produces zero findings whose code is in `GATING_CODES`"* would then pass **for the wrong reason**: not
because the registry is paired, but because the auditor absorbed the finding. An auditor already has
`audits:` to name its subject, so `monitoring:` buys it nothing it does not have and costs a gate.

*(The general defect — `checkPairing` letting any kind clear a pairing finding — predates this
milestone and is not created here; 57's actor, anchor and arbiter can each do it today. It is refused
for the auditor because 59's entire thesis is this kind's independence, and because §5 is the moment
it goes live. The wider fix is `checkPairing`'s and is not in scope.)*

**Rejected: dropping the four keys from `ADMITTED_KEYS.auditor`.** It reads better and yields
`loop-key-not-admitted-for-kind` for free, but it contradicts §1's frozen set and `FF-5901`'s
equality leg, which would have to be re-cut in the story that already shipped them. The endpoint
refusal costs one predicate and no contract churn.

---

## ADR-002: The audit EXECUTES; doctor READS. The boundary is the command, and the execution is a bounded child process

**Status:** accepted.

### 1 · The problem this settles

The SPEC's third scope bullet is *"re-run recorded evidence rather than reading it"*. That is the
opposite of the rule 66 froze one milestone ago: `src/work-doctor-controls.mjs` is a true leaf that
reads a cited control's **path** and never its **behaviour**, and FF-6605 asserts it can reach no child
process, no dynamic import and no clock. Both rules are right. They cannot live in one command.

### 2 · The decision

**`aof work audit` is a new command, a sibling of `work:doctor` on the same command core**, with its
own lane registry under a new `src/work-audit/` directory. Doctor's rule is not weakened by one line,
and doctor's own ratchet — *"Doctor's lane count is now 5, and the recorded ratchet is that the SIXTH
folds the family into `src/work-doctor/`"* (`src/work-doctor.mjs:594`) — is not tripped, because no
sixth doctor lane is added.

> **`aof work doctor` asks whether the documents are coherent.**
> **`aof work audit` asks whether the instruments that produce them still work.**

It reuses doctor's contract wholesale — the `{ code, severity, path, message }` finding, the
basis-neutral raw-absolute `path`, scope-as-filter, `--json`, and `--strict` as a **face** concern
where `run()` always returns the full advisory set (08/ADR-002, 15/ADR-001). The only additions to the
envelope are ADR-006's two addressing keys.

The evidence lane **reads** `src/work-doctor-controls.mjs`'s pure register extractors —
`fitnessDeclarations`, `citedControlPathsIn`, `redProbeRows` — rather than re-implementing the
register grammar. One home for *how a register is parsed*; two homes for *what is done with it*.

### 2a · `--strict` means TWO DIFFERENT THINGS on `work:doctor` and on `work:audit`, and the divergence is the decision

*(Ruled 2026-08-30, at 59/04's structural review. §2 stands unedited; this subsection is appended, in
ADR-001 §5a and ADR-004 §1a's form.)* §2 lists `--strict` among the things this command reuses from
doctor **wholesale**. That is true of the MECHANISM and false of the POLICY — and it is **two** changes,
not the one the build flagged. What shipped:

| the run | `work:doctor` (15/ADR-002) | `work:audit` (`src/commands/audit.mjs`, `cli.exit`) |
|---|---|---|
| an `error`, no flag | **exit 1** — an error always gates | **exit 0** — reported, and that is all |
| an `error`, `--strict` | exit 1 | exit 1 — the flag is the door into the gate |
| a `warn`, `--strict` | **exit 1** — `--strict` promotes warnings | **exit 0** — `--strict` promotes nothing |
| a `warn` with no flag, or a clean run | exit 0 | exit 0 |

What IS reused, unweakened, is 15/ADR-002's actual subject: the gate is a **face** concern, `strict` is
part of neither command's `input`, and `run` returns the identical finding set with and without it. Only
the exit table diverges, and it diverges in exactly two cells.

**Both halves are ruled right, and for one reason.** `work:audit` is deliberately **not** on 54/FF-5409's
frozen five-row cost ladder (ADR-007 §1): it is declared, runnable and cheap, and nothing schedules it. A
command off the ladder that reddened every build which merely ran it would be a sixth rung arriving by
the back door — the edit to a delivered contract ADR-007 §1 refuses. So an error may not gate by default.
And a `--strict` that additionally promoted warnings would make the opt-in gate **stricter than doctor's**
on the noisier of the two commands: the audit's warn-severity codes are `anchor-stale`,
`instrument-silent`, `metric-unmoved` and `loop-unconsulted` (`src/work-loops-checks.mjs:930-935`) —
advisory facts about instruments, not coherence violations — and a caller who opted into "fail my build
when the audit finds an error" did not ask to fail it on a prune candidate. Here `--strict` means *treat
the error report as a gate*, and nothing more.

**15/ADR-002 considered and REJECTED this exact policy**, and that rejection stands — **for doctor**:

> *Make `error` advisory too (only `--strict` ever gates anything). **Rejected**: it contradicts the real
> config-doctor rule (an `error` ALWAYS exits non-zero there) and SPEC's "promotes **warnings** to
> failures" — errors are already failures; `--strict` only promotes **warnings**. Mirror the sibling
> faithfully.*

Both of its reasons are premises doctor has and this command does not. Doctor mirrors `aof project
doctor`, a sibling that has always gated on an error; the audit's sibling for this purpose is the cost
ladder, which it is off. And the SPEC that said "promotes warnings" is 15's; this milestone's task
contract says the opposite in three scenarios
(`04/00_one-command-over-the-instruments.feature` — *"the exit decision lives on the face"*, *"strict
mode fails on an error finding"*, *"strict mode does not fail on a warning"*). A rejection is reasoned
from premises, and quoting one past its premises is how a decision becomes a rule nobody chose.

**The hazard, and what carries it.** One flag name, two sibling commands on one core, two meanings, is a
contract hazard for an operator writing CI — and the cheapest response to finding the two tables side by
side is "harmonise them", which silently puts the audit on the gate path. A sentence in this document
does not survive that, and milestone 77 extends this same command (§4), so it would inherit only the
sentence. The invariant therefore gets a control: **FF-5911** drives both registered faces over the full
population × flag table and pins the difference at exactly two named cells, in that direction. The
per-command behaviour stays the task contract's; the CROSS-command table belongs to no feature, which is
why it is a fitness function and not a scenario.

**Rejected: giving the audit's flag a different name** (`--gate`, `--fail-on-error`), so that one word
cannot mean two things. It is the honest fix for the hazard, and it is refused on two counts: the task
contract that shipped names *strict mode* in three delivered scenarios, and §4 records that milestone 77
plans `aof work audit [scope] [--json] [--strict]` — a rename would fork the verb the later milestone
already names. The divergence is cheaper to police than to rename.

**Rejected: harmonising the two policies.** Either direction breaks something already frozen: making the
audit gate on a bare error adds the sixth ladder rung ADR-007 §1 refuses, and making doctor advisory
contradicts 15/ADR-002 and the config sibling it mirrors. FF-5911 fails on both.

**Also recorded, because it is now false.** 59/04's `STORY.md` `## Notes` says the finding envelope,
scope-as-filter and "`--strict` as a face concern are all reused **unchanged**". The face-concern half is
exact; the exit policy is not reused. A delivered `STORY.md` is immutable and is not edited — the
correction lives here, where a reader of the decision finds it.

### 3 · Execution is a bounded child-process spawn, never a dynamic import

66/ADR-004 §2's refusal is honoured exactly: **no module under `src/work-audit/` may `import()` a
project file**, because that executes its module scope inside the aof process. Every execution goes
through **one spawn seam** — `src/work-audit/spawn.mjs` — which carries a deadline, a kill on expiry,
captured stdout/stderr and an observed exit code, in the shape `work:grade`'s bounded spawn already
established. That seam is what lets the census ask the runner for its *assembled* suite (a child
`node` process printing the names) without importing 880 test modules into the CLI, and what lets
59/02 re-run a control.

### 4 · Milestone 77 extends this command; it does not ship a second one

77 (`harness-audit`, `not-started`, `depends: []`) plans `aof work audit [scope] [--json] [--strict]`
with harness lanes — agent capability gaps, spawn flags, cache-prefix stability, unwired seams. That
is the same command with a different subject. **59 ships the command and the lane registry; 77 adds
lanes to it.** Recorded here so the later item extends one home instead of adding a sibling, and so
the finding-envelope control 59 lands is the one 77 inherits.

---

## ADR-003: Tier 0 first — and registration is decided by RUNTIME MEMBERSHIP, never by the runner's source text

**Status:** accepted.

### 1 · What ships, from 56's tier table

| tier | probe | measured cost | this milestone |
|---|---|---|---|
| 0 | static liveness: wiring, stripper order, fuse scan, absence inventory | **1.5 s** | **ships** (59/01) |
| 1 | drive `test/arch/**` by import + vacuity probe | ~75 s sharded | **ships** as the evidence lane's oracle (59/02) |
| 2 | drive the remaining 522 suites | ~9 min | **ships** behind an explicit scope; never on the default path |
| 3 | detector-blinding mutation | 78 s | **deferred** |
| 4–5 | subject / invariant mutation | turn-bound, **unmeasured** | **deferred**, with the reason: 56 priced these in wall-clock and warned they are gated on agent turns nothing has measured. Scheduling them on the compute figure is exactly the error the spike names |

Tier 0 at 1.5 s is what makes a run-every-build audit unarguable, and it is the tier that would have
caught the de-arming **on the day it happened**.

### 2 · The registration authority moves from text to the assembled array

`acd-test-suite-registration` decides "is this suite wired in" with `runners.includes(basename)` — a
**substring search over the runner's source**. That is why 26 imported-but-never-spread bindings are
invisible to it (TECH_DEBT item 50). Re-measured at HEAD on 2026-08-29, unchanged: **27 imported
bindings in `scripts/test.mjs` are never spread** — 26 suites plus `pathToFileURL`.

The fix is **not** to add a spread check. 56 is explicit: a source-text spread lane is satisfied by a
commented `// ...someTests,` exactly as a comment satisfied the import lane. The right instrument
already ships — `acd-roundtrip-registration` (m04/00/03) imports the **assembled `tests` array** from
`scripts/test.mjs` and asserts runtime name-set membership. **That mechanism is widened to the whole
tree, the substring lane is retired, and the walk recurses into `test/integration/**`.**

### 3 · Re-arming is part of the story that builds the detector

The 26 bindings are re-spread in 59/01, not deferred. Two of them have rotted red while dead. A suite
that fails on re-arming is **repaired, or ledgered in `UNREGISTERED_BASELINE` with its reason and its
origin** — never silently left de-armed. That is the shrink-only discipline the file already carries;
what changes is that the list can no longer be evaded by an import with no spread.

### 4 · The CLI census is static; the arch gate is the authority

The census lane reports the static facts — a suite on disk no runner names, a binding named and never
spread, a sweep whose population is zero — and where it needs runtime membership it obtains it
**through ADR-002 §3's spawn seam**, never by importing. Where the two could disagree, the arch gate
running inside the runner's own process is the authority, and the census says so in its own message.

---

## ADR-004: Absence is a finding, and every sweep declares what it read

**Status:** accepted.

### 1 · The rule

A lane that found nothing and a lane that **looked at nothing** are indistinguishable in a finding
list, and the second is the failure this milestone exists to catch. So: **every audit lane returns the
size of the population it read together with a floor**, and a lane whose count falls below its floor
emits `audit-ran-on-nothing` naming the sweep, the root it walked and the floor it missed. A clean
result is not representable without a read count.

This is 66's own practice promoted from a test convention to a command contract — `assertRead(what,
count, floor)` exists in `acd-loop-probe-contract` because a renamed fixture root made a probe pass
over nothing.

### 1a · The read record has ONE shape across every lane, and 59/04 is where the three converge

*(Amended 2026-08-30, raised at 59/03's structural review. §1 stands unedited; this subsection is
appended, in ADR-001 §5a's form.)* §1 says **every** audit lane. At HEAD the rule has **three
spellings, and the third does not obey it**:

| lane | the read record, and where | shape | below its floor |
|---|---|---|---|
| census | `src/work-audit/census.mjs:180,188` — `readRecord` / `readFinding` | `{sweep, root, what, basis, count, floor}` | emits `audit-ran-on-nothing` |
| checks | `src/work-loops-checks.mjs:993,1002` | the same six keys, a deliberate **hand-restated copy** | emits `audit-ran-on-nothing` |
| evidence | `src/work-audit/evidence.mjs:782` — an inline `{...EVIDENCE_SWEEP, root, count}` | `{id, what, floor, basis, root, count}`, keyed **`id`, not `sweep`** | **nothing at all — the lane performs no floor comparison** |

The divergence is not cosmetic, because the three shapes look substitutable and two of them are not.
Measured 2026-08-30: `census.readFinding()`, handed the evidence lane's own read record, renders

> `the "undefined" sweep read 0 of a required 1 while walking /r`

A report that names its own sweep `undefined` is §1 failing while wearing the clothes of compliance;
and a lane that never compares its count against a floor is exactly the *looked at nothing* case §1
exists to make visible. The evidence lane is today the only lane that can read nothing and say so
nowhere.

**The ruling, and its owner.** The read record is **one shape, keyed `sweep`, in all three lanes**, and
every lane the audit assembles is subject to the same floor comparison. **59/04 closes this**, and it
is named here so that story is built against the rule rather than having to infer it. 59/04 is the
story that assembles census, evidence and checks behind one face (ADR-008 §2, §3), so it is the first
moment all three shapes are in one place and the only story that can converge them without writing
another story's module. What it owes:

- the **evidence** lane emits a read record keyed `sweep` like the other two and puts it through the
  same floor comparison, so a register sweep that read nothing emits `audit-ran-on-nothing` instead of
  emitting nothing at all;
- `sweepDeclarationProblems` / `readFinding` keep **one definition** under `src/work-audit/`, driven
  over every lane the audit assembles rather than over one lane's private registry — a second copy
  inside that directory is the duplication ADR-002 §2 already refuses (*one home for how a register is
  parsed*);
- `src/work-loops-checks.mjs` **keeps its hand-restated copy**. That is not an exception to this rule
  but the only form the rule can take there: the leaf may import nothing (52/ADR-007, FF-5907), so its
  parity is *asserted* — byte-identical, 58/FF-5807's move — and never derived.

`EVIDENCE_SWEEP`'s frozen literal is 59/02's and is **not** re-cut by this amendment. The obligation
lands at the emission site (`src/work-audit/evidence.mjs:782`), not in the sweep declaration.

### 2 · The three absences the SPEC names, defined

- **A gate that ran on nothing** — the census lane, above.
- **A channel that has been silent** — generalised, deliberately, to *an instrument that has produced
  no reading within its own declared `cadence:` window*. That covers the feedback channel, a watcher's
  counter and a loop's own measurement with **one** rule keyed on a field every record already
  carries, rather than a per-channel special case that would need a new key for each new channel.
- **A loop whose metric has not moved in N cycles** — `metric-unmoved`, where N has one declared home
  and is not a literal buried in a check.

### 3 · The oracle is the message, never the count

56's binding constraint. On a standing-red gate — and 9 of 341 are standing red — a real break is
invisible to a pass/fail count. Every verdict this milestone's lanes reach is derived from the
**observed failure message** diffed against the recorded one. 66 already ships
`acd-oracle-is-a-message-not-a-count`; this milestone's evidence lane is its first non-test consumer.

### 4 · Pruning reports; it does not remove

A declared loop with no inbound consumer edge and no observed execution is `loop-unconsulted` — a
**prune candidate**. The audit names it and stops there. Removing a node from the graph is an edit to
a governed declaration, and ADR-001 §2 spent a whole row establishing that this kind cannot act.

---

## ADR-005: Anchor freshness is DECLARED and bounded by a window; a stale anchor degrades a verdict, it does not delete one

**Status:** accepted.

### 1 · The gap

55 reports an anchor as `stale` when its **cited authority no longer resolves** — a structural fact.
The SPEC asks for a different one: *"an anchor that has not been refreshed is not an anchor"* — a
**temporal** fact. A `live-soak` anchor whose last observation was four months ago resolves perfectly
and grounds nothing.

### 2 · The decision

`checked:` is admitted on `kind: anchor` **alone**, is **optional**, and holds an ISO date. Every
`SENTINEL_TOKENS` member is refused for it — `checked: unknown` is the shape that would let an anchor
opt out of freshness while appearing to declare it. The window is `work.audit.anchorStaleDays`
(default **90**), resolved at the impure command edge and handed to the pure checks as a number,
exactly as doctor's stale window already is.

An anchor past its window reports `anchor-stale`. A loop grounded **only** through stale anchors
reports `loop-ground-stale` and its groundedness verdict **degrades** — it does not become
`unanchored`, because the edge is still declared and the authority still resolves. Collapsing the two
would lose the distinction between *never grounded* and *grounded a while ago*, which is the
distinction an operator acts on differently.

### 3 · The stronger variant, named and deferred

Freshness derived from the **last observed reading** — an anchor's id stamped on the run record that
consumed it, joined against 55/02's provenance envelope — is strictly better than a hand-maintained
date, because a date can be bumped without re-observing anything. It is deferred for one measurable
reason: **no run record in this tree carries the anchor id it read**, so the join has no left-hand
side. Supplying one is a change to the run store, which is neither this milestone's subject nor its
scope. Recorded so the weaker mechanism is a known step and not a settled answer.

### 4 · The checks stay pure

`src/work-loops-checks.mjs` still imports **nothing** (52/ADR-007, 58/FF-5804). Every freshness
comparison rides on a `now` and a window handed in on the call. No check reads a clock.

---

## ADR-006: A finding is addressed to the reference-owner, never to the audited loop — and escalation is a declared bypass, not a severity

**Status:** accepted.

### 1 · Why addressing is a separate axis from severity

*"Bad news does not have to travel through the party responsible for it"* is the SPEC's requirement,
and severity cannot express it. A `warn` about the build loop's gate sent to the build loop is
compromised in exactly the way an `error` sent there is. So the audit's finding envelope carries
**`about`** (the instrument the finding concerns) and **`to`** (the node that hears it), and both are
computed, never declared per-finding.

### 2 · How `to` is resolved

`about` → the loop that owns that instrument (the loop whose `measurement:`, `ceiling:` or `actuator:`
names it) → **that loop's `target-setting` source** (58/ADR-001) → that is `to`.

**The audited loop is never its own addressee.** That is a computed property of the whole report over
the shipped registry, and FF-5909 asserts it there rather than trusting the resolution to be
transitively correct. Where no owner resolves, the finding is addressed to the auditor's `escalation:`
actor rather than dropped — an unowned instrument is not a reason for silence.

### 3 · Escalation is the declared bypass

`escalation:` names **one `actor:`** — a node with exogenous ground, because a bypass that terminated
at another loop would be one more hop through the machinery. A finding whose code is in the escalating
set is addressed to the reference-owner **and additionally** to the escalation actor, directly. It is
not a re-routing: the owner still hears it. It is a second copy that cannot be absorbed on the way up.

The escalating set is a property of the **code**, in one table, exactly as 58/ADR-005 made severity a
property of the code. No finding is constructed with a hardcoded addressee.

---

## ADR-007: What this milestone deliberately does NOT do

**Status:** accepted.

1. **The cost ladder is not touched.** 54/FF-5409 froze a five-row cost ladder — `drive continue`,
   `gate work:validate`, `gate work:doctor`, `gate work:grade`, `drive verify` — as a **delivered**
   acceptance criterion. Adding `work:audit` to `GATE_ORDER` would edit a shipped contract. Refused.
   The auditor's `cadence:` is **declared** on its record; the trigger that honours it is 63
   (`event-driven-triggers`). The audit is runnable, cheap and declared — it is **not yet scheduled**,
   and this document says so rather than implying otherwise.
2. **Mutation tiers 3–5 are not scheduled** (ADR-003 §1).
3. **Agent-as-judge auditing is out** (SPEC), and ADR-001 §1's `prose:` refusal is the structural form
   of that exclusion.
4. **Pruning reports, never removes** (ADR-004 §4).
5. **The acceptor (61) is not built here.** It consumes these verdicts; nothing in this milestone
   reads its rule or writes toward it.
6. **Judging the work is verify's.** `audits:` admits no `item:` endpoint (ADR-001 §1), so this is a
   grammatical impossibility rather than a convention.

---

## ADR-008: The partition — five stories, one sole writer per module and per contended test file, three stages

**Status:** accepted.

### 1 · The coupling this is drawn from

`aof graph build .` on 2026-08-29 (13,031 nodes / 31,815 edges, egress none), then `aof graph impact`
on each candidate boundary:

- **`src/work-loops.mjs`** — 36 dependents, of which the only production ones are the four
  `src/commands/loops-*.mjs` faces; it imports `src/loop-bounds.mjs` and `src/work.mjs`. A vocabulary
  change cannot break anything outside the loops command family, which is why 59/00 may land first.
- **`src/work-loops-checks.mjs`** — 16 dependents, **0 imports** (the pure leaf). Two production
  consumers: `loops-validate`, `loops-groundedness`.
- **`src/work-doctor-controls.mjs`** — 14 dependents, 3 imports, all pure leaves. **Read** by 59/02
  and **written by nobody** in this milestone (ADR-002 §1/§2).
- **`src/command-core.mjs`** — 136 dependents, 83 imports: a god-node where a new command costs one
  import and one array entry. **One story owns it** (59/04), following 58's own call that three
  stories appending to one array is merge friction wearing an independence claim.
- **`src/work-audit/`** — a new directory with no dependents at all; 59/01 and 59/02 each own their
  own leaf inside it.

The cut follows that coupling: `work-loops.mjs` (schema) and `work-loops-checks.mjs` (checks) are
**already** two files with a one-way edge and no cycle, so the vocabulary story and the checks story
are a natural boundary; the new lanes are greenfield leaves; and the single god-node touch is
concentrated in the terminal story.

### 2 · Sole writers

| story | sole writer of |
|---|---|
| **59/00** | `src/work-loops.mjs` |
| **59/01** | `src/work-audit/census.mjs`, `src/work-audit/spawn.mjs`, `test/arch/acd-test-suite-registration.test.mjs`, `test/arch/acd-roundtrip-registration.test.mjs` |
| **59/02** | `src/work-audit/evidence.mjs` |
| **59/03** | `src/work-loops-checks.mjs` |
| **59/04** | `src/commands/audit.mjs`, `src/command-core.mjs`, `src/bundle/loops/`, `src/bundle/bundle.json`, `src/bundle/manifest.json` |

Every **contended test file** also has exactly one owner: `test/work-loops-record.test.mjs` and
`test/anchor-taxonomy.test.mjs` → 59/00; `test/work-loops-checks.test.mjs`,
`test/work-loops-registry-census.test.mjs` and `test/arch/acd-loop-checks-pure.test.mjs` → 59/03;
`test/work-loops-commands.test.mjs` and `test/groundedness-report.test.mjs` → 59/04;
`test/arch/acd-controls-never-execute.test.mjs` → 59/02.

`scripts/test.mjs` is the one **shared** file, as it is in every milestone: each story registers its
own suites in its own labelled block. 59/01 additionally re-spreads the 26 de-armed bindings
(ADR-003 §3), which touches only lines no other story writes.

### 3 · Ordering, and what may be built in parallel

**Stage 1 — 59/00 ‖ 59/01.** The vocabulary and the census share nothing.
**Stage 2 — 59/02 ‖ 59/03.** 59/02 lands after 59/01 because it imports the spawn seam (ADR-002 §3);
59/03 lands after 59/00 because it reads the `auditor` kind and the `checked:` key.
**Stage 3 — 59/04.** Terminal: it registers the command over the three lanes and ships the record
written in 59/00's grammar.

All five may be **built** concurrently against the literals frozen in ADR-001, ADR-004 §1 and
ADR-006 §1 — the same arrangement 52, 55, 57 and 58 each used. Only the *landing* order is a chain.

### 4 · Codebase health

Three degradations are inside this milestone's blast radius, and are named rather than absorbed:

- **TECH_DEBT 50** (`acd-test-suite-registration` cannot see an imported-but-never-spread suite) is
  **paid down** by 59/01, not ledgered further — it is this milestone's subject.
- **TECH_DEBT 27** (ten suites red at HEAD and nothing says so) is **partially exposed** by 59/02: the
  evidence lane's whole job is to contradict a recorded GREEN. Re-arming (ADR-003 §3) may raise that
  count; that is the instrument working, and the count is raised in the ledger, never lowered.
- **TECH_DEBT 24** (a line comment containing `/*` blinds a source-reading gate) bounds what the
  static census may claim. The census does **not** add a 124th hand-rolled comment stripper: where a
  claim needs comment-stripped source it is obtained through the spawn seam's runtime answer, or the
  finding states that the claim is text-level and names the limit.

---

## Fitness functions

<!-- Each structural invariant from an ADR, paired with the arch-test that enforces it in CI.
     The arch-test lands with its subject story, so `pending` clears story by story.
     `pending` reports at warn while 59 is open and is NOT admitted at accept — `aof work doctor 59`
     reports each unresolved control as `control-unresolved`, and what clears it is landing the file
     or dropping the declaration, never re-marking it `pending`.

     Each declared control also owes a RED PROBE in VERIFICATION.md once it lands: what was changed
     to make it fail, and the message observed.

     HARNESS SHAPE: every arch-test here exports an array of `{ name, run }` — never `{ name, fn }` —
     and is imported AND spread in `scripts/test.mjs`'s suite registry inside its own labelled story
     block. A suite imported and not spread is not registered; that is 56's finding and 59/01's own
     subject, so this milestone's suites failing it would be the loudest possible irony.

     THREE EXTEND A GUARD ALREADY IN SERVICE rather than adding a sibling: FF-5903 extends 43's
     registration gate, FF-5905 extends 66's never-executes guard, and FF-5907 extends 52's purity
     guard. For those the red probe is the only evidence the change is armed.

     NOT here (these are task .feature material — observable behaviour over the real seam):
     "a suite imported and never spread is named by `aof work audit`", "an anchor 200 days past its
     `checked:` date reports stale and its loop's verdict degrades", "`aof work audit --strict` exits
     1 on an error finding", "a re-run control that is green confirms its recorded row", "a loop with
     no inbound consumer is reported as a prune candidate". -->

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-5901 | **The auditor vocabulary widens additively and admits nothing that could act.** `NODE_KINDS` equals its six frozen literals and is a superset of 58's five; `ADMITTED_KEYS.auditor` equals its frozen key set and **omits `actuator`, `optimizing`, `controlled`, `reference`, `ground`, `counter`, `determinism`, `layer`, `owner` and `ceiling`**; `audits`, `measurement`, `cadence` and `escalation` are required for the kind; `audits` refuses an `item:` endpoint; an auditor's `measurement` refuses every `prose:` pointer while `loop` and `watcher` keep theirs; `EDGE_KEYS` gains exactly `reporting` and no seventh; `ENDPOINT_SCHEMES` is **unchanged**, so no record may point at an auditor; and **every one of the sixteen records shipped before 59 parses with zero new findings, in the same codes and the same counts**. | `test/arch/acd-auditor-taxonomy-additive.test.mjs` — **landed** (59/00) | ADR-001 |
| FF-5902 | **Anchor freshness is declared, on the anchor alone, and cannot opt itself out.** `checked:` is admitted on `kind: anchor` only and on no other kind; it is **optional**; it admits an ISO date and refuses every `SENTINEL_TOKENS` member and every reserved field prefix, so `checked: unknown` and `checked: prose:…` are each `loop-bad-value`; and the anchor's existing keys, requirements and finding codes are unchanged. | `test/arch/acd-anchor-freshness-declared.test.mjs` — **landed** (59/00) | ADR-005 §2 |
| FF-5903 | **Registration is decided by runtime membership, and no source-text lane survives to be blinded by a comment.** The gate imports the **assembled** `tests` array and asserts name-set membership for every `*.test.mjs` under `test/`, `test/arch/` **and `test/integration/`**; `runners.includes(basename)` and every other substring lane is **gone** from the file; the walked-file floor is asserted **before** the membership claim, so a moved root fails rather than passes over nothing; `UNREGISTERED_BASELINE` remains shrink-only with every entry naming its origin; and a suite whose module exports a runner-shaped array the assembled suite does not contain is reported **by name**. 43's registration gate is **EXTENDED**, not joined by a sibling. | `test/arch/acd-test-suite-registration.test.mjs` *(extended)* — **landed** (59/01) | ADR-003 §2 |
| FF-5904 | **The audit never runs project code inside its own process, and execution has one home.** No module under `src/work-audit/` contains a dynamic `import()`, a `require`, or a static import of any path outside `src/`; every child process in the family is created by the single seam `src/work-audit/spawn.mjs`; that seam carries a deadline, a kill on expiry and a captured exit code, and no caller passes a shell string; and no second spawn helper exists under `src/work-audit/`. | `test/arch/acd-audit-never-imports-project-code.test.mjs` — **landed** (59/01) | ADR-002 §3 |
| FF-5905 | **The audit executes and doctor does not; the boundary is structural, not conventional.** `src/work-doctor-controls.mjs` still reaches no `node:child_process`, no dynamic `import()`, no `node:fs/promises` and no wall-clock — 66/FF-6605 unweakened and re-asserted from this milestone's side; **no module under `src/work-audit/` is imported by `src/work-doctor.mjs` or by any module in its `CHECK_GROUPS` registry**, and the only edge the other way is to the pure register extractors named in ADR-002 §2; doctor's lane count is still 5; and the audit's frozen finding-code set is disjoint from `CONTROL_FINDING_CODES`. 66's never-executes guard is **EXTENDED**. | `test/arch/acd-controls-never-execute.test.mjs` *(extended)* — **landed** (59/02) | ADR-002 §1, §2 |
| FF-5906 | **Evidence is re-run, never re-read, and the oracle is the message.** Every verdict the evidence lane emits is derived from a spawn result — an observed exit code and captured output — and **no verdict is reachable from the recorded prose alone**: with the child result withheld, every row reports `evidence-unrunnable` rather than confirming what the register claims; the comparison performed on a failing control is over the **failure message**, and no code path compares a pass/fail count to reach a verdict; and a citation that does not resolve, is not registered, or exceeds its deadline reports **what was tried**, naming the path and the deadline. | `test/arch/acd-evidence-oracle-is-a-message.test.mjs` — **landed** (59/02) | ADR-002 §3, ADR-004 §3 |
| FF-5907 | **The checks stay a pure leaf and absence is computed, never self-declared.** `src/work-loops-checks.mjs` still imports **nothing** — no filesystem, process, clock or dynamic import; every freshness and silence comparison rides on a `now` and a window handed in on the call, and the module holds no date literal and no duration literal; **no kind admits a key by which a node asserts its own liveness, freshness, consultation or audit status** (no `fresh`, `live`, `consulted`, `audited-by` or `last-run` key exists in any admitted set); and each new code resolves to a severity through the existing code→severity table with no hardcoded literal at a construction site. 52's purity guard is **EXTENDED**. | `test/arch/acd-loop-checks-pure.test.mjs` *(extended)* — **landed** (59/03) | ADR-004, ADR-005 §4 |
| FF-5908 | **Every sweep declares what it read — in ONE shape across all three lanes — and a sweep that read nothing is a finding rather than a pass.** Every lane registered in the audit returns a population count with a floor; a clean lane result is **not representable** without one (the shape has no default and no optional read count); a lane whose count is below its floor emits `audit-ran-on-nothing` naming the sweep, the root walked and the floor missed; and the emission is driven from the lane registry, so a lane added without a floor fails CI rather than passing silently over nothing. **The bound population is all THREE read-record shapes — the census lane's, the checks leaf's and the evidence lane's — each keyed `sweep` and each put through the same floor comparison** (ADR-004 §1a), so no lane's record is substitutable-looking and unsubstitutable. The two audit-family lanes reach ONE definition: `src/work-audit/reads.mjs` holds `readRecord` / `readFinding` / `sweepDeclarationProblems`, `census.mjs` re-exports them unchanged and `evidence.mjs` imports them, so the third `id`-keyed spelling no longer exists. The checks leaf's copy is asserted byte-identical rather than imported, because it may import nothing (52/ADR-007). **The same rule binds the LIMIT record** (D-59-3, appended at `aof:verify 59`): `reads.mjs` also holds `LIMIT_KEYS` / `limitRecord` / `limitDeclarationProblems`, every limit any lane declares carries exactly those keys, a limit is refused at construction and again at lane assembly rather than rendered blank, and — the leg that catches the defect the other legs did not — **every `limit.<key>` the human face reads is a key every declared limit carries**, driven over the limits the lanes really ship rather than over a fixture. | `test/arch/acd-audit-reports-what-it-read.test.mjs` — **landed** (59/03, EXTENDED by 59/04 and again at the milestone's verify): the census and checks shapes bind from 59/03, 59/04's two further legs bind the evidence lane's, and the limit leg binds all of them — in this same file, never a sibling | ADR-004 §1, §1a |
| FF-5909 | **Bad news is addressed to the reference-owner and never to the audited loop.** The finding envelope's keys are exactly its frozen set, including `about` and `to`; over the shipped registry **no finding's `to` is the loop that owns the instrument named in its `about`**; `to` is resolved through the audited loop's `target-setting` source (58/ADR-001) and, where none resolves, through the auditor's declared `escalation:` actor rather than being dropped; every code in the escalating set produces a **second** addressee that is that actor, with the owner's copy still present; addressing does not vary with severity; and no addressee is constructed from a literal. | `test/arch/acd-audit-reports-to-the-owner.test.mjs` — **landed** (59/04) | ADR-006 |
| FF-5910 | **The day-one auditor is complete, admissible, and cannot audit the thing that watches it.** Over `src/bundle/loops/`: exactly one `kind: auditor` record exists; every pointer in its `audits:` resolves to a file, a registered command or a declared node, and none of them is an `item:`; its `escalation:` names a declared `actor:` whose `ground:` is `exogenous`; **it declares no `reporting` edge to a node that appears in its own `audits:`**; the shipped registry produces **zero** findings whose code is in `GATING_CODES`; and `aof work audit` is registered on the command core with a derived route and a CLI↔registry bijection, so the verb and the registry cannot disagree. | `test/arch/acd-day-one-audit-complete.test.mjs` — **landed** (59/04) | ADR-001, ADR-006, ADR-007 §1 |
| FF-5911 | **`--strict` means two deliberately different things on the two sibling commands, and neither may quietly adopt the other's.** Driven over both REGISTERED faces across the full population × flag table: `work:doctor` exits non-zero on an `error` with or without the flag and on a `warn` **under `--strict`** (15/ADR-002); `work:audit` exits **0** on an `error` without the flag and **0** on a `warn` even under it, gating only on `--strict` **and** an `error` (ADR-002 §2a, ADR-007 §1); the two tables differ in **exactly** the two cells `error`/no-flag and `warn`/`--strict`, and in that direction, so a harmonisation in either direction fails CI rather than silently making the audit a gate; on both commands `strict` is absent from `input`, the finding set is identical with and without it, and `--json`'s `healthy` agrees with the exit code; and the set of core commands declaring a `--strict` flag is **closed**, so an eighth cannot ship without declaring which of the two policies it follows. | `test/arch/acd-strict-is-two-policies.test.mjs` — **landed** (59, by the architect at the milestone close) | ADR-002 §2a, ADR-007 §1 |

---

## Story partition

Authored at refine, per ADR-008. The landing order is **{59/00 ‖ 59/01} → {59/02 ‖ 59/03} → 59/04** —
three stages with two parallel pairs, on two ordering edges: the evidence lane imports the census
story's spawn seam, and the checks read the vocabulary story's kind and its `checked:` key.

- **59/00** — the auditor kind: `src/work-loops.mjs`
- **59/01** — the instrument census and the spawn seam: `src/work-audit/{census,spawn}.mjs`, `test/arch/acd-test-suite-registration.test.mjs`
- **59/02** — evidence re-run: `src/work-audit/evidence.mjs`
- **59/03** — staleness, silence and the prune: `src/work-loops-checks.mjs`
- **59/04** — the audit face and the day-one auditor: `src/commands/audit.mjs`, `src/command-core.mjs`, `src/bundle/loops/`
