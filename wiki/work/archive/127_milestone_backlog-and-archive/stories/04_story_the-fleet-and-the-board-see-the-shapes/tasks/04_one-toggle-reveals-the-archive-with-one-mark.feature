@executable @ui @work @board
Feature: archived items are hidden by default and revealed by ONE toggle that flips the list request — when shown, one pill marks the milestone wherever its identity row is painted, and the legend documents it

  With the toggle OFF the board requests the list WITHOUT the include-archived parameter (task
  02) and so cannot hold an `archived: true` row at all — hidden is a property of the fetch,
  not a filter the board applies (ADR-006 §2, §3). This task is the toggle, the refetch it
  drives, the mark the revealed rows carry, and the chip and legend that account for them —
  DESIGN.md §Surface 2's BINDING CHECKLIST read off the real `<Board/>` against the real face,
  toggle OFF and ON, on the overview and then on an archived milestone's lane board.

  THE TOGGLE. One `<button type="button">` in the board's `SurfaceSlot`, LEFT of `◷ status
  legend` (legend and `⟳ sync` untouched, in that order after it), constant label
  `Show archived`, `aria-label="Show archived items"`, `aria-pressed` reflecting the COMMITTED
  state, `min-h-6`, class `inline-flex items-center rounded-md border px-2 py-0.5 text-xs
  font-medium transition` plus OFF `border-border bg-transparent text-muted-foreground
  hover:text-foreground` or ON `border-primary/40 bg-primary/10 text-primary` — the same
  padding both ways, so flipping moves nothing in the bar; never a teal fill (the headline
  action's). NO count in any state: while OFF the archived count is not on the wire and is
  never guessed. State is a `useState` in `Board.tsx`, default `false` on every mount — not
  `localStorage`, not the URL, not the hash (DESIGN default 3). A click issues ONE list request
  with the parameter flipped, IN PLACE (the silent path: never `setLoading`, so the loading
  branch never mounts and the dock is never unmounted); while it is in flight the button is
  `disabled` with `aria-busy="true"` and the rendered list is the PREVIOUS response's; on
  success the state commits and the rows land; on failure the state does NOT commit — the
  button reads its prior `aria-pressed`, re-enables, and the existing dispatch toast
  (`role="status"`, the `border-accent` error tint) reports the failure with its `dismiss`.
  Every later list request — `⟳ sync`, the executing-item re-poll, the post-action refresh —
  carries the committed state, so the list never silently flips back. A hash deep-link to an
  archived ref with the toggle OFF lands on the overview with the toggle OFF: the row is not
  in `items`, `byRef` misses, nothing auto-flips (the board cannot tell "archived" from
  "unknown" without the parameter).

  THE MARK — one primitive, `ArchivedPill` (`ui/src/board/ArchivedPill.tsx`, a sibling of
  `StaleBadge.tsx` because it is a new read-only vocabulary and not a sixth status): `<span
  class="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]
  font-semibold text-muted-foreground"><span aria-hidden="true">▤</span>archived</span>` — the
  glyph decorative, the WORD carrying the meaning, no `title`, no motion. Painted once per item
  context, immediately LEFT of the status chip and RIGHT of any stale badge, in the `ml-auto`
  cluster: the overview milestone card's row 1 (`[stale][▤ archived][chip]`, the chip keeping
  its right-edge anchor), the gate bar's `ml-auto` cluster, the switcher BUTTON (after the
  mono label), each switcher ROW (as the trailing short-status text `done · archived`), the
  lane card's meta line under `all` focus (left of the stale badge, the card having no chip),
  and the detail-panel header cluster. Stories of an archived milestone carry NO pill (one per
  context; the context is the milestone). The archived card's surface is `bg-muted/40` in
  place of `bg-card` — border, radius, shadow, hover, footer, dots and `Open board →` intact;
  no opacity, no dashed border. Lanes, bucketing, selection, the detail panel's primary action
  (`done` → the quiet ad-hoc `Run agent`), feedback, validate and next are UNCHANGED for an
  archived milestone — VIEW 2 is exactly a done milestone's board plus the mark.

  THE COUNTS. `deriveBoard` gains `archivedMilestones` (milestone rows carrying `archived:
  true`). `✓ N done` counts every RENDERED done milestone, archived included (an archived
  card's own chip reads `✓ done`; a chip that excluded it would contradict the cards beneath
  it). `◐ N active` and `! N blocked gate` are unchanged. `▤ N archived` — a `SummaryChip` in
  `bg-muted text-muted-foreground`, glyph decorative — renders ONLY while the toggle is ON,
  and then even at `0`: it is the receipt that the include-archived fetch happened. The header
  sentence `N milestones · derived from project state` and VIEW 2's `N milestones · full
  stream` count what is rendered. ARCHIVED CARDS RENDER IN THE WIRE'S ORDER — after the live
  milestones, by number among themselves (ADR-002 §5, byte-stable). DESIGN §Surface 2's aside
  "an archived 52 sits where its number puts it" assumed the wire interleaved by number; it
  does not, and the board re-sorts nothing (ADR-006 §3: it partitions, it does not
  re-enumerate). Ratified in this beat: "in list order" means the list's order, and the mark
  — not the position — says archived.

  THE LEGEND. `StatusLegend` gains one row AFTER the Freshness block, painting the REAL
  `ArchivedPill` beside `— done and moved to archive/; shown only with "Show archived"`. The
  fleet's legend is untouched (the fleet paints no pill — task 05).

  What would quietly undo this: a toggle that filters `items` client-side (a second predicate,
  and a count the board cannot know); `aria-pressed` flipped before the response (a toggle ON
  over a list that lacks the rows — a lie by shape); a sticky ON in `localStorage`; a pill
  with the word `aria-hidden` and the glyph carrying meaning; a `disabled:opacity-50` or
  dashed border on the archived card; a pill on an archived milestone's stories; a chip that
  counts the archive while OFF; the refetch taking the loading branch and unmounting the dock.

  ADR-006 §2, §3; ADR-002 §5; DESIGN §"The archived mark", §Surface 2 and its binding checklist,
  documented defaults 3–7, §Accessibility; 07/ADR-003.

  Scenario: the toggle is in the top bar, OFF by default, and the default list holds no archived row
    Given the board mounted against a face whose stream holds milestone `43` (four stories), gate `44`, and an archived milestone `12` (`done`, story `12/00` `done`) plus an archived gate `13` (`done`)
    When the overview renders
    Then the `SurfaceSlot`'s children in DOM order are the `Show archived` button, the `◷ status legend` control and the `⟳ sync` button
    And the button has `type="button"`, `aria-pressed="false"`, `aria-label="Show archived items"`, is not `disabled`, has no `aria-busy`, its visible text is exactly `Show archived` (no digit), and its class string contains `inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition min-h-6 border-border bg-transparent text-muted-foreground`
    And the only list request so far is `/api/work/list` with no query string, and no node in the tree carries the text `archived` outside the toggle's own label and the legend — no card, gate bar, chip or pill for `12`, `12/00` or `13`
    And the header reads `1 milestone` and the chips are exactly `✓ 0 done`, `◐ 1 active`, `! 1 blocked gate`

  Scenario: toggling ON refetches in place with the parameter, reveals the archive marked, and states the count
    Given the same mounted board, with `holdNext("/api/work/list")` armed
    When the `Show archived` button is clicked (detached)
    Then a request `/api/work/list?includeArchived=1` is recorded, the button is `disabled` with `aria-busy="true"` and STILL `aria-pressed="false"`, the grid still paints exactly the `43` card, and the tree never entered the `Loading work stream...` branch
    When the held response is released and the app settles
    Then the button reads `aria-pressed="true"`, is enabled, has no `aria-busy`, and its class string contains `border-primary/40 bg-primary/10 text-primary` and no `bg-primary ` fill
    And the grid paints `43` then `12` in that order — `12`'s card `<button>` carries `bg-muted/40` and not `bg-card`, no class containing `opacity` or `border-dashed`, its footer reads `1 story`, `✓ accepted` and `Open board →`, and its row-1 `ml-auto` cluster's children in order are exactly the archived pill and the status chip `✓ done` (no stale badge — none is reported)
    And the pill is a `<span>` whose class string is exactly `inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground`, whose first child is `<span aria-hidden="true">▤</span>` and whose visible text is `archived`; the `43` card carries no such span
    And the gates strip paints `44` then `13`, and `13`'s bar's `ml-auto` cluster holds the pill immediately left of its `✓ done` chip
    And the header reads `2 milestones` and the chips are exactly `✓ 1 done`, `◐ 1 active`, `! 1 blocked gate`, `▤ 1 archived` in that order, the last in `bg-muted text-muted-foreground` with its glyph `aria-hidden`
    When the `Show archived` button is clicked again and the app settles
    Then the request `/api/work/list` (no query) is recorded, the button reads `aria-pressed="false"` in its OFF classes, the grid paints only `43`, no pill exists anywhere in the tree, and the `▤` chip is absent

  Scenario: the archived chip is present even at zero while ON, and absent while OFF
    Given the board mounted against the DEFAULT stream (no archive on disk)
    When the overview renders
    Then no chip's text contains `archived`
    When `Show archived` is clicked and the app settles
    Then the chips are exactly `✓ 0 done`, `◐ 1 active`, `! 1 blocked gate`, `▤ 0 archived` — the zero is stated, and `aria-pressed="true"`

  Scenario: an archived milestone's board is a done milestone's board plus the mark, and its stories carry none
    Given the same archived stream, the toggle ON, and `Open board →` clicked on `12`
    When the lane board renders
    Then the switcher button's children in order are the status dot, the mono label `12 · <title>`, the archived pill, and `▾`; the count label reads `1 story`
    When the switcher is opened
    Then its rows are `All milestones`, `43` (trailing text `in progress`) and `12` (trailing text `done · archived`), each row's trailing text in the same `shrink-0 text-xs text-muted-foreground` span
    And the lanes bucket `12/00` under `done`, and the lane card for `12/00` carries NO pill and NO `bg-muted/40`
    When `12/00` is selected
    Then the detail panel's header cluster (`ml-auto flex items-center gap-1.5`) holds NO pill for the story; its primary action, feedback, validate and next affordances are those of a `done` story unchanged
    When the switcher is set to `All milestones`
    Then the lane card for `12` (a `<button data-card>`) carries the pill in its meta line immediately left of where the stale badge would sit, its class string contains `bg-muted/40`, and the card for `43` carries no pill; the count label reads `2 milestones · full stream`
    When `12` is selected under `all` focus
    Then the detail-panel header cluster's children in order are exactly the archived pill and the status chip `✓ done` (no stale badge — none is reported); the panel's primary action is the quiet ad-hoc `Run agent` a done milestone offers
    When a story of `12` is reported by `umamis-mac-mini` at `app.at(-301)` under a 300-second window and the board re-syncs
    Then that story's lane card ends in exactly one stale badge and still no pill; `12`'s own card under `all` focus shows `[◌ stale …][▤ archived]` in that order

  Scenario: a failed toggle refetch reverts the toggle and reports through the existing toast, and the list is untouched
    Given the same archived stream, toggle OFF, and the face armed with `failListWith(503, "cache locked")`
    When `Show archived` is clicked and the app settles
    Then the request `/api/work/list?includeArchived=1` was recorded, the button reads `aria-pressed="false"`, is enabled and not busy, and the grid still paints exactly the `43` card — the previous response's rows
    And a `role="status"` toast is rendered with `border-accent` whose text contains `cache locked` and a `dismiss` button; clicking `dismiss` removes it
    And the tree never entered the page-level error branch (`Could not load the work stream`) and the dock, if open, was not unmounted
    When the face is healed and `Show archived` is clicked again
    Then the toggle commits ON and `12` renders marked

  Scenario: the committed state rides every later list request, and never a reload
    Given the same archived stream with the toggle committed ON
    When `⟳ sync` is clicked
    Then the recorded request is `/api/work/list?includeArchived=1` and `12` stays rendered
    When an item is dispatched so the board's executing-item re-poll runs, and the app's clock advances through one poll interval
    Then every list request recorded during the window carries `includeArchived=1`
    When the page is re-mounted fresh against the same face
    Then the toggle reads `aria-pressed="false"`, the first list request has no query string, and `12` is not rendered
    When the page is mounted fresh with `#12` in the hash
    Then the view is the overview, the toggle reads `aria-pressed="false"`, no board is focused and no `includeArchived` request was made

  Scenario: the legend documents the pill by painting the real one
    Given the board mounted against any stream
    When the `◷ status legend` popover is opened
    Then its rows after the Freshness block end with one row whose first child is an `ArchivedPill` byte-identical in class string and children to the one the archived card paints, followed by the text `— done and moved to archive/; shown only with "Show archived"`
    And the fleet's legend (`test/ui/board-freshness-legend.test.mjs`'s `fleetLegend`) has gained no row

  Scenario: accessibility — the words carry the meaning and the toggle is a real toggle
    Given the same archived stream with the toggle ON
    When the tree is read
    Then every pill's accessible text is `archived` (the glyph span `aria-hidden="true"`, the word not hidden), the toggle's accessible name is `Show archived items`, its class string contains `min-h-6`, and no pill, chip or card conveys "archived" by colour or glyph alone
    And no node in the Backlog section or on an archived card gained a `tabIndex`, and the archived card is still the single `<button>` it was
