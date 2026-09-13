<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/04, THE ROUTE SWITCH: `/` stops being a card the shell draws
# itself and becomes a surface the shell HOSTS — inside `SurfaceSlot`'s crash containment,
# at `content:fixed`, with `ui/src/app/Landing.tsx` DELETED rather than parked beside it.
#
# THE SEAM, read at source in the working tree at this refine (every line number below was
# grepped, not inherited — ADR-001 was written against a 917-line `Shell.tsx` and the file
# is 930 lines now, so its `:332-333` / `:335-341` anchors have all drifted ~13 lines):
#  · `SURFACES` — ui/src/main.tsx:43-47, three entries (`fleet`, `board`, `config`). Its own
#    comment at :40-42 states the m45 prediction this story falsifies in one half: *"`landing`
#    and `not-found` are absent on purpose: the shell renders both itself, and milestone 49
#    replaces what `/` renders without touching this map."* The map IS touched.
#  · `SHELL_RENDERED_ROUTES` — ui/src/app/entry.mjs:126, frozen `["landing", "not-found"]`.
#  · `surfaceMountFor(routeId, surfaceIds)` — ui/src/app/entry.mjs:139-152. It returns THREE
#    booleans off TWO inputs: `shellRenders` (the id is in `SHELL_RENDERED_ROUTES`), `mounts`
#    (`!shellRenders && known`), `surfaceFailed` (`!shellRenders && !known`). Called at
#    ui/src/main.tsx:60-61.
#  · the inline landing branch — ui/src/app/Shell.tsx:345-346,
#    `) : routeId === "landing" ? ( <Landing destinations={…} />`, with its import at
#    Shell.tsx:68. It sits in the `<main>` ternary (Shell.tsx:338-339) BEFORE the
#    `<SurfaceBoundary key={routeId}>` arm at Shell.tsx:360 — whose own comment says it
#    *"wraps ONLY the mounted surface — not the nav, not the bars, not the not-found or
#    landing states"*. That is the containment fact the whole story turns on.
#  · `ui/src/app/Landing.tsx` — 69 lines, ONE importer (Shell.tsx:68). Its `<h1>Live
#    terminals</h1>` at Landing.tsx:37 is the page's one heading and SURVIVES the deletion
#    (task 01 owns where it lands).
#  · `CONTENT_MODES` — ui/src/app/shell-layout.mjs:526-532; `["landing", CONTENT_MODE_PAGE]`
#    at :527 is the ONE row that changes. `contentModeFor` is :543-552.
#  · the route TABLE is NOT touched: `ROUTES` at ui/src/app/routes.mjs:52-58 keeps
#    `{ id: "landing", path: "/" }` at :53, and `routeFor` at :74-81 is unchanged.
#
# WHAT MAKES THIS DANGEROUS RATHER THAN TIDY (ADR-001, and it is the reason this is a story
# of its own). `surfaceMountFor`'s `shellRenders`/`known` pair makes the HALF-LANDED state
# look deliberate: with `SHELL_RENDERED_ROUTES` still naming `landing` and `SURFACES` already
# holding it, `shellRenders` wins, `mounts` is false, `surfaceFailed` is false — nothing is
# red, no console line, no address-bar evidence, and the shell quietly renders the
# placeholder while a real home sits mounted-by-nobody. Scenario 2 drives that whole truth
# table, which is why it is an Outline and not a sentence.
#
# AND THE CONSEQUENCE IS NOT COSMETIC. The shell-rendered path is OUTSIDE the boundary at
# Shell.tsx:360. One static card is safe there; a surface that fetches, polls every 5s and
# (in story 05) holds up to sixteen sockets is not — a throw in it takes the chrome down
# with it, which is exactly the failure m45's own containment finding F-45-M-1 exists to
# prevent.
#
# NOT ASSERTED HERE, each with an owner:
#  · the page's four states, its copy, its heading and its surface-slot summary — TASK 01
#    of this story. This file asserts WHERE the home is mounted, never what it says.
#  · session rows, tiles, panes, sockets, the cap, focus and expand — STORY 49/05. This
#    story renders NO rows, deliberately (ARCHITECTURE bad cut 3: rows and sockets are one
#    cut, and splitting them re-creates TECH_DEBT 29).
#  · the pane's affordance table and the posture — STORY 49/03.
#  · the STRUCTURAL invariants, each already owned by a gate: `ui/src/home/**` imports
#    nothing from `ui/src/fleet/` or `ui/src/board/` (`acd-terminal-control-boundary`'s new
#    empty `home →` baseline); `ui/src` has EIGHT top-level directories with a per-directory
#    file ceiling (`acd-ui-directory-budget`, new); there is ONE route table and the render
#    root selects through it (`acd-ui-single-route-table`); the route module stays
#    React-free (`acd-route-logic-framework-free`). ARCHITECTURE §Fitness functions is
#    explicit that writing those as Gherkin puts a fitness function in the wrong home.
#
# THE TRAPS, named so a build meets them rather than discovers them:
#  1. **HALF-LANDING.** Four edits, one diff. Scenario 2's truth table is the pin, and
#     scenario 6 is the other half: a `Landing.tsx` left on disk "until the grid is ready"
#     is a second component claiming one route.
#  2. **THE SHELL'S OWN MOUNTING SHIMMER ARRIVES AT `/` FOR THE FIRST TIME.** Today
#     `contentStateFor` (shell-layout.mjs:690-697) can only reach `STATE_MOUNTING` for a
#     route with a surface, so `/` has never rendered `MountPlaceholder` (Shell.tsx:593-598)
#     — two `animate-pulse` skeletons at :596-597, which story 06 measures as having NO
#     reduced-motion escape. Making `/` a routed surface makes that state reachable at `/`.
#     Scenario 5 pins that the home is handed a LOADED surface synchronously (no code-split
#     import here, so `surfaceLoaded` is never false) and therefore the shimmer is not how
#     `/` renders its first paint — the page's own loading state is task 01's, and DESIGN
#     §S1 rules it is not a shimmer.
#  3. **EVERY LIST MOVES IN THE SAME DIFF** (m46/ADR-006). Five shipped suites name the
#     landing and one names the file: test/shell-entry-plan.test.mjs:81,163-170,246-260,
#     411-428; test/shell-regions.test.mjs:237,327,359,383,713-718,748-778;
#     test/shell-surface-containment.test.mjs:234-264,306-311; test/shell-navigation.test.mjs;
#     test/app-routes.test.mjs; and test/support/shell-app-harness.mjs:1-8 names `Landing.tsx`
#     among the real siblings it bundles. **A green focused run with those untouched means
#     the route did not land.**
#  4. **THE BUDGET IS NOT A SIDE NOTE AND ITS PREMISE HAS ALREADY DRIFTED.** Measured at
#     this refine by `acd-ui-surface-file-budget`'s OWN arithmetic
#     (`source.split(/\r?\n/).length`, test/arch/acd-ui-surface-file-budget.test.mjs:174-184):
#     `Shell.tsx` **931**/940 → **9 lines of headroom, not the 23 ARCHITECTURE and STORY
#     both quote**; `shell-layout.mjs` **1,016**/1,060 (44); `Fleet.tsx` **1,540**/1,560 (20);
#     `DetailPanel.tsx` **1,000**/1,000 (**0**); `App.tsx` **1,298**/1,300 (2);
#     `TerminalControl.tsx` **819**/840 (21). Scenario 7 is written against the numbers I
#     measured, not the ones the documents carry.
#
# ISOLATION. Nothing here touches a store, a database or the mesh. The model scenarios run
# under plain `node:test`; the harness scenarios mount through
# test/support/shell-app-harness.mjs:49-75, which serves from `http://127.0.0.1:9` and
# supplies `identity` so the shell's one probe never fires. Runs are FOCUSED and carry a
# throwaway `AOF_GLOBAL_HOME=$(mktemp -d)` (the repo's guard hook requires it), never the
# full suite — test/global-work-propagation.test.mjs binds `:4182`, which the live control
# daemon holds, and `:4181` is the fleet's. **No scenario in this file binds a fixed port.**
# Any new suite is registered in scripts/test.mjs (`acd-test-suite-registration`).

@ui @work @design
Feature: `/` becomes the terminals home — one routed surface inside the shell's crash containment, with the placeholder deleted rather than kept beside it
  In order that the first screen an operator sees is their fleet, and that a surface holding live terminals cannot take the whole application down with it
  the `landing` route must stop being drawn by the shell itself and start being mounted through `SurfaceSlot` — `SURFACES` gaining `/`, `SHELL_RENDERED_ROUTES` shrinking to `["not-found"]`, the inline branch removed and `Landing.tsx` deleted, all in one diff, with the route table untouched

  Background:
    Given the shipped `ui/src/app/entry.mjs`, `ui/src/app/routes.mjs` and `ui/src/app/shell-layout.mjs`, imported directly under `node:test` — no bundler, no DOM, no browser
    And the harness scenarios mount the REAL `ui/src/app/Shell.tsx` through `test/support/shell-app-harness.mjs`, with `identity` supplied so the shell probes nothing
    And "the home" means the surface component `SURFACES` maps the `landing` id to after this story
    And no scenario below renders, names or counts a session row — this story renders none

  # ─────────────────────────── the four moves, together ───────────────────────────
  # THE HEADLINE, and it is deliberately ONE scenario rather than four: the whole risk is
  # that these land separately.
  @executable
  Scenario: the four edits are one diff — the map gains the route, the shell-rendered list loses it, the inline branch goes, and the file is gone
    When I read `SURFACES`' keys, `SHELL_RENDERED_ROUTES`, the shell's content ternary and the contents of `ui/src/app/`
    Then `SHELL_RENDERED_ROUTES` is exactly `["not-found"]` — one member, and it is still frozen
    And `landing` is a key of `SURFACES`, alongside `fleet`, `board` and `config`
    And `surfaceMountFor("landing", Object.keys(SURFACES))` returns `mounts: true`, `shellRenders: false`, `surfaceFailed: false`
    And a real directory listing of `ui/src/app/` contains no `Landing.tsx`
    And no module under `ui/src/` imports `./Landing`, `../app/Landing` or any spelling of that path
    And exactly ONE entry of `SURFACES` maps the `landing` id — the route has one claimant, not two
    # Today every one of those is false: the list is `["landing", "not-found"]`
    # (entry.mjs:126), the map has three keys (main.tsx:43-47), `mounts` is false because
    # `shellRenders` wins, and the file is 69 lines with one importer at Shell.tsx:68.

  # THE HALF-LANDED TRUTH TABLE. `surfaceMountFor` is TOTAL over both inputs, so every
  # partial edit has a defined, observable answer — and the dangerous one is the row that
  # answers "nothing is wrong".
  @executable
  Scenario Outline: every combination of the two lists, and only one of them is the landed state
    Given `SHELL_RENDERED_ROUTES` is <the list>
    And `SURFACES` holds <the map>
    When I read `surfaceMountFor("landing", the map's keys)`
    Then it returns shellRenders=<shellRenders>, mounts=<mounts>, surfaceFailed=<surfaceFailed>
    And what the operator gets at `/` is <what renders>

    Examples:
      | case                                    | the list                    | the map                  | shellRenders | mounts | surfaceFailed | what renders                              |
      | today, before the story                 | ["landing","not-found"]     | fleet, board, config     | true         | false  | false         | the shell's own placeholder card          |
      | HALF-LANDED A — the map moved alone     | ["landing","not-found"]     | + landing                | true         | false  | false         | the placeholder, while a home sits unmounted |
      | HALF-LANDED B — the list moved alone    | ["not-found"]               | fleet, board, config     | false        | false  | true          | the shell's failed state, naming `landing` |
      | LANDED — both moved                     | ["not-found"]               | + landing                | false        | true   | false         | the terminals home                        |
    # ROW 2 IS THE WHOLE REASON THIS SCENARIO EXISTS. Its three booleans are byte-identical
    # to row 1's: nothing is red, nothing is logged, the address bar says `/`, and the
    # operator sees a placeholder pointing at pages they are already on. A reviewer reading
    # `surfaceMountFor`'s own comment (entry.mjs:144-146 — *"there is nothing to mount and
    # nothing is wrong"*) is told the state is FINE. It is not: it is this story, unfinished.
    # ROW 3 is the SAFE partial failure and is worth having on the record — it is loud, it
    # names the surface, and it offers the retry. If a build must be caught mid-flight, this
    # is the direction to be caught in, which is an argument for editing `entry.mjs` FIRST.
    # ROW 4's `mounts: true` is the one cell in this table that does not exist today.

  # THE ROUTE TABLE SURVIVES VERBATIM. m45 promised the id would; ADR-001 keeps that half.
  # Conjoined with the mount fact deliberately — on its own this scenario would be green
  # against today's code and would assert nothing about this story.
  @executable
  Scenario: the table is untouched and the id survives — and the same id now mounts a surface
    When I read `ROUTES`, `routeFor` and the entry plan for the four canonical addresses
    Then `ROUTES` still holds `{ id: "landing", path: "/" }` and four addressable paths plus the shared not-found entry, in that order, still frozen
    And `routeFor("/")` still returns the `landing` entry, and `routeFor("/")` and `routeFor("//")` still answer as they did — the trailing-slash and double-slash rules are not renegotiated here
    And `entryPlanFor({ pathname: "/", search: "", hash: "" })` still yields `surface: "landing"` and asks for NO history rewrite
    And every legacy `?mode=` address still rewrites exactly once to the path it always did — `/?mode=fleet` → `/fleet`, `/?mode=board` → `/board`, `/?mode=assets` → `/config`, `/?mode=wat` → `/config` — and none of them resolves to `landing`
    And that SAME `landing` id now answers `mounts: true` through `surfaceMountFor` against the entry's own surface map
    # The last Then is the only line here that is red today. The rest are the regression
    # surface this story must not disturb, and they are stated because `acd-ui-single-route-table`
    # cannot see a behaviour change that keeps the table's shape.

  # THE CONTAINMENT — the argument ADR-001 rejects "keep `/` shell-rendered and swap the
  # component" on, driven rather than asserted.
  @executable
  Scenario: a home that throws while rendering takes down itself and nothing else
    Given the REAL shell mounted at routeId `landing` with a surface that throws on render
    When the shell renders
    Then the chrome survives: the top bar, the nav and the skip link are all still in the tree
    And exactly one `banner` and exactly one `<main>` remain
    And the content region holds the shell's surface-failed treatment, naming the surface and offering the retry
    And the nav item for `landing` still carries `aria-current="page"` — a surface that failed is not an unmatched address
    And the caught surface is the one keyed by route, so asking the same shell for a different route afterwards renders that route normally
    # RED TODAY, and for the sharpest possible reason: today the shell never looks at the
    # `surface` prop for this route at all — the `routeId === "landing"` arm at
    # Shell.tsx:345-346 short-circuits ahead of `<SurfaceBoundary>` at :360 — so a throwing
    # surface handed in at `landing` is never rendered, never caught, and the assertion that
    # the boundary produced the failed state cannot pass. Once the arm is gone, a throw is
    # contained; while the arm is there, a real home's throw would escape the boundary
    # entirely and blank the chrome (F-45-M-1's exact shape).

  # THE CONTENT MODE. One row of one map, and it is the difference between "the page
  # scrolls" and "the grid scrolls".
  @executable
  Scenario: `/` declares `content:fixed`, so the page never scrolls and the grid owns scroll
    When I read `contentModeFor` for every route id the shell knows
    Then `landing` is `content:fixed` with scrollOwner `descendants`
    And `board` is still `content:fixed`; `fleet`, `config` and `not-found` are still `content:page`
    And for `landing` the content region is NOT itself the scroll owner, and `minHeight` is 0
    And the shell root does not establish a scrollport for any `content:page` route — that rule is unchanged by this story
    And the mode is read from the ROUTE ID, so no pathname, origin or viewport width changes any of those answers
    And the shell is handed a surface it can render synchronously, so `contentStateFor({ routeId: "landing", surfaceLoaded: true })` is `populated` and the mounting placeholder is never the first paint of `/`
    # `landing` is `content:page` today (shell-layout.mjs:527), which is correct for a card
    # and wrong for a surface hosting terminals — m45/DESIGN already names *"the board, and
    # (m49) the terminals grid"* as the two `content:fixed` surfaces. The last Then is trap
    # 2: `STATE_MOUNTING`'s treatment is a `pulse-placeholder` (shell-layout.mjs:714-722,
    # rendered at Shell.tsx:596-597 as two `animate-pulse` skeletons with no reduced-motion
    # escape — story 06's subject), and `/` has never been able to reach it before.

  # THE DELETION, AS A BEHAVIOUR RATHER THAN AS A FILE COUNT. `Landing.tsx` is not "removed
  # from the build"; it is removed from the product.
  @executable
  Scenario: the placeholder is unreachable from every address, and the shell's own card states are down to one
    Given the REAL shell mounted in turn at `/`, `/fleet`, `/board`, `/config` and an unknown path
    When I read the rendered tree in each case
    Then no rendered tree anywhere contains the sentence `Live terminals will appear here.`
    And no rendered tree contains a `✦` mark inside the content region at `/`
    And the shell's shared centred card wrapper is now reached by the not-found state ALONE — the two states that shared it are one
    And at `/` the content region holds the home's own tree and nothing the shell drew itself
    And the shell's nav still offers every destination the placeholder used to link, so nothing the deleted file said is lost
    # DESIGN and ADR-001 both rest the deletion on that last clause: the destinations were
    # the shell's nav all along (Landing.tsx:41-65 renders `nav.items` minus its own id), so
    # the card restated the nav two rows below the nav.

  # THE BUDGET, MEASURED. Two of the six numbers are the story's own obligation and the
  # other four are the blast radius it must not touch.
  @executable
  Scenario Outline: the milestone's file-budget accounting, by the shipped gate's own arithmetic
    Given the line count of <file> measured as `source.split(/\r?\n/).length`, exactly as acd-ui-surface-file-budget:174-184 measures it
    When this story has landed
    Then the count is <obligation>
    And the count is still at or under its <ceiling>-line ceiling

    Examples:
      | file                            | measured at refine | ceiling | obligation                                            |
      | ui/src/app/Shell.tsx            | 931                | 940     | STRICTLY FEWER than 931 — the story removes a branch and an import |
      | ui/src/app/shell-layout.mjs     | 1016               | 1060    | EXACTLY 1016 unless a row's VALUE changed — zero vocabulary added |
      | ui/src/fleet/Fleet.tsx          | 1540               | 1560    | exactly 1540 — the card peek does not move             |
      | ui/src/terminal/TerminalControl.tsx | 819            | 840     | exactly 819 — untouched by this story                  |
      | ui/src/board/DetailPanel.tsx    | 1000               | 1000    | exactly 1000 — untouched, and it has ZERO headroom     |
      | ui/src/config/App.tsx           | 1298               | 1300    | exactly 1298 — untouched                               |
    # ROW 1 IS THE ONE THE STORY IS JUDGED ON and its premise needed correcting: ARCHITECTURE
    # §ADR-001's table and STORY.md both say `Shell.tsx` is 917 with 23 lines of headroom.
    # Measured in the working tree at this refine it is 931 with **9**. The obligation is
    # unchanged (net-negative), but the margin for absorbing "just one more line" of grid
    # logic is a third of what the documents promise — which is precisely the signal
    # ARCHITECTURE says to read as "the shell is absorbing what belongs in ui/src/home/".
    # ROW 2 IS TECH_DEBT ITEM 33'S NAMED PREDICTION FOR THIS MILESTONE. The home imports
    # `content:fixed`, the z rung and the chrome height; it appends no vocabulary here. The
    # obligation is stated as an exact count because "zero added" is not observable from a
    # ceiling — the ceiling has 44 lines of room and would stay green through the exact
    # failure the item predicts.
    # ROW 5 is on the table because a diff that spills ONE line into `DetailPanel.tsx`
    # fails CI, and a reviewer would look for the cause in this story's own files.

  # ─────────────────────────── the browser half ───────────────────────────
  # WHAT NO HEADLESS LANE CAN SEE. `test/support/mini-react.mjs` never assigns a node to a
  # ref, so nothing mounted through the harness ever builds a real DOM, and the built
  # Tailwind bundle is not in play there at all. These run against a DEPLOYED build.
  @manual
  Scenario: the deployed application serves the terminals home at `/`, and every address that ever worked still works
    Given a deployed build (`node scripts/install-local.mjs`) and the fleet daemon restarted by the operator
    And the fleet origin `http://127.0.0.1:4181` opened in a real browser
    When I visit `/` directly, with a cold cache and a hard reload
    Then the terminals home renders — not the placeholder card, and not a blank `<main>`
    And no frame of the load shows the placeholder's `Live terminals will appear here.`, not even briefly
    And the page itself does not scroll: the shell's chrome stays put and only the page's own content region can move
    And `/?mode=fleet`, `/?mode=board`, `/?mode=assets` and `/?mode=wat` each still land on the surface they always did, with `mode` stripped and every other parameter and the `#` fragment intact
    And the browser's back button walks the operator's own navigation, with no bounce between a legacy address and its canonical one
    And the console carries no error, no React warning about a missing surface, and no unhandled rejection
    # EVIDENCE RECORDED IN VERIFICATION.md (49) under the 49/04 section at `aof:verify 49`:
    # the build stamp (`~/.aof/bin/aof.exe --version` → `0.1.0 (payload <buildId>)`, and the
    # `Build: payload <buildId>` line both daemons print), the exact addresses visited, and
    # the console transcript. **Never start a daemon by hand from an agent shell** — the
    # desktop supervisor spawns both, and the operator restarts it (`aof mesh desktop run`).
