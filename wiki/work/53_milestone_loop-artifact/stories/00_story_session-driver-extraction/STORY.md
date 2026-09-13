---
type: story
number: 00
slug: session-driver-extraction
title: "The session driver gets a home — a subtraction from the widest sink in src/"
parent: 53
status: done
owner: product-owner
created: 2026-08-15
updated: 2026-08-17
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 00 · The session driver gets a home

## User story

As an **operator who wants a loop on this machine**, I want the machinery that drives an agent
session to a terminal outcome to live in a module that knows nothing about the mesh, so that a
local loop can use it **without loading the assignment lifecycle, the effects ledger and a SQLite
opener** — and so that the next thing needing a driven session extends one implementation instead
of writing a third.

## Context

`src/agent-session-driver.mjs` (new): the **seventeen** names of ADR-001 §1 as amended by
ADR-010 §18 — its sixteen plus `ensureWorktreeTrusted`, admitted BY NAME as the seventeenth rather
than carried in a parenthetical a gate cannot read — **moved verbatim**: no rename, no signature
change, no behaviour change, out of `src/mesh-worker-execution.mjs`, which re-exports every one of
them so all 49 dependents keep their sink import and linked bindings. Of the 43 importer suites,
42 stay byte-untouched and the one named source gate is deliberately re-aimed without changing its
behavioural sink import.

Three facts make this the milestone's central move rather than a tidy-up:

**The driver is already mesh-blind; only the file it sits in is not.** RESEARCH §Q1 measured it —
not one of `driveInteractiveClaudeSession`, `resolveInteractiveDriverLaunch`,
`defaultWatchTranscriptSessionId`, `defaultWatchTranscriptCompletion` or `defaultPtySpawn` takes an
`assignmentId`, a `workspaceId`, a lease or a worktree handle. But importing *anything* from that
3,286-line file pulls its 21 top-of-file imports in as a load-time side effect.

**A sibling would be the third copy.** Milestone 50 hit this same wall and built a sibling — and
RESEARCH §Q1 measured why that precedent does not authorise another one: 50's module spawns a bare
operator shell with no provider resolution, no system prompt, no sentinel scan, no transcript watch
and no `{outcome}` promise at all. Its problem is disjoint. 53's problem is m38's, exactly.

**The re-export is what makes the move affordable, and the precedent is already in the file** —
`ensureWorktreeTrusted` moved to `claude-trust.mjs` and is re-exported at
`mesh-worker-execution.mjs:1442` for this reason, with that comment.

This is also TECH_DEBT item 10's own prescribed fix executed rather than deferred: *"Split
`mesh-worker-execution.mjs` along its own seams… the PTY/agent driver [is] a module."*

ADR references: 53/ADR-001 (the frozen moved set, the import set, the subtraction) and
53/ADR-015 §2 (the integrated ten-file naming allowlist). This reopened contract corrects the
accepting record's importer, link-probe and null-surfacing claims; the architectural record must
name that narrow supersession before the next build.

## Acceptance

- **The moved set is exactly the frozen seventeen** — ADR-001 §1's sixteen plus
  `ensureWorktreeTrusted` (ADR-010 §18) — set equality in both directions. An **eighteenth** export
  is as much a defect as a missing one. `defaultPtySpawn` is module-PRIVATE in the sink today
  (`:1373`, a bare `const`), so the move necessarily creates a new public export site on both
  modules; ADR-010 §17d admits that rather than finessing it.
- **Nothing in the moved driver is rewritten.** Every moved name keeps its identifier, its signature, its default
  parameters and its behaviour. This is a move, not a refactor; a rename riding a move is a second
  change in one diff and is explicitly out of scope (ADR-001, alternatives). The one newly
  authorised correction is outside the moved set: the status-recorder fixture must preserve the
  production effect-step payload's explicit `sessionId: null` instead of deleting that key and
  presenting `undefined` to the frozen session-id suite. That module stays unedited and must finish
  **8/8**; with the other seven unchanged behavioural modules, the named lane must finish **33/33**,
  not receive a waiver for its current **31/33** combined result.
- **The new module's import set is the frozen five** — `terminal-providers.mjs`, `terminal-ws.mjs`,
  `work-observe.mjs`, `claude-trust.mjs`, `degrade.mjs` — plus node builtins. No `run-store`, no
  `effects/*`, no `mesh-*`, no `global-work-store`, no `workspace*`, no `board-*`, no `commands/*`.
  The exactly two admitted transitive reasons are `terminal-ws.mjs → work.mjs` and
  `degrade.mjs → mesh-log.mjs`, each named out loud and guarded by a self-check that fails if its
  reason loses its subject rather than papering over a broader lifecycle dependency.
- **`src/mesh-worker-execution.mjs` defines none of the seventeen and re-exports all seventeen**,
  so every importer resolves to the same reference — **and it `import`s three of them back**,
  `defaultSpawnRuntime`, `defaultPtySpawn` and `driveInteractiveClaudeSession`, which its own
  remaining handler code consumes. An `export … from` line binds no local name, so without that import the sites are
  a `ReferenceError` at runtime (ADR-010 §17a). The headline correctness criterion, re-derived from
  the graph (ADR-010 §17b): of the **43 suites** that import the sink, **42 untouched suites name
  `agent-session-driver` zero times** and the one named exception is
  `test/arch/acd-worker-driver-no-headless-print.test.mjs`, deliberately re-aimed at the moved
  producer while its behavioural import still resolves through the sink. The two
  `test/support/{artifact-sync,gate-propagation}-fixture.mjs` importer modules remain covered, and
  `src/mesh-launcher.mjs:62`'s
  `INTERACTIVE_COMMAND_READY_DELAY_MS` import still resolves.
- **The sink shrinks and is measured shrinking** — 3,286 lines down to **~2,300** (ADR-010 §17c:
  the moved block `:847-1851` is 1,005 lines, so the sink lands at 2,281 plus its import and
  re-export block; ADR-001 §4's "roughly 2,400" was high). The post-move count becomes a **ceiling
  AND a floor** (FF-5302), so the file cannot grow back through this seam and a rename, a moved
  file or a truncated read fails as "the file was not actually read" rather than passing as
  headroom.
- **Exactly four pre-existing test-tree files are edited across the whole story, each at its named
  boundary.** Three are already delivered: first,
  `test/arch/acd-worker-driver-no-headless-print.test.mjs`, and the edit is precisely scoped — its
  single `DRIVER_SOURCE` constant (`:51`) splits into `DRIVER_SOURCE` (the new module: invariants 1,
  2, 3, 4-producer, 6) and `HANDLER_SOURCE` (the sink: invariant 4-surfacing, invariant 5 — the
  `needs-input`/`removeWorktree` branch, which is handler code) across its **seven reads** — six
  `readFile(DRIVER_SOURCE)` sites, of which the invariant-4 site at `:253-301` carries both halves
  over one `raw`/`stripped` pair and must therefore read BOTH files (ADR-010 §19b). **Invariant 1
  carries a positive control** (`buildDriverCommand`'s `bin: "codex"` argv form must be present in
  the source it read), because an absence assertion left aimed at the post-move sink passes while
  checking nothing AND its own plant still trips (ADR-010 §19a). Its behavioural legs are unaffected
  because the import at `:47` still resolves through the re-export; plus the two re-export-following
  source gates already recorded in STATE/VERIFICATION,
  `test/arch/acd-terminal-mirror-geometry-pinned.test.mjs` and
  `test/arch/acd-terminal-view-live-observable.test.mjs`. The one newly authorised pre-existing edit is
  `test/support/mesh-worker-exec-fixture.mjs` changes only `createStatusRecorder`'s durable effect-step
  projection so an own `sessionId: null` survives while the other legacy null placeholders remain
  sparse. The frozen `test/mesh-worker-driver-session-id.test.mjs` suite is byte-unchanged.
- **The driver still drives.** The existing terminal fixture (`createFakeWhich` / `createFakePtySpawn`,
  `test/support/mesh-worker-terminal-fixture.mjs`) injects at the same `{ptySpawn, which}` seam and
  the same completion/needs-input/session-id behaviour is observed from the new module's door.
- **Every census member is verified through an honest door.** The 48 importable members link in a
  fresh process and their sink bindings resolve. `scripts/pin-checkout-id.mjs` is a CLI entry point,
  not an import-safe library: its static import clause is parsed, and each binding it names is
  checked against the sink's linked namespace without evaluating the script body.
- **The story's evidence lands WITH the story, registered.** Five new suites under this story's frozen
  name family — `test/agent-session-driver-{door,drives,transcript,runtime-dispatch,gate-aim}.test.mjs`
  — **imported AND spread** in `scripts/test.mjs` inside this story's own labelled
  `// milestone 53 / story 00` block, in the same diff as the move they mechanise. Not later, and not
  53/05's: a story accepted on evidence the runner never invokes is TECH_DEBT item 48 exactly
  (ADR-011 §1).
- `src/work.mjs` is not touched. Beyond this story's own new suites, the three named re-aimed arch
  gates already delivered, and the exact status-recorder-fixture null-preservation correction, no
  other test file changes.

## Tasks

- [x] [00 — the frozen seventeen are reachable at both doors, and a consumer sees one implementation behind them](tasks/00_the-two-doors.feature)
- [x] [01 — every pre-existing importer keeps the import line it already had, and the census proves it](tasks/01_the-importers-stay-put.feature)
- [x] [02 — the driver still drives from its new home over the same `{ptySpawn, which}` seam](tasks/02_the-driver-still-drives.feature)
- [x] [03 — the session-id and completion watches settle identically against a real transcript tree](tasks/03_the-transcript-watches.feature)
- [x] [04 — `codex` stays a one-shot child and everything else stays the PTY session](tasks/04_codex-is-not-a-pty-path.feature)
- [x] [05 — the split arch gate keeps its aim, including the invariant that would go vacuously green](tasks/05_the-gate-keeps-its-aim.feature)

## Notes

**Reopened contract ruling (product-owner pass, 2026-08-17):** the naming allowlist is the closed
ten-file set already ruled by ADR-015 §2, while its importer claim is the truthful **42 untouched +
one named re-aimed gate** statement. The frozen eight-module behavioural lane is a required **33/33**
gate, including **8/8** from the unchanged session-id module; the
status-recorder fixture may preserve the explicit null already carried by production, but neither
the suite nor the moved driver contract may be weakened. The pin-checkout CLI entry point is proved
by static-import parsing plus a linked sink-export check, never by executing it as a library. Task 00
has three inward-consumed names, including `driveInteractiveClaudeSession`.

**QA refinement pass (2026-08-17):** every task and Examples table was re-audited against the
integrated tree. Task 00 now marks all three inward-consumed exports. Task 01 carries exact inventories
for the 42+1 importer split, the closed ten-name allowlist, 48 fresh-process links plus the pin CLI's
static/link-only proof, and explicit-null session-id surfacing. The reopened implementation delta names
the re-aimed importer gate and status-recorder fixture; the whole-story historical ceiling is four
pre-existing test-tree files because two terminal gates were already re-aimed during the accepted build.

**Developer-feasibility pass (2026-08-17): CONFORMS.** ADR-015 §2 and the partition now assign the
reopened evidence to 53/00 and remove 53/05's stale ownership. The 48+pin link split is buildable, the
sink already imports the exact three inward names, and production already reports explicit
`sessionId: null`; preserving that one key in `createStatusRecorder.sendEffectStep` makes the unchanged
session-id module 8/8 and the eight-module behavioural lane 33/33. No production semantic change or
new command/seam is required.

The one identifier that now reads slightly wrong is `WORKER_SESSION_INSTRUCTION`, in a module both
the mesh worker and the local loop use. Renaming it was considered and rejected in ADR-001: it is
pinned by the arch-test's plant regex and by every importer's named binding, and a rename riding a
move is two changes in one diff. Recorded there as one identifier of TECH_DEBT item 10's NAME-drift
shape, too small for its own entry.
