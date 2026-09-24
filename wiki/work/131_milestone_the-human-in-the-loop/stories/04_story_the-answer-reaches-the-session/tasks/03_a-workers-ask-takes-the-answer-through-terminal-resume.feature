@executable @cli @work @work-stream
Feature: a mesh worker's parked ask takes the answer through terminal-resume, and the worker types it and records it

  ADR-003 §5c, ADR-001 §1c. When `answerAsk` answers `null` (no ask file for this workspace and
  ref), the verb reads the execution overlay — `readExecutionOverlay` then
  `resolveScopedExecution` from `src/board-mesh-execution.mjs` — for the ref. A row that is
  `active`, `state: "running"`, `code: "needs-input"` and carries a `sessionId` is answered
  through the registry: `invoke("mesh:terminal-resume", { session, answer })`, by the deferred
  `command-core` import `src/commands/loop.mjs` uses (a static import would close the registry
  ring), honouring `ctx.invokeRegistered` when a suite injects it. `answer` is ONE additive
  optional key on `mesh:terminal-resume`'s closed schema, an object `{ text, by, askedAt }`, and
  rides `buildTerminalResumeEnvelope`'s `signal` as `answer`, omitted when absent as `reservedAt`
  is. The control router (`src/mesh/terminal-input.mjs`) forwards `answer` on the DOWN frame when
  present — it rebuilds that frame key by key, so without this hop the worker would never see it —
  and never logs its text. The worker's resume handler passes `command: frame.answer?.text ?? null`
  where it passes `command: null` today (a same-line edit; the sink stays at 1,914), so the
  driver types the answer inside its bracketed paste and submits it, into the parked session.
  `park-resume.mjs` appends ONE answered entry to the worker's run record when the resumed
  process starts. No notification fires on this leg (ADR-005 §6): the worker's question never
  reached the control, and neither does its answer's receipt.

  RULINGS (PO, 2026-09-23). AMENDS ADR-003 §5c in this authoring beat: `answer` is an object,
  not a string, so who gave it and when the worker parked travel with the text and the worker's
  record carries the same three facts a local record does.
  (1) `answer.text` is the text `answerAsk` already sanitised (it ran first and answered `null`);
  `answer.by` is the verb's `by`; `answer.askedAt` is the overlay row's `updatedAt` — the instant
  the worker reported `needs-input` — or `null`.
  (2) The worker's entry is written in `park-resume.mjs`'s `markProcessStarted`, the moment
  liveness is written, through 131/01's two writers in sequence: `openRunAsk(item, runId,
  { question: null, phase: null, now: answer.askedAt ?? now() })` then `answerRunAsk(item, runId,
  { answer: answer.text, by: answer.by ?? { actor: null, via: "mesh", node: null }, now: now() })`.
  A resume that never starts a process records nothing. A failure of either write is
  `reportDegrade("terminal-resume-ask-record", …)` and the resume continues: the record never
  fails the session. `question` is `null` (ADR-005 §6) and `phase` is `null` — DEFAULT DECISION,
  the worker's brief carries no phase word. Every entry on a worker's record is appended already
  answered, so `openRunAsk` never meets an open entry there.
  (3) `signal.answer` is present only when the command input carried it. The router forwards
  `answer` verbatim when it is an object whose `text` is a non-empty string, else drops the key
  and keeps the frame; a frame with `answer` and one without are otherwise byte-identical. Neither
  the router's one resume log line nor any worker log line contains the text.
  (4) The verb's document on this leg: `delivery: "mesh"`, `runId` = the resume result's
  `confirmedRunId ?? the row's runId`, `by` the verb's, `answeredAt` = `now`, `resume: null`,
  and `state` is `"resumed"` when the resume confirmed or `"dispatched"` when the row did not move
  within the window — the reservation stands, and the render repeats the terminal-resume warning:
  do not answer again while the row reads resumed. A `refused` result (the worker rejected before
  spawn) is thrown as `terminal-resume-not-started` (409): the answer was not typed, and the verb
  never says `ok: true` over it. The terminal-resume command's own refusals (`session-not-parked`
  and `resume-capacity-full` at 409, `relay-unconfigured` at 400, `session-unknown` at 404) pass
  through untouched.
  (5) A row for the ref that is not `running` + `needs-input`, or that has no `sessionId`, is
  `answer-not-waiting` (409), and the sentence names what the row says. Scope inheritance stands:
  answering a story whose milestone's row is parked answers the milestone's session.
  (6) `ctx.confirmTimeoutMs`, `ctx.globalWorkStoreOptions` and `ctx.createTerminalResumePush`
  pass through to the invoke, so the existing terminal-resume seams drive this leg.
  (7) No mesh module imports `ask-request.mjs` or `ask.mjs` for this (FF-13104): the text
  travels as a string field on a frame the fabric already carries.
  (8) The worker types the answer and nothing else: the brief has `command: text` and no
  `context`, and `resumeSessionId` is the parked session's id. Render: `resumed` → `Answered
  <ref> — typed into the worker's session on <node> (run <runId>).`; `dispatched` → `Answered
  <ref> — dispatched to <node> but NOT CONFIRMED within the window; the reservation stands, do not
  answer again while the row reads resumed.`

  RULINGS (QA, 2026-09-23).
  (1) Any ask FILE for the ref decides; the overlay is read only when `answerAsk` answers `null`,
  so a stale ANSWERED file shadows a live needs-input row.
  (2) A row waits only when `active`, `running`, `needs-input`, with a non-empty `sessionId`: the
  overlay's latest row for this workspace, an item's own before its milestone's; unreadable = none.
  (3) `runId` is `confirmedRunId ?? null`: the overlay projects no run id and is not in `files:`.
  Replaces "the row's runId" in PO ruling (4). For the PO to ratify.
  (4) The document names no worker node (`by.node` is the answerer's), so both mesh render lines
  drop `on <node>` / `to <node>`. Amends PO ruling (8). For the PO to ratify.
  (5) The router lifts `answer` to exactly `{ text, by, askedAt }` (missing = `null`), keeping the
  DOWN frame closed. Amends "verbatim" in PO ruling (3). For the PO to ratify.
  (6) The worker records `askedAt` only when `Date.parse` reads it and `by` only when it is a
  plain object; else its `now` and the mesh default. For the PO to ratify.
  (7) When `openRunAsk` fails, `answerRunAsk` is not attempted: one `terminal-resume-ask-record`
  degrade, no answer stamped on an entry the worker did not open, and the resume goes on.
  (8) A duplicate frame for a claimed park is a no-op (the first answer stands); a later park has
  a new `parkId` and appends. (9) Nothing re-sanitises past `answerAsk` (ADR-003 §2).
  (10) No log line or degrade message carries the text (cases send `"zq-answer-marker"`); the
  terminal-resume CLI gains no `--answer` flag.

  RULINGS (PO, answering QA, 2026-09-23).
  (11) QA (1)–(10) are RATIFIED. (3) amends PO (4): `runId` is `confirmedRunId ?? null`. (4)
  amends PO (8): neither mesh render line names a node. (5) amends PO (3): the router lifts
  `answer` to exactly `{ text, by, askedAt }`. (6) stands.
  (12) The stale-file shadow in QA (1) is ruled, not built: the file leg stands, and a stale
  `answered` file whose run no longer runs is cleared by the loop's `--resume` re-entry (131/03
  task 04). Recorded in STATE as a watch item for 07's live run, not as debt. Developer (13)–(16) RATIFIED.

  RULINGS (developer, 2026-09-23).
  (13) Feasible. `resume.mjs` defers `import("../command-core.mjs")` after a `ctx.invokeRegistered`
  check, in `loop.mjs`'s shape and with its ring comment. The downward-import gate exempts a
  dynamic import. The verb passes its own `ctx` through, which carries all three seams.
  (14) `worker-execution.mjs` stays at exactly 1,914 lines. Its ratchet requires the ceiling to
  equal the measured count, so a cut is as red as growth. Line 1682 `parkId,` becomes
  `parkId, answer: frame.answer,`, line 1768's `command: null` becomes
  `command: frame.answer?.text ?? null`, and the two comment lines above it are reworded in place.
  (15) `park-resume.mjs` chains the entry after the heartbeat inside `livenessWrite`, because both
  read-modify-write one record. `observeOutcome` then awaits both writes, which never interleave.
  (16) The first envelope scenario lists a key SET; the Outline gives the order. Verb cases use a
  real fixture repo pinning `mesh.workspaceId: "ws-1"`; the render rows use `cli.render` in process.

  Background:
    Given an isolated aof home with a published workspace `"ws-1"` holding milestone `18` and story `18/02`, and no ask file for either
    And `global_assignments` holds a row for `18`: `running`, `code: "needs-input"`, `session_id: "sess-89d1"`, `run_id: "run-17"`, `target_node_id: "umamis-mac-mini"`, `updated_at: "2026-09-23T16:00:00.000Z"`
    And `BY` = `{ actor: "umami", via: "board", node: "node-7297" }`, `NOW` = `"2026-09-23T17:12:00.000Z"`, `A` = `{ text: "zq-answer-marker", by: BY, askedAt: null }`, and `LATER` is `blocked-run-parking`'s handler clock
    And the workspace's config carries task 00's `work.notify`, and `ctx.notifyOptions` carries its `fetch` spy

  Scenario: the verb hands a worker's ask to terminal-resume with the answer, who gave it and when it parked
    Given `ctx.invokeRegistered` is a spy that records its calls and answers `{ ok: true, dispatched: true, confirmed: true, refused: false, refusalCode: null, node: "umamis-mac-mini", confirmedRunId: "run-17" }`
    When `work:answer` runs with `{ ref: "18", text: "take b", as: "umami", via: "board", now: NOW }`
    Then the spy was called once with `("mesh:terminal-resume", { session: "sess-89d1", answer: { text: "take b", by: BY, askedAt: "2026-09-23T16:00:00.000Z" } }, ctx)`
    And it answers `{ ok: true, ref: "18", runId: "run-17", delivery: "mesh", state: "resumed", by: BY, answeredAt: NOW, resume: null }`
    And no ask file was written, and no `fetch` was made

  Scenario: the envelope carries the answer only when there is one
    When `buildTerminalResumeEnvelope("node-a", { sessionId: "s", assignmentId: "a", workspaceId: "w", itemRef: "18", parkId: "p", answer: { text: "take b", by: BY, askedAt: null } })` is asked
    Then its `signal` has the keys `assignmentId, itemRef, parkId, sessionId, workspaceId, answer` and `signal.answer` deep-equals `{ text: "take b", by: BY, askedAt: null }`
    And the same call without `answer` has today's five keys, byte-identical to before this story

  Scenario Outline: the envelope's signal carries answer last, and only when one is given
    When `buildTerminalResumeEnvelope("node-a", { sessionId: "s", assignmentId: "a", workspaceId: "w", itemRef: "18", parkId: "p"<extra> })` is asked
    Then its `signal`'s keys are, in order, <keys>

    Examples:
      | extra                                                  | keys                                                                                     |
      | `, answer: undefined`                                  | `sessionId, assignmentId, workspaceId, itemRef, parkId`                                  |
      | `, answer: null`                                       | `sessionId, assignmentId, workspaceId, itemRef, parkId`                                  |
      | `, reservedAt: "r", previousNodeId: "n", answer: A`    | `sessionId, assignmentId, workspaceId, itemRef, reservedAt, previousNodeId, parkId, answer` |

  Scenario: the control router forwards the answer on the DOWN frame and does not log it
    Given the terminal-input router with a `dispatchDirective` spy and a log collector
    When it applies a valid resume envelope whose `signal.answer` is `{ text: "take b", by: BY, askedAt: null }`
    Then the dispatched frame is today's eleven keys plus `answer` deep-equal to the signal's
    And the same envelope without `answer` dispatches today's eleven-key frame exactly
    And no collected log line contains `take b`

  Scenario Outline: the router forwards a usable answer, drops any other, and never refuses the frame for it
    Given the terminal-input router with a `dispatchDirective` spy and a log collector
    When it applies an otherwise valid resume envelope whose `signal.answer` is <answer>
    Then `apply` answers `true`, and the one dispatched frame is <frame>
    And no collected log line contains `zq-answer-marker`, nor does it when the same envelope finds its target not connected (`{ sent: false }`)

    Examples:
      | answer                                                   | frame                                                                                 |
      | `A`                                                      | today's eleven keys plus `answer` deep-equal to `A`                                   |
      | `{ text: "zq-answer-marker" }`                           | eleven plus `answer: { text: "zq-answer-marker", by: null, askedAt: null }` (ruling 5) |
      | `{ ...A, extra: "x" }`                                   | eleven plus `answer` deep-equal to `A` (ruling 5)                                     |
      | `{ text: "   ", by: BY, askedAt: null }`                 | eleven plus that `answer` (ruling 9)                                                  |
      | `{ text: "", by: BY, askedAt: null }`                    | today's eleven-key frame exactly                                                      |
      | `{ text: 42, by: BY }`                                   | today's eleven-key frame exactly                                                      |
      | `{ by: BY, askedAt: null }`                              | today's eleven-key frame exactly                                                      |
      | `"zq-answer-marker"`                                     | today's eleven-key frame exactly                                                      |
      | `null`                                                   | today's eleven-key frame exactly                                                      |
      | `["zq-answer-marker"]`                                   | today's eleven-key frame exactly                                                      |

  Scenario: the worker types the answer into the parked session and records who and when
    Given `blocked-run-parking`'s fixture with a fresh assignment parked `needs-input` on session `S`, and a resume handler over a fake `spawnRuntime` that records its brief and options
    When the handler receives the resume frame with `answer: { text: "take b\nand keep the tests", by: BY, askedAt: "2026-09-23T16:00:00.000Z" }`
    Then the fake was spawned once with `options.resumeSessionId` = `S`, `brief.command` = `"take b\nand keep the tests"` byte for byte, and no `brief.context`
    And the run record's `asks` deep-equals `[{ question: null, phase: null, askedAt: "2026-09-23T16:00:00.000Z", parkedAt: null, answer: "take b\nand keep the tests", answeredAt: <LATER>, by: BY }]`, its `state` still `running` and its `attempt` still 1
    And no log line from the handler contains `take b`

  Scenario Outline: the worker types the answer byte for byte, and nothing else
    Given the same fixture
    When the handler receives the resume frame with `answer: { text: <text>, by: BY, askedAt: null }`
    Then the fake was spawned once with `brief.command` = <text> byte for byte, no `brief.context`, and `options.resumeSessionId` = `S`

    Examples:
      | text                                     |
      | `"a\tb\r\nc"`                            |
      | a string of 8,000 `"a"`                  |
      | `"a\u009b[201~b"` (a C1 CSI, ruling 9)   |

  Scenario Outline: the entry records who and when, else the worker's own facts
    Given the same fixture
    When the handler receives the resume frame with `answer: <answer>`
    Then the record's one `asks` entry reads `askedAt: <askedAt>`, `answer: "take b"`, `answeredAt: LATER` and `by: <by>`, with `question`, `phase` and `parkedAt` `null`
    And its `heartbeatAt` reads `LATER`: the liveness write and the entry both landed

    Examples:
      | answer                                                           | askedAt                      | by                                          |
      | `{ text: "take b", by: BY, askedAt: "2026-09-23T16:00:00.000Z" }` | `"2026-09-23T16:00:00.000Z"` | `BY`                                        |
      | `{ text: "take b", by: BY, askedAt: null }`                      | `LATER`                      | `BY`                                        |
      | `{ text: "take b" }`                                             | `LATER`                      | `{ actor: null, via: "mesh", node: null }`  |
      | `{ text: "take b", by: BY, askedAt: "yesterday" }`               | `LATER` (ruling 6)           | `BY`                                        |
      | `{ text: "take b", by: "umami", askedAt: null }`                 | `LATER`                      | `{ actor: null, via: "mesh", node: null }` (ruling 6) |

  Scenario: a resume without an answer is byte-identical to today
    Given the same fixture
    When the handler receives a resume frame with no `answer`
    Then the fake was spawned with `brief.command` `null`, and the run record's `asks` is `[]`

  Scenario: a duplicate frame for a claimed park is a no-op, and the first answer stands
    Given the handler has received the resume frame with `answer: { text: "take b", by: BY, askedAt: null }`
    When it receives the same frame, same `parkId`, with `answer: { text: "take c", by: BY, askedAt: null }`
    Then the fake was spawned once in all, and `asks` holds one entry whose `answer` is `"take b"`

  Scenario: an answer to a later park appends a second entry
    Given the handler has resumed with `"take b"`, and the resumed session parked `needs-input` again under a new `parkId`
    When it receives the resume frame for the new park with `answer: { text: "take c", by: BY, askedAt: null }`
    Then the fake was spawned twice, and `asks` holds two answered entries, `"take b"` then `"take c"`

  Scenario: a record write that fails is one degrade, and the session still resumes
    Given the run record's last `asks` entry is open, written directly, so `openRunAsk` refuses `run-ask-open`
    When the handler receives the resume frame with `answer: { text: "take b", by: BY, askedAt: null }`
    Then the fake was spawned once with `brief.command` `"take b"`, and the degrade sink holds exactly one `terminal-resume-ask-record` event
    And the open entry is byte-unchanged: no answer was stamped on it

  Scenario: a refused resume records nothing and the verb refuses
    Given the assignment's worktree is gone, so the worker refuses before spawn
    When the handler receives the resume frame with an `answer`
    Then the fake was never spawned and the run record's `asks` is `[]`
    And `work:answer` over a `refused: true` result rejects with `code` `terminal-resume-not-started` and `status` 409

  Scenario Outline: a resume that starts no process records nothing and logs no answer
    Given <cause>
    When the handler receives the resume frame with `answer: A`
    Then the fake was spawned <spawned>, the run record's `asks` is `[]`, and no log line or degrade message contains `zq-answer-marker`

    Examples:
      | cause                                                                  | spawned |
      | the itemRef does not resolve in the checkout                           | never   |
      | another assignment's run is `running` on the item                      | never   |
      | the assignment's run has settled `done`                                | never   |
      | the run record's `sessionId` is not the frame's                        | never   |
      | a live PTY already holds the assignment                                | never   |
      | the fake answers `{ outcome: "failed", processStarted: false }`        | once    |
      | the fake throws before any process starts                              | once    |

  Scenario Outline: what the row says decides the leg
    Given the row for `18` <row>
    When `work:answer` runs with `{ ref: <ref>, text: "take b", now: NOW }` and `ctx.invokeRegistered` is the confirming spy
    Then <outcome>

    Examples:
      | row                                                 | ref     | outcome                                                                              |
      | is as the Background's                              | `"18"`  | the spy is called once and the document reads `delivery: "mesh"`                    |
      | is as the Background's                              | `"18/02"` | the spy is called once with `session: "sess-89d1"`, scope inheritance (the milestone's row) |
      | reads `code: "resumed"`                             | `"18"`  | it rejects `answer-not-waiting` (409), and the spy was never called                  |
      | reads `state: "assigned"`, `code: null`             | `"18"`  | it rejects `answer-not-waiting` (409), and the spy was never called                  |
      | reads `state: "done"`                               | `"18"`  | it rejects `answer-not-waiting` (409), and the spy was never called                  |
      | has `session_id` `null`                             | `"18"`  | it rejects `answer-not-waiting` (409), and the spy was never called                  |
      | does not exist                                      | `"18"`  | it rejects `answer-not-waiting` (409), and the spy was never called                  |
      | reads `state: "running"`, `code: null`              | `"18"`  | it rejects `answer-not-waiting` (409), and the spy was never called                  |
      | has `session_id` `""`                               | `"18"`  | it rejects `answer-not-waiting` (409), and the spy was never called                  |
      | belongs to workspace `"ws-2"`, not `"ws-1"`          | `"18"`  | it rejects `answer-not-waiting` (409), and the spy was never called                  |
      | stands, and `18/02` has its own row reading `state: "done"` | `"18/02"` | it rejects `answer-not-waiting` (409): the story's own row outranks (ruling 2) |
      | stands, and an ask file for `18` is `waiting`       | `"18"`  | the file is answered, `delivery: "waiting"`, and the spy was never called            |
      | stands, and an ask file for `18` is `answered`      | `"18"`  | it rejects `ask-already-answered` (409), and the spy was never called (ruling 1)     |
      | stands                                              | `"19"`  | it rejects `ref-not-found` (404), and the spy was never called                       |

  Scenario Outline: the resume's own answer decides the document or the refusal
    Given `ctx.invokeRegistered` answers <result>
    When `work:answer` runs with `{ ref: "18", text: "take b", now: NOW }`
    Then <outcome>

    Examples:
      | result                                                                     | outcome                                                                          |
      | `{ ok: true, confirmed: true, refused: false, confirmedRunId: "run-17" }`  | the document reads `state: "resumed"`, `runId: "run-17"`                        |
      | `{ ok: true, confirmed: true, refused: false, assignmentState: "done", confirmedRunId: "run-17" }` | the document reads `state: "resumed"`, `runId: "run-17"` |
      | `{ ok: true, confirmed: false, refused: false, confirmedRunId: null }`     | the document reads `state: "dispatched"`, `runId: null` (ruling 3)              |
      | `{ ok: true, confirmed: false, refused: true, refusalCode: "terminal-resume-not-started" }` | it rejects `terminal-resume-not-started` (409)              |
      | throws `session-not-parked` (409)                                          | it rejects `session-not-parked` (409), untouched                                  |
      | throws `resume-capacity-full` (409)                                        | it rejects `resume-capacity-full` (409), untouched                                |
      | throws `relay-unconfigured` (400)                                          | it rejects `relay-unconfigured` (400), untouched                                  |
      | throws `session-unknown` (404)                                             | it rejects `session-unknown` (404), untouched                                     |

  Scenario Outline: the render says whether the answer was typed or only dispatched
    Given `ctx.invokeRegistered` answers <result>
    When `aof work answer 18 "take b"` renders without `--json`
    Then it prints `<line>` and exits 0

    Examples:
      | result                                            | line                                                                                                                           |
      | `{ confirmed: true, confirmedRunId: "run-17" }`   | Answered 18 — typed into the worker's session (run run-17).                                                                    |
      | `{ confirmed: false, confirmedRunId: null }`      | Answered 18 — dispatched but NOT CONFIRMED within the window; the reservation stands, do not answer again while the row reads resumed. |

  Scenario: through the real registry the pushed envelope carries the answer, and the reservation refuses a second answer
    Given no `ctx.invokeRegistered`, a `ctx.createTerminalResumePush` that collects envelopes, `ctx.confirmTimeoutMs` 50, and `work.dispatch.concurrency: 1`
    When `work:answer` runs with `{ ref: "18", text: "take b", as: "umami", via: "board", now: NOW }`
    Then it answers `delivery: "mesh"`, `state: "dispatched"` and `runId: null`, and the one pushed envelope's `signal.answer` deep-equals `{ text: "take b", by: BY, askedAt: "2026-09-23T16:00:00.000Z" }`
    And a second `work:answer` for `18` rejects `answer-not-waiting` (409), the row now reading `code: "resumed"`, and nothing more is pushed

  Scenario: a bad answer never reaches the worker
    When `work:answer` runs with `{ ref: "18", text: "ok\u001b[201~", now: NOW }` and `ctx.invokeRegistered` is the confirming spy
    Then it rejects `answer-control-chars` (400), and the spy was never called

  Scenario: the mesh leg is one additive key on a closed schema, and imports no ask module
    When `meshTerminalResumeCommand.input` and the mesh modules are read
    Then the schema admits `{ session, node, answer }` with `answer` an object of `text` (string, required), `by` and `askedAt`, and refuses any other key
    And its CLI face has no `answer` flag, and `cli.argv(["sess-89d1"], {})` is `{ session: "sess-89d1" }`
    And `src/mesh/terminal-input.mjs`, `src/mesh/terminal-relay-bridge.mjs`, `src/mesh/worker-execution.mjs` and `src/mesh/park-resume.mjs` import neither `src/loop/ask-request.mjs` nor `src/loop/ask.mjs`
    And `src/mesh/worker-execution.mjs` is at most 1,914 lines
