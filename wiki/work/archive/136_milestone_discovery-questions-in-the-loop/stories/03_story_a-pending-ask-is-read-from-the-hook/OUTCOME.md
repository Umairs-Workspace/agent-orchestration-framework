# 03 · A pending ask is read from the hook — Outcome

## Delivered

### A driven session's pending question is recorded before it is shown
The bundled `PreToolUse` hook `claude-ask-pending`, matched to `AskUserQuestion` alone, appends the call (`runId`, `sessionId`, `toolUseId`, `input`, `at`) to `<item>/runs/.asks-pending.ndjson`, prints nothing and exits 0 on every path.

### The loop sees, posts and answers a question the transcript does not show
The driver settles `needs-input` on a record written during its drive whose call has no result in the transcript; the loop's owner and the mesh worker read the question from it first; the re-drive types `You asked:`, the question, `The answer:` and the answer, while the run records the answer verbatim and a transcript question's answer is still typed verbatim.

## Assumptions

- **The hook is rendered into the project** — a repository that has not run `aof work update` keeps the transcript-only detection, which does not see a pending call on Claude Code 2.1.288.
- **The hook and the session share a clock** — the drive-start floor compares the hook's `at` with the driver's own instant.

## Gaps

### A mesh worker's re-drive
- **Status:** open
- **Discharge condition:** the worker's terminal resume types the question ahead of the answer when its ask came from the record.
A worker's resumed session receives the answer alone, so a question it never recorded reaches it without the question (136/VERIFICATION F-136-03).
