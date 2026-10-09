
# 152 · Promote shows what to promote next — Outcome

## Delivered

### Promote candidates listing
`aof work promote --show-candidates` (and `--json`) lists every backlog item a named promote would accept now. The order is most backlog items unblocked (directly or transitively), then oldest `created:`, then group path and slug. Each waiting item is listed after them with the gate's own offenders. The command writes nothing.

- **The candidate rule is the depends gate's** — the listing calls `classifyDepends`, so a dependency in the stream but not done never blocks, and any change to the gate changes the listing with it.

### Promote the head
`aof work promote --next-item [--at <P>] [--yes]` promotes the head of that listing through the same `promoteRow` path a named promote takes. It refuses `promote-no-candidates`, with nothing changed, when the list is empty.

### Promote argument conflicts refuse early
A slug, `--next-item` and `--show-candidates` are mutually exclusive, `--at`/`--yes` do not combine with `--show-candidates`, and any flag-shaped argument the verb does not know refuses as `promote-flag-conflict` before the work tree is read.

### `/aof:promote` offers both modes
The command drives `--show-candidates --json` and `--next-item` on the verb's machine face and never chooses an item by reading the backlog itself.

### Claude commands carry their argument hint
Every rendered `.claude/commands/aof/*.md` carries its asset's `argument-hint` as one JSON-quoted frontmatter value. Codex carries it in its usage line, and OpenCode copies carry none because their frontmatter has no such field.
