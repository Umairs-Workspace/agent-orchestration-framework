@executable @ui @work @board
Feature: /api/work/list takes includeArchived, default excluded, and threads it to work:list's own all flag — the face filters nothing and enumerates nothing

  `src/board-ui.mjs` is a THIN FACE (08/ADR-003): each route is an `HTTP → invoke → envelope`
  adapter with no operation logic of its own. `work:list` already owns the archive split —
  127/01 gave it `all` (the default listing is the live rows plus the backlog; an archived row
  is reachable only through `--all`), threaded to `listStream`'s one predicate through the
  cache-first seam. The board's list route (`GET /api/work/list`) therefore gains exactly one
  query parameter, `includeArchived`, and one line: when it is present with the value `1` or
  `true`, the route invokes `work:list` with `{ mesh: true, all: true }`; otherwise with
  `{ mesh: true }` exactly as today. Any other value reads as absent — the board only ever
  sends `1` or nothing, and a face that refused `includeArchived=yes` would be inventing a
  validation the command does not have. The face reads no row's `archived`, filters no row,
  and never reaches `listItems` (ADR-006 §2: "the board never filters `archived` itself, and
  never enumerates"). The envelope keeps its three keys `{ items, stalenessSeconds, nodeId }`
  in both states; `work:list`'s `--json` CLI array is untouched (the frozen face — a route
  parameter is a FACE concern, ADR-010/R4.1's rule applied once more).

  THE ROWS ON THE WIRE are `listStream`'s, unchanged: the frozen seven keys plus the
  answering-side stamp on a live row, `number: null` + `backlog` on a backlog row, `archived:
  true` on an archived row. So `board-face-contract`'s frozen-shape assertion over the default
  stream (no backlog, no archive) holds byte-for-byte, and `ui/src/board/api.ts`'s `WorkItem`
  type widens by three OPTIONAL keys — `number?: null`, `backlog?: string`, `archived?: true`
  — so a component reads a fact the wire carries rather than one it guesses from `ref`'s shape.
  `workApi.list({ includeArchived })` composes the URL: `/api/work/list?includeArchived=1` when
  true, `/api/work/list` (no query string at all) when false or omitted — "requested WITHOUT
  the include-archived parameter" is a testable absence, and the harness records the URL.

  THE FIXTURE. `test/support/board-face-fixture.mjs`'s `writeStream` learns two optional
  members beside `milestone` / `stories` / `gate`: `backlog: [{ type, slug, title, group }]`
  (written as `backlog/[<group>/]<type>_<slug>/<record doc>` with no `number:` line) and
  `archived: [{ type, number, slug, title, status, stories }]` (written under `archive/`, name
  verbatim, `status: done`). The default stream is unchanged, so every existing board lane
  reads exactly what it read. This is the substrate tasks 03 and 04 mount the real `<Board/>`
  against; nothing in the route, the command core or the row shapes is stood in for.

  What would quietly undo this: a route that filters `items` by `archived` after the invoke (a
  second predicate — the milestone's disease); a `?all=1` spelling (the wire name is ADR-006
  §2's and the board's toggle is its only sender); a `WorkItem` type that keeps `number` out
  and lets a component test `Number.isNaN(parseInt(ref))` to find a backlog row.

  ADR-006 §2; ADR-002 §2; 08/ADR-003; 43/ADR-010 R4.1.

  Scenario: the default list excludes archived rows and carries the backlog, and the parameter includes the archive
    Given the board face over a stream with milestone `43` (four stories), gate `44`, a backlog `[{ type: "milestone", slug: "search-the-fleet", group: "" }, { type: "chore", slug: "prune-logs", group: "ops/later" }]` and an archived `[{ type: "milestone", number: "12", slug: "theta", status: "done", stories: [{ number: "00", slug: "theta-one", status: "done" }] }, { type: "uat", number: "13", slug: "accept-theta", status: "done" }]`
    When `GET /api/work/list` is requested
    Then the status is 200, the envelope's keys are exactly `items, stalenessSeconds, nodeId`, and `items` holds `43, 43/03, 43/04, 43/05, 43/06, 44, search-the-fleet, prune-logs` in that order and NO row whose `ref` is `12`, `12/00` or `13`
    And the row for `search-the-fleet` is `{ ref: "search-the-fleet", type: "milestone", slug: "search-the-fleet", status: null, title: …, parent: null, dir: <…/backlog/milestone_search-the-fleet>, number: null, backlog: "" }` plus the answering-side stamp, and `prune-logs` carries `backlog: "ops/later"`
    And every row for `43`, its stories and `44` carries exactly the frozen seven keys plus the stamp — `board-face-contract`'s `assertFrozenShape` holds over them unchanged
    When `GET /api/work/list?includeArchived=1` is requested
    Then `items` holds the same eight rows followed by `12`, `12/00` and `13`, each carrying `archived: true` and `status: "done"`, `12/00` with `parent: "12"`, and the envelope's keys are still exactly `items, stalenessSeconds, nodeId`

  Scenario Outline: the parameter is a boolean flag read once, and any other value is the absent state
    Given the same stream
    When `GET /api/work/list<query>` is requested
    Then `items` <archived>

    Examples: the values the route reads, and the ones it does not
      | query                    | archived                           |
      |                          | holds no `archived: true` row      |
      | ?includeArchived=1       | holds `12`, `12/00` and `13`        |
      | ?includeArchived=true    | holds `12`, `12/00` and `13`        |
      | ?includeArchived=0       | holds no `archived: true` row      |
      | ?includeArchived=        | holds no `archived: true` row      |
      | ?includeArchived=yes     | holds no `archived: true` row      |
      | ?all=1                   | holds no `archived: true` row      |

  Scenario: the face threads the flag and adds no predicate of its own
    Given the delivered `src/board-ui.mjs`
    When its source is read over a comment-stripped sweep
    Then the list route invokes `work:list` with `mesh: true` and, under the parameter, `all: true` — and the module contains no `.archived`, no `.filter(` over the list rows, no `listItems` / `listStream` import, and its only operation-bearing import is still `./command-core.mjs`
    And `test/arch/work/acd-intake-write-side-only.test.mjs` (FF-12704) is green — the face contains the token `intake` zero times
    And `aof work list --json` from the fixture root emits the frozen array unchanged by the route's parameter — no `includeArchived` is spelled anywhere in `src/commands/list.mjs`

  Scenario: the UI client composes the URL from a boolean and the row type carries the three optional keys
    Given the delivered `ui/src/board/api.ts`
    When `workApi.list({ includeArchived: true })`, `workApi.list({ includeArchived: false })` and `workApi.list()` run against the mounted harness's instrumented fetch
    Then the recorded URLs are `/api/work/list?includeArchived=1`, `/api/work/list` and `/api/work/list` respectively — the off state carries no query string
    And the `WorkItem` type declares `number?: null`, `backlog?: string` and `archived?: true` beside the frozen seven and the existing optional keys, and `tsc -b` in `ui/` (the build's own type pass) is clean
