---
doc: state
---
# 192 · Commands are built at render from a core body and the fragments of the practices a project has turned on — State

## Progress

- 2026-11-12 — Captured in the backlog.
- 2026-11-12 — Promoted as 193, then renumbered to 192 so it sits before operator-aware discovery
  (now 193), which waits on it.

- 2026-11-13 — Refined (`aof:refine 192 --autonomous`; solo, run `20261112T235111891Z-0000`, no
  session id: the live store did not answer). ARCHITECTURE ADR-001–008, FF-19205–19208 declared
  `pending`, four stories with their example maps, build plans and 16 task features.
  `aof work validate` passes; `aof work doctor 192` reports no error. Nothing is built.
- Waves: 00; then 01 and 02 together; then 03. `aof work next 192` answers 192/00.
- 2026-11-13 — Refine re-dispatched by the loop (`aof:refine 192 --solo`, driven run
  `20261113T065020379Z-0008`) after verify's three cycles. Nothing to do: the four stories hold
  their contracts and are all accepted, `aof work validate 192` passes, `aof work doctor 192`
  reports no error and no `pending` control, and the lock re-stamp (F-01/F-02) is committed. No
  ADR, story or contract was touched. What remains is verify's: `aof work regression-gate 192`
  and the milestone accept.
- 2026-11-14 — Post-loop cleanup (operator-asked, interactive). The loop ended after refine cycle
  1 without the gate or the accept. Removed the two leftover dispatch worktrees
  (`dispatch-192-02`, `dispatch-192-03`) and their branches, both merged into HEAD; their only
  uncommitted content was lane lock writes that the committed re-stamp replaces (`aof work update
  --dry-run` at HEAD: 236 up to date, `work.practices` recorded). F-04's deferral now has its
  backlog item, `backlog/chore_practice-list-fits-the-terminal`. 192/00 and 192/01 gained the
  `RETROSPECTIVE.md` the doctor asks of a delivered story (`story-record-missing`).

## Notes & decisions in flight

- 2026-11-13 — **Default decisions taken at refine**, each the operator's to overturn at review:
  - **A stale render is an error in one direction only** (ADR-006 §3, §5). A practice that is on
    while the commands were rendered without it fails `aof work doctor`; the reverse is a
    warning, because the prose tells itself to stand down. The SPEC says only that the doctor
    "says so".
  - **Two seam edits to the moved prose** (ADR-005 §4). The refine Contract's opening loses
    "opening with the discovery beat below when the project has turned it on", and the Codex
    skill entry's "…before writing tasks; retain…" becomes two sentences. Everything else is
    held to "the same once whitespace is collapsed". The SPEC says "no change in what it says";
    these two are the places where that and "no sentence about the example map" cannot both hold.
  - **A fragment names its practice, and the practice names the keys** (ADR-002 §1). The SPEC has
    the fragment name the keys itself.
  - **A slot may exist in the Codex text alone** (ADR-002 §7), for the one gated sentence in the
    Codex skill entry. The SPEC says the two bodies carry the same slots; every slot of the
    Claude source is still in the Codex text.
  - **The build brief is a practice declared by core's own bundle**, not a new package
    (ADR-005 §1).
  - **Not moved** (ADR-005 §6): the developer brief's `PLAN.md` paragraph, `manual.md`'s line,
    the review briefs' sentence about a build plan, the Codex execution contract's sentence about
    a map token (45 copies), and the default `EXAMPLES.md` and `PLAN.md` templates, which are
    still installed in every project.
  - **The stale-render check is in `aof work doctor`**, as the SPEC says, against the placement
    190/ADR-008 §1 chose for a config-fit check (ADR-006 §4).
  - **`aof work init` does not print the list of practices** (ADR-007 §3).
  - **Fitness ids start at FF-19205**, because FF-19201–19204 are 193's.
- 2026-11-13 — **Discovery.** Each story has an example map. No business question was left on
  any of them: every rule is stated in the SPEC's Scope, and what remained were engineering
  choices, labelled `technical` and defaulted to an ADR. Nobody was asked anything.
- 2026-11-13 — No diagram was drawn. The composition is one pass in the loader, and a picture
  would add nothing to ADR-001 §3.
- 2026-11-13 — **193/04's guessed fragment layout holds** (ADR-005 §3): its `files:` need no
  change for where a fragment or a template variant lives.
- 2026-11-13 — The story read and write sets were derived by hand from `aof graph impact` (graph
  built 2026-11-13, 21,587 nodes) and a search of the test tree. The derivation service has no
  CLI door. 192/02's list of suites that pin the moved prose comes from a search, not a proof.

- 2026-11-12 — Framed from the operator's question at the review of 193's refine: the commands are
  getting long, and in some projects a practice such as operator-aware discovery is not needed.
  The operator's steer: make commands "buildable", so an extension can add to a Claude or Codex
  command. Agreed in that conversation: the mechanism is its own milestone, ahead of 193's prose;
  its first job is a move of the prose that is gated today, with no change in what it says.
- 2026-11-12 — Weighed and left out of scope: one source for the Claude and Codex bodies (they
  differ in wording), and fragments supplied from outside the aof packages (a packaging and trust
  question of its own).

- 2026-11-13 — **192/00 built** (solo, attempt 1). `bundle-compose.mjs` is the pure module;
  `loadBundle({ config, readText })` validates every contribution and composes every text before
  it returns; init and update read the project's config once, load with it and hand the same read
  to the synthesis; the role launcher loads with the config it is handed. `updateWork`'s
  `bundleOverride` may now be a function of the project's config, the seam the plan's known trap
  asked for. The shipped manifest regenerates byte for byte. The near-miss recall ran after the
  build had started rather than before it (empty either way), and is recorded as such.

- 2026-11-13 — **192/02 built** (solo, attempt 1, driven run `20261113T022041571Z-0000`). Nine
  slots cut from refine and the three briefs, in the Claude sources and their Codex texts, by a
  script that asserted each passage's first and last line before cutting; the bodies were pasted
  unretyped into `assets/fragments/discovery/` of `@aof/specification-by-example` and
  `assets/fragments/build-brief/` of core. The package is the second entry of `PRACTICES`, with a
  `./contribution` export and `assets` in `files`. This checkout's update (with this tree's CLI)
  rewrote four files, and the collapsed comparison found only the two seam edits; the briefs are
  byte-identical (VERIFICATION.md, `@manual`). The shipped manifest moved for refine, its Codex
  skill and the three briefs, as ADR-005 says. The near-miss recall ran after the cut, not before
  it (empty), and is recorded as such.

## Feedback (for retro)

- 2026-11-13 — 192/00: the story's declared budget moves named two directories, and the build
  moved a third: `packages/core/test` goes 44 -> 45 for `bundle-compose.suite.mjs`, whose fixture
  the three `test/arch/practices` controls import. Refine derived the write set by hand; the
  suite convention it followed puts a new suite in that directory, so the row was owed too.
- 2026-11-13 — 192/00: `aof test --scope impacted --story 192/00` widened to all 1,280 suites
  (`no-graph`), as on every story of 191. The by-file run over the 179 suites that import a
  changed module or sweep source is the story's evidence; the milestone regression gate is owed.

- 2026-11-13 — 192/00 review close (solo; structural, behavioural and craft lenses inline, no
  UI so no design lane). No Blocker; one round. Routed:
  - **fixed** — `slotsOf` scanned every text line by line on every load; it now returns early when
    a text holds no marker. **fixed** — a `readProjectConfig` wrapper duplicated the `readConfig`
    init and update already import; removed, and the read is handed to the synthesis as before.
  - **recorded** (Nit) — a fragment contributed by an INTEGRATION package is gated by its
    practice's keys only, not by `work.integrations.<id>`. No integration ships a fragment, and
    the milestone serves practices; the question belongs with the first integration that does.
  - **recorded** (Nit) — task 03's update scenarios drive `updateWork` in-process through its
    `bundleOverride` seam rather than a spawned `aof work update`: a fixture package cannot reach
    a spawned CLI. The init scenario does spawn the CLI.
  - Pre-existing reds seen in the by-file run and not caused by this diff: `arch/m42-item-3`
    (pty.mjs), FF-7106 and FF-9603 (records of 192/02 and 193/00/04), `87/00` (`apps/ui/dist`
    not built in this worktree), `work/archive-is-a-move` (`/var` vs `/private/var`) and the two
    `156 — retained … lane` cases (same two red on a clean HEAD checkout). `154/07 task00` timed
    out under load and is green alone.

- 2026-11-13 — 192/00 grade round: two cases the by-file run did not select went red.
  FF-11901 (121): the FF-19207 control spelled its own import extractor; it now reads
  `importSpecifiers`/`computedDynamicImports` from `test/support/module-family.mjs`. FF-16004:
  `aof work find` loads one module more (`bundle-compose.mjs`, which the synchronous loader
  imports statically), so its pinned ceiling goes 753 -> 754 with that reason. Neither
  `test/arch/command/acd-cli-entry-executes.test.mjs` nor the extractor rule was in the story's
  derived read/write set; any new core module on the bundle path owes that ceiling row.
- 2026-11-13 — 192/01 build (solo, run `20261113T023017542Z-0000`). `aof test --scope impacted
  --story 192/01` widens to all 1280 suites here (every declared path `no-graph`), so the run was
  taken by file: the 56 suites that import `work/bundle.mjs`, `bundle-compose.mjs` or the compose
  suite, then all 547 under `test/arch`. Every 192/01 case is green (136 across the two suites).
  The reds that remain are outside this story's diff and were left alone: FF-7106 names 192/02's
  and 193/04's `files:` (tracked renders undeclared); FF-9603/96/02-00 names 193/00's `PLAN.md`
  (`path-list` at line 49); m42-item-3 names `packages/execution/src/pty.mjs` (2 silent catches,
  baseline 0); FF-12602 leg 2 (15 in-flight lines, ceiling 14) and FF-5301 (worker facade reach
  186, ceiling 185) are loop/session counts this diff adds no import to; 87/00 needs an unbuilt
  `apps/ui/dist`; work/archive-is-a-move compares `/var` with macOS's `/private/var`. The build's
  own silent catch (a variant file read) was caught by m42-item-3 and rewritten to answer null.
- 2026-11-13 — 192/01 grade round: `work:grade` reported FF-7706 ("a governed project that is not
  an aof checkout gets an audit of its own instruments") as `timed-out` — its fixture control
  `test/arch/green.test.mjs`, started through `audit-drive.mjs`, hit the 60000ms deadline and was
  killed. It did not reproduce: three `--fresh` runs of `test/arch/audit/acd-audit-travels-two-roots.test.mjs`
  passed every case in ~4s each, with the load average at 9–11 during the grade. Neither the audit
  family nor `audit-drive.mjs` is in the story's diff. Recorded as a load flake, not a defect.

- 2026-11-13 — 192/02: **contract gaps** — suites outside the story's `files:` that turned red for
  this story's reasons, fixed in the build and named here as the Notes ask. Three are the new
  member kind and the second practice: `packages/core/test/bundle.suite.mjs` cases outside the
  search (the valid-kind list, the loaded member set, the registry's one entry),
  `test/arch/bundle/acd-bundle-location.test.mjs` and `acd-bundle-membership.test.mjs` (a
  `fragment` is composed, not returned, and may have a Codex body alone),
  `packages/core/test/hyperagent-runtime.suite.mjs` (the fake sidecar now carries the second
  practice's assets) and `bundle-compose.suite.mjs` (core's own `build-brief` stands in every
  load). One is the module ceiling, as at 192/00: `aof work find` 754 -> 755 in
  `test/arch/command/acd-cli-entry-executes.test.mjs` for the contribution leaf. One is a real
  consequence of ADR-005 nobody listed: FF-12405 leg 9
  (`test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs`) held the lock to the
  CANONICAL manifest, and this checkout renders with both keys on, so it now holds the lock to
  this checkout's own render and to the manifest wherever the two agree. And FF-7106 asked this
  story's own `files:` for two tracked renders refine never derived
  (`.agents/skills/aof-refine/agents/openai.yaml`, `.codex/aof/workflows/workflow-contract.md`);
  both are now declared. A suite search by phrase finds the prose readers, not the readers of
  the member set; any story that adds a member kind owes those rows.
- 2026-11-13 — 192/02: `aof test --scope impacted` was not run (it widens to the full suite on
  this MacBook). The by-file run over the 136 suites that read the bundle's commands, agents,
  Codex texts or loader is the story's evidence; the milestone regression gate is owed. Reds left
  in that run, none caused by this diff: FF-7106 (193/04's record only), FF-9603 (2) and
  96/02-00 (193/00's `PLAN.md`, committed in `ad19ec78`), `yarn-installation` ×3 and
  `work/this-tree-holds-what-is-live` and `work/archive-is-a-move` (`/var` vs `/private/var`),
  `87/00` (`apps/ui/dist` not built in this worktree), and 160/07 ×2 (red on a clean HEAD
  checkout too). `bundle-asset-manifest-complete` cannot run here without `apps/ui/dist`; the
  payload case it would make is FF-19208's file's own.
- 2026-11-13 — 192/02 review close (solo; structural, behavioural and craft lenses inline, no UI
  so no design lane). No Blocker; one round. Routed:
  - **fixed** — the FF-12405 change first asserted the same equality twice; the redundant
    assertion is gone.
  - **recorded** (Nit) — FF-19208's "milestones 134, 135 and 136 still hold" runs the discovery
    prose suite and the package's suites in process, so those cases run twice in a full run.
    The scenario asks for exactly that run; the cost is seconds.
  - **recorded** (Nit) — the planted "discovery fragment declared with no practice" cannot be
    planted literally: the loader refuses a fragment with no declared practice (ADR-002 §6). The
    case re-declares the fragment under a practice that is on for every project instead, which
    is the failure the row describes, a fragment no gate holds back.
- 2026-11-13 — 192/03 build (solo): this checkout's `aof work update` refused with
  `codex-output-conflict` on `.agents/skills/aof-refine/{SKILL.md,procedure.md}`: 192/02 committed
  those re-rendered files without re-recording their hashes, and a Codex-owned file whose disk
  differs from its lock entry is never replaced. Both files were byte-identical to the render, so
  the two lock hashes were brought up to date by hand and the update then ran clean (236
  up-to-date) and wrote the practice record. The update also rewrote `.aof/aof.apply-journal.json`'s
  two matching entries, a file outside the story's `files:`. A lane that hand-renders committed
  outputs owes the lock in the same commit.
- 2026-11-13 — 192/03: the declared set missed four reds the new lane causes by existing, all
  fixed in the build: `packages/core/test`'s budget row (45 -> 46 for the new suite), FF-16004's
  `work find` module ceiling (755 -> 756, the binding is the one module more), and the lane-order
  pins in FF-5905 (`acd-controls-never-execute`), 134/04 (`doctor-examples-lane`) and 133/03
  (`doctor-diagrams-lane`). `wiki/reference/practice-prose.md` also has a 150-line page budget
  (192/00, 192/01 cases); the new reference is folded into §6 rather than a section of its own.
  Any story that adds a doctor lane owes the three pins and the ceiling.
- 2026-11-13 — 192/03: `aof test --scope impacted --story 192/03` widens to all 1283 suites here
  (no graph), so the evidence is a by-file run of the 97 suites that drive init, update or the
  work doctor, plus the practice controls. Reds left, none caused by this diff (each red on a clean
  HEAD checkout, or already recorded by 192/02): 156 ×2 (codex-ownership, "is a main working
  tree"), chore 103 (doctor-cwd-independence), 96/02-00, `work/archive-is-a-move`, three files the
  runner reads as exporting no case array, and 167/00 "a daemon warn never fails validate", which
  fails only under the bulk run's load and passes alone three times (deliberate fresh reruns to
  chase it). The milestone regression gate is owed.
- 2026-11-13 — 192/03 review close (solo; structural, behavioural and craft lenses inline, no UI
  so no design lane). No Blocker; one round. Routed:
  - **fixed** — the 134/04 edit first compared two arrays with `assert.equal`; it is a deep
    comparison of plain arrays now (`CHECK_GROUPS` is an Array subclass, so its slices keep the
    species).
  - **recorded** (Nit) — with the shipped summaries a list row is about 150 columns wide, so it
    wraps in a 120-column terminal: ADR-007 §2 puts the summary before the key. Shortening the two
    summaries in the practices' `bundle.json`, or amending §2's column order, would fix it.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`
