@executable @cli @work @work-stream
Feature: The shell declares the loop it IS — one literal, one home, checked against the shipped registry

  The eighth key needs a value, and there is exactly one honest one for the loop shell:
  **`loop:autonomous-cascade`**. It is DISCOVERED rather than chosen, and three independent facts
  were measured at this repository's HEAD to establish it:

  - the registry record declares `reference: [command:work:next]` and
    `measurement: [command:work:next]`, and the shell's every decision tick is
    `invokeRegistered("work:next", { scope }, ctx)` (`src/commands/loop.mjs:853`);
  - the record declares `cadence: event:per-item`, and the shell dispatches `refine`, `continue`
    and `verify` per ready item through `decideLoopPhase` (`src/work-loop.mjs:753`);
  - the record declares `ceiling: [config:work.autonomous.maxAttempts]`, and that is literally the
    bound the shell resolves its cap from (`src/commands/loop.mjs:804`).

  A `.aof/loops/` record's own prose cites two OTHER line numbers for the first two of these, and
  both have drifted off their subjects since it was written. The citations above were re-measured
  rather than copied, which is 78/R1 applied to this contract rather than quoted in it.

  **The id is a constant the shell owns.** It is never derived from `scope` (a work-ref range) or
  `level` (`L1`/`L2`/`L3`) — neither of which ever resolves to a registry record, which is the whole
  of F-78-A — and no flag sets it. The inner loops the cascade supervises (`loop:build-to-green` and
  `loop:review-fix-rereview`, named on the cascade's own `target-setting` edges) are phases inside
  one engagement here; giving them their own engagements would need their own loop run ids and is
  not this story.

  **An id the registry does not declare is REPORTED, never refused at run time** — a deliberate
  departure from this story's own opening sketch. 78's projection already carries a gap class for
  exactly this (`ran-undeclared` — *"the loop ran and is not declared"*), a consumer repository's
  `.aof/loops/` may legitimately be absent (`loadLoops` answers `present: false` by design), and a
  shell that refused to run because a record was edited would make a reporting gap into an outage.
  The drift that actually matters — the framework's own shell naming an id the framework's own
  shipped registry does not declare — is caught before it ships, by a check over
  `src/bundle/loops/`, which is the copy aof controls.

  **One literal, one home.** The id the shell mints and the id the check reads are the same exported
  constant, never two spellings that can drift apart — the hand-copied-glyph species F-78-E records
  one milestone over.

  Scenario: every run one loop invocation mints carries the loop id
    Given a loop driven over a fixture tree at a level that drives phases
    When it completes
    Then every run record it minted carries `brief.loop.id`
    And every one of them is `loop:autonomous-cascade`

  Scenario: the id is the same across every phase and cycle of one engagement
    Given a loop that drives more than one phase under one loop run id
    When its run records are read
    Then they share one `loopRunId`
    And they share one `id`
    And the id did not change when the phase or the cycle did

  Scenario: a resumed loop keeps the id it had
    Given a loop that minted runs and was interrupted
    When it is resumed and drives another phase
    Then the resumed run carries the same `loopRunId` as before the interruption
    And it carries the same `id`
    And the projection therefore sees one engagement, not two

  Scenario: the id is not derived from the invocation
    Given two loops driven at different scopes and different levels
    When their declarations are compared
    Then both carry the same `id`
    And neither `scope` nor `level` appears in it

  Scenario: the shell reads no loop registry to mint a declaration
    Given a fixture tree with no `.aof/loops/` directory at all
    When a loop is driven over it
    Then it runs exactly as it does with the registry present
    And the runs it mints still carry the loop id
    And no refusal is raised about the missing registry

  Scenario: the id the shell mints is a loop the shipped registry declares
    Given the framework's own loop records under `src/bundle/loops/`
    When the id the shell mints is looked up among them
    Then a record declares it
    And that record's `kind` is `loop`

  Scenario: the drift check is armed
    Given the shipped record's declared id is changed to any other value
    When the check runs
    Then it fails, naming the id the shell mints and the ids the registry declares

  Scenario: a report-only loop still writes nothing
    Given a fixture tree and a loop requested at the report-only level
    When it runs to completion
    Then every file in the tree is unchanged
    And no run record was minted, so no declaration was written

  Examples:
    | registry loop                    | is it the shell's id | why                                                              |
    | `loop:autonomous-cascade`        | yes                  | its reference, measurement, cadence and ceiling are the shell's  |
    | `loop:build-to-green`            | no                   | a phase inside the engagement, supervised by the cascade         |
    | `loop:review-fix-rereview`       | no                   | a phase inside the engagement, supervised by the cascade         |
    | `loop:verify-triage-accept`      | no                   | the acceptance gate the shell drives, not the shell              |
    | `loop:run-resilience`            | no                   | per-run-start lifecycle policy, not a work-range cascade         |
    | `loop:mesh-assignment-reclaim`   | no                   | a periodic mesh loop the shell never enters                      |
    | `loop:retrospective-memory-ingest` | no                 | a per-milestone ingest the shell never enters                    |
