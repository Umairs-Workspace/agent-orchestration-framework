---
type: chore
number: 100
slug: the-generated-marker-names-a-command-with-no-ref
title: "The Generated Marker Names A Command With No Ref"
status: done
owner: <role>
created: 2026-09-03
updated: 2026-09-05
depends: []
schema: 1
aofVersion: 0.1.0
---
<!--
  CHORE.md — the record doc for a housekeeping chore. Answers ONE question:
  what needs doing, and is it done?
  Owner: whoever runs the chore. A chore is a TOP-LEVEL DRIVER (like a milestone or uat session) that
  groups no stories and carries no behavioural contract — no tasks/, no .feature, no user story. Its
  whole deliverable is a TICKED CHECKLIST. "Done" = every ## Definition of Done box is ticked AND
  `aof work validate` is green (aof:verify checks exactly this — no scenario run). It gates the stream:
  a milestone that `depends:` on this chore waits until it is `done`.
-->
# 100 · The Generated Marker Names A Command With No Ref

## Intent

<!-- What housekeeping this is, and why it's needed now (a migration, config tidy-up, a cleanup
     discovered mid-build). One or two sentences — a chore is minimal-ceremony by design. -->

The `aof-generated` marker `src/loop-record-render.mjs` stamps into every `EXECUTION.md` spells a
command that cannot run: `aof work loop-record --write` omits the ref the verb requires, so the
line an operator copies out of the document fails. Fix the spelling and re-pin 78/01's byte
assertions over the changed line.

## Definition of Done

- [x] src/loop-record-render.mjs's aof-generated marker prints 'aof work loop-record --write', but work:loop-record requires a ref, so the spelling an operator copies out of the document is not invokable. Give the marker the ref form the sign-off prose already uses, and re-pin 78/01's byte assertions over the changed line.
- [x] `aof work validate` is green (no regression)

## Notes

- **Promoted from review finding:** "The generated marker names a command with no ref" (`src/loop-record-render.mjs:208`)
- **Raised reviewing:** `78/02`, review round 1
- **Promotion key:** `finding:78/02:the generated marker names a command with no ref`
- **Follow-up raised at review:** chore `117` — the marker now spells `aof work loop-record <ref> --write`,
  the form the sign-off prose uses, so it names a command that RUNS; the `<ref>` is still a placeholder an
  operator substitutes. Rendering the item's own ref is a further change, scheduled rather than taken here.

<!-- Optional. Anything chore-specific worth recording — context, gotchas, links. Keep light. -->
