---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). This is the running NARRATIVE.
-->
# 96 · The declaration earns its keep — State

## Progress

**Refined 2026-09-04** (`aof:refine 96 --autonomous --solo`). `ARCHITECTURE.md` carries eight ADRs
and six declared fitness functions; all five stories carry their contracts (15 task features). The
landing order is **{00 ‖ 01} → {02 ‖ 03} → {04}**. Nothing is built.

Both open questions below are answered, and the architecture pass deleted two modules the break-down
had asked for — see "Decided at refine".

## Notes & decisions in flight

- **Scheduled 2026-09-03** from the measured before/after in
  [`wiki/issues/proposed-fixes/MEASURED.md`](../../../issues/proposed-fixes/MEASURED.md), which carries
  every figure quoted in the SPEC and how it was obtained.

- **The measurement had to be taken by hand, and that is story 00's whole argument.** Both committed
  `observability/` snapshots for the milestones compared report `runs.count: 0`,
  `totalOutputTokens: 0` and `activeUnionMs: 0` with `transcriptsFound: true`. The miner is not
  broken: `work-observe.mjs:670-693` states that attribution is *"a JOIN on sessionId, never a text
  match"*, the regex path having been retired under FF-6805, and `buildSessionItemIndex` builds that
  index from each item's `runs/` records. Only milestones 38 and 40 have a `runs/` directory. The
  figures in the SPEC came from a standalone transcript miner run against
  `~/.claude/projects/<slug>/<sessionId>/subagents/agent-*.jsonl`.

- **Order matters more than usual here.** 00 first, or the milestone cannot prove it worked. Then 01,
  because 02 and 03 both consume the accuracy it produces and neither is worth building on a set that
  is short on four stories in six. 04 last, because it only becomes load-bearing once 03 has narrowed
  what the story lane runs.

- **The one-page limit on `PLAN.md` is the feature, not a style rule.** SWE-agent's published ACI
  ablations on the 300-instance SWE-bench Lite subset resolved **18.0%** with a 100-line file window
  against **12.7%** showing the whole file, and **18.0%** keeping the last five observations against
  **15.0%** with full history. More context measured worse on the same benchmark. A plan longer than
  the diff it describes is a liability, and an architect that cannot fit one is describing a story
  that should have been split — which is the sizing test this stream does not currently have anywhere.

- **ANSWERED — where does the file table live?** The **frontmatter**, and `PLAN.md` restates no path
  at all (ADR-005). `ready-wave.mjs` consumes it, `validate.mjs` checks it and 96/01 now derives it;
  a table in the plan would be the second list and 15/R1's lesson says the third arrives next. The
  plan carries the mechanism and the verification step — exactly the half the frontmatter cannot
  express — and a document forbidden from listing files has little left to be long about, so ADR-005
  does most of ADR-006's work for it.

- **ANSWERED — does the regression gate belong on `aof work status <ref> done`?** **Yes, with a
  recorded override** (ADR-008 §4). The argument against is honoured rather than dismissed: 66
  declined, and 63/R12 records a real milestone that a hard gate would have blocked — so
  `--gate-override "<reason>"` permits the move and writes the reason into the record as its own row,
  in `--if-applicable`'s idiom (74/00, an expected refusal rendered as data). An override with no
  reason is refused, because a silent override is indistinguishable from no gate at all within two
  milestones. The door lands in `src/commands/item-status.mjs`, **not** in `src/acceptance-horizon.mjs`
  — that module imports nothing by 66/ARCHITECTURE ROUND 3/3 and 66/02's FF-6605 forbids the controls
  lane reaching `node:fs`, so a predicate that reads a record cannot live there and stay legal.

## Decided at refine

Four measurements changed a decision, and two of them deleted a module the break-down had asked for.

- **`src/test-selection.mjs` is deleted from 96/03's partition.** Milestone 72 already shipped the
  selector: `src/work-test-select.mjs` (`selectSuites`, four frozen widening reasons, three refusals,
  FF-7202/FF-7203), `src/work-test-changed.mjs` as its git-backed changed-set producer, and
  `aof test --scope impacted|file|all` as its face. 96/03 adds a **changed-set source** beside the git
  one and calls the selector unchanged. A second selector is the "confidently wrong once" failure that
  module exists to prevent, rebuilt beside it. It also means the trap the story flagged — the test
  file the developer has not written yet — is handled for free: a declared path the graph reports
  `present: false` widens under an existing reason.

- **`src/acceptance-horizon.mjs` is deleted from 96/04's write set**, for the reason above.

- **`aof test --scope all` already emits the gate boolean** (`src/commands/test.mjs:262`,
  `gate: scope === "all" && widened.length === 0`) and then discards it. 96/04 is durability and a
  door over a result that already exists, not a new test run.

- **The session id is readable at a phase's TOP and not at its close, measured.**
  `CLAUDE_SESSION_ID` and `CLAUDE_PROJECT_DIR` are **unset** in a tool shell, so 48/ADR-001's env rung
  is unreachable from a phase command. The live session store the `UserPromptSubmit` hook writes has
  `DEFAULT_SESSION_TTL_SECONDS = 120` and a reaper at every write seam — this session's own record was
  absent from `~/.aof/mesh/sessions/` while two records for another workspace, sixty seconds younger,
  were present. Two live records can also share one workspace. That decides ADR-001: mint at the top,
  take the strictly-newest live record, resolve `null` on a tie rather than guess.

- **The plan's length needs no new check.** Milestone 16's budget family already has the exact ladder
  — `BUDGET_KEY`, `DEFAULT_BUDGETS`, `budgetsFromConfig`, `doc-over-budget` at warn on a sweep and a
  refusal in the accepting item's scoped preflight. `PLAN.md` joins it with one row and one key.

**Default decisions taken under `--autonomous`** (recorded, not raised): the gate record's basename
is `REGRESSION.md`, following 78/ADR-001's `EXECUTION.md` precedent; `plan: 80` lines with template
guidance at ≈60, calibrated to the family's convention rather than measured, because no plan document
exists yet; `--story <ref>` as the flag name on `aof test`; and 96/00's phase set is `refine` and
`continue` only, as the story declared — `verify` is the accept phase and 96/04 is already changing
its prompt.

**The codebase graph was rebuilt at the decision point** — 15,394 nodes / 37,585 edges, egress
`none`, `builtAt 2026-09-04T14:19:30.577Z` — and every boundary in the partition cites
`aof graph impact` from its edges. The two rows that decided most are `src/story-contract.mjs` and
`src/acceptance-horizon.mjs`, which import **nothing** and have two and six production dependents
respectively; every decision that puts new code beside one rather than inside it is that row.

- **Test selection is worth less here than it looks, and the numbers should temper the design.**
  Mined from the transcripts: in this repo tests are **3h14m over 1,243 calls, mean 9.4s — 7.8% of the
  milestone's span**. Downstream they are **7h19m over 902 calls, mean 29.3s, 10.9% of span**, but
  **30–59% of wall inside the runs that matter** (`aof-qa · Behavioural review 361/04` is 58.6% test).
  So the win is per-run and concentrated in the review lanes, not per-milestone. Build for that shape.

- **Two tool-wait facts that are larger than tests and belong to no story here.** Downstream,
  `AskUserQuestion` accounts for **7h53m across 14 calls, longest single wait 4h51m**, and
  search-and-read for **8h58m across 4,112 calls**. Both dwarf the test line. Recorded so the next
  person reading this does not mistake test selection for the largest remaining lever.

- **Several test invocations are dying at the 600-second tool ceiling** in both repos (maxima of
  603.2s and 602.3s). The downstream retro names the cause without needing the transcripts: controls
  that compile or walk whole trees running under budgets sized for unit tests. Those are exactly the
  controls story 04 moves to the milestone gate.

## Feedback (for retro)

_Archived at accept, 2026-09-04._ Every note this section carried has graduated into
[`RETROSPECTIVE.md`](./RETROSPECTIVE.md) as `R1`–`R10`, exactly as durable decisions graduate into
ADRs. The three that shaped the milestone most, with where they now live:

- The declared set widens to the whole suite until something rebuilds the graph → **R10**, and
  `OUTCOME.md` `## Assumptions`.
- `files:` is short by the same two paths for any story touching a bundle member, and the rule is
  mechanical → folded into **R2**; the milestone gate then found the wider form (every git-tracked
  render, not just the manifest) and all five stories now declare them.
- A contract row contradicted the code it declared unchanged, and the write set decided it → **R9**.

## Verification

**Milestone gate run 2026-09-04 (`aof:verify 96`) — ACCEPTED.** Evidence, findings and the accept
decision are in [`VERIFICATION.md`](./VERIFICATION.md); the delivered state is in
[`OUTCOME.md`](./OUTCOME.md); the lessons are in [`RETROSPECTIVE.md`](./RETROSPECTIVE.md).

- [x] `@executable` suite green — 218 assertions across the eleven suites 96 ships, the seven it
      modified, and the four controls the gate found red.
- [x] Fitness functions green — all six resolve, are registered, and each carries a **recorded red
      probe**: applied to the working tree, run, reverted, restore confirmed byte-identical.
- [x] `aof work validate 96` PASS; `aof work doctor 96` reports zero `control-unresolved` at either
      severity.
- [x] **The whole-tree regression gate is GREEN** — `9fe8df37`, scope `all`, 30m48s,
      2026-09-04T20:54:51Z. `--gate-override` was not spent: the milestone that introduced the gate
      passed it.
- [x] Both new doors driven **live** on real state — `aof work status 96 done` refused
      `regression-gate-missing` and wrote nothing; `aof work run-start` wrote a joinable record from
      a shell with `CLAUDE_SESSION_ID` unset.

No `@uat` scenarios exist in this milestone, so no human acceptance lane was opened.

**It took six gate runs to get an honest one, and the five reds before it are kept.** Across them the
gate caught: two controls 96's own code broke, three controls one story's prose edits broke, five
pre-existing reds nothing had run in months — including two shipped controls that directly contradict
each other — a defect in its own recording, and a timing assumption that only fails under whole-suite
load. Every one was invisible to every story-scoped lane, which is 63/R7's lesson demonstrated on the
milestone that shipped the cure.

Accepted with two **known gaps**, both in `OUTCOME.md` with discharge conditions: the milestone cannot
measure its own thesis (`runs.count: 0`, because the installed bundle predated story 00), and a killed
gate run is still recorded as a completed one.
