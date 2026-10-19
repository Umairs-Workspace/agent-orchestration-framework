# 160/12 · Tests keep their state their own — Outcome

## Delivered

### A test run trusts folders in a claude home of its own
The claude folder-trust writer resolves its home from `options.homedir`, then `AOF_TEST_CLAUDE_HOME`, then `os.homedir()`; `scripts/test-harness.mjs` gives every test process a temporary `AOF_TEST_CLAUDE_HOME`, removed at exit, and the sharded runner gives each unit its own home, so a test run neither reads nor writes the operator's `~/.claude.json`.

### A store opens without rewriting a current schema
The global work projection store and the effects journal migrate only an absent or older schema; opening one at its current version executes no write statement, still applies its pragmas, and a newer version is still refused.

## Assumptions

- **A child inherits its parent's environment** — a test that hands a child a hand-built environment without `AOF_TEST_CLAUDE_HOME` reaches `os.homedir()` again; FF-16014 holds the harness and the runner, not every spawn.

## Gaps

### The production writer ignores `CLAUDE_CONFIG_DIR`
- **Status:** open
- **Discharge condition:** the trust writer resolves claude's config file the way claude does when `CLAUDE_CONFIG_DIR` is set (m138/F-06).
An operator who sets `CLAUDE_CONFIG_DIR` still gets folder trust written into `~/.claude.json`, which their claude never reads.
