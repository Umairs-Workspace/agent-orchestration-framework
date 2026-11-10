# 146 · A capture can skip the backlog — Outcome

## Delivered

### `--in-stream` on the five top-level add commands
`aof:add-milestone`, `add-story` (standalone), `add-chore`, `add-spike` and `add-uat` accept
`--in-stream` anywhere in their arguments. With it, the capture is scaffolded under `backlog/` and then
`aof work promote <slug> --json` runs at once with no position, so the item lands numbered at the tail
whatever `work.intake` says. A promote refusal is reported as a stop and leaves the item in the
backlog.

### The backlog intake is unchanged without the switch
Under `work.intake: "backlog"`, a capture without `--in-stream` stays un-numbered in `backlog/`, and
`aof:promote <slug>` is still the next step.

## Assumptions

- **`aof work promote` stays the one mint** — the prompts never compute a number (m127/FF-12703 leg (e)).

## Gaps

### The switch in Claude's slash menu
- **Status:** open
- **Discharge condition:** a Claude command render carries its source's `argument-hint`, so the menu
  shows `[--in-stream]`
Codex and OpenCode renders carry the hint. Claude renders carry none for any of the 28 commands.
