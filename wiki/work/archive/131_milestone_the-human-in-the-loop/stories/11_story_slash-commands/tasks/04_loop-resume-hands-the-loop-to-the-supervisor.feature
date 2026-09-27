@executable @cli @work @work-stream
Feature: `/loop resume` hands a supervised loop to the supervisor through a durable resume request, and starts no process itself

  ADR-009 §6. The supervisor, the desktop app polling `mesh:status` declarations, starts the
  process. The bot never does, and neither does any daemon.
  - `work:loop` gains the input `handOff` and the CLI flag `--hand-off`.
  - `/loop resume scope:<ref>` dispatches `invoke("work:loop", { scope, handOff: true })`.
  - The verb resolves the scope's latest declaration and writes `requestLoopResume` in
    `src/loop/stop-request.mjs`, at `<meshRoot>/loop-resumes/<loopRunId>.json` with keys
    `{ loopRunId, scope, workspaceId, by, requestedAt }`.
  - `decideSupervisedDeclarations` takes an additive `resumeRequested` set. A supervised
    declaration in it yields a row even when it is neither stale nor resumable, and even over an
    honoured stop mark. The compute budget still gates it.
  - `supervisedDeclarations` reads the set.
  - `aof work loop <scope> --resume` clears the request where it clears the stop mark.

  RULINGS (PO, 2026-09-25).
  (1) The verb refuses `loop-hand-off-not-supervised` for an unsupervised declaration, naming `aof work
  loop <scope> --resume`. It refuses `loop-hand-off-running` for a live one,
  and `loop-hand-off-no-declaration` when the scope has none. Like 130's stop, the verb answers
  a refusal as a value, and the CLI face exits non-zero on it.
  (2) `--hand-off` together with `--stop`, `--dry-run` or `--resume` is refused `invalid-input`.
  (3) A second hand-off before the relaunch overwrites the request, which is idempotent.
  (4) The success reply reads `<@user> handed <scope> to the supervisor — it relaunches with
  --resume on its next poll`.
  (5) The request's `by` is `{ node, pid }`, the shape of 130's stop record.

  RULINGS (QA, 2026-09-25). (1) The decider is pure, so its cases hand it runs directly. (2) "No
  process" is asserted by an injected spawn seam that must never be called, in both the verb and
  the bot.

  Scenario: a halted supervised loop is handed off and then listed
    Given scope `131` whose latest supervised declaration's latest run is `done`, not live, with budget left
    When `aof work loop 131 --hand-off --json` runs
    Then it answers `handedOff: true` with the declaration's `loopRunId`, and `<meshRoot>/loop-resumes/<loopRunId>.json` holds the five keys
    And `supervisedDeclarations` now yields a row for `131` whose argv carries `--resume`
    And no process was spawned

  Scenario Outline: what the decider yields for a supervised declaration
    Given a supervised declaration whose latest run is <latest>, <stop>, and <request>
    When `decideSupervisedDeclarations` runs
    Then it <yields>

    Examples:
      | latest                     | stop                     | request                      | yields                  |
      | `done`                     | no stop mark             | no resume request            | no row                  |
      | `done`                     | no stop mark             | a resume request             | a row                   |
      | `done`                     | an honoured stop mark    | a resume request             | a row                   |
      | `done`                     | an honoured stop mark    | no resume request            | no row                  |
      | `done`, budget exhausted   | no stop mark             | a resume request             | no row                  |

  Scenario Outline: what the hand-off refuses
    Given scope `131` whose declaration is <declaration>
    When `aof work loop 131 --hand-off` runs
    Then it exits non-zero with `<code>`, and no resume request is written

    Examples:
      | declaration                            | code                 |
      | unsupervised and halted                | loop-hand-off-not-supervised  |
      | supervised with a live running run     | loop-hand-off-running         |
      | absent                                 | loop-hand-off-no-declaration  |

  Scenario: the relaunch clears the request
    Given a resume request for the declaration of `131`
    When `aof work loop 131 --resume` starts
    Then the request file is gone, and so is any stop mark for that declaration

  Scenario: /loop resume replies in the channel
    When allowed user "umami" runs `/loop resume scope:131` for the halted supervised scope
    Then `work:loop` was invoked with `{ scope: "131", handOff: true }`, and the in-channel reply is `@umami handed 131 to the supervisor — it relaunches with --resume on its next poll`
