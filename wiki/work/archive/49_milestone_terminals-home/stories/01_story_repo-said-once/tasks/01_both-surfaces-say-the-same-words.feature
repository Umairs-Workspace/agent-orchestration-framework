<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/01, the TEETH: the gate everybody assumes is holding the two
# implementations together cannot see this change at all, and this task is what gives it
# something to see. Task 00 lands the rule in both languages; THIS task lands the fifth
# captured payload that makes a divergence between them FAIL CI, plus the non-vacuity clause
# that stops a future re-capture quietly dropping it.
#
# THE SEAM, read at source 2026-08-13 in this working tree.
#   - The gate is `crossSurfaceDriftViolations`
#     (`test/arch/acd-captured-producer-fixture.test.mjs:176-197`). For each captured fixture
#     it parses the payload, picks the node with `local: true` (`:185-186`), re-derives
#     `fleetCurrentWorkLines(local.presence).lines` in JS (`:187`), and asserts the RUST
#     SOURCE TEXT contains each line as a quoted literal (`:189`), escaping `·` as `\u{b7}`
#     via `rustLiteral` (`:170-172`).
#   - The fixtures are extracted by the `REAL_CAPTURED_*` regex at `:73`, held to capture
#     PROVENANCE by `provenanceViolations` (`:89-99` — the comment above the const must say
#     it was captured AND name an `aof …` command) and to the LIVE producer's shape by
#     `producerShapeViolations` (`:103-166`; the local node's presence key order at `:131-134`,
#     EVERY node's session key order at `:155-161`).
#   - The yardstick is assembled by the real producer inside the test run
#     (`produceProducerShape`, `:216-250`): `startSession` + `startLauncher`'s first publish.
#     Its frozen answers are pinned at `:292` (`nodeId, heartbeatAt, activeRuns, sessions,
#     aofVersion, buildId`) and `:298` (`sessionId, workspaceId, repo, assistant, lastPingAt,
#     workspaceHasRun`).
#   - The four captured payloads live in `app/desktop/crates/core/src/view_model.rs` at
#     `:506` (LIVE_SESSION), `:636` (TWO_SESSIONS), `:784` (TWO_SESSIONS_NON_ALPHA) and
#     `:846` (SESSION_WITH_RUN).
#   - The producer of a session record is `startSession` → `readLiveSessions`
#     (`src/mesh-presence.mjs:127-147`, the six projected keys at `:137-142`), keyed on disk by
#     the 4-part `(nodeId, workspaceId, assistant, sessionId)` leaf
#     (`src/mesh-session.mjs:111-113`, path at `:124-126`).
#   - **The producer recipe for this exact case is ALREADY CONTRACTED AND SHIPPED** —
#     `48/00/tasks/01_one-session-one-record.feature:51-59`: two `aof session start` runs for
#     the same assistant and workspace with ids `sess-A` and `sess-B` yield TWO record files,
#     and "the live sessions contain both, so a node running two sessions in one repo reports
#     two". The fifth fixture therefore needs NO new producer path — only the act of using the
#     one m48 built. (The other producible shape is two workspaces publishing the same `repo`
#     label; either satisfies the clause.)
#
# THE CLAIM IN RESEARCH §Q5 AND ADR-010, VERIFIED HERE BEFORE THIS FILE WAS WRITTEN — and it
# holds, in a stronger form than either states. Running the SHIPPED extractor regex over
# `view_model.rs` and the SHIPPED `fleetCurrentWorkLines` over each payload, 2026-08-13:
#   LIVE_SESSION           local `umamis-msi` sessions [aof]                    → `working · aof (session)`
#   TWO_SESSIONS           local `umamis-msi` sessions [aof, beta]              → `working · aof, beta (session)`
#   TWO_SESSIONS_NON_ALPHA local `node-dg2`   sessions [pilot-app-portal, aof]  → `working · aof, pilot-app-portal (session)`
#   SESSION_WITH_RUN       local `umamis-msi` sessions [aof, hasRun true], 1 run → `running 1 run`
# **No repo is duplicated on ANY node of ANY of the four** — not merely on the `local: true`
# node RESEARCH grepped, but on every node in every payload (three nodes each for three of
# them, one for the fourth). All four gate lanes were then run under an isolated
# `AOF_GLOBAL_HOME` and all four PASS today. So the gate is green, honest about everything it
# covers, and structurally blind to the dedupe rule. RESEARCH was right.
#
# NOT ASSERTED HERE, each with an owner.
#   (a) What the line SAYS — the rule, its sign, its ordering, its Examples matrix — is
#       task **00** of this story. Nothing here restates an expected line.
#   (b) The Rust behaviour under `cargo` — task 00. This task's subject is a gate that runs in
#       the NODE suite with no toolchain at all, which is precisely its value: `scripts/test.mjs:3045-3058`
#       skips the cargo lane and scores it `ok` when Rust is absent.
#   (c) That the gate compares SOURCE TEXT rather than running the Rust — a real weakness,
#       named and REJECTED for this milestone by ADR-010's alternatives (it would put a
#       `cargo` invocation inside the JS suite) and routed to TECH_DEBT (§Codebase health
#       finding 5). Do not "fix" it here.
#   (d) The `current_work` short-circuit divergence — same TECH_DEBT entry, and the reason
#       the fifth fixture must carry NO active run (trap 4 below).
#   (e) The four existing fixtures' content — untouched by this task.
#
# TRAPS, measured rather than predicted.
#   1. **The gate reads ONLY the `local: true` node** (`:185-186`). A fifth fixture whose two
#      same-repo sessions sit on a PEER node adds nothing: `crossSurfaceDriftViolations` never
#      derives a line from it, and a non-vacuity clause written over "any node" would then
#      certify teeth the gate does not have. Scenario 5 is that trap made failable.
#   2. **`rustLiteral` escapes `·` and NOTHING ELSE** (`:170-172`). Verified by running it: for
#      the deduplicated line it demands the literal `"working \u{b7} demo ×2 (session)"` — the
#      multiplication sign RAW, as U+00D7. `view_model.rs` today contains no U+00D7 at all
#      (its non-ASCII set is `· — § ⇒ ─ …`), so this is the first one. A Rust assertion
#      spelled `\u{d7}2` makes the gate report a drift that does not exist. Widening
#      `rustLiteral` instead is a change to a shipped detector and is a DECISION, not a fix —
#      route it rather than take it.
#   3. **On a case-insensitive filesystem two session ids differing only in case are ONE
#      record** — m48's own open Gap (`48/OUTCOME.md:98-103`), with the read-side guard at
#      `src/mesh-session.mjs:161-171` turning the collision into an honest absence. This
#      machine is Windows. A capture that tries to make "two sessions in one repo" out of
#      `sess-A` and `sess-a` yields ONE session and a fixture that silently proves nothing.
#   4. **The fifth fixture's local node must have an EMPTY `activeRuns`.** With a run present
#      the JS renders both a run line and the `(session)` line while the Rust returns
#      `Running{…}` and never reads sessions — so the pinned literal would be the RUN line and
#      the dedupe rule would go unpinned again, one layer down. ADR-010 says "two live sessions
#      in one repo **with no run**"; scenario 6 makes that a check rather than a hope.
#   5. **`view_model.rs` carries UNCOMMITTED work** — the 2026-08-11 re-capture (provenance at
#      `:490-505`). Add the fifth fixture beside the four; do not re-capture over them.
#
# ISOLATION IS MANDATORY. The producer lane stands up the REAL `startSession` +
# `startLauncher` in a temp repo and opens a store, so a fresh `AOF_GLOBAL_HOME=$(mktemp -d)`
# is required — an unisolated run writes fixtures into the operator's live `~/.aof` and
# corrupts the running soak. It binds NOTHING (`streamServer: false`, `streamClient: false`,
# `:237-238`) and no scenario here may bind a port: `:4181`/`:4182` are held by the live
# daemons. Run FOCUSED via the exported `archTests` array — `node --test` on that file imports
# it and runs nothing, because the array is not `node:test`-shaped.
#
# REGISTRATION. `test/arch/acd-captured-producer-fixture.test.mjs` is already registered
# (`scripts/test.mjs:78`). A new suite file, if one is added, is imported and spread there in
# the same diff or `acd-test-suite-registration` fails it.

@cli @work @board
Feature: the cross-language gate gets teeth on the dedupe rule — a captured payload that actually carries two sessions in one repo, and a clause that fails if anyone drops it
  In order that the JS formatter and the Rust view-model can never drift apart on the rule this story just landed
  the captured-fixture gate is fed a real producer payload carrying two live sessions in one repo, and it refuses to run without one

  Background:
    Given the captured fixtures extracted from `app/desktop/crates/core/src/view_model.rs` by the shipped extractor
    And the shipped detectors `provenanceViolations`, `producerShapeViolations` and `crossSurfaceDriftViolations`
    And a fresh `AOF_GLOBAL_HOME` for the lane that assembles a record through the real producer

  # ══ THE HEADLINE. Against today's unmodified tree this scenario FAILS at its first Then:
  #    there are four fixtures and none of them doubles a repo, on any node.
  @executable
  Scenario: a captured payload finally carries two live sessions in one repo
    Given the captured fixtures in the Rust surface
    When each fixture's `local: true` node is grouped by its live sessions' `repo`
    Then at least one fixture has a repo held by TWO OR MORE of that node's live sessions
    And that fixture's two same-repo sessions are distinct records — different `sessionId` values, or different workspaces
    And the number of captured fixtures is at least five
    And the JS line derived from that fixture's local node contains the count form ` ×2`

  # ══ THE GATE NOW SEES THE RULE. Same detector, same code path as the four existing
  #    payloads — no special case for the new one.
  @executable
  Scenario: the two implementations agree on the duplicate-repo payload, and the gate is what says so
    Given the duplicate-repo fixture and the real Rust source
    When `crossSurfaceDriftViolations` is run over every captured fixture
    Then it reports no violations
    And the Rust source contains, as a quoted literal, the exact line the JS formatter renders for that fixture's local node
    And that literal carries the multiplication sign as a RAW U+00D7 codepoint, read as a codepoint, not as the escape `\u{d7}`
    And the same literal is what `rustLiteral` produces for that line — the gate and the source are compared, never eyeballed
    # The last two clauses are trap 2 made failable. They FAIL for a Rust surface that spells
    # the sign as an escape even though both implementations agree perfectly at runtime — which
    # is the confusing red a builder would otherwise hit at the end of the commit and be
    # tempted to resolve by weakening the detector.

  # ══ THE NON-VACUITY CLAUSE, AND ITS PLANT. ADR-010 requires the clause; the plant is what
  #    stops the clause being the thing it exists to prevent.
  @executable
  Scenario: removing the duplicate-repo fixture fails CI instead of returning the gate to blindness
    Given the real Rust source, which the new clause accepts with no violation
    When the clause is handed a copy of that source with the duplicate-repo fixture deleted
    Then it reports exactly one violation, and its text names what is missing — a captured fixture carrying two live sessions in one repo
    And the planted copy is genuinely different from the real source, asserted before the detector is run
    And the clause reports NOTHING for the real source, through the same code path
    # "The plant genuinely landed" is asserted first, on purpose: a string-replace that matched
    # nothing would make a detector look sharp while proving nothing — the defect m46 found in
    # `affordanceFormViolations`, where the one plant was fed to a locally re-implemented copy
    # so the SHIPPED function was never once driven to a violation.

  # ══ THE NEW FIXTURE IS HELD TO THE SAME CAPTURE DISCIPLINE AS THE OTHER FOUR. Each row is a
  #    way a hand-typed fixture gets in, and each is already refused by a shipped detector.
  @executable
  Scenario Outline: a fifth fixture that was typed rather than captured is refused
    Given a candidate fixture that is <the defect>
    When the shipped detectors are run over it
    Then <the detector> reports a violation
    And the four existing fixtures plus the real fifth report none through that same detector

    Examples:
      | case                                        | the defect                                                            | the detector             |
      | no provenance at all                        | a const with a friendly comment that never says it was captured       | provenanceViolations     |
      | provenance that names no command            | a comment saying "captured" but naming no `aof …` verb                | provenanceViolations     |
      | a session entry the producer never emits    | a session carrying an extra key beside the producer's ordered six     | producerShapeViolations  |
      | a session entry missing the producer's keys | a session in the pre-m48 four-key shape                               | producerShapeViolations  |
      | a stale local presence shape                | a local presence without the producer's frozen key order              | producerShapeViolations  |
      | activeRuns as objects                       | `activeRuns` carrying `{ref, title}` elements instead of id strings   | producerShapeViolations  |
      | no local node                               | a payload with no `local: true` node at all                           | producerShapeViolations  |
    # Rows 3-6 are already proven non-vacuous by the suite's own self-check lane; they are
    # enumerated here because the FIFTH fixture is the first one authored after those plants
    # were written, and "the new fixture passes the same detectors" is the claim, not "the
    # detectors exist". Row 7 matters more than it looks: a payload with no local node is
    # skipped by `crossSurfaceDriftViolations` entirely, so it would be a fixture that adds a
    # const and no coverage.

  # ══ THE PLACEMENT TRAP. The sharpest thing found while reading the gate, and the one a
  #    reviewer cannot see in a diff.
  @executable
  Scenario: a duplicate-repo fixture whose duplicates sit on a peer node does not count
    Given a candidate fixture whose `local: true` node holds ONE session, and whose peer node holds two sessions in one repo
    When the non-vacuity clause is run over it
    Then it reports a violation — the clause is satisfied only by the node the gate derives its line from
    And `crossSurfaceDriftViolations` derives no line from that peer node, confirming there would have been nothing to pin
    # Without this scenario the natural implementation of the clause — "any node, any fixture"
    # — passes on a payload that gives the gate no teeth whatsoever, and the milestone would
    # ship a green non-vacuity assertion over a blind gate. That is the exact failure ADR-010
    # wrote the clause to prevent, one level up.

  # ══ THE RUN TRAP. Two sessions in one repo AND a run is a payload that pins the wrong line.
  @executable
  Scenario: the duplicate-repo fixture carries no active run, so the line it pins is the dedupe line
    Given the duplicate-repo fixture's `local: true` node
    Then its `activeRuns` is empty
    And the JS formatter derives exactly ONE line from it, and that line is the `(session)` line
    And the literal the gate then requires of the Rust source is that `(session)` line — not a `running N runs` line
    # With a run present the JS renders two lines and the Rust renders only the run line
    # (`view_model.rs:200-205`), so the gate would happily pin `running 1 run`, agree, and
    # still see nothing about deduplication. `SESSION_WITH_RUN` is exactly that shape today —
    # measured above, it renders `running 1 run` and its session contributes nothing.

  # ══ THE FLOOR. Adding a fixture must not move the four that exist.
  @executable
  Scenario: the four existing captured payloads still pass every clause, unchanged
    Given the four fixtures captured before this task
    When all four gate lanes are run under a fresh `AOF_GLOBAL_HOME`
    Then every lane reports zero violations
    And each of the four still renders the same JS line it rendered before this story: `working · aof (session)`, `working · aof, beta (session)`, `working · aof, pilot-app-portal (session)`, and `running 1 run`
    And none of the four payload strings was edited
    # The last clause is ADR-008's rule restated as an outcome: a captured payload is never
    # hand-edited to make a suite pass. If the rule change made an existing fixture's pinned
    # literal wrong, the answer is the Rust surface's assertion, never the payload.

  # ══ THE ONE LANE A TEST CANNOT CLOSE. The capture itself is an act, and only a person can
  #    vouch that it happened.
  @manual
  Scenario: the fifth payload is CAPTURED from the real producer, in the same commit as the rule
    Given a build carrying this story's rule, and a node with two genuinely distinct live sessions in one repo and no active run
    When `aof mesh status --json` is run and its stdout is taken verbatim
    Then that stdout is the fifth `REAL_CAPTURED_*` const, byte-for-byte, with no field retyped or reordered
    And its provenance comment names the `aof …` commands that produced it and the instant it was taken
    And the commit that adds it is the SAME commit that changes `ui/src/fleet/runs.mjs` and the Rust view-model
    And the two sessions were not made distinct by letter case alone — see trap 3
    # A fixture added AFTER the rule proves nothing about the change that needed proving; it
    # only pins whatever shipped. The recipe is m48's own, already contracted
    # (`48/00/tasks/01_one-session-one-record.feature:51-59`), and the 2026-08-11 re-capture
    # (`view_model.rs:490-505`) is the precedent for doing it hermetically — the real
    # `startSession` and `startLauncher` publish, in their own `AOF_GLOBAL_HOME`, with the
    # clock injected — which satisfies both provenance and producer shape.
    # Owner: the developer, with the operator in the loop.
