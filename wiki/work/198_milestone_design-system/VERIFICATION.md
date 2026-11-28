---
doc: verification
---
# 198 · The designer draws mocks on the project's design system — Verification

## Fitness functions

Each row is filled when its control lands. The red probe records what was changed to make the
control fail, and the message observed.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-19801 | `test/arch/practices/acd-fragment-lands-on-every-runtime.test.mjs` | green, 2026-11-27 (verify, focused run) | **On disk, 2026-11-27 (verify):** the shipped `design-system-refine-canvas` in `packages/design-system/assets/bundle.json` was made to name `"claud"`. The suite went red at bundle load, before the control's own sweep ran: "Fragment "design-system-refine-canvas" contributed by @aof/design-system names the runtime "claud" in its "runtimes", which the capability matrix does not hold: its runtimes are "claude", "codex", "opencode"." The control's own assertion is reached by the in-file planted gaps over the fixture bundle (a Codex body on a Claude-only fragment, `"claud"`, a named runtime with no body), each green as a red, naming the fragment, the runtime and the slot. Restored byte for byte. |
| FF-19802 | `test/arch/practices/acd-runtime-scoped-prose.test.mjs` | green, 2026-11-27 (verify, focused run) | **The fixture leg, on disk, 2026-11-27 (verify):** `isFor` in `packages/core/src/work/bundle-compose.mjs` made to answer `true` for every runtime. Both legs went red: "the fixture bundle: fragment notes-demo, member command:demo, runtime codex: it does not name the runtime, and its render differs from the render with the fragment deleted; fragment notes-demo, member command:demo, runtime opencode: it does not name the runtime, and its render holds the body; fragment notes-agent, member agent:aof-demo, runtime codex: …", and "the shipped bundle: fragment design-system-refine-canvas, member command:refine, runtime codex: …". Restored, clean against HEAD. **198/02, the shipped leg:** (a) the shipped `design-system-refine-canvas` made unscoped, with its common body also given to Codex so the load accepts it; (b) a composer that loses the Claude leg (`dropsScoped` over the shipped bundle). Observed: (a) "fragment design-system-refine-canvas, member command:refine, runtime codex: a runtime other than Claude renders the body; fragment design-system-refine-canvas, member command:refine, runtime opencode: a runtime other than Claude renders the body"; (b) the control names `design-system-verify-pull-back`, `command:verify` and runtime `claude`. Recorded 2026-11-27, 198/02 build. **198/03:** the shipped `design-system-verify-re-sync` (`checks.design-system`) made unscoped the same way: "fragment design-system-verify-re-sync, member command:verify, runtime codex: a runtime other than Claude renders the body; fragment design-system-verify-re-sync, member command:verify, runtime opencode: a runtime other than Claude renders the body". Recorded 2026-11-27, 198/03 build. |
| FF-19803 | `test/arch/ui/acd-design-role-split.test.mjs` | green, 2026-11-27 (verify, focused run) | 198/02: a fragment `planted-designer-bash`, targeting `agent:aof-designer` with `tools: ["Bash"]`, added to a copy of the shipped descriptor; and a fragment whose body holds the line `tools: Read, Bash`. Observed: `designerToolGrants` answers `["planted-designer-bash grants Bash"]`, and names `planted-body grants Bash` for the body line, against `[]` for the shipped bundle. Recorded 2026-11-27, 198/02 build. |
| FF-19804 | `test/arch/practices/acd-design-system-verbs-offline.test.mjs` | green, 2026-11-27 (verify, focused run) | **On disk, 2026-11-27 (verify):** `export async function pullPlanted(url) { return fetch(url); }` appended to `packages/design-system/src/check.mjs`. Observed: "Expected values to be strictly deep-equal: + [ 'packages/design-system/src/check.mjs: calls fetch(' ] - []". Restored byte for byte. |
| FF-19805 | `test/arch/ui/acd-imported-mock-self-contained.test.mjs` | green, 2026-11-27 (verify, focused run) | 198/02: the fixture import's board (`test/fixtures/design-system/imported-mock/board.dc.html`) given a second script, `<script src="https://cdn.example.com/x.js">`; and a board loading `../../secret.js`. Observed: "test/fixtures/design-system/imported-mock/board.dc.html: https://cdn.example.com/x.js (a network source other than a Google Fonts css2 link)", and "m/b.dc.html: ../../secret.js (not a sibling file of the board)". The unplanted fixture, which loads `./support.js`, `ds/aof/tokens.json` and a Google Fonts css2 link, passes. Recorded 2026-11-27, 198/02 build. |

## Verification evidence

All runs on the working tree at `a54e6900` plus the uncommitted 198/02 and 198/03 builds, with
`AOF_GLOBAL_HOME` set to a fresh temporary directory, selected by file through
`node scripts/test.mjs --only`. These are story-scoped lanes. The whole-tree run is the regression
gate, which has not run (see the accept decision).

- **The package, the practice and UI controls, the rasterizer and the practice list.**
  `packages/design-system/test/index.mjs`, `test/arch/practices/index.mjs`,
  `test/arch/ui/index.mjs`, `packages/execution/test/diagram-rasterize.suite.mjs`,
  `packages/core/test/practice-render-lane.suite.mjs`. Result: 408 cases, 0 failures.
  verifies → every `@executable` task of 198/01–03, FF-19801–FF-19805.
- **The suites the builds re-counted, and the neighbouring arch lanes.**
  `test/command/application-assembly.test.mjs`, the `work-init`, `work-update` and `project-init`
  goldens, `test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs`, and the `testing`,
  `bundle`, `command` and `diagrams` arch indexes. Result: 462 cases, 1 failure. The failure is
  FF-7106, and every line of it names 210/00's `STORY.md`, none 198's (F-01).
  `packages/core/test/application.test.mjs` is a `node:test` file, so it was run with
  `node --test`. Result: 2 tests, 2 pass.
- **198/00's own suites.** `packages/core/test/bundle-compose.suite.mjs`,
  `packages/core/test/codex-native-assets.suite.mjs`. Result: 146 cases, 0 failures.
  verifies → 198/00 tasks 00–03.
- **198/01 task 05, the dependency-audit scenario** ("adding the package passes the dependency
  audit"). `node scripts/supply-chain-audit.mjs`. Result: "supply-chain audit passed: 0 warning(s)".
  verifies → `01_story_a-project-extracts-its-design-system-and-names-it/tasks/05_aof-extracts-its-own-design-system.feature`,
  last scenario.
- **Not run: the operator's real Claude Design runs.** These are 198/01 task 05 (E19–E21 and the
  loop and mock-only scenarios), 198/02 task 03 and 198/03 task 03. Each one needs an interactive
  Claude session with the operator approving at an Artifact link. 01/05 also needs the operator's
  export of the `AOF` Claude Design pages not yet committed, which is outstanding (STATE, due
  2026-12-14). 02/03 and 03/03 build on the system that 01/05 publishes.
- No milestone surface has a `DESIGN.md`, so no design-conformance render applies. No task carries
  `@uat`.
- `aof work validate 198`: PASS. `aof work doctor 198`: no `control-unresolved` at either severity
  (warnings only: `mtime-ahead-of-updated`, `doc-over-budget` for three example maps,
  `example-map-too-many-rules` for 01 and 02, `control-runner-unchecked`, `rubric-join-unchecked`).
- **F-04's fix: the canvas in the block, and a page per milestone (2026-11-27).**
  `packages/design-system/test/index.mjs` and `test/command/config-inspect.test.mjs`, by file, on
  the working tree. Result: 166 cases, 1 failure: "199 04 config-inspect's audited calls are
  re-stamped". That case fails because of another session's uncommitted 210 change to
  `config-inspect.mjs` and `scripts/workspace-runtime-audit.json`, which 198 does not touch. It is
  green on a clean `git archive HEAD` copy whose `aof` and `@aof/*` links point into the copy. On
  that same copy, with the new suites copied in, the seven new cases are red and every other case is
  green. The work-init goldens are re-derived (`node scripts/golden.mjs --lane work-init`: every
  scenario matches). verifies → 01/04 E22–E24, 02/01 E21–E23, F-04.

- **The live runs, 2026-11-27 and 2026-11-28 (operator's projects, interactive Claude sessions).**
  - **The extract, twice.** On voice-vox-company-portal it built, published and checked a Design
    System, `company-portal` (`https://claude.ai/artifact/19BJuHdWtj1RjxsDDvGkvE`), owned from
    `platform/packages/ui/src/styles/tokens.css`, with no drift, and named it with its canvas (F-04
    came from this run). On ai-workforce-platform it built `ai-workforce-platform`
    (`https://claude.ai/artifact/1PcTE4EapjpVyfuPteVuZs`), owned from
    `apps/central-dashboard/src/styles/tokens.css` (F-02 and F-03 came from this run), and
    `aof project validate` is clean there with the canvas named. verifies → 01/05 E19's procedure.
    AOF's own system is not built by extract: the operator chose to name the existing
    `https://claude.ai/artifact/26W8xGGCgcAmQ7gP3ndhn5` in `reference` mode (`4ed7d45f`), which
    supersedes E19's "titled AOF, owned" for this repository.
  - **Refine to baseline, on the portal's milestone 37.** Refine drew the milestone on page `m37` of
    the project canvas with `company-portal` installed, and the operator approved it. `mocks/README.md`
    records the canvas and version `1795814732-d099`, the page, the system and version
    `1795802231-fee4`, and the approval `session 4eed8612-434c-47bb-b21f-e32de7f0f72d
    2026-11-27T22:03:48Z`. `DESIGN.md` names each frame as its surface's baseline. verifies → 02/03
    E4 and "approving commits the baseline".
  - **The system is untouched by refine.** Read today, `company-portal` is still at version
    `1795802231-fee4`, the version the import recorded. verifies → 02/03 E10.
  - **Offline render and framing.** After F-07, the capture of all eleven boards from the
    loopback-served mocks folder: every frame whole, the two that were blank checked by eye.
    verifies → 02/03 A2 and A3.
  - **The pages verb on two real canvases.** The portal's 60 unpaged boards sort onto nine pages,
    37's two on `m37`. ai-workforce's hand-made pages "03 · Task portal" and "05 · Directory" are
    found as milestones 03 and 05, and only `m07` would be added. verifies → 02/01 E25–E28.
- **The F-05 to F-07 fixes, 2026-11-28.** `packages/design-system/test/index.mjs`,
  `packages/execution/test/diagram-rasterize.suite.mjs`, `test/arch/ui/index.mjs`,
  `test/arch/practices/index.mjs`, `test/arch/diagrams/index.mjs`,
  `test/command/application-assembly.test.mjs` and `packages/core/test/practice-render-lane.suite.mjs`,
  by file, with `AOF_GLOBAL_HOME` isolated. Result: 459 cases, 0 failures. The work-init goldens
  match. verifies → 01 E26–E27, 02 E25–E29, FF-19805.
- **Regression gate 1, at `c5dae319`: red** (`REGRESSION.md`), on three pins F-07 moved, each
  green alone after its fix at `1569997c`: the rasterizer's `spawn` restamped in
  `scripts/workspace-runtime-audit.json` (`core-workspace`); `node:http` added to
  `svg-rasterizer.mjs`'s allowed imports (`yarn-installation`); and FF-19805 reading mounts
  through `mountedNames` from `@aof/design-system/mocks` rather than its own pattern (FF-11901).
  The row's `not isolated` cases are red in the pool and green alone, and do not fail it. 307
  cases, 0 failures, by file. The gate runs once more on the fixed tree.
- No milestone surface of 198 has a `DESIGN.md`, so no design-conformance render applies. No task
  carries `@uat`.

## Design-system re-sync

AOF names its system with `"mode": "reference"`
(`https://claude.ai/artifact/26W8xGGCgcAmQ7gP3ndhn5`), so this accept re-syncs nothing and
publishes nothing to it (ADR-007).

## Findings

| id | observed | type | severity | triage | routed to | status |
|---|---|---|---|---|---|---|
| F-01 | FF-7106 is red at HEAD on 210/00's `STORY.md`: it declares ten bundle members (the `add-uat`, `continue`, `manual`, `map-tests`, `repair`, `review` and `verify` commands under `packages/acd/assets/commands/`, the uat `SESSION.md` and `STATE.md` templates, and `packages/learning/assets/commands/teach.md`) without their tracked renders (`.agents/skills/aof-*/{SKILL.md,agents/openai.yaml}`, `.codex/aof/workflows/workflow-contract.md`, `.opencode/commands/aof/*.md`). No line names 198. The whole-tree run 198's accept needs would therefore be red on another milestone's contract. Same cause as m188/F-12, m161/F-06 and m151/F-151-01 (an open story's declaration reddening every other milestone's gate), a distinct incident on a new story (recall `a6363955-d693-457f-b125-4b8697657db9`). | defect (cross-item) | blocker for 198's regression gate, not for 198's code | fix in 210/00's contract: declare the tracked renders FF-7106 names, or narrow the members it declares | 210/00 (its refine) | fixed 2026-11-27 inline at verify (operator's go): 210/00's `files:` gains the twenty tracked renders and `packages/acd/assets/manifest.json`, and FF-7106 is green (6 cases, 0 failures). The full `test/arch` sweep before the gate then found the same story's `PLAN.md` restating two declared paths (FF-9603, recorded in STATE at 198/03). Reworded, green. |
| F-02 | `aof design-system tokens` printed `type.families` as a list of `{name, value, usage}`, and `check` refused anything else. The Design System type stores `type.families` as a map of family key to font stack (its `format.md`), so a `tokens.json` in the type's shape could never pass `check`, and the page could not show the list the verb printed. Found 2026-11-27 drafting AOF's own system for the live 01/05 run (`check` answered `design-system-tokens-shape`). Distinct incident (recall `baa086c7-aa69-483d-bf32-bcff4f2159b7`: three config findings, none this cause). | defect | blocker for 01/05 (`check` must pass before a publish) | `@bug` fix in 198/01's package: `tokens` prints the map, `check` reads it and refuses a list, `--merge` reads and writes it | 198/01 | fixed 2026-11-27 inline (operator's go): `src/tokens.mjs`, `src/check.mjs`, `src/commands.mjs`; case "198 F-02 · type.families is the type's map…" in `check.suite.mjs`, red on the unfixed source. |
| F-03 | `tokens` placed a token by Tailwind v4's name prefix alone (01's defaulted Q2). The live extract on `ai-workforce-platform` found the dashboard's `tokens.css` (`--bg`, `--agent`, `--text-2`, `--space-1`, under `[data-theme="light"]` and `[data-theme="dark"]`) read as 0 of its colours and 0 of its 7 spacing steps, with `--text-2` and `--text-3` misread as font sizes. The type's own `from-code.md` step 4 places a colour by its value and a length by its name. Distinct incident (recall `a102f53a-1ec1-4eae-a424-10bafb1ddd2f`: empty). | defect | blocker for 01/05 on any project not named in Tailwind's namespaces | `@bug` fix in 198/01's package: Tailwind's prefixes first, then a colour by value, then the length hints, and a `--text-*` holding a colour is a colour; Q2 amended in 01's `EXAMPLES.md` | 198/01 | fixed 2026-11-27 inline (operator's go): case "198 F-03 · a name outside Tailwind's namespaces is placed by its value…" in `tokens.suite.mjs`, red on the unfixed source. On the dashboard's file the verb now reads 21 colours in two themes, 7 spacing steps, 4 radii, 1 shadow and 2 families; its one unplaced value is the dark theme's `--shadow-pop` (only colours carry themes). AOF's `index.css` reads as before (20 colours, 1 radius, nothing unplaced). |
| F-04 | The live extract on `voice-vox-company-portal` (2026-11-27) built, published and checked a clean system, then spent about 30 minutes, and two deletions, on what the operator wanted around it. The command never asked which design artifacts already existed or what the operator wanted to end up with (it checked only for a title clash), and never said a project's design is two artifacts: the system, and a canvas for the mocks. Its steps are all actions, and nothing in it says a question from the operator pauses them. So the session treated each reply as an instruction: it deleted the new system on a correcting link, registered the mocks canvas as the system, copied the system into the canvas and tried to delete the system again. The operator's decision, which settles the cause: one Design System, plus ONE canvas for every milestone's mocks, a page each, and the block names both, "so it knows which artifact to edit/maintain". Distinct incident (recall `4307975d-d00e-42ef-8732-2af5ae5b2aaf`: no candidate shares its cause). | defect (contract + prose) | blocker for 01 and 02 (the extract's conversation, and 02's defaulted canvas-per-milestone) | `@bug` fix in 198/01 and 198/02: the block gains `canvas` (ADR-005 amended); one canvas per project with a page per milestone (ADR-006 §0, replacing 02's Q10); the command asks first, shows the two-artifact layout, and answers questions without acting | 198/01, 198/02 | fixed 2026-11-27 inline (operator's go). Code: `use --canvas`, the codes `design-system-bad-canvas` and `design-system-canvas-is-system`, and `mocks import --page`. Prose: the extract command's step 0 and `<conversation>` rule, and refine's and verify's page-scoped canvas steps. Contracts: 01 E22–E25 and Q15, 02 E4, E21–E24, and Q10 settled (both questions are recorded as defaults citing the amended ADRs, because the doctor anchors an "answered" only to an ask inside a story run). Seven new cases (config suite E22 and E23; mocks suite E21–E23; two validator rows), red on the unfixed source, because neither `canvas` nor `--page` existed there. |
| F-05 | Refining the portal's milestone 37 (2026-11-27), refine asked "How do you want the mocks?" with three options: the canvas, "Binding checklist only", or "I have mocks". `work.ui.designSystem` names the system and the canvas. 02's prose offered the canvas, and turning the offer down fell through to the old elicitation, so the configured system was optional exactly where it mattered. The operator's rule: "If a design system is set, it must be used. No ifs or buts." The same run showed a second gap: the canvas already held 37's two boards, with no page, and refine had no step for boards that already exist. Related to F-04 (same practice, a different cause: the extract's conversation), a distinct incident (recall `3108c384-2a5e-4abb-99c9-d095967c9f7c`). | defect (contract + prose) | blocker for 02 | `@bug` fix in 198/02: with the practice on, refine replaces the mock elicitation and asks only for approval (ADR-002 §4); the pages come from a verb, never by eye; refine starts from the boards on the page (ADR-006 §0) | 198/02 | fixed 2026-11-27 inline (operator's go). A new verb, `aof design-system canvas pages`, sorts a canvas with no pages once, by the milestone number each title starts with, and adds a milestone's page. The extract's step 10 runs it once when a canvas is named. Refine's step replaces the elicitation, starts from the page's boards and from an existing import, and treats hand-made mocks as a reference. The designer's brief rule says the same. Contracts: 02 R2 retitled, E8 rewritten, E25–E27 added, and tasks 00, 01 and 03 amended. Three new cases in the mocks suite (E25–E27), and the practice test's wording checks. On the portal's own canvas, the verb sorts 60 boards onto 9 pages, with 37's two on `m37`. Amended 2026-11-28, from ai-workforce-platform's canvas, which already had pages the operator made ("03 · Task portal" as `portal-03`, "05 · Directory" as `directory-05`) and whose stream spells its refs `05`: the verb took a page only by the id `m<NN>`, so it would have added an empty `m05` beside `directory-05`, and it stripped a board title's leading zero into `m5` while `--item 05` answered `m05`. It now takes a page whose name starts with the milestone's number as that milestone's page, spells every page id as the stream spells the ref, resolves `--item 5` to `05`, and answers the page it chose; refine, verify and the import use that id as `<page>` and never assume `m<NN>`. E28 added, in the mocks suite and in task 01. |
| F-06 | The operator, 2026-11-28, after the ai-workforce canvas: "extract is good on a fresh project. But in some cases there are many mocks and designs floating around and I want to consolidate and standardise them first AND THEN create an owned design system + canvas. ... the designs are in canvas mate. They should be consumed and then used to create a design system." Extract read the code's tokens and the repo's `mocks/` folders only. Its first question was a fixed menu with one canvas to record, never one to read, and the review offered each mock-only colour as accept or drop, with no way to say "this is that token" for the near-duplicates scattered boards hold. Related to F-04 (the same first question, a different cause: what it reads), a distinct incident (recall `ce90a582-983e-40fd-82cf-650345f848c1`). | defect (prose + verb) | blocker for 01 (the operator is not passing the milestone without it) | `@bug` fix in 198/01: extract consumes named canvases and standardises before it builds (ADR-004 amended) | 198/01 | fixed 2026-11-28 inline (operator's go). `tokens --mocks` names each mock-only colour's `nearest` code token and its RGBA distance. The command asks in plain words, reads the boards of any number of canvases back into one folder each as more `--mocks` directories, and the review offers map, accept or drop, grouped by the nearest token; map writes nothing to the code. A consumed canvas is never changed, moved or deleted. Contracts: 01 E25 amended, E26 and E27 added, tasks 01 and 02 amended. Three new cases (two in the tokens suite, one in the practice suite). |
| F-07 | At this verify (2026-11-28), two of the portal's eleven 37 baselines, `Messaging-OnRecord.png` and `Messaging-Events.png`, were blank grey frames. Each board holds only `<dc-import name="Messaging">`, which mounts the sibling `Messaging.dc.html` from the page `earlier`. Refine pulled back the page's boards alone, `mocks import` accepted them without the component, and `mocks capture` opened each board from `file://`, where the browser refuses the runtime's fetch of a sibling. Reproduced: the component copied in beside the board still rendered blank from disk; served on loopback with a settle budget it rendered whole. FF-19805 checked the sources a board names, not the components it mounts. A distinct incident (recall `04a6f2fa-9b3f-438d-bc08-5e7ea3094544`): no prior finding concerns a board's dependencies. | defect (verb + prose + control) | blocker for 02 (a committed baseline the judge would read as the approved design was blank) | `@bug` fix in 198/02: the import carries every mounted component and refuses a missing one; capture serves the folder on loopback; refine and verify pull components back; FF-19805 holds mounts (ADR-006 amended) | 198/02 | fixed 2026-11-28 inline. `componentsOf` in `src/mocks.mjs`, transitive; `serveFolder` and `PAGE_SETTLE_MS` in `packages/execution/src/svg-rasterizer.mjs`, scoped to the page's folder, loopback only, read-only. Cases: E29 in the mocks suite, "198 F-07" in the rasterizer suite, FF-19805's red probe gains a missing mount. The portal's 37 import was redone from the approved version `1795814732-d099` with the same approval: `Messaging.dc.html` imported, all eleven frames whole (`Messaging-OnRecord.png` 237,674 bytes, `Messaging-Events.png` 222,816, both checked by eye). |
| F-08 | Not every `@manual` path has met a live run. Run live: the extract on two real projects, refine drawing on a page and approving, the import with provenance, the capture, the owned system untouched by refine, and the pages verb on two real canvases (see the evidence). Not run live: 01/05 E20 (a title collision), E21 (a declined inventory), a mock-only value accepted into code, and the loop-driven extract; 02/03 E5 (an ambiguous title), E6 (Revise), E7 (Later), E9 (a reference system's gap), E19 and E20 (verify pulling back an awaiting canvas) and A1 (a loop-driven refine); and 03/03 whole (a live owned re-sync at an accept). Each is covered by the executable prose and verb cases, not by a live run. A distinct incident (recall `ada401ff-2bb8-40db-90e9-1f72fe32b9ad`). | verification gap | non-blocker (the operator signed the milestone off 2026-11-28: "let's sign off this fucking milestone") | deferred: each runs live on its first natural occurrence, the owned re-sync at the first owned milestone accepted in the portal or ai-workforce | backlog (198 OUTCOME gaps) | open, deferred |

## Accept decision

2026-11-28 · aof:verify 198 (solo, product owner inline), on the operator's sign-off: "Commit what
you've done, and let's sign off this fucking milestone".

- **198/01, 198/02, 198/03: accepted** (`in-review → done`). Every `@executable` task and FF-19801
  to FF-19805 are green (459 cases on the F-05 to F-07 fixes, the earlier lanes as recorded above).
  The live runs on the operator's projects cover the extract, refine to baseline, the import, the
  capture and the system left untouched. The paths no live run has met are F-08, a non-blocker the
  operator deferred, carried as each story's and the milestone's `## Gaps`.
- **Findings:** F-01 to F-07 fixed; F-08 open, deferred. No blocker is open.
- **The milestone: accepted** once `aof work regression-gate 198` records a green row in
  `REGRESSION.md`, which the door reads. Its outcome and retrospective are written, and STATE's
  feedback has graduated into the retrospectives.

Earlier:

2026-11-27 · aof:verify 198 (solo, product owner inline).

- **198/00: accepted** (`in-review → done`). Every task is `@executable` and green, FF-19801 and
  FF-19802 are green with red probes recorded, and its code is committed (`0f791c91`). `OUTCOME.md`
  and `RETROSPECTIVE.md` are written in its folder.
- **198/01, 198/02, 198/03: not accepted, left `in-review`.** Their `@executable` lanes and controls
  are green, but each holds an `@manual` task that only the operator's interactive Claude Design
  run can sign off (see the evidence). This is awaiting sign-off, not developer rework, so no story
  goes back to `in-progress`.
- **The milestone: not accepted.** Three stories are not done. The regression gate has not run, and
  it cannot run yet, for two reasons:
  - the 198/02 and 198/03 builds are uncommitted (74 dirty paths), and `aof work regression-gate`
    refuses a dirty checkout;
  - FF-7106 is red on 210/00 (F-01), so the gate would be red even on a clean commit until 210/00's
    declaration is repaired.
- **To finish:** commit the 02/03 builds; fix F-01 in 210/00; run the three operator Claude Design
  runs (01/05 first, after the AOF page export); run `aof work regression-gate 198`; then
  re-run `aof:verify 198`.
