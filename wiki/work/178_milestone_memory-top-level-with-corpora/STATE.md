---
doc: state
---
# 178 · Memory is its own command — State

## Progress

- 2026-10-29: refined (milestone break-down). SPEC narrowed with the operator, ADR-001..003 and
  FF-17801..17803 declared, three stories created. Story contracts are next: `aof:refine 178/01`,
  `178/02` (after 01), `178/03`.
- 2026-10-29: refined (contracts, `aof:refine 178 --autonomous`). Every story has an example map,
  two task features and a build brief. No business question survived the strike, so nothing was
  asked. `aof work doctor` reports no `example-*` finding on any story. Next: `aof:continue 178`.
- 2026-10-29: built and reviewed (`aof:continue 178`, solo). 01 → 02 → 03, each in review; the
  gate ladder is clean on every story and on the milestone, and FF-17801..17803 are green with
  their red probes in VERIFICATION. Three operator rulings at build: E3/E4 amended in 01, opencode
  added to the work install in 02. Next: `aof:verify 178`.

## Notes & decisions in flight

- **Scope narrowed by the operator (2026-10-29).** The shatter-framed SPEC bundled a planning
  corpus, a `--corpus` scope, memory verbs on the MCP server, a recall-accounting rule for planning
  sessions, and recall for the remote Hyperagent planner. The operator's intent was the verb
  refactor. Kept: the face, the prompt migration, and following the work stream's existing `origin:`
  links (option 1 of three: link only, link plus planning corpus, neither). Dropped: everything else.
- **Hyperagent cannot reach aof's memory, and should not (operator).** Measured 2026-10-29 from
  hyperagent.com/docs (`/integrations/custom-mcp`, `/tools/data-and-code`). Custom MCP takes only
  remote streamable-HTTP servers at a public HTTPS hostname with OAuth, and excludes local and
  stdio servers. The code sandbox has no inbound traffic. Operator ruling: Hyperagent planning uses
  Hyperagent's own knowledge indexing, and its skills get only the spelling change (ADR-003).
- **Cowork uses the existing memory system (operator).** It runs on this machine and calls the same
  commands, so it is covered by migrating `shatter.md`. Default taken: whether `aof` resolves inside
  Cowork's Linux-VM shell stays 165's question (RESEARCH R5), not this milestone's.
- **Slug kept.** The folder still says `memory-top-level-with-corpora`. Renaming re-points every
  reference for a cosmetic gain, and the title carries the narrowed scope.
- **Recalls.** Architect `ff117e61-24fd-4d6a-9f18-f5fd47c01ff5`: 05/ADR-002 and 22/ADR-001 honoured
  (ARCHITECTURE preamble), the rest irrelevant. PO `24b2585d-0a6a-491f-a6e1-371bffa0e61f`
  (`--item 178`): empty, as 177's finding predicts for an item not yet indexed.
- **Graph.** `aof graph build .` 2026-10-29T11:18Z: 21,024 nodes, 46,127 edges. `graph impact` over
  the five boundary files grounds the cut (ARCHITECTURE preamble). The command door has one
  dependent, so 01 is contained. 01 and 03 share only `packages/knowledge/src/memory.mjs`.
- **Diagrams.** None. No ADR has moving parts.
- **Ratified in 01's contract (2026-10-29).** ADR-001 names the usage text as the one place the
  alias's output changes. Three more CLI hints name the old path: the stale-store line in
  `memory.mjs`, import-milestone's reindex warning, and `cli.mjs`'s work-command examples. 01
  migrates them too, because a hint naming the alias keeps the alias load-bearing. Measured too:
  `helpText` puts every one-word route in Usage, so 01 adds a family rule for `memory`.
- **Ratified in 03's contract (2026-10-29).** ADR-002 resolves an `origin:` value from the root,
  then from the doc's folder. Measured over the live stream: 85 values in 66 record docs, and every
  doc-relative one is on an archived item, whose folder `aof:archive` moved one level down after
  the value was written. Under ADR-002 as written, 49 drop. 03 adds a third candidate, the doc's
  folder as it stood before archiving. With it, 79 resolve and 6 drop, all naming
  `RESEARCH-agent-loop-economics.md`, which has since moved to `wiki/planning/research/`. Default
  taken: the six archived SPECs are history and are not repaired. `status` counts them.
- **Contract defaults (technical, each in its story's `EXAMPLES.md`).** The learning-edge control
  reads only `aof memory` (02 Q2). The README's milestone-05 table row keeps its spelling as
  history (02 Q3). The unresolved count lives in the index document as `origin: { unresolved }`
  (03 Q3).
- **Write-set overlaps.** Each story adds a control file to a directory at its budget ceiling, so
  all three declare `acd-source-directory-budget`. 01 and 03 also share `memory.mjs` and
  `memory-meta-normalised.suite.mjs`. 02 depends on 01. In effect the milestone builds serially,
  01 → {02, 03}. This was accepted over relocating the declared FF paths after the Decide stage
  closed.
- **Prior lessons applied at contract time.** Two lessons from the memory index shaped the
  `files:` sets: a changed spelling reaches suites the story lane never selects, and a new file
  moves the census rows that count its directory. Neither was a fresh recall; both were read from
  the index while grounding the contracts.

- **178/01 built (2026-10-29, `aof:continue 178`, solo).** Two contract rows were amended with the
  operator at build, both in 01's `EXAMPLES.md` (Q5, Q6). E3 takes `--kind no-such-kind`, because
  the `local` backend ranks every survivor and a bare miss is never empty. The `--undeclared-flag`
  row left E4 for a scenario of its own: the spine's unknown-flag refusal names the command id,
  and ADR-001 keeps the alias's id `work:memory`, so the two stderrs differ in that name only.
  The alias's binding is `memoryAliasCommand`, not `workMemoryCommand`: 128's routed-door control
  bans the retired ladder face's identifier from code under `src/`.
- **178/01 near-miss recall** `f6dce452-0612-4c3b-98de-3f800f770bfe`: 128/R1, 41/R3, 19/R1 and
  131/03/R1 honoured (the alias shares the guard because it shares the functions, every
  registry-derived control was named before the build, the old spelling was grepped at the close);
  06/R1 irrelevant.

- **178/02 built (2026-10-29, `aof:continue 178`, solo).** The 53 asset occurrences became
  `aof memory`, none wrapped across lines. The work install now renders opencode too (operator, at
  build): `aof work init . --force --runtime claude,codex,opencode`. The work lock recorded only
  claude and codex, so `aof work update` never rendered `.opencode/`, and those tracked files had
  drifted. The re-init refreshed five of them that predate 178 (`aof-architect`, `add-diagram`,
  `explain`, `review`, and the new `prototype.md`). A second `aof work update --dry-run` writes
  nothing. FF-17802 lives at `test/arch/memory/acd-assets-spell-aof-memory.test.mjs`, not under
  `test/arch/bundle/` as ARCHITECTURE's table says: FF-12405 leg 10 freezes that directory at 23
  controls, and its budget row sends a control of another subject to its subject's directory.
- **178/02 near-miss recall** `4d11289c-8a41-4bae-ac70-c8f89f7b399b`: 127/01/R3 and 168/02/R1
  honoured (the bundle manifest regenerated, the lock re-rendered), 01/R2 honoured (rendered files
  are `eol=lf`), 08/R2 honoured (the learning-edge parser moved and gained a planted-alias probe),
  171/R3 irrelevant.

- **178/03 built (2026-10-29, `aof:continue 178`, solo).** `origin` is resolved once per item in
  the indexer's one walk and stamped on every record the item contributes, episodic ones included.
  The drop count reaches `buildIndex` and graphify's `buildStore` through a named out-parameter
  (`ctx.originReport`), so `buildRecords` keeps answering the bare array its 50-odd callers read,
  and core's graphify binding is unchanged. `originStatus` sits beside `indexVersionReport`, shared
  by both backends. Every producer emits `origin: []` (the episodic and auto-memory producers
  included, outside the declared set), so a record leaves its producer in the frozen shape.
  Measured over the live stream: 5,297 records, 2,528 carrying an origin across 207 items, and 6
  unresolved, matching the contract and FF-17803's independent count. FF-17803 builds the index in
  place (`buildIndex` writes nothing) rather than over a 52 MB copy. A mutation check (pre-archive
  candidate removed, block origin removed) turned five of the new suite's cases red.
- **178/03 near-miss recall** `9b6ec343-1e12-46cf-a855-ca4b4e10a004`: 165/01/R2 honoured (every literal version pin was swept,
  one in an integration step), 45/R9 honoured (the record-type outline covers every producer),
  05/R4 honoured (the E8 rows plant hostile values: `..`, absolute, a directory), 10/R3 and 01/R4
  irrelevant.

## Feedback (for retro)

- **178/01's declared write set was short by three files.** `test/command/application-assembly.test.mjs`
  pins the command count twice (133 → 134), `test/integration/features/work-memory.feature` asserts the
  usage line, and `test/arch/command/acd-work-memory-routed.test.mjs` was declared but its help leg
  needed the Memory section too. The first two were not in `files:`. A new registered command moves
  every count of the registry, not only the frozen lists that name ids.
- **A golden in `work-memory-command.test.mjs` fails on macOS, before and after 178.** The `reindex
  --json` golden builds its `<STORE>` token from `os.tmpdir()` (`/var/…`), and the CLI reports the
  store's realpath (`/private/var/…`). It is not this milestone's change, and the Windows control
  node never sees it.
- **Six cases fail on this MacBook with and without 178/01's package changes** (measured by
  stashing `packages/` and rerunning). `distribution-workspaces/assets…` and `…/native…` compare
  `os.tmpdir()` paths against realpaths, as the golden above. `workspace-boundaries/planted…`,
  `command-core/workspace packages…` (no trustworthy native count), `autonomous-shell-out/black-box`
  (b01: no phase directive reached the provider) and `69/04 task 02` (a dispatch child loses its
  cwd) fail for reasons of their own. None names memory. `aof test --scope impacted --story 178/01`
  widened to the whole suite (nine declared paths had no registered dependent), so the full suite
  ran once on this control node.

- **178/02's declared write set missed the derived and the moved.** `packages/core/assets/manifest.json`
  (regenerated by `scripts/generate-bundle-manifest.mjs`, 14 hashes), `.aof/aof.apply-journal.json`
  (written by the render), the five drifted `.opencode` files, and the FF's actual home
  `test/arch/memory/` (its file and `index.mjs`) were not in `files:`; the declared
  `test/arch/bundle/` pair went unused. The refine declared a path a frozen ceiling forbids. FF-7106 then named eleven more, the
  manifest and ten `.agents` renders (`SKILL.md`, `agents/openai.yaml`) of the edited commands. All
  were added to 02's `files:` at build.
- **E10 is checked by proxy (nit).** "The migration rewrote nothing under `wiki/work/`" is asserted
  as "history still spells the alias", not as a diff of the work stream.
- **Six more cases fail on this MacBook at HEAD, unrelated to memory.** `release-fingerprint-pin`
  00-02 and `yarn-installation` ×3 (measured by stashing 02's tracked changes and rerunning).

- **178/03's declared write set missed seven files the version bump and new field reached.** Two
  producers (`episodic-indexing.mjs`, `claude-auto-memory.mjs`), four shape or version pins
  (`import-recovery`, `acd-import-artifact-shape`, `acd-memory-aof-digest`,
  `outcome-index-any-item`) and one integration step (`memory-auto-source.steps.mjs`, a literal 3).
  All added to 03's `files:` at build. The refine named the pins it found by grep for
  `MEMORY_RECORD_FIELDS`; the misses special-case `tags` by name or pin a literal.
  Three more surfaced in the wide sweep: the 66/01 golden and its field count
  (`acd-declared-id-single-home`, `declared-id.test`, 14 → 15), `acd-memory-index-location`'s own
  key list, and `work-memory-command`'s JSON goldens (version 4, `origin`).
- **178/02 broke a leg its own run did not select.** `acd-work-memory-routed`'s README leg counted
  five `aof work memory` lines; 02 moved the README to `aof memory`. 02's run selected the README
  control but not the routed control that wraps it. Caught in 03's sweep and widened there (four
  `aof memory` lines resolve to `memory`, the 05 row still to `work memory`).

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green (FF-17801..17803 land pending; each owes a red probe)
- [ ] `@manual` signed off — see `UAT.md` (no story declares an `@manual` scenario)
