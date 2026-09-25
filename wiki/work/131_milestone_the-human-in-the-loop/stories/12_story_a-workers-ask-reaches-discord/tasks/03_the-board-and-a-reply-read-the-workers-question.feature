@executable @cli @ui @work @board
Feature: the board shows a worker's question, and a Discord reply answers it through the worker's resume

  ADR-010 §5-§6. `applyAskOverlay`'s worker ask (`src/commands/list.mjs`) takes `question`,
  `phase` and `askedAt` from `execution.ask` when present. It keeps today's `question: null` (the
  card's "question unreadable") otherwise. A Discord reply to the posted message reaches
  `work:answer` in the control's checkout (story 10). That finds no ask file and takes 04's mesh
  leg, `mesh:terminal-resume` with `answer`, unchanged. The mesh leg now also fires
  `session-answered`, from the same single `notify(` call in `src/commands/resume.mjs` that the
  local leg uses.

  RULINGS (PO, 2026-09-25). (1) The mesh leg's `session-answered` carries `phase` and `elapsedMs`
  from `execution.ask` when present, and `null` otherwise. (2) A worker ask on the board is still
  `local: false`, and its card still names the node. (3) The mesh leg announces only after
  `mesh:terminal-resume` did not refuse. A refused resume posts nothing.

  RULINGS (QA, 2026-09-25). (1) The reply case reuses 10's fixture with the index record pointing
  at the control checkout, and `mesh:terminal-resume` injected through `ctx.invokeRegistered`. (2)
  The board case runs `work:list` with `mesh: true` over a store row, not a hand-built row.

  Scenario Outline: the board's worker ask
    Given an assignment row for `131/03` on "node-2976", `running` and `needs-input`, whose `ask` column is <column>
    When `work:list` runs with `mesh: true`
    Then the row's `ask` has `local: false`, `node: "node-2976"` and <fields>

    Examples:
      | column                                                              | fields                                                         |
      | `{ question: "Decision needed: …", phase: "build", askedAt: "…" }`  | `question: "Decision needed: …"`, `phase: "build"`, that `askedAt` |
      | absent                                                              | `question: null`, `phase: null`, `askedAt` = the row's `updatedAt` |

  Scenario: a Discord reply answers a worker's ask
    Given the control-side index records message "900000000000000002" for `131/03` in the control's checkout, and the user is allowlisted
    When the user replies "take option B" to that message
    Then `mesh:terminal-resume` was invoked once with the row's session and `answer.text` "take option B", `answer.by.via` "discord"
    And exactly one `session-answered` POST is made, and the reply gets a ✅ reaction

  Scenario: a refused resume announces nothing
    Given `mesh:terminal-resume` answers `refused: true`
    When `aof work answer 131/03 "x"` runs on the control
    Then it exits with `terminal-resume-not-started`, and no `session-answered` POST is made

  Scenario: one announcement site
    When `src/commands/resume.mjs` is swept for `notify(` calls
    Then there is exactly one, and both the local and the mesh leg reach it
