@executable @cli @work @work-stream
Feature: the lane bound narrows — work:dispatch takes a bound it can only narrow to, and the loop passes its own key when set

  `work.dispatch.concurrency` stays the pool's slot bound, resolved at its one site
  (`dispatchConcurrencyFromConfig`, `src/work/dispatch.mjs`) and read by nothing else. `work:dispatch`
  gains an optional `bound` input: a positive integer NARROWS the effective bound to
  `min(bound, pool)`; anything else (absent, `0`, a non-integer, a value above the pool's) leaves the
  pool's bound in effect. The effective bound is what `planDispatchLaneAdmissions` admits under and
  what the answer's `bound` carries on EVERY face (`list`, `refs`, `ref`, `sweep`, `cleanup`) — a
  caller never has to ask a second question. The loop (`src/commands/loop.mjs` → `src/loop/wave.mjs`)
  resolves `work.loop.dispatch.concurrency` through the bounds home ONCE, carries it on the wave's
  bounds as `laneBound`, and passes it as `bound` on its `--list` read and its `{ refs }` ask when it
  is a number — and passes NOTHING when it is `null`, so an unset key is byte-identical to HEAD. The
  narration `Wave N — dispatching … (bound B)` and the wave run's `brief.wave.bound` carry the
  effective bound. ADR-006 carries the dated amendment: a loop-scoped NARROWING of the pool bound,
  read in the bounds home, handed to admission; the family still spells neither key.

  RULINGS. The family reads the key through `loopDispatchConcurrencyFromConfig` in the SHELL
  (`src/commands/loop.mjs`, beside `loopConcurrencyFromConfig`) and hands the number to the wave on
  `bounds` — the wave module itself imports nothing new from the home and holds no literal.

  Background:
    Given a real dispatch fixture (`withDispatchRepo`) with `work.dispatch.concurrency` 3 unless a row says otherwise

  Scenario Outline: the effective bound is the pool's narrowed by a caller's positive integer
    Given `work.dispatch.concurrency` is <pool> in the fixture's config
    When `work:dispatch` is invoked with `{ list: true<bound> }`
    Then the answer's `bound` is <effective>

    Examples:
      | pool   | bound          | effective |
      | 3      |                | 3         |
      | 3      | , bound: 2     | 2         |
      | 3      | , bound: 1     | 1         |
      | 3      | , bound: 3     | 3         |
      | 3      | , bound: 5     | 3         |
      | 3      | , bound: 0     | 3         |
      | 3      | , bound: 2.5   | 3         |
      | 3      | , bound: "2"   | 3         |
      | unset  | , bound: 2     | 2         |
      | unset  |                | 3         |
      | 2      | , bound: 3     | 2         |

  Scenario: admission runs under the narrowed bound and every face answers it
    Given `work.dispatch.concurrency` is 3 and stories `00`, `01`, `02` are ready
    When `work:dispatch` is invoked with `{ refs: ["53/00", "53/01", "53/02"], bound: 2 }` with a recording `runDispatchLane`
    Then the answer's `bound` is 2, two entries are admitted and one is `refused` with reason `at-capacity`
    And `materialised.peak` is at most 2
    And a following `{ list: true, bound: 2 }` answers `bound` 2 and `{ list: true }` answers `bound` 3
    And `{ cleanup: true, ref: "53/00", bound: 2 }` answers `bound` 2

  Scenario: the input schema declares bound as a number and the narrowing ignores a non-integer
    When the `work:dispatch` command's `input.properties.bound` is read
    Then it is `{ type: "number" }` and `additionalProperties` stays `false` (the registry does not validate at invoke; the narrowing is what refuses `2.5` and `"2"`)

  Scenario Outline: the loop passes its key as the bound only when it is set
    Given the lane fixture (`test/support/loop/lane-fixture.mjs`) with `work.loop.concurrency` `refine_first` and a two-member wave
    And `.aof/aof.config.json` carries <loopDispatch>
    When `runLoopBody` drives one BUILD tick with a recording `work:dispatch`
    Then the `{ list: true }` ask carries <listBound> and the `{ refs }` ask carries <refsBound>
    And the narration line `Wave 1 — dispatching …` names `(bound <narrated>)`
    And the wave run's `brief.wave.bound` is <narrated>

    Examples:
      | loopDispatch                                  | listBound     | refsBound     | narrated |
      | no `work.loop.dispatch` key                   | no `bound`    | no `bound`    | 3        |
      | `work.loop.dispatch.concurrency: 1`           | `bound: 1`    | `bound: 1`    | 1        |
      | `work.loop.dispatch.concurrency: 5`           | `bound: 5`    | `bound: 5`    | 3        |
      | `work.loop.dispatch.concurrency: 0`           | no `bound`    | no `bound`    | 3        |

  Scenario: a narrowed loop runs one lane at a time over a two-member wave
    Given the lane fixture with `work.loop.dispatch.concurrency: 1` and a two-member wave
    When `runLoopBody` runs the BUILD phase to completion with the injected `spawnLaneDrive`
    Then the two `spawnLaneDrive` calls never overlap in time (the second starts after the first lane merged home)
    And both stories end `done` (the loop ran through VERIFY) with their lanes cleaned up

  Scenario: the family spells neither key and holds no literal
    When `src/loop/wave.mjs`, `src/loop/cycle.mjs`, `src/loop/child-drive.mjs` and `src/commands/loop.mjs` are read comment-stripped
    Then none contains `work.loop.dispatch`, `work.dispatch`, `dispatch?.concurrency` or `dispatch.concurrency`
    And `src/commands/loop.mjs` calls `loopDispatchConcurrencyFromConfig(` exactly once, imported from `../loop-bounds.mjs`
    And `test/arch/loop/acd-loop-concurrency-single-home.test.mjs` is green

  Scenario: ADR-006 records the amendment
    When `wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md` is read
    Then ADR-006 carries a dated 2026-09-15 amendment naming `work.loop.dispatch.concurrency`, `min`, the bounds home and `work:dispatch`'s `bound` input
    And its invariant still states that the family reads neither key
