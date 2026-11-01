---
doc: state
---
# 179 · AOF guides the human through problem solving without taking over — State

## Progress

- 2026-10-23 — Framed by Hyperagent from wiki/planning/PRD-human-led-learning.md; unnumbered and not started.
- 2026-10-31 — Refined (`aof:refine 179 --autonomous`, solo): ARCHITECTURE ADR-001–008, FF-17901–17903
  declared `pending`, five stories with example maps, task contracts and build briefs. Gates: validate
  PASS; doctor clean of errors.

## Notes & decisions in flight

- Operator review, promotion and refinement remain pending. See SPEC.md for dependencies and the PRD for open questions.
- 2026-10-28 — Operator: "manual is the wrong verb. Manual means 'I'll drive'. We need 'Teach me
  how to drive'." Teaching is a distinct mode beside `--manual`, not a variant of it (SPEC
  Objective). Spike 178's Finding has been amended to match.
- 2026-10-28 — Open for refine (business question): whether a hand-back is whole-story only, or
  partial with the human's committed code protected from agent review fixes. Nested tasks are not
  addressable at the door (`aof work find 149/00` → none), so there is no task-level seam today.
- 2026-10-28 — Operator: the learning module is a new package (SPEC Objective). Two in-repo
  precedents, for the architect at refine:
  (a) the PRACTICE route, `@aof/specification-by-example` (135/ADR-001 §2). Dependencies run one
  way: the package imports `@aof/work`, and `@aof/work` imports nothing back. `@aof/work` offers seams
  that name no practice (`beforeBuild` on the phase doors in `packages/work/src/commands/continue.mjs`,
  and the doctor probes), and core composes the package into them in its application bindings. It
  is gated by config (`work.examples.enabled`). This package ships NO prompt assets; its prompt text
  stays in core's `refine.md`.
  (b) the CONTRIBUTION route, `@aof/integration-hyperagent` and `-notion` (169/ADR-002/003,
  chores 175–177). One static `contribution` brings verbs, an `assets/bundle.json` whose command
  members core appends, and services. It needs one line in `packages/core/src/integrations.mjs`, the
  only core module that may name such a package (FF-16901). This is today's only route by which a
  package ships its own command prompt.
  The tension: teaching is a practice, like (a), but owns prompt text, which only (b) carries. If
  teaching is a `--teach` flag on core's `continue.md`, its prompt text sits in core unless the
  door and bundle gain a contributed-region seam. A package-contributed command keeps the prompt in
  the package, but it is a second door that must repeat the code refusals. The package choice
  therefore feeds the naming question; the two are decided together. Write set: the new package's
  `package.json`, the root `yarn.lock` workspace entry (supply-chain audit, AGENTS.md) and the
  bundle/manifest censuses (149/R2, 153/R1).

- 2026-10-31 — Refine, operator: teaching is its own command, `aof:teach`, and `continue` was
  judged bloated, so `--manual` leaves it too, as `aof:manual` (new story 00). The first draft's slot
  seam (a region spliced into `continue.md`) was dropped before any contract was written.
- 2026-10-31 — Answered at refine: 179/00 Q1 `aof:manual`; 179/00 Q2 `/aof:continue <ref> --manual`
  deleted completely, with no pointer line; 179/02 Q1 a hand-off is whole-story and written into STATE
  so the agent knows it continues from a teach or manual session (ADR-003 §6–§7); 179/03 Q1 each
  task starts back at rung 1.
- 2026-10-31 — Default decisions taken (technical, documented): the door takes injected
  `{ flag, command }` mode descriptors (ADR-002); practice members reach the bundle through a second
  registry, `practices.mjs` (ADR-004 §4); an operator-led command enters through the door and never
  walks the re-entry sweep (ADR-003 §1–§2); a teaching run closes `done` (ADR-003 §4); the pedagogy
  prompt is hand-written and pinned to `vocabulary.mjs` (ADR-006); Claude Code only, with Codex and
  OpenCode rendering no `aof:teach` (ADR-007, agreed with the operator alongside the command design).
- 2026-10-31 — Known gap, accepted: on Codex or OpenCode, `aof work continue <ref> --teach` still
  answers `/aof:teach <ref>`, a command those runtimes do not render. The README line covers it.
- 2026-10-31 — diagram not drawn: diagram-generator-missing (ADR-003 of the first draft; the slot
  seam it pictured was then dropped, so no brief remains).
- 2026-10-31 — Read and write sets were drawn by hand from `aof graph impact` (graph built
  2026-10-28T22:06Z), because `story-contract-derive.mjs` has no CLI face.
- 2026-10-31 — continue 179/00 (run 20261031T193423785Z-0000, attempt 1): near-miss recall returned
  an empty block. The door answers `/aof:manual <ref>` through a `MANUAL_MODE` descriptor; the
  `--manual` input, flag and refusal codes are unchanged, so the command inventory fixture is too
  (the flag's description is pinned there, and was left as it was).
- 2026-10-31 — continue 179/00: the declared write set was incomplete in three places, each
  genuinely required: `test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs` (every command
  file must be classified, so `manual.md` got an exclusion), `.agents/skills/aof-manual/agents/openai.yaml`
  (rendered with every Codex skill) and `.aof/aof.apply-journal.json` (written by `aof work update`).
  `packages/core/assets/commands` has no budget row (its subtree is out of scope), so only
  `test/arch/command` moved, 28 → 29.
- 2026-10-31 — continue 179/00: this repository's lock renders claude and codex only, while
  `.opencode/` is tracked outside it. The three opencode renders (manual, continue, review) were
  copied from a fresh three-runtime render; other tracked opencode files are already stale
  (`explain.md`, a missing `prototype.md`).
- 2026-10-31 — continue 179/01 (run 20261031T202046145Z-0000, attempt 1): near-miss recall empty.
  `yarn install` added the workspace entry only (10 lock lines); the supply-chain audit passes. The
  door derives each mode's input, flag, usage token and both refusal codes from its descriptor;
  manual's built-in descriptor carries the flag description the inventory fixture already pinned.
  The new flat layers `packages/learning/{src,test}` took exemption rows in the directory budget
  (in `files:`); the 142 ledger re-pinned board-mesh-execution, drive-command-phase-drivers and
  yarn-installation.
- 2026-10-31 — continue 179/01: the declared write set was incomplete in three places, each found red
  by the impacted gate and added to `files:`: `scripts/workspace-runtime-audit.json` (the
  `scripts/test.mjs` child-process entries pin the file's comment-stripped digest, re-pinned to
  `e32e4901…`), `test/arch/command/acd-cli-entry-executes.test.mjs` (`aof work find` loads one module
  more, `learning/src/mode.mjs`; ceiling 735 → 736 with the reason) and
  `test/bundle/core-workspace.test.mjs` (`@aof/learning` is the twentieth workspace owner).
- 2026-10-31 — continue 179/02 (run 20261031T204812944Z-0000, attempt 1; `sessionSource` absent,
  so the run is unattributable rather than guessed): near-miss recall empty. `readDescriptor` walks
  INTEGRATIONS then PRACTICES; a practice member carries `assetClass` and no `integration` key. The
  duplicate-id row needed a fragment no installed package ships, so `readDescriptor` takes a
  `readFragment` parameter (default: the package's own `assets/bundle.json`).
- 2026-10-31 — continue 179/02: ADR-007's mechanism did not hold as written. Declaring
  `runtimes: ["claude"]` does not keep Codex from rendering a command: the Codex mapping renders
  every command as a skill, and 154/05's `{{procedures.helper}}` row pins exactly that for a
  Claude-only member with no variant. The build adds one descriptor key, `mapped: false`
  (`bundle-runtime.mjs`, read by `loadBundle`): a member carrying it is never mapped to a runtime it
  does not declare. Every existing member renders as before; Codex and OpenCode now plan no teach.
- 2026-10-31 — continue 179/02: the declared write set was incomplete, each genuinely required and
  added to `files:`: `packages/core/src/work/bundle-runtime.mjs` (the opt-out above),
  `packages/core/package.json` (exports `./practices` for `scripts/sea-asset-manifest.mjs`),
  `packages/core/test/bundle-runtime-variants.suite.mjs` and `wiki/prompt-audit.md` (the audited
  member count, 48 → 49, and the `command:teach` row), `test/loop/autonomous-shell-out-prompt.test.mjs`
  (the command census), `test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs` (`teach.md`
  classified), `.codex/aof/workflows/workflow-contract.md` (FF-7106 counts the shared Codex contract
  as every command's render), `packages/learning/test/mode.suite.mjs` and `packages/learning/README.md`.
- 2026-10-31 — continue 179/02: the impacted gate (all 1251 suites) found five more, fixed and added
  to `files:`: the packaged-sidecar fixture in `hyperagent-runtime.suite.mjs` now carries the learning
  assets too (a packaged binary does); the two "every command maps to codex" controls
  (`acd-cowork-skills-from-command-source`, `planning-cowork-plugin` E5) exclude a `mapped: false`
  member and assert `teach` is unmapped; `aof work find` loads two modules more (`practices.mjs`,
  `learning/src/contribution.mjs`; ceiling 736 → 738); and 179/01's export row now checks `./mode`
  is among the exports, since 02 adds `./contribution`.

## Feedback (for retro)

- 2026-10-31 — refine: the first draft added teaching as a region inside `continue`. The operator
  caught the cost: every build prompt would carry a conversation it never runs. Lesson candidate:
  before adding a mode to an existing command, ask what share of that command's runs would read it.
- 2026-10-31 — refine: pre-existing, outside 179: on a missing `work.test`, the manual guide falls back
  to the project runner while `aof:review` treats the refusal as red (spike 178 Outcome). A story
  shape for the operator.
- 2026-10-31 — continue 179/00: pre-existing, outside 179: `autonomous-shell-out/black-box` b01 is red
  on this machine — its story fixture sets `loop.scheduleToCloseMs: 1`, and the loop halts
  `deadline-exhausted` (elapsed 184 ms) before the provider is spawned. No loop code was touched.
  `test/bundle/core-workspace.test.mjs` has four environment reds too (no `apps/ui/dist`; `/private`
  vs `/var` temp realpaths).
- 2026-10-31 — review 179/00 (solo, inline self-review): no Blocker. Routed at the close:
  (a) Nit, recorded: `MANUAL_MODE` is a descriptor for the local answer only — the input schema, CLI
  flag and usage still spell `manual`; 01's `operatorModes` is where the descriptor takes them over.
  (b) Important, story (operator): this repository's lock renders claude and codex only, while
  `.opencode/` is tracked outside it and already stale (`explain.md`, no `prototype.md`). The shape:
  either the lock records opencode, or `.opencode/` stops being tracked.
  (c) Recorded: the impacted gate widened to all 1248 suites (25+ declared paths are not in the
  graph) and is red on 44 cases outside this story's contract — temp realpaths, PowerShell installer
  suites, live-daemon ports, b01's 1 ms deadline. Both runs were after this build; the second was a
  strict subset of the first. `bundle-asset-manifest-complete/00` was this story's (new files not
  yet tracked) and is green once they are staged.
- 2026-10-31 — review 179/01 (solo, inline self-review): no Blocker. Nit, recorded: the door
  validates a mode descriptor's flag shape and uniqueness, but not a collision with the door's own
  `ref` and `node` inputs; a practice that named its flag `node` would shadow the node input.
- 2026-10-31 — review 179/02 (solo, inline self-review): no Blocker. Routed at the close:
  (a) Amendment, for the operator to ratify at `aof:verify 179`: ADR-007's "declares
  `runtimes: ["claude"]` and carries no Codex variant, so Codex and OpenCode render no teach" is
  not how the render engine works; the shipped mechanism is the member's `mapped: false` key. ADR-007
  wants that sentence superseded (or a new ADR) — no delivered `.feature` is touched.
  (b) Recorded, outside the span: FF-7106 is red on 179/03, which declares `teach.md` and so owes
  `.codex/aof/workflows/workflow-contract.md` in its `files:`. 03 was not in this continue's span,
  so its contract was left as refined; a one-line `files:` repair at 03's next refine or continue.
  (c) Nit, recorded: `readDescriptor`'s `readFragment` parameter exists for one test; it applies to
  integrations too, so a test passing it must pass `integrations: []` to isolate a practice.
- 2026-11-01 — continue 179/03: FF-17903 landed at `test/arch/command/acd-teach-vocabulary-one-home.test.mjs`,
  not the `test/arch/bundle/` path ADR-006's fitness table and task 00's scenario name. FF-12405 leg 10
  holds `test/arch/bundle` at 23 controls with a ceiling that may only fall, and FF-17902 took
  `test/arch/command` for the same reason; the `files:` entries were moved to match, and
  `test/arch/command`'s budget row went 30 -> 31. The 02 routing (b) repair is applied:
  `.codex/aof/workflows/workflow-contract.md` is declared, and FF-7106 is green. Lesson candidate:
  refine should check a named arch-test directory against its ceiling controls before it writes the path.
- 2026-11-01 — continue 179/03: the impacted gate cannot narrow on this machine. `graphify-out/` holds
  no `graph.json` and `graphify` is not installed, so every story-scoped run widens to all 1253 suites.
  This run: 45 reds. One was FF-7106 (the run started before the `files:` repair; green since). The
  other 44 match 179/00's environment baseline (temp realpaths, PowerShell installer suites, worktree
  and daemon fixtures, Node 26 `sessionStorage`, out-of-story count ceilings).
- 2026-11-01 — review 179/03 (solo, inline self-review): no Blocker. Routed at the close:
  (a) Amendment, for the operator to ratify at `aof:verify 179`: ADR-006's fitness table, and task 00's
  "When `test/arch/bundle/…` runs" step, name the bundle path. The control is at the command path
  (above). The delivered `.feature` is not edited.
  (b) Important, fixed: ADR-006 §2's converse ("names no stage, rung or trap the lists lack") had no
  check. `teach-guide.suite.mjs` now holds the numbered ladder to exactly `HELP_LADDER` and the trap
  list to exactly `TRAPS`.
  (c) Nit, recorded: `teach.md`'s `<process>` step 6 spells `` `<guidance>` `` inline, so a naive
  first-occurrence cut lands in the wrong region. `teach-guide.suite.mjs` matches the tag at line
  start; `teach-frame.suite.mjs`'s `region()` still cuts at the first occurrence and is safe only
  while no region it reads is spelt earlier.
- 2026-11-01 — continue 179/04: nothing built, nothing to review. The story is evidence only
  (`files: []`), task 00 is `@manual` and task 01 is `@uat`, so it holds no `@executable` scenario and
  no diff. Gates: validate PASS, doctor 0 errors. The live walk (spike 178's test bed, `claude -p`
  with `--max-budget-usd`, the P2 follow-up turn) and the operator's session are `aof:verify 179`'s,
  as the story and its PLAN place them. Both task boxes stay unticked until that evidence lands.

## Verification

- Planning checklist pre-flight only. No implementation, tests, live experiments or AOF CLI commands have been run for this item.
- The operator's aof work validate on the branch remains the authoritative gate.
