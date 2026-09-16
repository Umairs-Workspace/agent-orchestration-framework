---
type: story
number: 79
slug: committed-loop-graph
title: "The committed loop graph — the additive face 52 pre-authorised"
status: done
owner: product-owner
created: 2026-08-16
updated: 2026-09-03
depends: [52]
origin: [../../planning/PRD-graph-engineering.md]
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/78_milestone_loop-execution-record/ARCHITECTURE.md#ADR-001, wiki/work/78_milestone_loop-execution-record/ARCHITECTURE.md#ADR-002, wiki/work/78_milestone_loop-execution-record/ARCHITECTURE.md#ADR-009, wiki/work/78_milestone_loop-execution-record/ARCHITECTURE.md#ADR-010, wiki/work/64_chore_inherited-reds/CHORE.md, src/commands/loops-graph.mjs, src/commands/loops-validate.mjs, src/commands/grade.mjs, src/work-loops.mjs, src/work-loops-checks.mjs, src/work-doctor.mjs, src/work.mjs, src/fs.mjs, src/spine/face.mjs, test/arch/acd-loop-registry-not-an-item-type.test.mjs, test/arch/acd-loop-module-import-boundary.test.mjs, test/arch/acd-work-insert-command-bundle-parity.test.mjs, scripts/test.mjs]
files: [src/loop-document.mjs, src/commands/loop-document.mjs, src/command-core.mjs, wiki/work/loops.md, test/loop-document.test.mjs, test/loop-document-command.test.mjs, test/support/loop-document-fixture.mjs, test/arch/acd-loop-document-idempotent.test.mjs, test/arch/acd-loop-document-current.test.mjs, test/arch/acd-loop-document-write-scope.test.mjs, test/arch/acd-loop-document-board-deferred.test.mjs, test/arch/acd-work-command-route-coverage.test.mjs, test/arch/acd-work-command-cli-bijection.test.mjs, test/command-core-contract.test.mjs, scripts/test.mjs]
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 79 · The committed loop graph — the additive face 52 pre-authorised

## User story

As an operator reviewing a change to aof's own control loops,
I want the loop graph committed in the repository as a markdown file,
so that adding an edge or changing a ceiling shows up as a picture in the pull request instead of
being invisible until someone remembers to run a command.

## Why

Milestone 52 built the renderer, named this exact artefact, and stopped one step short of it.

> *"The rendering is **committable — a `loops.mmd` in a PR is a reviewable artifact** — which is the
> PRD's governance test met literally."* — `52/ARCHITECTURE.md:876-878`

> *"A future milestone can add a face additively with no change here."* — `52/ARCHITECTURE.md:869-870`

Today `aof work loops graph` returns `{text, edgeCount}` in memory and the CLI prints it
(`src/commands/loops-graph.mjs:41-73, :107`). There is no `--out`, no path in the input schema, and
nothing on disk. So the governance test is met *"literally"* only in the sense that an operator could
type `>` — which nobody has, in the two milestones since.

**What the absence costs.** The registry is seventeen hand-authored markdown files (measured at
refine — `.aof/loops/`, all tracked). A change to one of
them — a new `monitoring` edge, a `ceiling` moving off `uncapped`, an `owner` acquiring a name — is
today a diff in frontmatter that says nothing about the shape it produces. The graph is the only
surface on which "these two loops are now paired" or "this component is still ungrounded" is legible,
and it exists only for as long as a terminal window is open. Committing it turns every registry edit
into a reviewable change to a picture, which is what ADR-009 said the artefact was *for*.

**And it makes drift detectable.** The Mermaid output is byte-deterministic and frozen by FF-5208 —
canonical node order, canonical edge order, three fixed glyphs, collision-safe keys. A committed
projection of a deterministic function is a thing CI can check: regenerate, and a non-empty diff
means someone edited a loop record without regenerating the graph. That check does not exist today
because the artefact does not exist.

**This is not milestone 78.** 78 is the *per-item execution* record — which loops actually ran for a
work item, their cycles against their ceilings, and a human signature. It cannot start until 53
populates `brief.loop`, because nothing that executes currently names a loop. This story is the
*declared* graph: repo-wide, one file, no dependency on 53, buildable now.

**The inheritance runs the other way now (measured at refine).** This story expected 78 to build on
it. 78 was refined first, found this story `not-started`, and took the three shared decisions itself
rather than refining against decisions that did not exist: 78/ADR-010 names them — ADR-001 (where a
generated document lives), ADR-002 (the one-door writer and its idempotence), FF-7803 (the drift
check) — and says explicitly that *"79 inherits them"*. Either order still works; what is removed is
both items deriving the same three answers independently and differing. So the contract below
conforms to those ADRs rather than re-deciding them, and adapts ADR-001 where it must: 78's document
lives in an item's own folder and this one is repo-wide, so the *principle* is inherited (a committed
peer document, never under `observability/` or `runs/`, never a section of a human-authored file) and
the path is this story's own.

## Tasks

- [x] `tasks/00_the-document.feature` — the composed document: the frozen renderer imported and
      wrapped in a fenced `mermaid` block, the health summary, the generated marker, and no
      frontmatter for F-73-G to break.
- [x] `tasks/01_the-writer-and-its-one-home.feature` — the bare face reads; `--write` is the only door
      to disk; one derived home at the work-directory root; byte-identical regeneration and a write
      scope of exactly one file.
- [x] `tasks/02_the-drift-check.feature` — the control that reds when a loop record was edited without
      regenerating the document, and gates the suite rather than the work lifecycle.
- [x] `tasks/03_registration-and-the-name-that-is-forced.feature` — the command core, the frozen
      `WORK_IDS` and `BOARD_DEFERRED` lists, and the module name 52/FF-5201 itself decides.

## Notes

**Reuse the renderer; do not extend it.** `renderLoopGraph`'s bytes are frozen by FF-5208 across ten
`structural-duplicate` scenarios. This story wants *exactly those bytes*, so it composes over the
existing function and adds a writer — the opposite of 78, which renders a differently-scoped graph
and therefore needs its own renderer.

**Where the file lands — DECIDED at refine: `wiki/work/loops.md`, the work-directory root.** The
complication is gone: 53/07 has landed, so the registry already lives in `.aof/loops/` and ships in
the bundle. That settles two things at once. The output is a sibling of the registry and not a member
of it *by construction* — different tree entirely, so FF-5201's byte-identity sweep is untouched —
and `.aof/loops/` is disqualified as a home, because the next `aof work update` would overwrite a
generated document rendered there. The work-directory root is the repository's own established home
for a committed, repo-wide document: `git ls-files wiki/work` returns exactly two non-item files
there, `ROADMAP.md` and `TECH_DEBT.md`, and doctor already treats a file at that root as neither an
item-folder candidate nor an orphan (`src/work-doctor.mjs:401`). The path is derived from `work.dir`,
and the command accepts no caller-supplied output path — one home keeps the drift check anchored to
something it can actually find.

**The writer cannot live in `loops-graph.mjs`, and the gate is what decides that.** FF-5201 discovers
loop modules from disk by two patterns (`src/work-loops*.mjs`, `src/commands/loops-*.mjs`), asserts
the discovered set equals its expected six, and holds every discovered module free of write call
forms — its own comment names *"a writer `src/commands/loops-init.mjs`"* as the case it exists to
catch. So `--out` on `work:loops-graph` is red twice over, and so is a writer named into the `loops-`
family. The writer takes the execution/document family name 78/ADR-009 established for this exact
reason (`src/loop-document.mjs` + `src/commands/loop-document.mjs`, id `work:loop-document`), while
the CLI route sits at `aof work loops document` where an operator will look for it — an id/route
divergence `work:loops-graph` → `aof work loops graph` already establishes.

**No signature here, so the writer is simpler than 78's.** 78/ADR-002's read-modify-write exists to
carry a human sign-off row forward verbatim. This document has no sign-off block and nothing
non-derivable in it, so it is a truncate-and-emit. Only the half of ADR-002 that applies is inherited:
byte-identity on unchanged inputs, and `--write` as the only door to disk.

**Markdown, not a bare `.mmd`.** ADR-009 says `loops.mmd`; the operator ask is a markdown file that
renders where markdown renders. A `.md` wrapping a fenced ```mermaid``` block satisfies both and is
viewable on GitHub, in an editor preview, and in the board. Worth also carrying the summary
`work:loops-validate` already computes — node and edge counts, and the finding counts by code — so
the document answers "is this graph healthy" and not only "what shape is it".

**Mind the generated-file marker — DECIDED: no frontmatter at all.** The bundle convention is a
leading `<!-- aof-generated: bundle -->` comment, and there is a known trap: a leading comment
**before** frontmatter breaks frontmatter parsing, recorded as F-73-G in story 73. This document is
not a work item and no register check reads it, so it carries no frontmatter — the marker leads, and
F-73-G cannot be sprung.

**Regeneration must be idempotent and the file must be a face.** Byte-identical output on unchanged
input, per the milestone-08 spine: the document is derived from a registered command with a stable
`--json` contract and is never a second source of truth
(`PRD-acd-loop-engineering.md:112-114`, `PRD-graph-engineering.md:214-216`).

**The adjacent red is already closed — this story does not reopen it.** Chore 64 is `done`, and it
closed the `work:loops-*` gap the way F-73-Q's reasoning demanded: all four read verbs
(`loops-show`, `loops-graph`, `loops-validate`, `loops-groundedness`) are in the frozen `WORK_IDS`
census and in `BOARD_DEFERRED` with the reason written out — 52/FF-5202 bans the loop family from
`ui/`, so a served `/api/work/loops-*` would be a door no UI is permitted to open. The new writer
joins that carve-out with its own entry and its own reason; it inherits nothing red.

**Deliberately not in scope.** Making the graph gate anything, populating the registry's missing edges
(55/57), fixing the dead timescale check or the silent `ceiling: none` (routed to 55 in 78's STATE),
and any web/UI panel — 52 rejected one and the reasoning holds.
