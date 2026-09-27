@executable @cli @work @work-stream
Feature: the screen's name reaches the loop's own output — through the drive document, the lane's settle line and the halt line, in both paths

  ADR-003 §5, ADR-006. The driver resolves `screen: { id }` on a blocked run (138/00). `aof work
  drive`'s `--json` document already spreads the driver's result, and `reportFacts` in
  `src/commands/loop.mjs` already prints every non-null detail key, so neither command is edited.
  What carries the name between them is `childDriveOutcome` (`src/loop/child-drive.mjs`), the lane
  settle narration (`src/loop/wave.mjs`) and the halt details (`src/loop/cycle.mjs` and
  `src/loop/wave.mjs`).

  RULINGS (PO, 2026-09-27). (1) `childDriveOutcome` copies `screen` from a parsed document only when
  it is `{ id }` with `id` matching `^[a-z][a-z0-9-]{0,39}$`, as `{ id }` and nothing else; any
  other value, and every non-document answer, yields no `screen` key. The document crosses a
  process boundary, so its shape is checked, not trusted. (2) The lane's settle line reads
  `Lane <ref> — settle: failed (blocked_screen: <id>).` when the settled outcome carries a screen,
  and is unchanged otherwise, at both of the wave's settle sites. (3) A halt on a run that failed
  with a screen carries the detail `screen` as the id string, beside `failureReason`, so the halt
  line prints `screen=<id>`. That holds for the lane path and the sequential path alike, and for
  the in-process driver the sequential suites use as well as the child. (4) `commands/drive.mjs`
  and `commands/loop.mjs` are read, not written.

  RULINGS (QA, 2026-09-27). (1) `childDriveOutcome`'s cases join the existing mapping case in
  `test/loop/loop-command-stops.test.mjs`, whose existing rows stay as they are. (2) The sequential
  halt is driven through `runReported` with an injected driver answering the blocked result, as the
  suite's s08 row drives `agent_error`. (3) The lane cases use the wave suite's fake lane child
  answering a document. (4) The drive document case uses the phase-driver suite's injected driver.

  Scenario Outline: the child's document is read for a screen, and only a well-formed one passes
    When `childDriveOutcome` is asked of <answer>
    Then it answers <outcome>

    Examples:
      | answer                                                                                                                      | outcome                                                                                              |
      | a document `{ outcome: "failed", failureReason: "blocked_screen", screen: { id: "mcp-approval" }, sessionId: "s" }`        | `{ outcome: "failed", failureReason: "blocked_screen", sessionId: "s", screen: { id: "mcp-approval" } }` |
      | a document `{ outcome: "failed", failureReason: "blocked_screen", screen: { id: "login", rows: ["x"] } }`                  | `{ outcome: "failed", failureReason: "blocked_screen", screen: { id: "login" } }`                    |
      | a document `{ outcome: "failed", failureReason: "blocked_screen", screen: "login" }`                                       | `{ outcome: "failed", failureReason: "blocked_screen" }`                                             |
      | a document `{ outcome: "failed", failureReason: "blocked_screen", screen: { id: "Login\nx" } }`                            | `{ outcome: "failed", failureReason: "blocked_screen" }`                                             |
      | a document `{ outcome: "done", sessionId: "s" }`                                                                           | `{ outcome: "done", sessionId: "s" }`                                                                |
      | `{ outcome: "died" }`                                                                                                      | `{ outcome: "failed", failureReason: "runtime_offline" }`                                            |

  Scenario: the drive document carries the screen
    Given the phase-driver suite's injected driver answering `{ outcome: "failed", failureReason: "blocked_screen", screen: { id: "first-run" }, sessionId: null }`
    When `aof work drive continue <ref> --json` runs
    Then the printed document holds `failureReason` `blocked_screen` and `screen` `{ id: "first-run" }`

  Scenario Outline: the lane's settle line names the screen
    Given a wave whose lane child answers a document failing with <failure>
    When the loop runs the wave
    Then the narration holds `Lane 07/01 — settle: <line>`

    Examples:
      | failure                                                       | line                                      |
      | `blocked_screen` and `screen: { id: "mcp-approval" }`         | `failed (blocked_screen: mcp-approval).`  |
      | `blocked_screen` and no `screen`                              | `failed (blocked_screen).`                |
      | `agent_error` and no `screen`                                 | `failed (agent_error).`                   |

  Scenario Outline: the halt line names the screen in both paths
    Given <path> whose drive fails `blocked_screen` with `screen: { id: "<id>" }`
    When the loop runs to its halt
    Then the halt is `run-not-retryable` from `run-store:not-retryable`, its line holds `failureReason=blocked_screen` and `screen=<id>`, and the item was driven once

    Examples:
      | path                                                        | id           |
      | the sequential shell, with an injected in-process driver    | login        |
      | a wave lane, with a fake lane child answering a document    | mcp-approval |

  Scenario: a halt with no screen prints no screen
    Given the sequential shell with an injected driver failing `agent_error`
    When the loop runs to its halt
    Then its line holds `failureReason=agent_error` and does not contain `screen=`
