@manual @cli @assets @scaffold
Feature: An intentional prose edit shows as exactly that edit

  WHY. This is the SPEC's first acceptance line, and it cannot be automated without editing the
  shipped bundle from a test. The developer makes one real edit in a scratch worktree, reads the
  failure as a reviewer would, accepts it with the script, and reads the PR-shaped diff. Evidence
  goes into this story's `evidence/` folder and `VERIFICATION.md` (ADR-004).

  Rule: R4 · The render is the same bytes on every run, and a meant edit shows as exactly that edit

    Scenario: E16 · one edited sentence fails as one hunk in each render of that command
      Given a scratch worktree of this branch with "AOF_GLOBAL_HOME" isolated
      And one sentence in "packages/core/assets/commands/refine.md" is reworded
      When the "work-init" suite runs
      Then it fails
      And every changed path is a render of refine, in "default" and in each scenario whose delta stores that render
      And each changed path's diff is one hunk holding the old and the new sentence
      And no other file is reported changed, added or removed

    Scenario: accepting the edit changes only the baselines that render it
      Given the same edit
      When "node scripts/golden.mjs --lane work-init --update" runs
      And "git diff --stat test/golden/baselines" is read
      Then every changed file is a ".golden" render of refine
      And "git diff" of each shows the one reworded sentence
      And the "work-init" suite then passes

    Scenario: reverting the edit returns the baselines to their committed bytes
      Given the edit and its accepted baselines are reverted
      When the "work-init" suite runs
      Then it passes
      And "git status test/golden/baselines" is clean
