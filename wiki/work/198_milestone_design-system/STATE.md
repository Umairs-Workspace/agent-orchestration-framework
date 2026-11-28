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
- 2026-11-27 — F-04 fixed inline (operator's go), from the portal's live extract: the block holds
  the project's one canvas (`canvas`, `use --canvas`), mocks are drawn on a page per milestone of
  that one canvas (`mocks import --page`), and the extract asks first and answers questions without
  acting. ADR-005 and ADR-006 amended. The live 02/03 run now draws on a page, not a new canvas.
- 2026-11-27 — F-05 fixed inline (operator's go), from the portal's 37 refine: with the practice on,
  refine draws on the system and asks only for approval (no checklist-only or own-mocks offer), a
  canvas's pages come from `aof design-system canvas pages`, and refine starts from the boards already
  on the milestone's page. ADR-002 §4 and ADR-006 §0 amended.
- 2026-11-28 — F-06 fixed inline (operator's go: "amend what you delivered"): extract consumes the
  boards of any number of canvases, and the inventory review standardises their values onto the
  code's tokens (map, accept or drop, by the verb's `nearest`) before the system is built. ADR-004
  amended.
- 2026-11-28 — F-07 fixed inline, found at verify on the portal's 37 import: two of its eleven
  baselines were blank, because each board only mounts `Messaging` (`<dc-import>`), which the
  import never copied, and capture opened boards from `file://`. The import now carries mounted
  components, capture serves the folder on loopback, and the portal's 37 import was redone from the
  same approved version. ADR-006 amended.

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

Graduated 2026-11-28 into `RETROSPECTIVE.md` and the stories' retrospectives (01, 02); the
blow-by-blow is in git history before this commit.

## Verification

- [x] `@executable` suite green: story-scoped lanes, 2026-11-27. The whole tree is owed to the regression gate.
- [x] Fitness functions green, with a red probe recorded for each of FF-19801–FF-19805
- [ ] `@manual` signed off: 01/05 (bar its audit leg), 02/03 and 03/03 are the operator's runs. See `VERIFICATION.md`.
