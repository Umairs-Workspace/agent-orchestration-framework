---
doc: state
---
# 180 · One memory node in the config — State

## Progress

- 2026-10-30 · Refined (`aof:refine 180 --autonomous`, solo). ARCHITECTURE ADR-001..006 and DESIGN
  Surface 1 written. Three stories: 01 is wave 1; 02 and 03 are wave 2 and run in parallel. All
  three contracts are authored. 02's was authored after `180/02 Q1` was answered at the review.
- 2026-10-30 · Built and reviewed (`aof:continue 180`, solo). 01, then 02 and 03 inline, all
  `in-review`. Every `@executable` scenario is green. The gate ladder is clean on each story, and
  each story's review lenses ran in this session (no Blocker survived). Left for `aof:verify`: 01's
  docs scenario and 02's init-asset scenario (both `@manual`, checked by grep at build), 03's DESIGN
  conformance (INCONCLUSIVE, no render), and the two controls' red probes for VERIFICATION.

## Notes & decisions in flight

- **D1 · SPEC correction, planning.** The SPEC says 178 declared `planning` under `memory.sources`.
  It did not: the operator chose link-following (178/ADR-003). `sources` admits only
  `claude-auto-memory`, so the migration carries that one value (ARCHITECTURE preamble).
- **D2 · SPEC correction, `corpora` example.** The SPEC's illustrative `["work", "code"]` is refused
  under ADR-002. `work`, `imports` and `code` are always served, and only `operator` is optional,
  because the SPEC puts changing a key's meaning out of scope.
- **D3 · Egress is not a key** (ADR-005). Init's default backend was a business question,
  `180/02 Q1`. The operator answered at the refine review (2026-10-30): **`local`**. New projects
  send nothing to a hosted model, and existing selections are kept (story 02, task 01).
- **D3a · No mock for the Memory section** (operator, 2026-10-30). DESIGN Surface 1's binding
  checklist is the conformance source of truth.
- **D4 · Legacy read bounded.** Story 01 files the TECH_DEBT entry that removes the old spellings
  after one release (ADR-001).
- **D5 · Global config out of scope** (`180/02 Q2`). `aof work update` migrates the project config
  only.
- **D6 · Cross-item note for `retire-graphify-memory-backend`** (backlog). Its SPEC plans to drop
  `memory.graphify.extractionBackend`. If 180 lands first, that item drops
  `memory.backends.graphify` and the legacy spelling instead, through `LEGACY_MEMORY_KEYS`
  (ADR-004). Its refine should read this note. Its SPEC is not edited here.
- **D7 · No ADR diagrams.** None of the six ADRs has moving parts that a picture would clarify.
- **D8 · Ratified in 03's contract.** A saved Memory node carrying a legacy key is refused
  (`memory-config-legacy-write`), so the editor never writes the old spelling.
- **D9 · ADR-006 corrected while 02's contract was authored.** An unparsable config already fails
  `aof work update` (`update.mjs:133`). The migration step keeps that behaviour rather than
  claiming the update completes.
- Recalls: architect `3e2a45a7-d5e6-4b50-8db9-a2d3d3a6002b` (5 verdicts) and PO
  `e7829dc5-0c4d-4f25-af68-df43014e6149` (empty) were recorded on 180.
- Graph: `aof graph build .` at 2026-10-30T17:45Z, 21,158 nodes and 46,459 edges, code-only, egress
  none. The boundaries cite `graph impact` (ARCHITECTURE preamble).
- **B1 · 180/01 build: the extractor names live in `memory-config.mjs`.** E4 and E10 refuse an unknown
  extractor at the read, while FF-18001 lets the reader import only the error contract and
  `engine.mjs`. So `GRAPHIFY_EXTRACTORS` (the names) and `LOCAL_MEMORY_ALTERNATIVE` moved into
  `memory-config.mjs`. `graphify-backends.mjs` builds `GRAPHIFY_BACKENDS` (the network
  classification) over those names and re-exports the message. One home per fact, and FF-18002 still
  pins the schema enum to `GRAPHIFY_BACKENDS`.
- **B2 · 180/01 build: one new code, `invalid-memory-backends`.** It is used for a `memory.backends`
  that is not an object, or that names an engine with no settings. No scenario names it. The graphify
  block inside keeps `invalid-memory-extraction-backend`.
- **B3 · 180/01 build: the whole node is validated before any memory verb.** `resolveConfiguredBackend`
  and `inspectMemoryConfiguration` call `readMemoryConfig(config)`. An invalid root or `memory.graph`
  therefore now refuses `aof memory` verbs too, where before only the graph verbs refused it. This is
  the price of refusing a twice-spelled setting everywhere.
- **B4 · 180/01 build: doctor gains a `memory-config-legacy` check row.** It appears only when an old
  key is present. Doctor's text face prints checks and not diagnostics, so without it the ADR-001
  warning was invisible outside `--json`. A legacy config therefore fails `aof project doctor
  --strict`, as any warning does.
- **B5 · 180/01 build: "share absent" (task 02 outline) reads as the absent key's default, `off`.**
  `readShareSettings` keeps today's answer, `{ share: "off", remote: "origin" }`, so every build stays
  local.
- **B6 · 180/01 build: `graphify-backend` status gains `extractionPath`.** E9 asks status for the path,
  and that is its one new field.

## Feedback (for retro)

- **180/01 · the read set was incomplete.** Beyond `reads:` and `files:`, the build had to read
  `test/support/{source-slice,module-family,read-src-files,cli-spawn}.mjs` (the controls' scanners),
  `packages/work/src/doctor/rubric.mjs` (the scenario-to-test join) and every `validateConfig` caller
  (`validate-shared.mjs`, `assets/apply.mjs`, `config-editor.mjs`). The last group was needed to
  confirm that a new `warning` diagnostic fails no caller but `--strict`.
- **180/01 · the near-miss recall ran late.** It was taken after the build started, not before.
  Lesson 05/R3 then moved the schema scenarios (E11, E12) out of the knowledge package's suite, which
  declares no `ajv`, and into `test/command/config-inspect.test.mjs`. Recall
  `73e02c02-5c32-49aa-b336-05d354f8d2fc`.
- **180/01 · the whole-tree run widened to all 1,259 suites** (15 widenings: new or unregistered
  files). Five reds were this story's, and all are fixed. The `status` goldens in
  `work-memory-command.test.mjs` gained the ADR-005 corpora line and `config` object, an amendment
  ratified by ADR-005. The corpora line now sits before the stale-index line, so 178/01 E9 still ends
  naming `aof memory ingest`. FF-16004's `work find` pin went 745 → 746 for `memory-config.mjs`. A
  private helper named `readGraph` tripped `codebase-grounding-no-parse`, and was renamed. 01's
  PLAN.md enumerated declared paths (FF-9603), and was rephrased. `config-inspect.mjs`'s runtime-audit
  digest was refreshed.
  All of those are outside the declared `files:`, so the write set was incomplete too.
- **Pre-existing reds, not this story's — recorded, not routed.** Each was confirmed red at HEAD with
  this story's changes stashed:
  - `acd-hook-rule-detects-never-writes` (`graph-bundle.mjs`);
  - FF-5301's two-hop plant (TypeError);
  - the native `core constructs independent applications` and `memory loads only the selected
    backend` (a stub with no `corpora`, since 179);
  - FF-5810 (`retrospective-memory-ingest.md` cites `createMemory` at `memory.mjs:10`, and it is at
    `:12`);
  - two unaudited mesh child-process entries from 175.

  Environmental on this Mac, and green with a realpath `TMPDIR`: the `/var` → `/private/var`
  realpath suites (yarn packaging, distribution, loops-commands, the reindex golden). Also the gpg
  trustdb lock, git "is a main working tree", and the dispatch and autonomous timeouts.
- **180/02 · FF-7106 was red on 02's contract, and is fixed in its lane.** `files:` gained the bundle
  manifest and the member's two other tracked renders (`openai.yaml`, `workflow-contract.md`). It
  also gained `packages/core/assets/variants/codex/workflow.md`. The Codex skill's body is
  hand-authored there, and it still said `"graphify"` active by default.
- **180/02 · re-rendering the init asset ran the new migration on THIS repository's config.** It holds
  the root `graph: { "share": "git-refs" }`. The config was restored byte for byte after each
  `aof work update`. The installed payload the daemons run reads only the root `graph`, so migrating
  before a deploy would quietly turn sharing off. The operator migrates it after
  `install-local` + restart: one `aof work update`. Until then `aof project doctor` shows one
  `memory-config-legacy` warning here.
- **180/02 · the dry run tolerates an unparsable config.** It read no config before 180, so it
  previews the bundle and omits `memoryConfig` rather than failing. The real run fails on it, as it
  always did.
- **180/03 · `replaceMemoryNode` was added to `memory-config.mjs`.** The editor's save first spelled
  `delete config.graph`, and FF-18001 rightly refused a root-`graph` access outside the one reader. So
  the swap that drops the superseded root `graph` lives in the reader's module. The
  `memory-config-legacy-write` check derives from `LEGACY_MEMORY_KEYS` rather than restating the
  mapping (131/09 R1, honoured; recall `91477b03-94a8-4ac4-a3a3-3248e473cb34`).
- **180/03 · every section's "Saved …" message was erased by its own refresh.** `SectionEditor`
  cleared the message on any `payload` change, and a save's refresh replaces `payload`. E4 needed the
  Saved state, so the message now clears only when the section changes. MCP Servers, Hooks, Project
  Docs and Settings gain the same fix.
- **180/03 · the mounted-App cases stub two leaf families.** The config App had never been mounted
  whole. Its `@/components/ui/*` primitives need a `forwardRef` the mini React lacks, so each is
  stubbed as its plain host element. `lucide-react` is stubbed by the names the config sources
  import, as the board's harness does.
- **180/03 · design conformance: INCONCLUSIVE.** `work.ui.baseUrl` is unset and DESIGN declares no
  `Route`, so no render was attempted and no designer judged one. The `@manual` DESIGN scenario
  goes to `aof:verify`, which needs a served editor and the screenshots the PLAN names.
- **180/02 · its near-miss recall also ran after the build** (`3ed6919a-4537-46cd-829e-d5aee36dd61d`).
  06/R2 (one read-merge-write helper) was honoured by `writeConfig`. 04/R2 (the cold-start proof) was
  honoured by the end-to-end CLI run over an initialised temp project.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green (FF-18001, FF-18002, each with a red probe in VERIFICATION)
- [ ] `@manual` signed off: 01's documentation scenario, and 03's DESIGN conformance judgement
