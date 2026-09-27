@manual @ui @work @distribution
Feature: app.js renders one loop row per view-model declaration in a second control bar, absent when empty, with one stop control and no start

  ADR-004 §1-§2; DESIGN §Surface 2's binding checklist. `normalizeIpcView` passes `loops` through
  unchanged; `renderControlBar` renders a SECOND `<div class="controlbar">` immediately after
  `#controlbar` — the same class, fill, hairline and padding, verbatim — holding one `.proc` per
  row in view-model order, separated by `.vsep`: `.proc-label` (the producer's `label`, `loop
  <scope>`), the daemons' own `.pill` (`.pill-dot <signal>` + `.pill-text`), and ONE
  `.toggle.subtle` with `.stop-glyph`, `data-action="loop-stop"`, `data-id="<loopRunId>"`, `title`
  and `aria-label` `Stop loop <scope>` (`… now — skip the grace` at rung 2). No `.play-glyph`, no
  `.toggle.primary`: a declaration starts through the reconcile. The control is present in
  `running`, `restarting` and `stopping`, ABSENT in `stopped`; `stopping` rides the `running` dot
  (the one new ramp word). The bar is not rendered at all when `loops` is empty or absent. The one
  control-bar click delegate routes `loop-stop` to `invoke('stop_loop', { id })`. The desktop UI
  has no JS test harness (`app.js` is hand-written browser code read only by the Tauri WebView), so
  this task is verified in the running window after `install-local --desktop` and the operator's
  restart; the developer records the observations in `VERIFICATION.md`.

  RULINGS (QA, 2026-09-13): the release build has no WebView console, so a scenario that SETS
  `loops` runs in a devtools build of the same source (`cargo run --manifest-path
  app/desktop/crates/app/Cargo.toml`, the release app quit first) by wrapping the host's invoke in
  the console — `const real = window.__TAURI_INTERNALS__.invoke, CALLS = [];
  window.__TAURI_INTERNALS__.invoke = async (c, a) => c === 'get_view_model' ? { ...(await real(c,
  a)), loops: LOOPS } : (CALLS.push([c, a]), real(c, a));` — the next 3 s render tick applies
  `LOOPS`, and `CALLS` is the record a click scenario reads. A real state (a running loop, its
  stop) is read in the release window as task 01 stages it. The loop control carries no client-side
  debounce and is never `disabled`: the supervisor counts presses (ADR-004 §2-§3), so every click
  reaches `invoke`. The a11y lane is off for this repo (no `a11y` domain in `work.tags`); the
  `aria-label` assertions below are the DESIGN's own, not an axe run.

  Background:
    Given the desktop app rebuilt and restarted by the operator, its window visible at 760×520 and at 1280 wide, light and dark

  Scenario Outline: no declarations — no bar
    Given `get_view_model().loops` is <loops>
    When the window renders
    Then exactly one `.controlbar` exists (`#controlbar`) and no `.proc-label` reads `loop `
    And the first bar, the body and the footer are what they were before this story

    Examples:
      | loops                                                          |
      | `[]`                                                           |
      | absent (no `loops` key — an older core)                        |
      | `null`                                                         |
      | `[]` because the declarations answer is unknown (`ok: false`)  |

  Scenario: one declaration — one row in the daemons' vocabulary
    Given `get_view_model().loops` is `[{ id: "L1", label: "loop 129", signal: "running" }]`
    When the window renders
    Then a second `.controlbar` follows `#controlbar` holding one `.proc` whose `.proc-label` reads `loop 129`, whose `.pill` holds `.pill-dot.running` and `.pill-text` `running`, and whose control is `button.toggle.subtle[data-action="loop-stop"][data-id="L1"]` with `title` and `aria-label` `Stop loop 129` and a `.stop-glyph` child
    And no `.play-glyph`, no `.toggle.primary`, no `.open-web-ui`, no kicker and no count exists in that bar
    And the first bar is byte-identical to a render with no loops
    And in dark theme the second bar's fill, hairline, pill and toggle read from the first bar's tokens — the two bars match pixel for pixel in colour
    And with `label` `loop 129/04` and `id` `lr-2026-09-13T10-00-00-000Z-1` the label, `title`, `aria-label` and `data-id` carry them verbatim

  Scenario: many declarations — rows in view-model order, separated
    Given `loops` is `[{ id: "La", label: "loop 129", signal: "running" }, { id: "Lb", label: "loop 131", signal: "restarting" }]`
    When the window renders
    Then the second bar holds `.proc`(loop 129) · `.vsep` · `.proc`(loop 131), in that order, each with its own stop control carrying its own `data-id`
    And the `loop 131` pill shows `.pill-dot.restarting` with the amber pulse the daemons use
    And reversing the array reverses the rows — the order is the view model's, never sorted here

  Scenario Outline: the signal word and the control follow the ramp
    Given the row's `signal` is <signal>
    When the window renders
    Then the pill reads <word> on `.pill-dot.<dot>` and the stop control is <control>

    Examples:
      | signal       | word         | dot         | control                                                          |
      | `running`    | `running`    | `running`   | present, `title` and `aria-label` `Stop loop 129`                 |
      | `restarting` | `restarting` | `restarting`| present, `title` and `aria-label` `Stop loop 129`                 |
      | `stopping`   | `stopping`   | `running`   | present, `title` and `aria-label` `Stop loop 129 now — skip the grace` |
      | `stopped`    | `stopped`    | `stopped`   | absent — omitted, not disabled                                   |

  Scenario: the click reaches the one command
    When the `loop-stop` control for `L1` is clicked
    Then `CALLS` holds exactly one entry, `['stop_loop', { id: "L1" }]`
    And a click on the Mesh server's toggle still invokes `stop_mesh_server` / `start_mesh_server` as before, and `Open web UI` still invokes `open_web_ui`

  Scenario: a second press at stopping reaches the command again
    Given the row at `stopping` (its control titled `Stop loop 129 now — skip the grace`)
    When its control is clicked twice in quick succession
    Then `CALLS` gains two more `['stop_loop', { id: "L1" }]` entries — the control is never `disabled` and nothing debounces here
    And in the release window the second press is task 01's cancel: the request reads level 2, the pill word stays `stopping`

  Scenario: the row keeps its geometry until stopped
    Given a row at `restarting`, then `stopping`, then `running`
    When the pill word changes
    Then the row's width does not change at any of the three (the control has one class, one glyph, one size at both rungs), and from `restarting` to `stopping` the dot goes from the amber pulse to the accent
    When the row reaches `stopped`
    Then the control is omitted — the row's one geometry change — and the row persists until the view model drops it, after which the bar is gone when no row remains

  Scenario: the footer carries a failed stop, never the bar
    Given the standing notice is `loop 129: stop refused: loop-stop-no-declaration`
    When the window renders
    Then `#footer-text` reads it and the loop bar shows no error text, no tint and no extra element
    And when `notice` is `null` again the footer returns to the freshness line (`refreshed Ns ago`)
    And a daemon's notice (`aof mesh ui: …`) takes the same slot — one notice stands at a time
