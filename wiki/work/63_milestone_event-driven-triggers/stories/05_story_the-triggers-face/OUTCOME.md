# 05 · The trigger's face — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### One registered command that resolves a trigger and launches nothing
`work:trigger` composes the four `src/work-trigger/` leaves and emits, for each declared trigger, the `work:loop` input it resolves to plus the argv that carries it. No module in the family spawns or execs a process by any spelling, drives a phase, holds gate arithmetic or authors a `/aof:` slash-command literal — proven through the family's whole static import closure and by a real run that starts no process.

### The projection validates against `work:loop`'s own declared input
The object the face projects carries `work:loop`'s input keys plus one identity key naming the declaring member, and the level flag it composes is read back from `getCommand("work:loop").cli.spec.flags` — so a renamed loop flag cannot leave this face composing an argv the loop refuses.

### The gate facts are obtained through the registry and handed in
The two gate readings arrive through `invoke` at the command boundary, exactly as `work:loop` gathers them when it fires, and are handed to the leaf uncoerced — no `??`, `||` or `?.` fallback stands between the registry's answer and the leaf. A registry that cannot answer is a reported failure rather than a locally computed verdict.

### aof holds no clock and no receiver, and the face writes nothing
No timer, cron evaluator, HTTP server or listening socket is reachable from the family or its closure; the one `setTimeout` in the closure is `renameWithRetry`'s bounded write backoff and is pinned as a shape. Two runs over one fixture tree, in both renderings, leave every byte where they found it. The family declares no `--strict` and no `--dry-run`, and `--json` and the human face render from one object.

### The exit code is a cause, not a case table
A run that produced a resolution exits 0 however many refusals it carries; a run that produced no resolution states the failure first and exits non-zero. Refusals for an unknown trigger, an unknown source, an unresolvable scope and a refused level are each reported by code with the sources that exist named.

### The shipped declaration actually resolves
Over this repository's own `.aof/triggers.jsonc`, every declared source has at least one trigger that resolves to a well-formed `work:loop` input, every resolved scope resolves through `LOOP_SCOPE_FORMS`, every resolved argv begins `work loop` and names a registered command, and no resolved trigger carries a level this workspace's gate would refuse.

## Assumptions

- **`work:loop`'s launcher stays behind `cli.launch`** — the face launches nothing structurally rather than carefully, because 53/ADR-005 left the loop exactly one launcher and it is not reachable in-process from another registered command.
- **`work:trigger` stays in `BOARD_DEFERRED`** — the level pre-flight reaches `work:doctor` and `work:loops-groundedness`, so a served route would let a page load walk the whole work tree.
