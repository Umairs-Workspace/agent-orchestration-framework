# 210/04 · Named test runs — example map

## R1 · A named run runs exactly what it names, and says why
- E1 · `aof test test/testing/test-run-record.test.mjs --reason "record.mjs changed"` runs that one suite through the light entry and records the reason [proposed]
- E2 · The same command with no `--reason` is refused as `test-reason-missing` and runs nothing [proposed]
- E3 · Naming `packages/work/src/testing/record.mjs`, which is not a suite, is refused as `test-not-a-suite` and names the file [proposed]
- E4 · Three review lanes ask the same named run on unchanged content at once. One run is launched and the other two are answered from its record [proposed]

## R2 · The suggestion lists, and runs nothing
- E5 · With `packages/work/src/testing/record.mjs` changed in the working tree, `aof test --suggest` lists the suites that import or name it, each with how, and launches nothing [proposed]

## R3 · The whole tree is refused inside story work
- E6 · With a running run on story 17/02, `aof test --all` is refused as `test-all-in-story-work` and points at `aof test --failed` and a named run [proposed]
- E7 · With `AOF_RUN_ID` naming a run on milestone 17's verify and no running story run, `aof test --all` runs [proposed]
- E8 · With no running story or task run, `aof test --all` runs the whole tree, as a UAT sweep does [proposed]

- E11 · With a running run on story 17/02, `aof test --all --reason "operator asked"` is refused exactly as without a reason, and nothing runs [stated Q1]

## R4 · The old selection is gone
- E9 · `aof test --scope impacted` is refused as an unknown flag. No `impacted` form remains [proposed]
- E10 · A config carrying `work.test.couplings` makes every `aof test` refuse as `test-config-key-removed`, naming the key [proposed]

## Questions
- Q1 · business · answered · Should `aof test --all` inside story work have an override?
- Q2 · technical · defaulted ADR-007 · How does the tool know it is inside story work? `AOF_RUN_ID` naming a story or task run, else any running story or task run in this checkout.
