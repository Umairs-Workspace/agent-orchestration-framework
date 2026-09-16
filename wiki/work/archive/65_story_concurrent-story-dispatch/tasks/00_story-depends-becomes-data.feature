@executable @cli @work @validate
Feature: A story's `depends` names a sibling, and both readers finally read it

  Story independence is authored today as italic prose — `*(depends 00, 01)*` in a milestone
  `SPEC.md`, and partition sections in `ARCHITECTURE.md`. No command can read either, so no
  command can know which stories may run at once, so one-at-a-time is the only SAFE order
  available. This task makes that prose data.

  MEASURED AT HEAD, 2026-08-15. `isDriver` is `milestone | uat | spike | chore`
  (`src/work.mjs:339`) and it guards BOTH the depends-graph build (`:751`) and the resolve check
  (`:811`). A story is not a driver, so a story's `depends` is parsed by `parseFrontmatter` and
  then discarded by both readers. `test/work-next.test.mjs` is 600 lines and every `depends` in it
  is driver-level. Nothing is half-built here: the tree is clean at HEAD and there is no stash.

  MILESTONE 00'S RECORD IS NOT REWRITTEN. `wiki/work/00_milestone_work-cli/stories/01_story_validate-stream/tasks/02_depends-graph.feature:45-51`
  says "a story-level depends edge is not part of the graph". That is a true and accurate record of
  what milestone 00 accepted, months ago, and it stays byte-intact — an accepted milestone's
  acceptance criteria are not editable by a later item that happens to change the behaviour. The
  new rule is accepted HERE, by story 65, so it is recorded HERE and nowhere else.

  `test/work-validate.test.mjs:796-824` is a different matter: it is CODE, and code tracks real
  behaviour. It asserts `findings` is EXACTLY `[]` for a story carrying `depends: [99]`, which
  stops being true when this task lands, so it is updated to assert the split below — the minimum
  change that keeps it truthful, with no re-framing of the surrounding test.

  THE SPLIT IS THE WHOLE DESIGN. The two readers of `depends` answer the same fact differently:
  `next` IGNORES a dep that resolves to no sibling, because a typo must never strand a milestone;
  `validate` REPORTS it, because a bad edge that nothing surfaces is how the typo survives. One
  rule, two renderings — the `next`/`item-lock` idiom at `src/commands/next.mjs:8-14`.

  A story's `depends` names a SIBLING — a story under the same parent, by its two-digit number —
  never a driver. A driver's `depends` behaviour is untouched by this task in every respect.

  Scenario: a story's depends on a sibling is read as data
    Given a milestone with stories "00" and "01", where "01" declares `depends: [00]`
    When the depends graph is built
    Then story "01" carries an edge to sibling "00"
    And the edge is keyed within the parent milestone, so a sibling number never collides with a driver number

  Scenario: a driver's depends behaviour is byte-unchanged
    Given a stream whose milestones and uat sessions carry the depends they carry today
    When `aof work validate` and `aof work next` run
    Then every driver-level resolve, cycle and gating answer is identical to the pre-change answer
    And the change is additive: no driver edge is re-keyed, re-scoped or re-ordered

  Scenario Outline: validate reports the story edges that cannot be honoured
    Given a milestone with stories "00", "01" and "02", where the edges are "<edges>"
    When I run "aof work validate"
    Then it is <verdict>

    Examples:
      | edges                                  | verdict                                        |
      | 01 → 00                                 | accepted: a resolving sibling edge              |
      | 01 → 00, 02 → 00                        | accepted: a diamond over one sibling, no loop   |
      | 01 → 99 (no sibling numbered 99)        | flagged: depends "99" does not resolve to a sibling |
      | 01 → 01 (a story depending on itself)   | flagged: depends cycle                          |
      | 01 → 02, 02 → 01                        | flagged: depends cycle                          |
      | 01 → 00 where 00 is under ANOTHER milestone | flagged: depends "00" does not resolve to a sibling |

  Scenario: milestone 00's delivered acceptance criteria are left untouched
    Given the scenario "a story-level depends edge is not part of the graph" in `00/01/tasks/02_depends-graph.feature`
    When this task lands
    Then that feature file is byte-identical to what milestone 00 delivered
    And the new rule is recorded only here, in the contract of the story that accepted it
    And the executable assertion at `test/work-validate.test.mjs:796-824` is updated, because a test tracks current behaviour where a delivered feature records what shipped

  Scenario: next does not offer a story whose sibling dependency is unfinished
    Given a milestone with stories "00" (not-started) and "01" (not-started, `depends: [00]`)
    When I run "aof work next"
    Then it offers "00"
    And it does not offer "01"

  Scenario: a story becomes actionable the moment its sibling is done
    Given a milestone with stories "00" (done) and "01" (not-started, `depends: [00]`)
    When I run "aof work next"
    Then it offers "01"

  Scenario: a mutual wait is reported, never silently accepted
    Given a milestone whose stories "01" and "02" each declare depends on the other, and no other story is actionable
    When I run "aof work next"
    Then the milestone is not offered for acceptance
    And the answer distinguishes "waiting" from "done", so a cycle cannot read as a finished milestone

  Scenario: next tolerates a dep that names no sibling, so a typo cannot strand a milestone
    Given a milestone with stories "00" (not-started) and "01" (not-started, `depends: [99]`) and no sibling numbered 99
    When I run "aof work next"
    Then the walk is unaffected: "00" is offered, and "01" is offered in its normal position once "00" is done
    And `aof work validate` separately reports the unresolvable edge

  Scenario: a stream where no story declares depends is answered exactly as before
    Given a milestone whose stories carry no `depends` key
    When I run "aof work next"
    Then the offered item is the first not-done story in positional order
    And the answer is byte-identical to the pre-change answer
