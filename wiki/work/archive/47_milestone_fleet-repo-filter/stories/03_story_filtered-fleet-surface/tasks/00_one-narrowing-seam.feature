<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 47/03, ADR-004: EVERY REGION, OR NONE. The narrowing is applied
# ONCE, above the region fan-out and BEFORE `pageState`, so no region component ever
# receives the un-narrowed status and every narrowed region reports what it is showing
# out of what it has.
#
# THE CLAIM THAT IS HARD TO WRITE, AND WHY THE SCENARIOS BELOW ARE SHAPED THE WAY THEY
# ARE. "Every region is narrowed" is trivial to assert region by region and worthless
# the moment someone adds a region — a per-region enumeration passes today and rots at
# milestone 49. SPEC says so in its own words: a filter that narrows one region and not
# another is worse than none, and the failure arrives "not in this milestone, where
# someone is thinking about it, but in the NEXT one" (ADR-004). So the headline scenario
# below is written as a SWEEP OVER THE WHOLE RENDERED PAGE and names no region:
#
#   *no fact belonging to any other workspace appears anywhere in the document.*
#
# A region added by a later milestone is inside that sentence on the day it is added,
# without its author knowing this rule exists — which is the property ADR-004 exists to
# buy. The enumeration that ROTS is deliberately absent; the three enumerations that
# remain assert things a sweep cannot see — that the region SET does not change under a
# filter, that each narrowed region SAYS what it did, and that the ONE compound region
# narrows the half of itself that carries a workspace — and none of them is a substitute
# for the sweep.
#
# NON-VACUITY IS THE OTHER HALF, and without it the sweep is satisfied by a page that
# renders nothing. Every sweep below is run TWICE over the SAME fixture — once filtered,
# once not — and the foreign facts that must be absent from the first must be PRESENT in
# the second. "Absent" then means narrowed away, not never rendered.
#
# TWO CONTRADICTIONS WERE MET WHILE AUTHORING THIS FILE. BOTH ARE NOW RULED, AND THIS
# FILE IS WRITTEN AGAINST THE RULINGS RATHER THAN AGAINST EITHER ORIGINAL:
#
#   **(1) BOARDS — resolved in ADR-006's favour, and DESIGN is amended throughout.** An
#   earlier draft of DESIGN §Surface 2 carried **R4 Boards** as a live region (in the
#   frame, the filtered-summary table and the binding checklist) while ADR-006 deleted it.
#   DESIGN now agrees with ADR-006 everywhere — frame, summaries, checklist, states, ramp
#   and region order — and records the removal rather than editing it out silently. **The
#   page's regions are R0 filter banner · R1 Workspaces · R2 Milestones · R3 Nodes ·
#   R4 Diagnostics. There is no page R5 and no boards region.** So there is no
#   `<n> of <N> boards` scenario below, and its absence is now simply the record. The
#   arithmetic that closes it is already in the tree and is asserted below: the loading
#   state reserves exactly **four** `RegionPlaceholder`s (`Fleet.tsx:1459-1479`), which is
#   four regions against four placeholders. A render with no boards region **CONFORMS**.
#
#   **(2) DIAGNOSTICS — ruled the other way, in ADR-004's favour, and DESIGN is amended to
#   the COMPOUND.** The earlier DESIGN text made Diagnostics *"the one region the filter
#   must NOT narrow"* with the blanket summary `mesh-wide — not narrowed by the filter`;
#   ADR-004 ruled it a compound. ADR-004 wins. `skippedWorkspaces[]` and
#   `projectionErrors[]` carry `workspaceId` and are **case 1 — NARROWED**; `projectedAt`
#   and `descriptorErrors[]` carry no workspace and are **case 3(a) — machine-wide and
#   DECLARED**. The region states, fact by fact, which of its numbers are filtered, and
#   the amended summary reads **`projection health is mesh-wide · skipped workspaces
#   narrowed`**. DESIGN's own words for why the earlier draft was worse than wrong: *"an
#   exemption stated more broadly than it is true is that same defect wearing a label."*
#   **An earlier version of this file asserted the blanket exemption and would have gone
#   GREEN on a build that left a narrowable collection unfiltered — the exact failure
#   ADR-004 exists to prevent.** That is why the compound now has a scenario of its own
#   rather than a row in a summary table.
#
# LITMUS: every Then is confirmable by an outsider without reading source, through the
# ONE DOM channel this repo has — the headless mount harness
# (`test/support/fleet-app-harness.mjs` / `test/support/shell-app-harness.mjs` over
# `test/support/react-app-harness.mjs` + `mini-react.mjs`). The REAL, unmodified
# `<Fleet/>` is bundled and mounted against a REAL `serveMeshUi` face over a REAL global
# projection; what is asserted is the text, the `title`s and the accessible names the
# page renders. There is NO vitest and NO testing-library in this repo; there is no other
# channel.
#
# NOT ASSERTED HERE — pushed to the fitness functions, listed so nobody writes them as
# Thens:
#   (a) "the narrowing has exactly ONE call site" / "`GlobalScopeView` does not narrow"
#       / "the narrowing is called before `pageState` and before the fan-out" — all three
#       are `test/arch/acd-fleet-filter-every-region.test.mjs`, asserted by reading
#       `Fleet.tsx`. They are source facts. The empty-state-precedence scenario below is
#       their BEHAVIOURAL neighbour and asserts the half a static gate cannot see.
#   (b) "every array collection on the wire is narrowed or declared machine-wide" — the
#       same file's completeness ratchet, which reads `GlobalMeshStatus` off the type so
#       it cannot go stale. A scenario cannot see a collection nothing renders yet.
#       **Its one blind spot is named in FEASIBILITY 4 and is covered by a scenario here
#       instead.**
#   (c) "no module outside `ui/src/fleet/scope.mjs` names the `repo` key" and "no sibling
#       filter module exists" — `test/arch/acd-fleet-filter-single-home.test.mjs`.
#   (d) "the filter mints no request parameter" — `acd-fleet-filter-read-only`. Its
#       behavioural neighbour is task 01 scenario 3 (the request count), not here.
#   (e) the PURE narrowing contract — which rows survive `filterToWorkspace`, membership
#       semantics, non-mutation, the null cases, and (now) the narrowing of the compound's
#       inner collections — is story **47/02**, exercised by `node:test` on `scope.mjs`.
#       This file never calls the helper; it reads the page.
#
# FEASIBILITY — checked at source 2026-08-10, at `d71d508`. Six notes, three of which are
# build prerequisites:
#   1. THE PRODUCER EXISTS AND IS ALREADY MULTI-WORKSPACE.
#      `withTwoWorkspaceAssignFixture` (`test/support/mesh-ui-assign-fixture.mjs:307`)
#      stands up the REAL `serveMeshUi` over a REAL global projection holding FOUR
#      published workspaces — `control`, `portal`, a vanished checkout and a re-keyed
#      one — with ref `18` colliding across all four and one node (`worker-a`) published
#      from `control` and `portal` only. That is exactly the payload this seam needs, and
#      it is producer-fed end to end: no hand-built status object appears below.
#   2. **BUILD PREREQUISITE — a QUIET workspace.** No existing fixture publishes a
#      workspace snapshot with ZERO work items, and "the repo is on the mesh and quiet"
#      (task 02) has no other producer. The fixture needs one more repo whose
#      `wiki/work` is empty. Cheap, and it must be REAL (a published snapshot), never a
#      trimmed payload.
#   3. **THE `<n> of <N>` SUMMARY NEEDS A NUMBER NO REGION MAY HOLD.** ADR-004 hands
#      every region an ALREADY-NARROWED status, so a region knows `n` and cannot know
#      `N`. The total must therefore arrive as a SCALAR computed at the seam (ADR-004
#      rule 4 — "scalars are not collections … they describe the response, not its
#      rows"), never by handing a region the raw payload beside the narrowed one. The
#      scenarios below assert the RENDERED STRING and dictate no mechanism; this note
#      exists so the build meets the constraint rather than discovering it.
#   4. **THE COMPOUND IS THE ONE PLACE THE RATCHET CANNOT SEE, AND IT IS NOW LOAD-BEARING.**
#      Under the ruling, `diagnostics.skippedWorkspaces[]` and
#      `diagnostics.projectionErrors[]` MUST be narrowed. Two measured consequences:
#      **(a)** `filterToWorkspace` (`scope.mjs:162-170`) does NOT narrow them today — it
#      spreads `diagnostics` through untouched — so **47/02 must reach inside the compound**,
#      and 47/03 cannot satisfy the scenarios below without it; **(b)**
#      `acd-fleet-filter-every-region`'s completeness ratchet reads the **ARRAY-typed
#      fields of `GlobalMeshStatus`**, and `diagnostics` is an OBJECT — so its inner
#      arrays are invisible to the ratchet, in either direction, forever. **The scenarios
#      here are the only gate on the compound**, which is why the fact-by-fact scenario
#      exists and why it must not be softened into a summary-string check. QA has raised
#      the ratchet's nested-collection blind spot as a finding in its own right.
#      **BUILD PREREQUISITE:** the fixture needs skipped workspaces in more than one repo —
#      a "skipped" workspace is a REAL derivable fact (`global-mesh-query.mjs:228-234`: a
#      published descriptor with `meshEnabled: false`), so it is produced by publishing a
#      repo whose `config.mesh.enabled` is false, never by editing a payload.
#   5. **BUILD PREREQUISITE — the harness cannot read the LOADING state of a fleet
#      mounted alone.** `withFleetApp` (`fleet-app-harness.mjs:40`) does not plumb
#      `settle` or `holdFromStart` through to `withMountedApp`, so the first response
#      always lands before the lane gets a driver. `withShellComposedFleet` DOES plumb
#      both. Either plumb the two options through `withFleetApp` (two lines) or drive the
#      loading lanes through the shell-composed harness; tasks 01 and 02 need this.
#   6. **THE SHELL-COMPOSED MOUNT NEVER SETTLES VIA `flush()`** — recorded at
#      `test/shell-regions.test.mjs:840-855`: mini-react re-invokes every function
#      component on every pass, `Fleet.tsx:226`'s inline `onRefresh` arrow is a new
#      function each time, the `SurfaceSlot` deps therefore differ, the contribution
#      re-publishes and the two spin. Lanes settle by bounded `renderOnly()` passes
#      instead. **This milestone adds a FOURTH contribution to that slot** (the picker,
#      plus whatever it captures), so every new value handed to `SurfaceSlot`'s `deps`
#      must be referentially stable across renders — an options array rebuilt inline each
#      render would make the existing spin worse and is one refactor from a genuine
#      "Maximum update depth" in the browser.
#
# ISOLATION: these suites export a test ARRAY, so `node --test test/<file>` runs ZERO
# tests and reports success (m47 retro). Drive them through a focused runner that IMPORTS
# the array, under `AOF_GLOBAL_HOME=$(mktemp -d)`. NEVER the full suite on the control
# node — `global-work-propagation.test.mjs` binds `:4182`, which the live daemon holds.
# Every fixture server below binds port 0.

@ui @work @work-stream
Feature: one narrowing seam above the region fan-out — the whole page believes the filter, and a region added tomorrow is narrowed on the day it is added
  In order that an operator who says "this repo" is never shown another repo's work under a chip claiming the view is filtered — and that the next milestone's author cannot ship an un-narrowed region without knowing this rule exists
  the payload is narrowed ONCE before the page decides what state it is in and before any region receives it, the page renders no fact belonging to any other workspace, every narrowed region states what it is showing out of what it has, and the one compound region narrows the half of itself that carries a workspace and declares the half that does not

  Background:
    Given a REAL fleet face serving a REAL global projection that holds four published workspaces — `control`, `portal`, a workspace whose checkout has been deleted, and one that re-keyed itself
    And the milestone ref `18` exists in all four of them, with a different title in each
    And one node, `worker-a`, published from `control` and from `portal` and from neither of the other two
    And the REAL, unmodified `<Fleet/>` mounted headlessly against that face

  # HEADLINE. The sweep, and it names no region on purpose. Every Then here is a
  # statement about THE WHOLE DOCUMENT, so it covers a region that does not exist yet.
  @executable
  Scenario Outline: filtered to one repo, nothing on the page belongs to any other — swept over the whole document, with the unfiltered render as the control
    Given the fleet is opened at `/fleet?repo=<repo>`
    When the page settles
    Then every fact the page renders that carries a workspace identity belongs to <repo>
    And <on screen> is rendered somewhere on the page
    And not one of <never on screen> appears anywhere in the rendered document, WITH THE PICKER CLOSED — not as text, not in a `title`, not in an accessible name
    # "WITH THE PICKER CLOSED" ADDED AT BUILD (PO, 2026-08-11, F-47-03-QA-9). The picker is
    # deliberately fed the UN-narrowed workspaces — a picker fed the narrowed payload could
    # never be used to LEAVE the filter, which is the one thing an operator in a filtered
    # view most needs. So with the popover OPEN, every foreign name and root is legitimately
    # in the tree. Nothing is wrong today (the lanes sweep closed), but as written this Then
    # would fail a correct build the moment a future author opened the picker inside a sweep
    # lane — and this sweep is the milestone's anti-rot instrument, so it must not be the
    # thing that teaches people to distrust it.
    And exactly one milestone card is rendered for the ref `18`, and it is <repo>'s
    And the SAME fixture opened at `/fleet` with no filter renders every one of <never on screen> — so their absence above is the narrowing, not a page that renders nothing
    And the only facts on the page that survive un-narrowed are the ones that carry no workspace identity at all, and each of them is declared (the compound region's own two, below)
    And the page never enters its error state

    Examples:
      | case                                              | repo                    | on screen                                                                                     | never on screen                                                                                                                                 |
      | the daemon's own workspace                        | control                 | `control`, its `projectRoot`, `Per-folder integration descriptor`, `Control Only`, `worker-a` | `portal`, `elsewhere`, `rekeyed`, their `projectRoot`s, `Homedata Live Property Data`, `Portal Only`, `Published Elsewhere`, `Re-keyed Checkout` |
      | a peer workspace in the same projection           | portal                  | `portal`, its `projectRoot`, `Homedata Live Property Data`, `Portal Only`, `worker-a`         | `control`, `elsewhere`, `rekeyed`, `Per-folder integration descriptor`, `Control Only`, `Published Elsewhere`, `Re-keyed Checkout`               |
      | a workspace whose checkout is gone                | the vanished workspace  | `elsewhere`, `Published Elsewhere`                                                            | every other workspace's name, root and milestone title, AND `worker-a`                                                                          |
      | a workspace that re-keyed itself after publishing | the re-keyed workspace  | `rekeyed`, `Re-keyed Checkout`                                                                | every other workspace's name, root and milestone title, AND `worker-a`                                                                          |
    # ROWS 3 AND 4 ARE THE ONES THAT PROVE THE KEY. The filter matches on the id the
    # PAYLOAD carries, so a workspace whose checkout no longer exists and one that now
    # declares a different `mesh.workspaceId` both still filter correctly — a filter
    # keyed on the name or the path would fail exactly here, silently, which is ADR-003's
    # whole argument for the opaque id made visible.
    #
    # THE NODE CLAUSE IN ROWS 3 AND 4 IS ADR-004 RULE 2 SEEN FROM THE SURFACE: a node is
    # in the filtered repo iff it is a MEMBER of it, so a repo no machine carries renders
    # an EMPTY node region rather than the machine-wide roster. This deliberately
    # diverges from `?scope=local`, where the roster stays machine-wide
    # (`src/global-node-registry.mjs:170-172`, pinned by
    # `acd-mesh-ui-local-filter-preserves-status`). Both are correct; neither is to be
    # "fixed" to match the other, and the `carrying this repo` wording below is what stops
    # a shrunken roster reading as "machines went away".
    #
    # THE REF-18 CLAUSE is F21's shape one level up: four workspaces carry the same ref,
    # so a page that narrowed by ref rather than by workspace id would render four cards
    # and look fine.
    #
    # THE SECOND-TO-LAST THEN IS WHAT KEEPS THE SWEEP AND THE COMPOUND FROM CONTRADICTING
    # EACH OTHER. Diagnostics' machine-wide facts — the projection's own freshness and its
    # descriptor-error count — are counts and timestamps that name no workspace, so they
    # are outside the sweep by construction. A build that ever rendered a machine-wide ROW
    # naming another workspace would be violating ADR-004 case 3(a), and it would be caught
    # here rather than excused.

  # THE SET DOES NOT CHANGE — which is what makes the sweep above a claim about EVERY
  # region rather than about the regions that happened to survive. A filter that removed
  # a region would satisfy "nothing foreign is rendered" by rendering nothing.
  @executable
  Scenario: a filter changes which rows render, never which regions exist
    Given the fleet rendered at `/fleet` and again at `/fleet?repo=<a workspace on the payload>`
    When the two renders are compared
    Then both render exactly four regions, in this order: Workspaces, Milestones, Nodes, Diagnostics
    And that is the same number of regions as the `RegionPlaceholder`s the loading state reserves — four against four, with no boards region in either
    And no region is added by the filter and none is removed by it
    And every region that renders rows in the unfiltered render renders only rows of the filtered repo in the filtered one
    And exactly ONE region declares any part of itself not narrowed, and it is Diagnostics, and what it declares is a PARTIAL exemption that says which half is which
    And no other region carries any not-narrowed marker, and no region carries a marker the other render does not
    # THE "EXACTLY ONE" COUNT IS THE STRUCTURAL CLAUSE. A region added later has two
    # honest outcomes and no third: it narrows (and is caught by the sweep above), or it
    # declares itself machine-wide (and breaks this count, which is a review conversation
    # and an ADR — ADR-004 rule 3). SILENT PASSTHROUGH — the failure mode SPEC names —
    # satisfies neither.
    #
    # AND THE WORD "PARTIAL" IS LOAD-BEARING AFTER THE RULING: a region declaring a
    # BLANKET exemption over facts that do carry a workspace is not an exempt region, it
    # is an un-narrowed one wearing a label, and it must fail this clause.

  # EVERY NARROWED REGION REPORTS WHAT IT DID. DESIGN §Surface 2: `<n> of <N> <noun>`,
  # replacing the bare `<N> <noun>` head and leaving each summary's own tail untouched.
  @executable
  Scenario Outline: each narrowed region's header states what it is showing out of what it has, and the compound region states which half of itself is which
    Given the fleet is opened at `/fleet?repo=<a workspace on the payload>`
    When the page settles
    Then <region>'s header summary reads <filtered summary>
    And the same region's header summary at `/fleet` with no filter reads <unfiltered summary>
    And where the summary carries a `<n> of <N>`, the total after `of` is the UNFILTERED total — what the whole mesh has, not what the filter left
    And no count appears in the filter banner — counts live in the region headers, one fact one home

    Examples:
      | case                                | region       | unfiltered summary   | filtered summary                                            |
      | R1                                  | Workspaces   | `4 workspaces`       | `1 of 4 workspaces`                                         |
      | R2                                  | Milestones   | `6 milestones`       | `2 of 6 milestones`                                         |
      | R3 — the membership relation named  | Nodes        | `1 node`             | `1 of 1 nodes carrying this repo`                           |
      | R4 — the ONE PARTIAL exemption      | Diagnostics  | *(no summary)*       | `projection health is mesh-wide · skipped workspaces narrowed` |
    # THE NUMBERS ARE THE FIXTURE'S and the build may re-state them against whatever the
    # producer actually publishes — what is BINDING is the FORM (`<n> of <N> <noun>`), that
    # `<N>` is the pre-filter total, and that the singular/plural rule the page already
    # applies (`plural()`, `Fleet.tsx:1544`) is not broken by the new form.
    #
    # R3's `carrying this repo` IS LOAD-BEARING COPY, not decoration: membership is a
    # different relation from ownership, and a node count that simply shrank would read as
    # machines having gone away. R3 also carries NO liveness tail — the
    # `· N live · N stale · N offline` tail belongs to the local-shape `NodesRegion`
    # ADR-006 deletes, and a lane asking for it would fail a correct build.
    #
    # THERE IS NO BOARDS ROW, and after the ruling that is simply the record: the page has
    # four regions and the wire type has never carried the collection.
    #
    # R4's SUMMARY IS ONLY HALF THE CLAIM. The sentence is cheap to render and proves
    # nothing about the numbers underneath it — which is exactly how the earlier blanket
    # wording would have passed a broken build. The next scenario is the other half.

  # THE COMPOUND, FACT BY FACT — the scenario the ruling exists to force. It is separate
  # from the summary above ON PURPOSE: a region can print "skipped workspaces narrowed"
  # while narrowing nothing, and the ratchet cannot see inside `diagnostics` because it is
  # an object rather than an array (FEASIBILITY 4). This is the only gate.
  @executable
  Scenario Outline: the one compound region narrows the facts that carry a workspace and leaves the facts that do not — and says which is which
    Given a REAL projection in which two DIFFERENT repos are skipped — each published with mesh propagation disabled — and at least one descriptor error exists
    And the fleet is opened at `/fleet?repo=<one of the skipped repos>`
    When the page settles
    Then the Diagnostics strip's <fact> reads <filtered> and, at `/fleet` with no filter, reads <unfiltered>
    And it is <treatment> under ADR-004's completeness rule
    And the region's header states that this fact is <declared as>

    Examples:
      | case                            | fact                         | unfiltered                                | filtered                                        | treatment                        | declared as                     |
      | the projection's own freshness  | `Projection: updated <t>`    | the projection's own timestamp            | the SAME timestamp, with no `<n> of <N>` at all | case 3(a) — machine-wide, declared | mesh-wide                       |
      | the workspace-carrying count    | `disabled/skipped workspaces`| `2 disabled/skipped workspaces`           | `1 of 2 disabled/skipped workspaces`            | case 1 — narrowed                 | narrowed                        |
      | the path-carrying count         | `descriptor errors`          | the mesh-wide count                       | the SAME count, with no `<n> of <N>` at all     | case 3(a) — machine-wide, declared | mesh-wide                       |
    # ROW 2 IS THE ONE THAT FAILS A NAIVE BUILD, and it fails it loudly: `filterToWorkspace`
    # spreads `diagnostics` through untouched today, so an unamended narrowing renders
    # `2 disabled/skipped workspaces` under a filter — a number about a repo the operator is
    # not looking at, printed beneath a chip saying the view is narrowed. 47/02 owns
    # reaching inside the compound; this row is where the surface proves it happened.
    #
    # ROWS 1 AND 3 ARE THE OTHER HALF AND THEY MATTER JUST AS MUCH: a build that "fixed"
    # the compound by narrowing the WHOLE region would hide the cause of an operator's own
    # stale data — a projection error in another workspace is still why YOUR data is stale.
    # Over-narrowing and under-narrowing are both failures here, and the two rows are what
    # make the difference visible.
    #
    # PROJECTION ERRORS carry `workspaceId` too and are narrowed by the same rule; they are
    # not in the table only because the shipped strip does not render a count for them
    # (`Fleet.tsx:1050-1057`). If the build surfaces one, it takes row 2's treatment, not
    # rows 1 and 3's.

  # THE SEAM RUNS BEFORE THE PAGE DECIDES WHAT IT IS. This is the behavioural neighbour
  # of the arch test's `narrowAt < pageStateAt`: if emptiness were judged on the
  # UN-narrowed payload, a filtered-to-zero view would render the populated body with
  # every region empty and no explanation — SPEC's forbidden outcome, exactly.
  @executable
  Scenario: a filter that leaves nothing renders the page's EMPTY state, never a populated page of empty regions
    Given the fleet is opened at `/fleet?repo=<a value no workspace on the payload carries>`
    When the page settles
    Then the page is in its empty state — the single centred card, not the region column
    And no region header is rendered at all
    And no empty-region placeholder is rendered for any region
    And the filter banner is rendered ABOVE that card, naming the narrowing in force
    And the same is true when the filter names a workspace the payload DOES carry but which has published nothing
    # THE SECOND CLAUSE IS THE SURFACE CONSEQUENCE OF A PREDICATE THIS STORY DOES NOT OWN.
    # `isEmptyStatus` (`scope.mjs:91-98`) is filter-agnostic today and a filter naming a
    # KNOWN-but-quiet workspace leaves that workspace's own `workspaces` row standing, so
    # the predicate answers FALSE and the page renders POPULATED with one workspace card
    # above two empty regions. **Making the emptiness question filter-aware is routed to
    # 47/02, which now carries the known-but-quiet workspace as an explicit Examples row.**
    # What is asserted HERE is only what an operator sees, so the two contracts meet at the
    # surface instead of both hedging.

  # A RE-POLL CANNOT LEAK AN UNFILTERED FRAME. The narrowing runs on every payload, not
  # once at mount — and this is the only scenario that can tell the difference, because
  # the leak lasts exactly one poll interval and then heals.
  @executable
  Scenario: the seam re-applies to every payload the poll delivers, and to the one the ⟳ control fetches
    Given the fleet is open at `/fleet?repo=<a workspace on the payload>` and settled
    When a NEW workspace with its own milestones is published into the same projection while the page is open
    And the poll interval elapses
    Then the page still renders no fact belonging to the new workspace
    And the region summaries' totals have grown to include it — the page knows it is there and is not showing it
    When the ⟳ refresh control is clicked
    Then the page still renders no fact belonging to the new workspace
    When the filter is cleared
    Then the new workspace's facts are rendered, with no reload and no remount
    # THE TOTALS CLAUSE IS THE NON-VACUITY GUARD: "nothing new appeared" is also true of a
    # page that stopped polling. The `<N>` moving is what proves a fresh payload arrived
    # and was narrowed, rather than never arriving.

  # THE ONE FACT THE OLD LINE CARRIED, RE-HOMED. `Fleet.tsx:442-446`'s in-body
  # `Filtered to workspace <id>` is REPLACED by the banner (ADR-007) — not duplicated,
  # because two places rendering "what am I filtered to" are two places that can disagree,
  # and one of them is invisible in three of four page states (DG-47-1).
  @executable
  Scenario: the in-body "Filtered to workspace" line is gone, and the narrowing it stated is stated once, in the banner, in every page state
    Given the fleet is opened at `/fleet?scope=local`
    When the page settles
    Then the page renders no in-body `Filtered to workspace <id>` line
    And the narrowing `scope=local` produced is stated exactly once on the page, in the filter banner
    And it is still stated when the same address is opened against a face with nothing published, where the page renders its empty state
    And it is still stated when the same address is opened against a face that refuses `/api/mesh/status`, where the page renders its error state
    And what the banner states for this narrowing is `scope · Local`, and it is a STATEMENT rather than a control — it carries no clear affordance of its own
    # THE ASYMMETRY IS DELIBERATE AND IS RECORDED SO IT IS NOT LOGGED AS AN OVERSIGHT
    # (DESIGN §Surface 1): scope's own control is always visible in the bar with BOTH
    # options showing, so clearing it is already one click away; the repo's clear lives
    # inside a closed popover, so its chip must carry one (task 01).
    #
    # AND SO IS THE LOSS: the raw `<workspaceId>` today's line prints is NOT carried into
    # the banner. DESIGN's R0 component list is closed — one label, one chip per
    # narrowing, "Nothing else" — and `scope · Local` says what the narrowing IS without
    # naming the daemon's own id. A reviewer meeting the shipped surface should read that
    # as designed, not as a fact dropped in the re-home.
