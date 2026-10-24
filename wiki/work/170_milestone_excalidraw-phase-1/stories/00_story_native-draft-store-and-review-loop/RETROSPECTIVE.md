---
doc: retrospective
---
# 00 · The native draft store and the review loop — retrospective

## R1 · A create-only hard link made the record's next replacement fail on Windows

**Kind:** mistake · **Area:** code · **Stage:** verify · **Owner:** developer · **Raised by:** product-owner · **Promoted to:** none

**What happened:** `writeRecord` placed a new review record with `link()` so that an existing id could never be replaced. On Windows, a later `rename()` over that record intermittently failed with EPERM. The review suite was red on every run on the control node, and a retry did not clear it. The import recorded the suspect as "a scanner holding the file", which went unmeasured.

**Why:** The store was built and measured on macOS only. The atomic-create primitive carried a cost on the other platform that no POSIX run could show.

**Lesson:** Measure a platform-only flake with a probe that varies one primitive before naming a cause. Here, 14 in 1,200 failed with `link()` and 0 in 1,200 with `rename()`. Under an exclusive lock, check-then-rename gives the same no-overwrite guarantee without the platform cost.
