# Milestone 53 refinement-loop report

**Date:** 2026-08-17
**Scope:** why milestone 53 repeatedly returned from build/review to refinement, and what changed to
stop that cycle.

## Executive finding

The repeated refinement was not caused by the user failing to refine the work. It was caused by the
agent process accepting locally plausible story contracts without proving that they composed at the
shared runtime seams. The orchestrator then treated almost every later review finding as a new reason
to send work back to refinement instead of classifying it as one of:

1. a genuine contract contradiction;
2. missing implementation or executable evidence under an already coherent contract; or
3. a stale baseline in an older cross-story record.

That classification failure created the back-and-forth. Several findings that should have been fixed
in the story worktree, or arbitrated once in the milestone architecture, were instead returned to the
user as another refinement request.

## What actually needed refinement

The final worktree-based Three Amigos pass found four real contract areas to reconcile.

### 53/00 — session-driver extraction

- Replace the impossible “all importers are byte-unchanged” claim with the measured 42 untouched
  importers plus one named re-aimed gate.
- Close the naming allowlist at ten files while keeping the static-import census separate.
- State the true fresh-linkable population: 48 runtime-importable members plus the pin script's
  static/link-only proof.
- Admit all three inward-consumed driver bindings.
- Authorise the narrow status-recorder fixture correction that preserves `sessionId: null`, while
  leaving production semantics unchanged.

### 53/02 — command surface and stop reporting

- Keep the driver seam to exact `failureReason` forwarding; do not invent reset metadata in the
  driver result.
- Assign parked retry time to the existing run-store policy: parse the default resume time, persist it,
  and consume the retry transition's `error.readyAt`.
- Keep the frozen ten-key `LoopState`, halt act, and JSON probe unchanged; send stop-specific details
  through the existing human report callback.
- Replace the false-green completion-watch proof with an aged transcript and a PTY that stays live.
- Give the stop/report matrix stable executable row identifiers and declare dependencies on 53/00 and
  53/01.

### 53/04 — autonomous launcher

- Remove `--json` from the launcher command. The JSON face is deliberately a no-write probe and could
  never execute the loop.
- Make the no-JSON human launcher output authoritative for driven rows, accepted milestones, halt
  reason, ref, and resume command.
- Prove the exact prompt command black-box through source-local `aof` and provider shims, including a
  minted run and a zero-write JSON control.
- Declare the sequential dependency on 53/02 because both stories touch the loop report seam.

### 53/05 — fitness functions

- Replace the forbidden positional source slice with the shared structural source-slice helpers.
- Mechanise the mutation/positive controls that the green aggregate cases had not actually proved:
  runner-block contiguity, every denylist member, admitted-edge self-checks, live spawn and real-face
  controls, the real scope leak, and alternate-driver rejection.
- Correct FF-5308's fixture to active `02/01` versus earlier out-of-scope `01/00`.
- Restrict 53/05's accepted-test ownership to two milestone-52 roster regions. Reopened 53/00 owns the
  driver-door allowlist; two stories no longer claim the same file.
- Declare dependencies on 53/00 through 53/04.

## Why the earlier refinement passes did not hold

### 1. Refinement checked descriptions, not executable seams

The most consequential miss was the autonomous prompt. Its text named
`aof work loop <range> --level L2 --json`, while the command face explicitly guarantees that JSON
calls the read-only probe and never the launcher. String-presence tests passed, but a single black-box
execution of the exact prompt command showed `driven: []` and no run directory. The original refine
did not perform that check.

The same problem appeared in the completion watcher: a test claimed to prove the default transcript
watcher, but its fake PTY exited immediately and won the race. The test was green without exercising
the stated mechanism.

### 2. Grouped green tests were mistaken for contract coverage

Story suites grouped many feature rows into a small number of broad test cases. Review repeatedly
reported “all tests green” while exact Examples rows—stop-specific report facts, reset boundaries,
fresh-process determinism, scope necessity, and mutation controls—were not mechanised. Passing totals
were used as a proxy for traceability.

### 3. Cross-story ownership was not reconciled before parallel build

53/00 and 53/05 both ended up claiming the driver-door test. 53/02 and 53/04 shared
`src/commands/loop.mjs` without an explicit sequential handoff. 53/03 and 53/07 disagreed about the
registry home until later integration. These are milestone-level composition questions; story-local
passes could not settle them independently.

### 4. Historical ADR text remained a second source of permission

Later refinements added amendments but left older counts and guarantees standing nearby: 45 unchanged
test importers, two inward imports, all 43 suites naming the driver zero times, three 53/05 accepted
test edits, and the obsolete FF-5308 fixture. Reviewers could truthfully cite either side. The final
consolidation removes or explicitly supersedes those competing rules and makes the story partition the
normative edit ceiling.

### 5. The orchestrator failed to arbitrate review findings

Architect and QA reviews correctly found real defects, but they also surfaced implementation gaps,
coverage gaps, environmental failures, and stale baselines. The orchestrator repeatedly escalated the
whole set as “needs refinement.” That was the central process error. A build gap should remain in
build; a test-evidence gap should be implemented; a stale baseline should be corrected by its owner;
only an unimplementable or mutually contradictory requirement should reopen refinement.

### 6. Worktree coordination obscured the authoritative record

Refinement comments and partial fixes were first recorded in isolated lanes while the user's refining
agent worked on the main feature branch. The authoritative contradiction was therefore not always
visible where refinement ran. Later, fixes were merged in different orders, allowing an older ADR
summary or feature table to overwrite the newer ownership decision. The user should not have had to
mediate that topology.

## Cost evidence

The repository history makes the churn visible without estimating money or wall-clock time:

- 49 commits touching milestone 53 records followed the original milestone foundation commit.
- 21 milestone-record commits followed ADR-015 alone before this consolidated closeout.
- The final correction required four story worktrees, eleven story-refinement commits in the
  consolidation branch, a twelfth reconciliation commit, and repeated validation/review passes.
- The consolidated contract delta from the last main-branch feedback checkpoint changes 20 planning
  files with roughly 950 insertions and 320 deletions.

Those numbers include legitimate build and evidence work, but the repeated contract reopenings and
handoffs are the avoidable part. No claim is made here about an exact monetary amount.

## Corrective actions now adopted

1. **One contradiction audit before build.** Search every affected ADR, story, task, partition row,
   accepted-test ceiling, and dependency declaration for competing literals before dispatch.
2. **Black-box the real door during refinement.** Any story that delegates to a CLI, provider,
   watcher, or renderer must execute the exact user-facing invocation once before the contract closes.
3. **Classify every finding.** Record it explicitly as contract contradiction, implementation defect,
   evidence gap, stale baseline, or environment failure. Only the first category reopens refinement.
4. **One normative ownership table.** Historical prose may explain a decision, but the final story
   partition owns edit permissions and dependency order.
5. **Stable evidence rows.** High-cardinality Examples matrices get row identifiers and executable
   owners; a green grouped test count is not accepted as traceability by itself.
6. **Sequential shared-file handoffs.** Shared production files declare dependency order in
   frontmatter before parallel work starts.
7. **Consolidate before asking the user.** Story-worktree refinements are merged into one temporary
   integration worktree and receive a final architect, QA, and developer-feasibility pass. The user is
   not asked to shuttle commits between lanes.
8. **Orchestrator owns arbitration.** Conflicting review claims are resolved against source evidence
   and the normative partition by the orchestrator. They are not automatically sent back to the user.

## Final disposition

The worktree refinements for 53/00, 53/02, 53/04, and 53/05 now compose in the declared order
`53/00 → 53/02 → 53/04 → 53/05`, with 53/01 and 53/03 as the other declared prerequisites. All scoped
work-stream validations pass. The remaining red items described by the refined stories are build or
test-evidence obligations, not reasons for another refinement cycle.

The post-merge continue probe also exposed a separate workflow boundary: a story-level `depends`
edge is satisfied only when the prerequisite is `done`, while `aof:continue` deliberately stops a
built story at `in-review`. Therefore the dependency waves above require their prerequisite stories
to pass `aof:verify` before the next wave becomes actionable. This is not another milestone-53
contract refinement, and the continue lane must not counterfeit it by marking review-ready work done.
The mismatch between “continue the whole milestone” wording and the accepted dependency/lifecycle
semantics belongs to the orchestration procedure itself and should be corrected there.

Responsibility for the repeated loop lies with the agent orchestration and review process described
above, not with the user.
