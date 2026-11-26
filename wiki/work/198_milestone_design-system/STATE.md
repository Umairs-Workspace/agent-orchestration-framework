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
- [x] `00_story_a-fragment-can-be-for-claude-only` — built and reviewed (in-review, 2026-11-26)
- [ ] `01_story_a-project-extracts-its-design-system-and-names-it` — contract authored (wave 1, behind 00 on `test/arch/practices/index.mjs`)
- [ ] `02_story_mocks-are-drawn-on-the-system-and-committed-as-the-baseline` — contract authored (wave 2)
- [ ] `03_story_an-owned-system-stays-true-to-its-code` — contract authored (wave 3, behind 02 on `bundle.json` and the verify fragment)

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

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`
