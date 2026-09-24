@executable @cli @work @work-stream
Feature: work.loop.concurrency resolves in the bounds' one home as a mode

  The key is a MODE, not a number, and it lives where every other `work.loop.*` key lives —
  `src/loop-bounds.mjs` (ADR-001 §1; 69/ADR-001's single home; 61/ADR-009's "the range lives in the
  resolver"). What lands: `LOOP_CONCURRENCY_MODES` (frozen `["sequential", "refine_first"]`),
  `DEFAULT_LOOP_CONCURRENCY` (`"sequential"`), `resolveLoopConcurrency(value)` — a member answers
  itself verbatim, anything else answers the default and never throws — and
  `loopConcurrencyFromConfig(workspace)` reading `workspace.config.work.loop.concurrency`. Both
  join their maps: `LOOP_BOUND_VALUE_RESOLVERS["work.loop.concurrency"] === resolveLoopConcurrency`
  and `LOOP_BOUND_CONFIG_RESOLVERS["work.loop.concurrency"] === loopConcurrencyFromConfig`, so the
  two-way key equality FF-6111 asserts still holds and `rangeProbe` answers for the key through
  the resolver alone (`resolve(p) === p` iff `p` is a mode). It is NOT added to
  `loopBoundsFromConfig` — that object is the driver's deadline policy and gains no mode.

  A LOOP RECORD CITING THE KEY AS A CEILING CARRIES NO STRING AS ITS BOUND. `configBound` in
  `src/loop-record.mjs` applies to a resolver's ANSWER the same `Number.isSafeInteger` guard it
  already applies to a raw key, so `ceiling: [config:work.loop.concurrency]` projects as a declared
  bound whose `bound` is `null`, never `"refine_first"`. The tuner needs nothing: a non-numeric step
  is already `NOT_AN_ORDINAL_KNOB`.

  Background:
    Given the module `src/loop-bounds.mjs` is imported fresh

  Scenario: the mode list and the default are frozen facts
    When `LOOP_CONCURRENCY_MODES` and `DEFAULT_LOOP_CONCURRENCY` are read
    Then `LOOP_CONCURRENCY_MODES` deep-equals `["sequential", "refine_first"]`
    And `Object.isFrozen(LOOP_CONCURRENCY_MODES)` is true
    And `DEFAULT_LOOP_CONCURRENCY` is `"sequential"`

  Scenario Outline: the config reader answers the configured mode and sequential for everything else
    When `loopConcurrencyFromConfig(<workspace>)` is called
    Then it answers <answer>

    Examples:
      | workspace                                                       | answer          |
      | undefined                                                       | "sequential"    |
      | {}                                                              | "sequential"    |
      | { config: {} }                                                  | "sequential"    |
      | { config: { work: { loop: null } } }                            | "sequential"    |
      | { config: { work: { loop: {} } } }                              | "sequential"    |
      | { config: { work: { loop: { concurrency: "sequential" } } } }   | "sequential"    |
      | { config: { work: { loop: { concurrency: "refine_first" } } } } | "refine_first"  |
      | { config: { work: { loop: { concurrency: "parallel" } } } }     | "sequential"    |
      | { config: { work: { loop: { concurrency: 2 } } } }              | "sequential"    |

  Scenario Outline: the value resolver answers a member verbatim and the default otherwise
    When `resolveLoopConcurrency(<value>)` is called
    Then it answers <answer>
    And it does not throw

    Examples:
      | value              | answer          |
      | "sequential"       | "sequential"    |
      | "refine_first"     | "refine_first"  |
      | "parallel"         | "sequential"    |
      | "REFINE_FIRST"     | "sequential"    |
      | "refine-first"     | "sequential"    |
      | " refine_first"    | "sequential"    |
      | ""                 | "sequential"    |
      | undefined          | "sequential"    |
      | null               | "sequential"    |
      | 1                  | "sequential"    |
      | true               | "sequential"    |
      | ["refine_first"]   | "sequential"    |
      | { }                | "sequential"    |

  Scenario: the key is a member of BOTH resolver maps and of both key lists
    When the resolver maps are read
    Then `LOOP_BOUND_VALUE_RESOLVERS["work.loop.concurrency"]` is `resolveLoopConcurrency`
    And `LOOP_BOUND_CONFIG_RESOLVERS["work.loop.concurrency"]` is `loopConcurrencyFromConfig`
    And `LOOP_BOUND_VALUE_KEYS` sorted deep-equals `LOOP_BOUND_CONFIG_KEYS` sorted
    And both key lists have length 9
    And `resolvesLoopBoundConfigKey("work.loop.concurrency")` is true

  Scenario Outline: the range probe admits exactly the two modes
    When `rangeProbe("work.loop.concurrency", <proposed>)` is asked
    Then `admissible` is <admissible>
    And `code` is <code>
    And `inEffect` is <inEffect>
    And `key` is `"work.loop.concurrency"`

    Examples:
      | proposed        | admissible | code                     | inEffect        |
      | "sequential"    | true       | null                     | "sequential"    |
      | "refine_first"  | true       | null                     | "refine_first"  |
      | "parallel"      | false      | "outside-declared-range" | "sequential"    |
      | "Sequential"    | false      | "outside-declared-range" | "sequential"    |
      | 3               | false      | "outside-declared-range" | "sequential"    |
      | undefined       | false      | "outside-declared-range" | "sequential"    |
      | null            | false      | "outside-declared-range" | "sequential"    |

  Scenario Outline: no one-notch step on the mode is admissible, from either mode in either direction
    When `stepProbe("work.loop.concurrency", <from>, <step>)` is asked
    Then `admissible` is false
    And `code` is `"outside-declared-range"`
    And `inEffect` is `"sequential"`
    And `from` is <from> and `step` is <step>

    Examples:
      | from            | step |
      | "sequential"    | 1    |
      | "sequential"    | -1   |
      | "refine_first"  | 1    |
      | "refine_first"  | -1   |

  Scenario: a step taken from the configured mode is refused the same way
    When `stepProbeFromConfig(<a workspace configured refine_first>, "work.loop.concurrency", 1)` is asked
    Then `admissible` is false and `code` is `"outside-declared-range"`
    And `from` is `"refine_first"` and `step` is 1

  Scenario: the deadline policy gains no mode
    When `loopBoundsFromConfig` is asked with `work.loop.concurrency: "refine_first"` configured
    Then the answer's key set is exactly `startToCloseMs, heartbeatMs, scheduleToStartMs, scheduleToCloseMs, startupGraceMs, reviewRounds, buildNoProgressRounds, progressMaxResets`
    And no key of the answer is `concurrency`
    And the answer deep-equals the answer for a workspace with no `work.loop` block

  Scenario: the registry loader accepts the key as a ceiling pointer
    Given a registry record whose `ceiling:` is `[config:work.loop.concurrency]`
    When `loadLoops` loads the registry holding it
    Then no finding whose code starts with `loop-ceiling` is reported for the record

  Scenario: a loop record citing the key as a ceiling carries no string bound
    Given a registry record whose `ceiling:` is `[config:work.loop.concurrency]` beside one whose `ceiling:` is `[config:work.loop.reviewRounds]`
    And a config carrying `work.loop.concurrency: "refine_first"` and `work.loop.reviewRounds: 2`
    And one run record per loop, each carrying its loop's declaration at cycle 1
    When `projectExecution` in `src/loop-record.mjs` projects both records
    Then the projected ceiling's `state` is `bounded` and its `bound` is `null`
    And the projected ceiling's `comparison` is `null`
    And the projected ceiling's `declared` deep-equals `["config:work.loop.concurrency"]`
    And a record citing `config:work.loop.reviewRounds` in the same projection carries `2` as `bound` and `within` as `comparison`
