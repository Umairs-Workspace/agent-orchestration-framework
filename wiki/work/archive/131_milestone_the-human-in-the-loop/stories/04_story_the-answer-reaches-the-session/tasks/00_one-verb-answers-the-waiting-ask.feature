@executable @cli @work @work-stream
Feature: one verb answers the waiting ask on an item, records who gave it and when, and tells the channel

  ADR-003 §5, ADR-005 §4. `work:answer` is exported from `src/commands/resume.mjs` as
  `answerCommand` beside `resumeCommand`, listed in `src/command-core.mjs`'s `COMMANDS`, and adds
  no file (`src/commands/` is at 69/69). Both verbs serve one subject: bringing a stopped run
  back. Its input is the closed schema `{ ref, text, as, via, now }`. Resolution runs in this
  order: (a) `resolveItemExact` — no item is `ref-not-found` (404); (b) the ask files for this
  workspace and ref through 131/01's `answerAsk`, whose refusals pass through untouched
  (`answer-empty`, `answer-too-long`, `answer-control-chars` at 400; `ask-already-answered` at
  409, naming who answered first); (c) when `answerAsk` answers `null`, the mesh leg (task 03);
  (d) otherwise `answer-not-waiting` (409). `by` is `{ actor, via, node }`. The answer document
  has EIGHT keys in this order: `{ ok, ref, runId, delivery, state, by, answeredAt, resume }`.
  `session-answered` fires from the verb, once, after a successful `answerAsk`, through 131/02's
  `buildNotifyEnvelope` and `notify`, awaited before the verb returns; its outcome never changes
  the document. The verb reads no run record and writes none: the owner writes `answerRunAsk`
  when it consumes the answer (ADR-003 §6).

  RULINGS (PO, 2026-09-23).
  (1) `workspaceId` is `resolveWorkspaceId(ctx.workspace)` from `src/workspace-identity.mjs`, the
  one resolver, which 131/03's owner also uses when it opens the ask. It may be `null` in an
  unpublished workspace, and then it matches a file whose `workspaceId` is `null`.
  (2) `by.actor` is `as` trimmed, or `"you"` when `as` is absent, blank or not a string, the
  `work:feedback` precedent. `by.via` is `via` when it is `"cli"` or `"board"`, else `"cli"`; the
  CLI face has no `--via` flag, so a terminal answer is always `"cli"`. `by.node` is
  `meshNodeIdOf(ctx.workspace.config) ?? null`. The verb never reads the OS user name, because
  run records are committed to a public repo.
  (3) `delivery` is `"waiting"` when the ask was `waiting`, `"parked"` when it was `parked`, and
  `"mesh"` on the mesh leg. For the file legs `state` is the record's state after the write,
  `"answered"`; `runId` is the ask's `runId`; `answeredAt` is the record's. `resume` is `null` for
  `waiting` and `mesh`, and `aof work loop <scope> --resume` for `parked`, where `<scope>` is the
  ask's `scope`, else the ref's top-level item.
  (4) `now` is an injected clock (a UTC-Z string), a test input, never a flag; absent means
  `new Date()`. It is handed to `answerAsk` as `() => new Date(now)`.
  (5) The envelope is `buildNotifyEnvelope("session-answered", { ref, phase: ask.phase,
  elapsedMs, outcome: { by: by.actor, answer: text } }, { config, now })` — `outcome.by` is the
  actor NAME string (131/02 task 03). DEFAULT DECISION, ratified here in the authoring beat and
  a departure from ADR-005 §3 for this one event: `elapsedMs` is
  `Date.parse(answeredAt) − Date.parse(askedAt)`, the wait, because the verb cannot see a lane's
  run record and the ask file carries no `createdAt`. Delivery is `notify(ctx.workspace,
  envelope, ctx.notifyOptions ?? {})`, 131/02's seam. It fires for `waiting` and `parked`
  deliveries only — never on the mesh leg (ADR-005 §6), never after a refusal.
  (6) Sanitation is `answerAsk`'s and runs BEFORE its lookup (131/01 task 03, PO ruling 2), so a
  bad answer is refused 400 before the mesh leg and before any notification, whether or not any
  ask exists.
  (7) CLI: `aof work answer <ref> "<text>" [--as <actor>] [--json]`. The argv adapter answers
  `{ ref: positionals[0], text: positionals[1], as: options.as }` with absent keys omitted. A
  third positional is refused by the adapter with a usage error that says to quote the answer;
  positionals are never joined, because a joined answer is not verbatim. Render: `waiting` →
  `Answered <ref> — the waiting session resumes with your answer (run <runId>).`; `parked` →
  `Answered <ref> — its run is parked; resume the loop with: aof work loop <scope> --resume`;
  `mesh` → task 03. `json` answers the document.
  (8) The verb imports nothing from `src/mesh/terminal-input.mjs` or `src/terminal-ws.mjs`
  (FF-13104). `work:answer` is NOT added to route-coverage's `BOARD_DEFERRED`: its route lands in
  task 01, and the bijection holds by construction.

  RULINGS (QA, 2026-09-23).
  (1) The first rung that fails names the refusal: `ref-not-found` before any sanitation code,
  sanitation before `ask-already-answered`, the mesh leg and `answer-not-waiting`.
  (2) `ref` is trimmed, as `work:resume` trims it, then resolved exactly (`"3/1"`, absent or
  non-string is `ref-not-found`); `answerAsk` is handed the resolved item's `ref`.
  (3) Blank `as` means empty after `trim()`; a non-string `as` is `"you"`; `via` is exact.
  (4) `elapsedMs` is floored at 0 (an `askedAt` after `answeredAt` is clock skew, never a negative
  wait), and is `null` when `askedAt` is `null` or does not parse. For the PO to ratify.
  (5) `<scope>` is the ask's `scope` when it is a non-empty string, else the ref's top-level item.
  (6) Of two asks for one workspace and ref, the document's `runId` is the one `answerAsk` chose.
  (7) The notification is observed at the `fetch` spy and the sink's `notify-*` codes only (131/02
  task 06, developer ruling 3); `ctx.notifyOptions` is spread as given, so `timeoutMs` bounds a
  hanging webhook. No document, render or degrade message carries the webhook URL.
  (8) A second answer is refused and posts nothing. (9) CLI: a refusal exits non-zero naming its
  code; `--via` is `unknown-flag`; a missing text or ref reaches the verb absent.
  (10) A C1 character (U+009B) is stored and posted verbatim: ADR-003 §2 refuses C0 and DEL only.

  RULINGS (PO, answering QA, 2026-09-23).
  (11) QA (1)–(10) are RATIFIED; (4)'s floor at 0 and `null` stand.
  (12) `as` is bounded: after `trim()`, more than 80 code points, or any C0 control or DEL, is
  refused `answer-actor-invalid` (400) by the verb itself, after `ref-not-found` and before
  `answerAsk` runs, so it precedes every text refusal, and nothing is written or posted. A
  non-string is still `"you"` (QA 3). The actor rides Discord's line 1, which never truncates,
  and the public run record; the bound is what keeps both honest. Developer (13)–(16) RATIFIED.

  RULINGS (developer, 2026-09-23).
  (13) Feasible, with one row amended. `resolveWorkspaceId` is `null` only without a projectRoot;
  unpinned, it is the path hash. So W pins `mesh.workspaceId: "w1"`, and the no-`mesh` `by` row
  keeps that pin and drops only `nodeId`. As written it matched no file: `answer-not-waiting`.
  131/03's owner must open each ask under this same resolver, over the primary checkout.
  (14) `cli.argv` refuses a third positional itself: `commandError(…, "invalid-input", 400)`.
  `guardMeshPositionals` caps at one id. `src/cli.mjs` needs no edit (the route table is derived).
  (15) `delivery` reads the returned record's `parkedAt`; `state` is read off it, never spelled.
  The scope fallback is `executionScopeRef(ref)`, and the envelope's `now` is the verb's clock.
  (16) `command-core-contract`'s `WORK_IDS` gains `work:answer`. The cli-bijection probe is
  `work answer 03/01 "bijection probe" --json`, in its exit-0-or-1 set (`answer-not-waiting`).
  Behaviour and CLI cases are hosted in `run-session-limit-resume`, beside `work:resume`'s.

  Background:
    Given an isolated aof home `H` and a fixture workspace `W` under it whose id resolves to `"w1"`, whose config has `mesh.nodeId: "node-7297"` and `work.notify: { channels: { ops: { type: "discord", urlEnv: "HOOK_A" } } }`, holding milestone `03` and story `03/01` with one run `R1` on it
    And `dir` = `loopAsksDir({ AOF_GLOBAL_HOME: H })`, and an ask for run `R1`, workspace `"w1"`, ref `"03/01"`, sessionId `S1`, phase `"build"`, scope `"03"`, askedAt `2026-09-23T17:00:00.000Z` has been opened `waiting`
    And `ctx.notifyOptions` = `{ env: { HOOK_A: "https://discord.com/api/webhooks/111/secret-token" }, fetch: <spy answering 204> }`, and the degrade sink is the injected test sink
    And `ctx.invokeRegistered` is a spy that records its calls, and the execution overlay holds no row unless a case gives one
    And `NOW` = `"2026-09-23T17:12:00.000Z"`, and `E(ms)` = `buildNotifyEnvelope("session-answered", { ref: "03/01", phase: "build", elapsedMs: ms, outcome: { by: "you", answer: "take b" } }, { config: W's, now: () => new Date(NOW) })`

  Scenario: the verb is registered beside resume and carries the closed schema
    When `getCommand("work:answer")` is read from `src/command-core.mjs`
    Then it is `answerCommand` exported from `src/commands/resume.mjs`, its `cli.route` is `["work", "answer"]`, and its input schema is closed over exactly `ref`, `text`, `as`, `via` and `now`
    And `src/commands/` holds no new file, and `acd-work-command-cli-bijection` and `command-core-contract` are green with it registered

  Scenario: a waiting ask is answered verbatim, with who and when, in the eight-key document
    When `work:answer` runs with `{ ref: "03/01", text: "take b — keep the tests", now: NOW }`
    Then it answers `{ ok: true, ref: "03/01", runId: "R1", delivery: "waiting", state: "answered", by: { actor: "you", via: "cli", node: "node-7297" }, answeredAt: NOW, resume: null }`, keys in that order
    And `readAsk(dir, "R1")` reads `state: "answered"`, `answer: "take b — keep the tests"`, `answeredAt: NOW` and `by` deep-equal to the document's

  Scenario Outline: who answered is read from as, via and the config, never from the machine
    Given W's config <config>
    When `work:answer` runs with `{ ref: "03/01", text: "take b", now: NOW, <extra> }`
    Then the document's `by` and the file's `by` both deep-equal <by>

    Examples:
      | config                  | extra                        | by                                                    |
      | is the Background's     | `as` and `via` absent        | `{ actor: "you", via: "cli", node: "node-7297" }`     |
      | is the Background's     | `as: "  umami  "`            | `{ actor: "umami", via: "cli", node: "node-7297" }`   |
      | is the Background's     | `as: ""`                     | `{ actor: "you", via: "cli", node: "node-7297" }`     |
      | is the Background's     | `as: "   "`                  | `{ actor: "you", via: "cli", node: "node-7297" }`     |
      | is the Background's     | `as: 42`                     | `{ actor: "you", via: "cli", node: "node-7297" }`     |
      | is the Background's     | `as: { name: "umami" }`      | `{ actor: "you", via: "cli", node: "node-7297" }`     |
      | is the Background's     | `via: "board"`               | `{ actor: "you", via: "board", node: "node-7297" }`   |
      | is the Background's     | `via: "BOARD"`               | `{ actor: "you", via: "cli", node: "node-7297" }`     |
      | is the Background's     | `via: "ssh"`                 | `{ actor: "you", via: "cli", node: "node-7297" }`     |
      | is the Background's     | `via: 7`                     | `{ actor: "you", via: "cli", node: "node-7297" }`     |
      | pins `mesh.workspaceId: "w1"` and no `mesh.nodeId` | `as: "umami", via: "board"`  | `{ actor: "umami", via: "board", node: null }`        |
      | is the Background's     | `as` of 80 `"a"` (ruling 12) | `{ actor: <those 80>, via: "cli", node: "node-7297" }` |

  Scenario: without an injected clock the answer is stamped with the real time
    When `work:answer` runs with `{ ref: "03/01", text: "take b" }` between system-clock readings `T0` and `T1`
    Then `answeredAt` is a UTC-Z ISO-8601 string no earlier than `T0` and no later than `T1`, and equals the file's `answeredAt`

  Scenario: a parked ask is answered, and the document says how the loop comes back
    Given the ask for `R1` has been parked
    When `work:answer` runs with `{ ref: "03/01", text: "take b", as: "umami", now: NOW }`
    Then it answers `delivery: "parked"`, `by.actor: "umami"` and `resume: "aof work loop 03 --resume"`
    And `readAsk(dir, "R1")` reads `state: "answered"` with its `parkedAt` kept

  Scenario Outline: a parked ask's resume names the ask's scope, else the ref's top-level item
    Given the Background's ask was instead opened for ref <ref> with scope <scope>, and then parked
    When `work:answer` runs with `{ ref: <ref>, text: "take b", now: NOW }`
    Then it answers `delivery: "parked"`, `runId: "R1"` and `resume: "<resume>"`

    Examples:
      | ref       | scope     | resume                       |
      | `"03/01"` | `"03"`    | aof work loop 03 --resume    |
      | `"03/01"` | `null`    | aof work loop 03 --resume    |
      | `"03/01"` | `""`      | aof work loop 03 --resume    |
      | `"03"`    | `null`    | aof work loop 03 --resume    |
      | `"03/01"` | `"03/01"` | aof work loop 03/01 --resume |

  Scenario: the answer is announced once, as a wait, and the announcement never changes the document
    When `work:answer` runs with `{ ref: "03/01", text: "take b", now: NOW }`
    Then the `fetch` spy was called exactly once, and its body parses to `renderDiscord(E)` where `E` = `buildNotifyEnvelope("session-answered", { ref: "03/01", phase: "build", elapsedMs: 720000, outcome: { by: "you", answer: "take b" } }, { config: W's, now: () => new Date(NOW) })`
    And the same run in a fixture with no `work.notify` answers a document deep-equal to this one, and the `fetch` spy was never called there

  Scenario Outline: the announced wait runs from the ask to the answer, and is never negative
    Given the ask for `R1` was asked at <askedAt>, and <parked>
    When `work:answer` runs with `{ ref: "03/01", text: "take b", now: NOW }`
    Then the `fetch` spy was called exactly once, and its body parses to `renderDiscord(E(<elapsedMs>))`

    Examples:
      | askedAt                                         | parked               | elapsedMs   |
      | `NOW` itself                                    | it is waiting        | `0`         |
      | `2026-09-23T17:00:00.000Z`                      | it has been parked   | `720000`    |
      | `2026-09-22T11:12:00.000Z` (1 d 6 h before)     | it has been parked   | `108000000` |
      | `2026-09-24T09:00:00.000Z` (after `NOW`)        | it is waiting        | `0`         |
      | `null` (a hand-written file)                    | it is waiting        | `null`      |

  Scenario: a failing channel never fails the answer
    Given the `fetch` spy throws
    When `work:answer` runs with `{ ref: "03/01", text: "take b", now: NOW }`
    Then it answers `ok: true` with the same document, the file reads `answered`, and the degrade sink holds exactly one `notify-*` event, coded `notify-delivery-failed`

  Scenario Outline: however the channel fails, the answer stands and the failure is one named degrade
    Given <channel>
    When `work:answer` runs with `{ ref: "03/01", text: "take b", now: NOW }`
    Then it answers the document the delivering case answers, the file reads `answered`, and the degrade sink holds exactly one `notify-*` event, coded `<code>`
    And neither the document nor any degrade message contains `secret-token`

    Examples:
      | channel                                                                      | code                        |
      | the `fetch` spy answers 500                                                  | notify-delivery-failed      |
      | the `fetch` spy answers 429 with `{ "retry_after": 2 }`                      | notify-rate-limited         |
      | the `fetch` spy never settles, and `ctx.notifyOptions.timeoutMs` is 50       | notify-delivery-failed      |
      | `ctx.notifyOptions.env` has no `HOOK_A`, and the `fetch` spy is never called | notify-channel-unconfigured |

  Scenario: an item with no ask anywhere is refused, and nothing is written or posted
    Given no ask file exists for `"03/01"`, and the execution overlay holds no row for it
    When `work:answer` runs with `{ ref: "03/01", text: "take b", now: NOW }`
    Then it rejects with `code` `answer-not-waiting` and `status` 409
    And the listing of `dir` is unchanged, and the `fetch` spy was never called

  Scenario Outline: every refusal is coded by the first rung that fails, and writes, posts and invokes nothing
    Given <given>
    When `work:answer` runs with `{ ref: <ref>, text: <text>, now: NOW }`
    Then it rejects with `code` `<code>` and `status` <status>
    And every file in `dir` is byte-unchanged and none was added, the `fetch` spy was never called, and `ctx.invokeRegistered` was never called

    Examples:
      | given                                                                   | ref         | text                        | code                 | status |
      | nothing else                                                            | `"03/01"`   | `""`                        | answer-empty         | 400    |
      | nothing else                                                            | `"03/01"`   | `undefined`                 | answer-empty         | 400    |
      | nothing else                                                            | `"03/01"`   | the number `42`             | answer-empty         | 400    |
      | nothing else                                                            | `"03/01"`   | `"ok\u001b[201~rm -rf ."`   | answer-control-chars | 400    |
      | nothing else                                                            | `"03/01"`   | `"ok\u007f"`                | answer-control-chars | 400    |
      | nothing else                                                            | `"03/01"`   | a string of 8,001 `"a"`     | answer-too-long      | 400    |
      | the ask has been answered by `"umami"`                                  | `"03/01"`   | `"c"`                       | ask-already-answered | 409    |
      | the ask has been answered by `"umami"`                                  | `"03/01"`   | `""`                        | answer-empty         | 400    |
      | nothing else                                                            | `"999/99"`  | `"take b"`                  | ref-not-found        | 404    |
      | nothing else                                                            | `"999/99"`  | `""`                        | ref-not-found        | 404    |
      | nothing else                                                            | `"3/1"`     | `"take b"`                  | ref-not-found        | 404    |
      | nothing else                                                            | `undefined` | `"take b"`                  | ref-not-found        | 404    |
      | no ask file exists, and the overlay row for `"03"` is running, `needs-input`, session `"S9"` | `"03/01"` | `"ok\u001b"` | answer-control-chars | 400 |
      | no ask file exists, and the overlay holds no row                        | `"03/01"`   | a string of 8,001 `"a"`     | answer-too-long      | 400    |

  Scenario Outline: an actor that cannot be recorded is refused after the ref and before the text
    When `work:answer` runs with `{ ref: <ref>, text: <text>, as: <as>, now: NOW }`
    Then it rejects with `code` `<code>` and `status` <status>, every file in `dir` is byte-unchanged, and the `fetch` spy was never called

    Examples:
      | ref        | text  | as                      | code                 | status |
      | `"03/01"`  | `"b"` | a string of 81 `"a"`    | answer-actor-invalid | 400    |
      | `"03/01"`  | `"b"` | `"a\u0000b"`            | answer-actor-invalid | 400    |
      | `"03/01"`  | `"b"` | `"line\nbreak"`         | answer-actor-invalid | 400    |
      | `"03/01"`  | `"b"` | `"tab\there"`           | answer-actor-invalid | 400    |
      | `"03/01"`  | `""`  | a string of 81 `"a"`    | answer-actor-invalid | 400    |
      | `"999/99"` | `"b"` | a string of 81 `"a"`    | ref-not-found        | 404    |

  Scenario: the ref is trimmed before it is resolved
    When `work:answer` runs with `{ ref: " 03/01 ", text: "take b", now: NOW }`
    Then it answers `ok: true`, `ref: "03/01"`, `runId: "R1"`, and the file reads `answered`

  Scenario Outline: of two asks on one ref, the latest askedAt is answered, and the document names its run
    Given a second ask for run `R3`, workspace <ws>, ref `"03/01"`, asked at <r3At>, is <r3>
    When `work:answer` runs with `{ ref: "03/01", text: "take b", now: NOW }`
    Then <outcome>

    Examples:
      | ws     | r3At                       | r3                       | outcome                                                                          |
      | `"w1"` | `2026-09-23T17:05:00.000Z` | waiting                  | it answers `runId: "R3"`, `delivery: "waiting"`, and `R1`'s file is byte-unchanged |
      | `"w1"` | `2026-09-23T17:05:00.000Z` | parked                   | it answers `runId: "R3"`, `delivery: "parked"`, and `R1`'s file is byte-unchanged  |
      | `"w1"` | `2026-09-23T17:05:00.000Z` | answered by `"umami"`    | it rejects `ask-already-answered` (409), and `R1`'s file is byte-unchanged         |
      | `"w1"` | `2026-09-23T16:55:00.000Z` | waiting                  | it answers `runId: "R1"`, and `R3`'s file is byte-unchanged                        |

  Scenario Outline: anything outside the refused set is stored and posted verbatim
    When `work:answer` runs with `{ ref: "03/01", text: <text>, now: NOW }`
    Then it answers `ok: true`, `readAsk(dir, "R1").answer` is <text> exactly, and the `fetch` body carries `renderDiscord` of an envelope whose `outcome.answer` is <text> exactly

    Examples:
      | text                                   |
      | `"  take b — keep the tests\n"`        |
      | `"a\tb\r\nc"`                          |
      | a string of 8,000 `"a"`                |
      | `"a\u009b[201~b"` (a C1 CSI, ruling 10) |

  Scenario: a second answer is refused naming the first, and is not announced again
    Given `work:answer` has answered `R1` with `{ ref: "03/01", text: "take b", now: NOW }`
    When `work:answer` runs with `{ ref: "03/01", text: "take c", as: "umami", now: NOW }`
    Then it rejects with `code` `ask-already-answered` and `status` 409, and its message names `"you"`
    And `readAsk(dir, "R1").answer` is still `"take b"`, and the `fetch` spy was called exactly once across both calls

  Scenario: the verb reads no run record and writes none
    When `work:answer` runs with `{ ref: "03/01", text: "take b", now: NOW }`
    Then every file under `03/01`'s `runs/` is byte-unchanged
    And `src/commands/resume.mjs` calls none of `openRunAsk`, `parkRunAsk` or `answerRunAsk`

  Scenario Outline: the argv adapter reads the ref, the quoted answer and --as, and nothing else
    When `aof work answer <argv>` is parsed
    Then <input>

    Examples:
      | argv                                        | input                                                              |
      | `03/01 "take b" --json`                     | the command input is `{ ref: "03/01", text: "take b" }`             |
      | `03/01 "take b" --as umami`                 | the command input is `{ ref: "03/01", text: "take b", as: "umami" }` |
      | `03/01 take b`                              | it is refused by the adapter with a usage error that says to quote the answer |
      | `03/01 "a b" c`                             | it is refused by the adapter with a usage error that says to quote the answer |
      | `03/01`                                     | the command input is `{ ref: "03/01" }`, which the verb refuses `answer-empty` |
      | (no positionals)                            | the command input is `{}`, which the verb refuses `ref-not-found`   |
      | `03/01 "take b" --via board`                | it is refused `unknown-flag` before the command runs, and `dir` is byte-unchanged |

  Scenario: the CLI's --json is the in-process document, and a refusal exits non-zero
    When `aof work answer 03/01 "take b" --json` runs in `W` with `AOF_GLOBAL_HOME` = `H`
    Then it prints one JSON document with the eight keys in order, deep-equal to the in-process document for the same answer except `answeredAt`, which equals the file's, and exits 0
    And a following `aof work answer 03/01 "take c" --json` exits non-zero and names `ask-already-answered`

  Scenario Outline: the render says what happened and what comes next
    Given the ask for `R1` <state>
    When `aof work answer 03/01 "take b"` runs without `--json`
    Then it prints `<line>` and exits 0

    Examples:
      | state           | line                                                                                   |
      | is `waiting`    | Answered 03/01 — the waiting session resumes with your answer (run R1).                |
      | has been parked | Answered 03/01 — its run is parked; resume the loop with: aof work loop 03 --resume    |
