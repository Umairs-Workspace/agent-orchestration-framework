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

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`
