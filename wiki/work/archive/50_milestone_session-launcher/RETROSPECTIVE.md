---
doc: retrospective
---
# 50 · Session launcher — Retrospective

## R1 · Exhaustive fitness lists must grow with a new protocol home

- **Kind:** near-miss · **Area:** architecture
- **Stage:** build · **Owner:** developer · **Raised by:** aof-architect
- **What happened:** The story added a mesh frame module while an inherited exhaustive transport
  ratchet still enumerated only the older protocol homes.
- **Why:** The story's direct tests proved the new wire but did not initially revisit guards that
  claim whole-mesh exhaustiveness.
- **Lesson:** When adding a transport module or frame builder, search for exhaustive architecture
  inventories and extend their file, builder, and import detectors in the same story.
- **Refs:** `VERIFICATION.md` `F-50-01-a`.

## R2 · Standalone Examples tables still need explicit row execution

- **Kind:** near-miss · **Area:** contract
- **Stage:** verify · **Owner:** QA · **Raised by:** aof-qa
- **What happened:** All named scenarios were green, but the feature files' standalone Examples rows
  were not initially parameterized by the executable tests.
- **Why:** The tables were not attached to Scenario Outlines, so the custom test harness could not
  derive row execution automatically.
- **Lesson:** Map every Examples row explicitly during traceability review, even when the Gherkin
  structure does not provide placeholders.
- **Refs:** `VERIFICATION.md` `F-50-01-b`.

## R3 · Bound delegated work by an observable hand-back

- **Kind:** blocker · **Area:** process
- **Stage:** build · **Owner:** orchestrator · **Raised by:** orchestrator
- **What happened:** The delegated developer persisted useful changes but did not return a result and
  had to be interrupted; the orchestrator recovered the shared diff and completed review inline.
- **Why:** The delegated lane continued past the bounded ack-send fix without a timely completion
  checkpoint.
- **Lesson:** Give narrow implementation delegates an explicit stop-after-focused-tests hand-back and
  request status before broad verification; persisted shared-tree work must be inspected before retry.
- **Refs:** `observability/report.md`.

## R4 · The milestone's own recurring lesson, a FOURTH time — at the verify layer

- **Kind:** near-miss · **Area:** process
- **Stage:** verify · **Owner:** orchestrator · **Raised by:** orchestrator
- **What happened:** `aof:verify` declined the milestone on F-50-C, writing that the red producer-
  fixture gate *"cannot be discharged by an agent — needs an operator deploy + re-capture"*. That was
  wrong, and the milestone sat blocked on it. Two checks, each costing under a minute, dissolved it:
  (a) `relaying` enters the projection as `record.relaying === true` — **unconditional**, so it is
  code-shaped and no live fleet is needed to produce the key; (b) the fixture file's **own provenance
  comment** already documented the deploy-free re-capture m48 used for the identical drift.
- **Why:** The claim was read off the gate's header prose (*"DO NOT make this green by editing a
  payload or weakening a detector"*) rather than from its mechanism. The header forbids two specific
  shortcuts; it never said re-capture required a deploy — that was inferred and then written as fact.
- **Lesson:** STATE already records this exact shape three times at the ADR layer ("an ADR argued
  form X would evade gate G and never planted X"). It recurs at the **verify** layer as: *a claim
  about what a gate requires is a claim about a call site — read the call site.* Before writing
  "only a human can discharge this", read (1) how the changed field is produced, and (2) how the same
  gate was discharged last time. Both live in the tree.
- **Refs:** `VERIFICATION.md` `F-50-C`; STATE `## Operator gate`.

## R5 · A self-check that holds its OWN copy of the yardstick refuses every legitimate change

- **Kind:** near-miss · **Area:** architecture
- **Stage:** verify · **Owner:** architect · **Raised by:** orchestrator
- **What happened:** With the fixtures correctly re-captured, `acd-captured-producer-fixture` went red
  on a *different* clause — the m49/ADR-010 typed-fixture self-check, which hard-coded its own copy of
  the producer's key lists and asserted the real fixtures pass against it. A test whose purpose is to
  prove the detectors work was refusing the very re-capture ADR-008 requires.
- **Why:** The main clause was written to derive its yardstick from the live producer (and did, and
  moved correctly). The self-check was written later, in a hurry, with a literal — so the file had two
  ideas of the producer and only one of them tracked it.
- **Lesson:** When a gate has a live yardstick, every clause in that file must read the SAME seam. A
  literal copy inside a self-check is a second source of truth that fails silently in the direction
  that blocks correct work. Fixed by pointing it at `produceProducerShape()`; non-vacuity re-proven.
- **Refs:** `VERIFICATION.md` `F-50-H`.

## R6 · Judge pixels with a judge, but settle sub-2px rules with a probe

- **Kind:** near-miss · **Area:** design
- **Stage:** verify · **Owner:** QA · **Raised by:** aof-designer
- **What happened:** The designer returned **GAPS**, on a measured claim that the trigger (23.5px) and
  the selects/action (~22.5px) sat under DESIGN §Accessibility req 8's ≥24 CSS px floor — consistent
  across four frames. A `getBoundingClientRect` probe at DPR 1 measured **26 / 25 / 24.66**. All five
  controls clear the floor; the gap did not exist.
- **Why:** Edges were read off DPR-2 screenshots, where a 1px border plus antialiasing is ~2 CSS px of
  ambiguity — the same order as the rule being judged. The designer flagged this honestly and asked
  for the probe rather than asserting; the process is what nearly logged a false finding, not the
  reviewer.
- **Lesson:** The screenshot hand-off is right for composition, hierarchy, copy and geometry-in-the-
  large. It is **not** sound for a rule whose tolerance is near the measurement error. Any numeric
  DESIGN rule under ~4 CSS px needs a DOM probe as its evidence, and that probe belongs in QA's
  harness so it is asserted every run rather than re-litigated at each verify.
- **Refs:** `VERIFICATION.md` `F-50-I`.

## R7 · Build-time test tallies drift; the accepting party must re-measure

- **Kind:** near-miss · **Area:** process
- **Stage:** verify · **Owner:** orchestrator · **Raised by:** orchestrator
- **What happened:** STATE recorded the milestone's suite as "99/99". Its own five addends sum to 106,
  it omitted story 01's two suites entirely, and one figure ("42") was a scenario count rather than a
  test count. The true measurement is **128 across seven suites**.
- **Why:** Each number was written by the agent that had just finished its own story, in its own
  units, and no one re-added them.
- **Lesson:** Numbers reported by the party that did the work are an input, not evidence. `aof:verify`
  re-measures on a quiet tree and its table supersedes the narrative. Nothing here was red — but a
  tally nobody re-derives is exactly where a genuinely missing suite would hide.
- **Refs:** `VERIFICATION.md` `### The @executable suite, re-measured at verify`.
