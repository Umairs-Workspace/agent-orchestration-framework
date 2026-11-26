# 209/05 · Board conformance

## Mechanism

The 205 runner already passes `AOF_WORK_STREAM_STORE` to `seedProject`. Give it a board value. Seeding then writes the folder tree, selects a board manifest in the subject's config, and loads a fixture adapter. That adapter wraps the Azure adapter's request builder with a transport served from `azure-recordings.json`, so the CLI child process runs the real Azure mapping code with no network. Publish the seed before the case runs, export the folder tree as today, and also export the recorded board's items for the cases that observe it. Register the board lanes beside the four file lanes in the golden index. Do not replace the file lanes.

Archive cases in board mode expect the `work-board-archive-local-only` refusal with an unchanged tree. Their file baselines stay as they are. Keep that expectation in the lane, not in a forked baseline.

The alternate board is a second manifest and adapter written into the subject's `.aof/` at seed time. It is an in-memory board with no Azure imports. Running the same cases through it is the FF-20901 positive control at the system level.

The loop test drives `aof work loop` with a stubbed phase session, as the loop's own suites do, over the recorded board. Its feed script injects the competing edit that story 03 detects.

Record each Azure response once, then sanitize it: strip auth headers and tokens, and replace org and project names with the fixture's. Commit only the sanitized file.

## Verification step

Run the golden index with the board lanes and confirm 150 scenarios per store, with archive cases refused in board mode. Then the live run, which is the operator's to arrange. Create the test project on the AOF inherited process, register the daemon, and confirm `board-access` is ok. Walk publish, status, a web-UI edit, the stale refusal and resync, then record the evidence in VERIFICATION.md.

## Out of scope

Windows and WSL daemon credentials, token expiry and throttling are recorded only if the live run happens to exercise them.
