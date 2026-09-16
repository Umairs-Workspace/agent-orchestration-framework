---
type: story
number: 05
slug: the-triggers-face
title: "The trigger's face — one registered command whose whole output is a `work:loop` input and the argv that carries it, and which launches nothing"
parent: 63
status: done
owner: product-owner
created: 2026-09-01
updated: 2026-09-02
depends: [63/00, 63/01, 63/02, 63/03, 63/04]
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/63_milestone_event-driven-triggers/ARCHITECTURE.md, src/work-trigger/declaration.mjs, src/work-trigger/level.mjs, src/work-trigger/sources.mjs, src/commands/loop.mjs, src/commands/tune.mjs, src/command-core.mjs, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-002]
files: [src/commands/trigger.mjs, src/command-core.mjs, test/trigger-command.test.mjs, test/command-core-contract.test.mjs, test/arch/acd-work-command-cli-bijection.test.mjs, test/arch/acd-work-command-route-coverage.test.mjs, test/arch/acd-trigger-is-a-caller-not-a-coordinator.test.mjs, test/arch/acd-trigger-holds-no-clock.test.mjs, test/arch/acd-trigger-is-non-vacuous-over-this-repo.test.mjs, scripts/test.mjs]
---
# 05 · The trigger's face

## User story

As the crontab line, CI step or dispatch tick that has to wake the loop without a session in the middle,
I want one command that hands me the exact `work:loop` input and argv my signal resolves to,
so that waking aof is running a command I was given, rather than driving a prompt and hoping it
orchestrates.

This is the milestone's one convergence and its only registered surface. It composes the four leaves,
obtains the two gate facts through `invoke` exactly as `src/commands/loop.mjs:741-748` gathers them,
emits the resolution, and **launches nothing**.

That last clause is structural rather than cautious, and it is worth stating plainly because it is the
shape of the whole milestone. 53/ADR-005 made `work:loop`'s registered `run()` a promptly-returning
probe and put the loop body behind `cli.launch` — so `invoke("work:loop", …)` from another command
returns a probe and drives nothing. **There is no in-process path by which a second registered command
can run the loop.** A face that wanted to launch would have to spawn a process (a scheduler, which
63/SPEC puts out of scope) or open a second door onto `runLoopBody` (a second launcher for one body,
which 53 deliberately left exactly one of). So the face **resolves**, and the caller runs the argv it
is handed.

This is 62/ADR-005 §1's rule, adopted whole: *not "writes only under a flag" — no write path exists to
be flagged*. And, as there, **there is no `--dry-run`**, because a command with no wet path has nothing
to withhold.

The story also owns the milestone's honesty clause. Every claim about *the shipped declaration* or *the
composed resolution* lives here rather than being split across the five leaves, because those objects
do not exist until this story composes them — so no stage-1 story lands a control it cannot clear.
**63 may not be accepted while the shipped `.aof/triggers.jsonc` resolves nothing**: at accept, every
declared source must have at least one declared trigger that resolves to a well-formed `work:loop`
input, and every declared trigger's scope must resolve through `LOOP_SCOPE_FORMS`. Green tests over
fixtures do not discharge that — a trigger vocabulary with no member that resolves is a declaration
nobody can act on, which is the species this repository indicts by name everywhere else.

## Tasks

- [x] `tasks/00_the-face-resolves-and-launches-nothing.feature` — the bare face is a read: no file written, no config mutated, no event raised, no process spawned, and no `--dry-run` to withhold a wet path that does not exist
- [x] `tasks/01_the-resolution-is-a-loop-input-and-its-argv.feature` — the whole output is the `work:loop` input the loop already declares plus the argv that carries it, in one object rendered by both faces
- [x] `tasks/02_the-gate-facts-are-obtained-through-the-registry.feature` — the level pre-flight's two facts arrive through `invoke` at the command boundary and are handed to the leaf, and a registry that cannot answer is a reported failure rather than a locally computed verdict
- [x] `tasks/03_a-refusal-is-reported-and-exits-clean.feature` — an unknown trigger, an unknown source, an unresolvable scope and a refused level are each reported by code with the sources that exist named, and the exit code is a two-sided rule the story states
- [x] `tasks/04_the-shipped-declaration-actually-resolves.feature` — over this repository's own `.aof/triggers.jsonc`, every declared source has at least one trigger resolving to a well-formed loop input, and every scope resolves through the loop's own forms

## Notes

Registration is a hand-kept census in three places — `test/command-core-contract.test.mjs`'s id list
and the two bijection/route-coverage controls — and they are named in `files:` explicitly. ADR-009 §2's
contended-file table lists only contended files, and that distinction is exactly what hid
`test/command-core-contract.test.mjs` from milestone 62's first partition.

**This story carries three of the milestone's eight controls, and that is a consequence of the
edge-free rule rather than an accident** (`ARCHITECTURE.md#ADR-009` §3). `FF-6301` (does the family
coordinate?) and `FF-6303` (does it hold a clock, or write?) are claims over `src/work-trigger/**` and
the face **together**; `FF-6308` is a claim over the shipped declaration. None is evaluable until this
story composes the family, so a stage-1 leaf declaring any of them would be declaring a control it
could not clear. They are three separate control files on purpose: the two family-wide rows fail for
different reasons and their red probes mutate different things, so merged onto one file one probe's red
would be indistinguishable from the other's.

`trigger` joins `acceptor`, `audit`, `grade` and `tune` in `BOARD_DEFERRED` for their reason, recorded
in `ARCHITECTURE.md#ADR-008` §7: the level pre-flight reaches `work:doctor` and
`work:loops-groundedness`, so a served route would let a page load walk the whole work tree. It ships
no `/aof:trigger` bundle command, for the reason §6 records.

**`aof work validate 63` reports three `story reads path … does not exist` issues against this story
until stage 1 lands, and that is expected rather than a defect to tidy away.** The three paths are
`src/work-trigger/{declaration,level,sources}.mjs` — the modules 63/00, 63/01 and 63/04 create, which
this story `depends:` on by construction. Milestone 62's face story carries the identical shape (its
`reads:` names all five `src/work-tune/*.mjs` modules its own stage-1 siblings created) and 62
accepted. Deleting the declarations to silence the validator would trade a transient, self-clearing
issue for a permanently undeclared read.
