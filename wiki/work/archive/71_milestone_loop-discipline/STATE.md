---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). This is the running NARRATIVE.
-->
# 71 · Loop discipline — State

## Progress

- **2026-09-01 — refined** (`aof:refine 71 --autonomous`). `ARCHITECTURE.md` authored (8 ADRs,
  6 fitness functions, all `pending`); broken down into **four** stories, each with its task
  contract authored in the same pass. Nothing built.
- **2026-09-03 — milestone gate run** (`aof:verify 71`). **71/02 and 71/03 ACCEPTED** — lanes 54/54
  and 15/15 green, FF-7102 observed red under four plants and restored by sha256, all fifteen
  rendered runtime copies byte-exact, `OUTCOME.md` authored for both, `SPEC.md` ticked. All four
  stories are now `done`. The whole suite ran once here: **8,395/8,403**, the eight failures each
  named and routed and none of them 71/02's or 71/03's. **The first gate pass REFUSED the milestone**:
  FF-7106 was still declared and still unresolved (F-71-A), which the accept rule refuses regardless
  of its `pending` marker.
- **2026-09-03 — chore 89 run, and the gate cleared.** The declaration was kept rather than dropped —
  chore 89's Definition of Done cited the register as its specification, so unsaying it would have
  destroyed the chore's contract. FF-7106's control was landed and registered, proved non-vacuous by
  plant, and **observed red under three probes**: a real open story's `files:` missing its siblings;
  the per-member render reverted to id-matching (which loses the codex skill render); and the status
  read replaced with the shape that keeps a CRLF `\r` (which widened the horizon to 33 violations
  across four accepted stories). Chore 89 → `done`.
- **2026-09-03 — 71 ACCEPTED.** Second gate pass: `aof work validate 71` PASS, `aof work doctor 71`
  **no `control-unresolved` at either severity**, all six declared controls resolving with a recorded
  red probe each. Whole suite **8,419/8,430** — eleven failures, every one attributed and none of them
  71's (four are chore 88's, three are 72's refine, three are 72's build running concurrently in this
  same tree, one is 63's). `RETROSPECTIVE.md` written (**R1–R8**), `aof work memory ingest` run
  (1,785 records reindexed), `OUTCOME.md` authored, and this document compacted with its
  `## Feedback (for retro)` section archived.

## Notes & decisions in flight

- **Scheduled 2026-08-16** from `PRD-acd-loop-performance.md` levers (a), (b) and (c), reshaped by
  `RESEARCH-agent-loop-economics.md`.
- **Correction to the PRD's framing, carried from the research.** The PRD and the issue doc both
  describe the *build* loop as the uncapped one. Re-reading the prompts, build has a terminator and
  **review does not**. The cap moves to review. Build gets a *failure-to-progress* bound instead of
  an iteration count — stop after two consecutive rounds with no reduction in the failing-scenario
  count — which is a stronger condition and needs no arbitrary N.
- **The design-lane fix is a gate, not a deletion.** The lane catches real design gaps cheaply at
  build. What it must stop doing is running against surfaces it is known to be unable to render.
- **Open question for refine — ANSWERED 2026-09-01 by ADR-003.** Four ordered questions at the review
  close, first answer wins: a locked-contract change is an **amendment** (no item); a finding
  discharged by a checklist with no new criteria becomes a **top-level chore**; a finding needing new
  acceptance criteria **stops the loop and asks the operator**; anything else stays a **recorded
  finding**. The backlog bound is structural, not numeric: the loop's creation authority is exactly
  one type (`chore`) in exactly one place (top level, invisible to the walk that created it), it never
  creates a story or a milestone, promotion appends and is idempotent per finding — and the eligible
  population is already throttled by 83's reporting bar.

  The candidate rule considered at refine — promote to a *story under this milestone* — was
  **rejected on a measured fact**: `work next <NN>` would return it as ready and the walk would build
  and review it inside the same pass, converting a capped round loop into an uncapped story loop.
  That is precisely the failure this note predicted.

### Scope already delivered upstream — NOT re-opened here

Measured at refine against the tree, and recorded so no story rebuilds it:

- **The round cap, the stall detection and the reporting bar** shipped with story **83**
  (`<review_rounds>` / `<stall_detection>` in `continue.md`; `aof-architect.md:117-119`). SPEC's
  "Reviewers told what to report" bullet is **done**.
- **The loop registry's `ceiling:` fields** no longer read `uncapped` — both framework loop records
  point at `config:work.loop.*`, guarded by `test/arch/acd-no-uncapped-framework-loop.test.mjs`
  (milestone **69**). That SPEC bullet is **done**; only the stale `dist-sea/` build artefact still
  carries the old word.
- **The values themselves** live in `src/loop-bounds.mjs` (69). 71 speaks them; it does not invent
  or move them.

### The Three Amigos pass found six defects in the ADRs — ratified in the same beat (ADR-009)

The QA and developer passes ran against the ADRs and returned six things the architecture had wrong.
They were sent back and ratified **in this beat**, which is ADR-007's own rule applied to itself; the
architect disputed none. ADR-009 carries all nine deltas rather than editing seven accepted decisions
(62/ADR-011–013's precedent). Four register rows were rewritten:

- **FF-7103 leg (c) contradicted a delivered contract** — it forbade a caller-chosen `at`, but
  `work:promote-gap` ships `--at` and its suite passes `at: 0` at seven sites. Split at the seam where
  the claim is true: the operator's flag survives, the **loop's** call site takes no position.
- **FF-7104 was red on landing** — its sweep false-positived on live code (`src/phase-brief.mjs:309,311,470`,
  `src/memory/local-indexing.mjs:70`). Re-scoped to a promotion signature.
- **FF-7106 missed the real generated siblings** — the bundle renders to **git-tracked** copies under
  `.claude/`, `.codex/` and `.opencode/`; the control stopped at `manifest.json`, so it would have
  passed a story leaving three tracked files stale. Widened to `renderBundleOutputs() ∩ git ls-files`.
- **FF-7101 leg (b) had a proximity trap** — after 71/00's edit the numeral `3` sits beside
  `work.loop.reviewRounds`, whose default is `1`. The control now binds a value to the **clamp name**.

And two ADR claims were corrected: **`work.ui` is `additionalProperties: false`** (ADR-005 §3 claimed
otherwise, so `work.ui.renderer` needs a schema edit), and there are **three** arch tests guarding the
`npx playwright` clause, not two — `acd-design-role-split.test.mjs:91` was missed.

**The sharpest gap, which neither the SPEC nor the first ADR pass had:** nothing said the gate ladder
re-runs after a fix round. Without it, ADR-001's safety argument for delta re-review does not close —
a fix that reddens validate or doctor would be caught only by lenses ADR-007 has just decided not to
re-spawn. Decided (ADR-009 §A): **the ladder re-runs after every fix round, and a red ladder does not
consume a review round.**

Also decided: the triage rule and the mode derivation land as **code** (`routeFinding()`,
`decideExecutionMode()` in `src/work-loop.mjs`) rather than prose, which is what makes their contracts
testable rather than grep-shaped; the render invocation carries `--window-size` (dropping it would
have been a silent regression wearing a mechanism swap's clothes); "resolvable renderer" means
exists-and-executable with **glob, not template** discovery; a throwing gate rung is a red rung; and a
deduplicated Blocker re-spawns exactly one lens, chosen by claim class.

### Default decisions taken under `--autonomous`

- **No `/aof:` command wrapper for the finding promoter** (ADR-004) — a door is a second entry point
  that bypasses the triage rule; `work:promote-gap` shipping without one is the precedent. Cheaply
  reversible: it costs 71/01 nothing it does not already write.
- **The spawn stagger is prose, not a ninth `work.loop.*` knob** (ADR-006) — an ordering hint with no
  declared range is nothing `61/ADR-009`'s range probe could evaluate.
- **Four stories, not the five the concern-cut suggested** (ADR-008) — execution-mode derivation and
  amendment ratification ride 71/02 rather than buying their own serial beats.

### Carried forward, not blocking

- **The render supersession touches another milestone's delivered contract.** 07/02's `.feature`
  files lock `npx playwright` into `continue.md` and `verify.md`. They are **immutable** and are not
  touched; the superseding rule is stated in 71's own contract and the two arch tests (which are
  code) are amended. Recorded here because a reviewer meeting the diff cold will otherwise read it as
  a contract breach.
- **A recommended `TECH_DEBT.md` entry, not written by this pass:** the prompt layer's duplication —
  `continue.md` is ~300 lines and four sites carry ~10 KB of duplicated graph-grounding prose. SPEC
  puts prompt-layer size reduction **out of scope** and it stays there; no existing entry covers it.
- **`aof work doctor 71` reports `verification-register-missing` at `error`** — as does every
  milestone between refine and verify, since `VERIFICATION.md` is authored at `aof:verify`. It is
  excluded from the loop gate by `54/ADR-007` and `aof work validate 71` passes. Raised as feedback
  rather than worked around.

## Verification

- [x] `@executable` suite green — per-story lanes 41/41, 94/94, 54/54, 15/15; whole suite 8,419/8,430
      at the gate with all eleven failures named and attributed to other items (`VERIFICATION.md`).
- [x] Fitness functions green — all six declared controls resolve, each with a recorded red probe.
- [x] `@manual` — **no `@uat` scenario exists in this milestone**, so no human sign-off applied and
      none was solicited; there is no `UAT.md`. Of nine `@manual` scenarios, two are discharged, one
      partially, and six wait on a run record (F-71-B, F-71-G).

## Feedback (for retro) — ARCHIVED at the close, 2026-09-03

The six running notes this section carried were triaged at the milestone gate and have GRADUATED
into `RETROSPECTIVE.md` as lessons **R1–R8**, exactly as durable decisions graduate into ADRs. Two
of them had already become work items before the gate, by the triage rule this milestone shipped:
the three inherited arch-test reds are **chore 88**, and FF-7106's missing owner is **chore 89**
(run to `done` at the gate — it is what cleared the accept). The two that are neither a lesson nor
a chore are carried below.

- **`verification-register-missing` at `error` between refine and verify** — every milestone that
  declares fitness functions before `aof:verify` authors `VERIFICATION.md` carries it. Excluded from
  the loop gate by `54/ADR-007`; worth deciding whether the finding should be acceptance-horizon-
  scoped like `66/ADR-002`'s other checks, or whether the scaffold should ship an empty register.
- **Line-number citations into hand-wrapped prompts drift silently** — five in `src/bundle/loops/*.md`
  were already wrong before 71 widened them. The durable shape is the one 71/00 used for its own
  controls: cite a MARKED REGION (`<build_terminator>`, `<gate_ladder>`, `<review_rounds>`) and have
  the loop-record resolver check the anchor resolves. Not this milestone's to fix — outside every
  story's declared `files:`.
- **The work-stream READ path serves a stale mesh projection while the WRITE path reads the local
  record** — observed four times across this milestone; `aof work status <ref>` answered
  `not-started` for stories whose records read `done`, every answer stamped
  `answeredFrom: "cache"`. It matters beyond cosmetics: `continue.md`'s milestone walk loops on
  `work next`, so a stale cache can re-offer a story that is already built and reviewed. Worth
  deciding whether the read path should prefer the local record when its `updated:` is newer than
  the projection's `syncedAt`, or invalidate on local write.

