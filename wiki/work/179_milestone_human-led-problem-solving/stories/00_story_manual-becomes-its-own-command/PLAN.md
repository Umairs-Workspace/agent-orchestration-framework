# 179/00 · Build brief

## Mechanism

A move, then two small seams. Cut `<manual_mode>` and every `--manual` sentence out of
`continue.md` (and its Codex section in `variants/codex/workflow.md`) and give them a home of their
own in `commands/manual.md`, declared in core's `bundle.json` as `continue` and `review` are, with a
`manual` Codex section. Then reshape the guide's entry: its first act becomes the door
(`aof work continue <ref> --manual --json`), and the re-entry-sweep sentence goes. The guide body
itself, its seven parts and its order, moves verbatim.

In the door (`createPhaseDoorCommand`), the local branch's `command` stops appending ` --manual`
to `/aof:continue` and names `/aof:manual <ref>`. Shape it as a descriptor lookup
(`{ flag: "manual", command: "manual" }`) so 01 can append injected modes without touching the
branch again. The refusal codes do not change.

The hand-off rule is prose in two places: `manual.md` writes the entry, and `continue.md`'s story
lane step 1 reads it under `<read_depth>`.

## Known traps

- 149's rows in `autonomous-shell-out-prompt.test.mjs` assert the old region and hint. Rewrite them
  to this story's contract; the 149 `.feature` stays as delivered (ADR-001 §5).
- Re-render with `aof work update` and check the dry-run reports `skip` before the review; the
  manifest is hashed from the renders.
- Re-pin the 142 test ledger once, at the end, for every suite that grew.

## Verification

`aof test --scope impacted --story 179/00` green. Then prove it end to end by reading `.claude/commands/aof/continue.md` and seeing no `manual` anywhere, and by running
`aof work continue 149 --manual --json` in a scratch workspace and seeing `/aof:manual 149`.

## Out of scope

The teach flag (01), the practices registry (02), any change to what the guide prints.
