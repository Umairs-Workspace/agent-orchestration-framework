@executable @cli @work @work-stream
Feature: the worker reads its session's question and carries it on the durable park fact it already sends

  ADR-010 §1-§2. On a needs-input park, the worker calls `readWorkerAsk({ worktreePath,
  sessionId, phase, now })` in `src/mesh/park-resume.mjs`. That composes `readAskQuestion`, the
  one reader (ADR-002), over the worker's own transcripts, and answers `{ question, phase, askedAt
  }`. The park's `assignment.reported` payload gains that object as `ask`.
  `reportAssignmentSettled` (`src/effects/assignment-transitions.mjs`) passes `ask` through, and
  includes the key only when it is given.

  RULINGS (architect, 2026-09-25). (1) The carriage is additive on the existing durable park
  fact, not a new frame. The frozen status frame is not widened. (2) The journal-unavailable
  `fallbackSend` drops `ask`, so such a park reads as "question unreadable", exactly as a worker on
  an older build does. (3) `src/mesh/worker-execution.mjs` changes by a same-line edit at its park
  site and stays at 1,914 lines (item 83's sink ratchet). (4) The re-pinned payload suites say
  why: "131/ADR-010: the worker's question rides the park fact".

  RULINGS (PO, 2026-09-25). (1) The question is clipped to 8,000 code points, with `…` appended
  when it was clipped. (2) `phase` is ADR-004 §6's word from the directive's drive (`refine`,
  `build` or `verify`), or `null`. (3) An unreadable transcript answers `question: null` and still
  carries `phase` and `askedAt`. It never throws, and the park is never delayed by a failed read.

  RULINGS (QA, 2026-09-25). The transcript is a fixture file under an isolated projects directory.
  The payload is read from the worker's journal, never from a mock's arguments alone.

  Scenario: a park carries the question
    Given a worker assignment whose session ends its turn with the four-line ask and the sentinel
    When the worker parks it as needs-input
    Then the journal's `assignment.reported` payload has `state: "running"`, `code: "needs-input"` and `ask: { question: <the four lines>, phase: "build", askedAt: <the park instant> }`

  Scenario Outline: which reports carry `ask`
    When the worker reports <report>
    Then the payload's key set is <keys>

    Examples:
      | report                              | keys                                                               |
      | a needs-input park                  | `assignmentId, state, runId, sessionId, branch, code, ask`         |
      | `done`                              | `assignmentId, state, runId, sessionId, branch, code`              |
      | `failed` with `daemon-restarted`    | `assignmentId, state, runId, sessionId, branch, code`              |

  Scenario Outline: what the worker reads as the question
    Given a session whose transcript <transcript>
    When `readWorkerAsk` runs
    Then `question` is <question>

    Examples:
      | transcript                                           | question                                           |
      | ends its turn with a 200-character ask               | the ask, minus the sentinel line                   |
      | ends its turn with a 9,000-character ask             | the first 8,000 code points, then `…`              |
      | is missing                                           | `null`, and one `ask-question-unreadable` degrade  |

  Scenario: the journal-unavailable fallback drops the ask
    Given the worker's journal cannot be opened
    When the worker parks a session as needs-input
    Then `fallbackSend` is called with `code: "needs-input"` and no `ask`

  Scenario: the sink file does not grow
    When `src/mesh/worker-execution.mjs` is measured
    Then it is 1,914 lines
