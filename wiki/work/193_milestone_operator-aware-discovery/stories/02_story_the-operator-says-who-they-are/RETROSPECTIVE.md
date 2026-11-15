---
doc: retrospective
---
# 193/02 · The operator says who they are — retrospective

## R1 · A review that edits an audited file runs the boundary check

**Kind:** mistake · **Area:** process (delivery) · **Stage:** build (review) · **Owner:** developer · **Raised by:** product-owner · **Promoted to:** none

**What happened:** 02 edited `config-inspect.mjs`. The workspace runtime audit is keyed on a digest of that whole file, so the edit staled both of its entries (the locator's `spawnSync` and `git ls-files`) even though neither call changed. 02's review ran no boundary check, so `node scripts/workspace-boundaries.mjs` stayed red until 03 found it and re-stamped the entries.

**Why:** The story-scoped lanes are suites. The boundary check is a script, not a suite, so no by-file run reaches it. This is the second occurrence of `m160/00` R1 (an edit to an audited file moved the runtime audit, which the write set did not declare), and `m161/F-05` was the same audit failing at a gate.

**Lesson:** When a story's diff touches any file named in `scripts/workspace-runtime-audit.json`, its review runs `node scripts/workspace-boundaries.mjs`, and the audit file joins the story's `files:`. Grep the audit for the story's `files:` before the build starts, so the re-stamp is planned and not found by the next story.
