# 02 · Layer separation, arbitration and the gate — Outcome

## Delivered

### The timescale check decides on the layer where the clocks cannot
`checkTimescale` compares declared layer ranks whenever both ends of a `target-setting` edge carry
one, and falls back to the clock only where they do not. A supervisor at no slower layer is
`loop-layer-inversion`; one reaching more than a single boundary down is `loop-layer-skipped`. Over
this repository's registry the check now decides seven loops across three layers, where before this
story it had reported nothing since the day it shipped.

### The layer axis is additive over the cadence axis
With no `layer:` declared anywhere, the check's output over the closed cadence cross-product, the
ratio-3 boundary, the four single-node fixtures and the non-`target-setting` case is identical to what
milestone 52 shipped. Both behaviours are asserted by one authority: `FF-5802` extends 52's own
comparability guard rather than standing a sibling beside it.

### Nothing derives a duration from a trigger or a layer
Where neither axis can answer — no clock at both ends, no layer at both ends — the finding is
`loop-timescale-not-comparable` at `warn`, an honest absence rather than a fabricated conversion. The
layer→rank and trigger→scope-rank maps exist only in `src/work-loops.mjs`; `src/work-loops-checks.mjs`
contains no `LAYER_VALUES` or `EVENT_TRIGGERS` member and receives every rank already computed on the
parsed fields.

### The separation ratio is a frozen literal that no configuration can lower
`MIN_SEPARATION_RATIO === 3`, exported so a control can assert the number rather than grep for a
digit, and resolved by no config key. A project cannot lower it to 1 and thereby declare a supervisor
that runs as fast as what it supervises.

### Only an arbiter clears a shared actuator
`checkActuatorArbitration` clears a contended actuator only on a non-contending node whose `kind` is
`arbiter`. A vetoing `actor`, `loop`, `anchor` or `watcher` no longer clears it — the finding names the
pretender and its kind. Every arbiter's `priority` must be a permutation of its own `veto` endpoint
set, with no duplicate, extra or omission, and no arbiter may declare `target-setting`: the kind that
records the trade-off is the kind that cannot act on it.

### An arbiter is a node the checks can see
`isGraphNode` accepts every member of `NODE_KINDS`, so a `kind: arbiter` record is a member of the
graph all four structural traversals walk. This is what took `loop-shared-actuator-unarbitrated` from
3 to 0 over the shipped registry, and it carried the two grounding movements with it. A sixth kind
added to the loader without being admitted here fails CI instead of being silently filtered out of
every check.

### A target-setting edge from an inadmissible source is reported, not accepted
Ownership resolves only from a slower loop, an actor, or an anchor whose `ground:` is `frozen-rule`.
Anything else is `loop-target-setting-not-admitted`, and a loop with no inbound edge at all is
`loop-unowned-reference`.

### The structural codes stop the run
`GATING_CODES` is a frozen thirteen-member set — 57's five plus this milestone's eight — and severity
is derived from membership in it rather than from any hardcoded constant. Nothing inherited moved:
every grounding, anchor and watcher-census code and all seventeen loader codes retain the severity
they had. The two codes that report a preference (`loop-layer-skipped`) or an honest inability to
decide (`loop-timescale-not-comparable`) stay `warn`.

### The exit decision lives only on the face
`src/work-loops-checks.mjs` returns findings and decides nothing about the process; the face reads the
summary and chooses the exit. `run()` returns an identical result whether or not anyone is gating on
it. `src/work.mjs` is not edited and no seventh doctor lane exists.

### Supervision is computed, never self-declared
No kind admits a key by which a node asserts its own supervision, layer authority or arbitration —
there is no `supervised-by`, `arbitrated-by`, `dead-band` or `independence` key in any admitted set,
and `owner` is admitted on `kind: loop` alone. The ownership, layer and arbitration requirements are
emitted as findings rather than required as keys. The checks module still imports nothing.

### The gate turns on green
Measured over this repository's installed `.aof/loops/` at acceptance: 0 errors, 32 warnings, exit 0,
with `reference-ownership`, `actuator-arbitration` and `timescale` each running and reporting nothing.

## Assumptions

- **The gate is green because 58/01's records are on disk, not because nothing can fail it** — the
  `depends: [58/01]` ordering edge is load-bearing. Promoting these codes before the ownership edges,
  layer declarations and arbiter record landed would have delivered fifteen error-severity findings
  through `aof:validate`'s hard loop lane for work that was merely unfinished.
- **The layer axis is only as good as what the records declare** — a layer is an optional key and a
  computed requirement. Where a cadence carries a scope ordinal the declaration is cross-checked
  against it (`loop-layer-contradicts-cadence`), so a loop cannot declare itself slow to dodge an
  inversion; where the cadence is a clock there is no ordinal to check against and the declaration
  stands on its record's own narrative.
- **`MIN_SEPARATION_RATIO` staying a literal depends on the zero-import ruling** — the checks module
  imports nothing, so it could not read a config key even if the ratio were made one. The two
  constraints hold each other up.

## Gaps

### `tasks/04`'s "preference and honest cannot-decide" scenario has no satisfying registry
- **Status:** open
- **Discharge condition:** the scenario's Given is re-worded to admit the gating third finding, at the
  item that next touches this contract — or the pair is declared jointly reachable only alongside a
  gating third and the contract says so.
- `loop-timescale-not-comparable` requires an edge where neither both ends are periodic nor both are
  layered; `checkTimescale` walks loops alone; and every loop without a numeric layer rank emits
  `loop-layer-undeclared`, which this story promotes to `error`. So the scenario's two "only new
  findings" cannot occur without a third that gates, and the feature contradicts its own Examples
  table eight lines below. The delivered behaviour is correct and the decidable half is mechanised —
  both codes resolve to `warn`, neither is in `GATING_CODES`, neither contributes to `summary.error`.
  The `.feature` is not edited: a delivered acceptance criterion is immutable. Recorded as
  `F-58-02-1`, ruled at accept, and owed to `TECH_DEBT` item 53 — the one home for the species *the
  wording is wrong, the code is right*.

### The module the purity ruling protects can no longer be decomposed
- **Status:** open
- **Discharge condition:** either the zero-import leaf property is relaxed with a control that
  replaces what it guarantees, or a decomposition is found that does not require an import.
- `src/work-loops-checks.mjs` is 771 lines, up from 380 across two milestones, and 52/ADR-007's
  zero-import ruling — the property `FF-5804` exists to hold — forbids splitting it into a leaf plus
  helpers, because that split needs the one import the module is defined by not having. The same
  constraint is already recorded against `phase-brief.mjs` as `TECH_DEBT` item 61; this is its second
  instance, and the constraint rather than the file is the subject. Recorded as `F-58-02-5`.

### Three test-local layer→rank maps are not bound to the loader's
- **Status:** open
- **Discharge condition:** a binding that makes the fixtures agree with `src/work-loops.mjs` rather
  than with each other — which lifting the map into a shared test helper would not achieve.
- `test/work-loops-checks.test.mjs`, `test/arch/acd-loop-finding-envelope.test.mjs` and
  `test/arch/acd-arbiter-records-the-tradeoff.test.mjs` each restate the three ranks as a literal,
  because `FF-5802` requires the ordering to have exactly one home and `LAYER_RANKS` is deliberately
  private. The exposure is legibility rather than coverage: inverting the loader's map turns 13 suites
  red, `FF-5806`'s gate over the real shipped registry among them, so a divergence cannot reach a
  green tree. Recorded as `F-58-02-4`.
