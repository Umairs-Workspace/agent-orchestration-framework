---
doc: retrospective
---
<!--
  Milestone RETROSPECTIVE.md — answers ONE question: what did HOW we executed teach us? Owner:
  aof:retrospective, called at the close by aof:verify. One R<n> per lesson, APPEND-only, never
  renumbered. References the evidence; never restates it — the findings live in VERIFICATION.md,
  the decisions in ARCHITECTURE.md, the blow-by-blow in STATE.md.
-->
# 61 · The disciplined acceptor — Retrospective

Seven stories, four stages, thirteen declared controls, two Blockers at the acceptance gate. The
milestone's subject and its execution kept meeting: a milestone about refusing to accept a change
because a number went up spent most of its trouble on claims that were asserted rather than measured.
That is the thread through R1, R3 and R4, and it is worth carrying forward as one lesson wearing three
costumes.

An `observability/` snapshot was written at the close and carries **no agent attribution** — 360 agent
runs matched no run record, so there is no per-agent time, token or stall data for this milestone. No
process lesson is drawn from it, and the absence is itself recorded: the transcript→run-record join
did not work for this milestone's dispatch shape.

---

## R1 — A story can claim a review it never had, and nothing between the build and the gate looks

- **Kind:** mistake · **Area:** process
- **Stage:** verify · **Owner:** orchestrator · **Raised by:** `aof:verify`'s gate, confirmed by the operator

**What happened.** 61/06 arrived at acceptance built, green, and reading `in-review` — with no review
behind it. Its `status:` line had been edited by hand rather than moved by `aof work status`.

**Why.** The verb is the only thing that moves the file *and* publishes to the fleet cache, but nothing
*requires* the verb: a text edit changes what every downstream reader believes. And the review itself
leaves no artifact any gate consults — `aof work doctor` reports the resulting `cache-status-divergence`
as a **warn**, and a warn-only doctor result does not fail `aof:validate`, so the one signal that
existed was structurally unable to stop the accept. It took four separate measurements (cache, STATE
section, commit trail, STATE's own last word) to establish something the machinery already knew.

**Lesson.** The acceptance gate should treat `cache-status-divergence` on the item being accepted as a
**blocking** finding rather than a warn, and should require the review's own record — the STATE
`## From <ref>'s build and review` section — as an artifact, not as a courtesy. A status that only the
file believes is exactly the "the score went up, keep it" failure this milestone exists to refuse,
arriving in the process layer instead of the product.

**Refs:** `VERIFICATION.md` `D-61-3`; `STATE.md` `### From 61/06's build and review`.

---

## R2 — A green suite was the defect's own witness, because the same lane wrote both sides

- **Kind:** near-miss · **Area:** code
- **Stage:** build · **Owner:** developer · **Raised by:** the structural review at `aof:verify`

**What happened.** 61/06's reporting face preferred a pair sequence carried on its **caller's**
proposal to the evidence accrued in the ledger, so an explicit commit could be granted on fabricated
evidence — the one enforcement point ADR-005 §1a says cannot be routed around, routed around through
the command's own declared input. The story's own test drove that exact path and asserted
`applied: true`.

**Why.** The implementer and the test author were one lane, so an interface decision — *what may
`input` carry?* — was encoded in the code and in the test at the same moment. The suite then ratified
it. Nothing was skipped; the check and the thing checked simply agreed.

**Lesson.** For any surface that answers an **authority** question — where does this evidence come
from, who may assert it — write the negative case first and write it as a refusal: *what must this
refuse to accept from its caller?* A test that only demonstrates the happy path over a trusted input
cannot distinguish "works" from "trusts too much". This is the one class of defect where a second pair
of eyes is not a nicety, which is why R1 and R2 are the same incident read from two ends.

**Refs:** `VERIFICATION.md` `D-61-6`; `STATE.md` `### From 61/06's build and review`.

---

## R3 — A contract asserted a false proposition about `src/`, and the build implemented it faithfully

- **Kind:** mistake · **Area:** contract
- **Stage:** refine · **Owner:** architect · **Raised by:** the architect and the orchestrator at 61/03's review

**What happened.** ADR-008 §3 and 61/03's feature asserted that all three declared tunable knobs lack
an executed consumer. All three have one, traced by hand and verified independently against the merged
tree. The developer built exactly what was specified and said so on the record.

**Why.** §2(a)'s measurement was real but was generalised from **one** resolution path to the knob:
a second, independent path (`loop.mjs:1047-1048`) neither the spike nor the ADR examined is the one
that decides. The control's non-emptiness turned out to be a property of the analyser's cutoff rather
than of the tree.

**Lesson.** A contract clause asserting a measured property of the codebase must carry the measurement
**and the path set it covered**. "Measured" without the enumeration is an assertion wearing a
measurement's clothes — and it is the more dangerous form, because the build will faithfully encode
it. This milestone recorded **five** instances of the same species (ADR-007 §4, FF-6108 leg 3,
ADR-008 §2(a), ADR-003 §4, and the 61/04 vocabulary ruling's own `refusals`-array claim, which would
have forced the set to ten). Only the last was caught before it reached a build, and it was caught by
re-measuring rather than by re-reading.

**Refs:** `STATE.md` `### From 61/03's build and review`; `ARCHITECTURE.md#ADR-013` §1/§1b.

---

## R4 — A closed vocabulary was declared in one ADR and minted incrementally by three stories

- **Kind:** misunderstanding · **Area:** architecture
- **Stage:** refine · **Owner:** architect · **Raised by:** the orchestrator, when 61/06 could not be built

**What happened.** ADR-010 §2 froze the refusal vocabulary at seven. 61/04 then shipped codes that
reached a `refusals` array and were not among the seven. The collision blocked 61/06's build outright
and needed a superseding ADR-013 mid-milestone, plus an amendment to a contract that had not yet been
delivered.

**Why.** Each mint was locally right in the story that made it, and no story owned the whole set: the
vocabulary was declared by the story at the start of the arc and completed by the story at the end, so
the first four stories could each add a member without anything comparing the result to the
declaration. The collision reached its **second** instance before it was frozen.

**Lesson.** A closed vocabulary needs its assembly point and its control **in the story that declares
it**, not in the story that renders it — the control asserting the frozen set has to exist while the
members are still being minted, or its first run is a post-mortem. When the set has to grow anyway,
supersede on membership only and leave the rest byte-intact (`03/R3`'s rule, which ADR-013 followed
and which worked).

**Refs:** `ARCHITECTURE.md#ADR-013`; `STATE.md` 61/03's *"the refusal-vocabulary collision is now at
its SECOND instance"* and 61/04's vocabulary ruling.

---

## R5 — Two concurrent reviewers were given one worktree, and both mutate source to run red probes

- **Kind:** near-miss · **Area:** process
- **Stage:** build · **Owner:** orchestrator · **Raised by:** QA, at 61/03's review

**What happened.** Both reviewers were pointed at the same dispatch worktree. QA observed
`admissibility.mjs` rewritten mid-review and four scratch files appear, and took one transient
anomalous reading.

**Why.** Red-probing is a mutation of the tree by design. Two reviewers probing concurrently in one
checkout are running each other's experiments.

**Lesson.** Concurrent reviewers get separate checkouts. Until they do, the recovery QA improvised is
the standing discipline and is worth keeping regardless: bracket every measurement with content hashes
and confirm the tree byte-identical to the commit before believing a reading. (The same discipline was
applied to all thirteen red probes at this milestone's verify, with `git status` compared against the
pre-probe baseline after each one.)

**Refs:** `STATE.md` `### From 61/03's build and review`, *"Orchestration defect, recorded against this
session"*.

---

## R6 — The declared `reads:`/`files:` sets were systematically short, and every escape was load-bearing

- **Kind:** mistake · **Area:** process
- **Stage:** refine · **Owner:** architect/product-owner · **Raised by:** the developer, at 61/00's build

**What happened.** 61/00's build stepped outside its declared `reads:` four times, none of them
avoidable. Two files sat in `files:` but not in `reads:`. `src/bundle/manifest.json` was missing from
the `files:` of every story that touches it. And `STATE.md` — the feedback lane every story is
instructed to append to — is in no story's `files:` at all.

**Why.** The sets are authored by hand from the contract rather than derived from anything, so they
encode what refine expected the build to need rather than what the build needs. Three of 61/00's four
escapes were files already *named inside* a file that was in the read set.

**Lesson.** Two mechanical rules would have caught all of it: a file in `files:` is in `reads:` by
construction (you cannot edit what you may not read), and a contract scenario that reads a declared
record implies that record is in `reads:`. And the shared feedback lane needs a declared writer —
seven stories appending to one file across seven branches is a merge conflict by construction, which
is why the orchestrator ended up as its sole author in practice.

**Refs:** `STATE.md` `## Feedback (for retro)` preamble.

---

## R7 — The repo's own `check` script runs the one command this machine forbids

- **Kind:** blocker · **Area:** process
- **Stage:** build · **Owner:** developer · **Raised by:** 61/00's build

**What happened.** `scripts/check.mjs` delegates to the full suite, which binds `:4182` — held by the
live control daemon on this machine, where the full suite is forbidden. 61/00's build ran it by
accident and had to kill it mid-flight.

**Why.** The rule lives in the project instructions; the script carries no guard. A documented rule
that the tooling does not enforce is a rule that costs a build to learn.

**Lesson.** Where a documented constraint has an obvious mechanical guard, ship the guard — the
project already learned this once and hook-enforced test isolation for exactly the same reason. The
same gap bit this verify from the other side: `node ./scripts/test.mjs` was refused at the gate, and
the sanctioned test-array-import path had to be rebuilt by hand each time rather than existing as a
runner anyone can call.

**Refs:** `STATE.md` 61/01's `scripts/check.mjs` note; `VERIFICATION.md` *"How the suite was run"*.
