<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 47/01, ADR-006(a): THE ONE RESOLVER. Every board destination
# the fleet produces is MINTED AT CLICK TIME by `GET /api/mesh/board-url`, for the
# CARD'S OWN workspace, and the operator lands on the board's real origin — the one
# that can actually serve `/api/work`. This task varies WHICH CARD is clicked and WHAT
# THE RESOLVER ANSWERS; it never touches the boards region, whose deletion is task 01.
#
# THE DEFECT THIS CLOSES — m45/STATE **F-45-04-1(a)**, routed to this milestone
# 2026-08-07. `Fleet.tsx:1427`'s local-board drill-in is `href="/board"`, RELATIVE. On
# the fleet origin that resolves to the FLEET's own server, which deliberately 404s
# `/api/work` (`mesh-ui-serve.mjs:583-586`, m25/ADR-003's disjoint-face rule) — the
# board page loads and cannot load its stream. A board server is PER-WORKSPACE and on
# an EPHEMERAL port that `boardUrlForWorkspace` (`mesh-ui-serve.mjs:820-838`) launches
# on demand and memoises, so a literal address is not merely stale: it is wrong by
# construction, on every machine, for every workspace but at most one.
#
# LITMUS: every Then is confirmable by an outsider without reading source. There are
# exactly THREE channels used below and each is already built:
#   (1) THE APP'S OWN TRAFFIC — `driver.requestsMatching(<fragment>)` in
#       `test/support/react-app-harness.mjs`, which records every request the mounted
#       production surface actually put on the wire, in order, with its URL. "Nothing
#       resolves until the click" and "the request carries the CARD's workspaceId" are
#       counts and query parameters read off that log, never off a source file.
#   (2) THE RENDERED TREE — `findAll` / `textOf` over the tree the REAL `<Fleet/>`
#       produced (`test/support/fleet-app-harness.mjs`, `mini-react.mjs`), which is how
#       `Open board →` / `Opening board...` / `Open failed` are read. m38/STATE
#       F-38.06e is why this is the instrument and a helper test is not: *"a state
#       satisfied by calling the reducer directly proved nothing, because production
#       could never drive it."*
#   (3) REAL HTTP, from the lane itself — a plain `fetch` of an origin the app just
#       navigated to. This is what makes scenario 3's closure of F-45-04-1(a) a
#       MEASUREMENT rather than a restatement: the resolved origin answers
#       `/api/work/list` with 200, and the fleet origin answers the same path with a
#       coded 404. That pair IS the defect and its fix.
#
# NOT ASSERTED HERE — three PLACEMENT invariants, all owned by the fitness function
# `test/arch/acd-fleet-board-link-resolved.test.mjs` (already written and registered;
# RED on arrival, `Fleet.tsx:1427` is the violation it names):
#   (a) no hard-coded board ADDRESS anywhere in `ui/src/fleet/` — in any of its three
#       forms (a relative `href="/board"`, an absolute origin literal carrying the
#       board path, the retired `?mode=board` selector);
#   (b) `ui/src/fleet/api.ts` declares `boardUrl` over the ONE route;
#   (c) `Fleet.tsx` calls `fleetApi.boardUrl(...)`.
# A Then reading "the source contains no relative href" is a fitness function, not a
# scenario, and it belongs there. What this feature asserts is the half that gate
# CANNOT see: an address composed at RUNTIME leaves no literal in source, and no
# static rule can tell whether the request carried the RIGHT workspace id or whether
# the operator actually landed somewhere that works.
#
# ALSO NOT ASSERTED HERE:
#   - the resolver ROUTE's own contract — its 200 body shape, its four refusals
#     (`invalid-workspace` / `workspace-not-found` / `method-not-allowed` / a failed
#     launch), its memoisation and its m46/ADR-004 fleet-origin hand-off. All are
#     already pinned by `test/advertised-paths.test.mjs` and
#     `test/board-fleet-origin-seam.test.mjs`. Below, the route is the SYSTEM UNDER
#     TEST'S COLLABORATOR, driven for real; its refusals are inputs here, not claims.
#   - anything about the boards region, `BoardsRegion`, `BoardTile` or `BoardDrillIn`.
#     Task 01 deletes them, and the sweep proving no board href survives ANYWHERE on
#     the surface lives there, because that is the change that makes it true.
#
# SEQUENCING — WHY THE SWEEP IS IN TASK 01 AND NOT HERE, stated so the ordering is
# part of the contract rather than a note in a story. m45/STATE is explicit: *"fixing
# (b) without (a) ships a visible broken link; fix them together or sequence (a)
# first."* ADR-006 answers it by construction: (b)'s ruling REMOVES the link, and (a)'s
# invariant outlives the region it was found in. The two tasks therefore LOCK EACH
# OTHER, and the lock is visible in the files: this task's scenarios must be GREEN
# BEFORE task 01's deletion lands (so the surviving door demonstrably works before the
# other door is removed), and task 01's scenario 3 re-checks them AT the deletion. A
# tree in which task 01 is delivered and this feature is red is a tree with no working
# way into a board — which is the failure the sequencing rule exists to prevent.
#
# WHAT THIS SUPERSEDES. `test/fleet-scope.test.mjs`'s `fleet-scope/02 global milestone
# cards remain clickable drill-ins` asserts the drill-in by REGEX OVER `Fleet.tsx`'s
# own text (`/fleetApi\.boardUrl\(m\.item\.workspaceId, m\.item\.ref\)/`,
# `/window\.location\.assign\(url\)/`). That is a source read wearing a behavioural
# suite's clothes: it would stay green for a build that called the resolver with the
# WRONG workspace id, that navigated to a url it never received, or that resolved on
# every render. This feature is its runtime replacement; the grep lane is retired or
# reduced to what the arch test does not already own, in the same change.
#
# FEASIBILITY — checked at source 2026-08-10, at `d71d508`. Three notes, one of which
# is a real prerequisite:
#   1. THE FIXTURE EXISTS. `test/support/mesh-ui-assign-fixture.mjs`'s
#      `withTwoWorkspaceAssignFixture` stands up a REAL `serveMeshUi` face over an
#      isolated global projection holding FOUR published workspaces — A ("control")
#      and B ("portal") BOTH carrying milestone ref "18" under different titles (the
#      2026-07-24 soak's own collision), plus `Gone`, whose projection row survives a
#      checkout that has been deleted. It yields `{ url, workspaceIdA, workspaceIdB,
#      workspaceIdGone, titles }`, and `withFleetApp({ url })` mounts the REAL
#      `<Fleet/>` against it. Every row of scenarios 2 and 5 is producible from that
#      one fixture without painting a payload.
#   2. A REAL BOARD SERVER IS LAUNCHED by a successful resolve — that is the point of
#      the route. The lane must supply a dist the BOARD server accepts (the shape
#      `test/board-fleet-origin-seam.test.mjs`'s `writeDist` writes) and must let the
#      fleet close its board servers on teardown. It binds port 0 only: this suite may
#      never touch :4181 or :4182, which the operator's live daemons hold.
#   3. PREREQUISITE, and the ONE thing that does not exist yet: the harness's
#      `location.assign` is a NO-OP STUB that records nothing
#      (`react-app-harness.mjs:311`). "The operator lands on X" is therefore
#      unobservable today. It needs ONE additive accessor on the shared harness — the
#      stub records its argument and the driver exposes `navigations()` — in the same
#      family as `requestsMatching`. That is a test-support change, not a production
#      one, and it is the only way scenarios 3, 4 and 5's navigation clauses can be
#      confirmed at all. Without it those clauses are unverifiable and the task should
#      come back here rather than be quietly downgraded to a source read.

@ui @work @board @distribution @bug @finding-F-45-04-1
Feature: the fleet's board drill-in resolves its destination through the one route that knows where a board actually is
  In order that "Open board →" lands the operator on a board that can load its own stream, on whichever machine and whichever workspace that board belongs to — instead of on a page that renders and then sits empty
  every board destination the fleet produces must be minted at click time by `GET /api/mesh/board-url`, for that card's own workspace and ref, and a resolver that refuses must leave the operator on the fleet with a stated reason rather than on a dead address

  Background:
    Given a REAL `mesh ui` fleet face over an isolated global projection (a fresh AOF_GLOBAL_HOME) holding two published workspaces that BOTH carry milestone ref "18" under different titles
    And the REAL `<Fleet/>` mounted headlessly against that face, addressed the way an operator does — by the milestone title on the card
    And every Then below is read from the app's own request log, its rendered tree, or a real HTTP call the lane makes itself — never from a source file

  # HEADLINE 1, and it is a product fact rather than a performance note: resolving a
  # board LAUNCHES one. `boardUrlForWorkspace` starts a real per-workspace server on
  # first ask and memoises it, so a surface that resolved at render time would start a
  # board server for every card on the page, again on every poll, for boards nobody
  # asked to open. The address must not exist until the operator asks for it — which
  # is also precisely why it cannot be an `href`.
  @executable
  Scenario Outline: no board address is minted until the operator asks for one
    Given the fleet is mounted and showing its milestone cards
    When <activity>
    Then the app has issued ZERO requests to `/api/mesh/board-url`
    And no board server has been launched by this page
    And every card still renders its drill-in at rest, reading "Open board →"

    Examples:
      | case                                                             | activity                                                       |
      | the first load, before any interaction                           | the page settles after its first `/api/mesh/status`            |
      | the poll — the steady state, and the one that would repeat       | the clock advances by one poll interval and a silent re-poll lands |
      | the manual ⟳ refresh                                             | the operator clicks the refresh control                        |
      | a scope switch, which re-queries under the new scope             | the operator switches the scope control to Local and back      |
      | the extra silent load a successful assign fires                  | the operator assigns a card to a worker node                   |
      | hovering / focusing the card, which is where an `href` would show | the drill-in is focused without being activated                |
    # THE LAST ROW is the honest statement of the difference between the two designs.
    # An anchor advertises its destination on hover, in the status bar, and to "copy
    # link address" — so an `href` cannot be resolved lazily even in principle. The
    # trade this ADR makes is a real one and it is worth naming: the destination is
    # not previewable, and in exchange it is correct.

  # HEADLINE 2 — WHOSE BOARD. The fleet is a GLOBAL face: it lists items from every
  # workspace on the machine, and two workspaces can carry the same ref. BLOCKER F21
  # is the measured proof that this is not theoretical — the same surface once
  # dispatched work to an entirely different milestone off a `200 ok` because a ref
  # was resolved against the daemon's own workspace. A single-workspace fixture makes
  # the right answer and the wrong answer the same value, so every row here runs in
  # the two-workspace collision.
  @executable
  Scenario Outline: the click asks the one resolver for the CARD's own workspace and the CARD's own ref
    Given both workspaces have published a milestone with ref "18", under different titles
    When the operator clicks the drill-in on the card titled <title>
    Then EXACTLY ONE request has been issued to `/api/mesh/board-url`
    And its `workspaceId` parameter is <workspace> — the workspace that card belongs to, never the daemon's own
    And its `ref` parameter is <ref>
    And the app has issued NO request to any `/api/work` path — the fleet links to a board, it never fetches one (m25/ADR-003)
    And the app has issued no second `/api/mesh/status` load on account of the click

    Examples:
      | case                                                                 | title                             | workspace | ref  |
      | the DAEMON's own workspace — the value a broken build would guess    | "Per-folder integration descriptor" | A         | "18" |
      | a FOREIGN workspace carrying the SAME ref — F21's exact shape        | "Homedata Live Property Data"       | B         | "18" |
      | a foreign workspace carrying a ref only IT has — the control row     | "Portal Only"                       | B         | "44" |
      | the daemon's own workspace carrying a ref only IT has                | "Control Only"                      | A         | "31" |
    # ROWS 3 AND 4 ARE NOT PADDING. Rows 1 and 2 alone would pass a build that read
    # the workspace id off the CARD but the ref off the wrong place, because both
    # cards carry ref "18". The two non-colliding rows are what make the ref half of
    # the claim non-vacuous, and together the four rows cross both workspaces with
    # both a colliding and a unique ref.

  # HEADLINE 3 — THE DEFECT, CLOSED, AND MEASURED FROM BOTH SIDES. This is the whole
  # of F-45-04-1(a): the old address resolved to an origin that answers 404 for the
  # board's own API; the new one resolves to an origin that answers 200. Asserting
  # only "the href changed" would prove nothing about whether the destination works,
  # which is the entire complaint.
  @executable
  Scenario: the operator lands on the board's own origin — the one that can serve the board's stream
    Given the fleet is mounted against its face at a known origin
    When the operator clicks a milestone card's drill-in and the resolver answers
    Then the app performed EXACTLY ONE navigation
    And the address it navigated to is ABSOLUTE — it parses with `new URL(...)` on its own, with a scheme, a host and a port
    And its origin is NOT the fleet's own origin
    And its origin is byte-identical to the `url` the same `GET /api/mesh/board-url?workspaceId=&ref=` answers when the lane calls it directly — one resolver, one answer, no client-side composition
    And its pathname is the board path the board server advertises for itself
    And its fragment is the clicked card's ref, so the board opens ON that item
    And a real GET of `<that origin>/api/work/list` answers 200 with the board's own work stream
    And a real GET of `/api/work/list` on the FLEET's origin answers 404 with code "not-found" — which is what the old relative `/board` resolved to, and why the board page used to render and then sit empty

  # The in-flight state, read off the REAL tree between the click and the response.
  # It matters twice: an operator who clicks and sees nothing clicks again, and a
  # non-silent state change here would unmount the populated page (`load({silent})`'s
  # keep-last-good idiom, Fleet.tsx:127-145). The response is HELD rather than raced —
  # a loopback resolve is faster than any assertion.
  @executable
  Scenario: while the resolver is in flight the card says so, and the rest of the page does not move
    Given the operator clicks a milestone card's drill-in
    And the resolver's response is held before it reaches the app
    When the tree is read between the click and the response
    Then that card's drill-in reads "Opening board..." and no longer offers "Open board →"
    And no navigation has happened yet
    And every OTHER card still reads "Open board →" — the in-flight state is the clicked card's, not the page's
    And the page is still in its populated state: the regions, the top bar and the scope control are all still mounted
    When the held response is released
    Then the app performs its one navigation
    And the drill-in is not left reading "Opening board..."

  # HEADLINE 4 — A REFUSAL IS AN ANSWER, and the operator must stay somewhere they can
  # act. The rows are the refusals a real fleet actually produces, plus the one a
  # stale payload produces; each is named with how it is caused, because a refusal
  # nobody can reproduce is a row nobody can trust.
  @executable
  Scenario Outline: the resolver refuses, the fleet says so on the card, and nothing navigates
    Given <cause>
    When the operator clicks that card's drill-in
    Then the app performed NO navigation — the operator is still on the fleet
    And that card's drill-in states the failure in its own words — "Open failed" — whatever else the element's DG-47-5 treatment renders alongside them
    # THE WORDS ARE PINNED, THE FULL TEXT IS NOT — amended at build (PO, 2026-08-11) for a
    # cross-story collision this feature could not have known about. It read `reads
    # "Open failed"`, and an exact-equality lane over that broke the moment 47/04 landed
    # DG-47-5, whose clause 2 rules that **the pinned `→` SURVIVES the failed state** — so
    # the element now reads `Open failed →`. That is not a regression; it is the design gap
    # this milestone opened to close, and its whole point is that dropping the arrow left
    # the abbreviated failed state rendering NOTHING AT ALL.
    #
    # This story's claim was always about the WORDS — that a refusal is stated on the card
    # rather than swallowed — and clause 1's ladder means the words are the part that gets
    # dropped at the abbreviation threshold while the glyph is the part that survives. So
    # the Then is re-expressed as containment, and the arrow's presence in every state is
    # asserted where it belongs: `47/04 tasks/01`, which owns that ladder.
    And the card is still mounted with the rest of its content: its ref, its title, its progress and its assign affordance
    And no other card's drill-in has changed — one card's failure is not the page's
    And the page did NOT flip to its whole-page error state, and no region was unmounted
    And clicking the same drill-in again issues a FRESH request to `/api/mesh/board-url` — the failure is recoverable without a reload

    Examples:
      | case                                                                      | cause                                                                                                          | the route's answer            |
      | the workspace left the projection between the poll and the click          | the workspace's row is removed from the global projection after the page loaded                                | 404 `workspace-not-found`     |
      | a checkout that no longer exists on this machine — the projection row is here but the checkout is not | the card of the workspace whose projection row survives a deleted checkout (the fixture's `Gone` workspace) | 409 `workspace-not-local` |
      | a payload row carrying a blank workspace id — a stale or hand-built wire   | the face answers a status payload whose item row carries an empty `workspaceId`                                | 400 `invalid-workspace`       |
      | the face stops answering mid-click                                        | the fleet face is stopped while the resolve is in flight                                                       | no response at all            |
    # ROW 2 IS THE ONE AN OPERATOR ACTUALLY MEETS, and it is the reason this scenario
    # exists at all rather than being folded into scenario 3. The global projection is
    # MACHINE-WIDE and cross-machine: it carries rows for workspaces published by
    # OTHER nodes, whose `projectRoot` names a path this machine has never had. Every
    # such card renders a drill-in, and none of them can ever open. What the operator
    # is owed there is a stated failure, not a spinner that never resolves and not a
    # blank board. Whether "Open failed" is the RIGHT statement for that case is a
    # design question, and it is the subject of the `@uat` scenario below.
    #
    # ROW 2's ANSWER CELL AMENDED AT BUILD (PO, 2026-08-11) under ADR-011, and the row
    # is now backed by a measurement rather than an expectation. It contracted
    # `5xx board-url-failed` and claimed "the board cannot start". Both were false of
    # this tree, reproduced independently by the developer and then by the architect
    # over this same `Gone` fixture: the route answers **200**, the board **starts**,
    # serves 137 bytes of its own HTML and answers `/api/work/list` with `{"items":[]}`.
    # So the operator lands on a board that renders and shows an empty stream —
    # INDISTINGUISHABLE from "this repo has no work". That is F-45-04-1(a)'s defect
    # class arriving from a second direction, i.e. the class this very story exists to
    # close, and it degrades worse than the defect the assign route already fixed: that
    # one was a WRONG REFUSAL, which reports itself; this is a WRONG SUCCESS, which does
    # not. It also strands a bound, memoised board server per un-openable card for the
    # fleet's lifetime.
    #
    # The house had already answered this question thirty lines away and has since m38:
    # the assign route's reachability caveat (`src/mesh-ui-serve.mjs:454-462`) probes the
    # SAME field on the SAME row from the SAME `queryGlobalMeshStatus` call, and refuses
    # `409 workspace-not-local` with the comment "A refusal must name its own cause".
    # Two sibling routes, one face, one row, one question — and only one consulted the
    # answer. So the row STANDS and the fix ships: the resolver refuses, reusing the
    # existing code rather than minting a second one. ADR-011 clause 4 makes the `src/`
    # licence narrow, named and exhausted; ADR-002's invariant permits it because that
    # invariant's subject is THE FILTER, and this is not the filter.
    #
    # ROW 4 IS NOT A ROUTE REFUSAL — it is a rejected promise, and it takes a
    # different code path in the client (`fetch` throws rather than answering
    # `!response.ok`). A build that only handled `!ok` would pass rows 1–3 and leave
    # the card stuck reading "Opening board..." forever on row 4.

  # THE HUMAN GATE, and it is owed by this task rather than by the milestone's own
  # review, because this task is what makes the failed state reachable in production
  # for the first time. DESIGN §"Inherited from m45" carries **DG-45-5** into this
  # milestone: an unresolvable destination takes *"the treatment 45 already fixed —
  # dashed, `aria-disabled`, `title` naming the command"*, and **DG-45-4** wants ONE
  # origin-mismatch language for every route. The current render is none of those: it
  # is the drill-in's own label swapped to the plain words "Open failed"
  # (`Fleet.tsx:731-734`), with no dashed treatment, no `aria-disabled` and a `title`
  # that names no command. Which of the two is right is a PO/design ruling, not a
  # build guess — see FINDING F-47-01-QA-1 in the report accompanying this refine.
  #
  # BROWSER LANE (QA-OWNED). QA runs the render and drives the harness; the designer
  # judges the screenshots it is handed and has no `Bash`. Per the house design-render
  # discipline `npx playwright` is POLICY-BLOCKED — the render drives the cached
  # ms-playwright Chromium directly (`--headless=new --screenshot=<ABSOLUTE
  # forward-slash path>`). THE a11y LANE IS OFF, and that is the decision, not an
  # oversight: `.aof/aof.config.json`'s `work.tags.domains` carries no `a11y` entry and
  # there is no `work.ui.a11y` block, so no axe-core run happens in this story and no
  # a11y finding will come from one. The accessibility clause below is therefore HUMAN
  # judgement.
  @uat @design
  Scenario: a destination that cannot be resolved reads as honest, not as broken
    Given a fleet rendered with at least one card whose board cannot be resolved, alongside cards whose boards can
    When the drill-in of the unresolvable card is activated and the surface is captured at 1280 and at 390
    Then the designer judges the failed drill-in against DESIGN's DG-47-5 treatment, and returns CONFORMS or names the GAPS
    # THE GAP IDS WERE STALE AND ARE CORRECTED AT BUILD (PO, 2026-08-11, F-47-01-QA-5).
    # This Then named DG-45-5 and DG-45-4, but DESIGN has since re-expressed DG-45-5 as
    # DG-47-5 (the m45 gap was closed against an affordance ADR-006 DELETES, so it had to
    # be re-aimed at the milestone card's own drill-in), and has explicitly carried DG-45-4
    # to DG-47-6, which is OPEN and deferred to the next fleet milestone with its reason:
    # nothing on the wire carries the resolvability fact. Judging this render against
    # DG-47-6 would GAP the build for something the record deliberately did not ask for.
    And the judgement is made against the cause the resolver now actually gives — `workspace-not-local`, "not checked out on this machine" (ADR-011) — which is more specific and more actionable than a generic failure, and is a better basis for the dashed / `aria-disabled`-forbidden / `title`-names-the-remedy decision than "something went wrong"
    And the failed state is distinguishable at a glance from the at-rest state and from the in-flight state — three states, three readings
    And the reason is recoverable without hovering: what failed and what the operator can do about it are on the card or one affordance away
    And it uses no `destructive` treatment: an unreachable board is ABSENT, not broken, and the surface must not claim the mesh has failed
    And region 5's geometry survives the longer label — nothing overlaps, nothing leaves the card, and the DG-13 clause 5 yield order is unchanged
    And absent a render the verdict is INCONCLUSIVE naming the missing render, never inferred from component source — but a missing mock is NEVER grounds for INCONCLUSIVE, because DESIGN's binding checklists are the mandatory baseline until one lands
