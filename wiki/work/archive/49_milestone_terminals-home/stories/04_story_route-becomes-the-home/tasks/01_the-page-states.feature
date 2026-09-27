<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/04, THE PAGE'S OWN STATES: what `/` says when it has nothing to
# show, when it is still asking, and when the ask failed — on a surface whose EMPTY state is
# the ordinary one and must not lie by omission.
#
# WHY EMPTY IS THE ORDINARY STATE, MEASURED (RESEARCH §Q1, and it is the premise of this
# whole task). A presence session record is written only through `aof session start|ping|end`
# (src/commands/mesh-session.mjs:318,323), which fires only where the workspace's own hook
# config wires it — and the shipped bundle wires those hooks for **Codex only**
# (src/bundle/bundle.json:12-14; the only claude-runtime member is `claude-artifact-sync` at
# :15-16). Measured on the live three-node fleet at this refine: all three nodes report
# `sessions: []` while two of them report a non-empty `activeRuns`. So the first thing most
# operators will see at `/` is an empty grid **while agents are demonstrably working**, and
# a bare `No live sessions.` would be true of the array and false about the world.
#
# THE SEAM, read at source in the working tree at this refine:
#  · THE PRECEDENT THIS TASK COPIES, deliberately, rather than inventing a second shape:
#    `pageState(ctx)` — ui/src/fleet/scope.mjs:165-170 — is the fleet's ONE state selector,
#    a pure function of `{ loading, error, status }` whose own comment says the state names
#    are shared between the render code and the tests. `isEmptyStatus` is :191-198 and
#    `emptyStateCopy(narrowings) → { heading, body, value }` is :306. The three components
#    that render those states are ui/src/fleet/PageStates.tsx:28-48 (loading), :58-79
#    (error) and :104-162 (empty). **The home gets its own selector and its own copy table
#    under `ui/src/home/`; it does not import the fleet's** (ADR-001: `ui/src/home/` imports
#    nothing from `ui/src/fleet/`).
#  · THE INPUTS, both already on the wire: the top-level session index `sessions:
#    MeshSession[]` (ui/src/fleet/api.ts:250, entry type at :219-228 — `nodeId`,
#    `sessionId`, `workspaceId`, `repo`, `assistant`, `lastPingAt`, `workspaceHasRun`,
#    `workItem`), and each node's `presence.activeRuns: string[]` (api.ts:57-58, hung off
#    `GlobalNode.presence?` at :184, beside `freshness: "live"|"stale"|"unknown"` at :178).
#    **`buildSessionIndex` never reads `activeRuns`** (src/global-mesh-query.mjs:197-308; the
#    node gate is `if (node.freshness !== "live") continue` at :261), so the E1/E2
#    discriminator has to read the nodes itself. That is the one join this task makes.
#  · THE EMPTY CARD'S FORM, verbatim from the house: `rounded-lg border border-dashed
#    border-border bg-card/40 p-6 text-sm text-muted-foreground` — ui/src/fleet/Fleet.tsx:916
#    (DESIGN cites :910; it has drifted).
#  · THE ONE HEADING SURVIVES ITS FILE: `<h1>Live terminals</h1>` at
#    ui/src/app/Landing.tsx:37, which task 00 deletes. DESIGN §S1 G1 keeps it as the page's
#    one `<h1>`, `sr-only`.
#  · THE SLOT: the shell places one contributed node in the top bar at ≥1024 and in the 40px
#    surface bar at ≤1023 (ui/src/app/shell-layout.mjs:114-127); the harness reads it back
#    through `slot()` / `slotHome()` / `slotControls()`
#    (test/support/shell-app-harness.mjs:190-229).
#
# NOT ASSERTED HERE, each with an owner:
#  · WHERE `/` is mounted, the crash containment, the content mode, the deletion and the
#    budget — TASK 00 of this story.
#  · ANY session row, tile, pane, socket, cap, focus or expand — STORY 49/05. **This story
#    renders no rows**, so the only "populated" fact this file asserts is that the page
#    leaves its own state behind and hands the region over. Every count below is driven from
#    a literal index array, never from a rendered tile.
#  · the feed axis, the posture and the pane's own copy — STORIES 49/02 and 49/03.
#  · the reduced-motion escape itself — STORY 49/06. What this file asserts is the
#    consequence DESIGN DG-49-6 clause 3 puts on THIS page: it adds no motion of its own.
#  · pixels, spacing, the ramp and the dashed card's exact geometry — the `@uat` visual
#    review at the bottom of this file, judged against DESIGN §S1's binding checklist (there
#    is no committed mock; §Conformance source of truth makes the checklist the baseline and
#    forbids returning INCONCLUSIVE for want of one).
#
# THE TRAPS:
#  1. **PRINTING A FIX-IT COMMAND.** DG-49-1 forbids one in terms — *"no command this
#     document cannot vouch for"* — because WHICH command wires Claude's session hooks into a
#     workspace is a producer-side decision the architect still owns. The trap is concrete
#     rather than theoretical: the house's own `EmptyFleet` prints `aof mesh invite` /
#     `aof mesh join` / `config.mesh.enabled: true` in exactly this slot
#     (ui/src/fleet/PageStates.tsx:150-157), so a build that reaches for the nearest
#     precedent ships the forbidden thing. Scenario 4 is the pin.
#  2. **ONE EMPTY STATE INSTEAD OF TWO.** `No live sessions.` is the failure DG-49-1 exists
#     to prevent, and it is what a naive `sessions.length === 0` produces.
#  3. **A SHIMMER FOR LOADING.** DESIGN §S1 rules loading is a muted centred line in the same
#     card — NOT `.aof-pending` (ui/src/index.css:99-110) and not the `animate-pulse`
#     skeleton pair the house uses elsewhere (ui/src/fleet/PageStates.tsx:44-45;
#     ui/src/app/Shell.tsx:596-597). Story 06 measures that BOTH of those idioms animate
#     under `prefers-reduced-motion: reduce` today, so a skeleton here would ship a new
#     accessibility defect into the milestone that is fixing one.
#  4. **RE-ENTERING LOADING ON EVERY POLL.** The payload re-polls every 5s
#     (ui/src/fleet/assign-affordance.mjs:54's `POLL_MS = 5000`, consumed at
#     ui/src/fleet/Fleet.tsx:462). Blanking a screen of live terminals every five seconds is
#     a worse failure than a five-second-old count.
#  5. **COUNTING A STALE NODE'S RUNS.** See scenario 3's note — this is a QA ruling made
#     here and flagged, not inherited.
#
# LITMUS AND WHICH LANE EACH SCENARIO IS IN. This repo has NO React test harness; what it
# has is a headless MOUNT harness (test/support/react-app-harness.mjs esbuild-bundles the
# real `.tsx` against test/support/mini-react.mjs and mounts it against a REAL face over
# HTTP). It is enough for every claim in this file, and the precedent is exact:
# `withShellComposedFleet({ …, settle: "render" })` mounts WITHOUT waiting for the first
# request to land, *"which is the only way to read the LOADING page state"*
# (test/support/shell-app-harness.mjs:84-87). So:
#   · SELECTOR + COPY facts — which state, which sentence, which count — are `@executable`
#     over the framework-free `.mjs` under plain `node`.
#   · RENDERED facts — the card's classes, the anchor's href, the one `<h1>`, the slot's
#     home, "no second bar" — are `@executable` through the mount harness, which reads the
#     rendered tree rather than a source file.
#   · PIXEL facts are the one `@uat` at the bottom. There is no `@executable` scenario here
#     that needs a real browser.
#
# ISOLATION. No store, no database, no mesh. The harness lanes stand a REAL fixture face up
# and bind `port: 0`, reading `address().port` — `:4181` and `:4182` are held by live
# daemons on this machine and **no scenario binds a fixed port**. Runs are FOCUSED under a
# throwaway `AOF_GLOBAL_HOME=$(mktemp -d)`, never the full suite. Any new suite is
# registered in scripts/test.mjs (`acd-test-suite-registration`).

@ui @work @design
Feature: the terminals home's own states — two empty states that name which emptiness this is, a loading state that is not a shimmer, and a payload error that names the fault
  In order that an operator opening a screen with nothing on it learns whether their fleet is idle or whether their fleet simply is not reporting, instead of being told a true and useless sentence
  the home must choose exactly one of E1 / E2 / loading / error / populated from the payload alone, say the words DESIGN fixed, print no command it cannot vouch for, and offer exactly one route out

  Background:
    Given the home's own pure state selector under `ui/src/home/`, called with literal payloads shaped exactly as `/api/mesh/status` serves them
    And "the index" means the payload's top-level `sessions[]` array and "a node's runs" means that node's `presence.activeRuns`
    And the rendered scenarios mount the REAL home through the mount harness against a REAL fixture face on an ephemeral port
    And no scenario below renders or counts a session TILE — this story renders no rows

  # ─────────────────────────── which state, and only one ───────────────────────────
  # THE SELECTOR IS TOTAL AND IT IS ONE FUNCTION. The fleet learned this the expensive way:
  # a second selector beside the first is m45/ADR-002's failure one surface down.
  @executable
  Scenario Outline: one selector answers for every payload the face can serve, and never throws
    Given <the situation>
    When I read the page state
    Then it is exactly <state>
    And no error is thrown
    And re-reading it with the identical input returns the identical answer

    Examples: the four states DESIGN §S1 fixes
      | case                                        | the situation                                                          | state    |
      | the very first fetch is still out           | loading, no payload yet                                                | loading  |
      | the first fetch failed                      | not loading, an error, no payload                                      | error    |
      | a quiet fleet                               | a payload with an empty index and no node reporting runs               | E1       |
      | runs in flight, nothing reporting           | a payload with an empty index and one node reporting one run           | E2       |
      | sessions to show                            | a payload whose index holds one addressable session                    | populated |

    Examples: precedence, stated so it is not discovered
      | case                                        | the situation                                                          | state    |
      | loading wins over a stale error             | loading, AND a previous error still held                               | loading  |
      | an error wins over an empty payload         | not loading, an error, AND an empty payload in hand                    | error    |
      | an error wins over a populated payload      | not loading, an error, AND a payload holding two sessions              | error    |

    Examples: malformed and adversarial — every one answers, none throws
      | case                                        | the situation                                                          | state    |
      | no payload key at all                       | not loading, no error, `status` absent                                 | loading  |
      | a null payload                              | not loading, no error, `status` is null                                | loading  |
      | the index key is missing                    | a payload with no `sessions` key and no nodes                          | E1       |
      | the index is not an array                   | a payload whose `sessions` is the string "none"                        | E1       |
      | the index holds a non-object                | a payload whose `sessions` is `["sess-A"]`                             | E1       |
      | the nodes key is missing                    | an empty index and no `nodes` key                                      | E1       |
      | a node with no presence record              | an empty index and one node that has never beaten                      | E1       |
      | `activeRuns` is not an array                | an empty index and one node whose `activeRuns` is `"20260813T…"`       | E1       |
    # THE TWO `status`-ABSENT ROWS ARE A DELIBERATE READING, not an oversight: no payload has
    # ever arrived, so the honest answer is "still asking", exactly as `isEmptyStatus(null)`
    # already treats a null payload as not-yet-known (scope.mjs:191-192) and `pageState`
    # reads `loading` first (:166). Answering E1 there would assert "nothing is running"
    # about a fleet nobody has heard from.
    # EVERY MALFORMED ROW FAILS TOWARD E1 rather than toward E2 or an error: E2 makes a
    # POSITIVE claim ("there are runs in flight"), and a claim built on a shape we could not
    # parse is exactly the lie-by-omission this page exists to refuse.

  # EXACTLY ONE STATE ON SCREEN. DESIGN §S1 G3: "Never two, never a state plus a partial grid."
  @executable
  Scenario Outline: the page shows one state and nothing beside it
    Given the home mounted in the <state> state
    When I read the rendered content region
    Then exactly one of the five state treatments is present in the tree
    And none of the other four is present, not even collapsed, hidden or zero-height
    And the region holds no partial grid, no placeholder tile and no empty tile frame

    Examples:
      | state     |
      | loading   |
      | error     |
      | E1        |
      | E2        |
      | populated |

  # ─────────────────────────── E1 vs E2, the whole point ───────────────────────────
  # THE DISCRIMINATOR. E2 is the state RESEARCH measured the live fleet to be in right now,
  # and E1 is the one every naive implementation ships.
  @executable
  Scenario Outline: which emptiness this is, decided from the nodes' own runs
    Given an EMPTY index and <the fleet>
    When I read the page state and its copy
    Then the state is <state>
    And the run count the copy names is <N>

    Examples:
      | case                                          | the fleet                                                            | state | N   |
      | no mesh at all                                | no nodes                                                             | E1    | n/a |
      | live nodes, nobody working                    | two live nodes, both `activeRuns: []`                                | E1    | n/a |
      | one live node, one run                        | one live node with one run                                           | E2    | 1   |
      | the live fleet as measured at this refine     | three live nodes, two of them with one run each                      | E2    | 2   |
      | one node, several runs                        | one live node with three runs                                        | E2    | 3   |
      | runs spread across the fleet                  | three live nodes with 1, 2 and 0 runs                                | E2    | 3   |
      | a STALE node holding a frozen run             | one live node with no runs, one stale node whose record shows a run  | E1    | n/a |
      | a node never seen, with a run in its record   | one live node with no runs, one `unknown` node whose record shows a run | E1  | n/a |
      | live runs beside a stale node's frozen run    | one live node with one run, one stale node whose record shows two    | E2    | 1   |
    # THE LAST THREE ROWS ARE A QA RULING, MADE HERE AND FLAGGED FOR THE ARCHITECT rather
    # than inherited. DESIGN DG-49-1 says E2 fires when *"at least one node reports
    # `activeRuns`"* and does not say which nodes count. Ruled: **only nodes the registry
    # calls `live`**, for two reasons that are both already law elsewhere. (a) A stale node's
    # presence file is FROZEN on disk with its runs inside it — that is the exact hazard
    # `buildSessionIndex` gates on at src/global-mesh-query.mjs:261, and counting those runs
    # would make this page assert "3 runs in flight" about a machine we cannot see, which is
    # the species of lie the whole design gap exists to refuse. (b) It keeps the two halves
    # of one sentence derived from one liveness rule; a build that gated sessions on
    # freshness and runs on nothing could say "2 runs in flight" and "no session is
    # reporting" about a machine that has been off for a day. If the architect wants stale
    # runs counted, THIS is the row to argue, and the copy would have to change with it.
    # ROW 4 IS THE LIVE FLEET, verbatim from RESEARCH §Q1's measurement — the state an
    # operator on this machine actually meets.

  # THE COPY, WORD FOR WORD, AND THE COMMAND THAT MUST NOT BE THERE.
  @executable
  Scenario Outline: each empty state says exactly what DESIGN fixed, and neither prints a command
    Given the home in the <state> state
    When I read the rendered card
    Then line 1 is exactly <line 1>
    And line 2 is exactly <line 2>
    And the card contains exactly one link, labelled `Open the fleet →`
    And the card contains NO command: no `aof ` token, no `config.` token, no `npm`/`node` token, and no monospace/code-formatted block anywhere in it
    And nothing in the card is red, destructive or accent-toned, there is no spinner, and there is no element carrying `animate-pulse` or `aof-pending`
    And the card is the house's dashed empty primitive — `rounded-lg border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground`, verbatim

    Examples:
      | state | line 1                                                              | line 2                                                                                                                                                                        |
      | E1    | Nothing is running.                                                 | Assign work from the fleet.                                                                                                                                                   |
      | E2    | <N> runs in flight · no session is reporting a terminal.            | A session appears here only when its workspace reports one. The bundle wires session hooks for Codex; a Claude Code session is reported only where those hooks are configured. |
    # E2's LINE 2 IS QUOTED VERBATIM FROM DESIGN DG-49-1 and is byte-compared, not matched
    # loosely: it is the one sentence on this surface that explains a producer-side fact an
    # operator cannot otherwise discover, and a paraphrase would quietly change what it
    # claims. Its `<N>` is scenario 3's count and its separator is the middle dot the house
    # already uses.
    # THE NO-COMMAND CLAUSE IS THE SHARP ONE (trap 1). It is asserted as an ABSENCE over the
    # whole card rather than as "the E2 card has no `aof session` line", because the failure
    # mode is reaching for `EmptyFleet`'s shape (PageStates.tsx:150-157), which prints three
    # different commands in three different branches. When the architect settles which
    # command wires Claude's hooks, E2 gains its command line in DESIGN first and here
    # second — in one change, in that order.

  # THE ONE ROUTE OUT, and it is a real in-app link.
  @executable
  Scenario: the single link is a path link into this application, with no legacy selector on it
    Given the home in either empty state, mounted inside the real shell
    When I read the rendered anchor
    Then its href is exactly `/fleet`
    And its href carries no `mode` parameter, no query string and no origin — it is a path, composed by the app's own vocabulary rather than typed at this call site
    And it is a real anchor an operator can middle-click, not a button that navigates
    And there is exactly one such link in the card — E1 and E2 differ in their words, never in their number of exits
    And the shell's nav is unchanged by it: the `landing` nav item is still the current one, and the fleet destination in the nav is not duplicated INTO the card
    # `/fleet` is the page that renders the runs this page cannot — that is the whole reason
    # DESIGN picks it. The no-`mode` clause is the behavioural neighbour of
    # `acd-no-surface-mode-url-literal`: the gate sweeps source text, this reads a RENDERED
    # href, and a link composed at runtime from a variable would satisfy the gate and fail
    # here (the precedent is test/in-app-cross-links.test.mjs, which reads hrefs out of
    # production render output for exactly this reason).

  # ─────────────────────────── loading, and what it is not ───────────────────────────
  @executable
  Scenario: loading is the first fetch only, and it is a line rather than a shimmer
    Given the home mounted with its first request still in flight
    When I read the rendered content region
    Then it holds a muted centred line reading exactly `Loading sessions…`
    And that line sits in the same dashed empty card the two empty states use
    And no element in the tree carries `animate-pulse`, `aof-pending`, `animate-spin` or any other animation class
    And there is no skeleton block, no placeholder tile and no reserved tile frame
    And the page contributes its surface-slot node in this state too — the node is present from the first paint, not only once data arrives, and it carries NO counts until a payload has arrived
    # CLAUSE AMENDED BY THE PO at `aof:verify 49`, 2026-08-13, and the amendment is narrow.
    # As written this clause said "the summary is present from the first paint", which a builder
    # could only satisfy by rendering `0 sessions · 0 live` before the first fetch returned — and
    # the designer's re-render ruled exactly that a LIE (GAP-7, rule R-3): on this surface
    # "0 sessions" is E1's whole message, so asserting it from an absence of data is DG-49-1's
    # refusal one region up. The two could not both be spelled, which is the same shape as the two
    # clauses amended at story 05 for F6's live region — and the same resolution: name the clash,
    # rule it, and record the reasoning where the next reader meets it.
    # WHAT THE CLAUSE WAS PROTECTING IS UNCHANGED and is why it is amended rather than deleted:
    # the page's slot contribution must not arrive late, because a slot that appears once data
    # lands grows a bar under a screen the operator is already reading. The NODE is what must be
    # there from the first paint; the COUNTS are what must wait for a payload. Both now hold.
    # DESIGN §S1 and DG-49-6 clause 3 both rule this, and story 06 is why it matters: the two
    # shimmer idioms in this house (`.aof-pending`, ui/src/index.css:99-110, and the
    # `animate-pulse` skeleton pair at ui/src/fleet/PageStates.tsx:44-45) are the ONLY
    # animations on the page, and only the first has a reduced-motion escape today. Adding a
    # shimmer here would ship a second unescaped animation into the milestone that exists to
    # remove one.

  @executable
  Scenario: a later poll never blanks the page back to loading
    Given the home that has already completed one successful fetch and is showing its state
    When the next poll goes out, and while it is in flight
    Then the page still shows exactly what it showed before — the same state, the same words, the same count
    And it does NOT return to the loading card at any point
    And when that poll lands with a changed payload the page updates in place, with no intermediate blank frame
    And driving twenty consecutive polls produces no frame in which the loading card is on screen
    # The payload re-polls every 5s (ui/src/fleet/assign-affordance.mjs:54, consumed at
    # ui/src/fleet/Fleet.tsx:462). Story 05 inherits the harder half of this rule — a grid of
    # live terminals must not be torn down and rebuilt on a poll — and this task is where the
    # rule is first stated, on a page with nothing in it yet, which is the cheapest place to
    # get it right.

  # ─────────────────────────── the payload failed ───────────────────────────
  @executable
  Scenario: a payload error names the fault, offers the way back, and is unmistakably not an empty state
    Given the home whose first fetch failed with a named fault
    When I read the rendered content region
    Then the fault is named in the message the operator can read — not a bare "something went wrong"
    And the treatment is the fleet page's own failed-state ramp, reused: the accent pill, its mark, and a retry control
    And it is visibly a DIFFERENT treatment from the dashed empty card — an operator can tell "this failed" from "there is nothing here" without reading the words
    And pressing retry re-issues the request and, on success, the page leaves the error state for whichever of the four other states the new payload names
    And the error replaces the page's content region entirely: there is no partial grid and no half-populated state beside it
    # DESIGN §S1 also rules that *"a payload error never turns tiles into `error` panes — the
    # sockets are independent of the poll"*. **That half is STORY 05's**, because this story
    # has no tiles to leave streaming; it is named here so the rule is not lost in the seam
    # between two stories.
    # A DESIGN GAP ROUTED RATHER THAN INVENTED: DESIGN fixes the FIRST-fetch failure and says
    # nothing about a SILENT re-poll failure after a successful load — whether the page swaps
    # to this error card, or keeps its last-known content with a staleness marker (the shape
    # the fleet already has for a dead server). The scenario above pins only the first-fetch
    # case; the re-poll case is routed to the designer and must not be settled by whichever
    # branch a build writes first.

  # ─────────────────────────── the page's own chrome ───────────────────────────
  @executable
  Scenario: the page contributes ONE node to the shell's slot and grows no bar of its own
    Given the home mounted inside the REAL shell at 1280 and again at 900
    When I read the shell's rows and its surface slot
    Then at 1280 the contribution is in the top bar and at 900 it is in the 40px surface bar — the slot MOVES and its contents do not change form
    And the shell's row list is exactly the rows it had before this surface existed: the home adds no sixth row and no bar of its own
    And exactly one `banner` and exactly one `<main>` survive with the home mounted
    And the contribution is a summary and never a control: it holds no button, no link and nothing focusable
    # DESIGN §S1: *"A second bar is a GAP, not a variant."* The shell already owns the top
    # bar, the surface bar and the overlay (ui/src/app/shell-layout.mjs:55-61) and places one
    # contributed node by width (:114-127).

  @executable
  Scenario Outline: the summary says what is true and drops the part that is not
    Given an index and live-pane counts of <N sessions>, <M live> and <K need input>
    When I read the surface-slot summary
    Then it reads exactly <the summary>

    Examples:
      | case                          | N sessions | M live | K need input | the summary                          |
      | nothing at all                | 0          | 0      | 0            | 0 sessions · 0 live                  |
      | sessions, none watched        | 3          | 0      | 0            | 3 sessions · 0 live                  |
      | one needs input               | 3          | 3      | 1            | 3 sessions · 3 live · 1 need input   |
      | several need input            | 9          | 9      | 4            | 9 sessions · 9 live · 4 need input   |
      | a single session              | 1          | 1      | 0            | 1 sessions · 1 live                  |
    # `· <K> need input` renders ONLY when K > 0 (DG-49-3: a badge that says "we don't know"
    # on most tiles trains the eye to ignore the badge that matters). The `1 sessions` row is
    # in the table deliberately — DESIGN fixes the string as `<N> sessions` with no
    # pluralisation rule, and pluralising it here would be inventing copy in a QA table; if
    # the designer wants `1 session`, this row is where that lands.
    # IN THIS STORY `M live` IS ALWAYS 0, because no pane holds a socket yet. The FORMATTER is
    # driven exhaustively here so it is complete before 05 wires real counts into it; what
    # 05 owns is the wiring, not the words.

  @executable
  Scenario: the page keeps exactly one heading, and it is the one the deleted file carried
    Given the home mounted inside the REAL shell
    When I read the headings in the document
    Then there is exactly one `<h1>` on the page and its text is exactly `Live terminals`
    And it is visually hidden (`sr-only`) while remaining in the accessibility tree
    And it is present in every one of the five page states, not only the populated one
    And no second `<h1>` is contributed by the shell, the slot or the state cards
    # It comes across from ui/src/app/Landing.tsx:37, which task 00 deletes — m45 fixed *"the
    # ONE `h1` on the page"* and DESIGN §S1 G1 keeps it while making it silent, because the
    # grid is its own title and a 432px content box (`CONTENT_FLOOR`,
    # ui/src/app/shell-layout.mjs:163-165) cannot spend a row saying so.

  # ─────────────────────────── the human's verdict ───────────────────────────
  # DG-49-1's own close condition, and the reason a designer is in this loop at all: the
  # measured fact is that E2 is the state the operator MEETS, so "does this page tell the
  # truth about an empty fleet" is the milestone's first impression and cannot be judged
  # from a returned string.
  @uat
  Scenario Outline: the empty terminals home tells the truth
    Given a render of `/` at 1280 in the <state> state, captured by the orchestration and handed to the reviewer
    When the reviewer judges it against DESIGN §S1's binding checklist and DG-49-1
    Then the card names which emptiness this is, and a reader who knows nothing about hooks or producers can tell the two states apart from the words alone
    And it reads as an ordinary, calm state — not as a failure, not as a warning, and not as something still loading
    And the one route out is obvious and is the only thing to press
    And no command appears anywhere on the surface
    And the verdict is CONFORMS or GAPS against §S1 — never INCONCLUSIVE for want of a committed mock, because §Conformance source of truth makes the checklist the baseline until `mocks/s1-terminals-home.png` lands

    Examples:
      | state |
      | E1    |
      | E2    |
    # RENDER TARGET R-A (DESIGN §Render breakpoints), states `E1 empty` and `E2
    # runs-but-no-sessions`. **The reviewer does not run the browser** — the orchestration
    # renders and hands over the screenshots; the reviewer judges what it is handed. E2 must
    # be captured from a fixture whose nodes carry `activeRuns` and whose index is empty,
    # which is the live fleet's own shape today.
