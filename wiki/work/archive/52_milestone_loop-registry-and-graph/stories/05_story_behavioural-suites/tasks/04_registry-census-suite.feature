@executable @cli @work @validate @bug @finding-F-52-04-H
Feature: The registry census — the day-one claims FF-5204's error-only sweep and floor-shaped roster leave undecided

  `test/work-loops-registry-census.test.mjs`, registered in `scripts/test.mjs`. It drives the exported
  loader and the five checks over the REAL nine-record registry at `wiki/work/loops/` — the only suite in
  this story with a fixture it does not author.

  WHY THIS TASK EXISTS AT ALL, since 52/05's headline scope is the 15 features of 52/00, 52/01 and 52/02.
  The story's own Notes leave it open: *"Whether [52/03's] residue … needs its own coverage is a
  refine-time question; do not assume either answer here."* Refine measured it, and the answer is yes.
  FF-5204 filters `model.findings` to `severity === "error"` and asserts `nodes.length >= 9` — a floor,
  deliberately, so a tenth legitimate record is not a defect. Both choices were right, and together they
  leave the registry's WARN lane and its ROSTER undecided. Worse, **no gate anywhere runs a structural
  check over the real registry**: FF-5205, FF-5206 and FF-5209 all drive hand-built literal models. So
  the milestone's headline claim — *three declared optimizers, all of them unpaired, because the registry
  declares no monitoring edge at all* — the PRD thesis this milestone exists to make computable, is today
  computed by nothing. That is the same species as F-52-04-H one story over, and it is cheap to close.

  PIN THE THESIS, BOUND THE INCIDENTAL. FF-5204's floor-not-equality note and 52/03's own second Examples
  table both say this in terms, and the split is the whole design of this suite. A claim RESEARCH or
  ADR-010/§ADR-012 §6 measured and the milestone reasons from is PINNED, because a change to it is a real
  event that must reach a reviewer. A count that is incidental to how many records happen to exist is a
  BOUND, because pinning it reddens CI for authoring a record. A suite that pins everything is a suite
  that will be edited to stay green, which is how a census stops being evidence.

  WHAT THIS SUITE MUST NOT TAKE. FF-5204 owns the zero-error claim, id-equals-stem, the typed-field
  sweep, cadence normalisation, and — its strongest leg — pointer authority for every `command:` and
  `module:` pointer. None is re-asserted here. It also does not take 52/03's prose-body citation clauses
  (*"its body cites `<path>:<line>`"*): those are decidable only by reading the markdown body, which the
  loader discards, and asserting a line number makes every unrelated source edit red this suite. They
  stay documentation-review material and are recorded as excluded, with that reason.

  ADR-010 (the day-one set), ADR-012 §6, ADR-013 §3. Values below were measured at refine on
  2026-08-15; the build re-measures each, and a discrepancy is a finding to triage, never a number to
  quietly update.

  Background:
    Given the real registry at "wiki/work/loops/", loaded through the exported loader

  Scenario: the roster is the named nine, not merely at least nine
    When the registry is loaded
    Then seven nodes declare "kind: loop" and two declare "kind: actor"
    And the loop ids are exactly build-to-green, review-fix-rereview, verify-triage-accept, autonomous-cascade, run-resilience, retrospective-memory-ingest and mesh-assignment-reclaim
    And the actor ids are exactly operator and product-owner
    And a tenth record added to the registry fails this case, which is the point — a new loop is reviewed, not absorbed

  Scenario: the honest warns are the deliverable working, and each is attributed
    When the registry is loaded
    Then six records report "loop-owner-unknown" and "verify-triage-accept" is not among them
    And exactly two report "loop-ceiling-uncapped", and they are build-to-green and review-fix-rereview
    And no record reports "loop-ceiling-unknown"
    And no record reports "loop-cadence-unknown"
    And at least one reports "loop-field-prose-only", counted as a bound rather than pinned

  # THE PRD THESIS, MADE COMPUTABLE. Nothing in the tree computes this today.
  Scenario: three loops declare themselves optimizers and all three are unpaired
    When the pairing check runs over the registry
    Then exactly three "loop-unpaired-optimizer" findings are reported
    And they name autonomous-cascade, build-to-green and review-fix-rereview
    And those three are exactly the records declaring "optimizing: true"
    And the remaining four loops declare "optimizing: false"
    And the finding count follows from the edge census below rather than being asserted twice

  Scenario: the registry declares two edges, and the absence of the rest is the finding
    When the registry is loaded
    Then exactly two edges are declared across all nine records, and both are target-setting
    And they are operator to autonomous-cascade, and product-owner to verify-triage-accept
    And no record declares a monitoring edge — which is why every declared optimizer is unpaired
    And no record declares a data-feed, a veto/constraint or a parameter-tuning edge
    And product-owner declares that one target-setting endpoint and no other edge of any type

  Scenario: exactly one node carries ground, and it is the operator
    When the registry is loaded
    Then exactly one record declares a "ground:" key
    And it is "operator.md", declaring "ground: exogenous"
    And the grounding check reports at least one grounded-exogenous-only component and at least one ungrounded component, both counted as bounds

  Scenario: only one loop is on a clock, which is why no timescale inversion is reported
    When the registry is loaded and the timescale check runs
    Then exactly one record declares a periodic cadence
    And no "loop-timescale-inversion" is reported
    And "loop-timescale-not-comparable" is reported no more than a bounded number of times

  Scenario: no finding in the registry comes from a node confirming itself
    When the five checks run over the registry
    Then no "loop-self-referential-edge" is reported
    And no node appears as both endpoints of any declared edge

  Scenario: the shared-actuator finding fires on a real shared lever
    When the arbitration check runs over the registry
    Then at least one "loop-shared-actuator-unarbitrated" is reported
    And at least one of them names an actuator that more than two loops declare
    And every contender it names is a record the registry declares

  Scenario: the four absences ADR-010 declared are still absent
    When the registry is loaded
    Then no record declares the id "loop:observe-tune"
    And no record declares an actuator that tunes another loop's parameters
    And no record's fields name "work-observe.mjs" or "degrade.mjs" as an actuator
    And the absence is asserted against the loaded model, not against a grep of the directory

  # THE GAP FF-5204 LEAVES IN ITS OWN STRONGEST LEG. It resolves `command:` and `module:` pointers
  # against real authorities but never checks that a `prose:` path names a file that exists — in exactly
  # the honesty axis this milestone is about.
  Scenario: every prose path names a file that exists
    When the registry is loaded
    Then every "prose:" value whose text is a repo-relative path names a file present in the tree
    And the check is on existence only, never on the file's content or on a line number

  Scenario: the census pins the thesis and bounds the incidental
    Given every case in this suite
    When the suite runs
    Then every pinned value is one ADR-010, ADR-012 §6 or RESEARCH measured, and its case names where
    And every bounded value is asserted as a floor or a ceiling, so authoring a record does not red it
    And no case re-asserts the zero-error claim, id-equals-stem, cadence normalisation or pointer authority

  # THE CENSUS TABLE. The "discipline" column is load-bearing: it is the difference between evidence and
  # a number that will be edited to stay green.
  Examples:
    | claim                                          | measured at refine 2026-08-15                                     | discipline | why                                                        |
    | loop records / actor records                   | 7 / 2, named                                                       | pinned     | ADR-010 declares the set; a tenth record is a reviewed event |
    | loop-owner-unknown                             | 6, verify-triage-accept excluded                                   | pinned     | RESEARCH found the one owner; the exclusion is the finding   |
    | loop-ceiling-uncapped                          | 2 — build-to-green, review-fix-rereview                            | pinned     | ADR-010's uncapped pair, named                              |
    | loop-ceiling-unknown / loop-cadence-unknown    | 0 / 0                                                              | pinned     | a declared gap of these kinds would be a new authoring fact  |
    | loop-field-prose-only                          | 12                                                                 | bounded    | scales with how many records exist; a floor, not a count     |
    | optimizing true / false                        | 3 / 4                                                              | pinned     | the PRD thesis's own premise                                 |
    | loop-unpaired-optimizer                        | 3 — autonomous-cascade, build-to-green, review-fix-rereview        | pinned     | the milestone's headline claim, computed by nothing today    |
    | declared edges, all types                      | 2, both target-setting                                             | pinned     | the edge census IS the "absence is the finding" deliverable  |
    | monitoring / data-feed / veto / parameter-tuning | 0 / 0 / 0 / 0                                                    | pinned     | zero monitoring is WHY the three optimizers are unpaired      |
    | records declaring ground:                      | 1 — operator.md, exogenous                                         | pinned     | ADR-005 admits exactly one ground class on one node kind      |
    | grounded / ungrounded components               | 2 / 7                                                              | bounded    | follows from the roster; pinning it duplicates the roster pin |
    | periodic cadences                              | 1                                                                  | pinned     | it is the stated reason no inversion is reported              |
    | loop-timescale-inversion                       | 0                                                                  | pinned     | a first inversion is a real event                            |
    | loop-timescale-not-comparable                  | 0                                                                  | bounded    | an artefact of how few edges exist                            |
    | loop-self-referential-edge                     | 0                                                                  | pinned     | ADR-011 §9's independence rule, over the real registry        |
    | loop-shared-actuator-unarbitrated              | 3, the widest naming an actuator four loops declare                | bounded    | the shape is the claim; the exact count follows the roster    |
    | loop-unowned-reference                         | 5                                                                  | bounded    | follows from the two target-setting edges                     |
    | prose: paths that exist                        | all                                                                | pinned     | FF-5204 resolves command: and module: only — this is the gap  |
