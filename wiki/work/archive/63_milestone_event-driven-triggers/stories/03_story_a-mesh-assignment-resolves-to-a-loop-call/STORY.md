---
type: story
number: 03
slug: a-mesh-assignment-resolves-to-a-loop-call
title: "A mesh assignment resolves to a loop call — the one phase with a coordinator to remove stops being a slash command typed into a session"
parent: 63
status: done
owner: product-owner
created: 2026-09-01
updated: 2026-09-03
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/63_milestone_event-driven-triggers/ARCHITECTURE.md#ADR-006, src/agent-session-driver.mjs, src/commands/loop.mjs, src/work-loop.mjs, src/control-stream-server.mjs, src/assignment-record.mjs, wiki/work/38_milestone_cross-machine-worker-execution/ARCHITECTURE.md]
files: [src/mesh-assignment-directive.mjs, src/mesh-assignment-reclaim.mjs, src/mesh-worker-execution.mjs, test/mesh-assignment-directive.test.mjs, test/mesh-assignment-loop-directive.test.mjs, test/arch/acd-assignment-resolves-to-a-loop-call.test.mjs, scripts/test.mjs]
---
# 03 · A mesh assignment resolves to a loop call

## User story

As the operator who dispatches a whole milestone to a worker machine and walks away,
I want that assignment to run the code-owned loop rather than a Claude session that decides the order
of refine, build and verify for itself,
so that what happens on a machine nobody is watching is a sequence in code with declared gates, not a
model's reading of a prompt.

This is the milestone's **live wake** — the one trigger source with an executor already inside aof —
and its largest hazard. Today `assignmentDirectiveCommand` (`src/mesh-assignment-directive.mjs:59`)
maps every phase to a slash-command string that a worker **types into an interactive `claude` PTY**.
For the `autonomous` phase that session *is* the coordinator 63/SPEC says the trigger path must not
require: `/aof:autonomous <ref>` puts one model in charge of ordering the whole cascade.

**Only that phase changes, because only that phase has a coordinator to remove.** `refine`, `continue`
and `verify` keep today's directive byte-identically. `refine --autonomous` cascades *within* the refine
phase — `GATE_ORDER` has no rung for it and `work:loop` has no scope form that expresses it — so moving
it would be a behaviour change on a live path 63/SPEC does not ask for. `aof work drive
refine|continue|verify <ref>` already exists (`src/commands/drive.mjs:331`) and is the door a later
milestone may move the three through; this story records that and does not walk through it.

The blast radius is the reason the diff is drawn tight. `src/mesh-assignment-directive.mjs` has six
`src/` dependents and imports nothing; `mesh-assignment-reclaim.mjs` has 13 dependents;
`mesh-worker-execution.mjs` is the mesh's god-node at 54 dependents and 29 imports. So the resolution
lives in the **one home that already maps phases** — a phase list spelled anywhere else is the defect
that module's own header records costing a wrong-base build on 2026-07-27 — the wire field is
**additive** beside the existing `baseBranch` and `commit`, the worker reads it in exactly one place,
and the assignment record stays frozen at its ten keys.

Nothing above the launch is touched: PTY spawn, output chunking, streaming, completion detection and
the NEEDS_INPUT path all operate on `{ bin, args, env }` and a pty, and this story changes only what
those three values are for one kind of launch. **A loop launch produces no NEEDS_INPUT sentinel, and
that is correct rather than missing** — an unattended loop halts on a member of 53's frozen
`LOOP_STOPS`, which is the machine-readable halt the sentinel exists to provide for a session.

Version skew is named rather than designed for. A pre-63 worker receiving a `loop` directive sees no
launch and a null command, and *"the interactive session below is still spawned, simply with nothing
typed into it"* — an idle session that settles on its existing deadline. Wasteful and observable, and
deliberately **not** the wrong work at the wrong level, which is what a fallback to `/aof:autonomous`
would have been.

## Tasks

- [x] `tasks/00_the-autonomous-phase-resolves-to-a-loop-launch.feature` — an assignment on the autonomous phase dispatches a loop launch carrying the scope and the declared level, and nothing types a slash command into a session
- [x] `tasks/01_the-other-three-phases-are-byte-unchanged.feature` — `refine`, `continue` and `verify` produce the exact directive they produce at HEAD, including `refine --autonomous`, and one module remains the only speller of a phase
- [x] `tasks/02_the-launch-rides-the-directive-additively.feature` — the launch travels on the directive beside `baseBranch` and `commit`, the assignment record's key count is unchanged, and the worker reads it in exactly one place
- [ ] `tasks/03_an-old-worker-idles-rather-than-doing-the-wrong-work.feature` — a worker that does not understand a loop directive spawns its session with nothing typed and settles on its existing deadline, rather than falling back to the cascade prompt
- [x] `tasks/04_no-topology-pty-or-needs-input-machinery-is-touched.feature` — leasing, reclaim, presence, routing, PTY spawn, output chunking, completion detection and the NEEDS_INPUT path behave exactly as they do at HEAD, and a loop launch halts on a declared loop stop

## Notes

`src/mesh-worker-execution.mjs` is the one file in this milestone's write set a reviewer should be
uneasy about: a ~1,700-line god-node at 54 dependents, through which every worker-side concern has been
threaded one additive field at a time. This story makes **one** additive read in it and no more.
`ARCHITECTURE.md#ADR-009` §5 routes the file itself to a new `TECH_DEBT.md` entry, which is **owed** —
the architect pass may write only architecture and story documents, so the entry is described there and
not yet written.
