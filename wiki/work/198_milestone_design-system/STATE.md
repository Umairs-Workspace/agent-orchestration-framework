---
doc: state
---
# 198 · The designer draws mocks on the project's design system — State

## Progress

- 2026-11-16 — Framed by aof:add-milestone, on the backlog.
- 2026-11-17 — Promoted to 198. Refined (solo): RESEARCH R1–R7, ARCHITECTURE ADR-001–008 with
  FF-19801–19805 declared pending, and broken down into four stories.
- 2026-11-26 — Re-refined: the breakdown still holds after 207 moved ACD's assets into
  `packages/acd`. The file:line citations in RESEARCH R1, R5 and R6 now point at the current tree.
- 2026-11-26 — ADR-005 amended (operator): a system is named by `name` (its title) or by
  `artifact` (its link), exactly one. The session resolves a `name`, and a missing or duplicated
  title is a stop. ADR-003 `use`, ADR-004 §5, ADR-006 §2 and ADR-007 follow; stories 01–03 updated.
- 2026-11-26 — 198/00 contract authored (solo): example map R1–R4 / E1–E11, no business question
  (ADR-001 settles every rule; Q1–Q6 technical, defaulted), four tasks, PLAN.md. Write set grew by
  `bundle-runtime.mjs`, `update.mjs` and `init-update.mjs`; no sibling writes them.
- 2026-11-26 — 198/01 contract authored (solo): example map R1–R7 / E1–E21, no business question
  (ADR-003–005 settle every rule; Q1–Q14 technical, defaulted), six tasks, PLAN.md. Three choices
  were taken inside the contract, and no ADR changed: `tokens --mocks` lists mock-only values
  (Q5), `check --source` runs before config exists (Q7), and a practice contribution may carry
  `commands` (Q11). The write set grew by `command-core.mjs`, core's `package.json`, `scripts/test.mjs`,
  the application count and inventory fixture, the manifest and the rendered Claude command. The
  doctor warns: 7 rules (limit 4) and a 60-line map. The story stays whole because ADR-008 keeps
  extraction in wave 1 for the 2026-12-14 deadline.
- 2026-11-26 — 198/02 contract authored (solo): example map R1–R6 / E1–E20, no business question
  (ADR-002, -005, -006, -007 and the story's Notes settle every rule; Q1–Q14 technical, defaulted),
  four tasks, PLAN.md. Three choices were taken inside the contract, and no ADR changed:
  - refine gets a new slot, `decide.designer`, mirrored in Codex's refine procedure (Q1);
  - the approval ask offers Approve, Revise and Later, and Later is what verify's pull-back is for (Q9);
  - capture reaches the browser through a page entry on the 133 rasterizer, which core injects (Q7).

  The write set grew by `svg-rasterizer.mjs` and its suite, core's `diagrams/rasterize.mjs` and
  `command-core.mjs`, the practices arch index and FF-19805's fixture. Every overlap is with 01
  or 03, and both are already serialised against 02. The doctor warns: 6 rules (limit 4) and a
  62-line map. The story stays whole because the verbs and the prose that calls them prove out
  in one @manual run.
- 2026-11-26 — 198/03 contract authored (solo): example map R1–R4 / E1–E18, no business question
  (ADR-003, -005, -007 and the story's Notes settle every rule; Q1–Q14 technical, defaulted), four
  tasks, PLAN.md. Two choices were taken inside the contract, and no ADR changed:
  - the type's merge is a verb, `tokens --merge <tokens.json> --out <file>`, because merging two
    token files is file assembly, which ADR-003 §2 keeps out of prose (Q2). It refuses an `--out`
    that is a source file;
  - verify's re-sync hangs on a new slot, `checks.design-system`, at the end of step 1, and runs
    only at a milestone's accept (Q1, Q5).

  The template variant also gives 02's `## Design-system gaps` its place. The write set grew by
  verify's slot markers (`verify.md`, `workflow.md`), the manifest, FF-19802's file, the practice
  suite and two rendered files. Every overlap is with 02, and 03 follows 02. The codebase graph was
  not consulted: `@aof/design-system` is unbuilt, so no graph covers it. The sets come from the ADRs
  and the siblings' contracts. The doctor warns that the map is 57 lines.
- [x] `00_story_a-fragment-can-be-for-claude-only` — built and reviewed (in-review, 2026-11-26); accepted (done, 2026-11-27)
- [x] `01_story_a-project-extracts-its-design-system-and-names-it` — built and reviewed (in-review, 2026-11-26)
- [x] `02_story_mocks-are-drawn-on-the-system-and-committed-as-the-baseline` — built and reviewed (in-review, 2026-11-27); task 03 (@manual) is the operator's real canvas run
- [x] `03_story_an-owned-system-stays-true-to-its-code` — built and reviewed (in-review, 2026-11-27); task 03 (@manual) is the operator's real re-sync on a probe system
- 2026-11-27 — aof:verify 198: 198/00 accepted. 01–03 stay in-review, awaiting the operator's
  Claude Design `@manual` runs. The milestone is not accepted: no regression gate yet (the 02/03
  builds are uncommitted, and FF-7106 is red on 210/00, VERIFICATION F-01).

## Notes & decisions in flight

- **Operator action, due by 2026-12-14:** export every page of the `AOF` Claude Design project not
  already committed into the repository, as `.dc.html` (with `support.js`) or self-contained
  `.html`. It is extraction's input (ADR-004) and is lost when standalone Claude Design closes.
  Already committed: milestones 21, 25, 46, 47 and 172 (RESEARCH R4).
- The four open questions from framing are resolved:
  1. A subagent can hold the Artifact tool, but the designer is not given it (ADR-002).
  2. A canvas is `.dc.html` artboards that render offline with the runtime as `support.js` (R2,
     ADR-006).
  3. Claude Design cannot be read live, so extraction reads exports (R4, ADR-004).
  4. The practice lives in a new `@aof/design-system` package (ADR-008).
- Diagram not drawn: `diagram-generator-missing` (ADR-006's brief kept; the diagram-design plugin
  is not installed on this machine).
- The near-miss surfaced by the architect's recall (m193/04 R2) is honoured in FF-19802 (recall
  `def45e71-425a-4351-8a91-e11cac8a7228`). The PO's recall returned nothing
  (`3f509ea2-4ad2-437a-b8c9-fb01e7e03abf`).
- `work.examples.enabled` is on in this repository, so each story's Contract starts with its example
  map at `aof:refine 198/NN`.
- **198/01 continue, attempt 2** (run `20261126T230456349Z-0002`, retry of
  `20261126T214539801Z-0001`, `failureReason: timeout`). The prior attempt built every task and
  walked the gate ladder clean; the deadline stopped it inside the widened `aof test --scope
  impacted --story 198/01`, which the manifests and `yarn.lock` widen to all 1,321 suites. The
  recall returned no finding for the story, only that run and the refine run
  (`20261126T203708652Z-0000`). This attempt keeps the build and runs the suites the change can
  touch, by file; the full tree is the milestone's regression gate.

- **198/02 continue, attempt 2** (run `20261126T235140548Z-0005`, retry of
  `20261126T233401256Z-0001`, `failureReason: runtime_offline`). The prior attempt never started a
  session: the CLI could not import `@aof/design-system`, which 198/01 added but which was not yet
  linked into `node_modules` (it is linked now). The recall (`c518eb2e-cb3f-4071-9f49-f324438ce70c`)
  returned the refine run and the four `runtime_offline` runs of the halted loop, and no finding for
  the story. Nothing was built before this attempt; the build starts from the contract.

## Feedback (for retro)

- 2026-11-26 · 198/00 build (solo) · the declared read set was incomplete: the build also read
  `packages/core/src/model.mjs` (`RUNTIMES`, the matrix's names the loader hands the pure composer),
  `packages/core/src/work/delegation.mjs` (a body rewrite after load), the work-doctor engine
  (`packages/work/src/doctor/index.mjs`, to run a scoped doctor in-process over the fixture) and
  `test/arch/testing/acd-source-directory-budget.test.mjs`.
- 2026-11-26 · 198/00 build · `aof test --scope impacted --story 198/00` widens to all 1315
  suites because `wiki/reference/practice-prose.md` is not in the graph; the affected suites were
  run by file instead.
- 2026-11-26 · 198/00 build · the near-miss recall ran after the build had started, not before it
  (it returned nothing, so nothing it would have surfaced was missed).
- 2026-11-26 · 198/00 review close (solo; architect, QA and craft lenses inline; 0 Blockers, one
  round). Routed:
  - **fixed** — `applyDelegationModelToResources` rewrote `body` but not the per-runtime
    `commonBodies`, so with a scoped fragment on and a non-default delegation model, Claude's and
    OpenCode's renders kept the default literal. Fixed in `packages/core/src/work/delegation.mjs`
    (write set grew by that file), with a case in `bundle-compose.suite.mjs` that is red without it.
  - **recorded** — `doctor-practices.mjs` repeats `update.mjs`'s legacy-lock fallback (no
    `runtimes` → `["claude"]`); one home would be better.
  - **recorded** — `acd-source-directory-budget`'s entry for `test/arch/practices` still says
    "four members"; it now holds the index and five controls (under the threshold, so green).
  - **recorded** — task 02's doctor scenarios run the work-doctor engine with the practice lane's
    own binding over the NOTES fixture rather than the CLI, which cannot be handed a fixture bundle
    (192/03's precedent for fixture practices).
  - **recorded** — `bundle-compose.suite.mjs` is now about 1,000 lines; 198's cases could move to
    a suite of their own.
  - **recorded (not 00's)** — FF-7106 is red at the base commit and here: 198/03's `files:` names
    `packages/acd/assets/commands/verify.md` without its tracked renders
    (`.agents/skills/aof-verify/{SKILL.md,procedure.md,agents/openai.yaml}`,
    `.codex/aof/workflows/workflow-contract.md`, `.opencode/commands/aof/verify.md`). For 03's
    contract to carry.
- **198/01 build (2026-11-26, solo)**
  - **recorded** — the declared write set missed five files the story could not land without, now
    added to its `files:`: `schemas/aof.schema.json` (`work.ui` is closed, so `designSystem` needs
    a node), `scripts/workspace-runtime-audit.json` (editing `config-inspect.mjs` and
    `scripts/test.mjs` re-keys their audited child-process entries; the expressions are unchanged,
    only `sourceDigest` restamped), `test/arch/command/acd-cli-entry-executes.test.mjs` (FF-16004's
    `work find` ceiling 763 → 766: the contribution, its verb descriptors and the config shape
    check), the render-level control `test/arch/practices/acd-design-system-practice.test.mjs`
    (a package suite may not import core, so tasks 00/01's render cases cannot live in the package),
    and `.aof/aof.lock.json` from `aof work update`.
  - **fixed** — the token scanner read a `:root` inside `@media (prefers-color-scheme: dark)` as the
    light theme, silently overwriting light values; only `@layer` may now wrap a theme selector,
    and anything else is unplaced with its reason.
  - **recorded** — the near-miss recall ran after the build rather than before it (empty either
    way; recall `eb487a54-5b34-4944-a0e4-cc140720140d`).
  - **recorded** — five suites (`bundle-asset-manifest-complete` ×3, `core-workspace`'s copied core,
    `application-assembly`'s HTTP close) need `apps/ui/dist`, which a dispatch worktree has not
    built. With the UI built (`node scripts/ui-build.mjs`) all five are green.
  - **fixed** (attempt 2) — the affected suites, run by file, named the counts a third practice
    moves: the practices registry (2 → 3), the command members (39 → 40, `design-system` added to
    `COMMAND_IDS`), OpenCode's render (teach and design-system both Claude-only), the practice list
    (192/03 E2, E3), the shipped practices (192/00), the workspace owners (21 → 22), and FF-11904's
    two new flat layers, `packages/design-system/{src,test}`, declared as size exemptions. All are
    in the story's `files:` now. FF-7106 is green for 01 once `.codex/aof/workflows/workflow-contract.md`
    is declared; its remaining lines are 03's, recorded above.
  - **recorded** — the story's impacted run widens to every suite (1,321: the manifests and
    `yarn.lock` have no registered dependent) and outlasts an attempt's time limit, which is what
    stopped attempt 1. Attempt 2 ran the 18 suites the change can touch, by file, all green bar
    03's FF-7106 lines (record on tree 3cd1000, then `bundle.suite` on d9cf1cc). The milestone's
    regression gate still owes the whole tree.
  - **recorded** — `tokens.json`'s exact shape (`type.groups[].styles`, `color.themes`) is this
    story's reading of the Design System type; 05's real run against `from-code.md` is what
    confirms it.
  - Task 05 (@manual) is the operator's interactive run; its supply-chain-audit leg passed at build
    (`node scripts/supply-chain-audit.mjs`: 0 warnings).

- **198/02 build (2026-11-27, solo)**
  - **recorded** — the declared read set was incomplete: the build also read
    `packages/core/src/application/bindings/integrations/services.mjs` (the collaborators a practice's
    verbs get), `packages/work/src/commands/resolve.mjs` (`requireLocalCheckout`),
    `packages/core/src/application/assemble.mjs`, `packages/core/src/application/bindings/commands/init-update.mjs`
    (the practice list's runtime suffix), `scripts/workspace-boundaries.mjs`, `test/support/module-family.mjs`,
    and the golden lane `test/golden/work-init.{lane,test}.mjs`.
  - **recorded** — the declared write set missed what the build could not land without, now in
    `files:`: `assemble.mjs` (core hands the command core the rasterizer's services), 01's own
    controls whose claims 02 changes (`acd-design-system-practice.test.mjs` E1/E2, the package's
    `practice.suite.mjs`, `contribution.mjs`), 192/03's practice-list cases
    (`practice-render-lane.suite.mjs`: design-system now lists `for claude`), the command counts and
    inventory (`application.test.mjs`, `application-assembly.test.mjs`,
    `test/fixtures/application/command-inventory.json`), FF-11904's table (`test/arch/ui` 39 → 40 for
    FF-19805; `test/fixtures/design-system` exempted), the runtime audit (the rasterizer's one spawn
    moved into the shared render), the golden lanes, and the `.aof` records.
  - **fixed (not 02's)** — four reds 198/01 left, each red at HEAD on a clean copy: the work-init,
    work-update and project-init goldens lacked `/aof:design-system` (regenerated); FF-12405 leg 7
    did not classify `design-system.md` (excluded, with its reason); `work.test.roots` lacked
    `packages/design-system/test`, so FF-19005 found its suites unselectable; and
    `application.test.mjs` still counted 144 commands.
  - **recorded** — the `all-practices` golden profile says it turns on every practice key; it lacked
    `work.ui.designSystem`, and now carries it. Its baselines show the Claude-only prose landing on
    Claude's refine, verify and designer brief, and no Codex or OpenCode file moving.
  - **recorded** — `aof test --scope impacted --story 198/02` widens to all 1,323 suites (the
    manifests, the bundle's prose and the rendered files are not in the graph), the run that timed
    out 01's first attempt. The suites the change can touch were run by file, all green: the
    design-system package's five suites, the rasterizer suite and `domain-services.test.mjs`, the
    practices, ui, diagrams, command, bundle and testing arch indexes (bar FF-7106, below), the four
    golden suites, and the 54 suites that read the changed modules. The milestone's regression gate
    still owes the whole tree.
  - **recorded (not 02's)** — FF-7106 stays red on 198/03's declaration (six tracked renders of
    `verify.md` and of its own verify fragment) and on 210/00's (thirty). For their contracts.
  - **recorded** — E12's `..`, `\` and leading-`/` rows cannot exist as entries of a real directory
    listing, so they are driven through `planImport`, the plan the verb applies; the two rows a
    listing can hold go through the verb.
  - **recorded** — A3 is half-measured: capture framed a hand-made pull with this machine's browser,
    each board at its `boards` size, and a stand-in runtime's script had run by the screenshot. The
    real `dc-runtime.js` is task 03's (@manual).
  - **recorded** — the near-miss recall ran after the build rather than before it, as at 00 and 01
    (`99cc789b-bde4-4c4b-a839-32637dc0cdaf`). Its `--block` and `--json` forms ranked different top
    fives for one query; the observation records the block's.
  - **recorded (tooling)** — `aof work resume` listed 198/01 as READY on its timed-out attempt 1
    although attempt 2 finished `done`: the sweep reads the latest FAILED run, not the lineage's
    latest. And `aof work resume <ref>` mints its run with no `sessionId`, where `run-start` captures
    one from the live store.
- **198/02 review close (solo; architect, QA and craft lenses inline; no UI surface, so no designer
  lens; 0 Blockers, one round).** Routed:
  - **fixed** — capture wrote `<board>.png` into `mocks/` whatever stood there, so a hand-taken frame
    of the same name (milestone 47's `fleet-filter.png`, say) was silently replaced, against Q5's
    rule that a verb never overwrites a file it did not write. It now refuses, naming the file;
    a case in `mocks.suite.mjs` is red without it.
  - **fixed** — a nit: capture's temp directory read `(os.default ?? os).tmpdir()`.
  - **recorded** — the rasterizer's profile directory is still named `aof-diagram-profile-*` for a
    page render.
  - **recorded** — core hands `rasterizePage` and `findBrowser` to every integration's and
    practice's verbs, as it hands `zipFiles`: the shared services bag is not per-contributor.
  - **recorded** — verify's pull-back offers Approve and Later and no Revise: a revision at verify
    is a refine act. E19 and E20 name only those two.
- **198/03 build (2026-11-27, solo, attempt 1; run `20261127T004735853Z-0001`, no session captured)**
  - **recorded** — the template variant reaches every runtime, so 198/ADR-001 §5 lists the practice
    with no runtimes again: 02's amendments of 01's E1 and 192/03's practice-list cases were moved
    to this state, and 02's "Codex and OpenCode unchanged" case now sets the DESIGN.md template
    aside. The golden `all-practices` profile gains the template, for all three runtimes.
  - **recorded** — the write set grew by verify's tracked renders (FF-7106 is green for 03 now:
    `.agents/skills/aof-verify/*`, `.codex/aof/workflows/workflow-contract.md`,
    `.opencode/commands/aof/verify.md`; none of them changed, since the practice is off here), the
    render control `acd-design-system-practice.test.mjs` (E1–E3 run `aof work update` in fixtures),
    192/03's practice-list suite, the work-init golden test and baselines, and the `.aof` records.
  - **fixed (not 03's)** — 01's `PLAN.md` restated two paths 01's build had declared (96/02-00's ban
    was red at HEAD on it); reworded without the paths.
  - **recorded (not 198's)** — 96/02-00 stays red on 210/00's `PLAN.md` (`wiki/TESTING.md`,
    `wiki/work`), and FF-7106 on 210/00's declaration. For 210.
  - **recorded** — the plan's hand check: `apps/ui/src/index.css` printed as a system, hand-edited
    (a value changed, a usage note written, a token dropped, a stale one added), merged with
    `--ref`, then checked: the code's value back, the note kept, the dropped token re-added, the
    stale one removed, `meta.source` restamped, and `check` exits 0.
  - **recorded** — the near-miss recall ran after the build, again
    (`fc0ada25-b8c2-4fa1-a092-8c608b0bec08`).
- **198/03 review close (solo; architect, QA and craft lenses inline; no UI surface; 0 Blockers, one
  round).** Routed:
  - **fixed** — `tokens --merge` ignored `--mocks` silently, so a caller passing both would believe
    the mocks had been weighed. A re-sync reads the code alone (extraction is where a mock-only
    colour is accepted), so the pair is refused; a case in `tokens.suite.mjs` is red without it.
  - **recorded** — `--out` is refused when it resolves to a source path, compared as resolved
    paths: on a case-insensitive file system a differently-cased spelling of a source file is not
    caught.
  - **recorded** — the merged file keeps the input's JSON layout (`formatJson` mirrors it), so a
    hand-compacted system file comes back with mixed indentation.

## Verification

- [x] `@executable` suite green: story-scoped lanes, 2026-11-27. The whole tree is owed to the regression gate.
- [x] Fitness functions green, with a red probe recorded for each of FF-19801–FF-19805
- [ ] `@manual` signed off: 01/05 (bar its audit leg), 02/03 and 03/03 are the operator's runs. See `VERIFICATION.md`.
