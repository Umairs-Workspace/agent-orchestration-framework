# 57 · Paired loops — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.

  MILESTONE LEVEL, AND AUTHORED RATHER THAN CONCATENATED. Where a story states a capability whole,
  it is CITED (`m57/SS/<id>`) and not restated: `aof work memory ingest` unions every item's records
  into one recall surface, so a milestone that repeats its stories writes one fact twice and every
  later recall has to dedupe it. What is below is true AT THE MILESTONE LEVEL and stated by no single
  story's outcome alone.
-->

## Delivered

### Every optimizing loop `aof` runs is watched, and an unwatched one stops the run
`aof work loops validate` over `.aof/loops/` reports 14 records including 3 watchers, **0 errors, 39 warnings and exit 0**, with zero `loop-unpaired-optimizer` — where the same command over the same registry reported three before this milestone.

### The pairing is a fact about aof's own tree, not a rule aof ships to other repositories
The three watcher records are both bundle members and installed records: `.aof/loops/` carries them byte-identically to their `src/bundle/loops/` sources, so the framework satisfies the rule it enforces, and `FF-5313` fails if a shipped loop record is ever left uninstalled.

### A counter-metric that reports nothing reports that it measured nothing
Both counter-metric commands refuse a number rather than inventing one — `work:counters` returns `status: "unmeasurable"` with no `count` key at all, and `work:ratchet` returns `ratchet-base-unresolved` with **no legs computed** and exit 1. Two stories arrived at the same refusal independently, so a watcher that has never observed anything cannot satisfy the pairing gate with a zero.

### Day one carries no judges
All three shipped watchers declare `determinism: counter`, and `loop-watcher-is-judge` — a permanent, non-gating census — reports zero on the shipped table.

### Independence cannot be declared by anything, including the framework itself
No node kind admits an `independence` key and no loop may name its own watcher, in the shipped grammar and in every record installed: the property is computed from parsed records on four legs, each with its own finding code. See `m57/01` for the legs.

### Every structural invariant this milestone declared is enforced and has been seen to fail
Eight declared controls, all landed, none carrying `pending`, each red-probed — 49 probes, each restored byte-exactly with its control re-run green on the restored bytes. Two of the eight extend guards already in service rather than adding siblings.

### The framework's own build loop has a counter-metric that a machine produces
`command:work:ratchet` resolves to a registered route, and each watcher's `measurement` pointer resolves to a registered command or an exported symbol — a declared counter that pointed at nothing would be `FF-5707`-red rather than merely unhelpful.

## Assumptions

- **`optimizing: true` is the whole population to be watched** — the table is complete against the loops that declare it; a loop that optimises without declaring it is unwatched, and the gate cannot see that it should be.
- **The counters read records that already exist** — nothing in this milestone writes an instrument, so a quantity nobody records stays permanently unmeasurable rather than becoming measurable later by itself (`m57/04`).
- **A counter-metric being *deterministic* is a declaration, not a proof** — `determinism: counter` is admitted on any record whose `measurement` resolves to something runnable; whether the number it produces means anything is not decidable from the record and is not checked here.
- **The contract-integrity ratchet measures an item that has been committed while `in-progress`** — an item whose record only ever reached `in-progress` in a working tree has no baseline, and the ratchet refuses rather than approximating one (`m57/03`).

## Gaps

### Nothing audits whether the instruments still measure anything
- **Status:** open
- **Discharge condition:** milestone 59 — the instrument audit named in this milestone's SPEC as explicitly out of scope.
- Pairing assumes each counter-metric measures the quantity it names. Every check here is over the *records*: that a watcher exists, is independent, and cites a resolvable instrument. No check compares a counter's output against reality, so a watcher whose command silently returns the same number forever is green on every leg.

### The build loop's counter reads nothing when pointed at a milestone
- **Status:** open
- **Discharge condition:** `work:ratchet` either descends into child items, matching `work:counters`' scope rule, or gains a fourth disposition for an empty population.
- `aof work ratchet <milestone>` gathers features from `<itemDir>/tasks/**` alone, and a milestone folder has none, so it reports `contract: clear (0 → 0)` — a clean bill from a measurement that read nothing, over an item whose stories carry 22 executable scenarios. Its sibling counter refuses exactly this shape (`F-57-M-6`).

### No work record carries an acceptance timestamp
- **Status:** open
- **Discharge condition:** a work-record acceptance field with a writer, after which the escape counter reads it instead of `updated:`.
- The finding-escape counter approximates acceptance with the record's `updated:` stamp, which `aof work status <ref> done` writes. A later hand-edit that bumps `updated:` moves the boundary forward and can only remove escapes (`F-57-04-1`).

### Holdout scenario authoring is not here
- **Status:** open
- **Discharge condition:** none scheduled — SPEC places it outside this milestone as its own arc.
- The cleanest structural answer to build-loop gaming is a QA-authored case set withheld from the maker until accept. The contract-integrity ratchet detects a contract that *shrank*; it cannot detect one that was authored small.

### An unpaired optimizer fails the run only where the loop gate is invoked
- **Status:** open
- **Discharge condition:** a later milestone adds the loop lane to `work:doctor`, which ADR-003 §5 deliberately declined to do here.
- The gate lives on `work:loops validate`'s exit code plus a step in the `aof:validate` procedure. An operator who runs `aof work doctor` alone sees the findings in the Loop-Ready score but is not stopped by them.
