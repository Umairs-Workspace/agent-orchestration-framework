<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 46/05, THE INSET: the shell publishes a dock inset — a named
# custom property of the same species as `--aof-shell-chrome-height` — a `content:fixed`
# surface sizes itself against BOTH names, and the dock's drag clamp becomes a pure
# function of that content box instead of `window.innerHeight`.
#
# WHY THIS TASK EXISTS AT ALL (DG-46-1). Today the dock is an in-flow flex child of the
# board's `h-dvh overflow-hidden` column (`Board.tsx:561-563`), so opening it SHRINKS the
# lanes and the detail panel and everything stays reachable. Task 00 moves it out of
# flow, and the overlay region contributes zero to the height of anything — so without
# this task an open dock at the default 280px covers the bottom 280px of the detail
# panel, which is exactly where its action strip lives. **An extraction that takes the
# operator's buttons away is not an extraction.**
#
# THE DOCUMENTATION OBLIGATION THIS TASK CARRIES, and it is a build obligation rather
# than a scenario: DG-46-1's close condition requires the inset to AMEND
# `45/ARCHITECTURE ADR-005` and `45/DESIGN DG-45-2` **in the same change**. m45 wrote
# that clause itself — *"a published dock inset … comes back here and to ADR-005 as an
# amendment, never as a CSS decision taken inside a story"* (45/DESIGN DG-45-2's 2026-08-07
# amendment note). DG-45-2's `dock` row and ADR-005's consequence both still say an open
# dock *overlays* the bottom of the content region and does not shrink it; after this
# task that sentence is false, and a document left contradicting the shipped primitive is
# a defect, not a nuance. Nothing below asserts the edit — a `.feature` cannot — so it is
# named here, where the build meets it.
#
# LITMUS: every Then is a returned VALUE from a framework-free `.mjs` loaded by
# `node:test` under plain `node` — `ui/src/app/shell-layout.mjs` (the published names,
# the chrome model, the content modes) and the terminal control's own clamp module,
# which per ADR-001 touches no `window` and no `location` and RECEIVES its box. No
# bundler, no DOM, no browser. The arithmetic below is therefore checkable to the pixel
# without rendering anything, which is the entire reason the chrome height became a
# published contract in m45 rather than a number each surface re-derived.
#
# NOT ASSERTED HERE: that the RENDERED page honours the arithmetic — whether an open dock
# at 760×520 really leaves the detail panel's action strip visible, whether the two
# published numbers really compose in the browser's `calc()`. Those are pixel facts and
# they are task 03's `@uat` verdict over renders QA drives. This is the m43/m45 split: the
# model half here, the pixel half there.
# ALSO NOT ASSERTED: "the clamp module reads no `window`" and "no port/viewport global
# appears in the control's `.mjs` set" — structural, owned by
# `acd-terminal-control-boundary` (new, ADR-001/005).
#
# ISOLATION: `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED, never the
# full suite (`global-work-propagation.test.mjs` binds :4182, which the live control
# daemon holds).

@executable @ui @work @design
Feature: the shell publishes a dock inset beside the chrome height, a content:fixed surface sizes itself against both, and the drag clamp is a pure function of that box
  In order that an open dock costs the content region its height exactly as it does today — so the operator's action strip is never underneath it — and that a dock dragged to its maximum is a maximum the shell's own box agrees with
  the shell must publish the dock inset as one named number of the same species as the chrome height, publish zero when no dock is open, and hand the drag and the default ONE clamp derived from `100dvh` minus both names

  Background:
    Given the shell's layout model and the control's clamp loaded under plain `node` — no bundler, no DOM, no browser
    And the clamp receives its content box as an argument and reads no viewport global of its own

  # HEADLINE. One more name, the same species, the same rules — not a second mechanism.
  Scenario: the dock inset is published ONCE, under one name, in dynamic viewport units, and a surface sizes itself against BOTH names
    When the shell publishes the number a height-constrained surface must subtract for an open dock
    Then it is published once, under one name, exactly as the chrome height is
    And the sizing expression a `content:fixed` surface is given subtracts BOTH names from `100dvh` — the chrome height and the dock inset
    And it names `dvh`, never `vh` — a mobile browser's collapsing URL bar changes the viewport, and a terminal sized to `vh` overflows the moment it does
    And it is never a literal 280 and never a literal 0: both are wrong in every combination the table below enumerates
    And a surface can derive its available height from the two names without measuring the document
    And each name has exactly one home — a surface that re-derived either would be free to disagree with the shell about where the content region ends
    # SAME SPECIES, DELIBERATELY. m45 named the shape in advance ("a new named primitive
    # of the same shape as `--aof-shell-chrome-height`"), and sameness is the point: one
    # publication mechanism, one unit, one fallback discipline, so the next milestone that
    # needs a third band does not invent a third way of saying it.

  # THE COST, ENUMERATED. "An open dock costs the content region its height, exactly as
  # it does today" (DG-46-1) is arithmetic, so it is stated as arithmetic.
  Scenario Outline: an open dock costs the content region exactly its own height, and a closed one costs nothing at all
    Given a <viewport> viewport with <chrome rows> and the dock <dock state>
    When the shell publishes its chrome height and its dock inset
    Then the chrome height is <chrome>
    And the dock inset is <inset>
    And the content box a `content:fixed` surface sizes itself to is <content box>
    And the board's layout inside that box is what it is today: the lanes and the detail panel shrink, and nothing is overlaid

    Examples:
      | case                                      | viewport | chrome rows          | dock state                  | chrome | inset    | content box |
      | no dock has ever been opened              | 1280×800 | one bar              | absent                      | 48     | 0        | 752         |
      | the dock was closed with ✕                | 1280×800 | one bar              | closed                      | 48     | 0        | 752         |
      | the ordinary open dock                    | 1280×800 | one bar              | open at its default 280     | 48     | 280      | 472         |
      | dragged to its maximum                    | 1280×800 | one bar              | open at its maximum 376     | 48     | 376      | 376         |
      | dragged to its minimum                    | 1280×800 | one bar              | open at its minimum 48      | 48     | 48       | 704         |
      | THE DESKTOP WINDOW                        | 760×520  | two bars             | open at its default 216     | 88     | 216      | 216         |
      | collapsed — a steady state, not a variant | 1280×800 | one bar              | collapsed to its header      | 48     | measured | 752 − measured |
      | a notice standing, chrome in breach       | 768×520  | two bars + 33px rail | open at its maximum 199     | 121    | 199      | 200         |
    # ROW 2 IS THE ONE A REVIEWER MUST BE ABLE TO CONFIRM COSTS NOTHING: a closed dock
    # publishes a ZERO inset — no reserved band, no minimum height, no empty border. That
    # is the notice rail's own rule (`45/03/01_shell-regions`), restated because the
    # temptation is the same: reserving 48px against a dock that is almost never open
    # would cost every board 48px forever.
    # ROW 7 IS THE ROW MOST LIKELY TO BE MISSED. A collapsed dock still paints its header
    # over the content region, so a collapsed dock whose inset is 0 covers the bottom of
    # the detail panel by exactly the header's height — the same defect as the open case,
    # smaller and harder to see. `measured`, never a constant: the header is `px-4 py-2`
    # around an 11px line, so its height is content-driven and is an INPUT to the model,
    # exactly as the notice rail's is.
    # ROW 8 IS THE COMPOSITION EDGE. m45's own budget table predicts this combination
    # BREACHES the 432px content floor (399px), and the rail is exempt and ADDITIVE. The
    # inset must keep composing straight through the breach — the two numbers are
    # independent, and a clamp that special-cased the breach would be wrong in the one
    # state the operator most needs their buttons.

  # THE BUG. `TerminalDock.tsx:120` clamps to `Math.round(window.innerHeight / 2)`. The
  # INPUT is wrong by exactly the chrome height (the viewport IS the content box plus the
  # chrome), so the ceiling it computes is wrong by half of it — and every pixel of that
  # error is dock hanging past the bottom of the box the shell says it owns.
  @bug
  Scenario Outline: the drag clamp is a pure function of the content box, never of the viewport
    Given a <viewport> viewport whose chrome measures <chrome>
    When the drag asks for a height of <asks for>
    Then the clamp yields <clamped to>
    And the ceiling it clamped against is the content box's own — today's viewport ceiling is <viewport ceiling>, which sits <too tall by> px past the bottom of that box
    And the clamped height never exceeds the content box, so the dock's top edge is never above the content region's top — it cannot slide under the chrome at any viewport

    Examples:
      | case                                      | viewport | chrome | asks for | clamped to | viewport ceiling | too tall by |
      | the primary judgement width               | 1280×800 | 48     | 600      | 376        | 400              | 24          |
      | the same width, a notice standing         | 1280×800 | 81     | 600      | 359        | 400              | 41          |
      | narrow enough for the surface bar         | 768×800  | 88     | 600      | 356        | 400              | 44          |
      | THE DESKTOP APP'S OWN WINDOW              | 760×520  | 88     | 600      | 216        | 260              | 44          |
      | the desktop window, a notice standing     | 768×520  | 121    | 600      | 199        | 260              | 61          |
      | mobile                                    | 390×844  | 88     | 600      | 378        | 422              | 44          |
      | a drag below the minimum                  | 1280×800 | 48     | 12       | 48         | 400              | 24          |
      | a drag to exactly the ceiling             | 1280×800 | 48     | 376      | 376        | 400              | 24          |
      | a drag one pixel past it                  | 1280×800 | 48     | 377      | 376        | 400              | 24          |
      | NO SHELL AT ALL — the surface alone       | 1280×800 | 0      | 600      | 400        | 400              | 0           |
    # THE LAST ROW IS THE PROOF THE FIX IS NOT A REGRESSION FOR ANYONE. With no shell the
    # published property is unset and `var(--aof-shell-chrome-height, 0px)` resolves to
    # `0px` — the same fallback `Board.tsx:420` already relies on — so the content box IS
    # the viewport and the new clamp returns exactly what today's returns. The degraded
    # path is unchanged, measurably, which is why this can ship without touching
    # `test/support/board-app-harness.mjs`.
    # THE `too tall by` COLUMN IS THE FINDING, not decoration: at the operator's most common
    # window the shipped clamp lets the dock be dragged 44px past the bottom of the box the
    # shell owns — 44px of terminal drawn over the board's own footer, on the surface whose
    # whole point is that the buttons stay reachable.

  # THE DEFAULT IS CLAMPED BY THE SAME RULE, and DESIGN says so in terms — "one rule for
  # both is the fix". At 760×520 the shipped default of 280 EXCEEDS the maximum the
  # operator is allowed to drag to, so an unclamped default opens, on the most common
  # window, at a height the operator cannot return to.
  Scenario Outline: the default height obeys the same clamp as the drag, and the minimum yields to the ceiling rather than the other way round
    Given a <viewport> viewport whose chrome measures <chrome>
    When the dock opens with no height of its own yet
    Then the content box is <box>
    And the ceiling is <max> and the floor is <min>
    And the dock opens at <default>
    And the dock is never taller than its own content box in any of these rows

    Examples:
      | case                                    | viewport | chrome | box | max | min | default |
      | the primary judgement width             | 1280×800 | 48     | 752 | 376 | 48  | 280     |
      | mobile                                  | 390×844  | 88     | 756 | 378 | 48  | 280     |
      | THE DESKTOP WINDOW — the derivation     | 760×520  | 88     | 432 | 216 | 48  | 216     |
      | the desktop window with a notice up     | 768×520  | 121    | 399 | 199 | 48  | 199     |
      | a box too small to hold the minimum     | 760×120  | 88     | 32  | 16  | 16  | 16      |
      | a box of zero height                    | 760×88   | 88     | 0   | 0   | 0   | 0       |
      | the box has not been measured yet       | unknown  | unknown| —   | —   | —   | unchanged — the dock is not resized at all |
    # ROW 3 IS THE ROW THE HEIGHT RULE EXISTS FOR: `min(280, floor(box/2))` = 216, so
    # default and maximum coincide at the desktop window. A reviewer seeing a 216px dock
    # there is seeing the rule work, not a truncation.
    # ROW 5 IS THE CONTESTED BOUNDARY AND QA IS PINNING IT: when the box cannot hold
    # `DOCK_MIN_HEIGHT`, the MINIMUM yields to the ceiling — `floor = min(48, ceiling)` —
    # because a dock taller than its own box puts its own drag handle and header above the
    # content region and covers the very content the inset exists to protect. The two
    # clamps composed the other way round (`max(min(x, ceiling), floor)`) return 48 here
    # and do exactly that, silently; only one composition honours DG-46-1, so the rule is
    # stated rather than left to operator precedence. If DESIGN rules otherwise, this row
    # is the evidence to raise it against, not a quiet change in the expression.
    # ROW 7 IS THE UNMEASURED-BOX GUARD, and it is a designed state rather than an edge
    # case — the same discipline as the geometry helper's zero-box guard, which returns
    # scale 1 and re-fits on the next tick. A clamp against a box it does not know must
    # not resize the dock at all: snapping to 0 or to the minimum on the first frame would
    # be a visible jump on every mount, and the next measured tick would undo it.

  # THE TWO NUMBERS ARE INDEPENDENT, and the operator's proof of it is that nothing above
  # the content region moves when a terminal opens.
  Scenario: opening, dragging and closing the dock changes the published chrome height by nothing
    Given a dock is opened, dragged to its maximum, collapsed, expanded and closed again
    When the published chrome height is read after each step
    Then it is identical at every step — the dock is out of flow and the overlay row contributes zero
    And the budget verdict is identical at every step, so a dock can never move the shell into or out of a chrome breach
    And the dock inset is the only published number that changed
    And with the dock closed both numbers return to exactly the values they had before it was ever opened — no residue, no reserved band
