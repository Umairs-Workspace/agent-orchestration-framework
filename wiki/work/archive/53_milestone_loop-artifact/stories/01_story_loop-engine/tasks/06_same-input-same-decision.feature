@executable @cli @work @work-stream
Feature: The same input decides the same output — in this process, in a fresh one, and in a tree with nothing else in it

  Determinism is what makes every other scenario in this story a fact rather than a
  tendency. The milestone's opening claim is that a cap carried in prose is unenforceable
  because a model may skip it; a decision function that answered differently on a second
  call, in a second process, under a second timezone or against a second working directory
  would be unenforceable for the same reason, one layer down. So this task states the
  property behaviourally, over the real exports, at the only altitude a test can check:
  identical inputs, byte-identical outputs. It deliberately does NOT restate the structural
  half — "imports no `node:fs`", "calls no `Date.now()`", "performs no dynamic `import()`",
  "every export is `(plain data) => decision`" are FF-5307's legs and live in ARCHITECTURE's
  fitness-function table, enforced in CI by `acd-loop-state-rides-the-run-record`. What
  lives here is what an operator could observe: the engine's answer does not depend on when
  it is asked, where it is asked from, what else is installed, or how many times it has been
  asked before. One of those observations is also this story's parallelism guarantee made
  visible — the driver's `{outcome: done|failed|needs-input}` vocabulary is FROZEN INPUT
  DATA, not an import (ADR-005 §4, the partition's "53/01 declares no import of
  `src/agent-session-driver.mjs` in either direction"), so the engine decides identically in
  a tree where that module does not exist at all. That is the difference between 53/01 being
  parallel with 53/00 and merely being scheduled beside it. Mechanised as
  `test/work-loop-determinism.test.mjs`: the same frozen literal fixtures the other five
  suites use, replayed through repeat calls and through `node --input-type=module` child
  processes under varied environments — no tmpdir writes beyond a copy of the single module
  file, no spawn of an agent, no clock dependency — registered in `scripts/test.mjs` with
  this story (TECH_DEBT item 48). ADR-005 §3, ADR-004 §1, ADR-006 §3, and the milestone's
  story partition.

  Scenario: the same input decides byte-identically on a repeated call
    Given any fixture input from this story's suites
    When the engine decides for it twice in one process
    Then the two decisions serialise to identical JSON, key order included
    And no counter, cache or memo makes the second answer differ from the first

  Scenario: the same input decides byte-identically in a fresh process
    Given the same fixture input
    When the engine decides for it in one process and again in a newly spawned one
    Then the two serialised decisions are byte-identical
    And nothing in the answer depends on module load order or on how long the process has been alive

  Scenario: the answer does not depend on the clock
    Given the same fixture input
    When the engine decides for it in two fresh processes started minutes apart
    Then the two serialised decisions are byte-identical
    And no ISO-8601 instant appears in either decision that was not present in the input

  Scenario: the answer does not depend on the timezone or the locale
    Given the same fixture input
    When the engine decides for it in fresh processes under `TZ=UTC` and `TZ=Asia/Tokyo`, and again under a non-English `LANG`
    Then all three serialised decisions are byte-identical
    And every ordered array in the decision is ordered by code-unit comparison, never by locale collation

  Scenario: the answer does not depend on the working directory
    Given the same fixture input
    When the engine decides for it from this repo's root and again from an empty directory with no work stream, no `.aof` and no `wiki/`
    Then the two serialised decisions are byte-identical
    And a `hasTasks: false` input still decides `drive refine` even when the process's own tree holds task files

  Scenario: the answer does not depend on anything else being installed
    Given `src/work-loop.mjs` copied alone into an empty directory
    When the engine is imported there and decides for each fixture input
    Then every decision is byte-identical to the same decision made inside the repo
    And it decides identically with `src/agent-session-driver.mjs` absent — the driver's outcome vocabulary is frozen input data, never an import
    And it decides identically with `src/work.mjs`, `src/run-store.mjs` and `src/command-core.mjs` absent

  Scenario: the input is not mutated
    Given a fixture input serialised before the call
    When the engine decides for it
    Then the input serialises identically afterwards
    And no key was added, removed, reordered or frozen in place by the decision

  Scenario: two decisions share no mutable state
    Given the same fixture input decided twice
    When the caller mutates the first decision — deleting a key, pushing onto an array
    Then the second decision is complete and byte-identical to the first as it was returned
    And the reported `LOOP_STOPS` in the second is the full frozen eight

  Scenario: the order of the input's own keys changes nothing
    Given two inputs with identical values and different key insertion order
    When the engine decides for each
    Then the two serialised decisions are byte-identical
    And the decision's own key order is the same for both

  Scenario: every value in a decision is either frozen vocabulary or came from the input
    Given any fixture input
    When the engine decides for it
    Then every string in the decision is a member of a frozen vocabulary declared by this module or a value present in the input
    And no generated id, no timestamp, no absolute path and no random value appears
    And a `loopRunId` in a decision was supplied by the caller, never minted here

  Scenario: the closed sets are reported in a frozen order, every time
    Given any admitted invocation
    When the engine decides in ten fresh processes
    Then `LOOP_STOPS` appears in the same frozen order in all ten
    And the admitted scope forms appear as `driver` then `range` in all ten
    And the executable levels appear as `L1` then `L2` in all ten

  Examples:
    | perturbation                                   | expected                          |
    | the same call, twice in one process            | byte-identical                    |
    | a fresh process                                | byte-identical                    |
    | a fresh process minutes later                  | byte-identical                    |
    | `TZ=UTC` versus `TZ=Asia/Tokyo`                | byte-identical                    |
    | a non-English `LANG` / `LC_ALL`                | byte-identical                    |
    | run from the repo root versus an empty dir     | byte-identical                    |
    | the module copied out on its own               | byte-identical                    |
    | `src/agent-session-driver.mjs` absent          | byte-identical                    |
    | input key order changed                        | byte-identical                    |
    | a prior decision mutated by the caller         | byte-identical                    |
    | the input's VALUES changed                     | a different decision — the only thing that may change one |
