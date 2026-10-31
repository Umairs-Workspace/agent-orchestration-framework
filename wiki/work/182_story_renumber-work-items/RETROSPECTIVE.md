---
doc: retrospective
promotionFrom: 1
---
# 182 · Retrospective

## R1 — Exercise the public CLI parser when adding a command flag

**Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** real CLI regression · **Promoted to:** none

**What happened.** The in-process renumber command passed while the public CLI rejected --dry-run. The command declared the flag as dry-run, but the CLI expects its declaration and parsed option key to be dryRun. The real CLI regression reproduced unknown-flag before the correction, then passed both preview and apply.

**Lesson.** Exercise the public CLI parser as well as the registered command body for new flags. The new suite retains that coverage in a disposable checkout; the CLI-wide probe uses a dry-run so it cannot move shared fixture work.

**Refs:** VERIFICATION.md; test/work/stream/work-renumber.test.mjs; .tmp/182-cli.log.

The calibrated recurrence query returned no qualifying lesson (best score 0.101711, threshold 0.23), so no Recurs identity is asserted. The delivery recall contained authored capability/decision records, not evidence of native runtime sessions; this lesson rests on the observed CLI failure and rerun.
