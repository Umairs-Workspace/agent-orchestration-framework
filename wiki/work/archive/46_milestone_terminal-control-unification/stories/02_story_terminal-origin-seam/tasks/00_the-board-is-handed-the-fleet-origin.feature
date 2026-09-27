<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 46/02, the LAUNCH-SEAM half: the fleet process already
# LAUNCHES the board, so the fleet's own bound origin rides that existing call down
# to the board and comes back out as a served fact the board page can read.
#
# THE SEAM, read at source and unchanged by this task except for one additive
# option: `serveMeshUi` knows its own bound origin (`mesh-ui-serve.mjs:766-767`); it
# launches the board in `boardUrlForWorkspace` (`:777-794`) via
# `serveBoard({ projectDir, port: 0, repoRoot, recordSessions: false })` (`:781-786`),
# memoised per `workspaceId` and closed with the fleet (`:789`, `:796-811`);
# `serveBoard` (`board-serve.mjs:48`) passes on to `serveSetupUi` (`:63`), which is
# the one `http.createServer` that already answers `/api/config` (`setup-ui.mjs:43`)
# and `/api/capabilities` (`:62`) — the established shape for serving a fact to the
# page.
#
# THE ROUTE'S PATH IS DELIBERATELY NOT FIXED BY THIS FEATURE. ADR-004 requires "a
# named board route beside the others"; naming it is the build's, and it is named in
# exactly ONE place. Every Then below reads a VALUE off that route's real response;
# not one reads its path. What IS fixed here, because ADR-004 fixes it, is the body:
# `{ fleetOrigin, source }`, where `source` is `"launcher"` or `"default"` — "the
# payload names its own provenance … because the failure mode of a wrong origin is a
# pane that never streams and never says why".
#
# LITMUS: every Then is a value read off a real HTTP response from a REAL
# `serveMeshUi` / `serveBoard` on ephemeral ports — this repo's established idiom
# (`test/mesh-ui-serve.test.mjs:298`, `test/board-serve.test.mjs:185`), never a mock
# of either server. No scenario below reads a source file or imports a production
# module to inspect it.
#
# NOT ASSERTED HERE — three deliberate delegations, so no fact is claimed twice:
#  - "no port literal on a terminal surface" and "the URL builder reads no `window`"
#    are STRUCTURAL claims over `ui/src`, owned by the new
#    `test/arch/acd-terminal-origin-not-port.test.mjs` that story 46/03 writes
#    (ARCHITECTURE §Fitness functions, expected RED until the extraction lands). A
#    server that served a perfect origin to a page still holding `FLEET_PORT = 4181`
#    would pass every scenario below and still fail that gate. That is the correct
#    division of labour, not a gap.
#  - "`src/board-serve.mjs` and `src/setup-ui.mjs` MUST NOT import
#    `src/mesh-ui-serve.mjs`" (ADR-004's cycle prohibition) is likewise structural.
#    Its observable consequence is task 01's; the structural half has NO gate today —
#    checked at source: `acd-command-layer-imports-downward` covers only
#    `commands/` ↔ `src/*.mjs` edges, and `acd-work-ui-no-core-import`'s setup-ui
#    clause (`:129-146`) covers only work-core/`commands/` imports. QA has routed a
#    new-or-extended gate as a finding rather than smuggling it in as a Then.
#  - the frozen `/api/work*` surface's own non-regression is
#    `test/work-ui-board-serves-unchanged.test.mjs` (`:86`)'s job; one Then below only
#    spot-checks that the additive route did not re-route it.
#
# OUT OF SCOPE, AND BOTH BELONG TO MILESTONE 49 (spike 44 §Outcome, STORY.md §Not in
# scope): the additive board-origin field on `GET /api/mesh/board-url`'s JSON body,
# and copying `assign`'s `workspace-not-local` guard onto that route — that guard is at
# `mesh-ui-serve.mjs:439-440` at HEAD, not the `:423` ADR-004 and spike 44 both cite
# (the file has moved under them; recorded so 49 does not chase a comment line).
# This story serves the FLEET origin TO the board; 49 serves the BOARD origin TO the
# fleet. No scenario below adds a key to that body — and one Then re-asserts its exact
# key shape so 49's field stays additive.
#   A STALE FORECAST, named so it is not read as a contradiction: m45/04's
#   `00_servers-advertise-paths.feature:187` says "no key named `origin` is present —
#   46 adds it". The current authority reassigns that field to 49, so that Then stays
#   green under this story, unchanged and for a better reason.
#
# THE FOUR GATES THIS SHAPE MUST NOT DISTURB, each checked at source:
#  - `test/arch/acd-mesh-ui-write-isolation.test.mjs` greps `mesh-ui-serve.mjs` for
#    fs-write and shell-out CALL FORMS, for at most one write route, and for the
#    absence of a `"/ws/terminal"` literal (`:131`). An additive OPTION KEY inside the
#    existing `serveBoard({ … })` call at `:781-786` matches none of those detectors.
#  - `test/mesh-ui-read-only-contract.test.mjs` rows 03/04 assert that every `/api`
#    request the fleet CLIENT puts on the wire is a GET of `/api/mesh/status`
#    (`:174-177`, `:204-207`). This story adds NO fleet route and no fleet request, so
#    nothing there moves. The new route is on the BOARD's origin.
#  - `test/arch/acd-board-single-server.test.mjs` pins exactly one
#    `http.createServer` and that neither `board-ui.mjs` nor `setup-ui.mjs` declares an
#    HTTP route under `/ws/`. A new `/api/` GET on `setup-ui.mjs` matches neither —
#    `/api/config` and `/api/capabilities` already coexist with that gate, green.
#  - `test/arch/acd-work-ui-no-core-import.test.mjs:129-146` forbids `setup-ui.mjs`
#    importing `./commands/*`, `./work.mjs`, `./feature-parse.mjs` or
#    `./command-core.mjs`. Already green, and a SECOND independent reason the
#    standalone default cannot be resolved inside the board server (task 01).
#
# THE PORT TRAP, and it constrains every row: no scenario may bind a fixed port. This
# machine's live daemons hold `:4181` (fleet UI) and `:4182` (control serve), so a row
# that started a fleet on the documented default would EADDRINUSE against the
# operator's own soak. Every server below binds `port: 0`; an "explicit non-default
# port" is one the lane obtained by binding `:0`, reading `address().port` and
# releasing it.
#
# ISOLATION: `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED, never
# the full suite (`test/global-work-propagation.test.mjs` binds `:4182`, which the live
# daemon holds). These suites export a test ARRAY consumed by `scripts/test.mjs`, so a
# focused run is a small driver importing that array.

@executable @cli @work @board
Feature: a board the fleet launched is told that fleet's real bound origin, and serves it back as a read-only fact
  In order that a mirror pane opened from a board reaches a fleet running on whatever port was free — instead of a browser constant deciding whether the socket connects
  the fleet must hand the origin it actually bound down the launch seam it already owns, and the board must serve it as a GET whose value is the running fleet's origin, stable across requests and reused with the memoised per-workspace board

  Background:
    Given an isolated global mesh store (a fresh AOF_GLOBAL_HOME) holding one published workspace whose work stream contains milestone "34"
    And a repo root with a built `ui/dist`, so neither server refuses with `ui-build-missing`
    And every server started below binds an ephemeral port (`port: 0`), never a fixed one
    And "the board's fleet-origin fact" means the JSON body of the one named GET route the board serves on its OWN origin, whose shape ADR-004 fixes as `{ fleetOrigin, source }`

  # HEADLINE. The value is read off the running fleet, not off a constant — so the row
  # that matters is the one where the fleet is somewhere a constant could never guess.
  Scenario Outline: the board a fleet launched is handed THAT fleet's bound origin, and serves it back
    Given a fleet server started on <the fleet is started on>
    When I `GET /api/mesh/board-url?workspaceId=<the workspace>&ref=34` and then read the board's fleet-origin fact from the origin that response returned
    Then `fleetOrigin` is exactly `http://127.0.0.1:` followed by the port that fleet's own `server.address().port` reports
    And `fleetOrigin` is byte-identical to `new URL(fleetUrl).origin` computed from the very `fleetUrl` `serveMeshUi` returned — the same origin obtained two independent ways
    And `fleetOrigin` equals `new URL(fleetOrigin).origin`, so it is an origin and not a URL that merely starts with one
    And `source` is "launcher" — the board was told, and the payload says so rather than leaving a reader to assume it
    And `fleetOrigin`'s port is NOT the board's own port — the board and the fleet are on different ports here, so a same-origin guess could not have produced this value
    And `fleetOrigin`'s port is not 4181 — a hard-coded default could not have produced it either

    Examples:
      | case                                  | the fleet is started on                                   |
      | the lane's own idiom                  | an ephemeral port (`port: 0`)                             |
      | an explicit, non-default port         | a free port the lane reserved by binding `:0` and released |
    # The `≠ 4181` Then holds on row 1 by construction, not by luck, and it is worth
    # stating why: every OS this repo runs on allocates ephemeral ports well above 4181
    # (Windows 49152–65535, Linux 32768–60999). Row 2 makes it deterministic anyway.
    # NOT restated here: that the value is a well-formed origin in general — task 01
    # owns that table. The Then above is the STRONGER claim for this task's subject:
    # equality with the fleet's own bound origin.

  # The anti-constant proof, and the one row an Outline cannot carry: two fleets alive
  # at once. A constant, an environment variable, a module-level singleton or a
  # same-origin fallback each fail this scenario and pass everything else.
  Scenario: two fleets running at the same time each hand their OWN board their OWN origin
    Given two fleet servers started on two different ephemeral ports over the same fixture workspace
    When each fleet is asked for that workspace's board URL, and each returned board is asked for its fleet-origin fact
    Then the two `fleetOrigin` values are different from each other
    And each equals its own fleet's `http://127.0.0.1:<that fleet's bound port>` and neither equals the other fleet's
    And neither equals its own board's origin, and neither is `http://127.0.0.1:4181`
    And both facts carry `source` "launcher"
    # Each fleet keeps its OWN memoised `boardServers` Map (`mesh-ui-serve.mjs:204`),
    # so this legitimately stands up two boards for one workspace — one per launcher.
    # That is the point: the fact is a property of the launcher, not of the workspace.

  # ADR-004: "Nothing on the fleet face becomes a mutation." Stated as behaviour: the
  # fact is a read, and reading it moves nothing on disk.
  Scenario: reading the fleet-origin fact is a read — it answers on a GET and changes not one byte
    Given a board launched by a fleet, and a byte-level snapshot of the workspace fixture taken before any request
    When I `GET` the board's fleet-origin route ten times
    Then every response is 200 with a JSON content type and a body carrying exactly the keys `fleetOrigin` and `source`
    And all ten bodies are byte-identical to each other — a fact, not a value that drifts per request
    And a fresh snapshot of the workspace fixture is unchanged: no file added, removed or rewritten
    And the board's frozen `/api/work/list` still answers 200 with its `{ items, stalenessSeconds, nodeId }` envelope — the new route is additive, never a re-route
    And the FLEET origin answers 404 for that same route path — the fact lives on the board's origin only, and the fleet face gained nothing

  # The refusals, pinned against their own siblings rather than against a number I
  # chose. `setup-ui.mjs` gates `/api/config` (`:43`) and `/api/capabilities` (`:62`)
  # on `request.method === "GET"`; anything else falls through to the `/api/` 404
  # (`:135-138`). So the house shape for a non-GET on a GET-only board route is a 404
  # `not-found`, NOT a 405 — and the sibling-equality Then is the half that cannot
  # drift: if the build ever gives these routes a 405, this route moves with them.
  Scenario Outline: every non-GET method answers exactly what a GET-only sibling on the same server answers, and writes nothing
    Given a board launched by a fleet, and a byte-level snapshot of the workspace fixture taken first
    When I issue <method> against the board's fleet-origin route
    Then the response status is <status>
    And the response status and the envelope's `code` are byte-identical to what `GET`-only sibling `/api/capabilities` answers for that SAME method on that SAME server
    And no response body claims success — no `ok: true`, and no `fleetOrigin` is handed out on a write method
    And a fresh snapshot of the workspace fixture is unchanged after all of them
    And a following `GET` of the route still answers 200 with the fact — the server survived every rejected method

    Examples:
      | case                | method | status              |
      | a create attempt    | POST   | 404 · `not-found`   |
      | a replace attempt   | PUT    | 404 · `not-found`   |
      | a partial update    | PATCH  | 404 · `not-found`   |
      | a delete attempt    | DELETE | 404 · `not-found`   |
      | a HEAD probe        | HEAD   | 404                 |
    # The HEAD row asserts STATUS only: HTTP forbids a body on a HEAD response and Node
    # strips it, so there is no `code` to compare. It is here because a route added with
    # `request.method === "GET"` refuses HEAD too, and that is a real, deliberate
    # difference from the fleet's `/api/mesh/board-url`, which allows GET and HEAD
    # (`mesh-ui-serve.mjs:295-297`). Two servers, two house shapes; this route follows
    # the one it lives on.

  # The memoised launch is load-bearing and pre-existing (`mesh-ui-serve.mjs:779-790`,
  # already pinned at `test/mesh-ui-serve.test.mjs:326-329`). Threading an option
  # through that function is exactly the change that can turn a cache hit into a
  # second launch — so the reuse and the fact are asserted together.
  Scenario: a second drill-in for the same workspace reuses the one board, and the origin it reports does not move
    Given a fleet server running with that published workspace in its projection
    When I `GET /api/mesh/board-url?workspaceId=<the workspace>&ref=34` twice, reading the board's fleet-origin fact after each
    Then the second response's `url` is byte-identical to the first's — the memoised per-workspace board was reused, not relaunched per click
    And both reads answer from the same board port, and `GET /api/work/list` there serves that workspace's own stream (the item "34" is in it) both times
    And both fleet-origin facts are byte-identical — same `fleetOrigin`, same `source`
    And the `/api/mesh/board-url` body's own keys are still exactly `url`, `workspaceId`, `ref`, with no `origin` key — that field is milestone 49's and this story neither pre-empts it nor makes room for it by moving anything else
    And closing the fleet closes that board with it, as it did before — the memoised entry is not leaked by the added option

  # One fleet, two workspaces: the origin is a property of the FLEET, and the boards
  # are genuinely distinct servers. A per-board or per-workspace derivation passes the
  # single-workspace rows above and fails here.
  Scenario: two workspaces get two boards on two ports, and both are handed the SAME one fleet origin
    Given a fleet server running with TWO published workspaces in its projection
    When I ask that one fleet for each workspace's board URL, and read each board's fleet-origin fact
    Then the two board origins are different from each other — two real board servers, not one reused across workspaces
    And each board's `/api/work/list` serves its OWN workspace's stream, not the other's
    And both boards report the identical `fleetOrigin`, equal to that one fleet's own bound origin
    And both report `source` "launcher"
    # FEASIBILITY: the fixture publishes a second workspace snapshot into the same
    # isolated store — the `makeRepo` + `publishWorkspaceSnapshot` pair at
    # `test/mesh-ui-serve.test.mjs:34-72`, run twice. No new mechanism, no second store.

  # THE NEGATIVE BOUNDARY, and it is not hypothetical: `serveBoard` has two production
  # callers (`mesh-ui-serve.mjs:781`, `commands/work-ui.mjs:35`) and at least six test
  # suites that call it directly with no fleet in sight (`test/board-serve.test.mjs:185`,
  # `test/static-serve-fallback.test.mjs:130`, `test/advertised-paths.test.mjs:489`,
  # `test/work-ui-board-serves-unchanged.test.mjs:86`, …). Every one of them is a board
  # nobody handed an origin to, and the route must still answer honestly — a page that
  # reads `undefined` builds `ws://undefined/ws/terminal-view` and fails far from its
  # cause.
  Scenario: a board nobody handed an origin to still answers the route, and says plainly that it has none
    Given a board started directly with no fleet-origin supplied at all — the shape every existing `serveBoard` suite uses
    When I read its fleet-origin fact
    Then the response is 200, not a 404 and not a 500 — the route exists on every board, or a reader cannot tell "no fleet configured" from "old build"
    And the body still carries the key `fleetOrigin`, present and never absent
    And `fleetOrigin` is explicitly `null` — never `undefined`, never the STRING "undefined", never an empty string, never a bare port, and never a fabricated `http://127.0.0.1:4181` invented by the board server
    And `source` is not "launcher" — nothing launched this board, and the payload must not claim it did
    And the board's page and its `/api/work/*` routes serve exactly as they do today — a board with no fleet origin is a working board
    # A QA RULING FLAGGED FOR THE ARCHITECT, not decided here. ADR-004 freezes
    # `source` at the pair `"launcher" | "default"`, and neither is honest for this row:
    # the board was not told, and it did not resolve either — the command layer that
    # owns the default was never in the picture. The Then above therefore pins only what
    # is safe and load-bearing (the key is present; the value is `null`, not a guess;
    # `source` is not "launcher") and leaves the third value — `source: null`, or a
    # named third — to a superseding word from the architect. QA has routed this as a
    # design-gap finding; it must not be settled by whichever value the build types
    # first.
