---
doc: retrospective
updated: 2026-09-05
---
<!--
  Story RETROSPECTIVE.md — the lessons from HOW this story was built and gated, not what it
  delivered (that is OUTCOME.md) and not what was found (that is VERIFICATION.md, referenced here
  and never restated). One `R<n>` per lesson, appended, never renumbered.
-->
# 102 · The declaration names its loop — Retrospective

## R1 — a new control took its own route to the shipped registry, and a delivered control caught it at the accept gate

- **Kind:** mistake · **Area:** architecture · **Stage:** build · **Owner:** the story's test lane
- **Raised by:** `arch/58 FF-5809` at `aof:verify`, not by a reviewer

**What happened.** The story's new drift check needed a MUTABLE copy of the shipped loop registry, so
it recursively copied `src/bundle` into a temp tree and re-pointed one record's `id:`. That is a
second route out of the shipped registry, and `test/support/registry-fixture.mjs` has existed since
milestone 58 as the only sanctioned one. The lane register went red on the day the file landed and
the story was DECLINED at its first gate. **Refs:** `@finding-F-102-A`.

**Why.** The helper is one indirection away and is named in the header of the very control that
failed — but nothing in the build loop puts it in front of an author who is reaching for `cp`. The
author asked "how do I get a mutable copy" and answered it directly; the question that would have
found the helper is "who already does this", which the register itself answers by listing every file
that reaches the directory.

**Lesson.** Before a test copies anything this framework SHIPS into a temp tree, read the register
that classifies such files — it is a directory of prior art, not merely a gate. A new entry that
cannot name the lane it belongs to is the signal that a helper already owns the job.

## R2 — the first triage proposed a classification the control's own leg would have refused

- **Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product owner
- **Raised by:** the second gate, applying the fix the first gate specified

**What happened.** F-102-A's triage named the fix as "classify the arch suite into `WHOLE_DIRECTORY`
(it copies the directory listing) or `READS_WITHOUT_COPYING`". Neither is admissible: lane 2's
qualifying leg is a literal `readdir` in the source and the suite uses a recursive `cp`, and lane 3 is
for files that copy nothing at all. Applying the triage as written would have produced either a red
leg or — worse, had a leg happened to pass — a true-looking classification that misdescribes the
file. **Refs:** `@finding-F-102-A`.

**Why.** The triage was written from the lane NAMES and the prose above them, which describe intent,
while admission is decided by the leg below, which is a proxy. Names and proxies agree until they do
not, and this register's own header says so in as many words for lane 4.

**Lesson.** When triaging a red register-style control, read the LEG that admits a member before
naming the lane the fix belongs in. If no leg admits the file honestly, that is information about the
file — here it said the suite should not have been copying by its own route at all — and not an
invitation to widen the leg.

## R3 — a piped test run reported the pipe's exit code, not the runner's

- **Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product owner
- **Raised by:** noticing it in the same session, before the reading was recorded

**What happened.** The first re-run of the story's suites was invoked as
`node scripts/test.mjs --only … | tail -25`, whose exit status is `tail`'s and is 0 whatever the
runner did. The tail happened to show no failures, so a genuine `not ok` earlier in the stream would
have been read as a green lane at an accept gate. The run was re-issued writing full output to a file
with `echo "EXIT=$?"` appended, and that is the reading the record carries.

**Why.** A pipeline was used to keep the output small, and shell exit-status semantics were not part
of the thought. This is the same species as this repository's standing note that `node --test` passes
the loop suites silently with zero assertions: a command that LOOKS like it ran the thing.

**Lesson.** At a gate, capture the runner's own status and its whole output, then read the summary
from the file. Never take a green off the tail of a pipeline — and never off any command whose exit
code belongs to something other than the runner.
