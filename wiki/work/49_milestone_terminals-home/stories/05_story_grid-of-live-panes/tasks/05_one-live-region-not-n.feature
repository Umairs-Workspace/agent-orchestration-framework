<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/05, THE SCREEN READER: one grid-level polite region instead of one per
# pane — and the two surfaces that already depend on the per-pane one must not lose it.
#
# THE SEAM, read at source, and it is one attribute in one file.
#  - The state chip's span carries `aria-live="polite"`
#    (ui/src/terminal/TerminalIdentity.tsx:117), rendered only while the pane is subscribed
#    (`:114-124`). It was built for ONE pane on ONE card and it is right for one pane. On a grid, a
#    5s poll plus a dozen sockets is a queue of polite announcements from panes the user is not
#    looking at, with no way to tell which tile spoke.
#  - THE FIX SHAPE ALREADY EXISTS IN THIS FILE. `TerminalIdentity` already receives `host`
#    (`:54`) and already ASKS the host table before rendering the provider picker (`:111`). So
#    "per-pane `aria-live` is off in the grid host" is the same shape as m46's design GAP G1 —
#    "the declaration was correct and the JSX simply never asked it" (TerminalControl.tsx:700-711)
#    — rather than a new prop or a new vocabulary.
#  - THIS EDITS THE SHARED CONTROL, WHICH IS WHY THE NON-REGRESSION LANES BELOW ARE NOT OPTIONAL.
#    The same fragment is rendered by the board dock, the fleet card AND the fullscreen occupant
#    (`TerminalControl.tsx:712-727` builds it per host; `:809` builds the fullscreen one against
#    `HOST_FULLSCREEN`). DESIGN DG-49-7 clause 4 keeps the expanded pane's own announcement
#    unchanged — it is one pane, in a dialog.
#  - Each pane's accessible name is already the SESSION's, not the widget class:
#    `aria-label={paneLabel}` on the control's own section (`TerminalControl.tsx:762`).
#
# THE AUTOMATED a11y LANE IS OFF, AND THAT IS THE DECISION RATHER THAN AN OVERSIGHT. This
# workspace's `.aof/aof.config.json` declares `work.tags.domains` WITHOUT an `a11y` entry and
# carries no `work.ui` block at all, so the opt-in axe-core lane is not enabled: THERE IS NO
# axe-core RUN IN THIS STORY AND NO a11y FINDING WILL COME FROM ONE. DESIGN's accessibility
# requirements 4 and 6 therefore bind as the assertions below plus DG-49-7's `@uat` screen-reader
# pass — and that pass has no task in this milestone's break-down, which is raised as a QA finding
# at refine.
#
# NOT ASSERTED HERE, each with an owner:
#  - what a screen reader actually says out loud, and whether the queue feels calm — DG-49-7's
#    `@uat` accessibility pass, judged by a person against renders R-A and R-D.
#  - the surface-slot summary line `<N> sessions · <M> live · <K> need input` — story 49/04 (S1's
#    G0 region). This file asserts only that the COUNT CHANGE is announced, from the same one fact.
#  - the `needs input` mark's form, position and fixture-driven evidence — task 02 of this story.
#  - which tile is focused, and how focus moves — task 04 of this story.
#  - motion and `prefers-reduced-motion` — story 49/06.
#
# THE HARNESS TRAP THAT THIS TASK CREATES, named here because it will look like a broken test:
# `test/support/terminal-control-harness.mjs`'s `chip()` accessor finds the state chip BY
# `aria-live="polite"` (`:333-336`). The moment the grid host stops carrying that attribute,
# `chip()` answers `null` for a grid pane, and every lane in tasks 01-03 that reads the chip must
# address it by its rendered word instead. Restoring the per-pane region to keep those lanes green
# silently undoes this entire task.
#
# ISOLATION: in-process through the harness and a pure announcement composer — no store, no
# server, no port. A lane standing a store up takes a fresh `AOF_GLOBAL_HOME=$(mktemp -d)`;
# `:4181`/`:4182` are held by live daemons and no scenario binds a fixed port. Focused runs only,
# never the full suite. Registered in `scripts/test.mjs` (import beside `:658`, spread beside
# `:2278`).

@executable @ui @work @design
Feature: one live region, not N — the grid announces with a single polite region naming the session it is talking about, per-pane announcements go quiet in this host only, and the board dock, the fleet card and the expanded pane keep theirs
  In order that a screen-reader user hears the one thing that changed on the tile they care about, instead of a dozen panes narrating the whole fleet every five seconds with no way to tell which one spoke
  the grid owns exactly one `aria-live="polite"` region announcing three named facts, the state chip keeps rendering its word everywhere, and the shared control's other three hosts are provably unchanged

  Background:
    Given the REAL control mounted through `withTerminalControl`, per host
    And the grid's announcements are composed by a pure `.mjs` taking the previous rows, the next rows and the focused pane key as ARGUMENTS and returning the sentence to announce, or nothing
    And "a live region" means a rendered node carrying an `aria-live` attribute

  # THE HEADLINE, counted. Twelve panes, one region.
  Scenario: a grid of twelve subscribed tiles carries exactly ONE live region
    Given a grid of twelve subscribed tiles, each streaming
    When the grid is rendered
    Then exactly one node in the whole rendered tree carries an `aria-live` attribute
    And that node is the GRID's own region, outside every tile
    And its value is `polite`
    And no node inside any tile carries `aria-live`, `aria-atomic` or `role="alert"`
    And no node anywhere on the surface carries `aria-live="assertive"`

  # SIGNAL 1 IS UNTOUCHED. Turning the announcement off may not turn the WORD off.
  Scenario: every tile still renders its state word; only the announcement moved
    Given the same grid of twelve streaming tiles
    Then every subscribed tile still renders its state chip: the dot and the word beside it
    And the words rendered are the same words the same panes rendered before this change
    And a held tile still renders no chip at all — that absence is the cap's rule and is unchanged here

  # THE NON-REGRESSION LANES. This edits the SHARED control, so each other host is driven for real.
  Scenario Outline: the control's other hosts keep their own per-pane announcement
    Given the control mounted at <host> with <the mount>, subscribed and streaming
    When it is rendered
    Then exactly one node in that tree carries `aria-live="polite"`
    And it is the state chip's own span, exactly where it has always been
    And its text is that pane's state word

    Examples:
      | case                     | host          | the mount                                            |
      | the board's own PTY      | board-dock    | `boardDockMount({ kind: "local-pty", … })`           |
      | the board mirroring a worker | board-dock | `boardDockMount({ kind: "mirror", … })`              |
      | the fleet card peek      | fleet-card    | `fleetTerminalMount(assignment, { itemRef })`        |
      | the expanded pane        | fullscreen    | the occupant a grid tile presents                     |
    # ROW 4 IS THE ONE MOST LIKELY TO BE LOST BY A HOST-BLIND EDIT: the fullscreen occupant is
    # built against `HOST_FULLSCREEN` (TerminalControl.tsx:809) even when a GRID tile opened it,
    # and DESIGN DG-49-7 clause 4 keeps its announcement — one pane, in a dialog, as it always was.

  # WHAT THE ONE REGION SAYS, AND WHAT IT MAY NOT. Three facts, and a fourth kind is a violation.
  Scenario Outline: the grid announces exactly three kinds of change, each naming its session
    Given a grid whose focus is on the tile for `49/05 → aof-wsl`
    When <what changed>
    Then the composer returns <the announcement>

    Examples:
      | case                             | what changed                                                              | the announcement                                                        |
      | the focused pane connected       | the focused tile's state moved to `streaming`                              | a sentence naming that tile's identity and its new state word            |
      | a session left the grid          | a tuple in the previous rows is absent from the next                       | a sentence saying that session ended or left, naming its identity        |
      | a session arrived                | a tuple in the next rows was absent from the previous                      | a sentence naming the session that appeared                              |
      | the blocked count changed        | one more tile now asserts `needs-input`                                    | a sentence carrying the NUMBER of panes needing input                    |
      | AN UNFOCUSED PANE CHANGED STATE  | a tile the operator is not focused on moved from `waiting` to `streaming`  | NOTHING — a dozen panes changing state may not queue a dozen sentences   |
      | a poll changed nothing           | the next rows are deep-equal to the previous ones                          | NOTHING — an unchanged poll is silent                                    |
      | only the byte stream moved       | bytes arrived on three unfocused panes                                     | NOTHING                                                                  |
    # ROWS 5-7 ARE THE POINT OF THE WHOLE TASK. Without them, "one region" just funnels twelve
    # panes' worth of narration through one node, which is the same failure with better markup.

  # POLITE, ALWAYS. Nothing on this page is an emergency.
  Scenario: nothing here ever interrupts
    Given every announcement the composer can produce
    Then each is delivered through the same single `polite` region
    And no announcement is ever routed to an `assertive` region or to `role="alert"`
    And the non-live bar inside a tile still RENDERS ITS WORDS — a stream ending is information — while
    the announcing is the surface's one region, so the bar carries no role of its own inside a tile
    # AMENDED at build, 2026-08-13 (PO), on the architect's F6 — the twin of task 01:163's amendment.
    # This clause contradicted its OWN feature's headline. `role="status"` is an implicit polite region,
    # so "the bar inside a tile stays `role="status"`" and "no node inside any tile announces" cannot
    # both hold; and the headline separately rules out muting it with `aria-live="off"`, so there was
    # no spelling that satisfied the feature as written. The developer implemented the ruling and named
    # the clash rather than picking a side silently — which is the right call and why this amendment
    # exists at all.
    # What is preserved is the thing the clause was protecting: the words are not lost. What changes is
    # WHO says them — one region for the surface, not one per tile. This is the same defect the feature
    # exists to remove, hiding one attribute along from where it was looked for.
    # Interrupting a user mid-sentence for a state change on a tile they are not reading is worse
    # than late news.

  # ONE FACT, TWO PLACES, ONE OF THEM A COUNT — and the two may not disagree.
  Scenario: the announced blocked count is the same fact the tiles render
    Given a grid in which three tiles carry the `needs input` mark
    When the count changes because a fourth assignment asserts it
    Then the announced number is four
    And it equals the number of tiles rendering the `needs input` mark at that moment
    And it is derived from the same rows the marks are, not counted from the DOM

  # TWELVE PANES MUST BE TELLABLE APART. `aria-label="Terminal"` on twelve tiles is a GAP.
  Scenario: each tile's accessible name names its session
    Given a grid of twelve tiles across two nodes, some interactive and some read-only
    When the grid is rendered
    Then every tile's accessible name names its posture and its identity — the session, never the widget class
    And no two tiles share an accessible name
    And no tile's accessible name is the bare word `Terminal`
    And the presented pane carries an accessible name naming the same session as the tile that opened it
