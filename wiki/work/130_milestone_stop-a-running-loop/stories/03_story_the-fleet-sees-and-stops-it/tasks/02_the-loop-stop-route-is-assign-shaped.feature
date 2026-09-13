@executable @cli @work @board
Feature: the loop-stop route is assign-shaped — the two guard blocks hoisted first, then a third write route that lifts exactly scope and workspaceId and answers the verb's document

  ADR-005 §4; pays TECH_DEBT item 44. The fleet face's write routes are a COPY (item 44 measured
  63 verbatim lines between `assign` and `session`, and THREE detectors require the copy in place).
  So the third route is preceded by the hoist: `admitWriteRequest(request, response)` (method →
  405; same-origin `Origin` + `application/json` → 403 / 400, before any body is read) and
  `resolveLocalWorkspaceRow(workspaceId, response)` (`queryGlobalMeshStatus` → row → 404;
  `existsSync(projectRoot)` → 409 `workspace-not-local`) become two named helpers INSIDE
  `ui-serve.mjs` (no new module — `src/mesh/` is 34/34), the assign and session routes call them,
  and the three detectors are re-aimed: every write-route branch CALLS `admitWriteRequest` before it
  reads a body. Then `POST /api/mesh/loop-stop`: admit; body lifted to EXACTLY `{ scope, workspaceId }`
  (both required non-empty strings, else 400 `invalid-body`; every other field rides no further);
  resolve the local row; `loadWorkspace(row.projectRoot)` and the own-id assertion assign performs;
  `stopLoop(workspace, { scope })` from `../loop/stop.mjs` — the SECOND sanctioned core import, so
  `acd-mesh-ui-no-core-import`'s allow-list grows by that one specifier; `ok: false` →
  `sendApiError(404 for loop-stop-no-declaration, 409 otherwise, message, code)`; otherwise 200 with
  ADR-002 §4's seven-key document verbatim. No `controlNodeId()` issuer — the verb stamps `by` from
  the workspace it is handed. The route enumerations grow to six named routes and three write routes.

  RULINGS (QA, 2026-09-13). The verb's refusals are PRODUCED by the fixture's run records, never
  stubbed — the face is a black box: no `running` run with a usable `brief.loop` in scope → 404;
  the latest run under the id naming another `node` → 409 `loop-stop-not-local`; a scope
  `decideLoopScope` refuses → 409 `loop-stop-scope`. The own-id assertion (409
  `workspace-id-mismatch`) sits on this ladder after `resolveLocalWorkspaceRow`, exactly where
  assign's does. This face has NO body cap (`readJsonBody`, `ui-serve.mjs:1300`, reads to `end`)
  and the third route inherits that as assign and session do: a 1 MiB body is lifted like a
  40-byte one and no 413 exists on this contract — a cap would be a face-wide change and is
  reported for the register, not asserted here. An unconfigured control node still answers 200:
  `control-identity-unknown` is assign's, not this route's.

  Background:
    Given `serveMeshUi` stood up over the published assign fixture on port 0, whose one local workspace `w1` (own id `control-a`) holds stream `03` with item `03/01`
    And `03/01` carries a `running` run whose `brief.loop` is usable under `loopRunId` `"L1"`, `scope` `"03"`, and a fresh `heartbeatAt`
    And an isolated aof home holding no `loop-stops` file

  Scenario: the two helpers exist and the existing write routes call them
    When the comment-stripped source of `src/mesh/ui-serve.mjs` is read
    Then it defines `admitWriteRequest` and `resolveLocalWorkspaceRow` exactly once each
    And the `/api/mesh/assign`, `/api/mesh/session` and `/api/mesh/loop-stop` branches each call `admitWriteRequest(` before any `readJsonBody(`
    And the assign and session branches each call `resolveLocalWorkspaceRow(` and contain no inline `.workspaces ?? []).find(` of their own

  Scenario Outline: admission is the same for the third route as for the first
    When `<method> /api/mesh/loop-stop` is sent with <headers> and body <body>
    Then the response is <status> with code <code>
    And no `loop-stops` file was written

    Examples:
      | method | headers                                                   | body                                                  | status | code                        |
      | GET    | same-origin, `application/json`                           | —                                                     | 405    | `method-not-allowed`, `Allow: POST` |
      | PUT    | same-origin, `application/json`                           | `{ scope, workspaceId }`                              | 405    | `method-not-allowed`, `Allow: POST` |
      | POST   | `Origin: http://evil.example`, `application/json`         | `{ scope, workspaceId }`                              | 403    | `cross-origin-refused`      |
      | POST   | `Origin: <same origin with a trailing slash>`, `application/json` | `{ scope, workspaceId }`                      | 403    | `cross-origin-refused` — the exact string, never a prefix |
      | POST   | no `Origin`, `application/json`                           | `{ scope, workspaceId }`                              | 403    | `cross-origin-refused`      |
      | POST   | same-origin, `text/plain`                                 | `{ scope, workspaceId }`                              | 400    | `invalid-content-type`      |
      | POST   | same-origin, no `content-type`                            | `{ scope, workspaceId }`                              | 400    | `invalid-content-type`      |
      | POST   | same-origin, `application/json`                           | `{ not json`                                          | 400    | `invalid-body`              |
      | POST   | same-origin, `application/json`                           | (empty)                                               | 400    | `invalid-body`              |
      | POST   | same-origin, `application/json`                           | `null`                                                | 400    | `invalid-body`              |
      | POST   | same-origin, `application/json`                           | `["03", "w1"]`                                        | 400    | `invalid-body`              |
      | POST   | same-origin, `application/json`                           | `{ scope: "03" }`                                     | 400    | `invalid-body`              |
      | POST   | same-origin, `application/json`                           | `{ workspaceId: "w1" }`                               | 400    | `invalid-body`              |
      | POST   | same-origin, `application/json`                           | `{ scope: "  ", workspaceId: "w1" }`                  | 400    | `invalid-body`              |
      | POST   | same-origin, `application/json`                           | `{ scope: 3, workspaceId: "w1" }`                     | 400    | `invalid-body` — a number is not a scope |
      | POST   | same-origin, `application/json`                           | `{ scope: "03", workspaceId: ["w1"] }`                | 400    | `invalid-body`              |
      | POST   | same-origin, `application/json`                           | `{ scope: "03", workspaceId: "nope" }`                | 404    | `workspace-not-found`       |
      | POST   | same-origin, `application/json`                           | `{ scope: "03", workspaceId: <a row whose projectRoot is gone> }` | 409 | `workspace-not-local` |
      | POST   | same-origin, `application/json`                           | `{ scope: "03", workspaceId: <a row whose checkout identifies itself as another id> }` | 409 | `workspace-id-mismatch` |

  Scenario Outline: a well-formed stop answers the verb's document verbatim and writes the request
    When `POST /api/mesh/loop-stop` is sent same-origin with `content-type` <contentType> and body <body>
    Then the response is 200 and its body's keys are exactly, in order, `ok, loopRunId, scope, live, request, state, path`
    And `request` is `"drain"`, `loopRunId` is `"L1"`, `live` is `true`, `state` is `"requested"`
    And the request file exists at `path` under `<home>/mesh/loop-stops/` with `by.node` equal to `"control-a"` and no `issuer`, `state: "forged"` or `pad` anywhere in it
    And a second identical POST answers `request: "cancel"`, `state: "requested"`, and a third answers `request: "cancel"` again — idempotent, never an error

    Examples:
      | contentType                       | body                                                                              |
      | `application/json`                | `{ scope: "03", workspaceId: "w1", state: "forged", issuer: "forged" }`           |
      | `application/json; charset=utf-8` | `{ scope: "03", workspaceId: "w1" }`                                              |
      | `application/json`                | `{ scope: "03", workspaceId: "w1", pad: <a string of 1,048,577 characters> }`     |

  Scenario Outline: liveness is reported, never refused
    Given `03/01`'s run under `"L1"` is <run>
    When `POST /api/mesh/loop-stop` is sent same-origin with `{ scope: "03", workspaceId: "w1" }`
    Then the response is 200 with `live` <live> and `state` <state>
    And the request file exists

    Examples:
      | run                                                  | live    | state          |
      | `running` with a fresh `heartbeatAt`                 | `true`  | `"requested"`  |
      | `running` with a `heartbeatAt` older than `heartbeatMs` | `false` | `"honoured"` |
      | `done` (the latest usable declaration, no run in flight) | `false` | `"honoured"` |

  Scenario Outline: the verb's refusals map to the face's codes, produced by the records
    Given the fixture's records are arranged so that <arrangement>
    When `POST /api/mesh/loop-stop` is sent same-origin with `{ scope: <scope>, workspaceId: "w1" }`
    Then the response is <status> with body `{ ok: false, error: <the verb's sentence>, code: <code> }` and nothing else
    And no `loop-stops` file was written

    Examples:
      | arrangement                                                                  | scope     | status | code                          |
      | no run in stream `03` carries a usable `brief.loop`                          | `"03"`    | 404    | `"loop-stop-no-declaration"`  |
      | the records are as the Background says                                       | `"999"`   | 404    | `"loop-stop-no-declaration"` — an admitted scope with nothing in it |
      | the latest run under `"L1"` carries `node: "umamis-mac-mini"`                | `"03"`    | 409    | `"loop-stop-not-local"`, the sentence naming `umamis-mac-mini`, `control-a` and the remedy |
      | the records are as the Background says                                       | `"abc"`   | 409    | `"loop-stop-scope"`           |
      | the records are as the Background says                                       | `"05-01"` | 409    | `"loop-stop-scope"`           |

  Scenario: an unconfigured control node still stops a local loop
    Given `serveMeshUi` stood up over a repo committing no `mesh.nodeId`, with an isolated home holding no identity sidecar, whose stream `03` holds the Background's running run
    When `POST /api/mesh/loop-stop` is sent same-origin with `{ scope: "03", workspaceId: <that workspace's id> }`
    Then the response is 200 with `request: "drain"` — no `control-identity-unknown` on this route

  Scenario: the face imports the core and nothing from commands
    When the resolved import specifiers of `src/mesh/ui-serve.mjs` are read through `test/support/module-family.mjs`
    Then they include `../loop/stop.mjs` and none under `../commands/`
    And `test/arch/mesh/acd-mesh-ui-no-core-import.test.mjs`'s allow-list names `../loop/stop.mjs` as its second sanctioned write door

  Scenario: the enumerations name six routes and three write routes
    When `test/arch/mesh/acd-mesh-ui-read-only.test.mjs` and `test/arch/mesh/acd-mesh-ui-write-isolation.test.mjs` are read
    Then the route table names `/api/mesh/loop-stop` and the write set is exactly `assign`, `session`, `loop-stop`
    And `test/arch/ui/acd-fleet-face-single-mutation-route.test.mjs` and `acd-fleet-board-link-resolved.test.mjs` assert the helper CALL in each write branch, not the inline guard text

  Scenario: item 44 is discharged
    When `wiki/work/TECH_DEBT.md` is read
    Then item 44 no longer stands as open — its entry is deleted or names this story and the two helpers that paid it
