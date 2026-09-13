---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 53 · The loop as a CLI artifact — State

## Progress

<!-- Story-by-story, mirroring the SPEC Stories list. The source of truth for each story's status
     is its own STORY.md frontmatter; this is the at-a-glance roll-up. -->

Broken down 2026-08-15 (`aof:refine 53 --autonomous`). **07 added and refined 2026-08-15**
(`aof:refine 53/07`). **00, 01, 03 and 07 start concurrently** — disjoint file sets, disjoint
source-side imports. 02 joins when 00+01 land; 04 when 02 lands; 05 closes.

| Story | Status | Notes |
|---|---|---|
| `00_story_session-driver-extraction` | **done** | built + reviewed 2026-08-16 (`aof:continue 53/00 --solo`); reopened 2026-08-17 and task 01 unticked. **Three Amigos refinement complete 2026-08-17 — developer feasibility CONFORMS:** closed ten-name allowlist; 42 untouched importers + one named re-aimed gate; 48 fresh links + static/link-only pin CLI; unchanged session-id module 8/8 and combined eight-module lane 33/33 after the narrow explicit-null fixture correction; three inward-consumed names. ADR-015 §2 and the partition now assign these consequences to 53/00, not 53/05. Whole-story pre-existing test-tree ceiling: three already delivered source gates + the one newly authorised recorder fixture |
| `01_story_loop-engine` | **done** | pure leaf, zero imports. ~~`aof work validate 53` is RED on its `04_gate-order-and-cap.feature:20` (VERIFICATION F-08)~~ — **cleared: `aof work validate 53` and `53/01` both PASS at 2026-08-17** (fixed at `084bd1b`). F-08 is stale in `VERIFICATION.md`; `aof:verify 53` clears it |
| `02_story_command-surface` | **done** | the impure edge; phase drivers checkpointed at `7ca1440` **Milestone gate 2026-08-20: owned F-14/F-15 (ADR-005 command↔route bijection + registry census) and F-16 (m42 `acd-console-log-confined`, both lanes), none visible from this story's own gate. ALL THREE FIXED INLINE at verify — and `src/board-ui.mjs` was not edited, so the partition's freeze held.** |
| `03_story_loop-ready-score` | **done** | independent of 00/01/02, FIXTURE-coupled to 07. Scorer checkpointed at `88a91cd`; envelope contradiction ruled by **ADR-014** (2026-08-16) and the retired-home path language re-aimed per **ADR-015 §3** (2026-08-17), both at `aof:refine 53/03`. Contract and fixture now agree at `.aof/loops`; 33/33 green — `aof:continue 53/03` ticks tasks 00–02 **Milestone gate 2026-08-20: owned F-13 — the scorer's evidence string carried the `work:loops-validate` token m52's FF-5202 bans from any `src/work-doctor*.mjs`. FIXED INLINE (reworded); FF-5202 green, this story's 33/33 unchanged.** |
| `04_story_autonomous-shell-out` | in-review | carries the `@uat` gate. Prompt hand-off checkpointed at `2c744b9` (the source edit is committed; both renders + the manifest are re-rendered in the working tree). Dual-render count contradiction ruled by **ADR-015 §4** and the task-00 contract amended 2026-08-17 at `aof:refine 53/04` — the row closes at exactly two rendered paths. Task 00 unticked for `aof:continue 53/04`; task 01 is the `@uat` soak F-09/F-10/F-11 all **closed**; the `@uat` soak (F-12) is the only remaining gate and is now runnable once the payload is deployed. |
| `05_story_the-fitness-functions` | in-progress | last, deliberately; depends on 00–04. **Three Amigos refinement complete 2026-08-17 — developer feasibility CONFORMS:** ADR-015 §§8/10 permit only the two named milestone-52 accepted-test regions plus directly adjacent explanatory labels/messages/comments; reopened 53/00 separately owns the driver-door correction. FF-5308 now contracts two active milestones, one in-scope ready item and one earlier out-of-scope ready competitor. Tasks 00/04 are reopened for build. The positional-slice violation and missing promised controls remain implementation obligations. All eleven controls landed, registered and green (39/39), each red-probed at the milestone gate. ~~Blocked on F-17~~ — **F-17 FIXED INLINE 2026-08-20**: the positional slice was deleted outright (the fallback probe is anchored, so cutting to the statement was redundant), m47's control green and FF-5310 still green + probed. **The story's evidence is complete: eleven controls landed, registered, 39/39, every one red-probed. It is still `in-progress` and has NEVER been through `aof:continue`'s Review gate — that, and nothing else, is what now stands between it and accept.** |
| `07_story_registry-home-and-delivery` | **done** | refined; fully independent; ready to start **Milestone gate 2026-08-20: owned F-18 — the nine `.aof/loops/` assets were not recognised by ADR-005's generated-stamp contract. FIXED INLINE: each record carries a `# aof-generated:` frontmatter comment (the only form a frontmatter-bearing markdown asset can carry — measured, see VERIFICATION), manifest regenerated, lock reconciled at 0 drift.** |

## Notes & decisions in flight

**COMPACTED AT ACCEPT, 2026-08-20.** This section carried 336 lines of build-time
narrative: refinement contradictions raised, measured and ruled across seven stories. Everything
durable in it has graduated, and the blow-by-blow is in git history at the accept commit.

Where it went:

- **The rulings** → `ARCHITECTURE.md`. **ADR-014** (the doctor envelope contradiction, 53/03),
  **ADR-015 §§1–10** (the nine refinement contradictions, all resolved the same way — *the instrument
  was wrong about the tree, not the rule*) and **ADR-016** (53/04's contract ruling and developer
  feasibility). Sixteen ADRs stand in that file.
- **The lessons** → `RETROSPECTIVE.md`, as **R1–R9**. R1 carries the ADR-015 pattern itself.
- **The defects** → `VERIFICATION.md`'s `## Findings` register, **F-01…F-21**: thirteen closed, one
  waived (F-12), seven open and routed to milestone 66, to the product owner, or to the backlog.
- **The delivered product state** → `OUTCOME.md`, with its assumptions and its six declared gaps.

## Feedback (for retro)

**ARCHIVED AT ACCEPT, 2026-08-20.** 391 lines of build- and review-time feedback
were triaged into `RETROSPECTIVE.md` as R1–R9. The section is kept as a heading so the next milestone's
`aof:feedback` has its home; its content graduated, exactly as durable decisions graduate into ADRs.

The nine lessons, in one line each — read `RETROSPECTIVE.md` for what to do about them:

- **R1** — when a contract and the tree disagree, the instrument is usually wrong; measure first.
- **R2** — a milestone's own register cannot see the damage the milestone does to its neighbours.
- **R3** — cross-cutting censuses are part of the story's diff; name them at refine.
- **R4** — a deviation recorded in STATE is a deferral, not a discharge.
- **R5** — a whole-tree snapshot hash fires on the wrong story, by construction.
- **R6** — a stamp contract written for one file type is a contract about that file type.
- **R7** — verify a milestone on a branch carrying that milestone's work.
- **R8** — the human gate was waived; the loop has never run once for real.
- **R9** — red probes are cheap, and they are the difference between a gate and a comment.

## Verification

- **53/04 black-box launcher exposed a Windows ConPTY cleanup defect, fixed 2026-08-17.** The exact
  source-local child drove real provider/run-store work to completion, but the CLI stayed alive and
  its fixture cwd remained locked (`EBUSY`) because the driver disposed subscriptions without closing
  the already-exited native PTY handle. The single settle cleanup now calls guarded `term.kill()`.
  Pre-fix: child timeout + locked cwd. Post-fix: b01-b04/h01-h03 exit cleanly, the fixture is removed,
  and the affected driver/loop/bundle lane is 93/93 green. This was missed by feasibility because it
  observed the provider settle, not the parent CLI process exit. **Raised/fixed by:** 53/04 build.
  **Carry to retro:** every promised child-process proof must assert natural parent exit and cleanup,
  not merely an internal outcome.

<!-- Pointers, not restatements. -->
- [x] `@executable` suite green — milestone 53's own seven story lanes **240/240** (2026-08-20). The whole-repo sweep at the same gate is **5,915/5,975**; the sixty reds are attributed in `VERIFICATION.md` (F-13…F-21).
- [x] Fitness functions green — FF-5301…FF-5313 all resolve, all registered, **all green**, and **each carries a red probe** performed at the 2026-08-20 gate. `aof work doctor 53` reports no `control-unresolved` at either severity.
- [x] `@manual` signed off — 53/07 task 06's deployed-payload / foreign-repository lane, see `VERIFICATION.md`.
- [ ] `@uat` signed off — story 53/04's soak (the "proven" gate). **Still open.** F-12's three render/status disqualifiers are cleared (53/00–53/03 are `done`, the prompt change is installed at HEAD, manifest and committed bytes agree); what remains is a real `node scripts/install-local.mjs` payload deploy and an operator present for the run. Not brokered at the 2026-08-20 gate while six blockers are open.
