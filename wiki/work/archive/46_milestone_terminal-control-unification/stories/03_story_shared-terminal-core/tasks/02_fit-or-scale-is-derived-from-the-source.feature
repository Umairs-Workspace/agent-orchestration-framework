<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 46/03, the GEOMETRY: ADR-003's one rule — `fit ⇔ the source
# declares a resize control frame; scale otherwise` — plus the scale math itself and the
# unmeasured-box guard. A `fit` source fits its box and tells the far end exactly once per
# fit; a `scale` source renders at the descriptor's fixed geometry and is transformed to
# whatever box it is given, aspect preserved, never cropped.
#
# THIS TASK CLOSES A COVERAGE HOLE THAT WAS BELIEVED CLOSED. `ui/src/fleet/terminal-
# view/geometry.mjs:20-23` states in terms that "the tie is held by
# `test/fleet-terminal-view-geometry.test.mjs`, which reads BOTH files and fails if the
# numbers drift apart." THAT FILE HAS NEVER EXISTED — confirmed on the codebase graph (no
# test importer at all) and by grep (`WORKER_TERMINAL_COLS`, `terminalFitScale`,
# `geometry.mjs` return zero hits under `test/` and `scripts/`). So the mirror lane's
# entire scale math, and the cross-build constant whose drift produces an unreadable
# overlapping screen, are untested and were believed tested — which is worse than
# untested, because the comment stopped anyone looking (ARCHITECTURE §Codebase health
# finding 1). Every scenario below is `terminalFitScale`'s first coverage, and the false
# comment dies with the file it is written on.
#
# LITMUS: every Then is a returned VALUE from the shared framework-free `.mjs` set ADR-001
# homes at `ui/src/terminal/`, loaded by `node:test` under plain `node` — no bundler, no
# DOM, no xterm, no `ResizeObserver`. Geometry is tested as arithmetic and as a derived
# PLAN: the mode a descriptor yields, the frames a fit emits, the scalar a box yields. No
# source read, no `className` archaeology, no browser fact.
#
# WHAT A MODEL CANNOT SETTLE, AND WHERE IT GOES INSTEAD. That the scaled screen is
# anchored TOP-LEFT, that the letterbox band lands where the arithmetic says it will, that
# glyphs stay crisp scaled in both directions off the DOM renderer, and that the peek's
# deliberately-unreadable glyphs are the designed trade rather than a defect are all pixel
# facts — 46/04's design-conformance review and its `@uat` render verdict, judged against
# DESIGN §Fit vs scale (which says in terms that a reviewer must NOT log unreadable glyphs
# in S2 as a defect, and that a render caught mid-tick showing an unscaled screen is a
# capture artifact rather than a finding).
#
# NOT ASSERTED HERE — deliberately left to a fitness function. THE CROSS-FILE TIE IS NOT
# GHERKIN: that the descriptor's `mirror.fixedGeometry` EQUALS the worker's own `ptySpawn`
# geometry in `src/mesh-worker-execution.mjs:1486-1489` is
# `acd-terminal-mirror-geometry-pinned`'s, because it is a structural assertion across two
# builds that cannot import each other. What belongs here — and is below — is the
# observable CONSEQUENCE of the geometry being what it is: a mirror pane shows all 80
# columns and all 24 rows, unwrapped and uncropped, at every documented box. ALSO NOT
# ASSERTED: ADR-003's consequence that no canvas/webgl addon may ever be loaded on this
# surface (a "performance" addon would break the mirror silently) — that is an import
# claim with no gate on disk today, and QA flags it as a recommended row on
# `acd-terminal-server-only` rather than smuggling it in here as a behavioural Then.
#
# ISOLATION: `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED.

@executable @ui @work @design
Feature: fit or scale is derived from the source's own declared capability, and the scale math never crops, never stretches and never returns NaN
  In order that a local PTY reflows into whatever box the operator drags it to while a worker's absolutely-cursor-addressed TUI keeps the exact 80×24 screen it was painted for — in every host, with one rule spelled once instead of three times as a `remote` test
  the geometry mode must be a function of the descriptor's resize control frame alone, a fit must tell the far end its new size exactly once and a no-change fit must say nothing, and a scale must be the smaller of the two ratios with an unmeasured box degrading to the identity rather than to NaN

  Background:
    Given the shared terminal core loaded under plain `node` — no bundler, no DOM, no xterm, no clock
    And the geometry rule and the scale math read as a model, with no pane mounted

  # HEADLINE 1 — ADR-003's rule, and the two synthesized rows are the whole point: the mode
  # keys on the CAPABILITY field, not on the kind, not on the origin, not on `isRemote`.
  # Spike 44 measured a `resize(143, 41)` reaching a board PTY over a CROSS-ORIGIN socket,
  # so resizability is a property of the far end and not of which origin served the page.
  Scenario Outline: the geometry mode is derived from the descriptor's resize control frame, and from nothing else
    Given a source that <declares> and whose origin role is <origin role>
    When its geometry mode is derived
    Then the mode is <mode>
    And the mode is unchanged when the same descriptor is read against a different origin, host, port or socket URL — none of those is an input
    And the mode is unchanged when the descriptor's kind string is replaced by a word nothing recognises, every other field held constant

    Examples:
      | case                                                              | declares                       | origin role | mode  |
      | the board server's own PTY — the frozen table's `local-pty`       | declares a `resize` frame      | self        | fit   |
      | a worker's mirrored TUI — the frozen table's `mirror`             | declares no control frame      | fleet       | scale |
      | a resizable far end reached across an origin (synthesized)        | declares a `resize` frame      | fleet       | fit   |
      | a non-resizable far end on the surface's own origin (synthesized) | declares no control frame      | self        | scale |
    # Rows 3 and 4 cannot arise from the frozen two-entry table and are synthesized on
    # purpose: they are the only way to prove the rule is not the kind or the origin wearing
    # a new name. If either of them ever became a real table row, this scenario already
    # covers it — which is ADR-002's reversibility clause paid for in test coverage.

  # HEADLINE 2 — "exactly one resize per fit". `resize.mjs:23-30`'s single-emission
  # contract, preserved through the move with its no-change clause intact.
  Scenario Outline: a fit source tells the far end its new size exactly once, and a fit that changes nothing says nothing
    Given a fit source whose last emitted fit was <previous fit>
    When the pane is fitted to <cols> columns and <rows> rows
    Then <frames> resize frame is emitted
    And the frame carried is <frame>
    And every frame is the frozen m03/ADR-003 envelope `{ type: "resize", cols, rows }` — the cols and rows are integers, never strings, never NaN, never absent
    And nothing else is sent: a fit produces a resize or it produces silence

    Examples:
      | case                                                        | previous fit | cols | rows | frames  | frame                                    |
      | the first fit of a fresh session                            | (none)       | 80   | 24   | exactly 1 | { type: resize, cols: 80, rows: 24 }   |
      | the operator drags the dock taller                          | 80x24        | 120  | 30   | exactly 1 | { type: resize, cols: 120, rows: 30 }  |
      | the widest documented fit                                   | 120x30       | 200  | 50   | exactly 1 | { type: resize, cols: 200, rows: 50 }  |
      | a ResizeObserver tick on a box that did not change          | 120x30       | 120  | 30   | exactly 0 | (nothing — the last frame stands)      |
      | only the row count changed                                  | 120x30       | 120  | 31   | exactly 1 | { type: resize, cols: 120, rows: 31 }  |
      | only the column count changed                               | 120x30       | 121  | 30   | exactly 1 | { type: resize, cols: 121, rows: 30 }  |
      | dimensions arriving as numeric strings from a measurement   | (none)       | "120" | "30" | exactly 1 | { type: resize, cols: 120, rows: 30 } |
      | a pane measured before it has a size                        | (none)       | NaN  | 24   | exactly 0 | (nothing — an unmeasured box is not a fit) |
      | a negative dimension                                        | (none)       | -80  | 24   | exactly 0 | (nothing — an unmeasured box is not a fit) |
    # Rows 1-3 preserve `test/terminal-dock.test.mjs`'s fit lane (80×24, 120×30, 200×50)
    # verbatim, and row 4 preserves its "an identical re-fit does not emit a second resize"
    # assertion — the contract `resize.mjs:18-30` was written for. Rows 5 and 6 are QA's
    # edges: a no-change guard that compared only one axis would pass rows 1-4 and lose a
    # real resize here.
    # ROW 7 PRESERVES `resize.mjs:32-35`'s `toDim` normalisation exactly as it stands: a
    # numeric string becomes the integer, so the frame is always well-formed JSON the server
    # can parse rather than `NaN` (which does not survive `JSON.stringify`) or a string.
    # ROWS 8-9 CARRY THE PO RULING (STORY.md §PO rulings, 2026-08-08): a fit whose dimensions
    # normalise to zero IS NOT EMITTED. `toDim`'s normalisation is unchanged — a non-positive
    # dimension still becomes 0 — but 0 is the signal that the box was never measured, and an
    # unmeasured box is not a fit. It is the same species as the zero-box guard in the scale
    # lane below (`geometry.mjs:37-41` returns the identity rather than NaN) and is ruled the
    # same way, and the same way again for the drag clamp in 46/05.
    # WHY THIS STOPPED BEING ACADEMIC: before ADR-008 an on-open fit was discarded by the
    # server anyway, so a 0-column frame was harmless. ADR-008 makes that first fit genuinely
    # land — so a 0×0 "fit" would now reach a real PTY, which is exactly the wrong geometry
    # this milestone exists to stop shipping. The suppression is a consequence of 46/00, not
    # a preference.

  # HEADLINE 3 — the scale math. `Math.min`, not `max`, and the reason is arithmetic:
  # the min is the only ratio at which the WHOLE screen still fits.
  Scenario Outline: a scale source is transformed by the smaller of the two ratios, so the whole screen fits and nothing is ever cropped
    Given a fixed-geometry screen measuring <intrinsic> pixels
    And a box measuring <box> pixels
    When the scale is derived
    Then the scale is exactly <the scale> — the smaller of box÷intrinsic on each axis
    And it is not <the rejected max>, which is the larger ratio and would push the other axis outside the box
    And one scale applies to both axes, so the screen's proportions are preserved exactly
    And the scaled screen fits: its width is no greater than the box's width and its height no greater than the box's height, so no column and no row is cut off
    And any leftover space is empty terminal background at the right and/or the bottom — the letterbox band, which is expected arithmetic and not a gap
    And the scale is a finite number greater than zero

    Examples:
      | case                                                        | intrinsic | box      | the scale | the rejected max            |
      | the fleet card peek — a short box, so height binds          | 640x408   | 320x163  | 163÷408   | 0.5 — the bottom rows would fall off |
      | the board dock at its default height — the crop m46 fixes   | 640x408   | 1264x280 | 280÷408   | 1.975 — today's dock paints at natural size and cuts the screen off |
      | the fullscreen overlay at an exactly proportional box       | 640x408   | 1280x816 | 2         | 2 — the two ratios agree, so there is no band at all |
      | a wide host — the band lands on the RIGHT                   | 640x408   | 1280x408 | 1         | 2 — half the rows would be lost |
      | a tall host — the band lands at the BOTTOM                  | 640x408   | 640x816  | 1         | 2 — half the columns would be lost |
      | a box that is exactly the screen                            | 640x408   | 640x408  | 1         | 1 |
    # 640×408 is 80×24 at `fontSize: 13`, and it is the CALLER's measurement handed in as an
    # argument — the module invents no intrinsic size of its own, which is what keeps it
    # testable without a DOM. Row 2 is DESIGN's change 5 as arithmetic: a `mirror` opened in
    # the board dock is scaled instead of being painted at natural 80×24 and cropped by the
    # dock's 280px default (`TerminalDock.tsx:165-168`, `:414`).

  # THE GUARD IS A DESIGNED STATE, NOT AN EDGE CASE — `geometry.mjs:33-36`: "the pane may be
  # measured a frame before it is laid out, and a divide-by-zero must degrade to 'don't
  # scale yet', never NaN. The next ResizeObserver tick re-fits once the real box is known."
  Scenario Outline: a zero, absent, negative or unmeasurable dimension degrades to the identity scale rather than to NaN
    Given intrinsic dimensions of <intrinsic width> by <intrinsic height>
    And a box of <box width> by <box height>
    When the scale is derived
    Then the scale is exactly <scale>
    And it is a finite number — never NaN, never Infinity, never a string, never undefined
    And nothing is thrown: a pane measured before layout is an ordinary frame, not an error

    Examples:
      | case                                                    | intrinsic width | intrinsic height | box width | box height | scale |
      | a real measurement, so the guard is not swallowing all  | 640             | 408              | 320       | 204        | 0.5   |
      | the pane is measured a frame before it is laid out      | 640             | 408              | 0         | 0          | 1     |
      | the box has width but no height yet                     | 640             | 408              | 320       | 0          | 1     |
      | the box has height but no width yet                     | 640             | 408              | 0         | 163        | 1     |
      | a collapsed flex child reports a negative width         | 640             | 408              | -320      | 163        | 1     |
      | a collapsed flex child reports a negative height        | 640             | 408              | 320       | -163       | 1     |
      | the xterm has not painted, so it has no intrinsic size  | 0               | 0                | 320       | 163        | 1     |
      | a negative intrinsic width                              | -640            | 408              | 320       | 163        | 1     |
      | the box dimensions are absent                           | 640             | 408              | (absent)  | (absent)   | 1     |
      | the intrinsic dimensions are absent                     | (absent)        | (absent)         | 320       | 163        | 1     |
      | no argument is supplied at all                          | (absent)        | (absent)         | (absent)  | (absent)   | 1     |
      | a dimension that is not a number at all                 | 640             | 408              | auto      | 163        | 1     |
      | a dimension that is NaN                                 | 640             | 408              | NaN       | 163        | 1     |
      | a dimension that is explicitly null                     | 640             | 408              | 320       | null       | 1     |

  Scenario: the identity guard is not sticky — the very next measured tick returns the real ratio
    Given a pane whose box measured zero by zero before layout, so its scale was the identity
    When the same pane is measured again at a real box
    Then the scale is the real ratio for that box, not the identity it returned a frame earlier
    And nothing about the earlier unmeasured call is remembered — the derivation is pure over the arguments it is handed
    # This is the non-vacuity half of the guard: a guard that latched would leave every
    # mirror pane at natural size forever, which reads exactly like the crop it exists to
    # prevent.

  # THE OBSERVABLE CONSEQUENCE of the pinned geometry — the cross-file tie itself belongs to
  # `acd-terminal-mirror-geometry-pinned`, per ARCHITECTURE §Fitness functions. What an
  # operator sees is this: the same 80 columns and 24 rows, whole, in every host.
  Scenario Outline: a mirror pane shows all 80 columns and all 24 rows, unwrapped and uncropped, at every documented box
    Given a `mirror` source at its declared fixed geometry
    And a byte area measuring <box> pixels
    When the pane's geometry plan is derived
    Then the terminal is sized to 80 columns and 24 rows before any transform is applied
    And the geometry does not change with the box — a smaller box scales the PICTURE and never reflows the SCREEN
    And the whole screen is inside the box after scaling: no column and no row is cropped
    And the plan is <direction>
    And no resize frame is emitted for this box, or for any other

    Examples:
      | case                                              | box      | direction   |
      | the fleet card peek at the primary width          | 320x163  | scaled down |
      | the fleet card peek at 390                        | 300x163  | scaled down |
      | the board dock at its default height              | 1264x280 | scaled down |
      | the board dock in the 760×520 desktop window      | 744x216  | scaled down |
      | the fullscreen overlay at the primary width       | 1280x816 | scaled up   |
    # WHY THE SCREEN MUST NOT REFLOW, kept from `geometry.mjs:7-17` and paid for in a live
    # two-machine soak: the worker spawns its interactive `claude` at a fixed 80×24 and the
    # TUI paints every line for THAT screen size with absolute cursor addressing. Fitting the
    # pane to the card's ~46×10 made every absolutely-positioned line land at the wrong
    # column and the screen overlapped itself into an unreadable scatter. That lesson has
    # never had a test; these rows are it.

  # ADR-003: "A `scale` source never sends a resize frame — not because of an early return
  # in the send path (`TerminalDock.tsx:203`), but because `scale` sources declare no resize
  # control frame and the emitter is only wired for sources that do. The guard becomes
  # structural instead of defensive."
  Scenario Outline: the resize emitter exists only for a source that declares a resize control frame
    Given a source that <declares>
    When its geometry plan is derived
    Then the plan names <frame>
    And it offers <emitter>
    And a `scale` plan cannot emit a resize even when a caller asks it to — there is nothing wired to emit through, rather than a defensive early return that a later refactor could delete

    Examples:
      | case                                        | declares                  | frame                | emitter          |
      | the board server's own PTY                  | declares a `resize` frame | the frozen `resize` envelope | one resize emitter |
      | a worker's mirrored TUI                     | declares no control frame | no control frame     | no emitter at all |
