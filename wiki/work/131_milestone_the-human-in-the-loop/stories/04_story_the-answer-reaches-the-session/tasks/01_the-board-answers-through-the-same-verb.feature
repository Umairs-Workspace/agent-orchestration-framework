@executable @ui @work @board
Feature: the board answers through the same verb, behind one hoisted admission that every board write passes

  ADR-006 §3. `POST /api/work/answer` joins `src/board-ui.mjs`. `admitWriteRequest(request,
  response)` is hoisted INSIDE `board-ui.mjs` (the fleet keeps its own copy; only the loopback
  predicate is shared, task 02). It answers `true` when the request is admitted; otherwise the
  refusal has already been sent. In order it refuses a method other than POST (405
  `method-not-allowed`, `Allow: POST`), an Origin that is not exactly `http://<Host>` (403
  `cross-origin-refused`), a non-loopback Host (403 `non-loopback-host`, task 02), and a
  content-type that is not `application/json` (400 `invalid-content-type`) — each BEFORE the body
  is read and before any command runs. The answer route, the resync door, the feedback POST and
  the three phase doors all call it, which pays the third copy of the origin block and puts the
  feedback POST behind admission for the first time. The answer body is lifted EXACTLY to
  `{ ref, text, actor }` and the route invokes `work:answer` with `{ ref, text, as: actor,
  via: "board" }`; the command's document is sent at 200 verbatim, and a refusal passes the
  command's `code` and `status` through in the frozen `{ ok: false, error, code }` envelope.
  `53/FF-5307`'s `src/board-ui.mjs` digest is re-pinned with the reason and the measured diff.

  RULINGS (PO, 2026-09-23).
  (1) Write routes match on PATHNAME first, so a non-POST to a write path answers 405 — the
  fleet's posture, one admission on both faces. Today a `GET /api/work/continue` falls to the
  namespace 404; after this task it is 405 with `Allow: POST`. The 405 is sent by a local
  `sendMethodNotAllowed`, mirroring the fleet's ("local response helpers … not shared").
  (2) `acd-board-write-isolation`'s POST detection is re-based, because ruling (1) removes the
  `method === "POST"` literals it counted: a write route is a `/api/work/<op>` branch that calls
  `admitWriteRequest(`; the named allowlist gains `answer`; every branch that calls
  `readJsonBody(` calls `admitWriteRequest(` first, and no other branch reads a body. Its
  behavioural feedback probe sends the server's own Origin.
  (3) `acd-work-command-route-coverage`'s behavioural probe: `answer` joins the POST probes with
  `{ ref: "03/01", text: "route coverage probe" }`, which answers 409 `answer-not-waiting` — a
  served JSON envelope, never `not-found` — and the `feedback` probe gains the server's own Origin.
  (4) `body.actor` passes through as given (absent or blank reaches the verb's `"you"`). Nothing
  else from the body reaches the verb: a forged `via`, `by`, `now`, `runId` or `state` in the
  body is dropped, and `via` is always `"board"`.
  (5) The 200 document is `work:answer`'s eight keys, verbatim, unprojected.
  (6) The FF-5307 re-pin comment names 131/04 and the reason: "one hoisted admission and one
  route onto `work:answer`; no run record key is read; every GET route's body is byte-identical".
  The measured `git diff -- src/board-ui.mjs`, filtered to non-comment lines, touches only the
  write branches, the two helpers and the new route; that measurement is the condition of the
  pin. `ui/` is untouched by this story — 05 owns the card and the `ui/` digest.
  (7) The board face still writes no file and shells out to nothing: the route is one `invoke`.

  RULINGS (QA, 2026-09-23).
  (1) Admission precedes the body read, observably: a refused request carrying a 2,000,000-byte
  body answers its admission code, never 413 `payload-too-large`.
  (2) The content-type rule is the fleet's, case-insensitive `application/json` then a word
  boundary: `; charset=utf-8` and `APPLICATION/JSON` are admitted; `application/jsonp`,
  `text/json`, a form's `application/x-www-form-urlencoded` and `multipart/form-data` are not. An
  admitted row is proven by reaching the verb (`answer-empty` for an empty text).
  (3) Origin is the exact string `http://<Host>`: the other loopback name, `https://`, the literal
  `null` (a sandboxed frame) and a trailing slash are refused. OPTIONS is 405 like any non-POST.
  (4) On the answer route a JSON body that is not a plain object (`null`, an array, a string, a
  number) is refused 400 `invalid-body` before `invoke`, the fleet's code for the same shape;
  today `body.ref` on `null` throws to a 500. For the PO to ratify.
  (5) A body field of the wrong type reaches the verb as given and takes its refusal: a numeric
  `ref` is `ref-not-found`, a numeric `text` `answer-empty`, a non-string `actor` `"you"`.
  (6) `/api/work/answer/` is not the route: the namespace's 404 `not-found`.
  (7) A second POST of an answer is 409 `ask-already-answered` naming the first actor.
  (8) Read routes take no admission: `list`, `next` and `doctor` answer 200 with no Origin or a
  foreign one.

  RULINGS (PO, answering QA, 2026-09-23).
  (9) QA (1)–(8) are RATIFIED, and (4) is WIDENED to every board write route: `readJsonBody`
  answers only a plain JSON object, so `null`, an array, a string, a number or a boolean is 400
  `invalid-body` on feedback, the phase doors and resync too. Today's 500 there is fixed here, in
  the file this story already touches, not deferred.
  (10) `answer-actor-invalid` (400, task 00 ruling 12) passes through like every verb refusal.

  RULINGS (developer, 2026-09-23).
  (11) Feasible. `routeOps`'s regex still reads every pathname-first literal. A refused admission
  makes `handleWorkApi` return `true`. `board-ui.mjs` gains its first import of
  `./static-serve.mjs` (only `setup-ui.mjs` imports it today). The helper tests with `.test(`,
  never `RegExp#exec`: two controls read `\bexec\s*\(` as a shell-out.
  (12) PO ruling (2), as built: each `/api/work/<op>` branch is sliced by
  `matchedBraceBody(board, <literal index>)` from `test/support/source-slice.mjs`. A write route
  is a branch that calls `admitWriteRequest(` or `handlePhaseDoor(`, and that closure's own body
  calls `admitWriteRequest(` before `readJsonBody(`. The detected set EQUALS the six-name
  allowlist, not a subset of it, so the control cannot pass empty. The `method === "POST"` count
  becomes the four `admitWriteRequest(` call sites.
  (13) No suite asserts today's 500 for a non-object body or the 404 for a GET to a write path.
  `test/ui/board-face-contract.test.mjs` and `test/ui/work-ui-board-serves-unchanged.test.mjs`
  do POST feedback with no Origin, and the hoist makes those posts 403. Their `postJson` gains
  the server's Origin, and both files join `files:`. The UI harness already sends an Origin.
  (14) A refusal answers without reading the body, and the 2,000,000-byte rows are sent through
  `node:http`. If the client sees a reset, the helper calls `request.resume()` before it answers.
  (15) The FF-5307 comment extends `board-ui.mjs`'s block: `RE-PINNED by 131/04 (ADR-006 §3): …`,
  ending "Re-pinned rather than dropped, per 55/VERIFICATION F-55-02-1."

  RULINGS (PO, answering the developer, 2026-09-23).
  (16) Developer (11)–(15) are RATIFIED. The two suites in (13) join `files:`.

  Background:
    Given a fixture board repo `B` with story `03/01`, served by `serveSetupUi(null, { projectDir: B, port: 0 })` on `url`, under an isolated `AOF_GLOBAL_HOME`
    And an ask for run `R1`, workspace `B`'s id, ref `"03/01"` has been opened `waiting` in that home's `loop-asks`
    And `SAME` means the header `origin` = `new URL(url).origin`, and `JSON` means `content-type: application/json`

  Scenario: the board answers the waiting ask through the verb, as the board
    When `POST /api/work/answer` is sent with `SAME`, `JSON` and the body `{ "ref": "03/01", "text": "take b", "actor": "umami" }`
    Then it answers 200 with `work:answer`'s document: `ok: true`, `ref: "03/01"`, `runId: "R1"`, `delivery: "waiting"`, `state: "answered"`, `by: { actor: "umami", via: "board", node: <config.mesh.nodeId ?? null> }`, `answeredAt` a UTC-Z instant, `resume: null`, and those eight keys in that order
    And the ask file for `R1` reads `answered`, `answer: "take b"` and `by.via: "board"`

  Scenario Outline: a refusal from the verb passes through in the frozen envelope
    Given <given>
    When `POST /api/work/answer` is sent with `SAME`, `JSON` and the body <body>
    Then it answers <status> with `{ ok: false, error: <a sentence>, code: "<code>" }`
    And the ask file for `R1` is byte-unchanged

    Examples:
      | given                                | body                                              | status | code                 |
      | nothing else                         | `{ "ref": "03/01", "text": "" }`                  | 400    | answer-empty         |
      | nothing else                         | `{ "ref": "03/01", "text": "ok\u001b[201~" }`     | 400    | answer-control-chars |
      | the ask has been answered by `"you"` | `{ "ref": "03/01", "text": "c" }`                 | 409    | ask-already-answered |
      | no ask file exists                   | `{ "ref": "03/01", "text": "take b" }`            | 409    | answer-not-waiting   |
      | nothing else                         | `{ "ref": "999/99", "text": "take b" }`           | 404    | ref-not-found        |
      | nothing else                         | `{ "ref": "999/99", "text": "" }`                 | 404    | ref-not-found        |
      | nothing else                         | `{ "text": "take b" }`                            | 404    | ref-not-found        |
      | nothing else                         | `{ "ref": 3, "text": "take b" }`                  | 404    | ref-not-found        |
      | nothing else                         | `{ "ref": "03/01" }`                              | 400    | answer-empty         |
      | nothing else                         | `{ "ref": "03/01", "text": 42 }`                  | 400    | answer-empty         |
      | nothing else                         | `{ "ref": "03/01", "text": <8,001 "a"> }`         | 400    | answer-too-long      |
      | nothing else                         | `{ "ref": "03/01", "text": "b", "actor": <81 "a"> }` | 400 | answer-actor-invalid |

  Scenario Outline: admission refuses before the body is read, and the body reader after it, on every board write route alike
    When `<method> /api/work/<route>` is sent with origin <origin>, content-type <contentType> and the raw body <rawBody>
    Then it answers <status> with `code` `<code>`, never `ok: true`, and `Allow: POST` when the status is 405
    And no ask file, record doc, `FEEDBACK.ndjson` or `STATE.md` under `B` changed

    Examples:
      | method  | route    | origin                         | contentType                          | rawBody                             | status | code                 |
      | GET     | answer   | `SAME`                         | `application/json`                   | none                                | 405    | method-not-allowed   |
      | PUT     | answer   | `SAME`                         | `application/json`                   | `{ "ref": "03/01", "text": "b" }`   | 405    | method-not-allowed   |
      | DELETE  | answer   | `SAME`                         | `application/json`                   | none                                | 405    | method-not-allowed   |
      | OPTIONS | answer   | `SAME`                         | `application/json`                   | none                                | 405    | method-not-allowed   |
      | POST    | answer   | `http://evil.example`          | `application/json`                   | `{ "ref": "03/01", "text": "b" }`   | 403    | cross-origin-refused |
      | POST    | answer   | `SAME` + a trailing slash      | `application/json`                   | `{ "ref": "03/01", "text": "b" }`   | 403    | cross-origin-refused |
      | POST    | answer   | absent                         | `application/json`                   | `{ "ref": "03/01", "text": "b" }`   | 403    | cross-origin-refused |
      | POST    | answer   | the string `"null"`            | `application/json`                   | `{ "ref": "03/01", "text": "b" }`   | 403    | cross-origin-refused |
      | POST    | answer   | `https://` + the Host          | `application/json`                   | `{ "ref": "03/01", "text": "b" }`   | 403    | cross-origin-refused |
      | POST    | answer   | `http://localhost:<port>`      | `application/json`                   | `{ "ref": "03/01", "text": "b" }`   | 403    | cross-origin-refused |
      | POST    | answer   | `http://evil.example`          | `application/json`                   | 2,000,000 bytes of `a`              | 403    | cross-origin-refused |
      | POST    | answer   | `SAME`                         | `text/plain`                         | `{ "ref": "03/01", "text": "b" }`   | 400    | invalid-content-type |
      | POST    | answer   | `SAME`                         | absent                               | `{ "ref": "03/01", "text": "b" }`   | 400    | invalid-content-type |
      | POST    | answer   | `SAME`                         | `application/jsonp`                  | `{ "ref": "03/01", "text": "b" }`   | 400    | invalid-content-type |
      | POST    | answer   | `SAME`                         | `text/json`                          | `{ "ref": "03/01", "text": "b" }`   | 400    | invalid-content-type |
      | POST    | answer   | `SAME`                         | `application/x-www-form-urlencoded`  | `ref=03/01&text=b`                  | 400    | invalid-content-type |
      | POST    | answer   | `SAME`                         | `multipart/form-data`                | `{ "ref": "03/01", "text": "b" }`   | 400    | invalid-content-type |
      | POST    | answer   | `SAME`                         | `text/plain`                         | 2,000,000 bytes of `a`              | 400    | invalid-content-type |
      | POST    | answer   | `SAME`                         | `application/json`                   | `{ not json`                        | 400    | malformed-json       |
      | POST    | answer   | `SAME`                         | `application/json`                   | empty                               | 400    | empty-json           |
      | POST    | answer   | `SAME`                         | `application/json`                   | a JSON object of 1,000,001 bytes    | 413    | payload-too-large    |
      | POST    | answer   | `SAME`                         | `application/json`                   | `null`                              | 400    | invalid-body         |
      | POST    | answer   | `SAME`                         | `application/json`                   | `["03/01", "b"]`                    | 400    | invalid-body         |
      | POST    | answer   | `SAME`                         | `application/json`                   | `"take b"`                          | 400    | invalid-body         |
      | POST    | answer   | `SAME`                         | `application/json`                   | `42`                                | 400    | invalid-body         |
      | POST    | answer/  | `SAME`                         | `application/json`                   | `{ "ref": "03/01", "text": "b" }`   | 404    | not-found            |
      | GET     | feedback | `SAME`                         | `application/json`                   | none                                | 405    | method-not-allowed   |
      | POST    | feedback | `http://evil.example`          | `application/json`                   | `{ "ref": "03/01", "note": "x" }`   | 403    | cross-origin-refused |
      | POST    | feedback | absent                         | `application/json`                   | `{ "ref": "03/01", "note": "x" }`   | 403    | cross-origin-refused |
      | POST    | feedback | `SAME`                         | `text/plain`                         | `{ "ref": "03/01", "note": "x" }`   | 400    | invalid-content-type |
      | POST    | resync   | absent                         | `application/json`                   | `{ "ref": "03/01" }`                | 403    | cross-origin-refused |
      | POST    | resync   | `SAME`                         | `text/plain`                         | `{ "ref": "03/01" }`                | 400    | invalid-content-type |
      | GET     | resync   | `SAME`                         | `application/json`                   | none                                | 405    | method-not-allowed   |
      | GET     | continue | `SAME`                         | `application/json`                   | none                                | 405    | method-not-allowed   |
      | POST    | continue | absent                         | `application/json`                   | `{ "ref": "03/01" }`                | 403    | cross-origin-refused |
      | POST    | refine   | `SAME`                         | `text/plain`                         | `{ "ref": "03/01" }`                | 400    | invalid-content-type |
      | GET     | verify   | `SAME`                         | `application/json`                   | none                                | 405    | method-not-allowed   |
      | POST    | verify   | `http://evil.example`          | `application/json`                   | `{ "ref": "03/01" }`                | 403    | cross-origin-refused |
      | POST    | feedback | `SAME`                         | `application/json`                   | `null`                              | 400    | invalid-body         |
      | POST    | resync   | `SAME`                         | `application/json`                   | `["03/01"]`                         | 400    | invalid-body         |
      | POST    | continue | `SAME`                         | `application/json`                   | `"03/01"`                           | 400    | invalid-body         |
      | POST    | refine   | `SAME`                         | `application/json`                   | `true`                              | 400    | invalid-body         |

  Scenario Outline: a JSON content-type with parameters or another case is admitted, as the fleet admits it
    When `POST /api/work/answer` is sent with `SAME`, content-type <contentType> and the body `{ "ref": "03/01", "text": "" }`
    Then it answers 400 with `code` `answer-empty`, the verb's own refusal, so admission passed

    Examples:
      | contentType                       |
      | `application/json; charset=utf-8` |
      | `application/json;charset=UTF-8`  |
      | `APPLICATION/JSON`                |

  Scenario Outline: the body's actor passes through, and the verb decides the default
    When `POST /api/work/answer` is sent with `SAME`, `JSON` and the body `{ "ref": "03/01", "text": "take b"<actor> }`
    Then it answers 200 with `by.actor` <by> and `by.via` `"board"`

    Examples:
      | actor               | by        |
      | (no actor key)      | `"you"`   |
      | `, "actor": ""`     | `"you"`   |
      | `, "actor": "   "`  | `"you"`   |
      | `, "actor": null`   | `"you"`   |
      | `, "actor": 42`     | `"you"`   |
      | `, "actor": " qa "` | `"qa"`    |

  Scenario: a second answer from the board is refused naming the first, and the first stands
    Given `POST /api/work/answer` has been answered 200 for `{ "ref": "03/01", "text": "take b", "actor": "umami" }`
    When the same request is sent again with the text `"take c"`
    Then it answers 409 with `code` `ask-already-answered` and an `error` sentence naming `"umami"`
    And the ask file for `R1` still reads `answer: "take b"`

  Scenario Outline: a read route takes no admission
    When `GET /api/work/<route>` is sent with origin <origin> and no content-type
    Then it answers 200 with the route's envelope, as it did before this story

    Examples:
      | route  | origin                |
      | list   | absent                |
      | list   | `http://evil.example` |
      | next   | absent                |
      | doctor | `http://evil.example` |

  Scenario: a same-origin feedback POST still lands, so the board's own client is unaffected
    When `POST /api/work/feedback` is sent with `SAME`, `JSON` and `{ "ref": "03/01", "note": "still works", "actor": "qa" }`
    Then it answers 200, and `03/01`'s `STATE.md` gained exactly one bullet under `## Feedback (for retro)`

  Scenario: only ref, text and actor are lifted off the body
    When `POST /api/work/answer` is sent with `SAME`, `JSON` and `{ "ref": "03/01", "text": "take b", "actor": "umami", "via": "cli", "by": { "actor": "root" }, "now": "1999-01-01T00:00:00.000Z", "state": "waiting" }`
    Then it answers 200 with `by` `{ actor: "umami", via: "board", node: <config.mesh.nodeId ?? null> }` and an `answeredAt` that is not `1999-01-01T00:00:00.000Z`
    And `src/board-ui.mjs`'s answer branch reads exactly `body.ref`, `body.text` and `body.actor` and nothing else off the body

  Scenario: every board write passes one admission, in the source
    When `src/board-ui.mjs` is read with its comments stripped
    Then `function admitWriteRequest(` is defined exactly once, and `pathname === "/api/work/answer"` is present
    And every `readJsonBody(` call is preceded, in its own branch, by an `admitWriteRequest(` call, and there are exactly four `admitWriteRequest(` call sites: the phase-door closure, resync, feedback and answer
    And `admitWriteRequest` checks the method, then the Origin, then `isLoopbackHost(`, then the content-type, and the file still performs no `writeFile(`, `appendFile(`, `spawn(` or `exec(`

  Scenario: the two board gates hold with the new door
    When `acd-work-command-route-coverage` and `acd-board-write-isolation` run
    Then the served `/api/work/*` set equals the registry's `work:*` ops minus `BOARD_DEFERRED`, with `answer` served and `resume` still deferred
    And the write allowlist is exactly `feedback`, `continue`, `refine`, `verify`, `resync` and `answer`, and `/api/work/answer` answers a served JSON envelope to its probe

  Scenario: FF-5307 is re-pinned with the reason and the measured diff
    When `acd-loop-state-rides-the-run-record` runs
    Then `src/board-ui.mjs`'s pin carries this story's digest and a comment naming 131/04, "one hoisted admission and one route onto `work:answer`", and the measured `git diff`
    And `src/run-store.mjs`'s and `src/commands/run-status.mjs`'s pins and the `ui/` digest are unchanged by this story
