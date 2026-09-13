<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 48/02, the RENDER half: the operator must see exactly what they
# saw yesterday, from a wire that no longer hides anything.
#
# THE FUNCTION, read at source. `fleetCurrentWorkLines(presence)`
# (ui/src/fleet/runs.mjs:58-88) is a PURE projection over `{ activeRuns, sessions }` —
# no React, no DOM, no I/O — so `node:test` imports it directly. Today it emits:
#   - `running N run(s)` when `activeRuns` is non-empty (`:63-65`);
#   - ONE fallback line `working · <repo>[, <repo>…] (session)` naming every session's
#     repo, alphabetically sorted by a locale-independent codepoint compare (`:75-82`);
#   - `idle` when neither (`:84-87`), with `token` "primary"/"muted" travelling
#     alongside `state`.
# Its header states the assumption this story removes, in as many words: "Every LIVE
# session that reached this helper is, by construction (the assembler subsumes a
# same-workspace session before publishing), one the run set has NOT already accounted
# for" (`:67-69`). Once story 48/02's producer half lands, that is no longer true — so
# the rule moves HERE, where it becomes a one-line filter on `workspaceHasRun`.
#
# THIS TASK AND ITS SIBLING MERGE ATOMICALLY. A window in which the wire is complete
# and this filter is missing renders a DUPLICATE `(session)` line beside the run line
# on the live fleet. The scenario "the regression this pairing exists to prevent"
# below is written so that outcome fails loudly.
#
# NOT ASSERTED HERE, each with an owner:
#  - what reaches the wire — task 00 of this story.
#  - the entry's key order — story 48/01's task 00.
#  - the structural halves (that the producer filter is gone; that the formatter reads
#    `workspaceHasRun`) — the AMENDED `acd-session-run-reconciliation`
#    (ARCHITECTURE.md §Fitness functions #8). Amending it ships in this change.
#  - the Rust desktop surface: its `current_work` short-circuits on `!runs.is_empty()`
#    before it reads sessions, so the newly-present entry is never rendered there and
#    no cargo build is needed (ADR-004). Stated so nobody goes looking for a desktop
#    change that is deliberately absent.
#
# NO STORE, NO SERVER, NO PORT. Every scenario calls the pure function with a literal
# presence object, so nothing here touches `~/.aof` and nothing binds a port. The
# isolation rule still applies to any suite this lands in
# (`AOF_GLOBAL_HOME=$(mktemp -d)`, focused run, never the full suite — it binds `:4182`,
# held by the live control daemon).
#
# THIS IS NOT A UI-SURFACE TASK. `runs.mjs` is framework-free; no component, layout,
# interaction or style is in scope. The `@ui` tag names the layer the file lives in,
# not a surface being designed.

@executable @ui @work @distribution
Feature: the fleet renders exactly the line it rendered before, now that the wire carries the sessions a run already accounts for
  In order that moving a display rule off the wire and into the render changes nothing an operator can see — while the wire underneath becomes complete
  `fleetCurrentWorkLines` applies the run-subsumption rule itself, using the `workspaceHasRun` fact each session now carries, and every other line it draws stays exactly as it was

  Background:
    Given the pure `fleetCurrentWorkLines` imported directly, called with literal presence objects
    And "the new wire shape" means a session entry carrying `workspaceHasRun`, as story 48/01 defines it
    And "the old wire shape" means the pre-milestone-48 payload for the same situation, where the producer had already dropped a subsumed session

  # THE HEADLINE, in its strongest available form: not "looks right" but "byte-identical
  # to what the old payload produced for the same situation".
  Scenario: a run and its own session render one line — the same line the old payload rendered
    Given the new wire shape for a node with one running run in `demo` and a live session in `demo` carrying `workspaceHasRun` true
    And the old wire shape for that same situation — one active run and an empty `sessions[]`
    When I render both
    Then the two results are deep-equal — same `lines`, same `token`, same `state`
    And the rendered lines are exactly `running 1 run` — with NO `working · demo (session)` line
    And `state` is "working" and `token` is "primary"

  # THE REGRESSION THIS PAIRING EXISTS TO PREVENT, written so it fails loudly.
  Scenario: a formatter that ignores the run fact would draw the session line twice over — and must not
    Given the new wire shape for a node with one running run in `demo` and a live session in `demo` carrying `workspaceHasRun` true
    When I render it
    Then `lines` has exactly ONE element
    And no element of `lines` contains the text `(session)`
    # A formatter that ignores `workspaceHasRun` produces two lines here — `running 1
    # run` AND `working · demo (session)` — which is what a real operator would see on
    # the live fleet during a merge window where only the producer half landed. Hence
    # the atomic-merge constraint in the comment block.

  # EVERYTHING ELSE IS UNCHANGED, and these rows are the proof rather than the promise.
  # The `(session)` line's own rules — sorted, comma-joined, deduplicated as it is
  # today — are pinned exactly as they behave now, so this story cannot quietly
  # restyle the line while moving the rule.
  Scenario Outline: every other case renders precisely as it does today
    Given the new wire shape for <the situation>
    When I render it
    Then `lines` is exactly <the lines>
    And `state` is <state> and `token` is <token>

    Examples:
      | case                                     | the situation                                                                          | the lines                                                   | state   | token   |
      | nothing happening                        | no runs and no sessions                                                                | `idle`                                                      | idle    | muted   |
      | a session with no run                    | one live session in `demo`, `workspaceHasRun` false                                    | `working · demo (session)`                                  | working | primary |
      | run in one repo, session in another      | one run, plus a session in `other` with `workspaceHasRun` false                        | `running 1 run` then `working · other (session)`            | working | primary |
      | several sessions, sorted and joined      | live sessions in `zeta`, `alpha`, `mid`, all `workspaceHasRun` false                   | `working · alpha, mid, zeta (session)`                      | working | primary |
      | several runs pluralise                   | three running runs, no sessions                                                        | `running 3 runs`                                            | working | primary |
      | two sessions in one repo, no run         | two live sessions both in `demo`, `workspaceHasRun` false                              | today's exact output for two same-repo sessions             | working | primary |
      | mixed: subsumed and free, one repo each  | run in `demo` + session in `demo` (true) + session in `other` (false)                  | `running 1 run` then `working · other (session)`            | working | primary |
    # Row 6 is deliberately phrased against TODAY'S behaviour rather than a value I
    # chose: `:75-82` maps every session to its repo, filters blanks and sorts — it
    # does NOT deduplicate, so two sessions in one repo name that repo twice. Story
    # 48/00 makes that pairing common for the first time. Whether the line should
    # deduplicate is a DESIGN question this story must not answer by accident — QA
    # routes it as a design gap (below); the row's job is to pin that this story does
    # not change it either way.
    # Row 7 is the one that catches a filter applied to the whole array instead of
    # per entry: drop-all-when-any-run-exists passes rows 1-6 and fails here.

  # THE CONTRACT THAT STAYS THE CONTRACT: the card renders what it is handed and never
  # recomputes liveness (SPEC §Scope; m38's own rule). Moving a POLICY here must not
  # smuggle in a PREDICATE.
  Scenario: the formatter still recomputes no liveness of its own
    Given the new wire shape carrying a session whose `lastPingAt` is hours old, with `workspaceHasRun` false
    When I render it
    Then that session still contributes its `working · <repo> (session)` line — the formatter does not second-guess who is live
    And the result does not depend on the current time in any way — rendering the same payload twice, at two different instants, is deep-equal both times
    # Liveness is TTL-filtered by the publisher before the wire ever carries it. A
    # formatter that started filtering by age would be a second staleness authority —
    # the exact thing ADR-007 refuses at the control node, refused here too.

  # DEFENSIVE INPUTS. This function already tolerates a malformed presence (`:59-60`);
  # a new key must not make it brittle, and an OLD payload must still render — during a
  # rollout the fleet reads records from nodes that have not been redeployed.
  Scenario Outline: a payload missing or malforming the new key still renders honestly
    Given <the payload>
    When I render it
    Then the result is <the outcome>, and no error is thrown

    Examples:
      | case                                        | the payload                                                    | the outcome                                             |
      | a pre-48 node's record, mid-rollout         | a session entry with NO `workspaceHasRun` key at all           | the session contributes its line, as it does today      |
      | a non-boolean value                         | `workspaceHasRun` present as the string "true"                 | a deterministic, documented choice — not a crash        |
      | presence absent entirely                    | `undefined`                                                    | `idle` / muted, exactly as today                        |
      | sessions not an array                       | `sessions` as a string                                         | `idle` / muted, exactly as today                        |
    # A QA RULING FLAGGED FOR THE ARCHITECT, not decided here — TWO of them, both
    # routed rather than settled by whichever value the build types first:
    #  (a) row 1's rollout window. A node still running the old build publishes entries
    #      with no `workspaceHasRun`, and its subsumption was already applied at ITS
    #      producer — so treating a missing key as `false` renders correctly for that
    #      node, and that is why the row asserts today's behaviour. But it is a
    #      compatibility CHOICE and belongs in an ADR, not in a Then.
    #  (b) row 6 of the previous Outline: whether the `(session)` line should
    #      deduplicate repo names now that two sessions in one repo is an ordinary
    #      shape (story 48/00). Out of scope here; raised so milestone 49 does not
    #      inherit it silently.
