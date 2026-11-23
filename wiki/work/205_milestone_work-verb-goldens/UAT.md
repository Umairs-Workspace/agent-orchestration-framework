---
doc: uat
---
# 205 · Manual verification

## Review a real terminal diff

- [x] Agent-run manual check, owned by the builder of 205/00. Verifies → “Review a real terminal diff from a scratch baseline” in `stories/00_story_portable-fixture/tasks/01_repeatable-and-sensitive.feature`.
  1. Copy the committed golden baseline root to a temporary directory. Change a single line in a fixture expectation there.
  2. Run `node scripts/golden.mjs --root <copy> --lane work-stream-fixture --scenario <changed-case>` twice. Record both exit codes and the terminal diff showing the case, document and changed line.
  3. Check the repository baseline is untouched. Attach the transcript to milestone VERIFICATION.md with the checkout revision.

Every other task scenario is executable. This fixture-only milestone has no human-only UAT scenario.
