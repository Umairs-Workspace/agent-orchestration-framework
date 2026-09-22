@executable @cli @work @work-stream
Feature: A backlog item's depends is a planning note until promotion validates it as a gate

  A backlog driver gates nothing and is gated by nothing: 127/01 made `validate` skip its
  `depends:` entirely ("a planning note validated at promotion", `src/work.mjs:1238`) and keep it
  out of both the depends graph and the readiness walk. Promotion is where the note becomes an
  edge, so promotion is where it is checked (ADR-003 §6) — before the gate, before the seam, before
  any write (task 01's order of operations).

  THE RULE, entry by entry, over `asList(meta.depends)` of the backlog record doc's frontmatter:
  - an all-digit entry must name a NUMBERED top-level item that `isDependTarget` admits (a
    milestone, uat, spike, chore, or parentless story) — live OR archived. An archived target is
    satisfied, not missing (ADR-002 §3: the archive is a location, not a status); the edge is
    scored by the target's own status by `next`, exactly as for any live driver.
  - an entry that names a BACKLOG slug (exact match against the backlog rows' `slug`) is refused
    as `promote-depends-backlog`: "`<entry>` is a backlog item — a planning note, not a gate.
    Promote `<entry>` first, or drop the entry." Numbers are minted in the order the operator
    promotes, so a backlog → backlog edge cannot be written as a number yet.
  - any other entry (a number nothing holds, a `NN/SS` story form, free text matching nothing) is
    refused as `promote-depends-unresolved` naming the entry.
  Every offending entry is named in ONE refusal (`error.detail.entries` in-process; the CLI face
  flattens `detail` to top-level keys of the `--json` refusal), so the operator fixes the note once. The numbers are checked against the PRE-shift stream — the operator wrote them against the
  numbers that exist now — and task 01's engine rewrite carries them across a shift. An entry is
  checked as `parseFrontmatter` hands it — quotes and surrounding spaces stripped, an empty entry
  dropped, a duplicate kept — and "all-digit" is textual, so `10a` is free text, not `10`. The
  backlog-slug match is exact and case-sensitive: a slug is lowercase by grammar, so `Delta` names
  no leaf and is unresolved.

  `created.depends` in the envelope is the post-promotion value of the doc's `depends:` line as
  numbers, present iff the line exists; the alias's `insert-uat --depends` test
  (`work-insert-uat-depends.test.mjs`, "rewritten to post-shift numbers") is satisfied by exactly
  this path with no arithmetic of its own (task 03).

  THE FIXTURE is task 00's three-root fixture, each scenario rewriting `depends:` on the leaf it
  promotes. Live targets 10, 11; archived targets 05, 06; backlog slugs gamma, delta, epsilon.

  What would quietly undo this: a check that consults `isLiveStreamRow` (an archived target would
  read as missing); a check run AFTER the shift (the numbers would be off by one); a
  backlog-slug entry silently dropped or silently kept (either way a lie in the promoted doc).

  ADR-003 §6; ADR-002 §3; 127/01 task 03.

  Scenario: numeric entries naming live and archived items resolve, and the promoted doc keeps them
    Given the three-root fixture, with `backlog/chore_gamma/CHORE.md` carrying `depends: [10, 05]`
    When `aof work promote gamma --json` runs
    Then it proceeds; `12_chore_gamma/CHORE.md` carries `depends: [10, 05]` byte-identical, and `created.depends` is `[10, 5]`
    And `aof work validate` reports no findings on `12_chore_gamma` — the archived `05` resolves as a depends target there too
    And `aof work next 12 --json` answers `state: "blocked"` naming `10` (alpha is in-progress) and not `05` (zeta is done)

  Scenario: a backlog slug in depends is refused as a planning note
    Given the three-root fixture, with `backlog/chore_gamma/CHORE.md` carrying `depends: [delta]`
    When `aof work promote gamma` runs
    Then it is refused with code `promote-depends-backlog`, the message naming `delta` and saying to promote it first or drop the entry
    And `detail.entries` is `[{ entry: "delta", code: "promote-depends-backlog" }]`
    And `backlog/chore_gamma` is untouched

  Scenario: the order the operator promotes is the order the numbers exist
    Given the three-root fixture, with `backlog/chore_gamma/CHORE.md` carrying `depends: [delta]`
    When `aof work promote delta` runs and then `backlog/chore_gamma/CHORE.md` is edited to `depends: [12]`
    And `aof work promote gamma` runs
    Then it proceeds, and `13_chore_gamma/CHORE.md` carries `depends: [12]`

  Scenario: a number nothing holds is refused
    Given the three-root fixture, with `backlog/chore_gamma/CHORE.md` carrying `depends: [10, 42]`
    When `aof work promote gamma` runs
    Then it is refused with code `promote-depends-unresolved`, the message naming `42` and not `10`

  Scenario: every offending entry is named in one refusal
    Given the three-root fixture, with `backlog/chore_gamma/CHORE.md` carrying `depends: [42, delta, 10, 99]`
    When `aof work promote gamma` runs
    Then it is refused once, `detail.entries` naming `42` and `99` as `promote-depends-unresolved` and `delta` as `promote-depends-backlog`, in the order written
    And the error's `code` is the code of the first offending entry, `promote-depends-unresolved`

  Scenario: an empty or absent depends is nothing to check
    Given the three-root fixture, with `backlog/chore_gamma/CHORE.md` carrying `depends: []` and `backlog/ideas/milestone_delta/SPEC.md` carrying no `depends:` line
    When `aof work promote gamma` and then `aof work promote delta` run
    Then both proceed; gamma's `created.depends` is `[]` and delta's `created` carries no `depends` key

  Scenario: a depends entry naming the number the promotion itself will occupy still resolves as written
    Given the three-root fixture, with `backlog/ideas/milestone_delta/SPEC.md` carrying `depends: [10]`
    When `aof work promote delta --at 10` runs
    Then it proceeds — `10` resolved to alpha before the shift — and the promoted doc carries `depends: [11]`, alpha's new number (task 01)

  Scenario Outline: the target set is the depend-target set, live or archived
    Given the three-root fixture, plus <extra>, with `backlog/chore_gamma/CHORE.md` carrying `depends: [<entry>]`
    When `aof work promote gamma` runs
    Then the result is <result>

    Examples:
      | extra                                            | entry | result                                   | why                                            |
      | nothing                                          | 10    | promoted                                 | a live milestone                               |
      | nothing                                          | 11    | promoted                                 | a live chore                                   |
      | nothing                                          | 05    | promoted                                 | an archived milestone is satisfied, not missing |
      | nothing                                          | 06    | promoted                                 | an archived chore                              |
      | nothing                                          | 5     | promoted                                 | `sameNum` — 5 and 05 are one number            |
      | a live `07_story_solo` (no parent)               | 07    | promoted                                 | a parentless story is a depend target          |
      | a live `08_uat_gate`                             | 08    | promoted                                 | a uat gate                                     |
      | nothing                                          | 10/00 | refused `promote-depends-unresolved`     | a driver's depends never names a story         |
      | nothing                                          | 05/00 | refused `promote-depends-unresolved`     | an archived story form is no more a target     |
      | nothing                                          | gamma | refused `promote-depends-backlog`        | itself — a self-edge is still a backlog slug   |
      | nothing                                          | zeta  | refused `promote-depends-unresolved`     | an archived SLUG is not a ref form for depends |
      | nothing                                          | alpha | refused `promote-depends-unresolved`     | a live SLUG is not a ref form either           |
      | nothing                                          | "10"  | promoted                                 | quotes are stripped at parse                   |
      | nothing                                          | ` 10 ` (padded with spaces) | promoted                   | surrounding spaces are stripped at parse       |
      | nothing                                          | 12    | refused `promote-depends-unresolved`     | the number the NEXT promotion mints is held by nothing yet — promote in order |
      | nothing                                          | 10a   | refused `promote-depends-unresolved`     | not all-digit, so free text — and no slug is `10a` |
      | nothing                                          | Delta | refused `promote-depends-unresolved`     | exact is exact — a slug is lowercase by grammar |
      | nothing                                          | epsilon | refused `promote-depends-backlog`      | a leaf two groups deep is a backlog slug like any other |
      | nothing                                          | "delta" | refused `promote-depends-backlog`      | quotes stripped — the entry is the slug        |

  Scenario Outline: one refusal names every offending entry in the order written, and the code is the first offender's
    Given the three-root fixture, with `backlog/chore_gamma/CHORE.md` carrying `depends: [<entries>]`
    When `aof work promote gamma --json` runs
    Then the result is <result>, and `detail.entries` names <detail> in that order

    Examples: mixed offenders, duplicates, and the empty entry
      | entries             | result                                    | detail                                                            | why                                                              |
      | delta, 42           | refused `promote-depends-backlog`         | `delta` (backlog), `42` (unresolved)                              | the first offender sets the code                                 |
      | 10, delta           | refused `promote-depends-backlog`         | `delta` (backlog)                                                 | a resolved entry ahead of the offender is not an offender        |
      | delta, epsilon      | refused `promote-depends-backlog`         | `delta`, `epsilon` (both backlog)                                 | two notes, one refusal                                           |
      | 42, 42              | refused `promote-depends-unresolved`      | `42`, `42` (both unresolved)                                      | a duplicate offender is named once per entry as written          |
      | delta, 10/00, alpha | refused `promote-depends-backlog`         | `delta` (backlog), `10/00` (unresolved), `alpha` (unresolved)     | the offender kinds in one note                                   |
      | 10, 10              | promoted, `created.depends` is `[10, 10]` | nothing — no refusal                                              | a duplicate target is kept, not deduplicated                     |
      | 10, , 11            | promoted, `created.depends` is `[10, 11]` | nothing — no refusal                                              | an empty entry is dropped by the parser and is nothing to check  |
