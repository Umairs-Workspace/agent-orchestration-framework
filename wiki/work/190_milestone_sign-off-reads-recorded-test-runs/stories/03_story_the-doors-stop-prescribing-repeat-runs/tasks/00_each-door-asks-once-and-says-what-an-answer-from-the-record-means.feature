@executable @docs @assets @work-stream
Feature: each door asks once and says what an answer from the record means

  WHY. Agents do what the prose says. If `<review_lanes>` still justifies a lane's test time, or a
  door still reads as "run it again to be sure", an agent will reach for `--fresh` and pay the cost
  the command no longer charges (ADR-006 §1, §2). Each door keeps its one
  `aof test --scope impacted --story <ref>` line. The prose after it says that a repeat on unchanged
  content is answered from the record, and that the answer is the evidence.
  The cases cut the marked regions of the bundle sources, as `work-test-declared.test.mjs` already
  cuts `<build_terminator>` and `<review_lanes>`, and compare each with its Codex variant.

  Rule: R1 · Each door asks `aof test` once, and an answer from the record is the evidence

    Scenario: E1 · the review lanes share one run
      When the `<review_lanes>` region of `packages/core/assets/commands/continue.md` is read
      Then it still names `aof test --scope impacted --story <ref>`
      And it says lanes started together on one diff make one run, and the rest are answered from its record
      And it no longer cites the 58.6%, 54.3% or 45.6% test-runner measurements

    Scenario: E2 · the build terminator names the answer as evidence
      When the `<build_terminator>` region is read
      Then it says a repeat on unchanged content is answered from the record
      And it says that answer is the evidence, written by the command

    Scenario: E3 · the operator's review runs the story's tests once
      When step 2 of `packages/core/assets/commands/review.md`'s process is read
      Then it names `aof test --scope impacted --story <ref>` once
      And it does not name `--fresh`

  Rule: R2 · `--fresh` is named only as the way to chase a flake

    Scenario: E4 · `--fresh` appears only beside a suspected flake
      When every command under `packages/core/assets/commands/` is searched for `--fresh`
      Then each occurrence sits in a sentence that names a suspected flake
      And that sentence asks the result to say the run was a deliberate repeat

    Scenario: the Codex variants say the same
      When each edited region is compared with its section in `packages/core/assets/variants/codex/workflow.md`
      Then the variant carries the same `aof test` line and the same answer-from-the-record sentence
