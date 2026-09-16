<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/01, the RULE: one repo is said ONCE and the line says HOW MANY.
# The rule is DESIGN's (§The `(session)` line — the dedupe rule, RULED) and is already ruled;
# this file enumerates the cases and pins the observable line.
#
# THE SEAM, read at source 2026-08-13 in this working tree.
#   - `fleetCurrentWorkLines(presence)` — `ui/src/fleet/runs.mjs:78`. The repo pipeline is
#     `:99-103` (filter `workspaceHasRun !== true` at `:100`, map to `repo` at `:101`, drop
#     non-strings/empties at `:102`, the plain codepoint sort at `:103`) and the join at
#     `:105`. It is a ZERO-IMPORT leaf: no React, no DOM, no I/O, no clock.
#   - The HOLD this task lifts is written into that file at `:32-37` — m48/ADR-010 R4,
#     "the repo list still does NOT deduplicate … whether it should is milestone 49's
#     DESIGN question".
#   - The line the WEB fleet actually renders comes through `nodeCurrentWork(node)`
#     (`ui/src/fleet/scope.mjs:582-584`), a pass-through to the same function, called at
#     `ui/src/fleet/Fleet.tsx:1420` and painted at `:1443-1450`. There is no second JS
#     formatter (measured: `fleetCurrentWorkLines` has exactly one implementation).
#   - The SECOND implementation is Rust: `session_repos()`
#     (`app/desktop/crates/core/src/status.rs:119-128`, `repos.sort(); repos` at `:126-127`)
#     read by `current_work(node)` (`app/desktop/crates/core/src/view_model.rs:200-210`) and
#     rendered by `CurrentWork::display()` (`view_model.rs:82` —
#     `format!("working \u{b7} {} (session)", repos.join(", "))`).
#   - The guard m48 wrote to force this decision is `test/mesh-fleet-session-subsumption-render.test.mjs`
#     — row 6 at `:115-127` (today's pinned `working · demo, demo (session)`) and the
#     RULE-FORM assertion at `:143-148` (`split(", ").length === sessions.length`), written
#     that way "so a future dedupe cannot slip past by rewording the expectation".
#
# NOT ASSERTED HERE, each with an owner.
#   (a) The CAPTURED FIXTURE and the cross-language gate's teeth — task **01** of this story.
#       This file drives both implementations directly; task 01 is what makes CI able to see
#       a divergence between them.
#   (b) The Rust `current_work` short-circuit: when `activeRuns` is non-empty it returns
#       `Running{…}` and NEVER reads sessions (`view_model.rs:200-205`), while the JS renders
#       BOTH lines. That is a real, measured, PRE-EXISTING behavioural difference, it is not
#       the dedupe question, and ADR-010 routes it to **TECH_DEBT** (§Codebase health finding
#       5). Every cross-language row below therefore carries an EMPTY `activeRuns`, and the
#       rows that carry a run are asserted against the JS only — stated so nobody "fixes" a
#       divergence inside a dedupe commit.
#   (c) The formatter's SHAPE — exactly one `.filter(…)` reading `workspaceHasRun`, strict
#       `!== true`, no second home for the policy — is
#       `test/arch/acd-session-run-reconciliation.test.mjs:133-145`, not a scenario here.
#   (d) Who enumerates sessions, and the terminals-home grid — stories 49/02-05.
#   (e) Who filters liveness (the publisher, before the wire) — m48, unchanged.
#   (f) Typography, colour, card geometry — the designer, through the `@uat` below.
#
# TRAPS, measured rather than predicted.
#   1. **`cargo` is NOT required for this repo's suite to read green.** `scripts/test.mjs:3045-3058`
#      is a guard-if-present lane: with no toolchain it prints `ok - cargo test (app/desktop)
#      skipped` and adds ZERO to `failures`. So the Rust half of this story can ship entirely
#      unverified on a machine without Rust while CI says ok. **Cost when the toolchain IS
#      present**, measured on this control node 2026-08-13: `cargo test --manifest-path
#      app/desktop/Cargo.toml` → 80 tests, **5s** against an already-built `target/` (a cold
#      build is minutes, not seconds). The scenario below that reads the Rust surface is
#      therefore cheap where it runs and INVISIBLE where it does not — which is exactly why
#      task 01 exists.
#   2. **`app/desktop/crates/core/src/view_model.rs` carries UNCOMMITTED work** — the
#      2026-08-11 re-capture of the Rust fixtures (`aof:verify 48`'s fixture-drift discharge,
#      its provenance at `:490-505`). Rebase on it; do not re-capture over it (ADR-010).
#   3. **The multiplication sign must be a RAW U+00D7 codepoint in the Rust source.** The
#      cross-language gate's escape (`test/arch/acd-captured-producer-fixture.test.mjs:170-172`)
#      rewrites `·` to `\u{b7}` and **nothing else** — verified by running it: it demands the
#      literal `"working \u{b7} demo ×2 (session)"`. A Rust assertion spelled `\u{d7}2` is not
#      what it looks for. Task 01 owns that clause; it is named here because it is decided by
#      how this task's Rust edit is written.
#   4. The line is a ONE-LINE summary in a row whose width floor is measured at **286px**
#      (`ui/src/fleet/assign-affordance.mjs:268`, `REGION5_ROW_FLOOR_PX`, with the mono advance
#      `6.048px` at `:272`). `×2` is four glyph-widths cheaper than `, demo`; the `@uat` is
#      where that is judged, not asserted here.
#
# ISOLATION AND PORTS. Every `@executable` scenario below is over a PURE function called with
# literal objects — no store, no server, nothing written to `~/.aof`, nothing bound. Run them
# under a fresh `AOF_GLOBAL_HOME=$(mktemp -d)` anyway (house rule, hook-enforced), run them
# FOCUSED via the test-array import, and never run the full suite: `:4181`/`:4182` are held by
# the live daemons on this machine and `test/global-work-propagation.test.mjs` binds `:4182`.
#
# REGISTRATION. The host suite `test/mesh-fleet-session-subsumption-render.test.mjs` is already
# registered (`scripts/test.mjs:1924`). If this task adds a NEW suite file it must be imported
# and spread there in the same diff, or `acd-test-suite-registration` fails — "a test suite that
# no runner imports is NO gate".
#
# NOTATION USED IN THE EXAMPLES. `⎵` is exactly ONE literal SPACE (U+0020); a Gherkin cell
# cannot carry a leading or trailing space, so `⎵` stands in for one and is never itself part
# of the data. `×` is written literally and is U+00D7. Every expected line below was computed
# from DESIGN's algorithm and checked against the shipped comparator at `runs.mjs:103` before
# it was written down.

@ui @work @board
Feature: one repo, said once, with a count — the node's current-work line stops repeating a repo name and starts saying how many sessions are in it
  In order to read how much a machine is doing instead of counting repeated words
  the `(session)` line groups its live sessions by the raw repo string, sorts the DISTINCT repos by plain codepoint order, and renders `<repo> ×<count>` wherever a repo holds more than one

  Background:
    Given the pure `fleetCurrentWorkLines(presence)` called with literal presence objects — no store, no server, no clock
    And the fleet card renders that same function's output through `nodeCurrentWork(node)`, and the desktop app renders `current_work(node).display()`
    And "the `(session)` line" means the element of `lines` framed `working · … (session)`

  # ══ THE HEADLINE. This is the outcome m48 routed here, and it is a scenario that FAILS
  #    against today's unmodified code — today it renders `working · demo, demo (session)`.
  @executable
  Scenario: two live sessions in one repo name that repo once and say how many
    Given a node with no active runs
    And two live sessions, both in repo `demo`, neither subsumed by a run
    When the current-work lines are rendered
    Then `lines` is exactly one element: `working · demo ×2 (session)`
    And the repo name `demo` occurs exactly ONCE in that line
    And `state` is `working` and `token` is `primary`
    And rendering the identical payload a second time returns a deep-equal result

  # ══ THE SIGN AND THE COUNT — the two things a plausible-looking build gets wrong.
  #    Read as codepoints, because `×` and `x` are indistinguishable in a review diff.
  @executable
  Scenario: the sign is U+00D7 and a count of one is never written
    Given a node whose live sessions are two in repo `demo` and one in repo `aof`
    When the current-work lines are rendered
    Then the `(session)` line is `working · aof, demo ×2 (session)`
    And the character immediately before the digit `2` is U+00D7, read as a codepoint
    And the line contains no LATIN SMALL LETTER X (U+0078) anywhere
    And there is exactly one space between `demo` and that sign, and NO space between the sign and the digit
    And the part for `aof` is exactly `aof` — no ` ×1`, and the substring `×1` appears nowhere in the line
    And the line's frame is unchanged: it starts `working · ` and ends ` (session)`

  # ══ THE CASE MATRIX. Rows 1 and 7 are the "unchanged from today" floor and must stay
  #    byte-identical; every other row fails against today's code.
  @executable
  Scenario Outline: the line groups, counts and orders the distinct repos
    Given a node with NO active runs
    And live sessions whose repos, in the order the wire carries them, are <the repos>
    And no session is subsumed by a run
    When the current-work lines are rendered
    Then `lines` is exactly one element: <the line>
    And `state` is `working` and `token` is `primary`

    Examples: grouping and counting
      | case                                          | the repos                     | the line                                    |
      | one session — UNCHANGED from today            | demo                          | working · demo (session)                    |
      | two sessions, one repo                        | demo, demo                    | working · demo ×2 (session)                 |
      | three sessions, one repo                      | demo, demo, demo              | working · demo ×3 (session)                 |
      | a two-digit count needs no separator          | demo repeated ten times       | working · demo ×10 (session)                |
      | two repos, one of them doubled                | demo, aof, demo               | working · aof, demo ×2 (session)            |
      | two repos, both doubled                       | demo, aof, demo, aof          | working · aof ×2, demo ×2 (session)         |
      | two repos, one session each — UNCHANGED       | aof, demo                     | working · aof, demo (session)               |
      | the wire's order is not the line's order      | zeta, alpha, zeta, mid        | working · alpha, mid, zeta ×2 (session)     |
    # Row 8 is the anti-echo row: a build that grouped but preserved first-seen order passes
    # every row above it and fails here. It also pins that the SORT is over the DISTINCT
    # repos, not over the multiset — sorting the multiset then grouping adjacent equals would
    # also pass rows 1-7, and it is the implementation a reviewer is most likely to wave
    # through, so rows 5 and 6 carry a doubled repo that is NOT last in codepoint order.

    Examples: the grouping key is the RAW string — no trim, no case-fold
      | case                                          | the repos                     | the line                                    |
      | case differs, so they are two repos           | Demo, demo, demo              | working · Demo, demo ×2 (session)           |
      | a leading space differs, so two repos         | ⎵demo, demo, demo             | working · ⎵demo, demo ×2 (session)          |
      | a trailing space differs, so two repos        | demo⎵, demo, demo             | working · demo ×2, demo⎵ (session)          |
      | a repo that is only a space is not empty      | ⎵, ⎵                          | working · ⎵ ×2 (session)                    |
      | a repo whose name CONTAINS the sign           | a×b, a×b                      | working · a×b ×2 (session)                  |
      | a repo whose name IS the sign                 | ×, ×                          | working · × ×2 (session)                    |
    # These six are the whole content of DESIGN step 3, made failable. A build that trimmed
    # would render `working · demo ×3 (session)` for rows 2 and 3; a build that case-folded
    # would render `working · demo ×3 (session)` for row 1. Rows 5 and 6 are the adversarial
    # pair: the sign is DATA as well as syntax, so nothing may parse this line back apart —
    # and their placement is arithmetic, not taste (U+00D7 sorts after every ASCII letter,
    # which is why `a×b` follows `aof` and a bare `×` follows `demo`).

  # ══ THE COUNT IS OF SURVIVORS, NOT OF SESSIONS. Subsumption runs FIRST — m48's rule is
  #    untouched by this task, and a build that counts before filtering passes the matrix
  #    above and lies here.
  @executable
  Scenario Outline: the count is taken after the run filter, never before it
    Given a node whose active runs are <active runs>
    And live sessions <the sessions>
    When the current-work lines are rendered
    Then `lines` is exactly <the lines>

    Examples:
      | case                                                  | active runs | the sessions                                        | the lines                                              |
      | one of the two is accounted for by the run            | run-1       | demo (workspaceHasRun true), demo (false)           | running 1 run / working · demo (session)               |
      | both are accounted for by the run                     | run-1       | demo (true), demo (true)                            | running 1 run                                          |
      | an unstated run fact never subsumes, so both count    | run-1       | demo (key absent), demo (the string "false")        | running 1 run / working · demo ×2 (session)            |
      | blanks and non-strings drop out before the count      | none        | demo, "", null, 7, undefined, demo                  | working · demo ×2 (session)                            |
    # Row 1 is the sharpest: two sessions in one repo, ONE of them doing assignment work, and
    # the honest line says `demo` with NO count — because one session survived the filter.
    # A build that deduplicates the mapped repos but counts the raw `sessions[]` renders
    # `demo ×2` here and is wrong. Row 3 keeps m48/ADR-010 R3 alive through the rewrite: the
    # comparison stays STRICT against boolean `true`, so an absent key and the STRING "false"
    # both still render. Row 4 pins that the count is over what SURVIVED `:102`'s filter.

  # ══ THE RULE, NOT THE STRING. ADR-010 requires m48's rule-form assertion to be REPLACED by
  #    another rule (never by a literal), so the next milestone cannot reword its way past
  #    this behaviour either. This is that rule, stated as arithmetic anyone can evaluate.
  @executable
  Scenario: the line's arithmetic is checkable without reading it as a string
    Given any node payload with no active runs and at least one unsubsumed live session
    When the `(session)` line's body — between its `working · ` prefix and its ` (session)` suffix — is
    resolved into parts against the SET OF REPOS THE PAYLOAD PUBLISHED, each part being `<repo>` or `<repo> ×<n>`
    Then the number of parts equals the number of DISTINCT repo strings among the surviving sessions
    And the counts the parts carry — reading a part with no sign as 1 — sum to the number of surviving sessions
    And every part's repo text appears byte-identically in at least one surviving session's `repo`
    And the parts are in ascending codepoint order of their repo text
    # Four clauses, and each rejects a different wrong build: clause 1 rejects today's
    # duplicate rendering, clause 2 rejects a bare dedupe (which under-counts the very
    # sessions m48 made addressable), clause 3 rejects a normalising build that renders a
    # repo nobody published, clause 4 rejects first-seen ordering.
    #
    # WHEN-STEP AMENDED at build, 2026-08-13 (PO ruling, on a finding BOTH reviewers reached
    # independently). It read "the `(session)` line is split on `", "`". The four Then clauses
    # are UNCHANGED and were satisfied either way — this amends the TECHNIQUE, not the rule.
    # Why it could not be left alone: a repo label may itself contain `", "`, and a split then
    # makes the rule report violations against the shipped formatter's OWN CORRECT OUTPUT —
    # measured, `["a, b", "a, b"]` renders `working · a, b ×2 (session)` and the split-based
    # rule called it 3 violations. A rule that fails on correct output is a false red waiting
    # for whoever first names a repo with a comma. The rule module's header already claimed
    # "nothing may take this line apart on its own"; it then took it apart on the comma, with
    # none of the care it takes over U+00D7. Resolution against the published repo set is the
    # SAME technique the module already uses for the sign, so this adds no machinery — it makes
    # the header's existing claim true. A third, subtler case turned up while fixing it: an
    # AMBIGUOUS body readable two ways (`["demo, demo", "demo"]` → `working · demo, demo, demo
    # (session)`), which is why resolution prefers the consistent-and-ascending reading.
    # Left standing, and worth knowing: the rule still accepts `×1`, which the formatter never
    # writes. Closing that would mean embedding the canonical render in the rule — a bigger
    # call than a review fix, and deliberately not made here.

  # ══ THE GUARD SURVIVES THE CHANGE IT WAS WRITTEN TO CATCH. PO ruling: the pin is REPLACED
  #    BY ANOTHER RULE, never deleted. A pin removed by the diff it was written to catch is a
  #    failure this codebase has caught more than once.
  @executable
  Scenario: the case m48 pinned is still pinned, as a rule, and it rejects both wrong answers
    Given the delivered suite still carries a case for two live sessions in one repo with no run
    And the rule above is applied to a candidate line together with the session set it came from
    When the candidate line is `working · demo, demo (session)` — today's behaviour
    Then the rule REJECTS it
    When the candidate line is `working · demo (session)` — a bare dedupe
    Then the rule REJECTS it
    When the candidate line is the one the delivered formatter renders for that payload
    Then the rule ACCEPTS it
    # Both rejections are load-bearing. The first is the change being real; the second is
    # DESIGN's rejected alternative staying rejected. A replacement written as a string
    # equality would accept nothing and reject nothing about the RULE — which is what
    # `test/mesh-fleet-session-subsumption-render.test.mjs:143-148` exists to prevent.

  # ══ THE OTHER IMPLEMENTATION SAYS THE SAME WORDS. Runs under `cargo`; see trap 1 — this
  #    scenario is silently ABSENT wherever the toolchain is, which is why task 01 exists.
  @executable
  Scenario Outline: the desktop app renders the identical line for the identical payload
    Given a `mesh status --json` payload whose local node has an EMPTY `activeRuns`
    And whose live sessions' repos are <the repos>
    When `current_work(node).display()` is evaluated in the Rust core
    Then the string it returns is byte-identical to the line the JS formatter renders for that same payload
    And that string is <the line>

    Examples:
      | case                            | the repos              | the line                            |
      | two sessions, one repo          | demo, demo             | working · demo ×2 (session)         |
      | one repo doubled beside another | demo, aof, demo        | working · aof, demo ×2 (session)    |
      | one session each — UNCHANGED    | aof, demo              | working · aof, demo (session)       |
    # Every row here carries an EMPTY `activeRuns` ON PURPOSE — see NOT-ASSERTED (b). With a
    # run present the two implementations legitimately differ TODAY and this story does not
    # touch that. The `working ·` separator stays U+00B7 written `\u{b7}` (view_model.rs:82);
    # the count's sign is U+00D7 and is written RAW (trap 3).

  # ══ NOTHING ELSE MOVES. The regression floor, so "the dedupe broke the idle line" is a
  #    sentence nobody gets to say at review.
  @executable
  Scenario Outline: every case that has no duplicate renders exactly as it does today
    Given <the payload>
    When the current-work lines are rendered
    Then the result is exactly <the outcome>
    And no error is thrown

    Examples:
      | case                             | the payload                                   | the outcome                                                  |
      | nothing happening                | no runs, no sessions                          | lines [idle], state idle, token muted                        |
      | several runs pluralise           | three runs, no sessions                       | lines [running 3 runs], state working, token primary         |
      | a run in one repo, a session in another | one run, one session in repo `other`   | lines [running 1 run, working · other (session)]             |
      | presence absent entirely         | no presence object at all                     | lines [idle], state idle, token muted                        |
      | sessions is not an array         | sessions is the string "not-an-array"         | lines [idle], state idle, token muted                        |
      | a session whose ping is hours old | one unsubsumed session, `lastPingAt` 5h ago  | lines [working · demo (session)] — no liveness is re-judged  |

  # ══ THE HUMAN LANE — DESIGN §DG-49-8's close condition, render target R-G. QA drives the
  #    browser and produces the frames; the designer judges them and does not run anything.
  @uat @design
  Scenario: a node running two sessions in one repo reads as one repo with a count, on both surfaces
    Given a fleet node card whose node has two live sessions in the repo `aof` and one in `demo`
    When the fleet is rendered at 1280 (the primary judgement width) and again at 760×520 (the desktop-app proxy)
    Then the card's current-work line reads `working · aof ×2, demo (session)` and the repo `aof` is printed once
    And the line occupies ONE line inside the card at both widths — not wrapped, not truncated, and the count is not the part that gets clipped
    And the desktop app's row for that same node prints the same words
    And an operator asked "how many sessions is that machine running in aof?" answers from the line alone
    # It FAILS if: the repo appears twice; the sign renders as the letter `x`; the count is
    # lost to an ellipsis at the 286px row floor (`assign-affordance.mjs:268`); or the two
    # surfaces print different words. The reviewer must NOT log the absence of any terminals-
    # home frame here — R-G is the fleet node card, a different page from this milestone's own.
