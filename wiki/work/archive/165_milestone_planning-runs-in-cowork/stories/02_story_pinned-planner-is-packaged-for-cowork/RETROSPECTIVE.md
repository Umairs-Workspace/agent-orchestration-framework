---
doc: retrospective
promotionFrom: 1
---
# 165/02 · The pinned planner is packaged for Cowork — retrospective

## R1 · Packaged bytes varied by host, and only the live clone could see it

**Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** developer (`@manual` live run) · **Promoted to:** control:FF-16504

**What happened:** pm-skills declares `* text=auto`. A Windows clone therefore checked out all 128
plugin files with CRLF, even with `core.autocrlf=false`, so the packages were not "the folder as
it is at the commit" (E7). The fixtures, which inject a tree, could not show it. Fixed in the
build: the clone argv pins `-c core.autocrlf=false -c core.eol=lf`, and all 142 files hash equal
to their blobs. FF-16504 asserts both settings. Re-run at verify, the four packages carry no CR.

**Why:** A repository's own `.gitattributes` outranks the cloning user's `core.autocrlf`, and an
injected fixture tree never goes through a checkout.

**Lesson:** A clone whose bytes are shipped pins its line-ending settings on the argv. The story's
plan runs the live path at build, not only at verify.

**Refs:** ../../STATE.md Feedback (165/02); ../../VERIFICATION.md (165/02 `@manual`).

## R2 · A clone spawned through a shell with a temp path in its argv

**Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** reviewer · **Promoted to:** none

**What happened:** The clone used `shell: true`, copied from `resolveSha`'s Windows idiom. Its argv
carries a temp path, so a profile directory containing a space would have split under the shell.
It now spawns with no shell, and a live clone into `…\aof probe …\with space` succeeded.

**Why:** `shell: true` exists for `.cmd` shims. `git` is an executable, and the idiom was copied
without that reason.

**Lesson:** Spawn an executable with no shell. `shell: true` is only for a `.cmd` launcher, and
never with a path from outside the code in the argv.

**Refs:** ../../STATE.md Feedback (165/02).
