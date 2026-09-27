# 55 · Anchors & the frozen set — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc —
  SPEC.md remains that.

  AUTHORED at the milestone level, never concatenated from the six story outcomes: the aggregation
  happens in the INDEX (`aof work memory ingest` unions every item's records into one recall surface),
  so a capability a story states whole is CITED here rather than restated.
-->

## Delivered

### aof's own loop graph carries a measured groundedness verdict
`aof work loops groundedness` answers, for this repository, that 11 components stand at 5 anchored / 2
exogenous-only / 4 self-referential, with `loop:autonomous-cascade`, `loop:retrospective-memory-ingest`,
`loop:review-fix-rereview` and `loop:verify-triage-accept` named as anchored by nothing — the taxonomy
(`m55/00`) and the report (`m55/01`) joined into a reading of the real graph rather than of a fixture.

### "Ungrounded" is a computed property of the declared graph, not a judgement about it
A component's verdict is derived by flooding from every node bearing an admitted `ground:` value and
decomposing the graph 52 declared, so the answer changes only when the registry changes — no reviewer's
reading enters it, and the same registry and checkout always produce the same verdict.

### L3 executes, and the gate that opens it is computed from this milestone's own measurements
Milestone 53's locked rung is unlocked (`m55/05`) and admitted only on a Loop-Ready score of 100
together with a groundedness report carrying no `self-referential` and no `stale` component — so the
rung the ladder declares and the ground the loops settle against are one mechanism, not two.

### This workspace has not earned L3, and the refusal says which half and why
`aof work doctor` reports **50% (5/10)** with `grounding`, `anchor-grounding`, `pairing`,
`reference-ownership` and `actuator-arbitration` blocking, and four self-referential components stand
in the report — so unattended self-driving is open in the ladder and closed here, by measurement.

### Every claim aof records is stamped or refused, and every human input is captured verbatim first
The two integrity rules are structural rather than emphasis: a claim without `{node, run, commit, at}`
is refused at the write seam and never back-filled (`m55/02`), and a capture path that accepts a
classification argument does not exist (`m55/03`) — each enforced by a control, not by prose.

### The frozen set names its own anchors, so the milestone's two halves close on each other
`src/bundle/frozen-set.jsonc`'s six members include `anchors` alongside `locked-contract`, `litmus`,
`tag-vocabulary`, `gate-order` and `test-isolation` (`m55/04`), so the taxonomy this milestone declares
is itself a frozen member compiled to the enforcement boundary aof owns.

### Eight architectural controls, every one watched to fail in the form it shipped
FF-5501…FF-5508 are landed, registered in the runner's own labelled milestone-55 blocks, green, and
each carries a red probe performed against a real source edit restored byte-exactly afterwards — the
two that act on a guard already in service (FF-5503 extends, FF-5508 supersedes) probed on the
extension and the replacement rather than on the surviving legs.

## Assumptions

- **The registry is the whole subject** — every groundedness verdict is a claim about the declared
  loop records, so a real feedback loop nobody has declared is invisible to the report rather than
  reported as ungrounded.
- **`stale` is a claim about one checkout** — anchor authorities are resolved against the working tree
  the command runs in, so the same registry can read `anchored` on one machine and `stale` on another.
- **An authority's existence is checked, its behaviour is not** — an anchor's `observes:` pointer is
  proved to name a real exported symbol, a registered command or a declared config key; nothing asserts
  that it still measures what the record's body says it measures.
- **The enforcement points are the ones aof already owns** — merged `.claude/settings.json` permissions
  and hook entries, and agent tool scope; no general policy engine was introduced.
- **The full lane is reproducible only to ±1** — the milestone gate's authority rests on set-difference
  over failure names and causes, never on the count, because the lane carries one intermittent
  environmental failure per run.

## Gaps

### Three of the six ground classes have no anchor in this repository
- **Status:** open
- **Discharge condition:** a defensible authority exists here for `build-stamp`, `landed-commit` or
  `frozen-rule`, and a record declaring it cites the evidence in its body.
`process-exit` and `live-soak` each have one declared framework anchor; the other three classes are
declarable and undeclared, which is why four loops the report names stay unanchored rather than being
given a fabricated edge.

### No groundedness reading is persisted, so nothing can be audited over time
- **Status:** open
- **Discharge condition:** a stamped groundedness reading is written through `m55/02`'s envelope, or
  milestone 78's per-item loop execution record lands its unresolvable-authority row.
The report answers only for the instant it runs: a component that drifted from `anchored` to `stale` is
indistinguishable from one that was never anchored.

### `gate-order` is a declared frozen member with no compiled output
- **Status:** discharged (63/02, 2026-09-02)
- **Discharge condition (as written):** `gate-order` compiles to the mesh worker launch envelope
  instead of appearing in `compileFrozenSet(...).deferred`.
Measured at `aof:verify 63`: `compileFrozenSet(bundledFrozenSet()).deferred` is `[]` and
`unattendedLaunch` is `{ memberId: "gate-order", program: "aof", args: ["work","loop"] }`.
The envelope has a spelling and no enforcement, reported by name rather than silently omitted.

### This repository still runs the pre-55 hand-wired isolation hook
- **Status:** discharged (story 87, 2026-08-27)
- **Discharge condition (as written):** `aof work update` is run here, replacing
  `.claude/hooks/aof/guard-test-isolation.mjs` with the compiled member.
- **Route actually taken:** the condition's route was **withdrawn** with the member. Story 87 unshipped
  `test-isolation` from the frozen set and its guard from the bundle, so no update can install it here.
  The file was replaced **by hand** with the same compiled predicate — hand-owned, on a settings entry
  carrying no `aofManaged` marker, so aof neither adopts, edits nor retracts it.
The gap closes on its **substance**: this tree runs the segment- and token-aware predicate rather than
the 1,983-byte hand-wired one that over-blocked commands merely mentioning the suite path. Its cases are
re-homed with it, onto the file this repository executes (`test/repo-test-isolation-guard.test.mjs`).

### One control was re-aimed without a declaration ratifying it
- **Status:** open
- **Discharge condition:** milestone 69's FF-6908 register entry records the re-aim from a whole-file
  byte-freeze over `src/run-store.mjs` to a `buildRecord` key-list assertion.
The re-aim happened in a diff and kept a planted-key probe, but the declaration it answers to still
reads as the byte-freeze it no longer is (`F-55-02-2`).

### The milestone gate's own measurement is not reproducible, in two independent ways
- **Status:** open
- **Discharge condition:** process isolation for the spawning suites **and** a gate that measures a
  fixed revision rather than the working tree — milestone 59's instrument audit.
Every run of the ~6,900-test lane carries one intermittent environmental failure, a different test each
run (`F-55-M-6`); and the lane has no exclusive hold on the tree it measures, so a concurrent session
writing `src/` mid-run changes the subject under it (`F-55-M-7`). The gate that decides whether a
milestone poisoned the repository is therefore answerable only by set-difference over failure names and
causes, never by its own count.
