---
type: story
number: 05
slug: the-fitness-functions
title: "FF-5301…FF-5311 — the gate, landed green"
parent: 53
depends: [53/00, 53/01, 53/02, 53/03, 53/04]
status: done
owner: product-owner
created: 2026-08-15
updated: 2026-08-20
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 05 · FF-5301…FF-5311 — the gate

## User story

As a **maintainer inheriting this loop**, I want every structural invariant the ADRs assert to be
enforced by a test that runs in CI, so that "the driver is mesh-blind", "L3 is locked" and "L1 writes
nothing" stay true after the milestone that made them true — rather than decaying into comments that
describe a system that no longer exists.

## Context

**Eleven** new `test/arch/acd-*.test.mjs` files — ADR-011 §4 added FF-5311
`acd-loop-suite-registration` to the ten — each exporting an array of `{ name, run }`, plus the
explicit-runner seam in `scripts/test.mjs`: eleven imports and eleven spreads in this story's own
labelled `// milestone 53 / story 05` block, mirroring the m52 block at
`scripts/test.mjs:2446-2468`. No runner logic changes, and no other story's block is touched —
53/05's ownership of that file narrows to the m53 ARCH block only (ADR-011 §1).

**This story is last on purpose, and this repo has the scar.** Authoring arch-tests before their
surfaces exist gives a long RED window in which "red because unbuilt" is indistinguishable from "red
because broken" — TECH_DEBT item 5 (*"Part of the fitness gate is dead… the gate reads green-ish
while not running"*) and item 27 (nine suites RED at HEAD with nothing saying so). The invariants
themselves are already written and reviewable in `ARCHITECTURE.md`; this story mechanises them and
lands them green.

Two disciplines are non-negotiable and both come from measured failures. **`{ name, run }`, never
`{ name, fn }`** — a test exported under the wrong key is never invoked, which is item 5's failure
shape reproduced on this milestone's own gate. And **every source-grep is token-scoped and
comment-stripped** — a bare `loop`/`drive` grep is RED on day one, because `src/work.mjs:904` says
"the story-loop returns", 52's `ui/src` comments carry "loops", and the `mesh-*` modules narrate
"driver" throughout.

Two legs are **named proxies**, not decision procedures, and their false-negative surface is stated
rather than hidden: FF-5301's mesh-token grep (a driver taking an assignment id under another name
would pass — the real guarantees are the frozen five-member direct-import set, the transitive
lifecycle leg and the 21-module reach ceiling, ADR-015 §5) and FF-5305's no-`L3`-branch grep (a
branch keyed on a computed string would pass — the real guarantees are the frozen constants and the
driven refusal).

ADR references: the `## Fitness functions` table in `ARCHITECTURE.md`, and through it every ADR.

## Acceptance

- **All eleven land green**: FF-5301 `acd-session-driver-mesh-blind` · FF-5302
  `acd-session-driver-single-home` · FF-5303 `acd-phase-door-not-a-driver` · FF-5304
  `acd-loop-probe-contract` · FF-5305 `acd-loop-level-l3-locked` · FF-5306 `acd-loop-l1-read-only` ·
  FF-5307 `acd-loop-state-rides-the-run-record` · FF-5308 `acd-loop-scope-guard` · FF-5309
  `acd-loop-ready-registry-optional` · FF-5310 `acd-loop-cap-single-home` · **FF-5311
  `acd-loop-suite-registration`** (ADR-011 §4 — name-set membership for EVERY m53 suite, because
  `acd-test-suite-registration:151` keys on `runners.includes(basename)` and cannot see an
  imported-but-never-spread file; TECH_DEBT item 50 carries the general fix).
- **Each mechanises its row's stated legs**, including the ones that are behavioural drives rather
  than greps: FF-5304's zero-spawn/zero-run probe over an injected seam; FF-5306's **byte-level**
  before/after snapshot of the whole fixture tree; FF-5307's end-to-end `brief.loop` write and
  read-back through `work:run-status`; FF-5309's both-commands-invoked equality against
  `work:loops-validate`'s own `summary.checks`.
- **Examples are an executable evidence ledger, not illustrative prose.** Every mutation and
  positive-control row carries a stable row id and the exact story-owned arch-test file that must
  mechanise it. A row is green only when that owner executes the named plant/control and asserts
  the stated observation; a neighbouring assertion or a source grep does not discharge it. One
  test case may cover several rows when it drives each row explicitly (for example a table loop),
  so this contract does not invent a one-test-object-per-sentence rule.
  Where an older table has no dedicated `row id` column, its canonical id is
  `T<task-number>:<gate>:<literal first-cell text>` and the `gate` column is the executable owner;
  for task 05 the owner is always `test/arch/acd-loop-cap-single-home.test.mjs`. Those literal cells
  are frozen evidence handles for this story. The supplemental ledgers assign short ids to the
  controls most likely to false-green; they alias, rather than replace, the canonical ids.
- **FF-5308's necessity leg drives the real `nextWork`** — over a two-active-milestone fixture with
  one in-scope ready item and one earlier out-of-scope ready competitor,
  `nextWork(workDir, "02/01")` returns `01/00`, outside `02/01`, proving the guard protects
  against a live defect rather than restating a regex. That leg is GREEN now and goes RED only when
  TECH_DEBT item 49 is paid — which is the correct signal to revisit the guard.
- **FF-5302's shrink ratchet is armed at the measured post-move line count** of
  `src/mesh-worker-execution.mjs`, so the sink can never grow back through this seam.
- **The two green-now legs stay green** and are asserted as such: FF-5303's `continue.mjs` half and
  FF-5308's necessity leg.
- **Registration is additive only** — eleven imports, eleven spreads, one labelled
  `// milestone 53 / story 05` block, and **no other story's block or region of `scripts/test.mjs`
  is touched** (ADR-011 §1/§2). Every arch test exports `{ name, run }`.
- **Exactly TWO pre-existing test files are edited, and within them only the named accepted-test
  assertion blocks plus their directly adjacent explanatory test labels, messages or comments** —
  `test/arch/acd-loop-finding-envelope.test.mjs:358-359` and
  `test/work-loops-coverage-ledger.test.mjs:677`, `:702-703` (three assertions in two **accepted
  milestone-52** suites, narrowed from a `deepEqual` against a literal nine to superset membership).
  Granted by **ADR-015 §10's class rule**, which carries both narrowings;
  ADR-014 §4's ratchet fired on 53/05 as the fourth story to want the form. The adjacent prose
  allowance exists only to keep the amended assertion truthful; it may not change another assertion,
  fixture, setup, helper or executable path. Nothing else in those files moves, milestone 52's
  delivered `.feature` files stay byte-unchanged, and **no 53/05 gate is renamed**. The reopened 53/00
  story exclusively owns the door-suite allowlist and its associated accepted feature amendments.
  `acd-work-command-cli-bijection`'s four `argsFor` cases still belong to 53/02 and
  `acd-worker-driver-no-headless-print`'s source-constant split to 53/00.
- **The three amended rows are built to their AMENDED shape** (ADR-015, which ruled the three
  contradictions this story raised at build time — no ADR's substance moved): **FF-5301** is three
  legs, the frozen **FIVE** direct imports asserted both ways, a transitive **LIFECYCLE** denylist
  with `mesh-log.mjs` and `workspace.mjs` struck from it and admitted each by a named reason carrying
  a self-check, and a **21-module** reach ceiling with a floor (§5); **FF-5306**'s L1 account is
  collected at the **report channel** and `driven` is asserted **`[]`**, leaving ADR-005 §3's ten keys
  untouched (§1); **FF-5310** defines its population by **RESOLUTION** form — the measured four
  resolvers, plus exactly **one** admitted declaration inspector, `src/work-doctor-loop-ready.mjs`,
  pinned by carrying no `??` (§6).
- **FF-5302's frozen export set is SEVENTEEN names** — ADR-001 §1's sixteen plus
  `ensureWorktreeTrusted`, admitted by name (ADR-010 §18) — with an eighteenth export as much a
  defect as a missing one; FF-5310's reader set is the measured FOUR and its `autonomous.md` leg is
  "at least once", not "exactly once" (ADR-010 §21).
- **Every run is test-isolated** — `AOF_GLOBAL_HOME` pointed at a temp dir, per the repo's
  hook-enforced rule. No fixture touches the real `~/.aof`.

## Tasks

- [x] [00 — eleven gates the runner actually invokes: `{ name, run }`, one labelled m53 block, name-set registration](tasks/00_registration-and-harness-shape.feature)
- [x] [01 — the import-graph and export-set gates catch a planted violation (FF-5301, FF-5302)](tasks/01_import-graph-and-export-set.feature)
- [x] [02 — the drives that prove nothing happened: zero spawns, zero mints, zero moved bytes (FF-5304, FF-5306)](tasks/02_drives-that-prove-nothing-happened.feature)
- [x] [03 — the drives that prove two readings agree: the `brief.loop` round trip and the composed-count equality (FF-5307, FF-5309)](tasks/03_drives-that-prove-two-readings-agree.feature)
- [x] [04 — the refusal gates catch a door that executes, a level that unlocks and a scope that widens (FF-5303, FF-5305, FF-5308)](tasks/04_the-refusal-gates.feature)
- [x] [05 — the cap's single home catches a new default, a fourth spelling and a prose loop that stayed (FF-5310)](tasks/05_the-cap-single-home.feature)

## Notes

**Refinement rulings — all three build-time contradictions are DISCHARGED (ADR-015, 2026-08-17),
which carries the measurements; the amended task contracts carry what to build.** All three were
ruled the same way — **the instrument was wrong about the tree, not the rule** — so no ADR's substance
moved: **§5** FF-5301's one denylist was self-contradictory (it denied `workspace.mjs`, which its own
admitted `terminal-ws.mjs → work.mjs` edge reaches at `src/work.mjs:17`) and becomes three legs;
**§1** FF-5306's L1 account is observed at the report channel, `driven` staying `[]`; **§6** FF-5310
separates cap RESOLUTION from declaration INSPECTION. Tasks 01, 02 and 05 are unblocked and carry the
ruled contracts; their subsequent build ticks remain separate from this refinement pass.

**The accepted-test edit ownership is settled here.** Under ADR-015 §§8/10, 53/05 may amend only
the two named milestone-52 accepted-test assertion regions and the directly adjacent explanatory
labels, messages or comments needed to describe those assertions truthfully. The reopened 53/00 owns
`NAMES_THE_NEW_MODULE`'s six → ten widening and its suite. This grant authorises no delivered
milestone-52 `.feature` edit and opens no other assertion, fixture, setup, helper or executable path.

**QA traceability ruling (2026-08-17).** The six task Examples tables now give every mutation and
positive control a stable id plus its owning gate. In particular: FF-5311 owns import/spread
contiguity; FF-5301 owns every closed denylist member and
both admitted-edge self-checks; FF-5304 owns a live spawn-seam control and a real-face `--json`
control; FF-5308 owns the active `02` → `02/01` control before the `02/01` → `01/00` necessity leg;
and FF-5310 owns explicit rejection of alternate range-driving commands. FF-5311 owns the two
accepted-test diff ceilings `ACCEPT-02` and `ACCEPT-03`. The ids are evidence
handles, not test-count demands: an owner may mechanise multiple ids in one table-driven test.
`acd-loop-cap-single-home`'s current sentinel-ended positional slice remains a build defect under
task 00; this refinement does not bless it or prescribe its code fix.
Tasks 00 and 04 are reopened for build because this refined ceiling and the truthful FF-5308 fixture
are not yet implemented. The positional-slice violation and missing promised controls recorded in
`STATE.md` also remain build obligations; this PO pass does not waive them.

**Developer-feasibility pass (2026-08-17): CONFORMS — test-only build, no production change.** The
current eleven-gate lane is 39/39; the separate global registration ratchet is 3/4, red only on
`acd-loop-cap-single-home.test.mjs`'s `slice(0, after.indexOf(";"))`. Every refined row has an existing
test-side seam:

- FF-5311 can enforce `ACCEPT-02` and `ACCEPT-03` with EOL-normalised residue digests after removing only each
  named assertion/adjacent-explanation region, plus exact current-region pins. The same gate can parse
  the labelled runner blocks into lines, assert eleven consecutive exact import/spread rows, and drive
  interleaving plants against that pure block validator. Accepted 53/00 and milestone-52 task features
  remain hash-pinned/untouched; no git rewrite or production import is needed.
- FF-5301's existing `walkImports`/`deniedPaths` functions accept disposable roots. A table of fifteen
  tiny `driver → launder → denied-target` trees covers every `IMP-DENY-*` member; the two live admitted
  edges and the direct-five equality already supply the stale-permission and positive controls. The
  list-overlap self-check is a pure set intersection.
- FF-5304 can use the exported `runCommandFace`, registry-derived `work:loop` command and existing
  `completingDriver(...).options.ptySpawn`. A probe records zero calls, an L2 drive reaches the SAME
  injected function once, and a shallow test-only command wrapper counts whether the real face consults
  launch under `--json`; no face or command seam changes.
- FF-5308 needs only replace its current done-`01`/ready-`02` fixture: two active milestones with
  `02/01` and earlier `01/00` make `nextWork(workDir, "02") → 02/01` the discriminating control before
  the shipped story-scope fall-through returns `01/00`. Both calls use the exported real function.
- FF-5310 replaces the forbidden sentinel cut with `blockOrStatementAfter` from the already-shared
  `test/support/source-slice.mjs`, asserting NOT FOUND on null. `markedRegion(prompt, "<process>",
  "</process>")` plus a closed collection of `aof work <verb>` commands proves the only range driver is
  `loop`, and drives `CAP-MUT-14`/`15` without expanding the seven-token denylist.

The exact edit ceiling is therefore the eleven story-owned gates, 53/05's two labelled runner blocks,
and the two `ACCEPT-*` assertion/prose regions (`ACCEPT-02` and `ACCEPT-03`). The global positional ratchet is read, not edited; its
existing zero allowance becomes green when FF-5310 stops violating it. ADR-015 §§2/5/6/8/10 and all
accepted-feature immutability clauses remain mutually implementable as written.

These are structural invariants only. The observable behaviours — "the loop halts at a `@uat` gate
and names the ref", "a needs-input session stops the loop and reports the session id", "the score
reads 3/4 on a repo with no memory backend" — are the other stories' `.feature` scenarios and
deliberately do not live here.

Milestone 52 shipped 1,176 lines of `src/` with zero behavioural suites (TECH_DEBT item 48). The
guard against repeating that is **not** this story's to carry alone: each of 53/00–53/04 lands its
own `@executable` features as registered, re-runnable suites, in its own labelled block, with its
own diff (ADR-011 §1). What this story adds is the ratchet that makes the omission FAIL — FF-5311
asserts name-set membership for every one of those suites, and never registers them itself.
