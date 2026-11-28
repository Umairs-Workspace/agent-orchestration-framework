---
doc: retrospective
---
# 198 · The designer draws a milestone's mocks on the project's design system — Retrospective

## R1 · The live runs found what the fixtures could not

**Kind:** near-miss (lesson) · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** verifier · **Promoted to:** none

- **What happened:** six of the seven findings (F-02 to F-07) came from running the commands on the operator's real projects; the executable lanes were green throughout.
- **Lesson:** for a practice whose real work happens in Artifact calls, run its live paths on a real project during build, not first at verify.
- **Refs:** VERIFICATION F-02 to F-07.

## R2 · A bundle change reached only the repositories named

**Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** developer · **Raised by:** operator · **Promoted to:** none

- **What happened:** the amended commands were rendered into the portal and ai-workforce only; sijil and four other repositories were left behind until the operator asked.
- **Lesson:** after any bundle change, run `aof work update` in every repository with an aof lock, and commit their aof-managed files.
- **Refs:** this session, 2026-11-28.

## R3 · A shared checkout needs commits built from one's own hunks

**Kind:** near-miss (lesson) · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

- **What happened:** another session's 210 work shared the checkout, its staged deletions in the index and its hunks in the same generated files.
- **Lesson:** commit from a temporary index (`GIT_INDEX_FILE`) holding HEAD plus one's own files and filtered hunks, then reset only those paths in the shared index.
- **Refs:** commits `1a0419dd`, `30640492`.
