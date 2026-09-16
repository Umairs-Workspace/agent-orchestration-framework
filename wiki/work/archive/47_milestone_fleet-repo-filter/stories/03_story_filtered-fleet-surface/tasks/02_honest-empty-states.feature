<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 47/03, DG-47-3 + ADR-007: THREE WAYS OF ARRIVING AT NOTHING,
# THREE TRUE SENTENCES. An idle mesh, a filter that matched nothing, and a filter naming a
# workspace this payload does not carry are three different facts, and the page says which
# one it is asserting — plus the fourth that composition produces, an empty intersection
# of scope and repo.
#
# WHAT IS ACTUALLY BROKEN TODAY, measured. `pageState()` names four states and
# `isEmptyStatus()` (`scope.mjs:91-98`) reads a payload's arrays and is FILTER-AGNOSTIC.
# Narrow a populated payload down to a workspace it does not carry and every array is
# empty, so the page renders `empty`, whose copy says *"No mesh-enabled workspaces have
# published yet"* — **a false statement about the mesh, produced by the operator's own
# filter.** That is SPEC's forbidden outcome stated as a defect rather than a risk: *a
# filtered view that looks like an idle fleet is a bug.* This task is where the page stops
# saying it.
#
# THE ONE CLAUSE THAT IS EASY TO GET BACKWARDS, so it is a scenario of its own (scenario
# 3): **not yet known is not not found.** Before a payload has landed, a filter's value is
# simply UNRESOLVED — the page cannot yet know whether the mesh carries it. A loading
# state that accuses a valid filter of being unknown is a defect, and it is the natural
# shape of a naive implementation, because "the payload does not carry this id" is
# trivially true of a payload that has not arrived.
#
# LITMUS: every Then is confirmable by an outsider without reading source, through the
# headless mount harness (`withFleetApp` for the page body; `withShellComposedFleet` where
# the LOADING state must be frozen, which the fleet-only harness cannot reach today — see
# FEASIBILITY 1). What is asserted is the RENDERED WORDS, the rendered controls and the
# address the page holds. There is NO vitest and NO testing-library in this repo.
#
# EVERY STRING BELOW IS NOW PINNED VERBATIM, AND THAT CHANGED DURING AUTHORING. An earlier
# version of this file asserted the filtered-quiet BODY as PROPERTIES rather than as copy,
# because DESIGN pinned *"…has published no milestones, nodes **or boards**…"* while
# ADR-006 deleted the boards region in this same milestone — a sentence sending the
# operator to look for a region that no longer exists. **That contradiction is now
# resolved in ADR-006's favour and DESIGN is amended: the body reads "no milestones and no
# nodes", "the regions this page actually has".** So the hedge is gone and the copy is the
# assertion:
#   - `No mesh-enabled workspaces yet` + today's unfiltered body, unchanged;
#   - `Nothing published for this repo yet` + *"`<name>` is on the mesh but has published
#     no milestones and no nodes. The rest of the fleet is still there."*;
#   - `No repo matches this filter` + *"Nothing on this mesh publishes as `<raw value>`.
#     It may not have published yet, or the id may belong to another mesh."*;
#   - the composed heading *"Nothing matches Local scope and this repo"*;
#   - the recovery control's label, `Show all repos`.
# QA's rule stands unchanged for anything DESIGN does NOT pin — assert the distinguishing
# property and raise a finding rather than inventing a string — and one such case survives
# below (FEASIBILITY 4's filter-on-an-empty-mesh).
#
# WHO OWNS WHAT, now that both halves are ruled. The DERIVATION of these strings is story
# **47/02** (`emptyStateCopy`, which becomes `{ heading, body }` so the heading stops being
# an inline ternary in the component); the ONE-LINE `Fleet.tsx` change that CONSUMES the
# new shape is **47/03's**, i.e. this story's. This file asserts what the PAGE renders and
# never what the helper returns.
#
# NOT ASSERTED HERE:
#   (a) the picker's presence in the empty states — task **01** scenario 1 owns it across
#       all four page states at once, which is the stronger claim.
#   (b) the address contract (what is written, when, and that clearing deletes the key) —
#       task **03**. The ONE address clause that lives here is the negative one:
#       an unknown filter does not rewrite the address, because that is what makes the
#       state honest rather than convenient.
#   (c) "a filter that leaves nothing reaches the EMPTY state at all" — task **00**, which
#       is the seam's claim (the narrowing runs before `pageState`). This file starts from
#       the state and judges what it says.
#
# FEASIBILITY — checked at source 2026-08-10, at `d71d508`. Five notes, two of them build
# prerequisites:
#   1. **BUILD PREREQUISITE — the loading lane needs a frozen first response.**
#      `withFleetApp` does not plumb `settle`/`holdFromStart`; `withShellComposedFleet`
#      does, and `test/shell-regions.test.mjs:788-830` already freezes the fleet's loading
#      state that way. Scenario 3 is undrivable without one of the two.
#   2. **BUILD PREREQUISITE — a QUIET workspace producer.** No existing fixture publishes a
#      workspace snapshot with zero work items, so "the repo is on the mesh and quiet" has
#      no producer. It must be a REAL published snapshot of a repo with an empty
#      `wiki/work`, never a trimmed payload — a hand-cut status object would prove the copy
#      and nothing about whether production can reach the state.
#   3. **THE PREDICATE UNDERNEATH ROW 2 IS 47/02's, AND IT IS NOW OWNED THERE.** A filter
#      naming a KNOWN-but-quiet workspace leaves that workspace's own `workspaces` row on
#      the narrowed payload, so `isEmptyStatus` answers **false** and the page renders
#      POPULATED — one workspace card above two empty regions — where DG-47-3 requires the
#      `empty (filtered)` card. QA raised it; **47/02 now owns making the emptiness
#      question filter-aware and carries the known-but-quiet workspace as an explicit
#      Examples row.** What this file asserts is the SURFACE consequence only — that the
#      page renders the filtered-empty state and not a populated page of empty regions —
#      so the two contracts meet at the surface rather than both hedging around the middle.
#   4. **AN EDGE DESIGN'S TABLE STILL DOES NOT RULE:** a filter set on an EMPTY mesh. Both
#      sentences are true there ("nothing has published anywhere" and "nothing publishes as
#      `<value>`"), and DESIGN's table only names the unfiltered form of the first.
#      Scenario 1's closing note asserts the property that cannot be wrong — the sentence is
#      true of the payload it was rendered from, and the banner still names the narrowing —
#      and records the choice as one the PO may make either way.
#   5. **THE HEADINGS AND BODIES BELOW ARE BUILDABLE EXACTLY AS SPECIFIED.**
#      `emptyStateCopy` becomes `{ heading, body }` in 47/02, which retires the inline
#      `scope === "local" ? … : …` heading ternary at `Fleet.tsx:1523-1525`; consuming the
#      new shape is this story's one-line change. Before that ruling, a heading assertion
#      here would have been a claim about a string the component invented for itself.
#
# ISOLATION: these suites export a test ARRAY, so `node --test test/<file>` runs ZERO tests
# and reports success (m47 retro). Drive them through a focused runner that IMPORTS the
# array, under `AOF_GLOBAL_HOME=$(mktemp -d)`. NEVER the full suite on this machine; every
# fixture server binds port 0.

@ui @work @design
Feature: three ways of arriving at nothing, three true sentences — and a filtered empty page never impersonates an idle mesh
  In order that an operator looking at an empty fleet can always tell whether the mesh is quiet, their repo is quiet, or their filter matches nothing on this mesh at all
  each way of arriving at nothing renders its own true statement, names the narrowings that produced it, offers one click back to the whole fleet, and never dresses itself as a failure

  Background:
    Given the REAL `<Fleet/>` mounted headlessly against a REAL fleet face
    And a REAL global projection whose contents are chosen per scenario — populated, empty, or holding a published workspace that has published no work

  # HEADLINE. Four conditions, four different sentences, and each says something the other
  # three do not. The last Then is the one that makes this a contract rather than a copy
  # deck: no two of these states may be indistinguishable on screen.
  @executable
  Scenario Outline: each way of arriving at nothing states which fact it is asserting
    Given a projection that <projection> and the fleet opened at <address>
    When the page settles into its empty state
    Then the heading reads <heading>
    And the body reads <body>
    And the recovery control is <action>
    And the banner above the card names every narrowing in force, and nothing else
    And no two of the four states below render the same heading, and none of them renders another's body

    Examples:
      | case                               | projection                                     | address                                  | heading                                     | body                                                                                                                       | action                                        |
      | the mesh itself is idle            | holds nothing at all                           | `/fleet`                                 | `No mesh-enabled workspaces yet`            | today's unfiltered copy, unchanged — `No mesh-enabled workspaces have published yet. Enable mesh on a workspace (config.mesh.enabled) and it will appear here.` | the existing `config.mesh.enabled: true` chip |
      | the repo is on the mesh, and quiet | holds a published workspace with no work items | `/fleet?repo=<that workspace>`           | `Nothing published for this repo yet`       | `<name> is on the mesh but has published no milestones and no nodes. The rest of the fleet is still there.`                 | `Show all repos`                              |
      | the filter matches nothing here    | holds several populated workspaces             | `/fleet?repo=<a value nothing carries>`  | `No repo matches this filter`               | `Nothing on this mesh publishes as <raw value>. It may not have published yet, or the id may belong to another mesh.`       | `Show all repos`                              |
      | the two narrowings do not meet, AND NO MEMBER MACHINE SURVIVES | holds several populated workspaces, and the machine-wide roster names no member of the filtered repo | `/fleet?scope=local&repo=<another repo>` | `Nothing matches Local scope and this repo` | names BOTH narrowings, and says the intersection is what is empty rather than either half of it — and is NOT the unknown-value body, because a scope-narrowed payload was never served the mesh and may not speak for it | `Show all repos`                              |
    # ROW 4's `case` AND `projection` CELLS AMENDED AT BUILD (PO, 2026-08-11, F-47-03-QA-2)
    # under ADR-010. As written the row said `?scope=local&repo=<another repo>` renders
    # EMPTY, full stop. That is true only when the machine-wide roster names no member of
    # the filtered repo — because **the server never narrows the node roster**, so the repo
    # filter is the first narrowing that roster ever receives. When a member machine DOES
    # survive, the page is `populated` and owes the partial-intersection notice, which is
    # scenario 5 below. This row is now the no-survivor half, stated as a condition on the
    # projection rather than left to whichever repo a fixture happens to pick.
    # ROW 2's BODY NAMES MILESTONES AND NODES — the regions this page actually has after
    # ADR-006. Naming boards there would send the operator looking for a region the record
    # deleted, which is why the earlier draft's wording was amended rather than built.
    # Row 2 also depends on 47/02's filter-aware emptiness (FEASIBILITY 3): today's
    # predicate cannot reach this state at all, and this row is where that is visible.
    #
    # ROW 3 IS THE ONE SPEC'S SECOND SENTENCE IS ABOUT. `Nothing publishes as <value>` is a
    # claim about THIS MESH, which is the only claim the client can honestly make: "not
    # published yet" and "no such workspace" are indistinguishable from here, and the copy
    # says which fact it is asserting rather than which one it cannot know.
    #
    # ROW 4 IS ADR-005's INTERSECTION. It is a CORRECT answer, not a fault: the operator asked
    # for the daemon's workspace AND a different repo. The contradiction has to be visible on
    # screen and one click from resolution, and it is never "the last one wins". Its HEADING
    # is pinned; its BODY is not pinned by DESIGN, so the distinguishing property is asserted
    # instead — the one place in this file where QA's no-invented-string rule still bites.
    #
    # A FIFTH COMBINATION EXISTS AND DESIGN STILL DOES NOT RULE IT — a filter set on an EMPTY
    # mesh, where rows 1 and 3 are BOTH true. Whichever the build renders, it must be true of
    # the payload it rendered from and the banner must still name the filter; the choice
    # between them is a PO call, recorded here rather than made in a component.

  # DESIGN binding rail 4, and m45's binding rail 3 applied to a query parameter instead of
  # a path: a filter never rewrites the address behind the operator's back.
  @executable
  Scenario: an unknown filter keeps the address the operator was handed
    Given the fleet is opened at `/fleet?repo=<a value no workspace on the payload carries>`
    When the page settles into its unknown-filter state
    Then the page has written NOTHING to the address — no history entry was pushed and no address was replaced
    And the address still carries the requested value, byte for byte, including its spelling and its case
    And the value is still rendered on screen, in the chip and in the picker's trigger, exactly as it was typed
    And the filter is still IN FORCE — the page has not silently fallen back to showing the whole mesh
    And reloading that same address renders the same state again
    # SILENTLY DROPPING THE VALUE WOULD RENDER THE WHOLE MESH UNDER A FILTER CHIP — "a lie
    # the operator cannot see" (ADR-003) — and silently REWRITING it would take away the link
    # they were handed, which is the one thing a shareable address must not do. A page-level
    # error would be a third wrong answer: it would claim the mesh is broken when it is fine.

  # DG-47-3's easy-to-reverse clause, as its own scenario because a naive build gets it
  # backwards by construction: before the payload lands, "the payload does not carry this
  # id" is trivially true.
  @executable
  Scenario: not yet known is not not found — a valid filter is never accused of being unknown while the payload is still in flight
    Given the fleet is opened at `/fleet?repo=<a workspace the mesh really carries>` with its first status response held
    When the page is read while that response is still in flight
    Then the page is in its LOADING state — the four region placeholders, unchanged
    And the filter is stated in the banner and in the picker, carrying the raw value, in its ordinary neutral form
    And nothing on the page says the filter matches nothing, and nothing carries the unavailable treatment
    And no empty state of any kind is rendered
    When the held response is released and the page settles
    Then the value resolves to the workspace's name in both the chip and the trigger
    And the page is populated, narrowed to that workspace
    And nothing moved when the name resolved: the banner is a full-width row with nothing downstream of it

  # NOTHING FAILED. Three of these four states are produced by the operator's own filter and
  # the fourth by a quiet mesh; none of them is an error, and dressing one as an error
  # teaches an operator to distrust their own address bar.
  @executable
  Scenario Outline: no way of arriving at nothing is dressed as a failure
    Given the page is in the <case> state
    Then it renders no error pill, no `!` mark and no retry control
    And the empty card and the banner above it use none of the words `error`, `failed`, `broken` or `could not`
    # SUBJECT BOUNDED AT BUILD (PO, 2026-08-11, F-47-03-QA-5). This Then read "it uses none
    # of the words", with "it" reading as the page. It cannot be the page: the freshness
    # legend enumerates a `failed` run state in EVERY page state, so a whole-document sweep
    # fails a correct build. The subject is the card and the banner — the two surfaces this
    # scenario is actually about — and the bound belongs in the contract rather than in a
    # test file's header, which is where the build had honestly put it.
    And it renders the same calm dashed card primitive the empty fleet has always used
    And the ERROR state, produced by a face that refuses `/api/mesh/status`, is still visibly different from all of them — it keeps its pill, its mark, its mesh path and its `⟳ Retry <Scope>` control
    And that Retry control's label is unchanged by the filter — a control's label never carries a data-derived value that can be arbitrarily long, and the banner directly above it already names every narrowing in force

    Examples:
      | case                               |
      | the mesh itself is idle            |
      | the repo is on the mesh, and quiet |
      | the filter matches nothing here    |
      | the two narrowings do not meet     |

  # THE FOURTH ANSWER, and it is NOT a nothing — added at build (PO, 2026-08-11,
  # F-47-03-QA-2) under ADR-010 clause 4. This feature was authored before ADR-010 and
  # asked "which nothing is this" of four states; the ruling added a fifth answer that is
  # not a nothing at all, and the milestone's flagship new behaviour had a lane in the
  # suite and NO cell in any contract. That is the gap this scenario closes.
  #
  # WHY IT EXISTS AT ALL: the server never narrows the node roster (it is a machine-wide
  # fact — `global-node-registry.mjs:170-172`, pinned by
  # `acd-mesh-ui-local-filter-preserves-status`), so under `?scope=local` the repo filter
  # is the FIRST narrowing that roster receives. A repo the scope excluded can therefore
  # still have member machines on the payload, and those rows ARE the answer to "which
  # machines are working on this repo". Forcing that page `empty` would hide the very rows
  # the filter surfaced; rendering it as an ordinary populated page would show a PARTIAL
  # fleet masquerading as a whole one. Hence: populated, plus a notice.
  @executable
  Scenario: a partial intersection is POPULATED and says so — the rows that survived are the answer, and the page admits the rest is missing
    Given the projection holds several populated workspaces, and the machine-wide roster names at least one machine that is a member of the filtered repo but NOT of the workspace `scope=local` served
    When the fleet is opened at `/fleet?scope=local&repo=<that repo>`
    Then the page state is `populated`, not `empty` — the surviving rows are what the operator asked for and may not be hidden
    And no empty-state card renders, and in particular the out-of-scope card does not — exactly ONE of the notice and that card ever speaks
    And the surviving machine is RENDERED, by name, in the node region — the claim that the roster is the answer to the filter is not carried by a count alone
    And the regions the intersection emptied keep their headers and read `0 of <N>`, with no per-region empty card
    And the partial-intersection notice renders beneath the chip row, in the banner, stating that the scope narrowing carries none of this repo's work and only the machines carrying it
    And that notice is an explanation and never a control — no border, no box, no glyph, no role, not focusable, and it is not a button
    And a build that gated the roster by the served `workspaceId` before the repo filter would render this page WITHOUT the surviving machine — that is ADR-010's rejected clause 3, and this scenario is the producer-fed gate on it
    # THE LAST THEN IS THE NON-VACUITY HALF and it is the reason this scenario needs a
    # foreign-workspace node on the fixture rather than merely a multi-workspace one. With
    # only a node that belongs to BOTH the served workspace and the filtered repo, the
    # refused build renders a byte-identical page and the lane passes over it. ADR-010's own
    # §Consequences names this: the local fixture must carry a multi-workspace AND a
    # foreign-workspace node, and "(ii) is the non-vacuity half and is the one that matters".

  # THE WAY OUT, from the state where the operator is most likely to be stuck.
  @executable
  Scenario Outline: every filtered empty state is one click from the whole fleet, and the click does not reload the page
    Given the page is in the <case> state at <address>
    When the promoted `Show all repos` control is used
    Then the page renders the unfiltered fleet — every workspace's facts are back
    And the banner is gone and occupies zero height
    And the picker reads `All repos`
    And no page reload and no remount occurred, and the app made no additional status request beyond its ordinary poll
    And <what happens to the other narrowing>

    Examples:
      | case                               | address                                   | what happens to the other narrowing                                       |
      | the filter matches nothing here    | `/fleet?repo=<a value nothing carries>`   | there is no other narrowing to keep                                        |
      | the two narrowings do not meet     | `/fleet?scope=local&repo=<another repo>`  | `scope=local` is UNTOUCHED — clearing one narrowing never clears the other  |
      | the repo is on the mesh, and quiet | `/fleet?repo=<a quiet workspace>`         | there is no other narrowing to keep                                        |
    # ROW 2 IS ADR-005's "NEITHER CONTROL CLEARS THE OTHER" seen from the recovery button. A
    # `Show all repos` that also reset the scope would be a control doing two things, one of
    # them unasked for — and the operator would have no way to tell which of their two
    # narrowings the page had just discarded.

  # ── the human gate ─────────────────────────────────────────────────────────────────────
  @uat @design
  Scenario: the three empty renders read as three different true statements rather than three copies of one card
    Given renders of `/fleet` on an empty mesh, `/fleet?repo=<a quiet workspace>`, `/fleet?repo=<a value nothing carries>` and `/fleet?scope=local&repo=<another repo>`, at 1280 and at 390
    When the designer judges them against DESIGN §Surface 2's empty-state table and the binding checklist
    Then an operator reading any one of them, with no other context, can say which of the four situations they are in
    And the banner stands above all four, naming every narrowing in force
    And the unknown-filter card takes the house dashed absent/not-yet treatment — dashed tile, dashed border, the raw value in mono — and carries no `accent`, no `destructive` and no `!` mark
    And the `Show all repos` control is the product's existing recovery-button ramp, the same one `⟳ Retry` uses, and reads as a way forward rather than as an apology
    And none of the four reads as an error, a loading state or a crash
    And the composed heading names both narrowings without reading as a scolding
    And nothing on any of the four animates
    And the verdict names which conformance source it judged against — `mocks/filtered-empty.png` and `mocks/filter-unknown.png` where committed, DESIGN's binding checklist until they land
    And the verdict is CONFORMS or names a specific GAP
    # A MISSING MOCK IS NEVER GROUNDS FOR INCONCLUSIVE: DESIGN's binding checklists are the
    # mandatory baseline until the frames land, and `mocks/filter-unknown.png` is named in
    # that document as NOT optional — it is the frame SPEC's second sentence is about. A
    # remote design-tool link is never a substitute; the reviewer is read-only and cannot open
    # one. INCONCLUSIVE is reserved for a RENDER that could not be produced, and it must name
    # the route, the origin, the width and the state that is missing.
