# 163 · State

## Notes & decisions in flight

- 2026-10-18 build (solo, attempt 1, run 20261018T144502163Z-0001): `work:questions` lives in
  `packages/work/src/commands/questions.mjs`, composed beside `work:answer` in the resume binding.
  `standingAsk` is now injected into `createReentryCommands` (`openLastAsk` deleted);
  `askRunStopped` and `runsBehindAsk` moved into `work-loop/ask.mjs`, and `cycle.mjs`'s sweep calls
  them, so the loop's clear and the verb's stale mark are one test. The claude path stamps
  `runtime` on its ask file. `readAsks` gained an explicit `allWorkspaces` read.
- The 154/05 prompt-audit case read a DONE milestone's `PROMPT-AUDIT.md`. Decoupled, not tidied:
  the living audit is `wiki/prompt-audit.md` (154's copy stays its delivery snapshot), and the
  `command:questions` decision is recorded there.
- Tests ran as focused `scripts/test.mjs --only` sets, not `aof test --scope impacted --story 163`:
  the story declares new paths, which widens impacted to the whole tree in this checkout.

## Feedback (for retro)

Archived at accept, 2026-10-18. The lessons graduated into RETROSPECTIVE.md (R1), and the build-review findings into VERIFICATION.md (F-01, F-03, F-04). The two not-163 notes were closed at verify: the `apps/ui/dist` reds went green once the UI was built, and the runtime-loop fixture import did not go red in the importer sweep.
