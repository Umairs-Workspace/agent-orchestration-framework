@executable @cli @work @validate
Feature: the three keys join the bounds home — twelve keys, verbatim-or-null, and the controls admit the shape

  `src/loop-bounds.mjs` is the single home of every `work.loop.*` key (69/ADR-001, FF-6901). It
  gains three, appended after `work.loop.concurrency` in this order: `work.loop.dispatch.concurrency`
  (a positive integer — the loop's own bound on concurrent lanes), `work.loop.agents.refine.mode` and
  `work.loop.agents.continue.mode` (`solo` | `orchestrated` — the role mode of a driven phase). Each
  value-shaped resolver answers its member VERBATIM and `null` for anything else — no clamp, no
  trim, no case-fold, never a throw — so `null` is "unset: inherit the workspace twin", the range
  probe (`resolve(p) === p`) admits exactly the members, and a config-shaped resolver reads its key
  off `workspace.config.work.loop` and answers the same. The home reads NO non-`work.loop.*` key:
  the fallback to `work.dispatch.concurrency` / `work.agents.mode` belongs to the consumer that
  already reads the twin (task 01, task 02). Three standing controls are re-pointed, each with a
  self-check: FF-6901's annexation leg distinguishes the home's read of ITS OWN
  `loopConfig(workspace)?.dispatch?.concurrency` from an annexed `work?.dispatch?.concurrency`;
  FF-12901 leg 1 pins twelve keys and leg 2 admits exactly one loop-dispatch read in the home while
  `src/work/dispatch.mjs` stays the pool bound's only reader; FF-7101's key regex reads a dotted
  key whole (`work.loop.agents.refine.mode`, never `work.loop.agents`). `loopBoundsFromConfig` (the
  deadline policy) is unchanged: the three are not deadlines.

  Background:
    Given `src/loop-bounds.mjs` after this story, imported fresh

  Scenario: both maps carry exactly twelve keys, the three appended last in order
    When `LOOP_BOUND_CONFIG_KEYS` and `LOOP_BOUND_VALUE_KEYS` are read
    Then each has length 12 and the two sorted lists are equal
    And indices 9, 10, 11 of each are `work.loop.dispatch.concurrency`, `work.loop.agents.refine.mode`, `work.loop.agents.continue.mode`
    And indices 0–8 are unchanged from HEAD (the eight deadlines and caps, then `work.loop.concurrency`)
    And `resolvesLoopBoundConfigKey(key)` is true for each of the three

  Scenario Outline: each value-shaped resolver answers its member verbatim and null for anything else
    When `<resolver>(<value>)` is called
    Then it answers <answer> and does not throw

    Examples:
      | resolver                        | value              | answer          |
      | resolveLoopDispatchConcurrency  | 2                  | 2               |
      | resolveLoopDispatchConcurrency  | 1                  | 1               |
      | resolveLoopDispatchConcurrency  | 0                  | null            |
      | resolveLoopDispatchConcurrency  | -1                 | null            |
      | resolveLoopDispatchConcurrency  | 2.5                | null            |
      | resolveLoopDispatchConcurrency  | "2"                | null            |
      | resolveLoopDispatchConcurrency  | undefined          | null            |
      | resolveLoopDispatchConcurrency  | null               | null            |
      | resolveLoopAgentMode            | "solo"             | "solo"          |
      | resolveLoopAgentMode            | "orchestrated"     | "orchestrated"  |
      | resolveLoopAgentMode            | "Solo"             | null            |
      | resolveLoopAgentMode            | " solo"            | null            |
      | resolveLoopAgentMode            | "inline"           | null            |
      | resolveLoopAgentMode            | 1                  | null            |
      | resolveLoopAgentMode            | undefined          | null            |

  Scenario Outline: each config-shaped resolver reads its own key off work.loop and answers the same
    Given a workspace whose `config.work.loop` is <loop>
    When `<resolver>(workspace)` is called
    Then it answers <answer>

    Examples:
      | resolver                           | loop                                                       | answer          |
      | loopDispatchConcurrencyFromConfig  | { dispatch: { concurrency: 2 } }                           | 2               |
      | loopDispatchConcurrencyFromConfig  | { dispatch: { concurrency: 0 } }                           | null            |
      | loopDispatchConcurrencyFromConfig  | { dispatch: {} }                                           | null            |
      | loopDispatchConcurrencyFromConfig  | {}                                                         | null            |
      | loopDispatchConcurrencyFromConfig  | undefined (no `work.loop` at all)                          | null            |
      | loopAgentRefineModeFromConfig      | { agents: { refine: { mode: "solo" } } }                   | "solo"          |
      | loopAgentRefineModeFromConfig      | { agents: { continue: { mode: "solo" } } }                 | null            |
      | loopAgentContinueModeFromConfig    | { agents: { continue: { mode: "orchestrated" } } }         | "orchestrated"  |
      | loopAgentContinueModeFromConfig    | { agents: { refine: { mode: "orchestrated" } } }           | null            |
      | loopAgentContinueModeFromConfig    | { agents: { continue: { mode: "SOLO" } } }                 | null            |
      | loopAgentContinueModeFromConfig    | { agents: "solo" }                                         | null            |

  Scenario Outline: the range probe admits exactly the members
    When `rangeProbe(<key>, <proposed>)` is called
    Then `admissible` is <admissible> and `code` is <code>

    Examples:
      | key                                 | proposed        | admissible | code                      |
      | "work.loop.dispatch.concurrency"    | 1               | true       | null                      |
      | "work.loop.dispatch.concurrency"    | 3               | true       | null                      |
      | "work.loop.dispatch.concurrency"    | 0               | false      | "outside-declared-range"  |
      | "work.loop.dispatch.concurrency"    | "3"             | false      | "outside-declared-range"  |
      | "work.loop.agents.refine.mode"      | "solo"          | true       | null                      |
      | "work.loop.agents.refine.mode"      | "orchestrated"  | true       | null                      |
      | "work.loop.agents.refine.mode"      | "parallel"      | false      | "outside-declared-range"  |
      | "work.loop.agents.continue.mode"    | "solo"          | true       | null                      |
      | "work.loop.agents.continue.mode"    | 1               | false      | "outside-declared-range"  |

  Scenario: the deadline policy is untouched and the home reads no workspace twin
    When `loopBoundsFromConfig({ config: { work: { loop: { dispatch: { concurrency: 1 }, agents: { refine: { mode: "solo" } } } } } })` is called
    Then its key set is exactly the eight of HEAD
    And a comment-stripped read of `src/loop-bounds.mjs` matches neither `work?.dispatch?.concurrency` nor `agents?.mode` nor `work?.agents`

  Scenario: FF-6901 distinguishes the home's own dispatch key from an annexed pool bound
    When `test/arch/loop/acd-loop-cap-single-home.test.mjs` runs under an isolated global home
    Then every case passes with the home reading `loopConfig(workspace)?.dispatch?.concurrency`
    And its self-check plants `config?.work?.dispatch?.concurrency` into the home and observes `FF-6901: loop-bounds annexes maxAttempts or dispatch concurrency`

  Scenario: FF-12901 pins twelve keys and admits one loop-dispatch read in the home
    When `test/arch/loop/acd-loop-concurrency-single-home.test.mjs` runs under an isolated global home
    Then leg 1 passes with `PINNED_LOOP_KEYS` of length 12
    And leg 2 passes with `src/work/dispatch.mjs` the pool bound's only reader and `src/loop-bounds.mjs` the loop key's only reader
    And the self-check observes a second pool read planted in `src/loop/wave.mjs` and a loop-key read planted outside the home, each named

  Scenario: FF-7101 reads a dotted key whole
    Given a sentence naming `work.loop.agents.refine.mode` in a bundled asset
    When `boundStatementProblems` runs over it
    Then it names no problem
    And the self-check observes that the same sentence naming `work.loop.agents.refine.wrong` is reported as `names \`work.loop.agents.refine.wrong\`, which LOOP_BOUND_VALUE_RESOLVERS does not carry`
