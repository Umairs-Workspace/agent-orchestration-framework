# 00 · The supervision vocabulary — Outcome

## Delivered

### `arbiter` is a declarable node kind
`NODE_KINDS` is five frozen literals — `loop`, `actor`, `anchor`, `watcher`, `arbiter` — and
`ENDPOINT_SCHEMES` admits `arbiter:` as an endpoint, so a record whose whole purpose is to resolve a
conflict has a kind of its own rather than being spelled as a loop that happens not to run.

### An arbiter must say which conflict it resolves, in what order, and for how long an adjustment stands
`resolves`, `priority` and `dwell` are required for the kind. `resolves` follows `counter`'s rule
exactly — one branch, not two copies — admitting a non-empty phrase and refusing every
`SENTINEL_TOKENS` member and every `RESERVED_FIELD_PREFIXES` entry, so `resolves: prose:…`,
`resolves: config:…` and `resolves: unknown` are each `loop-bad-value`, while `controlled` keeps its
distinct pointer-or-phrase rule. `dwell` admits exactly `cycles:<n≥1>` and `none`, and not `unknown`.

### An arbiter has no vocabulary in which to say it also acts
`ADMITTED_KEYS.arbiter` omits `actuator`, `measurement`, `cadence` and `ground`. An arbiter that
claims to pull one of the actuators it arbitrates over is refused by the loader's existing
`loop-key-not-admitted-for-kind` — no new code and no new finding code.

### A loop declares the timescale it runs at, and only a loop may
`layer:` is an optional scalar on `kind: loop` alone, taking the frozen three-member enum
`operational` / `management` / `governance`. It is optional by design: with no `layer:` declared
anywhere, milestone 52's timescale behaviour is byte-for-byte what it was.

### The ordering the checks compare has one home, and it is the loader
`src/work-loops.mjs` owns the layer→rank and cadence-trigger→scope-rank maps and hands the ranks over
already computed on the parsed fields. `src/work-loops-checks.mjs` spells no layer name and no trigger
token, so nothing derives a duration from either.

### The widening deleted nothing
All fourteen records shipped before this milestone parse with zero new findings, measured against the
signature milestone 57 froze: the same codes in the same counts (12 `loop-field-prose-only`, 6
`loop-owner-unknown`, 18 in total, no error anywhere), and every record keeps the kind it had —
seven loops, two actors, two anchors, three watchers.

### A registry fixture copies a subset closed under its own endpoints
`test/support/registry-fixture.mjs` is the one helper that copies records out of `src/bundle/loops/`
into a temp registry, and it transitively adds every record a copied record's endpoint names. No
fixture it builds reports `loop-graph-dangling-endpoint`, and no test file reaches the shipped
registry by any other route.

### The six check ids have one authority
`CHECK_IDS` and `src/work-doctor-loop-ready.mjs`'s `COMPOSED_CHECK_IDS` are asserted identical in
members and order, so a seventh check cannot be added to the checks module while doctor silently
scores six. The loader is never asked what the checks are called.

## Assumptions

- **The additive claim is a claim about NUMBER as much as about presence** — "unchanged" is asserted
  by counting each inherited warning, not by observing that nothing new appeared. A silenced warning
  and a doubled one both fail the same leg.
- **`layer:` being optional is what keeps 52's behaviour intact** — the layer axis is additive over
  the cadence axis only for as long as a loop that declares nothing is treated exactly as it was.
- **The ranks staying in the loader depends on the checks' zero-import ruling** — 52/ADR-007 forbids
  `src/work-loops-checks.mjs` any import, so it could not own the maps even if it wanted them. The two
  constraints hold each other up.
- **This story ships no check and no record** — the literals are frozen here so 58/02 and 58/03 could
  be built against them in parallel. Only the landing order is constrained: a record declaring a kind
  the schema does not admit is `loop-unknown-key`.

## Gaps

### `priority` and `dwell` are grammar with no executor
- **Status:** open
- **Discharge condition:** milestone 62's proposer and milestone 61's acceptor read `dwell` before
  committing an adjustment, and read `priority` to order competing ones.
- The loader admits, validates and freezes both keys, and `aof work loops validate` refuses a
  malformed value — but nothing in this system executes an adjustment, so nothing consults either.
  They state what must hold when a proposer exists rather than constraining anything today. This is a
  declared decision (58/ADR-004 §1/§4), not an oversight: deferring the policy into the proposer is
  exactly where policy stops being reviewable.

### There is no `dead-band` key, and the SPEC scoped one
- **Status:** open
- **Discharge condition:** the three prerequisites named in 58/ADR-004 §5 exist — the last of them
  milestone 62's proposer — at which point a magnitude threshold has commensurable quantities to
  compare.
- The loops sharing these actuators control incommensurable quantities (scenarios green, open
  findings, items reaching done), so a single scalar across them would be the fabricated conversion
  52/ADR-006 already refused for cadence. The key is absent from every admitted set, and `FF-5801`
  asserts its absence so it cannot arrive unannounced.

### The per-kind record builder is written once per suite
- **Status:** open
- **Discharge condition:** `test/support/loop-registry-fixture.mjs` gains `anchorRecord()` /
  `watcherRecord()` / `arbiterRecord()` bases beside its existing three, the per-suite copies are
  deleted, and a ratchet stops the next kind from re-growing them.
- The shared fixture module has never gained a base for any kind added after milestone 52, so every
  suite that needs one writes its own with its own private frontmatter renderer beside it. This story
  added three more (`test/work-loops-record.test.mjs:371-405`,
  `test/work-loops-value.test.mjs:198-235`, `test/arch/acd-arbiter-taxonomy-additive.test.mjs:103-118`).
  Nothing compares the copies, so they drift silently. Recorded as `TECH_DEBT` item 65.
