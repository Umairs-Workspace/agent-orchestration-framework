---
doc: retrospective
---
# 52 · Loop registry & the loop graph — Retrospective

## R1 · A frozen collection contract must probe the language primitive, not only its public override

- **Kind:** near-miss
- **Area:** code
- **Stage:** build
- **Owner:** developer
- **Raised by:** aof-qa
- **What happened:** The first vocabulary wrapper overrode `add`/`delete`/`clear`, but retained a real
  Set internal slot that `Set.prototype.add.call` could mutate; widening `NODE_KINDS` then crashed the
  kind-scoped lookup.
- **Why:** The implementation equated an object-frozen Set plus overridden instance methods with
  immutable membership, without probing the intrinsic mutator permitted by JavaScript's Set semantics.
- **Lesson:** For exported read-only collection contracts, test both ordinary methods and intrinsic
  prototype calls; use inaccessible backing storage when membership must be categorically immutable.
- **Refs:** `VERIFICATION.md` `@finding-F-52-00-B`

## R2 · Generic phrase fallbacks must exclude the reserved grammar prefixes first

- **Kind:** near-miss
- **Area:** contract
- **Stage:** build
- **Owner:** developer
- **Raised by:** aof-architect and aof-qa
- **What happened:** Malformed `prose:` and pointer-shaped `controlled` values failed their typed parser,
  then silently re-entered through the free-text phrase fallback.
- **Why:** The fallback tested only whether a valid typed value had been produced, not whether the author
  had selected a reserved grammar branch whose payload was invalid.
- **Lesson:** In a closed sum grammar with a free-text alternative, reserve discriminating prefixes
  before fallback; a malformed typed branch is an error, never a different valid variant.
- **Refs:** `VERIFICATION.md` `@finding-F-52-00-A`, ADR-002, ADR-003

## R3 · Product field lists stay provisional until research measures the running system

- **Kind:** misunderstanding
- **Area:** contract
- **Stage:** refine
- **Owner:** product-owner
- **Raised by:** architect
- **What happened:** The milestone SPEC repeated a six-field planning description, but measured loop
  machinery required a distinct seventh `ceiling` field because firing cadence and termination bound
  are independent axes.
- **Why:** Planning prose was treated as a complete schema before research compared it against the
  autonomous cascade and uncapped build/review loops.
- **Lesson:** Treat PO-authored field enumerations as hypotheses until research measures representative
  live cases; freeze the schema only after the cases can all be expressed without collapsing meanings.
- **Refs:** ADR-002, `STATE.md` “Retro-worthy” note

## R4 · “Registry-derived, no edit needed” is a measurement claim

- **Kind:** mistake
- **Area:** architecture
- **Stage:** refine
- **Owner:** architect
- **Raised by:** Three Amigos QA lane
- **What happened:** The architecture twice claimed the existing CLI bijection gate would cover the
  three-word command family automatically; reading the real gate found both route reachability and
  spawn-and-parse assumed an id suffix identical to route words.
- **Why:** The review reasoned from the gate's intent and registry-derived shape instead of executing
  the new command family through every gate branch.
- **Lesson:** Any assertion that a shared registry-derived gate needs no edit must be verified against
  the gate's source and a representative new entry; do not infer coverage from the abstraction's name.
- **Refs:** ADR-011, ADR-012, `STATE.md` “Retro-worthy” note

## R5 · Long governance runs need recoverable checkpoints

- **Kind:** blocker
- **Area:** process
- **Stage:** refine
- **Owner:** architect
- **Raised by:** observability
- **What happened:** The milestone-52 architecture authoring run stalled for 19m28s inside a 36m47s
  active, 1h30m wall-clock session; the milestone's refinement history also concentrated 84% of output
  tokens in governance work across repeated closure passes.
- **Why:** A large, single-agent ADR authoring session accumulated many interdependent decisions before
  yielding a recoverable checkpoint, so an interruption stranded both progress and coordination.
- **Lesson:** Checkpoint long architecture/refinement sessions at stable ADR or contract boundaries and
  hand independent closure lenses off in parallel; a stalled reviewer should be replaceable without
  replaying the whole governance pass.
- **Refs:** `observability/report.md` “Stalls” and “Where the generation went”

## R6 · Measure workspace discovery before promising nested-cwd behavior

- **Kind:** misunderstanding
- **Area:** contract
- **Stage:** build
- **Owner:** architect
- **Raised by:** developer
- **What happened:** Two command scenarios promised that invocation from any nested workspace directory
  would discover the root registry automatically. A real probe showed `findProjectConfig` checks only
  the exact cwd; the commands correctly projected paths, but over a phantom nested workspace.
- **Why:** The contract inferred conventional ancestor discovery from the CLI's workspace abstraction
  without executing the shared resolver from a child directory.
- **Lesson:** Workspace-basis claims are shared-seam claims: probe the actual config resolver before
  freezing them. Use the existing explicit `--config` contract when that is the product behavior, and
  route automatic ancestor discovery as a cross-cutting change with its own blast-radius tests.
- **Refs:** `VERIFICATION.md` `F-52-02-A`, `src/workspace.mjs::findProjectConfig`

## R7 · Shell metacharacters can turn a read probe into a destructive write

- **Kind:** mistake
- **Area:** process
- **Stage:** review
- **Owner:** qa
- **Raised by:** architect
- **What happened:** QA ran `rg` under `cmd.exe` with an unescaped `>` in the search token. The shell
  treated it as output redirection and truncated the very record being reviewed; a simultaneous repair
  then briefly duplicated the captured content.
- **Why:** The command was classified as read-only from the intended program (`rg`) without evaluating
  the shell grammar that runs before the program sees its arguments.
- **Lesson:** On `cmd.exe`, never pass unquoted metacharacters such as `>`, `<`, `|` or `&` in diagnostic
  patterns. Use literal-safe quoting or a tool/API that bypasses the shell, and after any suspicious
  probe verify the target's byte hash before trusting the review verdict. Assign one writer for repair.
- **Refs:** `VERIFICATION.md` `F-52-03-A`

## R8 · "Green" in a record doc must name an instrument, or it is a memory

- **Kind:** blocker
- **Area:** process
- **Stage:** verify
- **Owner:** product-owner
- **Raised by:** aof-architect (at 52/04's structural review)
- **What happened:** Stories 00, 01 and 02 were accepted on per-feature evidence reading *"Loader/model
  fixture … green"*, *"Timescale fixture: exhaustive 6×6 matrix … green"*. The fixtures were real in the
  build sessions and were never landed as files: 1,176 lines of `src/` shipped with zero test suites, so
  15 `@executable` features and 323 scenarios were mechanised by nothing. Three accepted stories, and a
  sixth story (52/05) created to supply their evidence after the fact.
- **Why:** The accept gate read a narrative claim about a past command and treated it as the command's
  result. Nothing in the gate distinguished *"a fixture was green in a session"* from *"a suite is on
  disk and registered"*, and the nine structural fitness functions that did land made the milestone
  **look** guarded while deliberately not covering behaviour.
- **Lesson:** Evidence is a **path**, never a sentence. An `@executable` feature is done when its suite
  exists on disk and is registered in the runner — accept nothing whose claim cannot be re-run by
  someone who was not in the room. The unfalsifiable claim is worse than the false one: it cannot be
  caught later.
- **Refs:** `VERIFICATION.md` F-52-04-H, `TECH_DEBT.md` item 48 (closed) **and its ratchet, still open —
  make `aof:verify` itself require an executable evidence pointer**

## R9 · A ticked task box is a claim about an exit code, and it should be written after the command runs

- **Kind:** mistake
- **Area:** process
- **Stage:** build
- **Owner:** developer
- **Raised by:** the resumed 52/04 run
- **What happened:** 52/04's first attempt died mid-review and was found `in-review` with all five task
  boxes ticked `[x]` and two RED assertions behind them — one of which (a check-lane oracle compared
  against the *loader* fixture's temp directory) could never have passed on any tree.
- **Why:** The box was ticked from intent — the work was believed complete — rather than from a command
  that had been run in the session that ticked it. A stalled or interrupted run leaves exactly this
  residue: `done`-shaped state over an unverified tree.
- **Lesson:** Tick a task only after running its gate in the same session, and treat any `in-review` item
  with a fully-ticked task list as **unverified until re-run**, not as nearly-accepted.
- **Refs:** `STATE.md` story 04 note, `VERIFICATION.md` F-52-04-B

## R10 · A focused run proves the story; only the tree proves the tree

- **Kind:** near-miss
- **Area:** process
- **Stage:** build
- **Owner:** developer
- **Raised by:** aof-architect
- **What happened:** 52/04's nine suites passed in their focused runner while the repo's shared m47
  positional-slice ratchet went red *because of* one of those nine files — so "all nine land green" was
  true of the story and false of the repo. The same gap reappeared as a sequencing window in 52/05: a
  behavioural suite is an orphan between the task that authors it and the task that registers it, so
  landing task 04's file reds `acd-test-suite-registration` until task 05's runner edit lands.
- **Why:** Focused runs are *necessary* on this machine (the full suite binds `:4182`, held by the live
  control daemon) and it is easy to let necessary slide into sufficient. A story's own suites and the
  repo's shared ratchets are different claims.
- **Lesson:** Before any "landed green" claim, run the **shared** gates the change touches against the
  tree — here `acd-test-suite-registration` and `acd-work-command-cli-bijection`. When a story's tasks
  split authoring from registration, expect and name the red window rather than discovering it as a
  mystery.
- **Refs:** `VERIFICATION.md` F-52-04-A, `STATE.md` feedback notes, `TECH_DEBT.md` item 50

## R11 · A resolving pointer is a spelling check; only a mutation proves an assertion decides anything

- **Kind:** mistake
- **Area:** code
- **Stage:** review
- **Owner:** qa
- **Raised by:** aof-qa's mutation pass
- **What happened:** Story 05's coverage ledger excludes a scenario only when its pointer names a real
  exported fitness-function test — and one such exclusion (the `code` component of the frozen finding
  order) pointed at FF-5209, which did not decide it either: both instruments wrote a self-consistent
  assertion over fixtures where code-order and message-order never disagree. Dropping the `code` tiebreak
  from `compareFindings` survived **all six suites and all nine gates**. Separately, the same review found
  `assert.equal(<literal>.length, N)` used as a non-vacuity guard — a check that cannot fail, which had
  also made a real scan blind (a hardcoded five-module list meant a sixth loop module would be scanned by
  neither FF-5201 nor FF-5202).
- **Why:** Both shapes read as coverage and prove only shape. The ledger can verify that a pointer
  resolves; it cannot verify that the named test discriminates — that is F-52-04-H's own species at one
  further remove, reproduced inside the instrument built to close it.
- **Lesson:** Keep the mutation pass in the review lane — green is not sufficient evidence that an
  assertion decides its claim. Discover lists from disk and `deepEqual` against the expected set; never
  assert a literal's own length.
- **Refs:** `VERIFICATION.md` F-52-05-E, F-52-04-D, `STATE.md` feedback notes

## R12 · Scope an instrument to the species, not to the file where the species was first seen

- **Kind:** near-miss
- **Area:** architecture
- **Stage:** review
- **Owner:** architect
- **Raised by:** aof-architect (52/05 structural review)
- **What happened:** The m47 positional-slice ratchet bans fixed character windows and `indexOf`-sentinel
  slice ends, and sweeps `test/arch/**` only — where the problem had been *seen*. Measured at this review:
  10 hits across 489 non-arch test files, two of them landed by this very story, including a TECH_DEBT
  section cut whose `-1` path widens silently to end-of-file and can then match a *different* item.
- **Why:** The boundary was drawn around the first sighting rather than around the shape. Since 52/05,
  behavioural suites read source as routinely as gates do, so the sweep's subject no longer tracks the
  risk — and it took a reviewer's eyes rather than CI to find the next two instances.
- **Lesson:** When closing a finding, ask whether it is filed against a **file** or against a **species**,
  and scope the instrument to the species. A ratchet that watches only where the bug was found will be
  green over the next instance.
- **Refs:** `TECH_DEBT.md` items 52 and 50

## R13 · An Examples table that contradicts its own preamble is two contracts — and the code follows the prose

- **Kind:** misunderstanding
- **Area:** contract
- **Stage:** refine
- **Owner:** product-owner
- **Raised by:** aof-developer (writing the suites the contracts implied)
- **What happened:** Two accepted contracts disagreed with the shipped behaviour, and in both the
  contract was wrong. `02_field-value-grammar` states *"per key, evaluation stops at the FIRST gate that
  fails"* and then prints two rows violating it. `01_loops-validate`'s `ran` table carries a row —
  *"3 well-formed records, nothing to report"* → all zero — that **no non-empty registry can satisfy**,
  because `checkGrounding` maps every strongly-connected component to a verdict and the vocabulary admits
  exactly one ground class.
- **Why:** Both rows were authored from the *intent* of the rule while the implementation followed its
  *statement*; neither was ever executed against a real instance before being frozen as acceptance
  criteria. A case table is the least-reviewed part of a feature and the most load-bearing.
- **Lesson:** When a case table and its own preamble disagree, the prose is the contract the code
  followed — and a row asserting an all-clear result should be tested for whether any instance can
  produce it. Both are caught by writing the suite *at refine* rather than after acceptance.
- **Refs:** `VERIFICATION.md` F-52-05-A, F-52-05-B, `TECH_DEBT.md` item 53
