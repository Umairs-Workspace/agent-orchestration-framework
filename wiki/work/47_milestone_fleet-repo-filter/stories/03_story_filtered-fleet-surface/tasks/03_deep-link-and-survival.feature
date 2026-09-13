<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 47/03, ADR-003 + ADR-005: the filter is a SHAREABLE ADDRESS. It is
# in force on first paint, it survives a refresh, the ⟳ control, the background poll and a
# retry after an error, it is carried by the `/fleet` nav item and by nothing else, and it
# COMPOSES with `?scope=` by intersection rather than replacing it.
#
# WHAT THIS TASK IS ABOUT THAT 47/02 IS NOT. Story 47/02 owns the URL contract as
# FUNCTIONS — `repoFromSearch`, `withRepoParam`, their idempotence, their preservation of
# every other parameter and the fragment — driven headlessly by `node:test` on
# `scope.mjs`, with no page in sight. This task owns the same contract as an ADDRESS an
# operator can paste: what the PAGE renders when opened at a given address, and what the
# ADDRESS holds after the page has been used. Every scenario below is stated in those two
# terms and none of them calls a helper.
#
# THE ONE RULE THAT IS INHERITED AND MUST NOT BE RE-DECIDED HERE (ADR-003, and it is
# pinned): **`ui/src/app/routes.mjs` and `ui/src/app/shell-nav.mjs` are NOT edited by this
# milestone.** m45/ADR-006's copy-and-delete builder carries an unrecognised parameter
# through for free, and `shell-nav.mjs:161-169`'s href rule is POSITIONAL — the CURRENT
# route's item carries the current search and fragment byte-identically and every other
# item is its bare path — with its own comment stating that a rule which forwarded fleet
# parameters onto the board "would require the shell to know which parameters belong to
# which surface, which is exactly what keeps milestone 47's repo filter local to the
# fleet." So the filter travels through the shell BECAUSE THE SHELL DOES NOT KNOW ITS
# NAME, and scenario 4 asserts the consequence rather than the mechanism.
#
# AND THE HONEST LIMIT OF "SURVIVES A NAVIGATION AWAY AND BACK", stated here rather than
# discovered at review. Under that positional rule, leaving `/fleet?repo=X` for `/board`
# and returning via the nav lands on a BARE `/fleet` — the filter is not carried across a
# surface, exactly as `?scope=` is not carried today. What DOES survive is (a) the
# current-route item carrying the address byte-identically, so "you are here" is a no-op
# and copying the link yields the address you are on, and (b) the browser's Back, because
# ADR-003 makes a filter change a `pushState`: *"a filter change is a NAVIGATION the
# operator performed, and Back should undo it."* Scenario 4 asserts the first and scenario
# 6 the second, and the nav round-trip's honest outcome is written into scenario 4 as a
# Then so nobody logs it later as a defect.
#
# LITMUS: every Then is confirmable by an outsider without reading source, through two
# observations and nothing else — **what the page renders when opened at an address**, and
# **what address the page holds after an interaction**. The channel is the headless mount
# harness (`withFleetApp` for the page, `withShellComposedFleet` for anything involving the
# shell's nav) plus the harness's own request log, which records every request the app
# actually put on the wire.
#
# NOT ASSERTED HERE:
#   (a) `repoFromSearch` / `withRepoParam` as functions, their round-trip idempotence and
#       their preservation of unknown parameters — story **47/02**.
#   (b) "the route module names no query key but `mode`" — already asserted verbatim, with
#       its own non-vacuity check, by `acd-route-logic-framework-free.test.mjs:182-196`.
#       ADR-003 explicitly declines to write a second file for it; a scenario re-asserting
#       it would be the same duplication one layer up. What IS new — that the filter grows
#       no second home in the router or the shell — is `acd-fleet-filter-single-home`'s
#       sweep.
#   (c) "no request carries a repo parameter" — `acd-fleet-filter-read-only` owns it
#       statically and task **01** scenario 3 owns its behavioural half (the request
#       count). Scenario 3 below re-reads the request log only for what the requests DO
#       carry, which is a different claim.
#   (d) which rows survive the narrowing — task **00**.
#
# FEASIBILITY — checked at source 2026-08-10, at `d71d508`. Five notes, one of them a hard
# build prerequisite without which scenario 5 is not `@executable` at all:
#   1. **BUILD PREREQUISITE — the harness records no address writes.**
#      `react-app-harness.mjs:312` installs `globalThis.history = { pushState() {} }`: a
#      NO-OP with no log, and `globalThis.location.search` is never updated by it. So "the
#      page wrote the address once", "it wrote nothing when the value was unchanged" and
#      "it deleted the key rather than leaving a bare `?repo=`" are currently
#      UNOBSERVABLE. The fix is small and belongs in the shared core beside the request
#      log it mirrors: record `(state, title, url)` per call, expose it on the driver, and
#      reflect the written address back onto the stub `location` so a subsequent read sees
#      what an operator's address bar would. `Fleet.tsx:169-177` calls the BARE global
#      (`history.pushState`), so a lane cannot inject a fake the way
#      `test/shell-entry-plan.test.mjs:42-47` does for the pure entry planner — that one
#      takes its history as an argument, and this one does not. **Without this addition
#      scenario 5 degrades to `@manual`, and that would be a real loss: the "writes
#      nothing when unchanged" clause is exactly the kind of thing a human check skips.**
#   2. A REFRESH IS A FRESH MOUNT AT THE SAME ADDRESS, which the harness models exactly —
#      every lane below that says "reload" mounts again with the same `search`. That is
#      the honest model: the app re-reads its filter from the URL at construction
#      (`Fleet.tsx:113`'s `useState(() => scopeFromSearch(safeSearch()))` is the shape the
#      repo filter will mirror), and nothing else survives a reload.
#   3. THE POLL AND THE CLOCK ARE CONTROLLABLE. `driver.advance(POLL_MS)` fires the real
#      interval and re-renders between callbacks; `POLL_MS` is `5000`
#      (`ui/src/fleet/assign-affordance.mjs:45`) and is imported, never retyped, so a
#      cadence change moves the lane with it.
#   4. `?scope=local` ON A GLOBALLY-STARTED FIXTURE IS A REAL SERVER NARROWING, not a
#      client one: `src/mesh-ui-serve.mjs:556-557` resolves it to
#      `workspaceIdForProjectRoot(resolvedProjectDir)`, i.e. the DAEMON's own workspace. So
#      the intersection cases in scenario 2 are genuinely composed — the server narrows,
#      then the client narrows — and are not two client filters wearing different names.
#   5. THE NODE ROSTER MOVES BETWEEN ROWS 2 AND 3 OF SCENARIO 2 AND THAT IS CORRECT, NOT A
#      BUG: under `?scope=local` alone the roster stays MACHINE-WIDE by deliberate design
#      (`src/global-node-registry.mjs:170-172`), while a repo filter narrows it by
#      MEMBERSHIP (ADR-004 rule 2). A reviewer meeting a shrinking roster when a repo is
#      added to a `scope=local` address is meeting two correct rules composing, and both
#      are pinned by tests that name each other.
#
# ISOLATION: these suites export a test ARRAY, so `node --test test/<file>` runs ZERO tests
# and reports success (m47 retro). Drive them through a focused runner that IMPORTS the
# array, under `AOF_GLOBAL_HOME=$(mktemp -d)`. NEVER the full suite on this machine; every
# fixture server binds port 0 and nothing here touches `:4181` or `:4182`.

@ui @work @round-trip
Feature: the filter is an address — in force on first paint, unchanged by a refresh, a poll or a retry, carried by the fleet's own nav item, and composed with `?scope=` rather than replacing it
  In order that an operator can bookmark the view they work in, paste it to a colleague on another machine, and come back to it tomorrow without setting it up again
  a `?repo=` address renders its narrowed view before anything is clicked, survives every re-read the page performs, writes itself into the address bar exactly once when the operator changes it, and intersects with `?scope=` so that neither narrowing silently disables the other

  Background:
    Given a REAL fleet face serving a REAL global projection with several published workspaces, one of them the daemon's own
    And the REAL `<Fleet/>` mounted headlessly, opened at whichever address the scenario names

  # HEADLINE 1 — the deep link works before anything is clicked. Every row here is an
  # address an operator will actually produce: pasted, hand-edited, half-edited, or built
  # by a control that has been used twice.
  @executable
  Scenario Outline: a deep-linked address is in force on the first paint
    Given the fleet is opened at <address>
    When the page settles
    Then the page renders <what renders>
    And the picker's label reads <trigger reads>
    And the banner <banner>
    And the address is unchanged from the one that was opened — the page has rewritten nothing

    Examples:
      | case                                | address                                       | what renders                                    | trigger reads             | banner                       |
      | the ordinary shared link            | `/fleet?repo=<a known workspace>`             | only that workspace's facts                     | that workspace's name     | names the repo               |
      | both narrowings, pasted together    | `/fleet?scope=local&repo=<the daemon's own>`  | only the daemon's workspace's facts             | that workspace's name     | names scope THEN repo        |
      | no filter at all                    | `/fleet`                                      | the whole mesh, byte-identical to today's page  | `All repos`               | is absent and zero-height    |
      | a cleared control's leftovers       | `/fleet?repo=`                                | the whole mesh — a blank value is no filter     | `All repos`               | is absent and zero-height    |
      | a hand-edit that left whitespace    | `/fleet?repo=%20`                             | the whole mesh — whitespace is no filter        | `All repos`               | is absent and zero-height    |
      | a doubled parameter                 | `/fleet?repo=<workspace A>&repo=<workspace B>`| only workspace A's facts — the FIRST wins       | workspace A's name        | names workspace A            |
      | a value nothing carries             | `/fleet?repo=<a value nothing carries>`       | the unknown-filter empty state                  | the raw value             | names the raw value          |
      | the filter beside a stranger        | `/fleet?repo=<a known workspace>&sort=name`   | only that workspace's facts                     | that workspace's name     | names the repo               |
    # ROWS 4 AND 5 ARE OPERATOR ARTIFACTS, NOT ERRORS — a cleared control, a half-finished
    # hand-edit. ADR-003: "answering a blank value with an error state on a page that has data
    # is worse than showing the data."
    #
    # ROW 6 IS ONE RULE FOR REPEATED KEYS ACROSS THE WHOLE APP, not a new one: it is what
    # `URLSearchParams.get` returns and what `routes.mjs:133` already does for a repeated
    # `mode`.
    #
    # ROW 8 IS THE PRESERVATION CLAIM SEEN FROM THE PAGE. `sort=name` is a parameter this
    # codebase has never heard of; it must still be in the address afterwards, because
    # copy-and-set is what makes ADR-005's composition work without either control knowing the
    # other exists. The FUNCTION-level version of this claim is 47/02's.

  # HEADLINE 2 — ADR-005's composition rule, all four cells. "They INTERSECT. Neither
  # overrides the other, and there is no precedence rule to remember."
  @executable
  Scenario Outline: `scope` and `repo` intersect — neither overrides the other, and an empty intersection is a correct answer that says so
    Given the fleet is opened at <address>
    When the page settles
    Then the page renders <what renders>
    And both narrowings remain in the address and both remain stated on screen — neither has been dropped, disabled or dimmed because the other is set
    And the scope control still shows both of its options, with the active one marked, exactly as it does with no filter set

    Examples:
      | case                                          | address                                        | what renders                                                                              |
      | the ordinary case the filter exists for       | `/fleet?scope=global&repo=<a peer workspace>`  | only that workspace's facts, out of the whole mesh                                          |
      | a no-op intersection                          | `/fleet?scope=local&repo=<the daemon's own>`   | exactly what `/fleet?scope=local` renders, except that the node roster is narrowed by membership |
      | the contradiction, and it is CORRECT          | `/fleet?scope=local&repo=<a different repo the roster names no member of>`   | the composed empty state, naming BOTH narrowings                                            |
      | the contradiction that is only PARTIAL        | `/fleet?scope=local&repo=<a different repo a member machine survives for>`   | a POPULATED page carrying that machine, plus the partial-intersection notice — never the composed empty state (ADR-010 clause 4) |
      | a `--local` server with no `scope` in the URL | `/fleet?repo=<a different repo>` on a server started local | the same two answers as above, by the same rule — it does not need to know how the first narrowing was asked for |
    # ROW 2's SECOND CLAUSE IS FEASIBILITY 5 MADE VISIBLE and it is the row a reviewer is most
    # likely to misread: `scope=local` deliberately keeps the node roster machine-wide, and a
    # repo filter deliberately narrows it by membership, so adding `repo=<the daemon's own>` to
    # a `scope=local` address SHRINKS the roster. Two correct rules composing, both pinned,
    # neither to be "fixed" to match the other.
    #
    # ROW 3 IS THE PATHOLOGICAL CASE AND IT IS A VISIBLE EMPTY STATE RATHER THAN A SILENT ONE.
    # "A URL in which one parameter quietly disables another cannot be read by the person who
    # pasted it."

  # SURVIVAL. Four different re-reads, one filter, no exceptions — and each re-read is the
  # app's OWN traffic, counted off the request log rather than inferred.
  @executable
  Scenario Outline: the filter survives every re-read the page performs
    Given the fleet is open at `/fleet?scope=local&repo=<a known workspace>` and settled
    When <the re-read>
    Then the page is still narrowed to that repo, and to that scope
    And the banner and the picker still name it
    And the request the app made carries `?scope=local` and no repo or workspace parameter
    And the page did not flip into its loading state and the populated body was never unmounted

    Examples:
      | case                        | the re-read                                                        |
      | the background poll         | the poll interval elapses                                          |
      | the manual refresh          | the ⟳ control is clicked                                           |
      | a retry after a failure     | the face refuses once, the operator clicks `⟳ Retry Local`, and the face answers |
      | a full refresh of the page  | the page is reloaded at the same address                           |
    # ROW 3 IS THE ONE MOST LIKELY TO BE MISSED IN A BUILD, and DESIGN names it: "Retry must
    # re-attempt WITH the filter in force — never silently clearing it, exactly as Retry never
    # silently reverts the scope." A Retry that dropped the filter would look like a fix.
    #
    # ROWS 3 AND 4 ARE BOTH EXPECTED TO BE VACUOUS IN THE LAST THEN — corrected at build
    # (PO, 2026-08-11, F-47-03-QA-7). This note originally said row 4 was "the ONLY row",
    # and that was wrong: a Retry from a FIRST-LOAD error necessarily passes through the
    # loading state too, so "the page did not flip into its loading state and the populated
    # body was never unmounted" cannot hold for row 3 either — there is no populated body to
    # preserve. The build had it right and skipped the clause for both; the note is what was
    # stale. Rows 1 and 2 are where the clause bites, and they are the ones that matter: a
    # poll or a ⟳ that unmounted the populated body is the keep-last-good idiom broken.

  # THE NAV, and the honest limit of "away and back". Asserted through the hrefs the shell
  # actually renders, which is the only thing an outsider can see without a browser.
  @executable
  Scenario: the fleet's own nav item carries the filter and every other item is its bare path
    Given the REAL `<Fleet/>` inside the REAL `<Shell/>`, opened at `/fleet?scope=local&repo=<a known workspace>`
    When the shell's nav is read
    Then the Fleet item's address is `/fleet` carrying that exact search, byte for byte — clicking "you are here" is a no-op and copying its address yields the address you are on
    And every other nav item's address is its bare path, carrying no `repo` and no `scope`
    And the filter therefore never leaks onto another surface, where it would be inert
    And the nav's items, their order and their widths are identical to the same shell rendered at `/fleet` with no filter — a filter never moves the chrome
    And returning to the fleet from another surface via the nav lands on an UNFILTERED fleet, which is exactly what `?scope=` does today, and is a property of the shell not knowing either parameter's name
    # THE LAST THEN IS THE HONEST LIMIT AND IT IS WRITTEN AS A THEN SO IT IS NOT LOGGED LATER
    # AS A DEFECT. Carrying the filter across a surface would require the shell to know which
    # parameters belong to which surface — the one thing m45/ADR-006 and ADR-003 both forbid,
    # and the reason `routes.mjs` and `shell-nav.mjs` are not edited by this milestone. The
    # operator's route back to a filtered view is Back, a bookmark or the picker; if that
    # proves insufficient in soak it is a design gap with a named cost, never a special case
    # in the nav.

  # THE WRITE. One entry per change the operator made, no entry for a change they did not,
  # and a cleared filter leaves no residue in the address bar.
  @executable
  Scenario Outline: picking and clearing write the address exactly once, and writing the value it already holds writes nothing
    Given the fleet is open at <starting address> and settled
    When <the interaction>
    Then the page has written the address <writes> time(s)
    And the address it now holds is <resulting address>
    And each write it made was a pushed history entry, never a replacement — a filter change is a navigation the operator performed
    And every parameter the starting address carried that the interaction did not concern is still there, unchanged

    Examples:
      | case                              | starting address                            | the interaction                        | writes | resulting address                          |
      | the first pick                    | `/fleet`                                    | a repo is picked                       | 1      | `/fleet?repo=<the picked workspace>`        |
      | picking a second repo             | `/fleet?repo=<workspace A>`                 | workspace B is picked                  | 1      | `/fleet?repo=<workspace B>`                 |
      | picking the repo already in force | `/fleet?repo=<workspace A>`                 | workspace A is picked again            | 0      | `/fleet?repo=<workspace A>`, untouched      |
      | clearing from the chip            | `/fleet?repo=<workspace A>`                 | the chip's inline clear is used        | 1      | `/fleet` — the key is DELETED, not emptied  |
      | clearing from the menu            | `/fleet?repo=<workspace A>`                 | the `All repos` row is chosen          | 1      | `/fleet` — the key is DELETED, not emptied  |
      | clearing when nothing is set      | `/fleet`                                    | the `All repos` row is chosen          | 0      | `/fleet`, untouched                         |
      | picking beside another narrowing  | `/fleet?scope=local`                        | a repo is picked                       | 1      | `/fleet?scope=local&repo=<the picked one>`  |
      | switching scope while filtered    | `/fleet?repo=<workspace A>`                 | the scope control is switched to Local | 1      | `/fleet?scope=local&repo=<workspace A>` — neither control drops the other |
    # ROWS 3 AND 6 ARE IDEMPOTENCE AT THE INTERACTION LEVEL, not just at the function level:
    # a history entry per redundant click makes Back a stutter the operator has to press
    # through, and it is the kind of defect only a count can see.
    #
    # ROWS 4 AND 5 PIN "DELETED, NOT EMPTIED": the address bar must never carry a naked
    # `?repo=`, which is the same discipline `routes.mjs:105-108` already applies one layer up
    # ("an emptied query is the EMPTY string and never a bare `?`").
    #
    # ROW 8 IS ADR-005's copy-and-set from the OTHER control's side, and it is the cheapest
    # possible regression to ship: each writer touches only its own key, on a copy, so writing
    # one can never drop the other.
    #
    # **THIS SCENARIO IS `@executable` ON THE STRENGTH OF FEASIBILITY 1'S HARNESS ADDITION.**
    # Without an address-write log it is not observable at all, and it must NOT be quietly
    # weakened into "the page still shows the right thing" — that is a different claim and
    # three of these eight rows would pass without the address ever being written.

  # THE TWO CHECKS A HEADLESS TREE CANNOT MAKE, kept honest as a human lane rather than
  # dropped. Neither needs a design judgement, so neither is `@uat`.
  @manual
  Scenario: in a real browser the filter is a real navigation, and a shared link opens the same view somewhere else
    Given a real browser at `http://127.0.0.1:4181/fleet`
    When a repo is picked, then a second repo, then the filter is cleared
    Then the browser's Back button walks back through exactly those three states, in order, and the page re-narrows at each step without a reload
    And Forward walks them again
    And no step of that walk produces a state the operator never asked for
    When the filtered address is copied and opened in a second browser profile, and again on a second machine pointed at the same fleet
    Then both render the same narrowed view, with the same repo named in the banner and the picker
    And a link built on a workspace that has since been RENAMED still resolves to the same workspace — the address carries the stable id, not the mutable name
    # THE LAST CLAUSE IS ADR-003's WHOLE ARGUMENT, and it is the one failure that is silent:
    # a link built on a name simply stops matching after a rename and the view goes empty with
    # nothing on screen to explain it. It is a human lane because renaming a workspace and
    # re-publishing is a two-machine, two-session errand rather than a fixture.
    #
    # THIS SCENARIO MIGRATES DOWN. Back/Forward becomes `@executable` the day the harness
    # models a history STACK (it models neither `popstate` nor a stack today, only the write —
    # see FEASIBILITY 1); the rename case becomes `@executable` the day a fixture can
    # re-publish a workspace under a new name. A shrinking `@uat`/`@manual` set is the point.
