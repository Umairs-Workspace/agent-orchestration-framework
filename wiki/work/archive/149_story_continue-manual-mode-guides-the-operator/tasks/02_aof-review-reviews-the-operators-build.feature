@executable @docs @work @work-stream
Feature: aof:review reviews the operator's build, and fixes nothing

  WHY. Plain `aof:continue` would spawn a developer before its review, and that developer may touch
  the operator's code. The operator asked for a review command instead. `aof:review <ref>`
  (`packages/core/assets/commands/review.md`) is that command: it builds nothing, it walks
  continue's gate ladder and review lanes over the operator's change, and it hands every finding
  back to the operator. A clean review moves the story to `in-review`, ready for `aof:verify`.

  The gate ladder and the review lanes keep one home, `continue.md`, whose `<gate_ladder>` and
  `<review_rounds>` regions FF-7105 already holds to the shell. `review.md` points at them and
  restates neither. It carries one rule of its own, moved from the removed `aof:code-review`: the
  graph blast-radius ranking handed to the architect lens.

  The prose rows land in `test/work/story-context-contract.test.mjs`, in place of its code-review
  rows. The single-home row lands in `test/arch/command/acd-prompt-gate-ladder-parity.test.mjs`,
  and the bundle rows in `packages/core/test/bundle.suite.mjs`.

  Rule: R3 · aof:review reviews the operator's build, and fixes nothing

    Scenario: E9 · a green story is reviewed, and a clean review moves it to in-review
      When `packages/core/assets/commands/review.md` is read
      Then it says the run is minted with `aof work run-start <ref> --json` before anything else
      And it says `aof test --scope impacted --story <ref>` runs first, then the gate ladder, then the review lanes
      And it says a review with no Blocker ends with `aof work status <ref> in-review` and `aof work run-complete <ref> --outcome done`
      And it says its next step is then `aof:verify <ref>`

    Scenario: E10 · a red story is stopped before any reviewer runs
      When `review.md` is read
      Then it says a red scenario stops the review before the gate ladder, naming every red scenario
      And it says no reviewer is spawned and the status is not moved

    Scenario: E11 · a Blocker is handed to the operator, and no agent edits the code
      When `review.md` is read
      Then it says a review with a Blocker leaves the story `in-progress`
      And it says each finding is reported with its file and line, its lens and its severity
      And it says the next step is the operator's fix, then `aof:review <ref>` again

    Scenario Outline: the review command holds each rule a review of the operator's build needs
      When `review.md` is read
      Then it says <rule>

      Examples:
        | rule                                                                                                                                                                         |
        | it accepts a story or a task, and refuses a milestone, a span, a uat session, a spike or a chore                                                                            |
        | the gate ladder is the `<gate_ladder>` region, and the review lanes are the story lane's review step and its `<review_rounds>` region, of the `continue` command beside it |
        | that command is rendered at `.claude/commands/aof/continue.md`, `.opencode/commands/aof/continue.md` and `.codex/skills/aof-continue/SKILL.md`                              |
        | `aof-developer` is never spawned, and no review lens applies a fix                                                                                                          |
        | the change under review is the diff against the merge-base with the default branch, uncommitted changes included                                                           |
        | a changed path outside the story's `files:` is reported as a contract gap                                                                                                  |
        | before the architect lens it runs `aof graph build .` and then `aof graph impact` on the changed files, and ranks the review by their dependents                          |
        | the ranking is advisory and never a gate; a file reported `present: false` is ranked UNKNOWN, never zero                                                                    |
        | a `graphify-missing`, `graphify-build-failed` or `graphify-no-persist` answer means the review runs unranked, with no block                                                 |
        | an unset `work.agents.mode` resolves to orchestrated, and `--solo` or `--orchestrated` overrides it for the run                                                             |
        | each run is one review round, and the next round is the operator's re-run after a fix                                                                                      |

    Scenario: the review command restates none of continue's ladder
      When `review.md` is read beside `continue.md`
      Then `review.md` holds no `<gate_ladder>` region and no `<review_rounds>` region of its own
      And it names no review-round bound as a number

    Scenario: the graph grounding controls read the review command
      When the four controls under `test/arch/graph/` that read a review seam are run
      Then each reads `commands/review.md` where it read `commands/code-review.md`, and each passes

    Scenario: aof:review reaches every runtime the bundle renders
      When `aof work update --dry-run --json` runs at the repository root
      Then `.claude/commands/aof/review.md`, `.codex/skills/aof-review/SKILL.md` and `.opencode/commands/aof/review.md` are each reported `skip`
      And `packages/core/assets/bundle.json` lists the command `review` with file `commands/review.md`
      And `packages/core/assets/manifest.json` is byte-identical to what `scripts/generate-bundle-manifest.mjs` produces
      And the learning-edge control excludes `review.md` with the reason "reviews one story's build; cuts nothing"

    Scenario: the docs name the manual walk
      When `docs/acd.md` is read
      Then it says `/aof:continue <ref> --manual` hands the operator a guide, and `/aof:review <ref>` reviews the operator's build before `/aof:verify`
