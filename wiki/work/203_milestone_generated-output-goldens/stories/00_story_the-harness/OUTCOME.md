# 00 · The harness — Outcome

## Delivered

### A verb run isolated in a temp project and a temp global home

`test/support/golden/harness.mjs` runs each step of a scenario as a child process of the real CLI (or a fixture verb), with the project and `AOF_GLOBAL_HOME` both under one temp root, and captures the project tree and the home tree apart, with `/` in every path. A step exiting other than declared fails the scenario by name. The temp root is removed whichever way the scenario ends, and a symlink in a captured tree fails by name instead of being skipped.

### A closed normaliser

`test/support/golden/normalise.mjs` holds exactly six rules, in order: `eol`, `temp-paths`, `instants`, `hashes`, `version` and `build-id`. It is the only module that rewrites captured content (FF-20301), and a file that is not valid UTF-8 fails by name.

### A baseline stored as a delta from a named base

A baseline lives under `test/golden/baselines/<lane>/<scenario>/` as `.golden` files, `steps.golden` and `removed.golden`, pinned `text eol=lf` (FF-20303). A derived scenario stores only what differs from its base. Bases chain, may sit in another lane as `<lane>/<scenario>`, and a missing base or a cycle fails by name.

### Drift as a summary and a diff per file

A failing comparison prints added, removed and changed counts, a unified diff for each changed file with 3 lines of context (an in-repo line LCS, no new package), the first 20 diffs and a count of the rest, and the command that accepts the change. A changed step record fails even when no file changed.

### Only the update script writes

`node scripts/golden.mjs --update` (optionally `--lane`/`--scenario`, `--lane-module` repeatable) is the only writer. It re-derives every scenario that builds on a changed base, base first, and a second run writes nothing. `test/support/golden/baseline-writer.mjs` is imported by that script alone, and no environment variable turns a test run into an update (FF-20302).

## Assumptions

- **The line diff is quadratic after its common prefix and suffix** — rewriting a multi-thousand-line file wholesale may allocate around 100 MB.
