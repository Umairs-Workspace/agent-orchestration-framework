# 55/04 · The frozen set, compiled — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### The frozen set as a versioned declaration
`src/bundle/frozen-set.jsonc` declares six members — `locked-contract`, `litmus`, `tag-vocabulary`,
`gate-order`, `test-isolation` and `anchors` — each naming the enforcement point it protects, and it
installs into a consumer as `.aof/frozen-set.jsonc`.

### A compiler from declaration to enforcement point
`compileFrozenSet` emits hook entries, permission denials and agent tool scopes that each carry their
declaring member's id, so no aof-authored rule exists at any enforcement point without a declaration
behind it; a member that cannot reach its enforcement point refuses the compile atomically rather than
partially applying.

### A surgical permissions merge
`.claude/settings.json` is merged array-wise through `splicePermissions`, with `permissions` removed
from the patch before the top-level spread, so every operator entry survives a compile with its value
and its position, and a compile that changes nothing writes nothing.

### Tampering as a coded event, with the human's way out intact
Drift on a frozen member emits `frozen-set-tamper` carrying the member id — distinct from the
pre-existing preference-drift warning — while an entry whose ownership marker has been removed is
neither edited, retracted, re-marked, nor reported as a tamper, and the report states that escape
where the person will see it.

### The test-isolation guard as compiled output
The rule that blocks an unisolated test run is now the compiled output of the `test-isolation` member,
delivered as `.claude/hooks/aof/guard-test-isolation.mjs`, and it distinguishes an actual test
invocation from a read or from quoted prose.

## Assumptions

- **The enforcement points are the ones aof already owns** — merged `.claude/settings.json`
  permissions and hook entries, and agent tool scope; no general policy engine is introduced, and the
  grammar is small enough to review by reading it.
- **An entry the operator has claimed is theirs** — removing the ownership marker is the sanctioned
  exit, so a compile that finds an unmarked entry leaves it alone rather than reasserting the rule.

## Gaps

### The mesh worker launch envelope
- **Status:** discharged (63/02, 2026-09-02)
- **Discharge condition (as written):** `gate-order` compiles to the worker envelope instead of
  appearing in `compileFrozenSet(...).deferred`.
Measured at `aof:verify 63`: `deferred` is `[]`, all four `FROZEN_ENFORCEMENT_POINTS` compile, and the
member's rule is now `{ "program": "aof", "args": ["work", "loop"] }` in both declaration copies.
`gate-order` is a declared member with no compiled output — the envelope has a spelling and no
enforcement, reported by name rather than silently omitted.

### This repository's own installed guard hook
- **Status:** discharged (story 87, 2026-08-27)
- **Discharge condition (as written):** `aof work update` is run here, replacing
  `.claude/hooks/aof/guard-test-isolation.mjs` with the compiled member.
- **Route actually taken:** that route was **withdrawn** — story 87 unshipped the member, so an update
  installs nothing here. The file was replaced **by hand** with the same compiled predicate, on an
  unmarked settings entry the framework has no opinion about.
The gap closes on its substance: this tree no longer runs the pre-55 1,983-byte file that over-blocked
commands merely mentioning the suite path.
