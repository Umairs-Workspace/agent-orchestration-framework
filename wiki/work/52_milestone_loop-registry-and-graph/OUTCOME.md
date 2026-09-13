# 52 · Loop registry & the loop graph — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### The loop registry
`wiki/work/loops/` holds nine markdown records — seven loops and two actors (`actor:operator`,
`actor:product-owner`, `loop:autonomous-cascade`, `loop:build-to-green`,
`loop:mesh-assignment-reclaim`, `loop:retrospective-memory-ingest`, `loop:review-fix-rereview`,
`loop:run-resilience`, `loop:verify-triage-accept`) — each declaring its controlled variable, reference,
measurement, actuator, cadence, ceiling and owner in frontmatter.

### The loop model and its loader
`src/work-loops.mjs` reads the registry into plain data with a frozen schema, a closed value grammar
(`phrase`, `module:`, `command:`, `config:`, `prose:`, the three sentinels, `periodic:` and `event:`
cadences) and sixteen loader finding codes; it resolves `periodic:<n><unit>` to milliseconds and
reports declared gaps as `warn` and schema violations as `error`.

### The closed edge vocabulary
Five edge types — `data-feed`, `target-setting`, `monitoring`, `veto`, `parameter-tuning` — are declared
on the records themselves. `depends` is unchanged and remains the item-level edge; no loop record
carries one.

### The five structural checks
`src/work-loops-checks.mjs` computes groundedness over strongly-connected components, optimizer pairing,
reference ownership, shared-actuator arbitration and timescale comparability as pure model-in/findings-out
functions. It imports nothing, parses no declared value, reads no clock, and emits eight check codes in a
frozen order.

### `work:loops show | graph | validate`
Three registered commands with frozen `--json` envelopes. `show` prints the roster (`--id` filters),
`validate` runs the loader lane then the five checks and reports `summary.checks` with a per-check
`{ran, findings}`, and `graph` renders deterministic Mermaid — byte-identical across processes, with
loop, actor and endpoint carrying distinct glyphs. All three report an absent registry as `present:
false` and exit 0.

### The day-one report
On the registry as it stands the milestone's own machinery reports **0 errors and 40 warnings**:
12 `loop-field-prose-only`, 7 `loop-graph-ungrounded-component`, 6 `loop-owner-unknown`,
5 `loop-unowned-reference`, 3 `loop-unpaired-optimizer`, 3 `loop-shared-actuator-unarbitrated`,
2 `loop-graph-grounded-exogenous-only` and 2 `loop-ceiling-uncapped`. Exactly two edges are declared in
the whole registry, both `target-setting`. The three loops marked `optimizing: true` —
`build-to-green`, `review-fix-rereview`, `autonomous-cascade` — are all unpaired, because no record
declares a `monitoring` edge at all.

### The instruments
Nine fitness functions (FF-5201…FF-5209, 18 legs in `test/arch/acd-loop-*.test.mjs`) hold the structure —
that the registry is not an item type, the module import boundary, the thirteen frozen vocabularies, the
real registry parsing, check purity and determinism, timescale domain, command-surface route-only,
Mermaid byte-freezing and the finding envelope. Six behavioural suites (139 cases over
`test/support/loop-registry-fixture.mjs`) hold the behaviour, and
`test/work-loops-coverage-ledger.test.mjs` re-derives the feature-to-suite traceability on every run —
323 scenarios and 461 rows across 28 tables, each with a deciding assertion or an exclusion whose
pointer is looked up in the gate module rather than transcribed.

## Assumptions

- **The registry is hand-authored** — no writer ships in this milestone; every record is authored and
  reviewed as markdown, and nothing stamps or regenerates one.
- **Pointer syntax only** — a `module:`/`command:`/`config:` pointer is validated for shape, never
  resolved against live data (ADR-003). A renamed symbol rots the pointer and this milestone does not
  notice; resolution needs provenance stamped at write time, which arrives in 55.
- **The checks report; they do not enforce** — all five pathologies are `warn`-severity findings and
  `validate` exits 0 in their presence.
- **The registry describes machinery, never duplicates it** — `run-resilience` points at the run store's
  transition validator and classification rather than restating them, so those facts have one home.
- **Every string comparison is code-unit lexicographic, never locale collation** — the determinism
  claims hold across machines only under that rule.
- **The rendering is a text artifact, not a face** — ADR-009 chose Mermaid, and no `ui/` surface,
  `DESIGN.md` or design-conformance lane exists for this milestone.
- **`work:loops` ships without an `/aof:*` bundle wrapper** — a named departure from the house rule
  (ADR-008), on the grounds that no ACD phase consults the loop graph yet. The discharge trigger is
  named: the milestone that first makes a phase consult it ships the wrapper with the caller.

## Gaps

### No monitoring edge exists anywhere in the registry
- **Status:** open
- **Discharge condition:** a record declares a `monitoring:` edge whose endpoint resolves, dropping
  `loop-unpaired-optimizer` below three.
Three loops declare `optimizing: true` and none has an inbound monitoring edge, so the graph states that
aof runs three optimizing loops with no counter-metric. The edge type is admitted by the vocabulary and
declared by nobody.

### Six of the seven loops have no owner, and two have no ceiling
- **Status:** open
- **Discharge condition:** each record's `owner:` names a real actor and each uncapped loop declares a
  `ceiling:`, dropping `loop-owner-unknown` and `loop-ceiling-uncapped` to zero.
`verify-triage-accept` is the only loop with a declared owner. The registry declares what aof does not
know about its own machinery rather than guessing it.

### The graph is ungrounded almost everywhere
- **Status:** open
- **Discharge condition:** 55's anchors and the frozen ground set land, at which point groundedness is
  enforced rather than reported.
One node (`actor:operator`) declares `ground: exogenous`. Seven of the nine strongly-connected components
have no path to it, and the two that do report `loop-graph-grounded-exogenous-only` because the
vocabulary admits exactly one ground class.

### The checks have no teeth
- **Status:** open
- **Discharge condition:** milestone 55 lands enforcement — anchors, the frozen set, and a non-zero exit
  on a structural finding.
`work:loops validate` exits 0 on all 40 findings. Nothing in the ACD lifecycle consults the loop graph:
no phase reads it, no gate blocks on it.

### The registry declares what runs; nothing drives it
- **Status:** open
- **Discharge condition:** milestone 53 ships `aof work loop` — the engine that composes through
  `command.run(input, {workspace:{workDir}})`, the seam this milestone's command suite pins.
The `observe→tune` loop is deliberately absent: its actuator does not exist, and 62 declares it when
`tune` does.

### Four ruled contract corrections are outstanding in accepted stories
- **Status:** open
- **Discharge condition:** `TECH_DEBT.md` item 53 is paid — two `.feature` cells corrected and three
  boundary rows added, each followed by the assertion it licenses.
F-52-05-A, B, F and G are wording and case-design defects in 52/00's and 52/02's frozen contracts, ruled
at accept with the code confirmed correct in every case. None is a source defect and each disagreement is
already driven on disk in both readings.

### `aof:verify` still accepts a narrative evidence claim
- **Status:** open
- **Discharge condition:** `aof:verify` requires, for every `@executable` feature it accepts, a suite path
  that exists on disk and is registered in `scripts/test.mjs`.
This is the open half of `TECH_DEBT.md` item 48, and it belongs to the aof product rather than to this
milestone. The gap it names is the one that let three of this milestone's own stories reach `done` on
fixtures that were never landed.
