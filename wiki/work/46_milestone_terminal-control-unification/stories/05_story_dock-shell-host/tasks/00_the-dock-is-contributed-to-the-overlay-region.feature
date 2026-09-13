<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 46/05, the CHANNEL: a surface contributes its terminal dock
# through the shell's existing region-keyed bus and it lands in the `overlay` region;
# with NO shell present the same contribution renders IN PLACE; the dock takes its
# stacking rung from the ladder BY NAME; and the surface that hosts it declares
# `content:fixed`.
#
# WHY A THIRD SLOT AND NOT A NEW MECHANISM. Milestone 45 shipped the channel and left
# it two slots wide — `SLOT_SURFACE` and `SLOT_NOTICE`
# (`ui/src/app/shell-bus.mjs:30-31`) — plus the fullscreen door. `contribute(region,
# node)` is ALREADY region-keyed (`shell-bus.mjs:72-84`) and `Shell.tsx:316-360`
# ALREADY renders the overlay row with a comment naming *"m46's dock"* as its next
# occupant. So the dock's home exists and the bus's shape exists; what does not exist
# is a slot name for the dock. ADR-009 adds exactly that and nothing else.
#
# THE DEGRADED PATH IS THE REASON THE BUS IS THE RIGHT SEAM, not a fallback.
# `shell-bus.mjs:18-22` states it in terms: with no shell present a contribution
# renders where the surface's own bar renders it today. That is what keeps
# `test/support/board-app-harness.mjs` — which mounts the `<Board>` COMPONENT directly
# — working with zero harness edits, and it is why a prop or a React context was
# refused in 45 (a context is unreachable by `test/support/mini-react.mjs`, which
# implements five hooks and no context).
#
# LITMUS: every Then is either a returned VALUE from a framework-free `.mjs` loaded by
# `node:test` under plain `node` — `ui/src/app/shell-bus.mjs` and
# `ui/src/app/shell-layout.mjs`, no bundler, no DOM, no browser — or, where the clause
# is about the rendered TREE rather than the model, a fact read off the tree the
# house's headless mini-React harnesses render (`test/support/shell-app-harness.mjs`,
# `test/support/board-app-harness.mjs`). Both lanes are `node --test`. NO scenario here
# needs a browser; an `@executable` scenario that does is the failure mode.
#
# NOT ASSERTED HERE — structural claims, each already owned or owed to a GATE, per
# ARCHITECTURE §Fitness functions ("invariants that belong HERE and must NOT appear in
# a task `.feature`"):
#   - "the z rung is IMPORTED rather than retyped", and "no `z-50` or undeclared rung
#     literal survives anywhere in `ui/src`" → `acd-shell-z-ladder-single-home`, whose
#     named `FleetTerminalView.tsx` exemption is REMOVED (not re-pointed) when story
#     46/04 deletes that file; the list is shrink-only.
#   - "the control contributes; it does not import `ui/src/app/Shell`" →
#     `acd-shell-bus-single-host` (ADR-009 §Consequences).
#   - "the control's `.mjs` set imports no React and nothing from either surface
#     folder" → `acd-terminal-control-boundary` (new, ADR-001/005).
#   - "NO per-surface `fixed inset-0` layer exists in `ui/src`" — ADR-005's named
#     prohibition, and ADR-009 repeats it. QA FLAG: there is NO detector for that shape
#     today. `acd-shell-z-ladder-single-home` catches the `z-50` half of the one live
#     violation, not the `fixed inset-0` half, and the exemption retires with the file
#     rather than with the rule. Recommended as a new gate (or as a clause on the
#     existing one) rather than smuggled in here as a behavioural Then — the m45
#     precedent, where QA refused the same whole-tree claim in `45/03/01_shell-regions`.
#
# ISOLATION: `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED, never
# the full suite (`global-work-propagation.test.mjs` binds :4182, which the live
# control daemon holds).

@executable @ui @work @design
Feature: a surface contributes its terminal dock through the shell's one region-keyed bus, it lands in the overlay region, and with no shell it renders in place
  In order that the dock has ONE home the shell owns — out of flow, on a named rung, beside the fullscreen occupant — without any surface growing a layer of its own or any headless harness needing an edit
  the bus must carry a third contribution slot whose region is `overlay`, hand the dock its rung from the closed ladder by name, keep the no-shell contribution rendering in place, and leave the fullscreen adoption host childless while the dock is standing

  Background:
    Given the shell's bus and layout models loaded under plain `node` — no bundler, no DOM, no browser
    And the region and slot names are imported constants, never strings typed twice

  # HEADLINE. One bus, three slots, and the region each one names. The dock is the third
  # and it is the only one whose region is out of flow.
  Scenario Outline: a contribution is keyed by its slot, and the shell places it in the region that slot names
    Given a surface publishes <what> to the <slot> slot
    When the shell reads its contributions back
    Then the contribution is readable under <slot> and under no other slot
    And the shell places it in the <region> region, whose row is <row>
    And that region <in flow?>
    And withdrawing the contribution leaves <slot> holding nothing, and leaves every other slot untouched

    Examples:
      | case                          | what                          | slot         | region   | row                                        | in flow?                                                      |
      | the surface's own controls    | a status legend and ⟳ sync    | surface slot | chrome   | the top bar at 1280, the surface bar at ≤1023 | is in flow, and its height is summed into the published chrome height |
      | the surface's one notice      | the board's `serverGone` strip | notice rail  | chrome   | R1, above both bars                        | is in flow, and PUSHES the bars down rather than overlaying them |
      | THE DOCK — new in this story  | the terminal dock             | dock         | overlay  | R5, a sibling of `content`                 | is OUT of flow and contributes ZERO to the height of anything |
    # ROW 3 IS THE ONLY NEW ROW. Rows 1 and 2 ship today and are stated so the third is
    # read as one more entry in an existing vocabulary rather than as a new mechanism —
    # which is the whole of ADR-009's first clause. The out-of-flow half of row 3 is what
    # makes task 01 necessary: a region that costs nothing cannot shrink the content box,
    # so the shrink has to be published as its own number.

  # THE CAP, and the stale-release edge that comes with it. `contribute` returns the
  # release that withdraws it, and a surface returns that release as its effect's
  # cleanup — so a surface that unmounts takes its dock with it. The edge is what
  # happens when a release fires LATE, after someone else has published.
  Scenario: each slot holds at most one contribution, a second publish replaces the first, and a stale release withdraws nothing
    Given a surface has published a dock to the dock slot and holds the release it was handed
    When a second dock is published to the same slot
    Then the slot holds exactly one contribution and it is the second one
    And the first publisher's release, fired afterwards, withdraws nothing — the slot still holds the second dock
    And firing that stale release twice more changes nothing and notifies the shell of nothing
    And the second publisher's own release still withdraws the second dock, leaving the slot empty
    # THE SAME SHAPE AS THE FULLSCREEN STALE DISMISSER (`shell-bus.mjs:137-151`,
    # `shell-layout.mjs:762-784`), for the same reason and against the same accident: a
    # component that has been replaced is still holding a live handle, and it fires on
    # unmount, on a socket close, on a stray click. A stale handle that tore down the
    # occupant that IS on screen would take away the terminal the operator is typing into,
    # for a reason three components away.

  # THE DEGRADED PATH. This is not a fallback lane — it is the property that lets the
  # board's whole existing behavioural suite keep its expectations.
  Scenario: with NO shell present the same contribution renders IN PLACE, and no harness needs an edit
    Given the board surface component is mounted directly, with no shell in the tree
    When the board renders a dock, a surface-slot contribution and a notice
    Then no shell is declared present, so nothing is published to the bus
    And each contribution renders IN PLACE — the dock where the board renders it today, the notice as the board's first child, the slot controls in the board's own row
    And the board's own suites read the same tree they read today, with `test/support/board-app-harness.mjs` unmodified
    And the same board component under a shell renders NONE of the three in place — each one is delivered instead
    # The two mounts are the same component. That is the assertion: the surface is honest
    # mounted alone and honest hosted, and it is not told which it is by a prop.

  # THE LADDER IS CLOSED (DG-45-2). The dock does not choose a number; it asks for a name.
  Scenario Outline: the dock takes its rung from the ladder by name, and a rung the ladder does not name cannot be asked for
    When the rung <asked for> is requested from the ladder
    Then the answer is <result>

    Examples:
      | case                            | asked for      | result                                                                                          |
      | the dock's own rung             | dock           | 30 — reserved for this control since m45, and taken by name here for the first time             |
      | the fullscreen occupant's       | fullscreen     | 50 — the top rung, and its occupant is its only occupant                                        |
      | the dispatch toast's            | toast          | 40                                                                                              |
      | sticky chrome                   | stickyChrome   | 10                                                                                              |
      | popovers                        | popover        | 20                                                                                              |
      | the ladder's FLOOR              | content        | REFUSED — `content` is the absence of a rung (z auto) and is never asked for                    |
      | a rung invented under pressure  | dockOverlay    | REFUSED, naming the ladder's own five names and the module that owns them                       |
      | an empty name                   | (empty string) | REFUSED, the same way — a rung is a name on the list or it is nothing                           |
    # The refusal must never answer with a number. "An element that needs a rung this list
    # does not name is a GAP whose fix is to add the rung to `ui/src/app/shell-layout.mjs`
    # first, with a stated meaning" — so the failure mode this closes is a story inventing
    # `z-35` at 2am to get a dock above a legend.

  # ADR-009's last clause, and `shell-layout.mjs:388-392` states it as BINDING: a fitted
  # xterm inside a page-scrolling column has no stable height to fit to.
  Scenario: the surface that hosts the dock declares `content:fixed`, and hosting a dock changes the published chrome height by nothing
    When the dock's host surface declares its content mode
    Then the mode is `content:fixed`
    And its declared scroll owner is its descendants — the content region is never itself the scroll owner
    And the content region declares `min-height: 0`, which is what stops an overflowing child silently growing the parent
    And the published chrome height is IDENTICAL whether a dock is contributed or not — the overlay row contributes zero, in every state
    And the budget verdict is identical too: opening a dock can never move the shell into or out of a chrome breach
    # THE FLEET'S MODE IS NOT RE-DECIDED HERE. The fleet card peek is story 46/04's host
    # and the route table keeps `fleet` on `content:page`; this scenario is scoped to the
    # surface that hosts THE DOCK. If the peek is later found to need a stable box of its
    # own, that is a mode change for the fleet route and it comes back to ADR-009.

  # THE COLLISION `Shell.tsx:349-358` WARNS ABOUT, IN ADVANCE AND IN TERMS: the adoption
  # host is childless "the moment [Build-3]'s overlay region gains a second React child
  # (m46's dock is the named next occupant of this very region)". This story is that
  # moment, so the guarantee gets a scenario rather than a comment.
  Scenario: the dock and the fullscreen occupant share the overlay region without fighting over it
    Given a dock is contributed to the overlay region
    When an occupant is then presented fullscreen, and afterwards dismissed
    Then the fullscreen adoption host holds no React-rendered children at any point — the adopted node and React's own children never share a parent
    And the dock is still contributed after the present, and still contributed after the dismiss — presenting an occupant withdraws nothing
    And the occupant sits on the ladder's `fullscreen` rung and the dock on its `dock` rung, so the occupant covers the dock rather than racing it
    And the shell's chrome is hidden while the occupant is presented, and back afterwards, with the dock's contribution untouched throughout
    # The failure this prevents is silent and specific: React reconciles by POSITION among
    # a parent's children, so an imperative `appendChild` into a parent React also renders
    # into gets the occupant inserted after the dock, or re-parented under it, or removed by
    # a reconciliation that believes it owns the slot. A childless host makes the boundary
    # structural instead of incidental — and until this story there was no second child to
    # prove it with.
