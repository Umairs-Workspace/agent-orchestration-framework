---
type: chore
number:
slug: frozen-set-deny-rules-name-edit-only
title: "The rendered `.claude/settings.json` deny rules name `Edit(...)` only, so Claude Code stops warning at every session start"
status: not-started
owner: architect
created: 2026-11-15
updated: 2026-11-15
depends: []
schema: 1
aofVersion: 0.1.0
---
# The rendered deny rules name `Edit(...)` only

## Intent

`packages/core/assets/frozen-set.jsonc` renders each protected path into `.claude/settings.json` as
both `Edit(<path>)` and `Write(<path>)`. Claude Code matches file permission checks against `Edit`
rules only. It prints a warning for each `Write` rule at every session start, for
`.aof/loops/**`, `.aof/acceptor-criterion.jsonc` and `.aof/acceptor-ledger.jsonl`. The paths are
still protected, by the `Edit` rule beside each one, so the `Write` rules add nothing but the
warning (m193/F-07, seen in 193's live run).

## Definition of Done

- [ ] The frozen set renders `Edit(<path>)` alone for each protected path, and the rendered
      `.claude/settings.json`, the manifest and the lock are refreshed by `aof work update`.
- [ ] A `claude -p` session in a freshly rendered project prints no `Permission deny rule` warning.
- [ ] Any test or control that pins the `Write(...)` entries is updated in the same change.
