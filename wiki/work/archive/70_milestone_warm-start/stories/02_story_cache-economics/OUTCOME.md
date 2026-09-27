# 02 · Cache economics per phase — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### The cache ratio, reported per phase from the run record
`aof work observe` reports `cacheRead ÷ cacheCreate` for every phase of an item's runs, derived from
the `spend.tokens` buckets milestone 68 writes and never re-counted from a transcript.

### Phase read from the loop's own declaration, with no rival column
Runs are grouped by `brief.loop.phase` and by nothing else; a run the loop did not mint reports under
an explicit "no declared phase" row carrying its own figures, rather than being folded into a phase
or dropped.

### An unmeasured run is unmeasured, never a zero
A run carrying no `spend` envelope is counted in `unmeasuredSpend`, excluded from the ratio, and
reported as `unmeasured` — it is never a `0.000` that would read as a cache failure.

### Three non-arithmetic cases each carry their own reported state
`cacheState` is `measured`, `unbounded` or `unmeasured`: cache reads with no creations is a warm phase
reported `∞ (warm, unbounded)` rather than a division by zero; creations with no reads is a measured
`0.000` distinguishable from an unmeasured phase; measured runs that populate neither cache bucket are
`unmeasured`, because there is no cache signal to divide.

### A stated target turns the ratio into a per-phase verdict
`work.observability.cacheRatioTarget` yields `met` or `missed` per measured phase — at the target is
met — and the target it was judged against is stated in the report beside the verdicts.

### An absent or unhonourable target is a first-class silent case
No target, a non-numeric target and a negative target all resolve to `cacheTarget: null`: no verdict
is stated, none is invented, and the ratio is reported unchanged in every case.

### An unmeasured phase is never judged missed
A phase with no cache signal carries no verdict under a configured target — `cacheVerdict` is `null`
and the row reads `—`, so a missing measurement cannot be mistaken for a failed one.

### The verdict changes nothing about any run
`applyCacheTarget` returns a new rollup and mutates neither its input nor any run record; no run is
failed, retried, capped or killed on a verdict. The milestone records and does not enforce (ADR-008).

### The reporting leaf still writes no record and adds no key
`src/work-observe.mjs` reads what milestone 68 made true; `src/run-store.mjs` and its seventeen `src/`
dependents are untouched by this story, and the run record's shape is unchanged.

## Assumptions

- **The four token buckets are mutually exclusive and writer-enforced** — the ratio is only meaningful
  because 68/ADR-003 refuses overlapping `input` / `output` / `cacheRead` / `cacheCreate` at the write
  path; nothing in this story re-checks that at read time.
- **`brief.loop.phase` is the one phase authority** — a run minted outside the loop shell has no
  phase, and this story mints none for it (68/ADR-002).
- **A measured run is one carrying a `spend` envelope** — the presence of `spend`, not the size of its
  numbers, is what separates measured from unmeasured, so a genuinely free run (`costUsd: 0`) is
  measured while an un-instrumented one is not.
- **The configured target is read from the workspace config at the command, not from the run record**
  — a report re-run after the target changes reports different verdicts over the same runs, because
  the verdict is a reading rather than a stored fact.
- **`cacheState` is the field a consumer branches on** — `cacheRatio` alone does not separate a warm
  phase from an unmeasured one across the `--json` door (see Gaps).

## Gaps

### No target value is chosen, so no verdict is stated anywhere in this repo
- **Status:** open
- **Discharge condition:** a measured run under 70/01's flags reports a ratio, and a
  `work.observability.cacheRatioTarget` is set in `.aof/aof.config.json` from that observation.
The story ships the target mechanism; the number itself was deliberately left unchosen at refine so it
could be measured rather than guessed (STATE § Still open). Until it is set, every phase this repo
reports carries `verdict: —`, and the milestone's own before/after question is answerable only by
reading the ratios by eye.

### The ratio has nothing to measure until runs carry spend
- **Status:** open
- **Discharge condition:** run records in this repo carry `spend.tokens` with populated `cacheRead`
  and `cacheCreate` buckets under 70/01's launch flags.
Read at the real door at this gate, every existing run record in the stream reports `unmeasured` —
the report is correct and honest, and it is also empty of cache signal. This story delivers the
reading, not the measuring; 70/01's gap *"the cache saving this launch exists to produce is not
measured here"* is therefore only half-discharged by this story's landing.

### A misconfigured target is reported as an absent one
- **Status:** open
- **Discharge condition:** `work.observability` is declared in `schemas/aof.schema.json`, named in
  `README.md`, and the unhonourable case names the configured-but-unusable value instead of claiming
  absence.
A `cacheRatioTarget` of `"1.5"` or `-1` renders byte-identically to no target at all — *"No
cache-ratio target is configured"* — while `observability` appears nowhere in the config schema (whose
`work` object is open, so the key is legal and wholly unvalidated) and nowhere in `README.md`. The
declared behaviour holds in every case; the sentence an operator reads is what does not.

### The unbounded case does not survive the `--json` door
- **Status:** open
- **Discharge condition:** a warm phase is distinguishable from an unmeasured one by the ratio field
  alone across the JSON door, or `cacheState` is documented as the field a consumer must branch on.
`cacheRatio: Infinity` serialises to `null`, the same value an unmeasured phase carries, so a JSON
consumer reading `cacheRatio` alone folds a fully warm phase — the milestone's best possible outcome —
into "no measurement". The markdown door renders `∞ (warm, unbounded)` correctly.

### The report is read on demand and nothing watches it
- **Status:** open
- **Discharge condition:** a scheduled or loop-driven path produces the ratio and surfaces a missed
  target without a human running `aof work observe`.
The story's user story asks that a prefix which silently stops being shared be visible *the week it
happens*; what it delivers is the measurement that would show it. Nothing runs the report on its own,
so the visibility is available rather than automatic.
