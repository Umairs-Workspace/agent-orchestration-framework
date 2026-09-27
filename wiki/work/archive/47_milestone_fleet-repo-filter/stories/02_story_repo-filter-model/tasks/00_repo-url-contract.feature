<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 47/02, ADR-003: THE URL CONTRACT. `?repo=<workspaceId>` is read
# and written by ONE pair of pure helpers in the ONE home. This task varies THE SEARCH
# STRING and nothing else — the payload never appears below. The narrowing that string
# then drives is task 01; what `scope` and `repo` MEAN together, and what the page says
# when they yield nothing, is task 02.
#
# WHY THE URL IS THE CONTRACT AND NOT AN IMPLEMENTATION DETAIL. SPEC requires the filter
# to be "a deep-link, shareable and refresh-surviving", which means the address is the
# product: it is pasted into chat windows, bookmarked, and reopened on a different
# machine six weeks later. ADR-003 pays for that with an OPAQUE value — `workspaceId`,
# not the mutable `name` (`api.ts:97` types it `string | null`) and not the machine-local
# `projectRoot` — and the whole of the legibility debt is repaid on screen by ADR-007's
# chip. A rule set that is written down but not exercised is how a URL quietly changes
# meaning between milestones; the tables below are that rule set, one row per case an
# operator actually produces.
#
# LITMUS: every Then is confirmable by an outsider without reading source. This module is
# PURE and has NO CLI surface, so the black-box channel is `node:test` importing
# `ui/src/fleet/scope.mjs` and asserting on RETURNED VALUES — no bundler, no DOM, no
# React harness (this repo has none at all, which is the whole reason this story exists
# as a story). That channel is the house pattern and it is already wired:
# `test/fleet-scope.test.mjs` drives `withScopeParam` / `scopeFromSearch` through exactly
# this shape, and `scope.mjs:1-6` states the rule in its own header ("render-logic
# node:test must exercise belongs in a plain .mjs helper the .tsx wires up"). Every Then
# below is "call this exported function with this input, read this returned value" —
# nothing else, and never a source read.
#
# THE TWO EXPORTS THIS TASK READS, spelled as ADR-001 §Decision (table rows 1 and 2),
# ADR-003 and `test/arch/acd-fleet-filter-single-home.test.mjs:57-59` spell them — that
# file's own comment says the spellings are "CANONICAL AND BINDING", and names the m45
# [Amigos-1] amendment as the reason (a build that satisfied its story brief and failed
# CI because the brief and the ADR spelled the exports differently):
#
#     repoFromSearch(search)      → string | null      — the filter, or null for NO filter
#     withRepoParam(search, repo) → string             — copy-and-set; the CLEAR form is
#                                                        the same function with a blank
#                                                        `repo` (see F-47-02-QA-1)
#
# All three documents agree on those two names and on `filterToWorkspace`, and this file
# uses them verbatim. Two contract points were settled by none of them; the first was
# raised as a finding and has since been RULED, the second is QA's pin:
#
#   F-47-02-QA-1 — THE CLEAR FORM HAD NO NAME, AND THE PIN STANDS (ruled). ADR-003 writes
#   "`withRepoParam(search, repo)` / the clear form" and never names it; the arch test
#   requires only that the two exports above exist, so a third export (`clearRepoParam`,
#   `withoutRepoParam`) would pass CI and give the URL WRITE two doors — the duplicated-
#   home shape ADR-001 exists to refuse, one function down. RULED: clearing is
#   `withRepoParam(search, null)`, there is NO THIRD EXPORT — one function, one door, and
#   a blank value (null, undefined, "" or whitespace-only) clears rather than writes.
#   Scenario 5 is that pin.
#
#   RETURNING `null` AND NEVER `""` IS LOAD-BEARING, not a style choice, and it is
#   pinned by scenario 2. Measured: `new URLSearchParams("?repo=").get("repo")` is `""`,
#   and `filterToWorkspace(status, "")` is NOT the no-op branch (`workspaceId == null` is
#   false for `""`) — it narrows every collection to zero. A build that handed the raw
#   `.get()` result on would turn `/fleet?repo=`, which ADR-003 rules is "treated as
#   ABSENT — no filter, no error", into a page whose every region is empty. The two
#   halves of that bug live in two different tasks, which is exactly why the boundary
#   value is pinned in both (this file's scenario 2, task 01's scenario 6).
#
# NOT ASSERTED HERE — five claims that are source reads or wiring, with their owners:
#   (a) the filter has ONE home, no sibling module exists under `ui/src/fleet/`, and the
#       module stays framework-free (no React, no `window`/`location`/`history`) —
#       `test/arch/acd-fleet-filter-single-home.test.mjs`, assertion 1.
#   (b) NO module in `ui/src` outside that one home names the `repo` query key — the
#       router and the shell nav included, which is what keeps the filter working through
#       m45's copy-and-delete builder "for free" — same file, assertion 2. `routes.mjs`
#       and `shell-nav.mjs` are NOT EDITED by this milestone (ADR-003), and m45's own
#       `acd-route-logic-framework-free` must stay green untouched.
#   (c) `scope.d.mts` declares the new names — same file, assertion 3.
#   (d) the filter never reaches the wire (`/api/mesh/status` keeps its one parameter,
#       the client mints no filter request, `src/` grows no home for it) —
#       `test/arch/acd-fleet-filter-read-only.test.mjs`, all three assertions, GREEN on
#       arrival.
#   (e) **THE WRITE IS `history.pushState`** (ADR-003, matching `onScopeChange` at
#       `Fleet.tsx:169-177`, and deliberately NOT m45/ADR-003's `replaceState`), and
#       "setting the filter to the value it already carries writes NOTHING". Both are
#       claims about `<Fleet>`'s wiring, and this module touches no `history` at all — it
#       returns a string. They belong to story 47/03. What THIS task owes that ruling is
#       the property that makes it cheap: scenario 6's fixpoint, which is why a re-write
#       of the current value produces a byte-identical address for the caller to skip.
#
# FEASIBILITY — checked at source 2026-08-10, at `d71d508`. `ui/src/fleet/scope.mjs`
# exists, is loadable by plain node today, and already ships the `withScopeParam` /
# `scopeFromSearch` pair these two mirror. NEITHER `repoFromSearch` NOR `withRepoParam`
# exists yet, so EVERY scenario below is RED on day one and that is correct — the house
# convention is that a feature written at refine is a contract, not a report on the
# present. EVERY expected value in EVERY table below was EXECUTED in plain node while
# authoring; nothing here is derived from reading a spec. Three measured quirks are
# load-bearing and are called out at their rows rather than glossed:
#   1. `URLSearchParams` RE-SERIALISES. `?debug` comes back as `debug=`, `%20` comes back
#      as `+`, and `owner/name` goes out as `owner%2Fname`. So "unmangled" cannot mean
#      byte-identical, and does not: it means every surviving key and value DECODES to
#      the same text, in the same ORDER, with the same COUNT. This is m45's FINDING
#      F-45-01-B one layer down, and it was measured here independently rather than
#      inherited.
#   2. `.get()` RETURNS THE FIRST occurrence and returns `""` for a present-but-empty
#      key — which is what makes ADR-003's two rules ("a repeat takes the first"; "blank
#      is absent") compose into scenario 3's fourth row.
#   3. A `delete()` that empties the query yields `""`, so the clear form must NOT wear
#      `withScopeParam`'s unconditional `` `?${…}` `` prefix (`scope.mjs:45`) or the
#      address bar grows a naked `?`. Same discipline `routes.mjs:105-108` already
#      spells one layer up.
# The lanes land in `test/fleet-scope.test.mjs`, which is already imported and registered
# by `scripts/test.mjs:1119` — no new runner wiring, no new test-support file.

@ui @work @distribution
Feature: `?repo=` reads and writes through one pair of pure helpers, and no other parameter is ever disturbed
  In order that a filtered fleet URL an operator pastes into a chat window means the same thing tomorrow, in someone else's browser, and after the next milestone edits the page around it
  the repo filter must be readable from a search string and writable back into one by two pure functions, with absent and blank meaning NO FILTER, a repeat taking the first, the round trip a fixpoint, and every other parameter — and the fragment — untouched

  Background:
    Given `ui/src/fleet/scope.mjs` imported directly by `node:test` under plain node — no bundler, no DOM, no React
    And every input below is a `location.search`-shaped string, which by construction excludes the fragment
    And no payload is in scope in this task — the filter's value is read from the URL before any `/api/mesh/status` response has landed, and these functions take no payload argument at all
    And a surviving parameter is read back with `URLSearchParams`, the way every consumer in this codebase reads one

  # Headline 1: a value the operator can actually produce comes back verbatim. The id is
  # OPAQUE — this function neither validates its shape nor normalises it, because there
  # is no shape to check (`workspaceIdFor` is a hash, and asserting its form here would
  # put a second copy of that rule in `ui/`). Whether the value names anything is decided
  # against the PAYLOAD, and that is task 01's question.
  @executable
  Scenario Outline: a `repo` value is read back verbatim — the id is opaque, never validated and never normalised
    When I call `repoFromSearch(<search>)`
    Then it returns exactly <repo>
    And calling `repoFromSearch(<search>)` a second time returns the same value — no memo, no hidden state, no dependence on call order

    Examples:
      | case                                                                    | search                                  | repo                 |
      | the id shape this repo actually publishes (`workspaceIdFor`, 16 hex)    | "?repo=9db1fd84f5895e38"                | "9db1fd84f5895e38"   |
      | the filter beside a live `?scope=` deep link                            | "?scope=local&repo=9db1fd84f5895e38"    | "9db1fd84f5895e38"   |
      | the filter BEFORE scope — position in the query is not meaning          | "?repo=alpha&scope=local"               | "alpha"              |
      | the filter between two parameters this module has never heard of        | "?group=fleet&repo=alpha&utm_source=x"  | "alpha"              |
      | a percent-encoded slash — a value is opaque text, never a path          | "?repo=owner%2Fname"                    | "owner/name"         |
      | a `+`, which IS a space in query text                                   | "?repo=a+b"                             | "a b"                |
      | a percent-encoded space                                                 | "?repo=a%20b"                           | "a b"                |
      | a non-ASCII value                                                       | "?repo=caf%C3%A9"                       | "café"               |
      | a value that looks like markup — carried as text, never interpreted     | "?repo=%3Cscript%3E"                    | "<script>"           |
      | MIXED CASE — an id is compared exactly, so it is never case-folded      | "?repo=AlPhA"                           | "AlPhA"              |
      | a search with no leading "?" — the tolerance `scopeFromSearch` ships    | "repo=alpha"                            | "alpha"              |
      | a leading "&" before the first key                                      | "?&repo=alpha"                          | "alpha"              |
    # THE MIXED-CASE ROW is not pedantry: `?repo=ALPHA` against a payload carrying
    # `alpha` must reach task 01's UNKNOWN state and say so, not silently resolve. A
    # helper that lower-cased "to be forgiving" would make a wrong link look like a
    # working one — the failure class ADR-003 rejected `name` to avoid.
    #
    # THE `<script>` ROW pins that this function is not a sanitiser and must not become
    # one. The value is text; what a surface does with it is that surface's contract
    # (DESIGN renders the raw value in `mono` inside the chip). A helper that stripped or
    # escaped here would put a second, invisible copy of an escaping rule in the one
    # module that is supposed to own nothing but the narrowing.

  # Headline 2: ABSENT and BLANK are the SAME ANSWER — no filter — and the answer is
  # `null`, never the empty string. ADR-003: "a blank value is an operator artifact (a
  # cleared control, a hand-edited URL); answering it with an error state on a page that
  # has data is worse than showing the data."
  @executable
  Scenario Outline: absent, blank and near-miss are NO FILTER — the answer is `null`, never `""`
    When I call `repoFromSearch(<search>)`
    Then it returns null
    And the value returned is null EXACTLY — not the empty string, not undefined, not a whitespace string
    And the call does not throw

    Examples:
      | case                                                                     | search                        |
      | no query string at all — the default, which must not change              | ""                            |
      | a null search, from a caller that read `location.search` too early       | null                          |
      | an undefined search                                                      | undefined                     |
      | a search naming only OTHER keys                                          | "?scope=local&group=alpha"    |
      | the key present with an EMPTY value — a cleared control                  | "?repo="                      |
      | the key present with NO `=` at all — a hand-edited URL                   | "?repo"                       |
      | a percent-encoded whitespace-only value                                  | "?repo=%20%20"                |
      | a `+`-only value, which decodes to a single space                        | "?repo=+"                     |
      | tab-and-space, which decodes to whitespace                               | "?repo=%09%20"                |
      | whitespace-only beside a real scope — the scope is untouched either way  | "?scope=local&repo=%20"       |
      | the key in the WRONG CASE — query keys are case-sensitive                | "?REPO=alpha"                 |
      | a near-miss key                                                          | "?repos=alpha"                |
      | a doubled question mark, which makes the key literally "?repo"           | "??repo=alpha"                |
    # THE `null`-NOT-`""` CLAUSE IS THE ONE THAT WOULD SHIP A BUG, and it is measured in
    # both halves: `new URLSearchParams("?repo=").get("repo")` is `""`, and
    # `filterToWorkspace(status, "")` narrows every collection to ZERO (its no-op branch
    # tests `workspaceId == null`, which `""` does not satisfy — run in node while
    # authoring). Returning the raw `.get()` result therefore turns "no filter" into "a
    # filter nothing matches": every region empty, on an address ADR-003 rules is the
    # default view. Task 01 scenario 6 pins the other half of the same boundary.
    #
    # THE WHITESPACE ROWS matter because the write side of this contract can produce
    # them: a control that wrote a trimmed-empty value would round-trip through here, and
    # scenario 5 makes the two sides read blankness by ONE rule rather than two.

  # Headline 3: a repeated key takes the FIRST — the rule `routes.mjs:133` already applies
  # to a repeated `mode`, so this app has ONE rule for repeated keys and not two.
  @executable
  Scenario Outline: a repeated `repo` takes the FIRST, and the blank-is-absent rule is applied to THAT value
    When I call `repoFromSearch(<search>)`
    Then it returns <repo>

    Examples:
      | case                                                                | search                        | repo    |
      | two values — the first wins                                         | "?repo=a&repo=b"              | "a"     |
      | three values                                                        | "?repo=a&repo=b&repo=c"       | "a"     |
      | the repeats separated by another key                                | "?repo=a&scope=local&repo=b"  | "a"     |
      | the SECOND is blank — the first still wins                          | "?repo=a&repo="               | "a"     |
      | the FIRST is blank — first still wins, so the answer is NO FILTER   | "?repo=&repo=b"               | null    |
      | the first is whitespace-only and the second is real — still none    | "?repo=%20&repo=b"            | null    |
    # ROWS 5 AND 6 ARE THE ROWS A PLAUSIBLE BUILD FAILS, and they are the reason this is
    # a table rather than one assertion. `getAll("repo").find(Boolean)` and
    # `getAll("repo").filter(v => v.trim())[0]` both answer "b" on row 5 and pass every
    # other row here. ADR-003's rule is "the FIRST wins", full stop — it is what
    # `URLSearchParams.get` returns (measured: `""`) — and the blank-is-absent rule of
    # scenario 2 is then applied to THAT value. TWO RULES, APPLIED IN THAT ORDER, never
    # one merged rule that quietly searches for the first usable value.
    #
    # QA PINS THE ORDER, because no document states it: ADR-003 lists both rules and does
    # not say they compose. The order chosen is the one that keeps `.get()` the single
    # mechanism, and it is the conservative one — a URL carrying `repo=&repo=b` is
    # ambiguous by construction and answering "no filter" shows the operator everything
    # rather than guessing which half of their address they meant.
    #
    # AN OPERATOR REALLY PRODUCES THIS: a control that appends instead of setting writes
    # exactly this shape, which is why scenario 4's fourth row pins that the WRITE side
    # collapses repeats rather than adding to them.

  # Headline 4: the write is COPY-AND-SET. Each control writes only its OWN key onto a
  # copy of the incoming search (ADR-003), which is m45/ADR-006's preserve-by-default
  # mechanism one layer down — and it is what makes ADR-005's composition work without
  # either control knowing the other exists.
  @executable
  Scenario Outline: writing the filter touches the `repo` key and nothing else
    When I call `withRepoParam(<search>, <repo>)`
    Then it returns exactly <result>
    And reading `repoFromSearch(<result>)` back yields <repo>
    And <result> names the key `repo` exactly once

    Examples:
      | case                                                              | search                            | repo           | result                              |
      | no query at all — the first filter an operator ever sets          | ""                                | "alpha"        | "?repo=alpha"                       |
      | a null search                                                     | null                              | "alpha"        | "?repo=alpha"                       |
      | beside a scope deep link — scope keeps its value AND its position | "?scope=local"                    | "alpha"        | "?scope=local&repo=alpha"           |
      | replacing an existing filter IN PLACE — the key does not move     | "?scope=local&group=x&repo=beta"  | "alpha"        | "?scope=local&group=x&repo=alpha"   |
      | a repeated `repo` COLLAPSES to one on write                       | "?repo=a&repo=b"                  | "alpha"        | "?repo=alpha"                       |
      | a repeated OTHER key survives — both copies, in order             | "?tag=a&tag=b"                    | "alpha"        | "?tag=a&tag=b&repo=alpha"           |
      | a parameter this codebase has never heard of                      | "?utm_source=slack"               | "alpha"        | "?utm_source=slack&repo=alpha"      |
      | a key with NO value at all                                        | "?debug"                          | "alpha"        | "?debug=&repo=alpha"                |
      | a percent-encoded space in ANOTHER parameter's value              | "?q=a%20b"                        | "alpha"        | "?q=a+b&repo=alpha"                 |
      | a value carrying a slash is encoded on the way out                | ""                                | "owner/name"   | "?repo=owner%2Fname"                |
      | a non-ASCII value                                                 | ""                                | "café"         | "?repo=caf%C3%A9"                   |
      | a value that looks like markup                                    | ""                                | "<script>"     | "?repo=%3Cscript%3E"                |
    # ROW 12 ADDED AT BUILD (PO, 2026-08-11, F-47-02-QA-F7). The four hostile spellings
    # this contract cares about — a 16-hex id, a slash, a non-ASCII value and something
    # that looks like markup — were all covered on the READ side and in the COPY, and the
    # markup one was the single gap on the WRITE side. It was working already (measured:
    # `?repo=%3Cscript%3E`, reads back `<script>`, fixpoint true) — but working and
    # unasserted is the state a later refactor breaks silently, which is the whole reason
    # the other three spellings are rows rather than trust.
    #
    # ROWS 8 AND 9 ARE WHERE "BYTE-IDENTICAL" DIES, and the expectations here are the
    # honest ones rather than the flattering ones — both were executed in node while
    # authoring. `?debug` becomes `debug=` and `%20` becomes `+`: the key survives, the
    # value decodes to the same text, the order and the count are unchanged, and the
    # serialised bytes differ by one character. Every consumer in this codebase reads a
    # query through `URLSearchParams` or a server-side parser, so all three of those
    # addresses are the same address. m45 recorded this same discovery for
    # `legacyRedirectFor` as FINDING F-45-01-B; it is repeated here because the two
    # functions are independent and a reader of ONE of them should meet it.
    #
    # ROW 4 (replace-in-place) IS WHAT DISTINGUISHES COPY-AND-SET FROM REBUILD. A build
    # that deleted and re-appended would answer `?scope=local&group=x&repo=alpha` for
    # this row too — but would move the key to the end for `?repo=beta&scope=local`, so
    # the address an operator watches would reshuffle every time they changed the filter.
    # Row 4's key stays in position 3 because `URLSearchParams.set` on an existing key
    # replaces in place (measured).
    #
    # ROW 5 IS THE WRITE-SIDE ANSWER TO SCENARIO 3's ambiguity: whatever a repeated key
    # meant on the way in, the address the control writes carries exactly one.

  # Headline 5: CLEARING DELETES THE KEY. ADR-003: "Clearing DELETES the key rather than
  # setting it empty, so the address bar never carries a naked `?repo=`" — and the
  # emptied query is the EMPTY STRING, never a bare "?".
  @executable
  Scenario Outline: clearing the filter deletes the key, and an emptied query is the EMPTY STRING — never a bare "?"
    When I call `withRepoParam(<search>, <cleared>)`
    Then it returns exactly <result>
    And <result> contains no occurrence of the text "repo"
    And `repoFromSearch(<result>)` returns null

    Examples:
      | case                                                                | search                      | cleared     | result           |
      | the filter was the only parameter — the address loses its query     | "?repo=alpha"               | null        | ""               |
      | cleared with the empty string, which is what a cleared control has  | "?repo=alpha"               | ""          | ""               |
      | cleared with undefined                                              | "?repo=alpha"               | undefined   | ""               |
      | a whitespace-only value CLEARS rather than writing blanks           | "?repo=alpha"               | "   "       | ""               |
      | scope survives the clear — neither control clears the other         | "?scope=local&repo=alpha"   | null        | "?scope=local"   |
      | EVERY repeated copy goes, not just the first                        | "?repo=a&repo=b"            | null        | ""               |
      | clearing a filter that was never set is a no-op                     | "?scope=local"              | null        | "?scope=local"   |
      | clearing an already-empty search                                    | ""                          | null        | ""               |
    # THE BARE "?" IS THE POINT OF ROWS 1, 2, 3, 4, 6 AND 8. `withScopeParam` returns
    # `` `?${params.toString()}` `` unconditionally (`scope.mjs:45`) and can never be
    # empty, because it always SETS; the clear form can, and a naked `?` is a second
    # spelling of the same address — exactly the drift `routes.mjs:105-108`'s
    # `toSearchString` exists to remove one layer up ("an emptied query is the EMPTY
    # string and never a bare `?`"). Measured: deleting the only key leaves `""`.
    #
    # ROW 4 MAKES BLANKNESS ONE RULE, NOT TWO. The read side treats a whitespace-only
    # value as absent (scenario 2); the write side must not be able to create one, or the
    # two sides of a single contract would disagree about the same address — and the
    # disagreement would only show up as a filter that reads as "off" while the address
    # says it is on.
    #
    # ROW 5 IS ADR-005's "neither control clears the other" made checkable at the level
    # where it is actually guaranteed (the mechanism), rather than at the level where it
    # is usually claimed (the intent).

  # Headline 6: the round trip is a FIXPOINT. This is the property ADR-003's interaction
  # rule leans on — "setting the filter to the value it already carries writes NOTHING"
  # — and it is the property that makes the `pushState` in story 47/03 cheap to get
  # right: a caller can compare the answer to the address it already has.
  @executable
  Scenario Outline: the round trip is idempotent — reading back what was written, and writing the same value twice
    When I call `withRepoParam(<search>, <repo>)` and then `withRepoParam` again on that answer with the same <repo>
    Then the second answer is BYTE-IDENTICAL to the first — a fixpoint, so re-selecting the repo already in force produces the identical address and there is nothing for a history entry to record
    And `repoFromSearch` of that answer returns exactly <repo>
    And applying the clear form to that answer yields a search that reads back with exactly the parameters `withRepoParam(<search>, null)` yields, in the same order — set-then-clear leaves no residue

    Examples:
      | case                                              | search                     | repo               |
      | the first filter, from a bare address             | ""                         | "alpha"            |
      | a filter set beside an existing scope             | "?scope=local"             | "9db1fd84f5895e38" |
      | a filter REPLACING an existing one                | "?repo=beta"               | "alpha"            |
      | a filter beside parameters nothing here knows     | "?tag=a&tag=b&debug"       | "alpha"            |
      | a value that must be percent-encoded              | "?scope=global"            | "owner/name"       |
      | a non-ASCII value                                 | ""                         | "café"             |
    # IDEMPOTENCE IS ASSERTED AT TWO LEVELS ON PURPOSE. At the VALUE level (`read(write(v))
    # === v`) it says the two helpers agree about encoding — the property rows 5 and 6
    # actually exercise, since both values change shape in transit. At the STRING level
    # (`write(write(s, v), v) === write(s, v)`) it says the writer is stable, which is
    # what a caller comparing against `location.search` needs before it decides whether
    # to push a history entry at all.

  # Headline 7: the two narrowings' URL keys are independent, in BOTH directions. ADR-005
  # states the outcome ("neither control clears the other") and ADR-003 states the
  # mechanism (each writes only its own key onto a copy). This is where it is measured,
  # and it is also the proof that `withScopeParam` needed no edit to make it true.
  @executable
  Scenario Outline: writing one narrowing never disturbs the other, in either direction
    When I call <call>
    Then `scopeFromSearch` of the answer returns <scope>
    And `repoFromSearch` of the answer returns <repo>

    Examples:
      | case                                                          | call                                                | scope    | repo      |
      | setting a repo onto a scoped address                          | `withRepoParam("?scope=local", "alpha")`            | "local"  | "alpha"   |
      | setting a scope onto a filtered address — `withScopeParam` is UNCHANGED by this story | `withScopeParam("?repo=alpha", "local")` | "local"  | "alpha"   |
      | switching the scope while a filter stands                     | `withScopeParam("?scope=global&repo=alpha", "local")` | "local" | "alpha"   |
      | switching the filter while a scope stands                     | `withRepoParam("?scope=local&repo=alpha", "beta")`  | "local"  | "beta"    |
      | clearing the filter — the scope the operator chose survives    | `withRepoParam("?scope=local&repo=alpha", null)`    | "local"  | null      |
      | a filter on an address with no scope at all — scope defaults, it is not invented | `withRepoParam("?repo=alpha", "beta")` | "global" | "beta"    |
    # THE LAST ROW pins that reading an ABSENT scope still yields the documented default
    # ("global", `scope.mjs:53`) rather than the filter's presence changing what a missing
    # scope means. A `--local`-started server narrows with no `?scope=` in the URL at all
    # (`mesh-ui-serve.mjs:556`), so "no scope key" is a real, shipped address and the
    # repo filter must not give it a new meaning. What that composed state MEANS is
    # ADR-005 and task 02; that neither key eats the other is this task's.

  # Headline 8: the fragment. It is not this function's input, and it cannot be disturbed
  # by it — which is a claim worth making on THIS surface, because the fleet's own board
  # drill-in depends on a fragment surviving (`/api/mesh/board-url` answers `…#<ref>` and
  # `Board.tsx:585` reads it back to select the item).
  @executable
  Scenario: the fragment is not this contract's input, and the address the operator is left on keeps it
    Given the deep link `http://127.0.0.1:4181/fleet?scope=local&repo=alpha#42/03`
    When that address is split the way a browser splits it
    Then its pathname is "/fleet", its search is "?scope=local&repo=alpha" and its hash is "#42/03" — a `location.search` EXCLUDES the fragment, measured
    And `repoFromSearch` of that search returns "alpha", and `scopeFromSearch` of it returns "local"
    When the search ALONE is handed to `withRepoParam(search, "beta")`
    Then the answer is exactly "?scope=local&repo=beta"
    And the answer contains no "#" — this module returns a SEARCH string and never an address, so there is nothing here that could drop, reorder or re-encode a fragment
    And re-assembling the untouched pathname, the new search and the untouched hash yields `http://127.0.0.1:4181/fleet?scope=local&repo=beta#42/03`
    And a story ref's slash survives that re-assembly — the fragment is "#42/03" and never becomes part of the path
    # THE CONTRACT'S INPUT IS `location.search`, and that is what makes this free rather
    # than careful. A caller that handed the WHOLE address in instead would find the
    # fragment glued to the value (measured: `new URLSearchParams("?repo=a#18")
    # .get("repo")` is "a#18") — which is a caller bug, not a rule this module should
    # grow. A build that "helpfully" truncated a value at "#" would be inventing a rule
    # no document states, and would silently corrupt a legitimate value containing one.

  # Totality. `location.search` is always a string in a browser, so every row here is a
  # caller mistake or a hostile input — and the answer to all of them is the shapeless-
  # input discipline this module already ships ("an invalid scope param falls back to
  # global, never throws", `test/fleet-scope.test.mjs`).
  @executable
  Scenario Outline: a shapeless or hostile input answers rather than throws
    When I call `repoFromSearch(<search>)`
    Then the call does not throw
    And it returns either a string or null — never undefined, never an object, never NaN

    Examples:
      | case                                                       | search                |
      | a value that is not a string at all                        | 42                    |
      | an object                                                  | {}                    |
      | an array                                                   | []                    |
      | a malformed percent escape                                 | "?repo=%zz"           |
      | a truncated multi-byte percent escape                      | "?repo=%E0%A4%A"      |
      | an `=` inside the value                                    | "?repo=a=b"           |
      | a value 4,000 characters long                              | "?repo=<4000 chars>"  |
      | a search that is only separators                           | "?&&&"                |
      | a search that is only the question mark                    | "?"                   |
    # A THROW HERE IS A BLANK PAGE. This function is called on the render path before any
    # payload has landed, so an exception is not a caught error state — it is the fleet
    # failing to mount at all, on an address the operator can neither read nor recover
    # from. Rows 4 and 5 are the ones a hand-rolled `decodeURIComponent` fails: it throws
    # `URIError` on both, where `URLSearchParams` answers "%zz" and a replacement
    # character (both measured). Rows 1–3 are what a caller reading a location-shaped
    # record from somewhere unexpected actually hands in.
