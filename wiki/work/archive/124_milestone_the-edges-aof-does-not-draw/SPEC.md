---
type: milestone
number: 124
slug: the-edges-aof-does-not-draw
title: "The edges aof does not draw — a declared graph nobody checks, and three return paths that stop one node short"
status: done
owner: product-owner
created: 2026-09-07
updated: 2026-09-08
origin: [../../planning/PRD-graph-engineering.md]
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 124 · The edges aof does not draw — a declared graph nobody checks, and three return paths that stop one node short

## Objective

aof's work graph has edges it **declares and never verifies**, and edges it **needs and never
draws**. Both are the same defect seen from two sides: the graph is an authored artifact, and
nothing measures it against what actually happens.

Measured at HEAD, 2026-09-07:

| seam | what is checked today | what is not |
|---|---|---|
| `depends:` edges | resolves + acyclic (`validateWork`, `src/work.mjs:1184-1239`) | whether the edge is **real** — no check that the dependent consumes anything the dependency produces |
| the correction return (`runBrief`, `src/commands/loop.mjs`) | carries UNIT, VERDICT, REASON, EVIDENCE | **SCOPE** — nothing bounds the correction to the failing unit |
| `cap-exhausted` | halts the loop and surfaces | the plan that produced the unit is never re-entered, though the shell already knows how to dispatch `refine` |
| the learning edge | `refine.md:121` recalls memory **before** story break-down | `shatter.md` has **no memory hook at all** — the outermost splitter cuts milestones with no access to accumulated lessons |

The first row is the largest. Story contracts already declare `reads:` and `files:`, and
`src/ready-wave.mjs` already computes them — but only to avoid write collisions. The same two sets
answer a question nobody asks: *does this `depends:` edge correspond to anything crossing between
the two items?* An edge with no crossing is a wait with no cause, and in a system whose unit of
independence is the story, every phantom edge is serialised work that could have run in parallel.

The remaining three rows are one shape: a return path that stops one node short of where it would
do work. A correction that does not carry its own boundary becomes a diff nobody scoped. An
exhausted cap that halts instead of returning to the planner asks a loop to fix a fault it cannot
see. And a lesson that reaches the story-splitter but not the milestone-splitter improves how work
is cut only at the finer grain, never at the coarser one where the cut costs most.

The bar this milestone is trying to clear, stated as the source puts it: **a verdict that does not
change what runs next is a report.**

## Scope

In scope:

- **The phantom-edge census.** An advisory check that names each `depends:` edge whose dependent's
  `reads:` does not intersect the dependency's `files:`. Advisory and not a gate: a milestone edge
  may legitimately encode capability ordering rather than data flow, and a check that cannot tell
  those apart must report, not refuse. Reuses the contract sets `ready-wave` already resolves; adds
  no new authored field.
- **A SCOPE line on the correction return.** The re-drive brief gains the boundary the correction
  must respect, derived from the failing item's own declared `files:` rather than newly authored.
  Carrying it and enforcing it are separate outcomes and may be separate stories — a scope the
  agent can ignore is prose, and prose is what this milestone exists to replace.
- **Cap exhaustion returns to the plan.** An exhausted unit routes back to `refine` rather than
  terminating the range, within the existing stop vocabulary and the existing cap. The escalation
  is bounded: returning to the planner is itself an attempt and cannot recur without limit.
- **The learning edge reaches the outermost splitter.** `shatter.md` gains the recall block
  `refine.md` already carries, so milestone framing is informed by the same accumulated lessons
  that inform story boundaries.

Out of scope:

- **Blast-radius lanes** (gate by reversibility of the change, with a closed lane for
  irreversible work). Genuinely valuable and genuinely milestone-sized on its own: it needs a
  reversibility classifier, a lane vocabulary, and a worked-out relationship with the frozen set —
  which is already closed-lane machinery, but for harness changes rather than product ones.
  Deferred whole; nothing here forecloses it.
- **State-driven dispatch** (route on staleness, thin evidence, contradiction rather than status
  alone). Wants per-loop observation that does not exist while `SHELL_LOOP_ID` is the only loop id
  any run ever declares. Downstream of a milestone not yet written.
- **Making the loop registry govern the runtime.** The registry is consulted by reporting surfaces
  and by the L3 admission gate, and by nothing else; the execution record that measures declared
  against actual is deliberately non-gating (78/ADR-007, pinned four ways). That is its own arc and
  is not opened here.
- **A plugin/trial harness for unproven loop and graph ideas.** Wanted, and blocked on a prior
  question: aof cannot run the same work twice, so every harness A/B is confounded by the items
  themselves. Until that is answered, a trial harness can show a variant *ran*, not that it was
  *better*.

## Stories

<!-- The stories that compose this milestone. Each is its own NN_story_<slug> item with parent: 124.
     Populated at the Break-down stage (refine); "to be broken down" until then. The milestone is
     accepted when all its stories are. -->

Three, independent by construction and all parallel-eligible — the sibling `depends:` edge this
milestone anticipated is **discharged**, not drawn (see below). Write sets checked disjoint against
the codebase graph at refine.

- [x] `124/00` — **The census reports its denominator** — one home for the contract set, a coverage
      predicate `ready-wave` adopts, and a fourth advisory doctor lane that names each unwitnessed
      `depends:` edge *and* the 182 it could not read. ADRs **001**, **002**, **003**. The largest.
- [x] `124/01` — **Cap exhaustion returns to the plan** — the shell stops minting its own halt and
      asks the engine, which already dispatches `refine` today. ADRs **005**, **006**. Sole writer
      of `src/commands/loop.mjs`.
- [x] `124/02` — **The learning edge reaches every cut** — `shatter.md` gains a one-per-PRD, PO-only
      recall keyed to the seam. ADR **007**. The smallest.

**One of the four scoped outcomes was dropped at refine, on the evidence this SPEC asked for.** The
**SCOPE line on the correction return** is not built here; `ARCHITECTURE.md#ADR-004` records why,
with the reopening condition stated as a runnable command. In short — this SPEC's own grounding
premise is false (`changeBaseline`/`progressBaseCommit` are in-process locals, never persisted, and
the seam is `composeFixInput` at `src/commands/drive.mjs:87-93`, not `runBrief`), and **0 of 90** run
records show the correction cycle ever completing, so `n = 0`. Dropping it is also what discharges
the collision `## Dependencies` anticipates: only `124/01` writes `src/commands/loop.mjs`.

## Dependencies

- **None blocking.** The graph arc (52–63) and the loop-performance arc (68–79) are accepted; the
  machinery each story extends is shipped and green.
- **Coordinate with 119** (in progress) — it restructures `src/commands/`, and two of the outcomes
  above edit `src/commands/loop.mjs`. Sequence after 119's interior lands, or expect a rebase.
- The two outcomes touching `src/commands/loop.mjs` collide with each other on the same file and
  must carry a sibling `depends:` edge rather than being drawn as independent.

## Notes on provenance — read before refining

This milestone is **reading-derived, not trace-derived**, and says so deliberately.
[PRD-graph-engineering.md](../../../planning/PRD-graph-engineering.md) requires a harness change to
trace to observed run evidence — *"attempt/trace-evidenced, never speculative"* — and none of the
four outcomes above came from a measured aof failure. They came from an audit against two external
accounts of loop/graph engineering (Hanako, *Loops and Graphs*, 2026-08-23; polydao, *300 Agents,
One Graph*, 2026-09-05) plus the arc's own PRD.

That is a real weakness in the evidence, not a formality, and the arc's own literature says why:
this is exactly the input class an undisciplined acceptor commits false edits from. Two of the four
outcomes can be grounded cheaply before any code is written, and refine should do so first:

- **The phantom-edge census grounds itself.** Run it over this stream. If it names no edge, the
  premise is false here and the story should be dropped rather than built. If it names several, the
  finding *is* the evidence.
- **The SCOPE line has a measurable premise.** The run store records `changeBaseline` and
  `progressBaseCommit` per cycle. Diffing those across correction cycles answers directly: when the
  loop re-drives `continue` with findings, how often does the resulting diff touch files outside the
  failing unit? A small number means the source's warning does not apply to this codebase.

The other two are cheap enough that measurement would cost more than the change.
