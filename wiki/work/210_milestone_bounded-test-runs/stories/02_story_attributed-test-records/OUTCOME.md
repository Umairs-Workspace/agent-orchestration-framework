# 210/02 · A test record says why it ran, where it ran, and which suite each failure came from — Outcome

## Delivered

### Per-suite failure attribution
The light test entry prints a `# file <path> <seconds> <cases>` marker after each suite's own TAP result, import failures included. Every failure in a test record carries the suite `file` it came from.

### Attributed run records
A test record carries `reason`, `mode`, the absolute git-dir `worktree`, `parent` and `round`. Records written before this field set read those fields as `null`.

### Covering-red answers
A request for a subset of suites that an attributed red record already covers, on the same content, is answered from that record's failures and exit. The stored evidence is unchanged. Exit-only, unattributed and contradictory reds are never projected.

## Assumptions

- **The harness's reporter and after-case seam stays the only writer of the marker** — `normaliseTap` takes any `# file <path> <s> <n>` line as a marker, so a diagnostic printed in that exact shape would be misread.
