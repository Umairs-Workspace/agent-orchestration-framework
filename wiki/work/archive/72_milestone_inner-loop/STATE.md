---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). This is the running NARRATIVE.
-->
# 72 · The inner loop — State

## Progress

**Broken down and contracted 2026-09-02** (`aof:refine 72 --autonomous`). Five stories, landing order
**{00 ‖ 01 ‖ 03} → {02 ‖ 04}**; eight ADRs and seven fitness functions in `ARCHITECTURE.md`, all seven
declared `pending` with a home for their red probes in `VERIFICATION.md`. Nothing built.

**The Three Amigos ran in full and the architecture changed substantially because of it.**
`ARCHITECTURE.md` went 587 → **974 lines** across three amendment rounds; `aof work doctor 72` reports
**errors: 0** and `aof work validate 72` only the three transient `reads` issues that clear when stage 1
lands. **28 findings are recorded in `VERIFICATION.md`, all closed before any build** — seven of them
Blockers, each of which would have produced a story that could not go green by any conforming
implementation. Four of the seven came from the DEVELOPER pass rather than QA: they were only visible
to someone reading the contract against the actual tree, and in every case the developer ran the code
rather than reasoning about it. Two examples of what that bought:

- 72/01 as first specified **reds three shipped, currently-green CI controls** on arrival (the layer
  gate plus both frozen graph-reader allowlists), because the function it must import lives under
  `src/commands/`. `computeImpact` now moves down to `src/graph-impact.mjs` — the remedy that gate's
  own failure message prescribes.
- ADR-004 §5's *"re-derive the pins and nothing else"* is **unsatisfiable**, and its failure is silent:
  re-anchoring the control's cut mis-cuts one region into 30 characters of an unrelated import,
  shipping a green control whose integration-lane leg measures nothing. Parameterising in place leaves
  all four region pins identical.

**The one ruling worth re-reading before the build.** `aof test --scope file <one suite>` pays the
runner's whole static import — **3,376 ms warm / 6,520 ms cold**, against **18 ms / 139 ms** for the
hand-written array import it replaces. ADR-004 §6 refuses both escapes (dynamic imports destroy
59/FF-5903's registration authority; a second entry needs §5's mis-cut or a second isolation loop) and
rules that **the 47× is measured against the wrong denominator**: the chore costs its milliseconds
*plus the model turn that writes it*, and this milestone's own research puts model generation at 84.1%
of agent-active time against 15.9% all-tool wait. Trading ~5 s on the small side to remove a turn from
the large side is the trade 72 was scheduled to make. The cost is routed to `TECH_DEBT.md` item 86, and
ADR-001 §2 is the standing escape hatch — the runner is project-declared, so this repo can later
declare a cheaper selection entry with no framework change.

**Two things the build must watch, both now mechanical rather than matters of judgment.** The diff of
`test/arch/acd-loop-suite-registration.test.mjs` must be **exactly one changed line, `:269`** — a
re-derived pin over a mis-cut region and a deleted leg produce the same green. And ADR-003's **stderr**
clause is the first thing to verify in 72/02's evidence: `not ok` and its stack go to stderr, so a
failures-only filter reading stdout prints a confident "no failures" over a red run while every other
test in the story still passes.

**2026-09-03 — built and accepted story by story, then the milestone.** 72/00 and 72/01 were accepted
earlier the same day (lanes 12/12 and 16/16; FF-7201, FF-7202 and FF-7203 observed red under eleven
probes). At the milestone gate (`aof:verify 72`) **72/02, 72/03 and 72/04 were ACCEPTED** — lanes
57/57, 23/23 and 10/10 through the runner's own `--only` path, FF-7204–FF-7207 observed red under
nineteen probes with every restore sha256-identical, the ADR-004 §5 discriminator confirmed by diff
(exactly `:269`), the live `aof test` face exercised from this tree, and the one `@manual` scenario
(72/04's ratchet) run by verify. F-72-AK discharged at the gate: FF-7201's module set re-derived over
all four modules 72 adds. Seven findings landed at the gate, none a blocker — the widened-`impacted`
silent run (F-72-AN), the undischarged registration report (F-72-AO), a malformed config reading as
absent (F-72-AP → chore 94), pre-existing trees never prepared (F-72-AQ), a stale `find` cache
(F-72-AR), and the brief compiler red on 72's records (F-72-AS → **chore 95**, scaffolded at the gate).

**2026-09-03 — 72 ACCEPTED.** `aof work validate 72` PASS; `aof work doctor 72` no
`control-unresolved` at either severity, all seven declared controls resolving with a recorded red
probe each (30 probes). Guard lane 95/95; the whole registered suite minus the `:4182` binder ran
once — **8,489/8,496**, seven failures, every one attributed and none of them 72's code (chores 88,
91, 92, 93 and 95). `RETROSPECTIVE.md` written (**R1–R10**), `aof work memory ingest` run,
`OUTCOME.md` authored for the milestone and for 72/02–72/04, 72/01's gate-discharged gaps closed, and
this document compacted with its `## Feedback (for retro)` section archived.

## Notes & decisions in flight

- **Scheduled 2026-08-16** from `PRD-acd-loop-performance.md` lever (e) plus
  `RESEARCH-agent-loop-economics.md`, which added the QA tool grant, the write-thrash finding and
  the hook duplication — none of which appear in the PRD.
- **The QA `Edit` grant left this milestone on 2026-08-16** — pulled out to **chore 76** so it lands
  now rather than on this milestone's timescale. Reinforced by the lifecycle change set of the same
  day, which makes `aof-product-owner` the sole writer of the findings register while that agent also
  lacks `Edit` — so the grant now covers two agents, not one.
- **Correction to the PRD's priority, carried from the research.** Lever (e) was called the cheapest
  highest-confidence win on a 46% figure from a different repo. This repo measures ~6%. Still worth
  doing; not the headline. Recorded here so the sequencing is not re-litigated later from the old
  number.
- **Open question for refine:** whether the test-scope command reads impact from the existing
  graphify code graph (`aof graph impact` already exists and is invoked at four sites) or from a
  simple changed-files heuristic. The graph is there and unused for this purpose.
  **CLOSED 2026-09-02 — the graph** (`ARCHITECTURE.md#ADR-002`). It READS `graphify-out/graph.json`
  through the shipped `normalizeGraph`/`computeImpact` and **never builds** (a build is minutes even on
  the `unchanged: true` path — 1,577 files re-extracted at 22 workers, measured at the decision point).
  It does not cross `09/ADR-004` because **selection is not a verdict**: `gate: false` on every
  non-`all` or widened result, and FF-7204 asserts no status, accept, merge, loop or audit door invokes
  it. The graph's OUTPUT role is unchanged (advisory); its READ FREQUENCY rises, which is recorded as
  the real change.

### Three SPEC claims had gone stale between scheduling and architecture — re-derived, not re-read

The SPEC was written 2026-08-16; architecture ran 2026-09-02. Each of these was verified at source:

- **The QA `Edit` grant is DONE** — chore 76 shipped; `src/bundle/agents/aof-qa.md:5` now grants
  `Edit`. The largest single token line item in the objective is closed, and this milestone owns only
  what the grant does not fix.
- **The observability classifier is FIXED** — `68/ADR-006` landed `classifyToolCallResult`
  (`src/work-observe.mjs:65-93`, reclassification `:218-229`): a Bash call is a test run by what its
  RESULT says, not by the command string. The "reports zero toolchain grind" defect no longer exists.
- **The doc-line budget already BINDS** — `70/ADR-007` (not 68): `src/work-doctor-budget.mjs:57-69`
  fires `error` when `ctx.acceptingRef === item.ref`, and `src/commands/item-status.mjs:95-112` throws
  `artifact-budget-exceeded`. "A warn nothing enforces" is stale.

And one number moved the OTHER way: `scripts/test.mjs` grew from 275,100 B / 728 imports to
**349,485 B / 948 imports / 950 suite files** in 17 days. Routed to `TECH_DEBT.md` item 86 with the
growth RATE as the finding.

### Default decisions taken at refine (`--autonomous`), none of them a gate

- **Two of the six levers were DECLINED on evidence** — the pre-apply edit gate and the blocking
  write-thrash guard (`ARCHITECTURE.md#ADR-006`, `TECH_DEBT.md` item 87, which carries the number that
  would re-decide each). The gate: for `Edit` the proposed content is not in the hook payload, so a
  gate must re-derive the harness's own patch application; and the measured failure mode is editing
  without CHECKING (write-first 112, batched 10, tight fix-test loop 3, at 18.0 edits per verified
  run), which a content gate does not address — making the check cheap does, and that is `aof test`.
  The thrash guard: both halves have largely landed elsewhere, and the residue is a blocking PreToolUse
  refusal with no warn-only option, where a blocked legitimate 9th edit strands the agent and a count
  cannot tell a thrash from a refactor. **Fully reversible — a sixth story later costs nothing
  structural.**
- **The SPEC's `PreToolUse` output-rewriting hook was replaced by an output contract on the command
  aof owns** (`ARCHITECTURE.md#ADR-003`). The saving is kept; the rewriter is not built. Three
  reasons, the first being that `43/ADR-001`'s hook precedent runs the other way (a hook does the LEAST
  work — a derivation-free enqueue), and the second being story 87's measured lesson about a
  repo-specific predicate that travelled and refused other repos' build commands.
- **`aof test` is a top-level command** with `cli.route: ["test"]`, outside the `work:*` bijection
  controls the way `graph:*` is.
- **`--scope impacted` bases on the uncommitted working tree**, with `--since <rev>` widening
  explicitly. No default-branch inference: a wrong base silently narrows.
- **Config keys `work.test.*` and `work.worktree.prepare` go in `.aof/aof.config.json`**, not a new
  `.aof/*.jsonc` — three scalars, not a vocabulary.
- **`runBounded` is reused** rather than a second bounded spawn authored; PATH resolution is placed in
  FRONT of its argument-vector door rather than relaxing the door. The resulting naming-vs-ownership
  debt (one seam, two families, one family's directory name) is routed to `TECH_DEBT.md` item 85.
- **No new hook of any kind is shipped by this milestone.**

### Standing condition, not a 72 regression

`work.controls.runners` is unconfigured repo-wide, so `aof work doctor`'s leg B — *does a runner name
this control file?* — never runs, for any milestone. It reports here as `control-runner-unchecked`.

## Verification

- [x] `@executable` suite green — per-story lanes 12/12, 16/16, 57/57, 23/23, 10/10; guard lane 95/95;
      the registered suite minus the `:4182` binder 8,489/8,496 at the gate with all seven failures
      named and attributed to other items (`VERIFICATION.md`).
- [x] Fitness functions green — all seven declared controls resolve, each with a recorded red probe
      (30 probes, every restore byte-identical).
- [x] `@manual` — one scenario in the milestone (72/04 `tasks/01`, the FF-7207 ratchet probe), run by
      verify and recorded in `VERIFICATION.md`; **no `@uat` scenario exists**, so no human sign-off
      applied and none was solicited; there is no `UAT.md`.

## Feedback (for retro) — ARCHIVED at the close, 2026-09-03

The twenty-two running notes this section carried were triaged at the milestone gate and have
GRADUATED into `RETROSPECTIVE.md` as lessons **R1–R10**, exactly as durable decisions graduate into
ADRs. Four had already become work items or register rows before the gate: this repo's undeclared
`work.worktree.prepare` is **chore 90** (F-72-AI), the malformed-config-reads-as-absent gap is
**chore 94** (F-72-AP), the silent whole-suite run is **F-72-AN**, and the undischarged registration
report is **F-72-AO**. Two were evidence rather than lessons and live in `VERIFICATION.md` (FF-7207's
ratchet probe, re-run by verify; ADR-004 §5's one-line discriminator, confirmed by diff). The two
that are neither a lesson nor a work item are carried below.

- **ADR-002 §5's refusal list is one short of the code.** 72/01 ships `changed-set-unreadable` (git
  itself failing to answer `status`/`diff`) beside the two the ADR names (`since-rev-unresolvable`,
  `changed-set-empty`); it is not a fifth widening reason and contradicts nothing. ADRs are
  append-only, so the amendment is one sentence for the architect the next time `ARCHITECTURE.md` is
  opened — not this gate's edit.
- **The benign delta on the session path.** `deriveRouteTable`'s route-id collision check no longer
  runs for `aof session …`, because the session arm dispatches above the route table; it still fires
  on every other verb and throughout the arch suite. Recorded beside the arm in `src/cli.mjs` and in
  72/03's `OUTCOME.md` Assumptions.
