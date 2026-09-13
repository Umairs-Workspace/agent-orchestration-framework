<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 47/04, DG-47-5 + ADR-008: THE DRILL-IN'S TWO NON-REST STATES, PUT BACK
# ON THE LADDER THEY LEFT. After ADR-006 deletes the peer-board branch, the milestone card's
# drill-in is THE ONLY DRILL-IN THE FLEET HAS, and it renders three states through one element.
# Two of those three states today leave the yield order that region 5's whole geometry contract
# is built on: they keep their words at every width and they throw away the one glyph DG-19
# pins. This task varies THE STATE, THE TARGET'S LENGTH (which is what decides the abbreviation)
# and THE VIEW; it changes nothing about WHEN the drill-in fails (47/01), nothing about the
# workspace-name column (this story's task 00) and not one character of any label.
#
# WHY THIS TASK EXISTS AT ALL — **F-47-01-QA-5**, raised at 47/01's review and routed here by the
# PO on 2026-08-11. DESIGN §DG-47-5 specifies the treatment in full and says it is closed in this
# milestone; no `@executable` feature in any of the four stories carried it, so 47/01's `@uat`
# render lane could only ever have returned GAPS with nowhere to route them. It lands in THIS
# story because ADR-008 binds it here in terms — *"Everything DG-47-5 adds to that row must fit
# this same ladder"* — and every clause is written against `REGION5_DRILLIN_ABBREV_AT_CH`, a
# constant this story already owns in `ui/src/fleet/assign-affordance.mjs`.
#
# WHAT IS ACTUALLY BEING CHANGED, in one sentence, because the code is three lines and the
# contract is DG-13…DG-22. Read at source 2026-08-11 (working tree at `7400664` plus 47/03's
# in-flight edits to `Fleet.tsx`; LINE NUMBERS DRIFT, THE EXPRESSIONS DO NOT), the drill-in
# renders as one `<span>` carrying `font-semibold text-primary group-hover:underline` in every
# state, whose words are gated by `abbreviateDrillIn && !opening && !openError` and whose pinned
# glyph is gated by `opening || openError ? null : …`. Those two gates are DESIGN's "Observed"
# column verbatim and they are BACKWARDS IN THE SAME PLACE: the two states that should give up
# their words keep them at every width, and the two states that should keep the glyph are exactly
# the two that drop it. The change is to make the gate state-BLIND (the chip's target decides,
# as it does at rest), to render the glyph unconditionally, to make the element's tone and rule a
# function of the state, and to make the accessible name name the remedy. `abbreviateDrillIn`
# itself — `!!assignment && ('→ ' + targetNodeId).length > REGION5_DRILLIN_ABBREV_AT_CH` — is NOT
# re-derived per state; that it stays ONE decision is what scenario 1's boundary rows protect.
#
# WHAT IS DELIBERATELY **NOT** PINNED HERE — THE WORDS. `Open failed` and `Opening board...` are
# pinned verbatim by 47/01's task 00, and whether `Open failed` is still the RIGHT words is an
# OPEN design/PO question carried as **F-47-01-QA-1**: since ADR-011 the resolver refuses with a
# specific cause (`409 workspace-not-local`, *"not checked out on this machine"*) rather than a
# generic failure, and DESIGN says so is a better basis for this treatment than "something went
# wrong". So this contract pins THE TREATMENT, THE GEOMETRY and THE ACCESSIBLE-NAME OBLIGATIONS,
# and pins no prose the designer has not settled. That is not caution, it is arithmetic: this
# milestone has already amended three contracts that pinned a fact the record later moved, and a
# ruling on the visible words must not be able to invalidate a single row below. The ruling is
# owed, it is named in its own `@uat` scenario, and it is the PO's to record — not this build's.
#
# LITMUS: every Then below is confirmable by an outsider without reading source. Two channels,
# both already built, and each scenario says which one it is on:
#   (1) THE RENDERED TREE — the REAL, unmodified production `<Fleet/>` mounted headlessly against
#       a REAL `mesh ui` fleet face (`test/support/fleet-app-harness.mjs` over
#       `react-app-harness.mjs` / `mini-react.mjs`), read back with `findAll` / `textOf`. The
#       geometry suite's own `region5()` helper already addresses the drill-in, its two children
#       and the chip; `fleet-app-harness.mjs`'s `drillInIn(card)` already fires it and reads its
#       label. Both need ONE addressing change and it is a prerequisite, not a nicety — see the
#       feasibility note, F-47-04-QA-3.
#   (2) A REAL BROWSER RENDER — for the `@uat` lane only, and for exactly the claims channel (1)
#       structurally cannot make.
#
# WHAT THE HEADLESS CHANNEL CAN AND CANNOT SEE, and it is why this task has two lanes rather than
# one. `mini-react.mjs` is a whole-tree synchronous renderer over plain objects: no layout engine,
# no CSS, no box model, no `getBoundingClientRect`. So it CAN see: which children the drill-in
# renders and in what order, the `className` / `title` / `aria-*` / text it emits in each state,
# whether the words element exists at all, whether the glyph exists, and which of the three
# states the element is in. It CANNOT see: a pixel width, whether `truncate` clipped anything,
# whether the dashed rule reads as *absent* rather than *broken*, or whether two elements
# overlapped. **DG-47-5 clause 1's central claim — "no state of this element may render wider
# than `Open board →`" — is therefore a `@uat` MEASUREMENT here, not an `@executable` assertion**,
# and the headless lanes assert only the structural facts that make it possible (the words
# truncate inside their own `min-w-0` box, the element keeps its `shrink-1000` and its explicit
# floor, and no state adds horizontal padding, a ring or a full border box). This is the geometry
# suite's own stated boundary — its lanes are class/structure facts and *"not a PIXEL verdict"* —
# and ADR-008 restates it: *"a render verdict is OWED and is NOT claimed here."*
#
# NOT ASSERTED HERE — and each has a named owner:
#   - WHEN AND WHY THE DRILL-IN FAILS. Which resolver refusals produce the failed state, that the
#     operator does not navigate, that the rest of the page does not move, and that a SECOND
#     CLICK RETRIES are 47/01 task 00's, already green. Below, a failure is an INPUT. Scenario 3
#     asserts only the half a behavioural lane cannot see: that no `aria-disabled` is EMITTED —
#     a build can mark the control disabled to assistive technology and still fire on click,
#     satisfying every one of 47/01's Thens while breaking DG-47-5 clause 4 outright.
#   - THE WORKSPACE-NAME COLUMN, DG-22's alignment consequence and the drop predicate's one home.
#     This story's task 00. Scenario 5 renders a FILTERED row because ADR-008 binds DG-47-5 to it,
#     but it judges the drill-in only, and it is written as an equivalence precisely so it does
#     not depend on task 00 having landed.
#   - THE URL CONTRACT AND THE NARROWING — stories 02 and 03. "The view is repo-filtered" is an
#     INPUT below, never a claim.
#   - REGION 6, and every other region. Untouched by this change.
#   - ANY PIXEL VERDICT — the `@uat` lane, scenarios 7, 8 and 9.
#
# THE a11y LANE IS OFF, AND THAT IS THE DECISION, NOT AN OVERSIGHT. `.aof/aof.config.json`'s
# `work.tags.domains` carries no `a11y` entry and there is no `work.ui.a11y` block, so the opt-in
# automated lane is off: THERE IS NO axe-core RUN IN THIS STORY AND NO a11y FINDING WILL COME FROM
# ONE. That matters more here than usual, because DG-47-5 clause 5 is an accessible-name clause
# and clause 4 forbids an ARIA attribute. Both are therefore asserted STRUCTURALLY in scenarios 3
# and 4 (the attribute is absent / the name says what it must), and the human half is judged in
# the `@uat` lane. An automated a11y pass would not have caught either one.
#
# TAGGING. Layer / refinement / domain sit on the Feature and are inherited by every Scenario (the
# milestone's own convention); each Scenario carries its own lane tag, and the `@uat` set restates
# `@design` because the verdict is a designer's.
#
# FEASIBILITY — checked at source 2026-08-11. Seven notes. Two are hard prerequisites, four are
# findings the build must not paper over, and one is a product observation for the PO.
#   1. THE THREE STATES ARE ALREADY REACHABLE, and 47/01's harness prerequisites LANDED.
#      `react-app-harness.mjs` records every `location.assign` (`navigations()`) and holds a
#      response's DELIVERY while the real server really answers it (`holdNext(fragment)`);
#      `fleet-app-harness.mjs` exposes `drillIns()` / `drillInIn(card)` / `drillInByTitle(title)`
#      with `click()` and `clickDetached()`. `test/fleet-board-drill-in.test.mjs` already drives
#      at-rest, in-flight and failed. NOTHING NEW IS NEEDED TO REACH A STATE.
#   2. PREREQUISITE, AND IT IS NOT OPTIONAL — **FINDING F-47-04-QA-3: A CONFORMING BUILD BREAKS THE
#      TWO ACCESSORS THAT READ THE STATE IT CONFORMS IN.** Both harnesses address the drill-in by a
#      property DG-47-5 REMOVES. (a) `fleet-app-harness.mjs`'s `drillInIn(card)` finds the label
#      span by `className.includes("group-hover:underline")` — clause 3 DROPS that class in the
#      failed state, so `.label` would read `""` in exactly the state 47/01's lanes assert
#      `"Open failed"` on. (b) the geometry suite's `region5()` finds the drill-in by a `title`
#      matching `/^Open(ing)? board|^Open failed/` — clause 5 REWRITES that title to the remedy
#      sentence, so `r5.drillIn` would be `null` in the failed state. Either placement of the new
#      name breaks one of them, and (a) turns 47/01's SHIPPED, GREEN lanes red for a reason that
#      has nothing to do with their claims. The fix is a test-support change in the same commit:
#      re-base both on a STATE-INVARIANT identity, and change no lane's expected value. Scenario 6
#      makes it a checkable Then rather than a note.
#   3. PREREQUISITE — **THE ABBREVIATED FAILED STATE NEEDS AN ASSIGNED CARD THAT FAILS, AND THE
#      OBVIOUS FIXTURE CANNOT PRODUCE ONE (F-47-04-QA-7).** `abbreviateDrillIn` opens with
#      `!!assignment`, so ONLY a card carrying a chip ever abbreviates — the "glyph only" column of
#      DESIGN's three-states table is unreachable without one. But the failure DESIGN singles out,
#      ADR-011's `workspace-not-local`, is refused by the ASSIGN route for the SAME rows with the
#      SAME 409 (the reachability probe the board-url refusal was modelled on, thirty lines away in
#      `src/mesh-ui-serve.mjs`) — so no card in `withTwoWorkspaceAssignFixture` can both hold a chip
#      and fail to open. The producer that DOES work is the fixture's own publish-then-delete idiom
#      applied one step later, and it is real rather than painted: mint the assignment on a LOCAL
#      workspace by a REAL click, then delete that checkout (`withPublishedAssignFixture` yields
#      `root`; the `Published Elsewhere` card is produced by exactly this move), then click the
#      drill-in — the projection row survives, the path does not, and the resolver answers 409 on a
#      card that is still rendering its chip. Fallbacks, in order: stop the face mid-click (a
#      REJECTED promise rather than a refusal — 47/01's own row 4), or remove the workspace row from
#      the projection after load (404). If none of the three can be driven, ADR-008's instruction
#      applies: *"that is a signal the change is bigger than it looks and it comes back here — not a
#      licence to skip the lane."*
#   4. AND F-47-04-QA-7 IS ALSO A PRODUCT OBSERVATION, worth the PO's minute. On a live mesh a card
#      that can be ASSIGNED is a card whose board can be OPENED — the two routes consult the same
#      row through the same seam — so the abbreviated failed state is reachable in production only
#      through a RACE (the checkout goes away between the poll and the click) or a TRANSPORT
#      failure. It stays in this contract because the transport failure is ordinary, and because
#      clause 1 is about the WIDEST state, not the likeliest one.
#   5. **FINDING F-47-04-QA-4 — DESIGN's states table calls the in-flight `animate-pulse`
#      "existing", and at source the drill-in carries no motion token at all.** The product's pulse
#      lives on the assignment chip's dot and on the loading skeletons; this element has never had
#      it. So the parenthetical hides a NEW requirement. It is encoded below because the states
#      table is binding and no mock is committed, and it is flagged here so it is CONFIRMED rather
#      than inherited. If the designer did not mean to add motion, row 2 of scenario 2 is the one
#      cell to strike, and nothing else in this contract moves.
#   6. **FINDING F-47-04-QA-5 — clause 1's "no state may render wider than `Open board →`" cannot
#      be a STRING-LENGTH rule while the words stay pinned verbatim.** `Opening board...` is six
#      characters longer than `Open board` and `Open failed` is one longer; DESIGN pins all three
#      and says the words are not changed. The clause is satisfiable only in the BOX sense — the
#      words truncate inside their own `min-w-0` box inside the `shrink-1000` element, so no state
#      can force the row wider or push a neighbour. This contract reads it that way, asserts the
#      structural half headlessly, and puts the width itself on the designer's ruler in scenario 7.
#      The reading is named so the architect can correct it rather than discover it.
#   7. **FINDING F-47-04-QA-6 — clause 5 asks for `aria-label` on an element that cannot carry
#      one usefully.** The `title` today sits on the yield-order `<span>`, which is not
#      interactive and has no role; an `aria-label` there is ignored by assistive technology. The
#      element that HAS an accessible name is the card's own `<button>`, whose `title` currently
#      reads `Open board for <workspace>`. Scenario 4 therefore reads the name off *"the control an
#      operator actually activates"* and does not pin WHICH element carries it — that placement is
#      the designer's and the architect's, and it interacts with prerequisite 2's addressing.
#   8. THE GEOMETRY SUITE TODAY: eleven lanes, of which exactly two assert on region 5, and
#      NEITHER of them renders a non-rest drill-in. On the rendered tree the drill-in's other two
#      states are asserted only by 47/01's suite, which reads LABELS and not geometry. That gap is
#      the whole of this task, and it is why the new lane belongs in the GEOMETRY suite rather than
#      beside the label lanes.

@ui @work @board @design @bug @finding-F-47-01-QA-5
Feature: the fleet's one drill-in keeps the yield order in all three of its states, and a board that will not open reads as absent rather than as broken
  In order that a destination which cannot be resolved costs the operator no width, no glyph and no recovery — and tells them what to do about it instead of restating what they can already see
  the failed and in-flight drill-in must give up their words on the SAME budget the resting one does, keep the pinned `→` that is the affordance's identity, take the house dashed/muted absent mark spent vertically so it costs no width, stay a live control that a second click retries, and carry an accessible name that names the remedy

  Background:
    Given a REAL `mesh ui` fleet face over an isolated global projection (a fresh AOF_GLOBAL_HOME), with a published workspace, a published worker node and a resolvable milestone
    And the REAL, unmodified production `<Fleet/>` mounted headlessly against that face
    And every assignment is MINTED BY A REAL CLICK through the REAL `POST /api/mesh/assign` — never a hand-seeded row, which judges the chrome and never the feature
    And "the drill-in is in flight" means the REAL `GET /api/mesh/board-url` is held between the click and its delivery, never a hand-set flag
    And "the drill-in has failed" means the REAL resolver REFUSED or the REAL request rejected — one of the three producers named in the feasibility note — never a hand-set flag
    And every Then in a headless scenario is read off the rendered tree the component actually produced, never off a source file

  # HEADLINE 1 — THE TWO INVERSIONS, KILLED IN ONE TABLE, and it is the whole of DESIGN's
  # "Observed" column. Today the abbreviation gate is `abbreviateDrillIn && !opening && !openError`
  # and the glyph gate is `opening || openError ? null : …`: the two non-rest states keep their
  # words at every width AND throw away the arrow — the exact opposite of the ladder, in the exact
  # place the ladder is decided. The at-rest rows are the CONTROL: they are the behaviour that
  # ships, they must be unchanged, and without them the other rows prove only that something
  # renders an arrow.
  @executable
  Scenario Outline: whether the drill-in renders its words, and whether it keeps its pinned glyph, in each of its three states either side of the abbreviation point
    Given a card that <assignment>
    And its drill-in in <state>
    When region 5's drill-in is read off the rendered tree
    Then its words are <words>
    And its pinned `→` is <glyph>
    And whatever words it renders it renders WHOLE — the element's text is the label's words, never a prefix, a stub or an ellipsised fragment of them
    And when the words are dropped they are dropped WHOLE — the drill-in has exactly ONE child, and that child is the pinned glyph
    And the glyph's text is byte-identical in every state — one glyph, three states, three treatments, never a second shape the operator has to learn
    And the element still carries its shrink weight and its EXPLICIT minimum-width floor in this state, and carries neither `shrink-0` nor `min-w-0` itself — the floor is what keeps the arrow inside the card's content box, and it may not be dropped by whichever branch now renders the class list

    Examples:
      | case                                                                          | assignment                                | state      | words         | glyph   |
      | TODAY, UNCHANGED — at rest, room for the words                                | is assigned to "worker-a" (8 characters)  | at rest    | present       | present |
      | TODAY, UNCHANGED — at rest, exactly AT the abbreviation point (INCLUSIVE)     | is assigned to a node id exactly AT the abbreviation point | at rest    | present       | present |
      | TODAY, UNCHANGED — at rest, one character past it (the shipped DG-19 fixture) | is assigned to a node id ONE character past it | at rest    | DROPPED WHOLE | present |
      | THE CHANGE — the in-flight state gets its glyph back                          | is assigned to "worker-a" (8 characters)  | in flight  | present       | present |
      | THE BOUNDARY, RE-ASKED IN FLIGHT — one decision, not one per state            | is assigned to a node id exactly AT the abbreviation point | in flight  | present       | present |
      | THE CHANGE — the in-flight state is subject to the gate like everything else  | is assigned to a node id ONE character past it | in flight  | DROPPED WHOLE | present |
      | THE CHANGE — the failed state gets its glyph back                             | is assigned to "worker-a" (8 characters)  | failed     | present       | present |
      | THE BOUNDARY, RE-ASKED FAILED                                                 | is assigned to a node id exactly AT the abbreviation point | failed     | present       | present |
      | THE WIDEST STATE, ABBREVIATED — the cell the whole gap is about               | is assigned to a node id ONE character past it | failed     | DROPPED WHOLE | present |
      | THE CONTROL — no chip, no pressure, so no abbreviation in ANY state           | carries no assignment                     | failed     | present       | present |
    # AMENDED 2026-08-12 (PO) — THE BOUNDARY IS NAMED, NOT NUMBERED. These cells read "a
    # 29-character node id" and "a 30-character node id" when this table was authored, because
    # `REGION5_DRILLIN_ABBREV_AT_CH` was 31. ADR-014 re-derived it from the grid's own floor row
    # and it is now 12, so the absolute lengths were stale the day that ruling landed while every
    # CLAIM in the table stayed exactly true. The lane already sized its boundary fixtures FROM
    # the constant rather than hard-coding a length, so no lane changed — only this prose, which
    # is the "quoted byte-for-byte" species this milestone has now been bitten by three times.
    # State the boundary by name and the table survives the next re-derivation too.
    #
    # ROWS 6 AND 9 ARE THE INVERTED ABBREVIATION GATE, CAUGHT. They are the only two rows in this
    # table that today's build fails on the WORDS, and they fail it at every width — which is
    # precisely DESIGN's complaint: `Open failed` renders at 390 on a card whose target already
    # cost the drill-in its words. A build that deletes `&& !opening` but not `&& !openError`
    # passes row 6 and fails row 9, which is why both are here rather than one standing for both.
    #
    # ROWS 4 THROUGH 9 ARE THE DROPPED GLYPH, CAUGHT. Today the arrow is rendered only at rest, so
    # every non-rest row fails on the glyph. Clause 2 is why this is not cosmetic: at the
    # abbreviated width the glyph is ALL there is, so a failed drill-in that drops both its words
    # and its arrow renders NOTHING AT ALL — an affordance that vanishes at exactly the moment the
    # operator needs to retry it. Row 9 is that cell, and it is the reason this table has three
    # states rather than the one the gap's title names.
    #
    # ROWS 2, 5 AND 8 PIN THE THRESHOLD FROM THE INCLUSIVE SIDE IN EVERY STATE, and rows 3, 6 and 9
    # from the exclusive side. They are what stops the fix being written as three per-state
    # conditions that agree today and drift tomorrow: `abbreviateDrillIn` is ONE decision, taken
    # from the chip's target, and a build that re-derived it inside a state branch would have to
    # get the same `>` right three times.
    #
    # ROW 10 IS NOT PADDING. The gate is driven by the CHIP's target — an unassigned card exerts no
    # pressure and abbreviates in no state. A build that reached "the failed state abbreviates" by
    # keying the abbreviation to the STATE rather than to the target would pass rows 1 through 9 and
    # fail only this one, while inventing pressure on a row that has none and hiding a live control
    # behind a bare arrow on the emptiest card on the page.

  # HEADLINE 2 — THE MARK ITSELF, and clause 3's whole argument is that it must be spent
  # VERTICALLY. Region 5's horizontal width is the resource DG-13…DG-22 fought over; a dashed BOX,
  # a ring or a scrap of padding would buy the "absent" reading with the exact currency ADR-008
  # forbids anyone spending — and would do it invisibly, because no budget would move and no lane
  # would notice. The class facts below are the only headless guard on that, and they are the
  # reason this scenario is not simply "the designer will see it".
  @executable
  Scenario Outline: the three states take three treatments, and the failed one buys its mark with height rather than width
    Given the drill-in in <state>
    When the element's own rendered class list is read
    Then its tone is <tone>
    And what sits beneath it is <rule beneath>
    And its hover treatment is <hover>
    And in NO state does it carry a `destructive` token — a board that did not resolve is ABSENT, not broken, and the surface may not claim the mesh has failed
    And in NO state does it carry an `accent` token — accent is the surface's attention colour and this state is asking for none
    And in NO state does it gain horizontal padding, a ring, or a border on any edge but the bottom — the mark costs height, never width
    And the element's children, their order and their identities are the SAME in this state as at rest: only the tone, the rule, the accessible name and the state's own WORDS differ
    # THE WORDS ARE THE FOURTH DIFFERENCE — corrected at build (PO, 2026-08-11). As authored this
    # Then named three differences and the words were not among them, which put it in direct
    # contradiction with DESIGN §DG-47-5's own states table (`Open board` / `Opening board...` /
    # `Open failed`) and with the scenario ABOVE it in this same feature, which asserts those three
    # strings state by state. Both cannot hold: the lane implementing this Then compared the
    # rendered subtree including its text and went red on a CORRECT build, reporting a structural
    # violation that did not exist.
    #
    # Nothing about the clause's INTENT changes, and its own comment below states that intent twice:
    # no element is added, removed or reordered. The lane normalises the three state words to one
    # sentinel and compares everything else literally — including the ` →`, so a words↔glyph
    # REORDER is still caught, which is the failure the clause is actually guarding against.

    Examples:
      | case                                                                     | state     | tone                                                     | rule beneath                                            | hover                                                       |
      | TODAY, UNCHANGED — at rest is the live-action token                      | at rest   | the `primary` token, semibold — a healthy card           | none                                                    | the underline it has today                                  |
      | THE CHANGE (see F-47-04-QA-4) — in flight is the product's one motion    | in flight | the `primary` token, plus the product's motion token     | none                                                    | the underline it has today                                  |
      | THE CHANGE, AND THE HEART OF DG-47-5 — failed is the house absent mark   | failed    | the `muted-foreground` token, and NOT `primary`          | a dashed bottom rule in the muted ramp                  | the dashed rule becomes SOLID, and the underline is DROPPED |
    # ROW 3's HOVER CELL IS TWO CLAUSES AND BOTH ARE LOAD-BEARING. Clause 3 asks for the dashed rule
    # to go solid on hover AND for the state's underline to leave, "so there is one line and never
    # two". A build that adds `group-hover:border-solid` and leaves `group-hover:underline` in place
    # paints two horizontal lines under one element — the defect the clause names, produced by the
    # cheapest possible edit, and invisible to any lane that only checks the class was added.
    #
    # ROW 1 IS THE NON-VACUITY CHECK for rows 2 and 3. If the at-rest state were not asserted to be
    # `primary`, "the failed state is not `primary`" would be satisfied by a build that made the
    # whole drill-in muted in every state — which is DG-47-5 inverted: the healthy card would lose
    # its live-action token and every board would read as unreachable.
    #
    # ROW 2 CARRIES A FINDING RATHER THAN A DECISION. DESIGN's states table asks for the in-flight
    # pulse and calls it "existing"; the element has never carried motion (F-47-04-QA-4). The row
    # stands because the table is binding and no mock is committed, but it is the ONE cell here a
    # designer's correction can strike without touching anything else in this contract.
    #
    # THE LAST THEN IS WHAT KEEPS THIS A TREATMENT CHANGE. If reaching the failed treatment adds,
    # removes or reorders an element in region 5, the row's yield order has been re-opened by a
    # styling ruling — which is exactly what ADR-008 refuses, and which scenario 5 then renders
    # under a filter to be sure.

  # HEADLINE 3 — IT IS STILL A CONTROL, AND THIS IS THE DELIBERATE DEPARTURE FROM THE NAV
  # TREATMENT m45 FIXED. The nav's unavailable item has no destination at all; this one has a
  # destination that did not resolve THIS TIME, and a second click is the operator's whole
  # recovery. `aria-disabled` would take that away and lie about the element.
  @executable
  Scenario: the failed drill-in is marked absent, never disabled — the second click is the retry
    Given the drill-in has failed on a card whose siblings are at rest
    When the control the operator activates is read off the rendered tree
    Then it carries NO `aria-disabled` — in this state, in the in-flight state and at rest, the attribute is emitted in none of them
    And it carries no `disabled` property either — the failed state changes the mark, never the affordance
    And it still carries its activation handler, and it is the SAME element it was at rest: same node type, same position in region 5, same identity
    And no sibling card's drill-in has taken any part of this treatment — one card's failure is one card's
    # THE RETRY ITSELF IS 47/01 TASK 00's and is deliberately NOT restated here. What this scenario
    # adds is the half a behavioural lane structurally cannot see: 47/01 asserts that a second
    # click issues a fresh request, and a build that emits `aria-disabled="true"` while still
    # firing its handler passes every one of those Thens and breaks clause 4 outright — the control
    # would announce itself as unavailable to every screen reader while remaining clickable by
    # mouse. An attribute's ABSENCE is a structural fact; the recovery it would have removed is a
    # behavioural one. Two lanes, two claims, no overlap.
    #
    # AND THE a11y LANE IS OFF (see the header), which is exactly why this is asserted here by hand:
    # there is no axe-core run in this story to catch it, and DG-47-5 clause 4 is the one clause in
    # the gap whose violation is INVISIBLE on a screenshot.

  # HEADLINE 4 — THE ACCESSIBLE NAME NAMES THE REMEDY. This is the one good property of the
  # affordance ADR-006 deletes, inherited rather than lost with it. Today's `title` is the visible
  # label repeated — a tooltip that tells the operator what they can already read and names no
  # command — which is DESIGN's own "Observed" row.
  @executable
  Scenario Outline: the drill-in's accessible name names the remedy rather than restating the words
    Given the drill-in in <state> on a card whose repo is <repo identity>
    When the accessible name is read off the control an operator actually activates — the element assistive technology takes its name from, never a decorative span
    Then the name <what it says>
    And wherever that name is carried, `title` and `aria-label` carry the SAME string — one name, two channels, never two spellings of one fact
    And the name does not depend on whether the words were abbreviated: the ABBREVIATED failed drill-in, whose only visible glyph is `→`, carries exactly the same name as the unabbreviated one

    Examples:
      | case                                                              | state     | repo identity                          | what it says                                                                                                                                  |
      | TODAY, UNCHANGED — at rest the name is the affordance and the repo | at rest   | a workspace the payload names          | names the affordance and the repo, exactly as it does today                                                                                   |
      | TODAY, UNCHANGED — in flight is not a failure and does not read as one | in flight | a workspace the payload names       | is unchanged from the at-rest name                                                                                                            |
      | THE CHANGE — the failed name states the failure AND the remedy    | failed    | a workspace the payload names          | states that a board could NOT be opened, names the repo by that name, and names the remedy command `aof work ui` verbatim — and is NOT the visible label repeated |
      | THE FALLBACK — a repo the payload can only identify by id         | failed    | a workspace row carrying no name       | the same sentence, naming the workspace id where the name would be — the fact is identifiable either way, or the remedy names nothing          |
    # THIS TABLE ASSERTS THE SENTENCE'S OBLIGATIONS, NOT ITS BYTES, AND THAT IS DELIBERATE. DESIGN
    # §DG-47-5 clause 5 quotes the sentence in full and it is the baseline; what is pinned here is
    # what an outsider can check and what a re-wording cannot invalidate — that it names the
    # FAILURE, the REPO and the REMEDY COMMAND, and that it is not the visible label restated.
    # F-47-01-QA-1 has the visible words under an open ruling, and a contract that pinned prose the
    # designer has not settled would have to be amended the day it lands. `aof work ui` is pinned
    # verbatim because it is a COMMAND — a fact of the system, not a phrase.
    #
    # ROW 3's LAST CLAUSE IS TODAY'S DEFECT, NAMED. `title="Open failed"` passes any test that only
    # asks whether a title exists. The clause that kills it is "not the visible label repeated", and
    # it is the reason this scenario reads the name and the label together rather than in two lanes.
    #
    # ROW 4 IS THE ONE ROW WHOSE PRODUCER IS NOT YET ESTABLISHED, and it is said out loud rather
    # than discovered at build. The mounted fixtures all publish a NAMED workspace; the card's name
    # falls back to the workspace id only when the payload's workspace row carries none. The likely
    # producer is the additive fixture option THIS STORY'S TASK 00 ALREADY REQUIRES for its own
    # long-name rows, used to publish a nameless workspace instead of a long-named one — one option,
    # two tasks. If a nameless row cannot be produced through the real publish path, ADR-008's
    # instruction applies and it comes back to the architect; it is not quietly downgraded to a
    # source read, and it is not dropped, because a remedy sentence that names an empty repo is a
    # remedy that names nothing.

  # HEADLINE 5 — THE INTERSECTION NOBODY ELSE RENDERS: THE WIDEST STATE OF THE DRILL-IN, ON THE ROW
  # THAT JUST GAVE UP ITS NAME COLUMN. ADR-008 binds DG-47-5 to this row in terms, and neither
  # task's own lanes reach it — task 00 renders a healthy drill-in on a filtered row, and everything
  # above renders a failed drill-in on an unfiltered one.
  @executable
  Scenario: the treatment is a property of the element, not of the view — a repo-filtered row reads the drill-in exactly as an unfiltered one does
    Given the same card, the same minted assignment and the same failure, rendered UNFILTERED and then repo-FILTERED
    When the two drill-ins are compared element by element
    Then they are identical: the same children in the same order, the same tone, the same rule beneath, the same pinned glyph, the same abbreviation decision and the same accessible name
    And the filtered row's yield order is unchanged by the failure — the chip's tail still yields before the drill-in's words, and the chip's `→ <target>` still renders IN FULL and still yields last
    And nothing in region 5 has been ellipsised to a fragment in either render
    And reading the three region-5 budgets back from the module that exports them gives the same three numbers in both renders — the failure consulted no threshold of its own and relaxed none
    # IT IS AN EQUIVALENCE RATHER THAN A FILTERED-ONLY ASSERTION FOR A SEQUENCING REASON, and the
    # reason is worth stating: the drill-in's facts do not read the filter, so this scenario is
    # green whether or not task 00's predicate has landed. If a build ever makes them read it —
    # keying the treatment, the abbreviation or the name to the view — this is the scenario that
    # says so, and it says so without waiting for the other task.
    #
    # THE SIXTH CLAUSE OF DG-13 CLAUSE 5 — no two elements in region 5 may occupy the same pixels —
    # APPLIES TO THIS RENDER MORE THAN ANY OTHER, because it is the widest state of the most
    # width-constrained element on the narrowest version of the row. It is PROXIED here by the
    # structural facts above and JUDGED for real in scenario 7. Saying which is which is the whole
    # of the geometry suite's own boundary, and it is restated because this is the render most
    # likely to be waved through on a green lane.

  # HEADLINE 6 — THE REGRESSION HALF, MADE CHECKABLE, AND IT CARRIES A PREREQUISITE. SPEC and STORY
  # name the same single forbidden outcome: a silent divergence between the render and the suite.
  # This change can produce a LOUDER one — a conforming build that turns another story's green
  # lanes red — and that deserves a Then rather than a note.
  @executable
  Scenario: the geometry contract gains a lane and loses none, and the drill-in stays addressable in the state this change alters
    Given the fitness-locked geometry suite as it stands before this change — eleven lanes, of which two assert on region 5 and NEITHER renders a non-rest drill-in
    And 47/01's shipped board drill-in lanes, which read the failed label off the rendered tree
    When both suites are run after this change lands
    Then every lane name that existed before still exists, and every one of them passes
    And the geometry suite has GAINED at least one lane whose name says it is about the drill-in's NON-REST states — the amendment is visible in the run, not only in the file
    And no pre-existing lane's expected value has changed: the same fixtures produce the same rendered facts they produced before
    And reading the three region-5 budgets back from the module that exports them gives 8 / 12 / 12 — the name budget UNMOVED, and the chip slot and the drill-in abbreviation point RE-DERIVED DOWNWARD by ADR-014 (they read 41 and 31 when this clause was written, each derived from the 360.66px row the card takes at exactly one viewport). A budget that moves DOWN is a tightening — nothing that dropped before renders now — so ADR-008's "no budget is relaxed to collect the freed width" is applied to itself rather than weakened
    And the drill-in is addressable in ALL THREE states through an identity no clause of DG-47-5 removes — not through the hover class clause 3 drops, and not through the `title` clause 5 rewrites
    And the assign affordance's own region-6 lanes — the fixed action width, the picker floor, the message ladder and the coded refusals — are untouched in expectation and in outcome
    # THE SECOND-TO-LAST CLAUSE IS FINDING F-47-04-QA-3 WEARING A THEN, and it is here rather than in
    # the header because it is the one prerequisite that fails SILENTLY in the direction of a false
    # green. Both harnesses address the drill-in by a property this change removes: one finds the
    # label span by its hover underline, the other finds the element by a `title` that starts with
    # the visible label. A build that re-based only the one whose suite it happened to run would
    # leave the other reading `""` or `null` — and `""` is what an assertion about an ABSENT label
    # is most likely to be compared against.
    #
    # THE BUDGETS ARE READ BACK RATHER THAN INSPECTED. They are exported values; an outsider imports
    # the module and reads three numbers. It is the one clause here that would go quietly wrong: a
    # failed drill-in that fits because someone lifted 31 to 40 looks exactly like a failed drill-in
    # that fits because it gave up its words — and ADR-008's "no budget is relaxed" would have been
    # broken by the very change that quotes it.

  # ────────────────────────────────────────────────────────────────────────────────────
  # THE HUMAN GATE. Everything above is a class/structure fact. Whether the failed state actually
  # reads as ABSENT rather than BROKEN, whether the dashed rule is legible, and above all whether
  # DG-47-5 clause 1 holds — that no state renders WIDER than `Open board →` — are claims about
  # pixels. Clause 1 is the gap's central claim and NO headless lane can settle it (F-47-04-QA-5).
  #
  # BROWSER LANE (QA-OWNED). QA runs the render and drives the harness; the designer judges the
  # screenshots it is handed and has no `Bash`. Per the house design-render discipline `npx
  # playwright` is POLICY-BLOCKED — the render drives the cached ms-playwright Chromium directly
  # (`--headless=new --screenshot=<ABSOLUTE forward-slash path>`). The fleet is the fixed-port
  # origin `http://127.0.0.1:4181/`. THE a11y LANE IS OFF (see the header): no axe-core run, and no
  # a11y finding will come from one — clauses 4 and 5 are judged structurally above and by eye here.
  #
  # THE WIDTHS ARE THE CARD'S, NOT THE PAGE'S. A milestone card is viewport-INVARIANT by
  # construction — the grid is `repeat(auto-fill, minmax(320px,1fr))` inside a `max-w-[1240px]`
  # column — so a wider viewport buys COLUMNS, not width. Computed from the declared values, and
  # carried over from task 00 rather than re-derived: ~371px at 1440, ~363px at 1280, ~326px at 390
  # and ~312px at 768, where two columns make the card NARROWEST. 1280 is where every region-5
  # budget was derived; 768 is F-47-04-QA-2, the width most likely to falsify a width claim and the
  # one no ADR names.
  @uat @design
  Scenario Outline: a human judges the three states, in both forms, and measures the one clause no lane can assert
    Given the drill-in captured at rest, in flight and failed — each in its unabbreviated form and again in its abbreviated form — at <width>, on a card carrying a real minted assignment
    When QA captures the six renders, measures the rendered width of the drill-in in each, and hands the screenshots and the numbers to the designer
    Then the designer judges them against DESIGN §DG-47-5's five clauses and its three-states table, and returns CONFORMS or names the GAPS
    And in NO state does the drill-in push a neighbour, overrun the card's content box, or make the row wider than the at-rest render of the SAME card — a state may occupy more pixels than at rest where the row has slack (`Opening board...` is six characters longer than `Open board` and DESIGN pins both); what is forbidden is a state that takes width from the chip, from the name column or from the card
    # THIS THEN WAS REPLACED AT BUILD (PO, 2026-08-11), on the designer's ruling closing
    # F-47-04-QA-5. As authored it read "NO state's drill-in measures wider than the
    # at-rest `Open board →` at the same width" — and that FAILS A CONFORMING BUILD: on a
    # roomy card (1440, short target) the in-flight element renders `Opening board...` + ` →`
    # and legitimately measures wider. That is not a violation, it is slack being used.
    # Clause 1's invariant is DEMAND, NOT OCCUPANCY — the forbidden thing is a state taking
    # width from something else, never a state spending width nothing else wanted. Worth
    # noting how close this came to shipping: the clause was ALSO unsatisfiable read as
    # string length (DESIGN pins all three labels verbatim and two are longer than the
    # rest label), so both of the obvious readings were wrong in opposite directions.
    And no two elements in region 5 occupy the same pixels in ANY of the six renders, and nothing has left the card's content box
    And the three states are distinguishable at a glance, and still distinguishable in the ABBREVIATED form where the only mark is a single glyph and its tone
    And the failed state reads as ABSENT — a board that is not here — and not as BROKEN: nothing on the card suggests the mesh has failed
    And the dashed rule is ONE line and never two, on hover as well as at rest
    And nothing but the in-flight state carries motion
    And <what to check hardest at this width>
    And absent a render the verdict is INCONCLUSIVE naming the missing render — the width, the state and the form it was supposed to show — never inferred from component source
    And a missing mock is NEVER grounds for INCONCLUSIVE: DESIGN §DG-47-5's checklist is the binding baseline until `mocks/` lands, and a committed mock that rules otherwise is a legitimate PO override

    Examples:
      | width | what to check hardest at this width                                                                                                                        |
      | 1280  | THE REFERENCE. Every region-5 budget was derived from this width's ~360.66px row, so a GAP here is a GAP in the contract itself rather than in the build     |
      | 390   | the narrow rail DESIGN's own breakpoint table names — one column, so a ~326px card, and the width at which a failed drill-in that kept its words used to overrun |
      | 768   | **THE ADDED ROW (F-47-04-QA-2)** — two columns make this the NARROWEST card on the surface. If the widest state overruns anywhere it overruns here            |
      | 1440  | the WIDEST card, where the abbreviated form is least likely to be reached and a build that fixed only the abbreviated state would look correct                |
    # THE ABBREVIATED FORM IS HALF THE RENDERS ON PURPOSE. It is the form clause 2 is about — the
    # one where the glyph is all that remains and where today's build renders NOTHING — and it is
    # the form a screenshot of a comfortable card never shows. A judgement taken only in the
    # unabbreviated form would CONFORM a build that still drops the arrow.

  # THE RULING THIS BUILD DOES NOT MAKE, recorded as a scenario so it has somewhere to land rather
  # than being carried in a report nobody reads twice.
  @uat @design
  Scenario: the visible words are owed a ruling, and it is the PO's to record — not this build's to guess
    Given the failed renders above, and the cause the resolver now actually gives — `workspace-not-local`, "not checked out on this machine" (ADR-011)
    When the designer judges whether `Open failed` is still the right words for a cause that specific, and whether a remedy the operator can act on belongs in the visible label rather than only in the accessible name
    Then the ruling is recorded by the PO as an amendment to 47/01 task 00's pinned strings — the one place those words are pinned — and is NOT decided inside this build
    And whatever the ruling, the treatment, the ladder, the pinned glyph and the accessible-name obligations are unchanged by it: this contract is written to survive the wording, and no row above cites a word of it
    And if the ruling changes the words, the widest-state measurement is RE-TAKEN, because the words are what the width is measured of
    And the ruling names whether the in-flight label stays `Opening board...` — it is the longest string this element ever renders, and F-47-04-QA-5 turns on it

  # THE BASELINE HAND-OFF. Stated once so the follow-on has somewhere to attach — and with the one
  # honest caveat this element carries that task 00's row does not.
  @uat @design
  Scenario: an approved drill-in render becomes the visual-regression baseline
    Given the designer has judged the drill-in's states CONFORMS at every width and in both forms
    When the approved renders are recorded
    Then each becomes the baseline QA's `toHaveScreenshot` visual-regression compares future renders against
    And a later render that drifts from an approved baseline is a QA finding, routed like any other
    And the IN-FLIGHT state is baselined with its motion accounted for — it is the one state here that animates, and a screenshot captures one frame of it; the at-rest and failed states are motion-free and a screenshot locks them completely
    And building those baselines out into a hard gate is a QA-owned follow-on, explicitly out of scope for this story
