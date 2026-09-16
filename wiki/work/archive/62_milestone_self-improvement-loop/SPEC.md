---
type: milestone
number: 62
slug: self-improvement-loop
title: "The self-improvement loop — `aof work tune`, proposals that must earn their commit"
status: done
owner: product-owner
created: 2026-08-13
updated: 2026-09-01
depends: [53, 61]
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
# 62 · The self-improvement loop

## Objective

aof accumulates the raw material for its own improvement and consumes none of it. `aof work observe`
produces per-agent traces — time, tokens, stalls, the edit↔test rhythm, the grind. Retrospectives
distil lessons into memory. The run store holds lineage, attempts and failure classes. Nothing turns
any of it into a **harness change**; the hill-climbing loop is open at exactly the point where it would
close.

**This milestone closes it.** `aof work tune [scope]` reads the accumulated traces, retrospectives and
run lineage, and emits **harness-change proposals**: role-model reallocations, cap adjustments,
prompt and brief revisions, story-sizing hints. Each proposal is attempt- and trace-evidenced — it
names the measured grind or the recurring finding class it answers — because a harness change that
cannot point at run evidence is a guess with a changelog entry.

Crucially, this milestone is deliberately sequenced **after** the acceptor, not before it. Proposals
are cheap and safe; committing them is neither. At L2 a proposal is written as a diff a human accepts.
Auto-apply exists only through 61's acceptor, only outside 55's frozen set, and only with every
application logged to the run store and reversible. This ordering is the single most consequential
decision taken when the loop and graph PRDs were shattered together: the arc that generates changes
ships after the arc that decides when a change may be believed.

## Scope

In scope:
- **`aof work tune [scope] --json`** — the analysis pass over `aof work observe` traces, `RETROSPECTIVE`
  lessons and run-store lineage, registered as a command with a stable contract.
- **Harness-change proposals** — role-model reallocation, cap adjustment, prompt/brief revision, story
  sizing — each carrying the run evidence that motivates it.
- **L2: the human-accepted diff** — proposals written as a review surface, applied through the existing
  `work.agents.models` / bundle machinery.
- **Auto-apply strictly through 61's acceptor**, bounded by 55's frozen set, logged to the run store,
  and reversible.
- **Proposal provenance** — which traces, which runs, which findings produced this proposal.

Out of scope:
- **The acceptance rule** — 61 owns it; this milestone may not carry its own weaker one.
- **Tuning standards.** The locked contract, litmus, tag vocabulary and gate semantics are frozen; this
  loop tunes economics and cadence only.
- **Authoring root references.** What is worth controlling stays exogenous.
- **Trace collection and telemetry economics** — `PRD-acd-loop-performance.md` and the shipped
  `aof work observe`; this milestone consumes them.

## Stories

<!-- Populated at break-down (`aof:refine 62`). -->

Stage 1 is FIVE independent leaves with no edge between them; stage 2 is the single convergence.
The partition and its graph-derived coupling are `ARCHITECTURE.md#ADR-010`.

- [x] **00 · the corpus and its floor** — three declared lanes over the material that exists (392
  lesson sections, 61 run records, 8 observability snapshots), each read through the home that already
  owns its source, and a lane that read nothing reported as a finding rather than a zero. *Stage 1.*
- [x] **01 · the proposal, its lane and its patch** — the proposal object: a lane computed from the
  registry's own `parameter-tuning:` edge, a patch only where a complete before→after is computable,
  and an applier only where the command registry answers for it. *Stage 1.*
- [x] **02 · provenance that resolves** — which traces, which runs, which findings, as citations
  checked against disk at emit time through the two grammars this repository already owns; an
  unresolvable citation demotes its proposal to a finding. *Stage 1.*
- [x] **03 · the distance to a live proposal** — for every proposal, what stands between it and a
  commit: 61's own refusal removals, plus 62's two measured prerequisite limbs, each derived from a
  probe over the tree and shrink-only. *Stage 1.*
- [x] **05 · candidate formation** — the rule that turns lane records into candidates: it clusters,
  carries every source behind each cluster, and attaches the citations and target the downstream leaves
  need. Numbered last, built at stage 1. *Stage 1.*
- [x] **04 · the tuner's face** — one registered command whose bare face is a read; it composes the
  four leaves, obtains the tunable lane's verdict by invoking `work:acceptor`, and writes nothing.
  *Stage 2, depends on 00, 01, 02, 03 and 05.*

## Dependencies

- **61 (disciplined-acceptor)** — nothing this milestone proposes may auto-apply except through that
  gate. Shipping the proposer first and the acceptor later is precisely the configuration the
  self-evolving-agent literature measures failing, which is why the order is inverted here relative to
  the loop PRD's original sequencing.
- **53 (loop-artifact)** — proposals apply to the loop the shell drives, and the autonomy level at which
  a run executes is the shell's declared state.
