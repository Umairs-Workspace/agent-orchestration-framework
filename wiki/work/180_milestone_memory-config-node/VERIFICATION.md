---
doc: verification
---
# 180 · One memory node in the config — Verification

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-18001 | `test/arch/memory/acd-memory-config-one-reader.test.mjs` | green, 2/2 (2026-10-30, `aof:verify 180`) | red, then restored: with `export const __probe = (config) => config.graph;` appended to `packages/knowledge/src/graph-share.mjs`, the one-reader case failed with `only packages/knowledge/src/memory-config.mjs reads corpora/sources/graphify/backends/graph off a memory object, or graph off the root config`, its diff naming `rel: 'packages/knowledge/src/graph-share.mjs'`. The selection case stayed green. The file was restored byte-identical (`cmp`). |
| FF-18002 | `test/arch/memory/acd-memory-node-schema.test.mjs` | green, 1/1 (2026-10-30, `aof:verify 180`) | red, then restored: with an `egress` property (`{ type: "string", enum: ["none", "hosted"] }`) added at `$defs/memory.properties.backends.properties.graphify.properties`, the case failed with `an egress property is declared under $defs/memory`. The schema was restored byte-identical (`cmp`). |

## Verification evidence

- **The `@executable` suite** (all three stories) — verifies → every `@executable` scenario under
  `stories/0{1,2,3}_*/tasks/`. Procedure: under an isolated `AOF_GLOBAL_HOME`, ran
  `aof test --scope impacted --story 180/01`, then the same for `180/02` and `180/03`. Each widened to
  all 1,259 suites, through 15 widenings (new or graph-unknown files). There were 34 distinct reds.
  Each red file was re-run alone at `bd4fb4bd` (the build) and at `e9aec287` (179's accept), and
  every red reproduced with the same case names at both, with three exceptions. Those three were
  180/03's `App.tsx` controls (F-02), fixed at `c8a236e3`. The rest are the reds recorded before 180
  (STATE's Feedback), and they are not routed:
  - `acd-hook-rule-detects-never-writes`, FF-5301's two-hop plant, FF-5810, and `command-core`'s
    two native knowledge cases;
  - `workspace-boundaries`, from 175's unaudited mesh child-process entries;
  - the Mac `/var` → `/private/var` realpath class (`yarn-installation`, `distribution-workspaces`,
    `loops-commands`, `work-memory/00`, 171/02, `board-api` 133/04, `work-ui-fleet-origin/01`);
  - the gpg trustdb lock (`release-fingerprint-pin`);
  - the timeouts: 156 retained lanes, 154/11, 69/04, 81/00 and the autonomous black-box.

  `arch/46 ADR-004` and `audit-spawn/03` were red only under the three-lanes-at-once contention,
  and are green alone. After `c8a236e3`, `yarn ui:build` is green. So are the UI, surfaces and arch
  ui/testing/loop/bundle/audit indexes (2,335 cases), apart from the recorded reds above.

  **Amended at PR #22 (2026-10-31).** "Not routed" was wrong for four of those reds. They predate
  180, but not the branch, and CI on PR #22 (Linux) failed on exactly these four:
  - `acd-hook-rule-detects-never-writes`;
  - FF-5810;
  - `command-core`'s two native cases;
  - `workspace-boundaries`.

  All four are fixed on the branch:
  - The graphify code backend's read half moved to `graphify-code-relations.mjs`, so the audit
    family no longer reaches `graph-bundle.mjs`'s file writes.
  - The loop document's `createMemory` citation is `:12`.
  - The services stub declares `RECORD_CORPORA`, and the catalog count is 134 for 178's `memory`.
  - The two mesh modules are re-audited.

  None of the realpath, gpg or timeout reds failed on CI. They are this Mac's alone.
- **The documentation describes one memory node** (`@manual`, 180/01 task 03) — verifies →
  `stories/01_story_the-memory-node-is-read-in-one-place/tasks/03_the-faces-print-the-new-paths.feature`.
  Procedure: grep `README.md`, `wiki/memory.md`, `wiki/codex-support.md` and
  `packages/knowledge/README.md` for the four new keys and the three old spellings, and
  `wiki/work/TECH_DEBT.md` for the legacy-read entry. Result: **pass**. Each of the four names
  `memory.corpora`, `memory.graph.share`, `memory.graph.remote` and
  `memory.backends.graphify.extractionBackend`. Every remaining mention of `memory.sources`,
  `memory.graphify` or a root `graph` is the old spelling that `aof work update` rewrites
  (`README.md:243`, `wiki/memory.md:375`, `wiki/codex-support.md:137`,
  `packages/knowledge/README.md:30`). The `"graph":` line at `README.md:234` sits inside the
  `memory` node's example. TECH_DEBT item 93 names the legacy read and its removal in 0.2.0.
- **The /aof:init command says new projects get the local backend** (`@manual`, 180/02 task 01) —
  verifies → `stories/02_story_aof-work-update-migrates-the-old-shape/tasks/01_init-writes-only-the-new-shape-and-selects-local.feature`.
  Procedure: grep the asset `packages/core/assets/commands/init.md` and its renders
  (`.claude/commands/aof/init.md`, `.opencode/commands/aof/init.md`,
  `.agents/skills/aof-init/SKILL.md`, `packages/core/assets/variants/codex/workflow.md`). Result:
  **pass**. Each says `memory.backend: "local"` is active by default, and that local sends nothing
  to a hosted model. None describes graphify as active by default.
- **End-to-end, the legacy read, the conflict and the migration** (01's and 02's PLAN
  verification; agent-run in temp projects under an isolated `AOF_GLOBAL_HOME`) — verifies →
  `stories/01_story_the-memory-node-is-read-in-one-place/tasks/00_each-setting-has-one-home.feature`,
  `stories/02_story_aof-work-update-migrates-the-old-shape/tasks/00_update-moves-the-old-keys-into-the-node.feature`.
  1. Config `{ "graph": { "share": "off" }, "memory": { "backend": "local", "sources": ["claude-auto-memory"] } }`:
     `aof project doctor` printed one `memory-config-legacy` warning naming both moves
     (`memory.sources → memory.corpora`, `graph.share → memory.graph.share`). `aof memory status`
     printed `corpora: work, imports, code, operator` and the same two `legacy:` lines.
  2. With `memory.graph` added beside the root `graph`, `aof memory status` exited 1 with
     `Each memory setting has one home, but this config spells it twice: "graph" and "memory.graph".`
  3. A config with a root `graph` (`git-refs` / `upstream`), `memory.sources`, `memory.graphify`
     and a foreign `custom` key: `aof work update .` reported the three moves and wrote
     `memory: { backend, corpora: [work, imports, code, operator], graph: { share: git-refs, remote: upstream }, backends: { graphify: { extractionBackend: claude-cli } } }`.
     No root `graph` was left, `custom` survived unchanged, and doctor no longer reported
     `memory-config-legacy`.
  4. A fresh `aof work init` + `aof work init-config` wrote `{"memory":{"backend":"local"}}`, with
     no legacy key.
- **The section conforms to DESIGN Surface 1** (`@manual`, 180/03 task 00) — verifies →
  `stories/03_story_the-config-editor-edits-the-memory-node/tasks/00_the-memory-section-shows-the-new-shape.feature`.
  Verdict: **INCONCLUSIVE**. The renderability precondition failed before any render: there is no
  base URL (no `--url`, and `.aof/aof.config.json` declares no `work.ui.baseUrl`), and DESIGN.md
  declares no `Route` for Surface 1. The renderer resolved
  (`~/Library/Caches/ms-playwright/chromium-1243`), but no render was attempted at any breakpoint,
  and no designer or QA session was spawned. The baseline is DESIGN's binding checklist (D3a, no
  mock). Its states are asserted structurally by 03's mounted-App `@executable` cases. That is not
  a fidelity judgement (F-01).

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | The config editor's Memory section (DESIGN Surface 1) cannot be rendered for a design judgement. `work.ui.baseUrl` is unset, and DESIGN.md declares no `Route` for the surface, so 03's `@manual` DESIGN scenario is INCONCLUSIVE rather than CONFORMS. The recall names the same cause at m135/F-135-03, on the board's task-card surface. This is a distinct incident of that cause on a different surface and a different server (the config editor, not the board), so it is not a duplicate. | gap | minor | non-blocker: the checklist's states are asserted by 03's mounted-App `@executable` cases. Fidelity stays unjudged until a render exists. | backlog chore `memory-section-design-conformance`: DESIGN.md (a `Route` for Surface 1) and a render judged against a served `aof ui` | open |
| F-02 | The scoped lanes (`aof test --scope impacted --story 180/0N`, which widened to all 1,259 suites) reddened three UI controls on 180/03's change to `apps/ui/src/config/App.tsx`. The file was at 1,318 lines, over its 1,300-line ratchet (ADR-015/F2), FF-5307's `apps/ui/src` digest was not re-pinned, and home-route/00 pins the file at exactly 1,300. Each file is red at `bd4fb4bd` and green at `e9aec287` (179's accept); every other red has the same names at both. The recall names the same class at m135/F-135-01 (`DetailPanel.tsx`), which makes this a distinct incident on a different surface. | defect | major | blocker: fixed at verify | `c8a236e3`: the section list and its label, JSON, count and hint helpers moved whole to `apps/ui/src/config/sections.tsx`, as the ceiling's note asks, and `App.tsx` is 1,282. The config directory's budget went 5 → 6 with the reason stated. FF-5307 was re-pinned with the measured diff, and home-route/00 was re-aimed to 1282. `yarn ui:build` is green, and the UI, surfaces and arch ui/testing/loop/bundle/audit indexes are green apart from the reds recorded before 180. | closed |

## Accept decision

**Accepted 2026-10-30** (product-owner, `aof:verify 180`).

- Stories 01, 02 and 03 are accepted, each with its `OUTCOME.md` and `RETROSPECTIVE.md`.
- FF-18001 and FF-18002 are green, each with its red probe, and both are registered in
  `test/arch/memory/index.mjs`.
- `aof:validate 180` passes. `aof work validate 180` passes, `aof work loops validate` exits 0 with
  warnings only, and the agent layer is clean: all 57 `@executable` scenarios map to passing cases,
  and every `@manual` scenario has an evidence row.
- `aof work doctor 180` shows no `control-unresolved` at either severity, and no error.
- F-02 (blocker) is fixed at verify and closed (`c8a236e3`). F-01 (non-blocker) stays open, routed
  to DESIGN and a `--url` re-run. It is carried as 03's outcome gap. No blocker is open.
- Regression gate: not run. This MacBook cannot host the whole-tree run while its live control
  daemon (`aof mesh serve --serve`, pid 77647) holds `:4182`, the same condition as m175's and
  m179's overrides. Accepted through an environment `--gate-override`, whose reason is recorded in
  `REGRESSION.md`. The evidence is the three whole-tree-wide lanes and the per-file baseline
  comparison above. The gate goes green on a node that can host the whole-tree run.
