# 04 · Observe answers for a story and a phase — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### Story-scoped observe
`aof work observe <NN>/<SS>` resolves to the story's own folder under `<milestone>/stories/` and
reports on it; the bare milestone form answers exactly as it did before.

### Refusal of an ambiguous ref
A bare story-shaped ref such as `00` is refused by name rather than substring-resolved to a
top-level item, and every refusal states the ref it was asked for.

### Per-phase rollup
The observe report breaks its totals down by the phase declared on `brief.loop.phase`, each phase
row drawn only from its own runs and summing to the attributed total.

### An explicit no-declared-phase grouping
Runs carrying no declared phase are reported under their own grouping with a run count, never
distributed across the declared phases and never given a guessed one.

### A stable `--json` contract for the scoped answer
The registered `observe` command's `--json` document carries the item's totals, the per-phase
breakdown and the per-agent rows under one key set, identical in shape for a story ref and a
milestone ref, with unattributed counts and unmeasured spend stated rather than omitted.

## Assumptions

- **Phase is read, never minted** — the per-phase rollup is only as complete as the loop shell's
  own `brief.loop.phase` declaration (milestone 53); a run minted outside the loop shell carries no
  phase and is reported as such by design.
- **The `--if-enabled` self-gate is unchanged** — a skipped `--json` run still emits exactly one
  `{ skipped: true }` document and writes no report.

## Gaps

### Attribution of runs to items
- **Status:** open
- **Discharge condition:** story 68/03 lands the join on the run record's `sessionId` and retires
  the free-text matcher.
The scoped and per-phase answers this story delivers are computed over whatever set of agent runs
the attribution path hands them; that path is still the pre-68 text matcher, so a scoped report is
exact about *which item it was asked for* and inherits the matcher's double-counting for *which
runs belong to it*.
