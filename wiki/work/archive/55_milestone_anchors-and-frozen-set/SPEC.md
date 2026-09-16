---
type: milestone
number: 55
slug: anchors-and-frozen-set
title: "Anchors & the frozen set — the ground the loops settle against"
status: done
owner: product-owner
created: 2026-08-13
updated: 2026-08-27
depends: [52, 53]
origin: [../../planning/PRD-acd-loop-engineering.md, ../../planning/PRD-graph-engineering.md]
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 55 · Anchors & the frozen set

## Objective

A network of loops that only watch each other fails *circularly*: every check passes, nothing is
verified. The defence is not more topology — it is **ground**. Some measurements must be the kind that
cannot be argued with, and some rules must be ones the optimizer is never allowed to touch.

**This milestone bolts aof's loop graph to reality.** It declares the anchor set — a test process that
actually exited zero and was observed doing so, the build stamp on the running binary, the commit that
actually landed, a live-soak observation, a human ruling — requires an anchor edge from every declared
loop, and emits a **groundedness report**: which loops settle against the world, which are
self-referential, and which anchors have gone stale. Because 52 declared the graph, "ungrounded" is
computable, not a matter of taste: a strongly connected component with no path to an anchor is floating
free, and the command can say so by name.

It also declares the **frozen set** — the locked contract, the litmus, the tag vocabulary, gate order,
the test-isolation guard, and the anchors themselves — and compiles it into the enforcement boundary
aof already owns. This repo has one hand-written proof that the mechanism works: a PreToolUse hook that
*blocks* unisolated test runs, merged surgically into a co-authored `.claude/settings.json`. One rule,
hand-wired, derived from no declaration. This milestone makes the frozen set a declaration and the hook
its compiled output, with attempted tampering surfaced as a coded event rather than quietly succeeding.

Two rules ride along because they are cheap now and expensive later. **Provenance is stamped at write
time** — a claim without a producing node, run and timestamp cannot be defended, and back-filling it
from transcripts is guesswork. And **anchor integrity**: raw human input is captured verbatim before
any classification is offered, because a feedback loop that presents a menu collects selections from
the menu rather than what the person meant. `aof:feedback` already does this by instinct; this makes it
a rule the arc cannot later undo.

**This milestone unlocks L3.** 53 ships the autonomy ladder with L3 declared and locked; unattended
self-driving is honest only once the measurements are anchored and the frozen rules are enforced.

## Scope

In scope:
- **The anchor taxonomy, declared** — external validation (observed process exit codes, the deployed
  build stamp, landed commits, live-soak observations), frozen rules, and exogenous human judgment.
- **An anchor edge per loop**, and the **groundedness report** — anchored / self-referential / stale —
  with ungrounded components named, promoted from a 52 finding to a first-class report.
- **Provenance stamped at write time** — `{producing node, run, commit, timestamp}` on recorded claims,
  so an anchor reading is defensible rather than asserted.
- **Anchor integrity** — raw capture before classification, as a rule the arc honours everywhere it
  collects human judgment.
- **The frozen set declared and compiled** into aof's existing enforcement points (merged
  `.claude/settings.json` permissions + hook entries, agent tool scope, the mesh worker envelope), with
  tampering recorded as a coded event.
- **L3 unlocked** on 53's ladder, gated on the Loop-Ready score and a green groundedness report.

Out of scope:
- **Counter-metrics and watchers** (57), **ownership and arbitration** (58), **the instrument audit**
  (59), **the acceptor** (61) — this milestone supplies the ground they all stand on.
- **A general policy engine.** A small declarative grammar compiled to the boundary aof already owns;
  Rego/Cedar is a later decision if that grammar provably outgrows itself.
- **Choosing what is worth controlling.** "Better" at the root is exogenous — the human's, permanently.

## Stories

<!-- Broken down 2026-08-26 (`aof:refine 55 --autonomous --solo`). The partition follows the
     call/dependency coupling `aof graph impact` reported on the 2026-08-26 build: four
     almost-disjoint module clusters, each with a single production door, and each cluster owned by
     exactly one story (ARCHITECTURE.md ADR-007). `src/work.mjs` is touched by none of them. -->

- [x] **[00 · The anchor taxonomy](stories/00_story_the-anchor-taxonomy/STORY.md)** — a `kind: anchor`
  node class and the widened `ground:` enum, added to two frozen sets that delete nothing; the
  framework's day-one anchors declared from evidence. *(owns `src/work-loops.mjs`)*
- [x] **[01 · The groundedness report](stories/01_story_the-groundedness-report/STORY.md)** — the
  grounding seed widens beyond exogenous, a loop with no anchor edge is named, an anchor whose
  authority no longer resolves reports **stale**, and the whole thing becomes a first-class `--json`
  face. *(owns `src/work-loops-checks.mjs` + the `loops-*` command faces)*
- [x] **[02 · Provenance at write time](stories/02_story_provenance-at-write-time/STORY.md)** — the
  frozen `{node, run, commit, at}` envelope stamped by one writer seam, injected into a pure
  compiler, with an unstamped claim refused rather than back-filled. *(owns the new stamper + its
  write sites)*
- [x] **[03 · Raw capture before classification](stories/03_story_raw-capture-before-classification/STORY.md)**
  — the verbatim human input written first and never rewritten, with classification a strictly later
  write; the rule made structural where today it is emphasis. *(owns the capture path)*
- [x] **[04 · The frozen set, compiled](stories/04_story_the-frozen-set-compiled/STORY.md)** — the
  frozen set as a reviewable declaration compiled into the enforcement boundary aof already owns,
  with the permissions merge made surgical first and tampering surfaced as a coded event. *(owns
  `src/claude-settings.mjs`)*
- [x] **[05 · L3 unlocked](stories/05_story_l3-unlocked/STORY.md)** — the rung 53 declared and locked,
  opened by a computed gate over the Loop-Ready score and a green groundedness report; no config key
  admits it. *(owns `src/work-loop.mjs`, `src/commands/loop.mjs`, `src/work-doctor-loop-ready.mjs`)*

Stories **00–04 are parallel-eligible from day one** — the schema and verdict literals they share are
frozen in `ARCHITECTURE.md` ADR-001/ADR-002, so no story waits on another's merge. **05 is terminal**:
its gate reads 00's taxonomy and 01's report, so it can be authored immediately and goes green last.

## Dependencies

- **52 (loop-registry-and-graph)** — anchors attach to declared loops; without the registry there is
  nothing to anchor and no component to compute a path from.
- **53 (loop-artifact)** — this milestone unlocks the L3 rung that 53 declares and locks, and the
  frozen set bounds what an unattended run may touch. The two are halves of one guarantee.
