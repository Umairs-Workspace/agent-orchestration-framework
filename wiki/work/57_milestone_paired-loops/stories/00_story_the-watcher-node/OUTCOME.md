# 00 · The watcher node — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### `kind: watcher` node class
The loop registry admits a fourth node kind beside `loop`, `actor` and `anchor`, requiring `id`, `kind`, `title`, `counter`, `determinism` and `measurement`, and carrying the same five edge keys as every other node.

### A watcher has no vocabulary for acting
`ADMITTED_KEYS.watcher` omits `actuator`, and with it `controlled`, `ceiling` and `optimizing`; a watcher declaring any of them is refused by the loader's existing `loop-key-not-admitted-for-kind` — no new check, no new finding code, no special case.

### `determinism:` — two literals, and no default
`DETERMINISM_VALUES` is `counter` and `judge`, a frozen set in `src/work-loops.mjs`; any other value is `loop-bad-value` and an absent one is `loop-missing-field` that leaves the key off the parsed node, so a record that does not say how its number is produced is incomplete rather than assumed.

### `counter:` is a phrase, and only a phrase
A watcher's `counter:` admits free prose alone — the three pointer schemes, `prose:`, the three sentinel tokens and the empty string are each `loop-bad-value` — so the quantity being counted is named in words while the instrument that produces it stays in `measurement:`.

### The pairing is declared by the watcher, outbound, on the edge that already existed
`EDGE_KEYS` is still 52's five literals: the pairing is a `monitoring` edge on the watcher naming the loop it watches. A loop carrying a `watcher:` key is refused as `loop-unknown-key`, and loading a watcher's edge synthesises no reverse field or edge on the watched loop.

### The eleven records shipped before the widening parse unchanged
Every record milestones 52 and 55 delivered loads with a finding set identical file-for-file, code-for-code and key-for-key to its pre-widening signature — 11 nodes, 18 findings, zero new.

### FF-5701, armed
`test/arch/acd-watcher-taxonomy-additive.test.mjs` fails when `NODE_KINDS` drops a prior kind, when a record milestone 52 or 55 shipped stops parsing, when `ADMITTED_KEYS.watcher` gains `actuator`, when `DETERMINISM_VALUES` gains a third literal, and when `determinism` stops being required for the kind — each leg observed red and restored.

## Assumptions

- **`measurement:` is the loop's field, reused rather than renamed** — a watcher's instrument parses through the same pointer grammar and raises the same `loop-field-prose-only` finding as a loop's, so nothing distinguishes a watcher's prose-backed measurement from any other node's.
- **The grammar records which kind of number is claimed, never whether the claim is true** — `determinism: counter` is admitted on a record whose `measurement:` resolves to nothing deterministic; comparing the two is a check's finding, not a loader's.
- **The loader is the whole boundary** — every refusal here is raised at load, before any check runs, so a watcher is well-formed independently of what any check later makes of it.

## Gaps

### No watcher exists in the shipped registry
- **Status:** discharged
- **Discharge condition:** 57/05 ships the day-one pairing table — a `kind: watcher` record carrying a `monitoring` edge for each `optimizing: true` loop `aof` runs.
- **Discharged 2026-08-28 at the milestone gate** (`F-57-M-7`, carrying `F-57-01-3`). The three watcher records were installed at 57/05's accept and `.aof/loops/` now holds **14 records including 3 watchers**, each byte-identical to its `src/bundle/loops/` source; `aof work loops validate` reports **0 errors, 39 warnings, exit 0** and names no `loop-unpaired-optimizer`. The flip is recorded here rather than at 57/05 because that accept did not make it — twice deferred, and this is the last gate at which the milestone's records have one writer.
- Measured when this gap was written: `.aof/loops/` held eleven records and no watcher, and `aof work loops validate` named `loop:autonomous-cascade`, `loop:build-to-green` and `loop:review-fix-rereview` as `loop-unpaired-optimizer`. The grammar was installed and nothing was written in it.

### A watcher's `monitoring` edge moves no verdict
- **Status:** discharged
- **Discharge condition:** 57/01 widens the graph decomposition and `checkPairing` to read `kind: watcher` nodes.
- **Discharged 2026-08-28 at 57/01's accept.** `checkPairing` now reads `kind: watcher` nodes, and the verdict moved on the real registry rather than on a fixture: `aof work loops validate` over `.aof/loops/` reported three `loop-unpaired-optimizer` findings before this widening and reports **zero errors** after it, with the same records on disk.
- Measured at this gate: `checkPairing` returns `loop-unpaired-optimizer` for an optimizing loop identically with and without a watcher declaring `monitoring` at it. The edge parses, sits on the model, and is refused when dangling; no grounding, pairing or Loop-Ready verdict changes because a watcher exists.

### A declared determinism is never compared with the authority behind it
- **Status:** discharged
- **Discharge condition:** 57/01 lands the independence legs and the `loop-watcher-is-judge` census (ADR-002 §6, `warn`-only and non-gating by decision).
- **Discharged 2026-08-28 at 57/01's accept.** `loop-counter-not-deterministic` now names both the watcher and the prose authority it cites, and the `loop-watcher-is-judge` census reports every judging watcher at `warn` whether or not it is independent.
- A record declaring `determinism: counter` over a `measurement:` backed only by prose is admitted; the disagreement is visible in the two findings the loader already raises and is reconciled by nothing.
