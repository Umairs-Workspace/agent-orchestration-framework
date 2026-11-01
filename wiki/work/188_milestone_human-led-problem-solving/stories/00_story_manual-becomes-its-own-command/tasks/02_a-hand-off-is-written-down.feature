@executable @docs @work @work-stream
Feature: a hand-off to an agent is written into STATE, and continue's build reads it

  WHY. The operator asked that an agent taking over from a human know that it continues from a
  manual or teaching session (188/02 Q1). So the hand-off is whole-story, and it is recorded: the
  operator-led command appends a `Hand-off` entry to the item's STATE, and continue's story lane
  reads that one entry (ADR-003 §6–§7). This task lands the manual half and the continue half.
  02 gives `aof:teach` the same rule. Rows land in `test/loop/autonomous-shell-out-prompt.test.mjs`.

  Rule: R4 · A hand-off to an agent is written down, and the build reads it

    Scenario: E7 · a manual hand-off appends an entry to the milestone's STATE and names continue
      When `packages/core/assets/commands/manual.md` is read
      Then it says that when the human asks, in any turn, to hand the story to an agent, the session appends a hand-off entry under `## Notes & decisions in flight` in the item's `STATE.md`
      And it says the entry opens `- <date> — Hand-off <ref> from manual:` and lists the `files:` the human changed, their commits since the run was minted, and the scenarios green and red
      And it says the STATE is the parent milestone's for a nested story and the story's own for a standalone one
      And it says the session then names `aof:continue <ref>` and does not run it

    Scenario: E8 · continue's story lane reads the hand-off entry and builds from the human's code
      When the story lane's step 1 in `packages/core/assets/commands/continue.md` is read
      Then it says any `Hand-off <ref>` entry in the item's `STATE.md` is read, and only that entry
      And it says the build treats the files the entry names as the human's starting point
      And it says the build's report names every human-written line it changed, and why
      And the same three rules appear in the `continue` section of `packages/core/assets/variants/codex/workflow.md`

    Scenario: E9 · a standalone task's hand-off is reported in the terminal only
      When `packages/core/assets/commands/manual.md` is read
      Then it says a standalone task has no `STATE.md`, so its hand-off is reported in the terminal and nothing is written
