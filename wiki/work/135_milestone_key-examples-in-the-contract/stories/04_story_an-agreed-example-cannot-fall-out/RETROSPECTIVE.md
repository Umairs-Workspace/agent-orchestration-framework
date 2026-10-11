---
doc: retrospective
updated: 2026-10-06
---
# 04 · An agreed example cannot fall out — Retrospective

## R1 — a lane gaining a code missed the controls that enumerate the codes

- **Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** architect
- **Raised by:** the developer, at 04's build

**What happened.** Adding `example-untraced` also had to touch four more files:
- FF-13403's non-vacuity control, which asserts every lane code fires
- the package's per-file import allowlist
- the Plan 09 ledger
- two stale counts in the source-directory budget

None of them was in `files:`. The milestone's whole-tree gate later found two more red on 04's
code: a comment-only `catch` in `build-door.mjs`, and FF-13502 asserting a derived set equal to a
literal (F-135-05).

**Why.** Refine declared where the code is born, not who counts the codes.

**Lesson.** When a lane or a vocabulary gains a member, refine greps for the controls that
enumerate the members, and lists them in `files:`.

## R2 — a live-stream assertion reports in the wrong suite

- **Kind:** near-miss · **Area:** code (test) · **Stage:** build (review) · **Owner:** QA
- **Raised by:** the reviewer

**What happened.** "The live stream gains no trace finding" runs the real doctor over the live
stream. A later story that drops an agreed example while it is open turns 04's suite red, not its
own suite (F-135-04).

**Lesson.** A suite that asserts over the live stream says so in its failure message, and names the
item at fault, so that the red points away from itself.
