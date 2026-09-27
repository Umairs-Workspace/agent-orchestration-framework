<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 47/01, ADR-006(b): ONE PRODUCER OR NO REGION, and in this
# milestone, no region. The local-shape branch — `Fleet.tsx:239-249` and everything
# only it reaches (`NodesRegion`, `NodeCard`, `PresenceDot`, `PresenceLabel`,
# `livenessOf`, `BoardsRegion`, `BoardTile`, `boardRunState`, `RunStateChip`,
# `BoardDrillIn`; ≈250 lines) — is DELETED, together with whatever of `api.ts`'s
# `FleetBoard` / `MeshStatus` loses its last reader. `runChipClasses` STAYS:
# `AssignmentChip` shares it, and that is the trap this deletion is most likely to
# spring.
#
# WHY IT IS UNREACHABLE, measured and stated in the source itself. `isGlobalStatus`
# (`Fleet.tsx:96-98`) narrows on `Array.isArray(status.workspaces)`, and
# `shapeGlobalStatus` (`src/global-mesh-query.mjs:269-291`) ALWAYS returns
# `workspaces`, for BOTH scopes — so `isGlobalStatus(status)` is always true on the
# face the web surface talks to and the local branch has not rendered since m34.
# `Fleet.tsx:981-989` says so in its own words. The `boards` half never made the
# m25/ADR-002 → m34/ADR-006 producer migration: the CLI face still consumes
# `mesh:status`'s `boardsProjection` (`src/commands/mesh-identity.mjs:436-503`, which
# reads the per-workspace GIT group registry) while the web face consumes the global
# SQLite projection — and the web face is STRUCTURALLY BARRED from the other by
# `acd-mesh-ui-no-core-import`. So `BoardsRegion` has rendered its dashed "No boards
# registered in the group yet" placeholder in production for two milestones. That is
# m45 QA's **F-45-04-QA-3**, and it is why m45's own producer-fed lanes had to be
# labelled honest evidence for the RENDER contract and NOT for operator reachability.
#
# LITMUS: every Then is confirmable by an outsider without reading source. "≈250 lines
# are gone" is not a claim a scenario can make — a `Then` that can only be checked by
# grepping is a fitness function. What an outsider CAN confirm is what the PRODUCT
# does afterwards, and that is what every scenario below asserts, through three
# channels that already exist:
#   (1) THE REAL SURFACE, MOUNTED, FED BY THE REAL PRODUCER. `withFleetBoards`
#       (`test/in-app-cross-links.test.mjs:184-240`) already invokes the REAL
#       `mesh:status` verb over a REAL group registry and serves its payload —
#       `boards`, `local` marker and all — verbatim over HTTP to the REAL `<Fleet/>`.
#       Nothing is hand-painted. It is the exact instrument that proved the branch
#       unreachable, and it is what proves the branch is gone.
#   (2) THE CLI FACE, driven as a child process, which still renders boards. This is
#       what separates "the dead UI branch went" from "the product lost boards".
#   (3) THE UI BUILD — `npm --prefix ui run build` is `tsc -b && vite build`, so a
#       wire type deleted while a reader survives fails there, loudly, by name.
#
# NOT ASSERTED HERE — three claims that belong elsewhere, listed so nobody writes them
# as Thens:
#   (a) "`Fleet.tsx` is under its line ratchet" — owned by
#       `test/arch/acd-ui-surface-file-budget.test.mjs`. It is the milestone's REASON
#       for taking this deletion first (1,547 of 1,560, with a control, a chip and an
#       empty-state branch still to add), and it is a file-size fact, not a behaviour.
#   (b) "no hard-coded board address survives in `ui/src/fleet/`" — owned by
#       `test/arch/acd-fleet-board-link-resolved.test.mjs`, which this deletion turns
#       from RED to green. Scenario 2 below is its BEHAVIOURAL neighbour and asserts
#       the half a static gate cannot see: what the surface actually renders.
#   (c) the TERMS for restoring a boards region — ADR-006 sets them (the producer is
#       `shapeGlobalStatus` fed by a fact published into the GLOBAL projection; the
#       row MUST carry `workspaceId`; `local` is re-derived or dropped). Those bind a
#       future author's review, and an ADR is where they bind. A test asserting a
#       region that deliberately does not exist would be a test of nothing.
#
# THE SEQUENCING CONSTRAINT, made structural rather than remembered. m45/STATE:
# *"fixing (b) without (a) ships a visible broken link; fix them together or sequence
# (a) first."* This task is (b). Scenario 3 is the lock: it asserts, in the same run
# as the deletion, that the surviving route-resolved drill-in still opens a board — so
# the surface never passes through a state with a board affordance that dead-ends, and
# never through a state with no way into a board at all. Task 00 green BEFORE this
# lands, and re-checked AT it, is the whole of the ordering contract.
#
# FEASIBILITY — checked at source 2026-08-10, at `d71d508`. Four notes:
#   1. TWO m45 LANES ASSERT THE DELETED BEHAVIOUR AND WILL GO RED. Measured:
#      `test/in-app-cross-links.test.mjs`'s `01 scenario 3` lane (which pins
#      `href="/board"` on the local board's anchor and the peer board's copy-control)
#      and rows 5 and 6 of its mode-sweep outline ("the fleet, a local board" / "the
#      fleet, a peer board"). They are the ONLY suites that drive this branch. They
#      must be RE-POINTED in this same change, not deleted with the code they guarded
#      — scenario 6's last Then is what makes that visible. Their m45 feature already
#      records the reachability gap and routes it here, so this is the change it was
#      waiting for, not a surprise.
#   2. AN OPEN BEHAVIOURAL QUESTION THE BUILD MUST ANSWER, and scenario 1 is where it
#      is answered rather than discovered: with the branch gone, what does the surface
#      render when a payload arrives that has no `workspaces` key? `isEmptyStatus`
#      (`scope.mjs:91-99`) reads `boards` too, so a nodes-and-boards payload is
#      "populated" and would fall into whatever now sits where the branch was. Handing
#      it to `GlobalScopeView` unguarded maps `status.workspaces` — undefined — and
#      THROWS, taking the surface down. Scenario 1 does not dictate the answer; it
#      pins that the operator is never shown a crash, and it leaves an honest empty
#      state and a degraded populated view both open.
#   3. THE SURFACE HAS NO ERROR BOUNDARY OF ITS OWN — m45/F-45-M-1 put one at the
#      SHELL boundary, and the headless harness mounts `<Fleet/>` DIRECTLY, with no
#      shell. So a throw in scenario 1 fails the lane loudly rather than degrading
#      quietly, which is exactly the reporting an outsider needs.
#   4. NOTHING HERE BINDS :4181 OR :4182. Every fixture server binds port 0; the live
#      control daemon holds the fixed ports on this machine.

@ui @work @board @bug @finding-F-45-04-QA-3
Feature: the boards branch that has not rendered since m34 is gone, and nothing an operator could reach goes with it
  In order that a future reader of this surface meets either a region with a producer or no region at all — instead of ~250 lines of code that no payload can reach, no test can drive, and every author must read past
  the local-shape branch and its orphaned wire types are deleted, the surface keeps standing for every payload it can be handed, and every fact an operator could actually see before is still there afterwards

  Background:
    Given the REAL `mesh:status` producer, invoked over a REAL group registry, whose payload carries a `boards` aggregate
    And that payload served verbatim over HTTP to the REAL `<Fleet/>`, mounted headlessly
    And the REAL fleet face, which serves the global projection and has never carried a `boards` key at all

  # HEADLINE 1 — the region is gone, and the surface survives being handed the exact
  # payload that used to reach it. This is F-45-04-QA-3's closure read from the
  # operator's side: the placeholder for a payload key nothing publishes no longer
  # renders, because the branch that rendered it no longer exists.
  @executable
  Scenario Outline: the local-shape payload renders no boards region, and the page still stands
    Given a real `mesh:status` payload carrying <boards>
    When the real `<Fleet/>` is mounted against a face serving that payload verbatim
    Then no "Boards" region header is rendered
    And no board tile is rendered for any board in that payload
    And no "No boards registered in the group yet" placeholder is rendered
    And no "Open board →" control is rendered for any board in that payload
    And the surface does not throw: the mount settles and a tree is rendered
    And the page is in one of its four documented states — loading, error, empty or populated — and never a blank document
    And the top bar's scope control is still mounted, as `acd-mesh-ui-scope-visible` has required in EVERY page state since m34

    Examples:
      | case                                                                   | boards                                                          |
      | one board owned by THIS node — the branch that rendered a real anchor  | one board with `local: true`                                    |
      | one board owned by a PEER — the branch that rendered a copy control    | one board with no `local` marker at all                         |
      | both, which is what the m45 lanes drove                                | one local board and one peer board                              |
      | a board with active runs — the run-state chip's only local-shape caller | one local board whose owner's presence carries an active run    |
      | boards but NO nodes — the branch's own "nodes-but-no-boards" inverse    | one local board, with an empty node roster                      |
      | the empty local shape — the placeholder's own condition                | an empty boards array and an empty node roster                  |
    # ROW 4 IS THE `runChipClasses` TRAP, from the side that can see it. `RunStateChip`
    # goes with the branch; `AssignmentChip` shares the same tone map and must NOT.
    # A deletion that took the shared helper with the region would leave the
    # assignment chip unstyled or unbuildable, and this row plus scenario 5's
    # assignment row are the two halves that catch it.
    #
    # ROW 6 pins that "no placeholder" is not satisfied by "the placeholder only shows
    # when the array is non-empty". The dashed placeholder was the EMPTY case's render
    # — it is the thing an operator has actually been looking at for two milestones —
    # so the empty payload is the row that proves it is gone.

  # HEADLINE 2 — the behavioural neighbour of the arch gate, and the reason no broken
  # link can ship in any order: after this deletion the fleet renders no anchor at all
  # that names a board. Every board door on this surface is a control that resolves
  # its destination at click time (task 00), so there is nothing left to hard-code.
  @executable @bug @finding-F-45-04-1
  Scenario Outline: no anchor the fleet renders names a board address, in any state
    Given <state>
    When the href of every anchor in the rendered tree is collected
    Then the anchor count for this state is exactly <anchors>
    And not one collected href has a pathname naming a board
    And not one collected href names a `mode` parameter
    And every board-opening affordance on screen is a control that carries no href — the number of them equals the number of milestone cards rendered

    Examples:
      | case                                                        | state                                                             | anchors |
      | the ordinary populated fleet                                | the fleet mounted against the real global face with two workspaces | 0       |
      | the state that used to render the relative `/board` anchor  | the fleet mounted against a payload carrying one `local` board     | 0       |
      | the state that used to render the peer copy-control         | the fleet mounted against a payload carrying one peer board        | 0       |
      | the empty fleet                                             | the fleet mounted against a face with nothing published            | 0       |
      | the error state                                             | the fleet mounted against a face that refuses `/api/mesh/status`   | 0       |
      | the loading state                                           | the fleet mounted with its first status response held              | 0       |
    # THE COUNTS ARE THE ASSERTION, and the sweep clause is knowingly vacuous where a
    # count is zero — the m45 amendment (QA F-45-04-QA-1, PO ruling 2026-08-07) made
    # exactly this correction to exactly this sweep, and the reading it delivered is
    # the stronger one: an anchor APPEARING is as loud as one disappearing. Measured
    # at m45: `ui/src/fleet/` renders exactly ONE anchor in total, the local-board
    # drill-in, and this task deletes it — so ZERO is the true value for every state,
    # and pinning it is what stops a future author reintroducing an `href` here
    # without meeting ADR-006(a).
    #
    # THE LAST THEN IS THE NON-VACUITY GUARD for the whole scenario: a surface with no
    # board affordance at all would satisfy every anchor clause trivially. Tying the
    # count of board controls to the count of milestone cards is what keeps "no
    # anchors" from being satisfied by "no way into a board".

  # THE SEQUENCING LOCK, which is a product constraint and not a build note (m45/STATE,
  # STORY §Notes). It is asserted in the SAME run as the deletion because that is the
  # only run in which it can be false.
  @executable
  Scenario: at the deletion, the surviving door still opens a board
    Given the deletion is in the tree
    When the operator clicks a milestone card's drill-in on the real fleet
    Then the drill-in still resolves through `GET /api/mesh/board-url` carrying that card's own workspace and ref
    And the operator still lands on the board's own origin, which still answers `/api/work/list` with 200
    And task 00's whole feature is green in this same run — the fleet has exactly one way into a board, and it works
    And there is no state of this story's delivery in which the surface offers a board affordance that dead-ends, and none in which it offers none at all

  # THE DELETION IS OF A DEAD UI BRANCH, NOT OF A PRODUCT FEATURE. The boards
  # aggregate has a producer and a face that renders it; both are untouched. Without
  # this scenario "the boards region is gone" reads as "aof lost boards", and the
  # distinction is the entire justification of ADR-006.
  @executable @cli
  Scenario: the boards producer and the CLI face are untouched
    Given a workspace whose group registry holds one board owned by this node and one owned by a peer
    When `aof mesh status --json` is run there
    Then its payload still carries a `boards` aggregate
    And the board this node owns still carries `local: true`, and the peer board still omits the marker entirely
    When `aof mesh status` is run there without `--json`
    Then the rendered output still holds its Boards section, naming both boards, their owners and their running counts
    And nothing about that output changed with this deletion

  # WHAT AN OPERATOR CAN ACTUALLY REACH IS UNCHANGED — the claim that makes this a
  # deletion of dead code rather than a change of behaviour. Every row is a region or
  # a fact the SHIPPED surface renders today, over the payload the shipped face
  # actually serves.
  @executable
  Scenario Outline: every region the real face can reach still renders exactly as before
    Given the real `<Fleet/>` mounted against the REAL fleet face over a projection holding two published workspaces
    When the page settles
    Then <region> is rendered
    And it carries <fact>
    And nothing in it changed with this deletion

    Examples:
      | case                          | region                       | fact                                                                     |
      | R1                            | the Workspaces summary       | one card per workspace, each with its name, its `projectRoot` and its mesh-enabled dot |
      | R2                            | the Milestones list          | one card per milestone, with its status ring, chip, progress track and story dots      |
      | R3                            | the Nodes panel              | one row per node in the global roster, with its role, freshness and current work       |
      | R4                            | the Diagnostics region       | the projection's freshness, its skipped workspaces and its errors        |
      | the shared chip primitive     | a card carrying an assignment | its assignment chip, with the same pill shape and the same tone as before — `runChipClasses` survived the deletion |
      | the one mutation affordance   | a card's assign row          | its node picker and its action, still able to mint an assignment          |
      | the surface's slot contribution | the top bar                | the scope control, the freshness legend and the ⟳ refresh, in that order  |

  # THE ORPHANED WIRE TYPES, and the evidence that they left cleanly. `FleetBoard` and
  # `MeshStatus` go with the branch or are reduced to what still has a reader —
  # `api.ts` has exactly one dependent, so the blast radius is one file, and the
  # channel that proves it is the build, which typechecks.
  @executable
  Scenario: the wire types that lost their last reader leave with it, and the tree still builds and still runs
    When `npm --prefix ui run build` is run
    Then `tsc -b` completes with no error — no surviving reader names a type that is gone, and no deleted type is still exported for nobody
    And the bundle builds
    And the built fleet surface still mounts and renders its regions
    And the suites that mount the REAL component are green in the same run — the fleet assign lanes, the item-workspace lanes, the shell region and entry lanes, and the freshness lanes
    And the m45 cross-link suite still runs a FLEET lane and passes it: the evidence for the board drill-in moved onto the surviving route-resolved one rather than leaving with the branch it used to guard
