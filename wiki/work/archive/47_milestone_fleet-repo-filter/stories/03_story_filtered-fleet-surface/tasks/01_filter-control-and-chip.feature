<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 47/03, ADR-007 + DESIGN Surface 1: the repo picker is contributed
# into the SHELL'S SURFACE SLOT beside the scope control and is mounted in EVERY page
# state; it reads `▾ All repos` at rest; its options are the payload's own workspaces and
# nothing else; and the "filtered by" chip lives in the PAGE (R0), above the state
# ternary, carrying the first of the filter's two clear doors.
#
# THE INVARIANT THIS TASK INHERITS RATHER THAN INVENTS. `acd-mesh-ui-scope-visible` has
# pinned since m34/ADR-006 that the scope control is mounted ABOVE the
# loading/error/empty/populated ternary — "not inside a body region that swaps out under
# load/error/empty". `Fleet.tsx:220-227` is where that is true, and the filter takes the
# same position by the same mechanism (`<SurfaceSlot>`, `Fleet.tsx:306-332`). So the
# expensive half of this task is already load-bearing in a committed fitness function;
# what is NEW is that a SECOND control now depends on it, and that the chip which explains
# an empty page is hoisted the same way (DG-47-1). Scenario 1 is where the second subject
# is asserted behaviourally; the arch test's own second subject is its author's business,
# not a Then here.
#
# WHY THE CONTROL AND THE CHIP ARE IN THIS ONE FILE THOUGH THEY LIVE IN TWO PLACES ON
# SCREEN. They are one fact with two homes by DESIGN's own ruling — the bar says WHAT the
# filter is set to, the page says WHY you are looking at what you are looking at — and the
# rule that makes the split safe ("the trigger may truncate at 18ch only because the
# banner one region below renders the name IN FULL") is a relationship between them. Split
# across two features, that relationship has no home and is the first thing to rot.
#
# LITMUS: every Then is confirmable by an outsider without reading source, through the
# headless mount harness. TWO harnesses are used and the choice is not cosmetic:
#   - `withShellComposedFleet` (`test/support/shell-app-harness.mjs:88`) — the REAL
#     `<Fleet/>` inside the REAL `<Shell/>` in ONE bundle. This is the ONLY channel that
#     can answer "where did the control END UP", because the shell bus is module state and
#     a fleet mounted alone renders its contribution in place (`SurfaceSlot.tsx:50-51`).
#     `slotControls()` returns the accessible names inside the slot, in render order.
#   - `withFleetApp` (`test/support/fleet-app-harness.mjs:40`) — the fleet alone, for the
#     page body (the banner, the empty card, the regions), where no shell is needed.
# There is NO vitest and NO testing-library in this repo; there is no third channel.
#
# WHAT THE HARNESS CANNOT SEE, AND WHERE EACH OF THOSE WENT. `mini-react` builds a tree,
# not a DOM: there is no layout, no computed style, no media query, no focus and no
# measurement (`react-app-harness.mjs:286-289` says so in terms — "a component that
# measures or queries must take a seam"). So EVERY pixel claim is `@uat` and is listed
# there rather than smuggled into an `@executable` Then:
#   - the 18ch truncation and the reserved-width arithmetic (`min-w-[calc(9ch+1.375rem)]`);
#   - the disclosure-vs-segment SHAPE, the single filled teal block, the dashed treatment;
#   - the popover's `z-20` rung, its `w-72` and its `max-h-[60vh]`;
#   - DG-47-4's two whole drops at ≤390 and the two protected controls;
#   - `Esc` closing the popover and RETURNING FOCUS to the trigger, arrow/Home/End
#     movement, and the ≥24×24 hit target — all four are focus/geometry facts.
# What IS headlessly visible, and is therefore `@executable` below: presence, position in
# the slot's ordered contribution list, the option SET and its order, accessible names,
# `title` text, `aria-*` values, the rendered words, the request count, and what the page
# renders after a click.
#
# NOT ASSERTED HERE:
#   (a) the URL the picker WRITES, and that clearing deletes the key rather than leaving a
#       naked `?repo=` — task **03**, which owns the address contract end to end.
#   (b) the three empty-state copies — task **02**.
#   (c) `emptyStateCopy`'s new strings and `repoFromSearch`/`withRepoParam` as functions —
#       story **47/02**, `node:test` on `scope.mjs`.
#   (d) "no module outside the one home names the `repo` key" — `acd-fleet-filter-single-home`.
#
# THE a11y LANE IS OFF, AND THAT IS A DECISION RATHER THAN AN OVERSIGHT.
# `.aof/aof.config.json`'s `work.tags.domains` carries no `a11y` entry and there is no
# `work.ui.a11y` block, so the opt-in automated lane (07/ADR-004) is off: **there is no
# axe-core run in this story and no a11y finding will come from one.** DESIGN's
# accessibility requirements therefore bind the `@uat` review below as HUMAN judgement,
# which is why the focus-order, hit-target and non-colour clauses appear there.
#
# FEASIBILITY — checked at source 2026-08-10, at `d71d508`. Four notes:
#   1. **BUILD PREREQUISITE — the loading state of a fleet mounted ALONE is unreachable.**
#      `withFleetApp` does not plumb `settle`/`holdFromStart` through to `withMountedApp`,
#      so the first response always lands first. `withShellComposedFleet` plumbs both and
#      `test/shell-regions.test.mjs:788-830` already drives the loading state that way.
#      Either plumb the two options through `withFleetApp` (two lines) or take every
#      loading lane through the shell-composed harness.
#   2. **THE SLOT'S `deps` ARE A LIVE HAZARD AND THIS TASK ENLARGES THEM.**
#      `test/shell-regions.test.mjs:840-855` records that the shell-composed mount never
#      goes stable under `flush()` because `Fleet.tsx:226`'s inline `onRefresh` arrow is a
#      new function every render. The picker adds a handler, a value and an option set to
#      the same `deps` array; anything rebuilt inline each render makes that worse and is
#      one refactor from a real "Maximum update depth" in the browser. Lanes settle by
#      bounded `renderOnly()` passes, as the existing ones do.
#   3. **AN OPEN CONTRADICTION IN DESIGN'S OWN STATES TABLE, surfaced rather than
#      resolved.** §Surface 1 says the trigger is **disabled** when the roster is empty
#      ("never a lying picker") and, two rows later, that in the **error** state it is
#      "present, ENABLED and unchanged" so that "a failed load must never trap the operator
#      inside the narrowing that may have caused it". A FIRST-LOAD error has no roster at
#      all, so both rules apply and they disagree. Scenario 1 asserts what neither reading
#      disputes — the control is present at its position, and a way OUT of the filter
#      exists in that state — and the enabled/disabled ruling is raised as a finding.
#   4. NOTHING HERE BINDS `:4181` OR `:4182`; every fixture server binds port 0.
#
# ISOLATION: these suites export a test ARRAY, so `node --test test/<file>` runs ZERO
# tests and reports success (m47 retro). Drive them through a focused runner that IMPORTS
# the array, under `AOF_GLOBAL_HOME=$(mktemp -d)`. NEVER the full suite on this machine.

@ui @work @design
Feature: the repo picker is in the bar in every state, offers only what the mesh actually carries, and the chip that explains the page carries the way out
  In order that an operator can always see which repo they asked for, always change their mind, and never have to reload the page to escape a filter
  the picker is contributed into the shell's surface slot beside the scope control and is present in loading, error, empty and populated alike, it reads `All repos` at rest and offers exactly the workspaces the payload carries, and the "filtered by" chip sits at the top of the page above the state swap with an inline clear on it

  Background:
    Given a REAL fleet face serving a REAL global projection with several published workspaces
    And the REAL `<Fleet/>` mounted inside the REAL `<Shell/>`, in one bundle, so a contribution really travels to the shell's slot

  # HEADLINE 1 — the standing invariant, now with a second subject. This is the scenario a
  # review should look at first: the ONE state where the control would be missing is the
  # one where the operator most needs it.
  @executable
  Scenario Outline: the picker is mounted in EVERY page state, in the slot, in the fleet's own order
    Given the fleet is opened at <address> against a face that <face>
    When the page reaches its <page state> state
    Then the shell's surface slot holds exactly these contributions, in this order: the scope control, the repo picker, the legend, the refresh control
    And the repo picker is inside the slot and NOWHERE else in the document — exactly one of it exists
    And it is not inside the page body region that swaps out under load, error and empty
    And its label reads <trigger reads>
    And <a way out>

    Examples:
      | case                              | address                          | face                                   | page state | trigger reads                    | a way out                                                              |
      | first load, nothing has landed    | `/fleet?repo=<a known workspace>` | holds its first status response        | loading    | the requested repo               | the picker is present at its reserved position, whatever its enabled state |
      | first load, no filter             | `/fleet`                          | holds its first status response        | loading    | `All repos`                      | there is no filter to leave                                            |
      | the mesh refuses the read         | `/fleet?repo=<a known workspace>` | refuses `/api/mesh/status`             | error      | the requested repo               | a control that clears the filter is present and is not the browser's Back button |
      | nothing has published anywhere    | `/fleet`                          | serves an empty projection             | empty      | `All repos`                      | there is no filter to leave                                            |
      | the filter matched nothing        | `/fleet?repo=<a value nothing carries>` | serves the populated projection  | empty      | the raw requested value          | a control that clears the filter is present                            |
      | the ordinary filtered page        | `/fleet?repo=<a known workspace>` | serves the populated projection        | populated  | that workspace's name            | a control that clears the filter is present                            |
      | the ordinary unfiltered page      | `/fleet`                          | serves the populated projection        | populated  | `All repos`                      | there is no filter to leave                                            |
    # ROW 1 IS THE POINT OF THE WHOLE SCENARIO and it is DESIGN's own loading rule: the
    # filter's value is known FROM THE URL before any data is, so the trigger renders its
    # value immediately and NEVER as a pulse block — "a skeleton would promise a fact that
    # has already arrived". A trigger that appeared only once the payload landed would leave
    # the bar lying for a whole round trip.
    #
    # ROW 3's "a way out" IS DELIBERATELY WEAKER THAN DESIGN'S TEXT, and FEASIBILITY 3 says
    # why: DESIGN requires the trigger ENABLED in the error state and DISABLED on an empty
    # roster, and a first-load error is both. What neither reading disputes is that the
    # operator must be able to leave the filter without reloading — the banner's chip is
    # rendered in the error state too (DG-47-1), so its inline clear is that way out. The
    # enabled/disabled ruling is a raised finding, not a build decision.
    #
    # ROW 5's trigger reads the RAW VALUE because there is no name to resolve it to; that it
    # is additionally DASHED (never `accent`, never `destructive`) is a pixel fact and is
    # judged in the `@uat` lane below.

  # HEADLINE 2 — the option set is producer-fed. This is `assignableNodeOptions`'s own
  # discipline one control over: no invented target, and an empty roster disables rather
  # than fabricates.
  @executable
  Scenario Outline: the picker offers exactly the workspaces the REAL payload carries — never an invented one, never a lie
    Given a REAL projection carrying <workspaces published>
    When the picker is opened on the settled page
    Then its first row is `All repos`, above a separator, and it is present whatever else is
    And below the separator there is exactly one row per workspace on the payload, in the payload's own order
    And every row names a workspace `GET /api/mesh/status` actually returned — no row names anything else
    And each row carries that workspace's `projectRoot` as well as its name, so two workspaces sharing a name are still distinguishable
    And the row for the active filter is marked by a `✓` and by weight, not by colour alone
    And <empty-roster behaviour>

    Examples:
      | case                          | workspaces published                       | empty-roster behaviour                                                                                   |
      | nothing published at all      | no workspaces                              | the picker is STILL rendered, reads `All repos`, is marked disabled and its `title` says no workspaces have published to this mesh yet |
      | one workspace                 | one workspace                              | not applicable — one row below the separator                                                              |
      | several, one of them re-keyed | four workspaces | not applicable — four rows, and EVERY row carries its own `projectRoot`, checked against the served payload |
    # THIS ROW'S CONDITION WAS AMENDED AT BUILD (PO, 2026-08-11, F-47-03-QA-6). It read
    # "four workspaces, two of which SHARE A NAME", with a Then about the two same-named
    # rows being told apart by `projectRoot` — but no fixture in this story produces a
    # same-name pair, and none should be invented for it: DESIGN already records the
    # name-collision as a NAMED RESIDUAL with its close condition deliberately not taken in
    # this milestone (`DESIGN.md` §Surface 1, the chip-carries-the-id ruling). So the row was
    # asserting a condition the product does not yet produce. It now asserts the ENTAILING
    # property — every row carries its own `projectRoot` — which is what makes the
    # disambiguation possible when the collision does arrive, is checkable today, and is
    # exactly what the build already proves.
    # ROW 1 IS THE `assignableNodeOptions` RULE (`scope.mjs:252-256`) applied to a second
    # picker: never an invented placeholder target, and never a control that vanishes because
    # it has nothing to offer. A hidden control cannot explain itself; a disabled one with a
    # `title` can.
    #
    # ROW 3's same-name pair is why DESIGN puts `projectRoot` on the row at all, and it is the
    # cheapest thing in that document to change — recorded here so a mock that drops the
    # second line is met as a decision with a named cost.

  # THE FILTER IS AN INTERACTION, NOT A PAGE LOAD (ADR-002). The behavioural half of
  # `acd-fleet-filter-read-only`: the narrowing is synchronous with the click, the poll loop
  # is untouched, and nothing about the filter ever reaches the server.
  @executable
  Scenario: picking a repo narrows the page without a round trip, and the server never hears about it
    Given the fleet is open at `/fleet` and settled, and the number of status requests it has made is recorded
    When a repo is picked from the picker
    Then the page is narrowed in the same frame — no loading state is entered and the populated body is never unmounted
    And the app has made ZERO additional `/api/mesh/status` requests
    And not one request the app has EVER made carries a repo or workspace query parameter
    And when the poll interval elapses the app makes exactly ONE further request, as it did before the filter — the cadence is unchanged
    And that request carries the same `?scope=` it carried before and nothing else
    # THE MIDDLE CLAUSE IS THE ONE THAT CATCHES THE TEMPTING BUILD. A server-side filter
    # would also "work"; ADR-002 rejects it on two measurements (the accepted-input surface of
    # a route 26 modules depend on, and the node-roster semantics `?scope=local` deliberately
    # has). Counting the app's OWN traffic is how an outsider tells the two builds apart.

  # DG-47-1 — the statement that explains an empty page must survive the state that empties
  # it. Today's line is the first child of `GlobalScopeView`, i.e. it is discarded in three of
  # the four states, and `empty` is the one that matters.
  @executable
  Scenario Outline: the "filtered by" banner is at the top of the PAGE, above the state swap, and is absent and zero-height when nothing is narrowed
    Given the fleet is opened at <address> against a face that <face>
    When the page reaches its <page state> state
    Then the banner is <banner>
    And it is rendered in the page body, not in the bar — the bar's own trigger already names the repo, and a chip beside it would say the same word twice
    And it is rendered ABOVE whatever the page's state branch renders, and it is the same element in every state
    And it holds a `Filtered by` label and one chip per narrowing in force, in the order scope then repo, and nothing else — no counts, no totals, no second sentence

    Examples:
      | case                                   | address                                  | face                            | page state | banner                                              |
      | filtered and populated                 | `/fleet?repo=<a known workspace>`        | serves the populated projection | populated  | present, with one repo chip                          |
      | filtered while the first load is held  | `/fleet?repo=<a known workspace>`        | holds its first status response | loading    | present, with one repo chip                          |
      | filtered and the read failed           | `/fleet?repo=<a known workspace>`        | refuses `/api/mesh/status`      | error      | present, with one repo chip                          |
      | filtered to nothing                    | `/fleet?repo=<a value nothing carries>`  | serves the populated projection | empty      | present, with one repo chip                          |
      | both narrowings in force, no survivor  | `/fleet?scope=local&repo=<a repo the roster names no member of>` | serves the populated projection | empty      | present, with a scope chip THEN a repo chip          |
      | both narrowings in force, PARTIAL      | `/fleet?scope=local&repo=<a repo a member machine survives for>` | serves the populated projection | populated  | present, with a scope chip THEN a repo chip — and the partial-intersection notice beneath them |
      | scope only                             | `/fleet?scope=local`                     | serves the populated projection | populated  | present, with one scope chip                         |
      | nothing narrowed                       | `/fleet`                                 | serves the populated projection | populated  | absent entirely, and occupying zero height           |
      | nothing narrowed, nothing published    | `/fleet`                                 | serves an empty projection      | empty      | absent entirely, and occupying zero height           |
    # THE LAST TWO ROWS ARE THE ONE PLACE THIS MILESTONE IS ALLOWED A CONDITIONAL ELEMENT, and
    # DESIGN states the reason it does not violate DG-20's covert-signal rule: the CONTROL in
    # the bar states the filter's state at all times, in all four page states, so the
    # obligation is discharged there. That is precisely why the control may never be
    # conditional and this banner may — if the control were ever allowed to disappear, this
    # clause falls with it.
    #
    # ROW 5 IS ADR-005's INTERSECTION MADE VISIBLE: two narrowings, two chips, in the order
    # they were applied. A page showing nothing must name EVERY reason it is showing nothing.

  # TWO DOORS, AND ONE OF THEM IS ALWAYS VISIBLE WHILE A FILTER STANDS. "A filter that can
  # only be cleared from inside a closed menu is a hidden affordance, and the operator's
  # recovery from it is reloading the page."
  @executable
  Scenario Outline: the filter clears through either door, in one click, with no reload
    Given the fleet is open at `/fleet?repo=<a known workspace>` and settled
    When the operator clears it via <door>
    Then the page renders the unfiltered fleet again — every workspace's facts are back
    And the banner is gone and occupies zero height
    And the picker reads `All repos` again
    And no page reload and no remount occurred: the app made no additional status request beyond its ordinary poll
    And the same door is available and behaves identically when the page is in its empty state

    Examples:
      | case                     | door                                                              |
      | the door on the statement | the inline `✕` inside the repo chip, whose accessible name says what it clears |
      | the door in the menu      | the `All repos` row at the top of the picker                                  |
    # THE FIRST DOOR IS MANDATORY AND THE SECOND IS NOT SUFFICIENT ALONE — DESIGN says so in
    # terms. The empty-state clause is where it bites: in the state the operator is most
    # likely to be stuck, the menu is a closed popover and the chip is the thing on screen.

  # NON-COLOUR, NAMED, AND ANNOUNCED WITHOUT STEALING FOCUS. The `aria-*` half of DESIGN's
  # accessibility requirements is a property of the rendered tree and is asserted here; the
  # keyboard and geometry half is a human's and is in the `@uat` lane.
  @executable
  Scenario: every filter control names itself, every filter state is carried by words as well as marks, and a filter change is announced rather than shouted
    Given the fleet is open at `/fleet?repo=<a known workspace>` and settled
    Then the picker's accessible name says both what it filters and what it is set to — never a bare `▾`, never a name that is only the value
    And the inline clear is a real button whose accessible name names the repo it clears
    And the picker declares itself a disclosure over a listbox, and its rows declare themselves options with their selected state
    And the banner announces politely — it is a status region, and it is never an alert, because nothing is wrong
    And the banner introduces no landmark of its own: the document still has exactly one banner landmark and exactly one `<main>`
    And the unknown-filter chip states its condition in a `title` sentence as well as by its treatment
    And every fact above is readable with all colour removed — the words and the marks carry it

  # ── the human gate ─────────────────────────────────────────────────────────────────────
  # Everything below is a pixel or a perceptual claim. The renders are QA's to drive; the
  # verdict is the designer's, judged against `mocks/filter-control*.png` where committed and
  # DESIGN §Surface 1's binding checklist everywhere else. No mock had landed when this task
  # was written, and a missing mock is NEVER grounds for INCONCLUSIVE — the checklist is the
  # mandatory baseline until the file exists.

  @uat @design
  Scenario: the control reads as a second, different narrowing rather than a second scope switch
    Given the fleet rendered at 1280 on `/fleet`, on `/fleet?repo=<a known workspace>` and with the picker OPEN, and again with a workspace name long enough to exceed the trigger's ceiling
    When the designer judges the renders against DESIGN §Surface 1's binding checklist and §The two-narrowings ruling
    Then the picker is a DISCLOSURE — one bordered trigger with a `▾` — and is not a segmented control and not a text input
    And there is still exactly ONE filled teal block in the bar: the active scope segment. The picker's selected row is a tint plus a `✓` plus weight, never a fill
    And the slot reads left to right as scope, filter, legend, refresh — the two narrowings first, as one group, then the two reader's aids
    And the trigger truncates at its ceiling with the full value recoverable, while the banner's chip one region below renders the name IN FULL and never truncates
    And the trigger's reserved width is stated ONCE, as a literal the CSS scanner can see, and the arithmetic is asserted rather than claimed — m45's GAP-4 shipped a comment that disagreed with its own class and this bar does not get to learn that twice
    And the trigger never widens the bar and never displaces the nav
    And the popover sits on the product's `popover` rung, at its fixed width, with its rows truncating inside it rather than widening it
    And a filter naming a workspace the payload does not carry is DASHED and muted in BOTH the trigger and the chip — never `accent`, never `destructive`, because nothing failed
    And nothing in the control animates: no open/close transition, no fade, no slide
    And the verdict is CONFORMS or names a specific GAP
    # THE RENDER TARGETS THIS NEEDS, all at `http://127.0.0.1:4181/fleet` (the fleet's fixed
    # origin — never a board port): unfiltered; filtered; the picker open; the unknown-filter
    # value; and a payload carrying a LONG workspace name and a LONG `projectRoot`. A
    # short-name render proves nothing on a surface with this truncation history (DG-13…DG-22).

  @uat @design
  Scenario Outline: at ≤390 the slot drops two whole controls and protects the two narrowings in full
    Given the fleet rendered at <width> on `/fleet?repo=<a known workspace>`
    When the designer judges the bar against DG-47-4
    Then the scope control and the repo picker are both present IN FULL, unchanged in form
    And <what the two reader's aids do>
    And no label anywhere in the slot is truncated, ellipsised, shrunk by a scale factor or overprinted
    And the slot has not wrapped to a second row, and no third chrome bar has appeared
    And the bar does not scroll horizontally, and the page root has grown no horizontal scrollbar
    And any control that gave up its words still carries them in `title` AND in its accessible name, so nothing is lost to a screen reader by a visual collapse
    And the drops are keyed to the VIEWPORT and not to the data: the same width with a long repo name and with a short one takes the same form
    And the verdict for this breakpoint is CONFORMS or names a specific GAP

    Examples:
      | case                    | width | what the two reader's aids do                                             |
      | the judgement width     | 1280  | both are in full — `◷ legend` and `⟳ refreshed Ns ago`                     |
      | the desktop-app proxy   | 768   | both are still in full, in the surface bar, unchanged in form              |
      | mobile — the squeeze    | 390   | BOTH drop together to their pinned glyphs, `◷` and `⟳`, words in `title`   |
    # DESIGN'S OWN ESTIMATE IS THAT 390 OVERFLOWS BY ~80px BEFORE A REPO NAME IS EVEN IN THE
    # TRIGGER, AND BY ~136px WITH ONE — estimates, which this render exists to confirm. Four
    # answers are forbidden and each has a rule already in force: truncating a control's
    # label, wrapping the slot, scrolling the bar, and hiding either narrowing. If the two
    # drops are not enough, the outcome is a NEW design gap with a costed third drop — never a
    # shrink factor decided in CSS.

  # ── RE-CUT 2026-08-13 (aof:verify 47 pass 2, F-47-V-17) ──────────────────────────────────
  # This was ONE `@uat @design` scenario carrying seven clauses, justified as human "because the
  # automated one is off". **That justification was refuted by measurement, twice.** On 2026-08-11
  # `aof-qa` measured six of the seven with real `Input.dispatchKeyEvent` presses — with the a11y
  # lane still off and no axe-core run, which is precisely the proof that axe-core was never what
  # decided them — and found four FAILING (F-47-V-12/13/14/15). On 2026-08-13 the verify session
  # re-measured all six on the live build and found them all passing. A clause a headless driver
  # can press is not a human judgement; it is an unwritten lane, and the four defects had been
  # living in exactly the gap between the two.
  #
  # The six DOM-fact clauses now live in `test/fleet-slot-and-picker.test.mjs`, each proved to fire
  # by reverting the fix it pins. What stays human below is what no driver can answer: whether a
  # focus ring is VISIBLE ENOUGH, and whether a screen reader actually SPEAKS the live region.
  # This is the shrinking `@uat` set this feature says is the point — now earned rather than
  # asserted.

  @executable
  Scenario: the picker answers the keyboard like the disclosure the product already ships
    Given the rendered fleet with the picker reachable by keyboard
    When a headless driver presses real keys against it
    Then the picker is reachable in the slot's own position in the focus order — skip link, nav, surface slot, content
    And `Esc` closes the popover and returns focus to the trigger
    And an outside press closes it and commits no filter — a control that overlays the page must have a way out that is not "commit or re-toggle"
    And the arrow keys move within the rows and `Home`/`End` reach the ends, and the page behind does not scroll
    And `Enter`/`Space` on an option applies the filter and closes the popover
    And the trigger, every row, the inline clear and the recovery button each measure at least 24×24 CSS pixels, achieved by their own padding rather than by growing the bar
    And the popover is fully on screen at every render width, its rows truncating inside it rather than being clipped by the viewport

  @uat @design
  Scenario: the two accessibility facts no driver can settle
    Given the rendered fleet with the picker reachable by keyboard
    When the designer judges a focus pass, and a screen-reader user exercises the filter
    Then the focus indicator is VISIBLE — present is a DOM fact and is laned above; whether it reads as focus against this surface's own contrast is a judgement
    And applying a filter is SPOKEN by the live region without stealing focus — the element and its `aria-live` are laned above; whether a real screen reader announces it is not
    And the verdict is CONFORMS or names a specific GAP
    # WHY THESE TWO AND NOTHING ELSE: both are about a human's PERCEPTION of a fact whose presence
    # is already asserted headlessly. That is the only honest reason left to spend a human here.
    #
    # NOT IN THIS LANE, and recorded so it is not quietly re-added: "a disabled trigger and an
    # unknown-filter chip are still focusable and still state their reason". That clause is under
    # RULING — F-47-V-16(a) — because §a11y 5 asks for a NON-INTERACTIVE element in the tab order,
    # which is the opposite of ordinary practice for a chip; the rule came from m45/a11y 4 where its
    # subject was a DISABLED CONTROL. Its purpose is already met by other means (the E4 body states
    # the reason in visible text, and the `✕` inside the chip IS focusable). The build is
    # deliberately unchanged until the designer rules.
