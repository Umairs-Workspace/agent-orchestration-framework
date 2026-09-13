---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 63 · Event-driven triggers — State

## Progress

<!-- Story-by-story, mirroring the SPEC Stories list. The source of truth for each story's status
     is its own STORY.md frontmatter; this is the at-a-glance roll-up. -->

Broken down 2026-09-01. Landing order **{00 ‖ 01 ‖ 02 ‖ 03 ‖ 04} → 05** (`ARCHITECTURE.md#ADR-009`).

| story | subject | stage | status |
|---|---|---|---|
| 63/00 | the trigger declaration | 1 | **done** (accepted 2026-09-02) |
| 63/01 | the level is a ceiling, not an admission | 1 | **done** (accepted 2026-09-02) |
| 63/02 | the launch envelope compiles | 1 | **done** (accepted 2026-09-02) |
| 63/03 | a mesh assignment resolves to a loop call | 1 | in-review — HELD at accept (`VERIFICATION.md` F-63-B: the `@manual` skewed-pair lane is unrun) |
| 63/04 | the signals that are not the mesh | 1 | **done** (accepted 2026-09-02) |
| 63/05 | the trigger's face | 2 | **done** (accepted 2026-09-02) |
| 63/06 | the loop launch is watched as a loop | 3 | in-review — built + reviewed 2026-09-02, awaiting `aof:verify` |

## Notes & decisions in flight

<!-- Surprises, corrections, mid-build discoveries. Decisions that prove durable graduate to ADRs at
     Accept — don't leave them only here. Strike-through corrected assumptions to keep history honest. -->

- **Shattered 2026-08-13** from `PRD-acd-loop-engineering.md` + `PRD-graph-engineering.md`, taken
  together as one arc.
- **Refined 2026-09-01, autonomously** — Decide + break-down + all six contracts in one pass, with a
  single review at the end. The codebase graph was rebuilt fresh first (14,091 nodes / 34,497 edges,
  `egress: none`) and every story boundary follows coupling `aof graph impact` reported; the two that
  decided the partition are recorded in `ARCHITECTURE.md#ADR-009` §1.

### Default decisions taken (documented, not escalated)

Each was a genuine open question at refine, resolved by default rather than stopping the cascade. Each
is reversible by amending the ADR named beside it.

- **The declaration is `.aof/triggers.jsonc` with a `src/bundle/` source**, not a section of
  `.aof/aof.config.json` — ADR-002 §1. A config key is the shape 55/ADR-006 refuses for anything
  governing autonomy, and it would sit outside the hashed, drift-protected install path.
- **aof ships no scheduler and no webhook receiver** — ADR-003 §1. The OS scheduler, the CI job or the
  existing mesh dispatch is the caller. This turned out to be structural rather than a preference:
  53/ADR-005 put the loop's only launcher behind `cli.launch`, so no in-process path can drive it, and
  a face that wanted to launch would have to become a scheduler or a second launcher.
- **The face RESOLVES and launches nothing** — ADR-003 §2, following from the above. No `--dry-run`,
  because a command with no wet path has nothing to withhold (62/ADR-005 §1's rule, adopted whole).
- **Only the `autonomous` assignment phase moves to a loop call** — ADR-006 §1/§1a. It is the only one
  of the four with a coordinator session to remove; `refine`, `continue` and `verify` — including
  `refine --autonomous`, which cascades *within* the refine phase — stay byte-unchanged rather than
  changing three live paths to buy nothing this SPEC scopes.
- **`gate-order`'s frozen rule is re-declared, not honoured literally** — ADR-005 §1. Its declared
  `{ "argument": "--aof-gate-order" }` names a flag `claude` does not have, so the discharge condition
  55 wrote was never "compile the rule" but "decide what the rule means". Recorded as a lesson in
  `## Feedback (for retro)` below.
- **The cadence grammar is imported through one additive FUNCTION export**, not copied and not made a
  twelfth exported set — ADR-002 §3. 52's delivered `00_frozen-vocabulary.feature:22` freezes the
  loader at eleven **sets**, and a delivered acceptance criterion is immutable; 62/04's `loopPointersIn`
  is the precedent this repeats line-for-line.

### The Three Amigos pass changed the architecture, and that is recorded rather than absorbed

The six contracts were authored in parallel against ADR-001 – ADR-009 and returned **eleven** findings
against them — seven needing a ruling before their story could build. All eleven are ruled in
**`ARCHITECTURE.md#ADR-010`**, the closure round, with six register rows amended. The four that
changed a decision rather than clarifying one:

- **The mesh dispatch argv carries no `--level` at all** (ruling 1, striking ADR-006 §1's original
  `--level <L>`). A level would need a new carrier, and every candidate — a config key, an env var, an
  assign argument — is the operator-editable admission 55/FF-5508 bans. A mesh assignment is the one
  trigger source whose signal carries no level; a run that wants one declares it in
  `.aof/triggers.jsonc` under ADR-004's ceiling rule. So there is nothing to breach rather than a rule
  to obey.
- **The declaration is the sole speller of the unattended program** (ruling 2): the mesh resolver
  returns `{ kind, command, scope }`, not `{ kind, command, program, argv }`. 63/02 and 63/03 build in
  parallel, so two spellers would have gone green in both suites and red only when they met at accept.
  After this there is exactly one program literal in the milestone and it is data.
- **`.gitattributes:12` pins `.aof/**/*.json`, which does not match `.jsonc`** (ruling 4), so
  `.aof/frozen-set.jsonc` already checks out CRLF on Windows against its LF bundle source — the
  byte-identity claims in ADR-002 §1 and ADR-005 fail on a Windows tree and pass on CI. One line,
  `.aof/**/*.jsonc text eol=lf`, owned by 63/00, and FF-6302 now asserts the **property** (every
  `.aof/**` bundle asset target is `eol=lf`-covered, driven from `bundle.json`'s own asset list) rather
  than the line. **On Windows, build 63/00 before 63/02.**
- **ADR-005 §4's "the two pins widen by exactly their deferral lines" was wrong, and the shortfall was
  the sharpest finding of the eleven** (ruling 5). `test/arch/acd-frozen-set-compiled.test.mjs:74-79`
  skips any member outside its own local three-entry map, so editing only `:129` would have **armed the
  fourth enforcement point and blinded its own trace in one commit** — green while tracing nothing,
  which is exactly what that file's header says it was re-aimed to refuse.

Two contract corrections followed the rulings, both in 63/03 and both found by re-reading the
`.feature` rather than trusting the report that said no change was needed: the level Outline asserted
*"the level is written on the launch rather than left for something downstream to default"*, which
ruling 1 inverts; and the story-shaped-ref refusal had its safety half but not its **location**, which
ruling 3 fixes at the control, before a directive is sent, with the counter-case that the same ref on
`continue`/`verify` still resolves.

### Open, and deliberately so

- **A `TECH_DEBT.md` entry is OWED for `src/mesh-worker-execution.mjs`** — a ~1,700-line god-node at 54
  dependents and 29 imports, covered by neither item 10 (`src/` root) nor item 78 (`src/commands/`).
  Every mesh-touching milestone threads one more additive field read into it and none is ever removed.
  Described in `ARCHITECTURE.md#ADR-009` §5 because the architect pass may write only architecture and
  story documents; it must be written before 63/03 lands.
- **`work.controls.runners` is not configured in this repository**, so `aof work doctor`'s leg B — *does
  a runner name this control file?* — does not run for any of the eight declared controls. Not a 63
  defect; flagged here because 63 declares eight controls that leg would otherwise check.

## Verification

<!-- Pointers, not restatements. Measurements live in `VERIFICATION.md`; this is the roll-up. -->
- [x] `@executable` suite green — 288/288 over the six behavioural suites, 2026-09-02
- [x] Fitness functions green — 67/67 over the eight declared controls, each with a recorded red probe
- [ ] `@manual` — two lanes, neither fully discharged: 63/02's end-to-end run is partial (F-63-C) and
      63/03's skewed-pair lane is unrun (F-63-B). There are no `@uat` scenarios in this milestone, so
      no human sign-off applies and none was solicited.
- [x] **F-63-A is FIXED** — `ARCHITECTURE.md#ADR-013` §1's premature-done composition defect was
      routed to `63/06` as that ADR requires, built and reviewed 2026-09-02, and `ADR-016` closes the
      one question §1 left open (what settles a loop run). The story is `in-review`; accepting it is
      `aof:verify`'s call, not the build's.
- [ ] **Milestone accept still needs**: 63/06 accepted, 63/03's `@manual` skewed pair observed (F-63-B),
      63/02's unattended driving run observed (F-63-C), and the full suite run to completion (F-63-E).

## Feedback (for retro)

**ARCHIVED 2026-09-03 at the milestone accept.** The 64 running notes this section carried were triaged at the close and their lessons graduated into `RETROSPECTIVE.md` as **R1-R12**, then ingested into recall via `aof work memory ingest` (1,751 records reindexed). They are not restated here: a lesson that lives in two places drifts in one of them.

The blow-by-blow is recoverable from this file's git history if a later reader needs the raw sequence rather than the distillation.

