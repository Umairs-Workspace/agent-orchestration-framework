# 02 · Clean removes exactly what aof wrote — Outcome

## Delivered

### Clean retracts a merged file instead of deleting it

For a lock entry carrying ownership, `aof assets clean` removes aof's recorded fragment through `retractCoAuthoredOutput`, the one retraction apply's stale path also calls, and plans `retract`. It plans `delete` only when nothing of the user's is left, and `drift-warning`, keeping file and entry, when aof's fragment was edited. FF-20402 holds it (ADR-004).

### Clean is held to baselines

The `assets-clean` lane holds clean after a plain apply (`plain`: no generated file or lock entry left, a second clean changing nothing), over the user's own files (`customised`: every merged file handed back holding only the user's content), and after a user edits an aof file and adds a line beside aof's block (`drifted`: both kept and warned about).

### A golden step can edit a file as a user would

A lane step can run a fixture script between two verbs; `test/golden/fixtures/user-edit.mjs` appends or prepends a line (ADR-001 §5).

### A retracted hooks file leaves no empty event

`mergeHooks` drops an event whose groups are all gone, so a retracted `.codex/hooks.json` parses to the user's value, and an aof-only one is deleted.

## Assumptions

- **Retraction restores the user's value, not their bytes** — a retracted `.codex/config.toml` keeps the blank lines the merge added (F-04).
