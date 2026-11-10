# 160/11 · A test that needs a suite run starts the shard entry — build plan

## Mechanism

Three suites and one workflow change, and one census.

- **The Pages gate.** The workflow's gate step becomes a shard-entry run of the same control, with
  the same isolated home. `site-build` reads the step's command (`GATE_ARGV`) and runs it in a copy
  of the runnable tree, built by a copier that takes everything `scripts/test.mjs` reaches at load.
  The shard entry reaches far less: the harness, the control and its imports. Shrink the copy to
  that, or keep it and only change the argv, whichever the suite reads more clearly.
  `release-workflow-lint`'s shared workflow reader parses the
  step, so check that its expectations do not pin the old spelling.
- **`notify-channels` and `core-workspace`.** Each spawns `scripts/test.mjs --only <one suite>` to
  prove that the suite runs. Swap the program for the shard entry and keep the assertion. Leave
  `core-workspace`'s in-process `import` of the registry alone: its subject is the registered list.
- **FF-16013.** In the registration control, sweep `test/` (a walk with a non-vacuity floor, as
  119's census rule requires) for spawns of `scripts/test.mjs`. Match each against an allowlist of
  `{ file, subject }` and fail on any site not listed and on any stale entry.
  `test-command-contract`'s rows go on the list with the subject 72/ADR-004 §6 gives them.

## Verification step

Run the three suites alone through the shard entry before and after, with the spawn-counting
preload. After the story, none of them starts `scripts/test.mjs`. Plant an unlisted spawn and see
FF-16013 name it. Read the rendered workflow step once by eye: it is the deploy gate.

## Out of scope

- `test-command-contract`'s runner rows: the runner is their subject.
- Making `scripts/test.mjs --only` itself cheaper (ADR-003 rejected moving the registry).
