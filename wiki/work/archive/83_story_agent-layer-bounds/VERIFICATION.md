---
doc: verification
updated: 2026-08-27
---
<!--
  Story VERIFICATION.md — answers ONE question: is story 83 truly done, and what is the evidence?
  Written at aof:verify 83 --solo. Only sections with content appear (absence is information).
  Parentless story (parent: null) → this is the story's verification record; there is no milestone
  SPEC box to tick. The story DOES carry an OUTCOME.md — story 80 widened ADR-004/006 to every
  delivering item, parentless stories included.
  NO @uat scenarios → no ## User sign-off section (no human was pestered).
  NO UI surface (a CLI/prompt concern, no DESIGN.md) → no design-conformance section.
  NO sibling ARCHITECTURE.md → no FF-NN controls are declared → no ## Fitness functions register.
  The whole test/arch/** lane was still run, and its reds are recorded as F-83-L below.
-->
# 83 · The agent layer's four bounds — Verification

## Method

Lanes in scope: **`@executable`** (all four tasks) + **five `@manual`**, of which two are agent-runnable
and three are longitudinal before/after comparisons. No `@uat`, no UI, no design-conformance lane.

Run **solo** (`--solo`): no evidence subagent was spawned. Every probe was executed inline by the
product owner who authors this record — also the single writer that allocates the finding ids below,
which is why no id was checked against the register before being allocated.

The suite was run **focused**, never as the whole repo lane (`global-work-propagation.test.mjs` binds
`:4182`, which the live control daemon holds) and always under an isolated `AOF_GLOBAL_HOME`, via
test-array imports rather than `node --test` — which passes these files silently with 0 assertions.

## Verification evidence

Run 2026-08-27 at the accept gate, solo (`--solo`): no evidence subagent was spawned, every probe below
was executed inline by the product owner who authors this record. Each row names the procedure and the
observation; the outcome is never restated.

| lane | procedure | result | verifies → |
|---|---|---|---|
| `@executable` (story) | `AOF_GLOBAL_HOME=$(mktemp -d)` + a focused runner importing the story's nine test arrays and every `test/arch/**` array; no `node --test`, which silently passes these files with 0 assertions | 350 suites, 1438 cases, 1433 passed, 5 failed — all four tasks' cases green; the 5 failures are F-83-L, in files this story does not touch | tasks 00–03 |
| `@executable` (task 01) | the two scenarios added at this gate — the `files | an entry naming a section anchor` Examples row, and `a scaffold refine never replaced is named as such` | both green through `validateWork`; `validate.mjs` emits the anchor refusal and the scaffold message | `01_story-context-contract.feature` |
| `@manual` (task 02) | `aof work next --json` at stream scope, reading `wave`/`heldSet` off the real payload | `readySet: 9 → wave: 1, heldSet: 8`; the partition fires and the payload carries both keys the prompt is told to obey | *a real milestone's overlapping stories are serialised instead of racing* — **partially**: the partition is live, but see below |
| `@manual` (task 02) | `aof work next <NN> --json` for milestones 55, 71, 72, 77; and a census of `files:` declarations across all 234 story records | every milestone-scoped ready set is a single member, and exactly **one** story record in the stream declares `files:` (83 itself) | *the partition trades parallelism for correctness at an acceptable price* — **not yet reproducible**: no real milestone has two stories declaring one file, because the field is one record old |
| `@manual` (task 01) | inspection of the shipped read contract in the bundled agent prompts, via the `bundle` and `work-update` suites | the read-depth and escape rule is distributed to every reviewer lens and to `aof-developer` | *an agent that must read outside the declared set reports the gap* — **distribution proven, effect not**: a live build that hits the gap is the only evidence that would close it |
| gate | `aof work validate 83` | `PASS — 83 is well-formed.` | step 4 |
| gate | `aof work doctor 83` | no `control-unresolved` at either severity (the story declares no `FF-NN` register); three warns — `mtime-ahead-of-updated` (cleared by this write), `numbering-gap` (stream-wide), `rubric-join-unchecked` (no `work.rubric.report` configured) | step 4 |

**No `## Fitness functions` register is written, and that is a decision.** This is a parentless story
with no sibling `ARCHITECTURE.md`, so it declares no `FF-NN` controls — and the red-probe obligation
reaches declared `FF-NN` ids alone, never every assertion in a behavioural suite. `aof work doctor 83`
confirms it: zero `control-unresolved` findings at either severity. The `test/arch/**` lane was still
run in full, and its five reds are recorded as F-83-L rather than inherited silently.

**Three `@manual` scenarios are longitudinal and remain unmeasured.** Task 00's *"the bar changes what
reviewers report"*, task 02's *"an acceptable price"* and task 03's *"a real story's review converges in
one round"* each compare a before-milestone against an after-milestone. They cannot be answered by this
story's own gate — the after-population is one story deep — and the story's own Notes already say so:
*"FIX-1 can prove distribution but needs longitudinal measurement to prove effect."* The story's
`observability/` snapshot carries **0 agent runs across 0 sessions**, so it supplies no substitute. They
are recorded here as OPEN measurement, not as passes.

## Findings

Re-assessed 2026-08-24 against the **reworked** change set, which moved FIX-3 and FIX-4 out of prompt
prose and into code. Ids are allocated here by the single writer of this record. Two lanes ran on the
first pass (`aof-architect`, `aof-qa`); the re-assessment was run by the orchestrator, which
re-measured every carried finding rather than carrying its earlier wording forward.

**No blocking finding is open.** Three of the first pass's findings are now **closed by the rework**,
two were **withdrawn** on the first pass, four remain open, and two are **new** to the reworked code.

| id | finding | severity | route |
|---|---|---|---|
| F-83-A | ~~A second, hardcoded ceiling for a loop that already has one.~~ **WITHDRAWN** on the first pass. The architect read `review-fix-rereview.md:11`'s `reference:`/`measurement:` pointers at `continue.md` as proof the prose and the engine were one loop. The call graph refuted it: `reviewRoundsFromConfig` and `decideReviewGate` are called only from `src/commands/loop.mjs`, and `autonomous.md:33` delegates to that shell. A loop record's `reference:` records where a loop is *documented*, not that the prose is the engine | ~~Blocker~~ → **withdrawn** | none |
| F-83-C | ~~The severity vocabulary is disjoint from the coded one the gate reads.~~ **WITHDRAWN** with F-83-A. The claimed failure routes through `reviewBlockerFromFinding`, whose own comment says it is *"for the locked feature matrix; production callers pass the structured claim emitted by their deterministic producer"*. Production reads a structured, validated claim via `persistedGateBlockerClaim` and never parses reviewer prose | ~~Important~~ → **withdrawn** | none |
| F-83-E | ~~The wave-overlap check is prose where `depends` is code.~~ **CLOSED by the rework.** `src/ready-wave.mjs` now computes the partition deterministically — a greedy, stable walk over `nextWork`'s already-deterministic `readySet`, with case-folded collision keys (right for a case-insensitive checkout). `src/commands/next.mjs` consumes it, so `work:next` returns `wave` and `heldSet`, and `continue.md:86-94` is told to obey `wave` and never recompute or widen it. Verified live: `readySet: 10 → wave: 1, heldSet: 9` | ~~Important~~ → **closed** | — |
| F-83-H | ~~Coverage is distribution-altitude and pins the wrong clauses.~~ **LARGELY CLOSED by the rework.** The suite now exercises runtime behaviour rather than prompt substrings: `partitionReadySetByDeclaredFiles` over real declarations (including a case-only collision and an undeclared write set), and `decideReviewGate` over the config clamp, Blocker dedup, the non-decreasing stall and the refusal of round four. The mutations QA demonstrated no longer pass, because the assertions no longer target prose. Residual: `refine.md`, the load-bearing authoring prompt, is still opened by no test | ~~Important~~ → **closed**, residual Nit | coverage top-up on `refine.md` |
| F-83-I(cap) | ~~The prompt's cap literal can drift from the engine's config key.~~ **CLOSED by the rework.** `MAX_REVIEW_ROUNDS = 3` now lives in `src/loop-bounds.mjs:11` — the existing single bound home — and `resolveReviewRounds` clamps the configured value to it (measured: `reviewRounds: 99` resolves to 3). The counter is code-owned; the prompt documents the policy rather than enforcing it | ~~Nit~~ → **closed** | — |
| F-83-J | ~~An anchored `files:` entry silently serialises the wave, and nothing reports it.~~ **CLOSED at this gate.** `src/commands/validate.mjs` no longer skips `files:` wholesale: an entry resolving to a `path#anchor` is reported as `story files entry "<entry>" must not name a section anchor`, so the write set that `src/ready-wave.mjs` would have downgraded to *unknown* is now refused at validate instead of collapsing the wave silently. Covered by task 01's Examples row `files | an entry naming a section anchor` and green in the `story-context-contract` suite | ~~Important~~ → **closed** | — |
| F-83-K | **A non-story member can never declare a write set, so a mixed ready set always collapses to one.** `src/ready-wave.mjs:13` returns `null` for `member?.type !== "story"`, and `files:` exists only on the story template — a milestone, spike, chore or uat has no field in which to declare one. **Re-measured at this gate and unchanged**: `readySet: 9 → wave: 1, heldSet: 8` — the eight held members are five milestones, two spikes and a chore, every one of them reported held for lacking a field its type cannot carry. Harmless while nothing fans out at stream scope, but `heldSet` currently asserts a write-overlap that was never computed | Important | exempt non-story members from the partition, or report them as unpartitionable rather than held |
| F-83-B | **The fifth copy of the one frontmatter parse, and the first to diverge the grammar.** `src/phase-brief.mjs:212-217` is an in-tree ADR-009 §7 note naming this exact defect species and pricing it: two copies of the expression, one grew `\r?` and the other did not, and 31 of 41 stories lost their dependencies for a year; 201 of 219 story records are CRLF. `src/story-contract.mjs:4` re-types that regex and `src/commands/validate.mjs:15-17` imports the ADR's own module beside the re-spelling. Measured through both readers on one block-list record: `parseFrontmatter` → `{"reads":"","files":""}`, `storyContractList` → the populated arrays. **Re-assessed upward in importance:** the divergence is still latent (no `parseFrontmatter` caller reads either field today), but `src/ready-wave.mjs` is now a live *code* consumer of this grammar, so the second parse is load-bearing rather than validation-only | Important | one grammar, one home — drop block-list support, or widen the shared reader |
| F-83-D | ~~The template default makes FIX-2's hard gate unreachable for every story the framework creates.~~ **CLOSED at this gate**, and closed in BOTH readers rather than only the one that reported it. `validate.mjs` now names both-present-and-empty as the template's own signature — *"story declares neither reads nor files — run `aof:refine` to author the context contract"* — and `src/ready-wave.mjs:24-33` reads the same shape as an UNKNOWN write set rather than a claim to write nothing, so an unrefined scaffold is held rather than parallelised against every sibling. An authored `reads:` with an empty `files:` stays a real claim and still parallelises. Measured: 0 of the stream's 234 story records carry the scaffold shape, so the rule fires on nothing today and guards every story refine creates from here | ~~Important~~ → **closed** | — |
| F-83-F | **Untracked files sitting in a tracked directory — RELOCATED, not resolved, and the count grew.** Re-measured at this gate. The three originals were moved into `.aof/_to_delete/` and four scratch artefacts joined them; `git check-ignore` exits 1 for all **seven** (`checkreal.mjs`, `pending-review.diff`, `r1.diff`, `r2.diff`, `run83.mjs`, `story-context-contract.test.mjs`, `story-contract.mjs`), so `git add -A` still commits a second copy of a shipped module — `story-contract.mjs`, which is now LOAD-BEARING code rather than a validation leaf — into the state directory. A folder named `_to_delete` is an intention, not a mechanism | Important | delete the seven, or ignore `.aof/_to_delete/`, before the commit |
| F-83-G | **`inferProjectRoot` is a second, lossy derivation of a fact `loadWorkspace` already owns.** Unchanged. `src/work.mjs:171-172` derives `projectRoot` from the config directory; `src/commands/validate.mjs:166-174` inverts it by counting `work.dir` segments — a different rule that returns `resolve(workDir, "..", "..")` for an absolute or `..`-bearing `work.dir`, resolving every `reads:` entry against the wrong base. Every production caller passes `ctx.workspace.projectRoot`, so the fallback's only live effect is to let a future face that forgets the wiring validate against a guessed root | Important | drop the fallback, or export the derivation from its existing home |
| F-83-L | **Five fitness-function controls are red in this working tree, and none of them implicates this story's change set.** Measured at this gate over the whole `test/arch/**` lane (350 suites, 1438 cases): `acd-feature-parser-single-home` (`src/phase-brief.mjs` is a second Gherkin recogniser), `acd-graphify-backend-selection` and `acd-memory-backend-selection` (`config.memory?.backend` read in 7 locations, not 1), `acd-no-new-silent-catch` (5 files above baseline) and `acd-loop-scope-guard` (`src/work.mjs` off its pinned hash). The first four name files that are byte-identical to HEAD, so they are pre-existing red; the fifth is caused by the CONCURRENT `parseStorySpan` edit to `src/work.mjs` sitting uncommitted in this tree beside milestone 55/57 work. Recorded because a red fitness lane must never be inherited silently, not because story 83 caused it | Important | route to the owning lanes (55/57 and the standing arch debt); not a story 83 defect |
| F-83-I | Nits, 9 recorded, none earning a round: `heldSet` (write-overlap) and `skipped`/held (item-lock) are two different "held" meanings in one `work:next` payload · `withReadyWave` strips `path` from wave/heldSet while the CLI face still maps a path projection over them (dead code) · `src/board-ui.mjs` is modified with an EOL-only change and no content diff · `validate.mjs:46` recomputes a loop-invariant per story · `story-contract.mjs:43` interpolates `key` into a `RegExp` unescaped (safe only because both call sites are literals) · a directory in `reads:` reports "does not exist" (EISDIR folded into not-found) · duplicate entries in `reads:`/`files:` pass silently · the suite's `fm()` helper only emits inline lists, so the block-list branch never runs end-to-end through `validateWork` · the template's YAML comment survives scaffolding, so authoring guidance ships into every real story record | Nit | backlog |

**A migration consequence worth stating plainly, not a defect.** **Exactly ONE of this stream's 234 story
records declares `files:` — story 83 itself**, and an undeclared write set is treated as overlapping everything. Story-level
fan-out is therefore serial across the entire existing stream until each story is re-refined. FIX-4
chose this deliberately — *"degrading to serial is the honest behaviour and it lets the field roll in
gradually"* — so it is the designed transition cost rather than a fault, but it is the whole stream.

**What is green.** Re-run at this gate under an isolated `AOF_GLOBAL_HOME` via test-array imports —
the story's own suites (`story-context-contract`, `work-next-ready-set`, `loop-bounds`,
`work-loop-production-review-bound`, `work-validate`, `bundle`, `work-update`,
`item-lock-next-skips-held`, `loop-progress-production`) plus the ENTIRE `test/arch/**` fitness lane:
**350 suites, 1438 cases, 1433 passed, 5 failed** — the five being F-83-L, every one of them in a file
this story does not touch. Every case belonging to the story's four tasks is green, including the two
scenarios added at this gate (the anchor-in-`files:` refusal and the unrefined-scaffold rule). The
suites that guard the loop's single bound home and its uncapped-loop prohibition
(`acd-loop-cap-single-home`, `acd-no-uncapped-framework-loop`) both pass with the ceiling in place,
which is the load-bearing evidence that FIX-3 landed in the existing home rather than beside it.


## Accept decision

**Accepted 2026-08-27.** `aof work validate 83` reports `PASS — 83 is well-formed.`; `aof work doctor 83`
reports no `control-unresolved` at either severity; **no blocker finding is open**. Two of the register's
open Important findings — F-83-J and F-83-D — were **closed at this gate** by the reworked
`src/commands/validate.mjs`, `src/story-contract.mjs` and `src/ready-wave.mjs`, each verified by a new
`@executable` scenario rather than by inspection. Four Important findings stay open (F-83-K, F-83-B,
F-83-G, F-83-F) plus F-83-L, which belongs to other lanes; all five are routed in the register and none
of them is a defect in the four bounds this story contracts for.

**What acceptance does and does not claim.** It claims the four bounds EXIST and are enforced where they
said they would be: the reporting bar is distributed to every reviewer lens, the read contract is a
declared field a validator holds to account, the wave partition is deterministic code that `work:next`
returns rather than prose an agent performs, and the round cap is a runtime clamp in the one bound home.
It does **not** claim the bounds have yet changed the numbers they were built to change — three
`@manual` scenarios are longitudinal comparisons whose after-population is one story deep, and they are
recorded above as open measurement. The honest position is that FIX-1 through FIX-4 are installed and
FIX-1's effect is unproven; the story's own Notes said exactly this before the gate ran, and the gate
did not find a reason to say otherwise.

**One condition on the commit, not on the acceptance.** F-83-F is working-tree hygiene: seven untracked
files under `.aof/_to_delete/`, none of them ignored, one of them a duplicate of the now load-bearing
`src/story-contract.mjs`. They must be deleted or ignored before this story's change set is committed.
That is a gate on `aof:code-review`, not on this record.
