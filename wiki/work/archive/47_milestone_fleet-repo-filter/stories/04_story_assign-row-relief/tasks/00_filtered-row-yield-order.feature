<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 47/04, ADR-008 + DG-47-2: THE RELIEF, TAKEN AS AN AMENDMENT TO A
# KNOWN LANE. Under a repo filter region 5 drops the workspace-name column on every card,
# and the row that results is the geometry the surface ALREADY renders when the name is
# dropped by its fit budget. The yield order is not touched, no budget moves, and every
# existing unfiltered lane stays green. This task varies THE FILTER, THE NAME'S LENGTH,
# THE TARGET'S LENGTH and THE PRESENCE OF AN ASSIGNMENT; it changes nothing about which
# cards render (story 03) and nothing about what the URL means (story 02).
#
# WHAT IS ACTUALLY BEING CHANGED, in one sentence, because the code is three lines and
# the contract is nine design gaps. Today the drop is `!!assignment && workspaceName
# .length > REGION5_NAME_BUDGET_CH` (`Fleet.tsx:569`, budget `= 8` at
# `assign-affordance.mjs:198`) and that ONE boolean feeds both the render (`:711-713`) and
# DG-22's alignment consequence (`:714`), decided together on purpose so the two cannot
# disagree. ADR-008 EXTENDS that boolean — *dropped when the view is repo-filtered, OR
# when the existing chip-pressure fit budget says so* — and refuses a second gate anywhere
# else. Conceptually the row gains one reason to drop, not one more branch.
#
# LITMUS: every Then below is confirmable by an outsider without reading source. Two
# channels, both already built, and each scenario says which one it is on:
#   (1) THE RENDERED TREE — the REAL, unmodified production `<Fleet/>` mounted headlessly
#       against a REAL `mesh ui` fleet face (`test/support/fleet-app-harness.mjs` over
#       `react-app-harness.mjs` / `mini-react.mjs`), read back with `findAll` / `textOf`.
#       `test/fleet-assign-row-geometry.test.mjs`'s own `region5()` helper (`:112-150`)
#       already addresses every element this task talks about, and it addresses the
#       workspace name BY IDENTITY rather than by position (`:129-131`) *precisely because
#       DG-16 made the name conditional* — so "the name is absent" cannot silently pass
#       against the wrong element. Nothing below needs a new addressing idiom.
#   (2) A REAL BROWSER RENDER — for the `@uat` lane only, and for exactly the claims
#       channel (1) structurally cannot make (below).
#
# WHAT THE HEADLESS CHANNEL CAN AND CANNOT SEE — settled at source while authoring, and
# it is the reason this task has two lanes rather than one. `mini-react.mjs` is a
# whole-tree synchronous renderer over plain objects: there is NO layout engine, no CSS,
# no box model, no `getBoundingClientRect`, and its `document` is a listener registry
# (`react-app-harness.mjs:269-306`). So it CAN see: which elements region 5 renders, in
# what order, with which `className` / `style` / `title` / text; whether the name element
# exists at all; whether the tail element exists; whether the drill-in rendered its words;
# what the chip's `title` carries. It CANNOT see: a pixel width, whether `truncate`
# actually clipped anything, whether an ellipsis was painted, or whether two elements
# overlapped. DG-13 clause 5's SIXTH clause — *no two elements in region 5 may occupy the
# same pixels* — is therefore proxied here by the shrink/min-width facts the existing
# lanes already assert, and is JUDGED for real only in the `@uat` lane. This is the
# geometry suite's own stated boundary (`fleet-assign-row-geometry.test.mjs:44-49`: the
# lanes are class/structure facts and *"not a PIXEL verdict"*) and ADR-008 restates it:
# *"a render verdict is OWED and is NOT claimed here."*
#
# THE DG-20 DISCHARGE IS THE ARGUMENT THIS WHOLE CONTRACT RESTS ON, so it is written here
# as a testable rail rather than left in prose. DG-20 forbids gating the name on
# chip-presence, because that makes ABSENCE-OF-NAME a second, accidental signal for *"this
# card has an assignment"* — a fact about ONE card, already spoken by the chip. DG-47-2
# discharges the objection for the filtered case on three grounds, all of which are
# properties of the PAGE and not of a card: the absence applies to EVERY card equally, it
# is stated in full in the banner one region above (R0, story 03), and the repo it names
# is the same string every card would have rendered. The discharge holds ONLY IF THE DROP
# IS GENUINELY UNCONDITIONAL. ADR-008 rejects "drop when the filter is active AND the chip
# is present" BY NAME as DG-20's own defect re-entered from the other direction — and that
# rejected shape is exactly what a careless build produces, because the existing
# expression already opens with `!!assignment &&` and the cheapest edit keeps it there.
# **Scenario 2's unassigned-card rows are the whole reason this feature is long.** A build
# that drops the name only on cards carrying a chip passes every other scenario here.
#
# NOT ASSERTED HERE — and each has a named owner:
#   - WHERE THE PREDICATE LIVES. ADR-008 gives it one home as a pure function beside the
#     budget it reads. That is a placement claim, it is a source read, and it belongs to
#     review + the `acd-*` family — never to a Then. What this feature asserts is the half
#     placement cannot see: that ONE decision drives both the render and the alignment, and
#     that it answers the same way for every card on the page.
#   - THE URL CONTRACT AND THE NARROWING. `?repo=<workspaceId>`, absent/blank/malformed/
#     unknown/repeated, and `filterToWorkspace` itself are story 02 (ADR-003); applying the
#     narrowing once above the region fan-out is story 03 (ADR-004). Below, "the view is
#     repo-filtered" is an INPUT — the address carries the card's own workspaceId — never
#     a claim.
#   - THE BANNER, THE PICKER, THE CHIP AND THE THREE EMPTY STATES. DG-47-1 and DG-47-3,
#     story 03. Scenario 6 judges that the banner is PRESENT above the filtered cards,
#     because DG-20's discharge depends on it being there — but its copy, its form and its
#     `✕` are 03's contract, not this one's.
#   - REGION 6. The assign affordance's own geometry (DG-13 clauses 1–4, DG-17, DG-21) is
#     untouched by this change and stays exactly where it is asserted today.
#   - ANY PIXEL VERDICT — the `@uat` lane, scenarios 6 and 7.
#
# THE a11y LANE IS OFF, AND THAT IS THE DECISION, NOT AN OVERSIGHT. `.aof/aof.config.json`'s
# `work.tags.domains` carries no `a11y` entry and there is no `work.ui.a11y` block, so the
# opt-in automated lane is off: THERE IS NO axe-core RUN IN THIS STORY AND NO a11y FINDING
# WILL COME FROM ONE. One accessibility consequence of this change is real and is therefore
# HUMAN judgement in scenario 6: the dropped name's `title` (`Fleet.tsx:712`) leaves with
# the element, so the fact must still be recoverable — it is, from the banner and from the
# Workspaces card, which is DG-16's own reason for permitting the drop at all.
#
# TAGGING. Layer / refinement / domain sit on the Feature and are inherited by every
# Scenario (the milestone's own convention — see `47/01/tasks/00_board-link-resolved
# .feature`); each Scenario carries its own lane tag, and the `@uat` pair re-states
# `@design` because the verdict is a designer's.
#
# FEASIBILITY — checked at source 2026-08-10 at `d71d508`. Four notes; one is a real
# prerequisite and one is a finding the build must not paper over.
#   1. THE MOUNT IS ALREADY FILTERABLE. `withFleetApp({ url, search })` passes `search`
#      straight into the mounted app's `location` (`react-app-harness.mjs:311`), and
#      `<Fleet/>` reads the address through `safeSearch()` (`Fleet.tsx:113,256`). A
#      filtered mount is the existing call with the repo parameter in `search`. No harness
#      change.
#   2. THE MULTI-CARD FIXTURE ALREADY EXISTS. `withTwoWorkspaceAssignFixture`
#      (`test/support/mesh-ui-assign-fixture.mjs`) publishes FOUR workspaces; workspace A
#      is named `control` (7 characters — INSIDE the 8-character budget, so its name
#      renders today) and carries TWO milestone cards (refs "18" and "31") with `worker-a`
#      published and assignable. Filtering to A therefore yields two cards in one repo,
#      one of which can hold a REAL minted assignment and one of which cannot — which is
#      scenario 2's unassigned-card row, producible with no new fixture at all.
#   3. PREREQUISITE — THE ONE THING THAT DOES NOT EXIST. `withPublishedAssignFixture`
#      hard-codes its workspace name as `demo` (4 characters), so THE TREE CANNOT TODAY
#      RENDER A NAME LONGER THAN THE BUDGET ON A CARD THAT ALSO CARRIES A REAL ASSIGNMENT.
#      It needs one additive option — a `name` passed through to the fixture's own
#      `.aof/aof.config.json` — in the same family as the existing `nodes` / `scope`
#      options. That is a test-support change, not a production one, and without it
#      scenarios 3 and 4 cannot be driven at all. If it turns out to be more than one
#      option, ADR-008's own instruction applies: *"If the filtered lane cannot be
#      expressed through the existing harness, that is a signal the change is bigger than
#      it looks and it comes back here — not a licence to skip the lane."*
#   4. FINDING F-47-04-QA-1, AND IT CHANGES HOW THE WORD "BYTE-IDENTICAL" MUST BE PROVED.
#      ADR-008 and DG-47-2 both say the filtered row is *"byte-identical to today's
#      `nameDropped === true` geometry"* — but **no lane in `fleet-assign-row-geometry
#      .test.mjs` renders that branch today.** Every lane that mounts the surface runs over
#      `withPublishedAssignFixture`, whose workspace is `demo` (4 ≤ 8), and the two lanes
#      that assert on region 5 assert the OPPOSITE case on purpose: DG-20's fit gate, *"a name
#      that FITS keeps rendering beside the chip"* (`:614-622`). So `nameDropped === true`
#      is, on the rendered tree, an UNEXERCISED branch, and "identical to today's geometry"
#      is today a claim about something with no green lane behind it. The fix is cheap and
#      it is scenario 3: render both branches and COMPARE them, so the amendment is
#      demonstrated rather than asserted. Note the happy consequence — prerequisite 3 buys
#      the milestone a lane the geometry contract has been missing since DG-16 was written.
#   5. THE GEOMETRY SUITE TODAY: eleven lanes, of which exactly TWO assert on region 5 (DG-13
#      clause 5 + DG-15/DG-16, and DG-19's tail drop). The other nine are region-6 and
#      pure-helper lanes that this change cannot reach. Scenario 5 is what makes "every
#      existing unfiltered lane stays green" a checkable claim rather than a hope, and it
#      is deliberately expressed WITHOUT reference to a diff.

@ui @work @design
Feature: under a repo filter region 5 stops spending its width on the repo name every card already shares, and spends it on the target instead
  In order that the fact the operator came for — WHICH NODE this work is going to — is the one that survives the truncation, instead of the one that gets cut in favour of a repo name the page already states in full
  a repo-filtered fleet must drop the workspace-name column from every milestone card's footer, unconditionally and for the duration of the filter, yielding the row the surface already renders when the name is dropped by its budget — with the yield order, every threshold and every unfiltered lane untouched

  Background:
    Given a REAL `mesh ui` fleet face over an isolated global projection (a fresh AOF_GLOBAL_HOME), with a published workspace, a published worker node and a resolvable milestone
    And the REAL, unmodified production `<Fleet/>` mounted headlessly against that face
    And every assignment is MINTED BY A REAL CLICK through the REAL `POST /api/mesh/assign` — never a hand-seeded row, which judges the chrome and never the feature
    And "the view is repo-filtered" means the mounted address carries the repo parameter naming that card's own workspaceId — story 02's contract, an input here
    And every Then in a headless scenario is read off the rendered tree the component actually produced, never off a source file

  # HEADLINE 1 — THE DROP ITSELF, over the two things that decide it today and the one
  # that decides it now. The unfiltered rows are the CONTROL: they are the behaviour that
  # ships, they must be unchanged, and without them the filtered rows prove only that
  # something drops names.
  @executable
  Scenario Outline: whether region 5 renders the workspace name, filtered and unfiltered, either side of the budget
    Given a workspace named <workspace name> (<length> characters, against the 8-character region-5 name budget)
    And the card <assignment>
    And the view is <filter>
    When region 5 of that card is read off the rendered tree
    Then the workspace name is <name in region 5>
    And whatever it renders it renders WHOLE — there is no stub, no prefix and no ellipsised fragment of a workspace name anywhere in region 5
    And the separator that would have followed the name is absent whenever the name is

    Examples:
      | case                                                                  | workspace name      | length | assignment              | filter        | name in region 5 |
      | TODAY, UNCHANGED — a short name fits beside a chip (DG-20's fit gate)  | "demo"              | 4      | carries a real chip     | unfiltered    | present          |
      | TODAY, UNCHANGED — no chip, no pressure, so no drop                    | "demo"              | 4      | carries no assignment   | unfiltered    | present          |
      | TODAY, UNCHANGED — the budget's boundary, INCLUSIVE                    | "demo-app"          | 8      | carries a real chip     | unfiltered    | present          |
      | TODAY, UNCHANGED — one character past it, dropped whole (DG-16)        | "demo-apps"         | 9      | carries a real chip     | unfiltered    | absent           |
      | TODAY, UNCHANGED — a long name with NO chip still renders              | "lark-guard-portal" | 17     | carries no assignment   | unfiltered    | present          |
      | THE CHANGE — a name that fits is dropped anyway under the filter       | "demo"              | 4      | carries a real chip     | repo-filtered | absent           |
      | THE CHANGE, AND THE DG-20 RAIL — no chip on the card, still dropped    | "demo"              | 4      | carries no assignment   | repo-filtered | absent           |
      | THE BUDGET IS NOT CONSULTED — the boundary stops mattering             | "demo-app"          | 8      | carries a real chip     | repo-filtered | absent           |
      | ALREADY DROPPED, AND STILL DROPPED — the filter adds no new outcome    | "lark-guard-portal" | 17     | carries a real chip     | repo-filtered | absent           |
      | ALREADY DROPPED FOR A NEW REASON — long name, no chip, now absent      | "lark-guard-portal" | 17     | carries no assignment   | repo-filtered | absent           |
    # ROWS 3 AND 4 ARE THE BUDGET, PINNED FROM BOTH SIDES. A build that changed `>` to `>=`
    # while it was in the expression would pass every other row in this table.
    #
    # ROWS 5 AND 7 ARE THE PAIR THAT MATTERS MOST, and they are the same card in the two
    # views. Row 5 is why the current expression opens with `!!assignment &&`; row 7 is why
    # the filtered half must NOT. A build that writes `!!assignment && (filtered || over
    # budget)` — the cheapest possible edit, and the one ADR-008 REJECTS BY NAME — passes
    # rows 1-6 and 8-9 and fails only rows 7 and 10. Those two rows are DG-20's covert
    # signal, caught: if the name went missing only where a chip appeared, an operator
    # scanning a filtered page would learn "this card has an assignment" from a blank
    # column, which is the exact defect DG-20 closed and DG-47-2's discharge assumes is
    # impossible.
    #
    # ROW 9 IS THE NON-EVENT, and it is here so the contract says out loud that the filter
    # is allowed to change nothing on a card that was already relieved.

  # HEADLINE 2 — WHAT MAKES DG-20's DISCHARGE TRUE RATHER THAN ARGUED. The discharge rests
  # on the absence being a property of the PAGE. That is a claim about several cards at
  # once, so it cannot be made on one card, and it is the one thing a single-card fixture
  # structurally cannot express — the same lesson BLOCKER F21 taught this surface.
  @executable
  Scenario: under a filter every card on the page reads the same way, and absence-of-name says nothing about any individual card
    Given a repo whose cards include one carrying a real minted assignment and one carrying none
    And the view is repo-filtered to that repo
    When every rendered card's region 5 is read
    Then NO card renders a workspace name — the count of workspace-name elements on the whole page's cards is zero
    And the assigned card and the unassigned card are indistinguishable in that respect: absence-of-name identifies neither
    And the assigned card is still the only one carrying an assignment chip — the chip remains the single, sufficient statement of that fact
    And each card's attention cluster is the row's LEADING group, left-aligned, with only the drill-in pushed right — the same alignment on every card, so the footer's leading edge does not drift card to card (DG-22)
    And the UNASSIGNED card's footer is still a legible row and not an empty one — it carries its secondary token and its right-aligned drill-in, and the muted `·` placeholder is still there to stand in for the token it has not got (DG-19)
    And the same page rendered UNFILTERED renders the workspace name on BOTH cards
    # THE LAST CLAUSE IS THE NON-VACUITY CHECK for the whole scenario: the fixture's
    # workspace name is inside the budget, so if the unfiltered render did not show it the
    # filtered render's absence would be proving nothing at all.

  # HEADLINE 3 — "BYTE-IDENTICAL TO TODAY'S `nameDropped === true` GEOMETRY", PROVED BY
  # COMPARISON. ADR-008's central claim is an equivalence, and an equivalence asserted one
  # side at a time is not an equivalence. See FINDING F-47-04-QA-1 in the header: the
  # right-hand side of it has no rendered lane today, so this scenario renders BOTH and
  # compares them element by element. It is also the cheapest possible guard against the
  # thing SPEC forbids outright — a silent divergence between the render and the suite.
  @executable
  Scenario Outline: the filtered row and the budget-dropped row are the same row, and the only difference the filter makes is the one it is supposed to make
    Given <render A> and <render B>, over the same node id, the same milestone and the same freshly minted assignment
    When the two region-5 footers are compared element by element
    Then <expected difference>
    And every OTHER fact about the two footers is identical: the same child elements in the same order, the same alignment on the cluster, the same drill-in split into shrinkable words plus a pinned arrow, the same tail treatment — absent in BOTH, since DG-47-7 retires it from the row entirely — the same yield ordering, and the same rendered text

    Examples:
      | case                                                                 | render A                                              | render B                                             | expected difference                                                        |
      | THE EQUIVALENCE — one fixture, one dataset, two addresses            | a 17-character name, UNFILTERED (dropped by budget)   | the same card, repo-FILTERED                         | there is NO difference: neither renders a name, and the footers match       |
      | THE EQUIVALENCE ACROSS THE TWO REASONS TO DROP                        | a 17-character name, UNFILTERED (dropped by budget)   | a 4-character name, repo-FILTERED (dropped by filter) | there is NO difference in region 5 — one geometry, reached two ways         |
      | THE DELTA — the control that keeps the two rows above non-vacuous     | a 4-character name, UNFILTERED (rendered)             | the same card, repo-FILTERED                         | EXACTLY ONE: render A carries the workspace-name element and render B does not; the cluster's alignment differs accordingly, and nothing else does |
    # ROW 3 IS WHAT STOPS ROWS 1 AND 2 BEING SATISFIED BY A BUILD THAT NEVER RENDERS A NAME
    # AT ALL. Without it, "the two footers match" is trivially true of a surface that
    # deleted the column outright — which is not this decision, and which would take the
    # name off every unfiltered card on the fleet.
    #
    # "IDENTICAL TEXT" IS SAFE TO CLAIM ACROSS FIXTURES because the chip's tail is read
    # from the rendered chip's own `title`, both renders are taken immediately after their
    # own click, and the assignment ramp's `when` reads the same in both. If a lane ever
    # finds it does not, the tail's value is the thing to normalise — never the comparison
    # to weaken.

  # HEADLINE 4 — THE YIELD ORDER IS NOT TOUCHED, AND NO BUDGET IS RELAXED. This is the
  # half of ADR-008 that is most easily lost, because it is the half where nothing is
  # supposed to happen: the filter frees width, and the freed width goes where the ladder
  # already sends it. A build that "helped" by loosening a threshold now that there is
  # room would be re-tuning a MEASURED number for an UNMEASURED reason.
  @executable
  Scenario Outline: under the filter the row yields in the stated order — tail first, then the drill-in's words, then the target last — and each threshold answers exactly as it does unfiltered
    Given a repo-filtered view of a card assigned to a node named <target node id> (<target length> characters)
    When region 5 is read off the rendered tree
    Then the chip's `· <when>` tail is NOT RENDERED — retired as a member of region 5 by DG-47-7, at this width and at every other
    And the drill-in renders <drill-in>
    And the secondary token, on a card that carries one, renders <secondary>
    And the chip's `→ <target>` renders the node id IN FULL, and it is the LAST element to give way
    And nothing anywhere in region 5 has been ellipsised to a fragment
    And the chip's own `title` carries the whole `→ <target> · <when>` on EVERY card, unconditionally — whether or not a tail could ever have fitted, since after DG-47-7 it is the SOLE carrier of the assignment's age
    And the SAME data rendered UNFILTERED yields the SAME answers — the filter frees width, it does not move a threshold

    Examples:
      | case                                                                | target node id                   | target length | cluster        | drill-in                                   | secondary                                           |
      | room for everything — the ordinary row                              | "worker-a"                       | 8             | two children   | its full words plus the pinned `→`         | — (this card carries no secondary token)            |
      | THE SEAM — `→ <target>` is exactly 12, the two-child budget         | "worker-abc"                     | 10            | two children   | its full words plus the pinned `→`         | —                                                   |
      | ONE PAST THE SEAM — `→ <target>` is 13                              | "worker-abcd"                    | 11            | two children   | the pinned `→` ALONE, its words in `title` | —                                                   |
      | THE THIRD CHILD — arity ALONE takes the words, at any target length | "worker-a"                       | 8             | three children | the pinned `→` ALONE, its words in `title` | its full words, `◔ 1 in review`                     |
      | RUNG 3 — past 13, the secondary gives up its WORDS too              | "umamis-mac-mini-build-agent-02" | 30            | three children | the pinned `→` ALONE, its words in `title` | its pinned glyph and count, `◔ 1`, words in `title` |
    # AMENDED 2026-08-12 (PO) — ADR-014 and DG-47-7, and the amendment is recorded rather than
    # applied silently. The table this replaces was derived from two budgets (41 and 31) that
    # were themselves derived from the 360.66px row the card takes at EXACTLY ONE viewport.
    # Measured against the shipped stylesheet, the card's band is 286…368.66 and NON-MONOTONE —
    # 1024 gives a WIDER card than 1056 — so a threshold keyed to 1280 was never a threshold.
    # ADR-014 re-derives every one of them from the grid's own floor row
    # (`REGION5_ROW_FLOOR_PX = 286`), and DG-47-7 retires the tail from the row altogether.
    #
    # THE ARITHMETIC IS STILL THE CONTRACT'S OWN, and an outsider can check every row: the
    # drill-in gives up its words once `→ <target>` exceeds 12 in a TWO-child cluster and
    # UNCONDITIONALLY in a three-child one; the secondary gives up its words once `→ <target>`
    # exceeds 13. `→ <target>` is the target's length plus two, which is why row 2 (10
    # characters) sits exactly ON the seam and row 3 (11) one past it.
    #
    # THE CLUSTER IS THE NEW AXIS, and it is the axis the old table did not have. The cluster has
    # THREE children whenever the card carries an assignment AND either work in review or a done
    # milestone — the condition under which `Open board` was rendering 23px of the 65px it needs
    # (F-47-04-QA-8, the blocker this amendment closes). Rows 4 and 5 are that case; rows 1-3 are
    # the two-child row the old table walked. NO ROW ASSERTS A TAIL, because after DG-47-7 no row
    # can — its `when` and `note` are carried whole by the chip's `title`, which the Then above
    # now pins unconditionally rather than per-row.
    #
    # AN UNASSIGNED CARD IS DELIBERATELY NOT A ROW HERE. With no chip there is no target,
    # no tail and no chip pressure, so it has no place in a table about who yields to the
    # target; what it owes under a filter — a footer that is still a legible row rather
    # than an empty one — is asserted in scenario 2, where the other cards on the page are.

  # HEADLINE 5 — THE REGRESSION HALF, MADE CHECKABLE. SPEC and STORY both name the same
  # single forbidden outcome: a silent divergence between the render and the suite. That
  # deserves a Then, not a hope — and one an outsider can confirm without a diff.
  @executable
  Scenario: the geometry contract gains a lane and loses none, and no budget moved to collect the freed width
    Given the fitness-locked geometry suite as it stands before this change — eleven lanes, of which two assert on region 5
    When the suite is run after this change lands
    Then every lane name that existed before still exists, and every one of them passes
    And the suite has GAINED at least one lane, whose name says it is about the filtered row — the amendment is visible in the run, not only in the file
    And no pre-existing lane's expected value has changed: the same fixtures produce the same rendered facts they produced before
    And reading the three region-5 budgets back from the module that exports them gives 8 / 12 / 12 — the name budget UNMOVED, and the chip slot and the drill-in abbreviation point RE-DERIVED DOWNWARD by ADR-014 (they read 41 and 31 when this clause was written, each derived from the 360.66px row the card takes at exactly one viewport). A budget that moves DOWN is a tightening — nothing that dropped before renders now — so ADR-008's "no budget is relaxed to collect the freed width" is applied to itself rather than weakened
    And the assign affordance's own region-6 lanes — the fixed action width, the picker floor, the message ladder and the coded refusals — are untouched in expectation and in outcome
    # THE BUDGETS ARE READ BACK RATHER THAN INSPECTED. They are exported values; an
    # outsider imports the module and reads three numbers. "No budget is relaxed" is
    # ADR-008's own wording, and this is the one clause in the whole feature that would go
    # quietly wrong: a filtered row that fits because someone raised 41 to 48 would look
    # exactly like a filtered row that fits because the name left.

  # ────────────────────────────────────────────────────────────────────────────────────
  # THE HUMAN GATE. Everything above is a class/structure fact. Whether the operator can
  # now READ the target they could not read before is a claim about pixels, and it is the
  # story's entire benefit — "challengeable and measured, not asserted", as STORY.md puts
  # it. ADR-008 owes this render explicitly and does not claim it.
  #
  # BROWSER LANE (QA-OWNED). QA runs the render and drives the harness; the designer judges
  # the screenshots it is handed and has no `Bash`. Per the house design-render discipline
  # `npx playwright` is POLICY-BLOCKED — the render drives the cached ms-playwright
  # Chromium directly (`--headless=new --screenshot=<ABSOLUTE forward-slash path>`). The
  # fleet is the fixed-port origin `http://127.0.0.1:4181/`. THE a11y LANE IS OFF (see the
  # header): no axe-core run, no a11y finding from one.
  #
  # THE WIDTHS ARE NOT THE PAGE'S WIDTHS, AND THIS IS THE THING TO GET RIGHT. A milestone
  # card is viewport-INVARIANT by construction: the grid is `repeat(auto-fill,
  # minmax(320px,1fr))` with a 16px gap inside a `max-w-[1240px]` column padded `px-4` /
  # `sm:px-8` (`Fleet.tsx:503`, `:440-441`), so a wider viewport buys COLUMNS, not width.
  # Computed from those declared values — ESTIMATES WHICH THE RENDER MUST CONFIRM, exactly
  # as DESIGN handles its own arithmetic — the card's inner row measures roughly 371px at
  # 1440, 363px at 1280, 326px at 390, and 312px at 768. Two consequences, and both belong
  # in the review rather than in a footnote:
  #   (a) 1280 is where every region-5 budget was DERIVED (the judged render's 360.66px
  #       row), so it is the width at which the contract is self-consistent by
  #       construction;
  #   (b) **768 is where the card is NARROWEST — some 48px, about eight mono characters,
  #       tighter than the row the budgets were measured against** — and ADR-008 names only
  #       1280 and 390. That is FINDING F-47-04-QA-2: the width most likely to falsify the
  #       relief is the one nobody asked for. It is added below rather than raised as a
  #       defect, because adding a row costs a render and finding out later costs a
  #       milestone.
  @uat @design
  Scenario Outline: a human judges whether the filtered row actually spends the freed width on the target
    Given the fleet is rendered UNFILTERED and then repo-FILTERED, over the same repo, the same card and the same assignment, at <width>
    And the assigned card's target is a node id long enough that the unfiltered render truncates it — the condition every judged render of region 5 has met since DG-13 was raised
    When QA captures both renders, measures the card's content-box width and the rendered width of `→ <target>` in each, and hands the screenshots and the numbers to the designer
    Then the designer judges the pair against DESIGN DG-47-2's tabled yield order and returns CONFORMS or names the GAPS
    And in the filtered render the workspace name is absent from every card's footer, and no gap, separator or empty column is left where it was
    And the target reads further in the filtered render than in the unfiltered one — the measured widths say by how much, and a filtered render that reads NO further is the finding this lane exists to catch
    And no two elements in region 5 occupy the same pixels — the clause DG-15 raised and the one no headless lane can see
    And nothing has left the card's content box, and the page has grown no horizontal scrollbar
    And every footer on the page has its leading group on the same x position — DG-22's alignment, judged across cards rather than within one
    And no card shows a `· <when>` tail at any width, and the reviewer RECORDS whether the chip's hover-only `title` is an acceptable channel for the assignment's age — DG-47-7's named residual, and this is the only gate on it
    And a card whose cluster carries THREE children renders `Open board`'s words WHOLE or not at all — never the 23px-of-65px prefix F-47-04-QA-8 was raised for, which is the frame this lane exists to re-judge
    And <what to check hardest at this width>

    Examples:
      | width | what to check hardest at this width                                                                                                          |
      | 1280  | **RE-AIMED 2026-08-12 (ADR-014).** This width's ~360.66px row is what the OLD budgets were derived from, and that WAS the defect — the card's band is 286…368.66 and non-monotone. Every budget now derives from the 286px FLOOR, so 1280 is where the row should read most generous: a GAP here means the floor-derived ladder is too austere, which is DG-47-7 RULING 2's rejected lever rather than a build defect |
      | 390   | the narrow rail DESIGN's own breakpoint table names — one column, so counter-intuitively a WIDER card (~326px) than 768's two-column layout gives; also where the banner above it is most likely to wrap |
      | 768   | **THE ADDED ROW (F-47-04-QA-2)** — two columns make this the NARROWEST card on the surface, ~48px tighter than the row the budgets were measured against. If the relief fails anywhere it fails here |
      | 1440  | the WIDEST card, where the relief should be most visible and where a build that quietly kept the column would be most obvious                  |
    # THE UNFILTERED RENDER IS NOT A COURTESY — it is the baseline the benefit is measured
    # against, and without it "the target reads further" is unfalsifiable.

  # THE DISCHARGE, JUDGED RATHER THAN ARGUED — plus the two gates every design review in
  # this house carries.
  @uat @design
  Scenario: the absence of the name reads as a property of the page, and the review never guesses from source
    Given the filtered renders from the scenario above
    When the designer judges them against DG-47-2's discharge of DG-20's covert-signal objection
    Then the repo the page is narrowed to is named IN FULL above the cards — in the filter banner and in the Workspaces card — so the fact the footer stopped repeating is still on screen, once
    And an operator reading the page cannot mistake the missing column for a statement about any individual card: it is missing from all of them, including the ones with no assignment
    And nothing else about the card has changed — same status ring, same badge, same status chip, same progress track, same story dots, same assign affordance, same divider and padding rhythm in the footer
    And nothing animates, appears or transitions as the filter goes on or comes off: a filter is a view, not an event
    And absent a render the verdict is INCONCLUSIVE naming the missing render — the origin, the width and the state it was supposed to show — never inferred from component source
    And a missing mock is NEVER grounds for INCONCLUSIVE: DESIGN's binding checklist is the mandatory baseline until `mocks/` lands, and a committed mock that KEEPS the name in region 5 is a legitimate PO override and the CHEAPER answer, because it changes no test (DESIGN §Open questions 5)

  # THE BASELINE HAND-OFF. Stated once, so the follow-on has somewhere to attach — and
  # because this row is motion-free by design, which is what makes a screenshot a complete
  # lock on it.
  @uat @design
  Scenario: an approved filtered render becomes the visual-regression baseline
    Given the designer has judged the filtered region-5 renders CONFORMS at every width above
    When the approved renders are recorded
    Then each becomes the baseline QA's `toHaveScreenshot` visual-regression compares future renders against
    And a later render that drifts from an approved baseline is a QA finding, routed like any other
    And building those baselines out into a hard gate is a QA-owned follow-on, explicitly out of scope for this story
