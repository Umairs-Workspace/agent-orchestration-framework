@executable @ui @work @board
Feature: one loopback predicate refuses a rebinding page on both faces' write routes

  ADR-006 §3. `isLoopbackHost(host)` is one pure predicate in `src/static-serve.mjs`, the leaf
  both servers already import. It answers `true` only when the `Host` header names a loopback
  address — `localhost`, a `127.0.0.0/8` dotted quad, or `::1` in brackets — with an optional
  numeric port and nothing else. `admitWriteRequest` in `src/board-ui.mjs` (task 01) and in
  `src/mesh/ui-serve.mjs` call it after the Origin check and refuse 403 `non-loopback-host`. This
  closes DNS rebinding: a page at `evil.example` whose name resolves to this machine sends
  `Host: evil.example:4181` and a matching `Origin: http://evil.example:4181`, which today's
  exact-string Origin check admits. The fleet's three write routes (assign, session, loop-stop)
  and the board's six gain the check together. A same-origin browser fetch to
  `http://127.0.0.1:<port>` or `http://localhost:<port>` is unaffected, and no read route checks
  the header: a safe method has no side effect to forge.

  RULINGS (PO, 2026-09-23).
  (1) The predicate reads the header as a string. It accepts `localhost` case-insensitively, a
  dotted quad whose first octet is `127` and whose other three are `0`–`255`, and `[::1]`; each
  may be followed by `:` and one to five digits, and by nothing else. It refuses everything else:
  a missing, empty or non-string header, `localhost.`, `localhost.evil.example`,
  `127.0.0.1.evil.example`, `0.0.0.0`, `10.0.0.1`, `192.168.1.5`, an unbracketed `::1`, an
  IPv4-mapped `[::ffff:127.0.0.1]`, a port that is not digits, a userinfo `@`, a path, a scheme,
  or any whitespace. Tight on purpose: the servers bind loopback, so nothing legitimate arrives
  under another name.
  (2) Order in both helpers: method → Origin → Host → content-type. A request that is both
  cross-origin and non-loopback is `cross-origin-refused`; a same-origin non-loopback one is
  `non-loopback-host`. The refusal sentence is `Write refused: the page was not served from a
  loopback address.` and names no header value.
  (3) `static-serve.mjs` stays a pure leaf — `node:path` and nothing else — and `isLoopbackHost`
  is its fourth export. `mesh-ui-serve.test.mjs`'s control that counts `admitWriteRequest`
  definitions still finds exactly one in the fleet.
  (4) Test transport: Node's `fetch` drops a caller-set `Host` (a forbidden header name), so the
  Host rows are sent with `node:http`'s `request`, which honours `headers.host`. `SAME` for these
  rows means an Origin equal to `http://` + the Host being sent, the rebinding shape.
  (5) The check is on the write routes only. `GET /api/work/list` and `GET /api/mesh/fleet`
  with `Host: evil.example` answer as they do today.

  RULINGS (QA, 2026-09-23).
  (1) The port is one to five digits, checked as digits and not as a range: `:0` and `:99999` are
  admitted, six digits are not. The name is what the check protects; a port is not a name.
  (2) An octet is decimal `0`–`255` with no leading zero, so `127.0.0.01`, `0x7f.0.0.1` and the
  integer spelling `2130706433` are refused. Tight, as ruling (1) is. For the PO to ratify.
  (3) `[::1]` is the only IPv6 spelling admitted; the long form `[0:0:0:0:0:0:0:1]` is refused.
  (4) Node's HTTP parser trims a header's surrounding whitespace, so the whitespace rows are
  proven on the predicate only, never over the wire.
  (5) The refusal body is exactly `{ ok: false, error: <PO ruling 2's sentence>, code:
  "non-loopback-host" }`, and names neither the host nor the port that was sent.
  (6) The order is proven on both faces, and the Host check precedes the body read: a 2,000,000-byte
  body under a foreign Host is 403 `non-loopback-host`, never 413.
  (7) The fleet serves no `GET /api/mesh/fleet`; its read route is `GET /api/mesh/status`, which
  stands in for PO ruling (5)'s fleet row.

  RULINGS (PO, answering QA, 2026-09-23).
  (8) QA (1)–(7) are RATIFIED. (7) corrects PO ruling (5): the fleet's read route is
  `GET /api/mesh/status`.

  RULINGS (developer, 2026-09-23).
  (9) Feasible. The predicate is shown below, checked against all 47 rows, and every row holds:
  `typeof host === "string" && /^(?:localhost|127(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}|\[::1\])(?::\d{1,5})?$/i.test(host)`.
  The `typeof` guard is load-bearing, because `.test` coerces the array `["127.0.0.1"]` to a
  loopback string. JS `$` without the `m` flag never matches before a trailing newline.
  (10) The `[::1]` rows are reachable over the wire. Both servers bind `127.0.0.1`, and the Host
  header does not depend on the socket: the client connects to `127.0.0.1` and sends
  `host: [::1]:<port>` with the matching Origin. Only QA's whitespace rows are predicate-only.
  (11) The fleet's `admitWriteRequest` takes the check with no change at any call site: the
  signature and its `true`-or-already-sent contract hold. It adds one name to its existing
  `../static-serve.mjs` import. `postLoopStop` and `postAssign` send through `fetch`, so the Host
  rows need a local `node:http` helper in `mesh-ui-serve.test.mjs`, which imports `http` already.
  (12) "No other Host-reading check" means no second `isLoopbackHost(` call and no comparison
  made on `headers.host`. The Origin expectation `http://${request.headers.host}` is not a check.
  (13) The truth table and the leaf-shape scenario live in `mesh-ui-serve.test.mjs`. By its own
  header, `test/ui/static-serve-fallback.test.mjs` is HTTP-only, and it is not in `files:`.

  RULINGS (PO, answering the developer, 2026-09-23).
  (14) Developer (9)–(13) are RATIFIED, the regex in (9) included.

  Background:
    Given the board fixture of task 01 on `boardUrl`, and the fleet fixture of `mesh-ui-serve.test.mjs`'s loop-stop lane on `fleetUrl`
    And a request sent "with Host `h`" carries the header `host: h` through `node:http` and the header `origin: http://` + `h`, so Origin and Host agree as a rebinding page's would

  Scenario Outline: the predicate answers only for a loopback name
    When `isLoopbackHost(<host>)` is asked
    Then it answers <answer>

    Examples:
      | host                          | answer  |
      | `"127.0.0.1"`                 | `true`  |
      | `"127.0.0.1:4181"`            | `true`  |
      | `"localhost"`                 | `true`  |
      | `"localhost:4181"`            | `true`  |
      | `"LOCALHOST:4181"`            | `true`  |
      | `"[::1]"`                     | `true`  |
      | `"[::1]:4181"`                | `true`  |
      | `"127.1.2.3:80"`              | `true`  |
      | `"evil.example:1234"`         | `false` |
      | `"192.168.1.5:4181"`          | `false` |
      | `"0.0.0.0:4181"`              | `false` |
      | `"::1"`                       | `false` |
      | `"[::ffff:127.0.0.1]"`        | `false` |
      | `"localhost.evil.example"`    | `false` |
      | `"127.0.0.1.evil.example"`    | `false` |
      | `"localhost:abc"`             | `false` |
      | `"user@localhost"`            | `false` |
      | `"http://localhost:4181"`     | `false` |
      | `""`                          | `false` |
      | `undefined`                   | `false` |
      | `"127.0.0.1:0"`               | `true`  |
      | `"127.0.0.1:65535"`           | `true`  |
      | `"127.0.0.1:99999"`           | `true`  |
      | `"127.0.0.1:999999"`          | `false` |
      | `"Localhost"`                 | `true`  |
      | `"127.255.255.254"`           | `true`  |
      | `"128.0.0.1"`                 | `false` |
      | `"127.256.0.1"`               | `false` |
      | `"127.0.0"`                   | `false` |
      | `"127.0.0.1.1"`               | `false` |
      | `"127.0.0.01"`                | `false` |
      | `"0x7f.0.0.1"`                | `false` |
      | `"2130706433"`                | `false` |
      | `"127.0.0.1:"`                | `false` |
      | `"127.0.0.1:4181:1"`          | `false` |
      | `" 127.0.0.1"`                | `false` |
      | `"127.0.0.1 "`                | `false` |
      | `"localhost."`                | `false` |
      | `"localhost:4181/path"`       | `false` |
      | `"[::1]:"`                    | `false` |
      | `"[::1]:abc"`                 | `false` |
      | `"[::1"`                      | `false` |
      | `"[::2]"`                     | `false` |
      | `"[0:0:0:0:0:0:0:1]"`         | `false` |
      | `["127.0.0.1"]`               | `false` |
      | the number `2130706433`       | `false` |
      | `null`                        | `false` |

  Scenario Outline: a rebinding page is refused on the fleet's write routes, and a loopback page is not
    When `POST /api/mesh/<route>` is sent to `fleetUrl` with Host <host>, `content-type: application/json` and a well-formed body
    Then it answers <status> with `code` <code>, and a refusal's body names neither the host nor the port that was sent

    Examples:
      | route     | host                             | status                     | code                      |
      | loop-stop | `evil.example:1234`              | 403                        | `non-loopback-host`       |
      | assign    | `evil.example:1234`              | 403                        | `non-loopback-host`       |
      | session   | `evil.example:1234`              | 403                        | `non-loopback-host`       |
      | loop-stop | `192.168.1.5:<port>`             | 403                        | `non-loopback-host`       |
      | loop-stop | `0.0.0.0:<port>`                 | 403                        | `non-loopback-host`       |
      | loop-stop | `localhost.:<port>`              | 403                        | `non-loopback-host`       |
      | assign    | `127.0.0.1.evil.example:<port>`  | 403                        | `non-loopback-host`       |
      | loop-stop | `localhost:<port>`               | the route's own answer     | the route's own code      |
      | loop-stop | `127.0.0.1:<port>`               | the route's own answer     | the route's own code      |
      | loop-stop | `LOCALHOST:<port>`               | the route's own answer     | the route's own code      |
      | loop-stop | `[::1]:<port>`                   | the route's own answer     | the route's own code      |

  Scenario Outline: a rebinding page is refused on the board's write routes, before the body is read
    When `POST /api/work/<route>` is sent to `boardUrl` with Host <host>, `content-type: application/json` and <body>
    Then it answers <status> with `code` <code>, and no ask file or record doc changed

    Examples:
      | route    | host                   | body                         | status                     | code                      |
      | answer   | `evil.example:1234`    | a well-formed body           | 403                        | `non-loopback-host`       |
      | feedback | `evil.example:1234`    | a well-formed body           | 403                        | `non-loopback-host`       |
      | continue | `evil.example:1234`    | a well-formed body           | 403                        | `non-loopback-host`       |
      | refine   | `evil.example:1234`    | a well-formed body           | 403                        | `non-loopback-host`       |
      | verify   | `10.0.0.1:<port>`      | a well-formed body           | 403                        | `non-loopback-host`       |
      | resync   | `evil.example:1234`    | a well-formed body           | 403                        | `non-loopback-host`       |
      | answer   | `evil.example:1234`    | 2,000,000 bytes of `a`       | 403                        | `non-loopback-host`       |
      | answer   | `localhost:<port>`     | a well-formed body           | the verb's own answer      | the verb's own code       |
      | answer   | `[::1]:<port>`         | a well-formed body           | the verb's own answer      | the verb's own code       |

  Scenario: a cross-origin request from a non-loopback page is refused as cross-origin, in that order
    When `POST /api/work/answer` is sent to `boardUrl` with `host: evil.example:1234`, `origin: http://other.example` and `content-type: application/json`
    Then it answers 403 with `code` `cross-origin-refused`

  Scenario Outline: method, Origin, Host and content-type are checked in that order on both faces
    When `<method> <path>` is sent to <face> through `node:http` with `host: <host>`, origin <origin> and content-type <contentType>
    Then it answers <status> with `code` `<code>`

    Examples:
      | face       | method | path                  | host                | origin                         | contentType        | status | code                 |
      | `boardUrl` | GET    | `/api/work/answer`    | `evil.example:1234` | `http://evil.example:1234`     | `application/json` | 405    | method-not-allowed   |
      | `boardUrl` | POST   | `/api/work/answer`    | `evil.example:1234` | absent                         | `application/json` | 403    | cross-origin-refused |
      | `boardUrl` | POST   | `/api/work/answer`    | `evil.example:1234` | `http://evil.example:1234`     | `text/plain`       | 403    | non-loopback-host    |
      | `boardUrl` | POST   | `/api/work/answer`    | `localhost:<port>`  | `http://127.0.0.1:<port>`      | `application/json` | 403    | cross-origin-refused |
      | `fleetUrl` | PUT    | `/api/mesh/loop-stop` | `evil.example:1234` | `http://evil.example:1234`     | `application/json` | 405    | method-not-allowed   |
      | `fleetUrl` | POST   | `/api/mesh/loop-stop` | `evil.example:1234` | `http://other.example`         | `application/json` | 403    | cross-origin-refused |
      | `fleetUrl` | POST   | `/api/mesh/loop-stop` | `evil.example:1234` | `http://evil.example:1234`     | `text/plain`       | 403    | non-loopback-host    |
      | `fleetUrl` | POST   | `/api/mesh/assign`    | `evil.example:1234` | `http://evil.example:1234`     | absent             | 403    | non-loopback-host    |

  Scenario: the predicate is one export in the shared leaf, called by both admissions
    When `src/static-serve.mjs`, `src/board-ui.mjs` and `src/mesh/ui-serve.mjs` are read with comments stripped
    Then `static-serve.mjs` imports only `node:path` and exports `isLoopbackHost` beside `contentType`, `safeStaticPath` and `shouldServeAppShell`
    And each `admitWriteRequest` body calls `isLoopbackHost(request.headers.host)` exactly once, between its Origin check and its content-type check, and no other `Host`-reading check exists in either file

  Scenario: a read route ignores the header
    When `GET /api/work/list` is sent to `boardUrl` with Host `evil.example:1234`
    Then it answers 200 with the list envelope, as it does with a loopback Host

  Scenario: the fleet's read route ignores the header too
    When `GET /api/mesh/status` is sent to `fleetUrl` with Host `evil.example:1234`
    Then it answers 200 with the status envelope, as it does with a loopback Host
