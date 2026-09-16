<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — THE HUMAN GATE for DG-46-1. A person judges, over real browser renders,
# whether an open dock covers anything the operator can still act on — and whether the
# dock and the fullscreen overlay read as the surfaces DESIGN describes.
#
# DG-46-1'S CLOSE CONDITION IS THIS TASK, WORD FOR WORD: *"DG-46-1 closes when the dock is
# in the `overlay` region, the inset primitive is named and published, and a render at
# 1280 and at 760×520 shows an open dock with the detail panel's action strip fully
# visible above it."* Tasks 00 and 01 deliver the first two clauses as model values. The
# third is a pixel fact and belongs to a person.
#
# LITMUS: every Then is confirmable from a RENDERED SCREENSHOT — and, for the measured
# clauses, from a number QA reads off that same render and hands over — judged against a
# named conformance source. Never from component source. Every Then names the region, the
# state, the viewport and the artifact it is judged against, so the answer is yes or no
# by looking. Where no render exists the honest verdict is INCONCLUSIVE naming the
# missing render.
#
# BROWSER LANE (QA-OWNED). QA runs the browser and drives the harness; the designer judges
# the renders it is handed and has no `Bash`. Per the house design-render discipline
# `npx playwright` is POLICY-BLOCKED — the render drives the cached ms-playwright Chromium
# directly (`--headless=new --screenshot=<ABSOLUTE forward-slash path>`). The BOARD is a
# per-workspace server on an EPHEMERAL port that changes on every daemon restart
# (`Board.tsx:47-51`), so its base URL is supplied to the render AT CAPTURE TIME and NEVER
# hard-coded; the fleet is the fixed-port origin at `http://127.0.0.1:4181/`.
#
# THE CONFORMANCE SOURCE. `mocks/s1-board-dock.png` and `mocks/s3-fullscreen-overlay.png`
# are named as the source of truth and the operator is supplying them; `mocks/` holds
# `PROMPT.md` and nothing else today. Until they land, DESIGN.md's §S1 and §S3 binding
# checklists ARE the baseline — mandatory, not a supplementary rubric — so a review that
# runs before the mocks arrive has something to judge and must NOT return INCONCLUSIVE on
# the grounds that no mock exists (07/ADR-003; the m03 lesson). When a mock lands it
# supersedes the checklist for ITS surface wherever the two differ, and DESIGN.md is
# amended in the same change. A remote design-tool link is never a substitute — the
# reviewer is read-only and cannot open one; a baseline it cannot `Read` is not a baseline.
#
# THE a11y LANE IS OFF, AND THAT IS THE DECISION, NOT AN OVERSIGHT. `.aof/aof.config.json`'s
# `work.tags.domains` carries no `a11y` entry and there is no `work.ui.a11y` block, so the
# opt-in automated lane is off: THERE IS NO axe-core RUN IN THIS STORY AND NO a11y FINDING
# WILL COME FROM ONE. DESIGN §Accessibility says the same at source. Its requirements
# therefore bind this `@uat` review as HUMAN judgement, which is why the keyboard,
# hit-target and non-colour clauses appear below rather than in an automated lane.
#
# NOT JUDGED HERE. The whole-control conformance review — S1's nine states, S2 the fleet
# card peek, the merged state ramp, DG-46-2's palette home and DG-46-3's fixture-rendered
# `unavailable` pane — belongs to the story that BUILDS the control (46/04) and is not
# re-judged here; this task judges the dock's HOST: what it covers, what it costs, and how
# it and the fullscreen overlay sit in the shell. Nothing here re-asserts task 00's region
# model or task 01's arithmetic; it judges whether the rendered result of those models is
# the layout DESIGN describes.
#
# ISOLATION (for the executable siblings this review sits beside):
# `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED, never the full suite.

@uat @ui @work @design
Feature: an open dock covers nothing the operator can still act on — a design-conformance judgement of the docked and fullscreen terminal inside the shell, at 1280 and at the desktop app's 760×520 window
  In order to confirm that moving the dock out of flow cost the operator nothing — that the detail panel's action strip is still there, still whole, still clickable, with a terminal open at any height it can be dragged to
  the board is rendered with the dock closed, open at its default, dragged to its maximum, collapsed, and presented fullscreen, at each documented viewport, and judged region by region against `mocks/s1-board-dock.png` and `mocks/s3-fullscreen-overlay.png` where committed and DESIGN.md's §S1 and §S3 binding checklists everywhere else (CONFORMS / GAPS)

  Background:
    Given the board origin is rendered at its EPHEMERAL per-workspace base URL, supplied to the render at capture time
    And each render is produced through the cached ms-playwright Chromium to an absolute screenshot path — never `npx playwright`
    And a work item is selected so the detail panel and its action strip are on screen in every render
    And the renders are handed to the designer, who judges them against whichever conformance source is current

  # RENDER GATE — the review never guesses from code, and never returns INCONCLUSIVE for
  # the wrong reason. The m35/m43/m45 precedent, and it is what keeps the verdict honest
  # when the harness fails.
  Scenario: absent a render the review degrades to INCONCLUSIVE naming the missing render — but a missing MOCK is never grounds for it
    Given the render did not produce a screenshot of a required state at a required viewport
    When the design-conformance review runs
    Then the verdict is INCONCLUSIVE
    And it names the missing render — the origin, the viewport, the dock state and the height it was supposed to show
    And it does not infer a verdict from component source
    And it does NOT return INCONCLUSIVE on the grounds that `mocks/s1-board-dock.png` or `mocks/s3-fullscreen-overlay.png` has not landed: DESIGN.md's §S1 and §S3 binding checklists are the mandatory baseline until they do

  # WHICH BASELINE WAS JUDGED — recorded in the verdict, every time, because the answer
  # changes the moment the operator commits a file.
  Scenario Outline: the review names the conformance source it judged against, and a committed mock supersedes the checklist for its own surface
    Given `mocks/<mock>` is <mock status> at review time
    When the design-conformance review runs
    Then the verdict names <source> as the conformance source it judged against, for that surface
    And <what happens to the checklist>

    Examples:
      | case                                | mock                       | mock status                           | source                              | what happens to the checklist                                                                                  |
      | today — neither mock has landed     | s1-board-dock.png          | absent (`mocks/` holds `PROMPT.md`)   | DESIGN §S1's binding checklist      | it binds in full, and the review proceeds to a CONFORMS/GAPS verdict                                            |
      | the S1 mock lands and agrees        | s1-board-dock.png          | committed and consistent              | the committed mock                  | it still binds wherever the mock is silent                                                                      |
      | the S1 mock lands and differs       | s1-board-dock.png          | committed and differing from a clause | the committed mock                  | the differing clause is a GAP AGAINST DESIGN.md, raised so the document is amended in the same change            |
      | the S3 mock lands, S1 has not       | s3-fullscreen-overlay.png  | committed                             | the mock for S3, the checklist for S1 | per surface, never in bulk — a mock supersedes only its own surface's checklist                                |
      | a link instead of a file            | either                     | offered as a remote design-tool link  | DESIGN's binding checklists         | the link is refused as a baseline — the reviewer is read-only and cannot open one                                |
      | a placeholder PNG                   | either                     | a stand-in or empty image             | DESIGN's binding checklists         | it is refused and reported: a reviewer cannot tell a placeholder from a real baseline, which is worse than absence |

  # THE HEADLINE. DG-46-1's close condition, judged at the two viewports it names, at the
  # two heights the operator can actually produce. **A render in which an open dock
  # overlaps the detail panel's actions is a GAP, not a designed change.**
  Scenario Outline: the detail panel's action strip is FULLY visible above an open dock, at every viewport and every height the dock can be dragged to
    Given the board is rendered at <viewport> with a work item selected and the dock <dock state> at <dock height>
    When the designer judges the render against DG-46-1
    Then the detail panel's action strip is fully visible above the dock — every button whole, none clipped, none behind it, none half-covered
    And QA hands over the measured gap between the bottom of the action strip and the top of the dock, and it is zero or positive — never negative
    And the lanes column ends above the dock too: no card is cut off by it and nothing scrolls under it
    And the dock's top edge is inside the content region — it never slides under the shell's chrome
    And <what to check hardest>
    And the verdict for this row is CONFORMS or names a specific GAP

    Examples:
      | case                                          | viewport | dock state | dock height          | what to check hardest                                                                                                    |
      | the primary judgement width, closed           | 1280×800 | closed     | none                 | the board is EXACTLY the board: no reserved band, no empty border, no 48px of nothing where a dock might one day be        |
      | the primary judgement width, default          | 1280×800 | open       | 280 (its default)    | the strip sits directly above the dock's top edge with the board's own spacing — not floated, not pushed off, not overlaid |
      | THE HEIGHT THAT USED TO COVER THE BUTTONS     | 1280×800 | open       | 376 (its maximum)    | the maximum is where an overlaying dock would eat half the panel; the strip must still be whole                            |
      | THE DESKTOP APP'S OWN WINDOW, default         | 760×520  | open       | 216 (default = max)  | 432px of content minus a 216px dock leaves 216px of board — the strip must be in it, not below the fold                    |
      | the desktop window, dragged as far as it goes | 760×520  | open       | 216                  | default and maximum COINCIDE here by DESIGN's height rule; a dock that opened at 280 on this window is a GAP               |
      | collapsed — the case most easily missed       | 1280×800 | collapsed  | its header only      | a collapsed dock still paints its header over the board; the strip must clear THAT too, not just the open dock             |
      | mobile                                        | 390×844  | open       | 280 (its default)    | the narrowest board with a dock open — the strip must not be reached only by scrolling the page, which is not this surface's scroll model |
    # ROW 1 IS THE CONTROL CASE and it is not padding: the closed state is where a
    # "reserved band" regression would hide, and a band nobody asked for costs every board
    # its height forever, for a condition that is almost never true.
    # ROWS 4 AND 5 ARE THE SAME NUMBER ON PURPOSE. At 760×520 the content box is 432px, so
    # `min(280, floor(432/2))` = 216 and the default IS the maximum. A reviewer seeing a
    # 216px dock on the desktop window is seeing the height rule work, not a truncation.

  # THE CONSEQUENCE DESIGN RECORDS IN ADVANCE: *"nothing visible changes on the board when
  # the dock opens. That is the point."* So the honest test of this story is a comparison
  # in which nothing differs.
  Scenario: moving the dock out of flow is invisible — the board with a dock open looks the same as it did when the dock was in flow
    Given a BEFORE render captured with the dock still an in-flow child of the board's column, and an AFTER render with the dock in the overlay region and the inset published
    And both are captured at the same viewport, the same selected item, the same dock height and the same session state
    When the designer compares them
    Then the lanes column, the detail panel, its tabs, its body and its action strip land on the same pixels in both
    And the dock itself is at the same height, in the same position, with the same chrome
    And the board's own scroll model is unchanged: its descendants scroll and the page does not
    And any difference at all is either named in DESIGN §What visibly changes or it is a GAP
    And the verdict for this comparison is CONFORMS or names a specific GAP
    # THIS IS THE STORY'S SUCCESS CONDITION SEEN. An extraction the operator can notice is
    # an extraction that cost them something. The BEFORE render is captured from the build
    # that story 46/04 delivers — the control already unified, the dock still in flow — so
    # the comparison isolates THIS story's change and nothing else.

  # S1'S BINDING CHECKLIST, region by region, at each documented width. The regions are
  # DESIGN's C0a/C0b/C1/C2/C3 and this review does not invent any.
  Scenario Outline: the dock's own regions read as DESIGN §S1 describes them, at every documented width
    Given the board is rendered at <viewport> with the dock open and <state>
    When the designer judges it region by region against `mocks/s1-board-dock.png` where committed and DESIGN §S1's binding checklist otherwise
    Then C0a is one drag-handle strip at the dock's top edge, and it is absent while collapsed
    And C1 is ONE row that never wraps to two and never scrolls, holding its components in DESIGN's declared order
    And C2 is the byte area, and it is the only thing that scrolls — xterm's own scrollback and nothing else
    And C3 is zero or one non-live bar, opaque and in flow, paid for OUT of C2 so no glyph is covered and the dock's total height does not change
    And <what to check hardest>
    And the verdict for this row is CONFORMS or names a specific GAP

    Examples:
      | case                            | viewport | state                      | what to check hardest                                                                                     |
      | the primary judgement width     | 1280×800 | a live session streaming    | the reading order — identity outweighs the controls beside it, and nothing in C1 shouts over the session's name |
      | THE DESKTOP APP'S OWN WINDOW    | 760×520  | a live session streaming    | the whole dock at its 216px clamp: header, byte area and handle all present and none of them squeezed out   |
      | the narrowest width             | 390×844  | a live session streaming    | C1 MUST NOT WRAP INTO TWO ROWS — DESIGN permits wrapping on the fleet card and forbids it here              |
      | the non-live bar standing       | 1280×800 | the session has ended       | the bar is paid for out of the byte area: the dock's total height is IDENTICAL to the streaming render      |
      | collapsed                       | 1280×800 | collapsed, session alive     | C1 only, C2 gone from view but the session still live — the chevron is flipped and no ✕ was pressed         |

  # S3 — the same control, a bigger box. "Fullscreen is a bigger box, not a different look."
  Scenario: the fullscreen overlay covers the chrome rather than sitting under it, and its way out is always visible
    Given a live session is presented fullscreen at 1280×800 and again at 760×520
    When the designer judges the renders against `mocks/s3-fullscreen-overlay.png` where committed and DESIGN §S3's binding checklist otherwise
    Then the shell's chrome is GONE — not dimmed, not blurred, not showing through, and no light-theme bar is visible behind or around the dark terminal
    And the occupant fills the window with no residual band where the chrome was
    And its header is the SAME identity fragment as the inline header — the same lockup, the same identity line, the same state chip — so it reads as the same pane in a bigger box
    And the exit control is visible in the render, at the header's `ml-auto` anchor, at every viewport — never hover-revealed, never auto-hiding, never faded by inactivity
    And the dock underneath is completely covered while the occupant is presented, and is exactly where it was in the render taken after dismissal
    And the verdict for this region is CONFORMS or names a specific GAP
    # THE LETTERBOX BAND IS EXPECTED AND MUST NOT BE LOGGED AS A GAP. A mirrored 80×24
    # screen scaled by `min(...)` into a 1280-wide overlay leaves roughly 250–300px of
    # terminal background at the right. That band is the price of never cropping and never
    # stretching, and DESIGN says so in terms.
    # A RENDER CAUGHT MID-TICK SHOWING AN UNSCALED SCREEN IS A CAPTURE ARTIFACT, not a
    # finding — ask QA for a re-capture rather than logging a gap.

  # ACCESSIBILITY, JUDGED BY A PERSON — because the automated lane is OFF (see the header).
  # These are DESIGN's own requirements, scoped to what THIS story builds: the host, the
  # handle and the two exits.
  Scenario: the dock's host obligations survive a keyboard pass, and the drag handle is operable without a pointer
    Given QA drives a keyboard pass over the rendered board with the dock open, and hands the observations and a focus-ring render to the designer
    Then the drag handle is reachable by keyboard, shows a visible focus indicator, and ↑/↓ resize the dock
    And the keyboard resize obeys exactly the same clamp the pointer drag obeys — the two must not disagree about the maximum
    And focus order follows visual order: the drag handle, then C1's controls in their declared order, then the terminal
    And every control in C1 measures at least 24×24 CSS pixels, achieved by padding rather than by weight or fill
    And entering fullscreen and leaving it returns focus to the control that opened it, visibly
    And the verdict for this region is CONFORMS or names a specific GAP
    # THE KEYBOARD RESIZE HAS NO PRECEDENT IN THE PRODUCT AND MUST BE BUILT (DESIGN
    # §Accessibility 8): the handle is already `role="separator"` with an
    # `aria-orientation` and a label, and a separator only a pointer can move is a control
    # a keyboard user cannot reach. It is judged HERE because the clamp it must obey is
    # this story's.

  # THE BASELINE HAND-OFF. Stated once, so the follow-on has somewhere to attach.
  Scenario: an approved render becomes the visual-regression baseline
    Given the designer has judged the renders CONFORMS at every documented viewport in every dock state
    When the approved renders are recorded
    Then each becomes the baseline QA's `toHaveScreenshot` visual-regression compares future renders against
    And a later render that drifts from an approved baseline is a QA finding, routed like any other
    And building those baselines out into a hard gate is a QA-owned follow-on, explicitly out of scope for this story
    And the dock's only motion is the state ramp's two pulsing states, so a render captured in a still state is a complete lock on the layout this task judges
