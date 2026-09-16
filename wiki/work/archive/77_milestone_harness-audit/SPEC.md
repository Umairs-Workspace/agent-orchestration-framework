---
type: milestone
number: 77
slug: harness-audit
title: "Harness audit — doctor for the machine, not the record"
status: done
owner: product-owner
created: 2026-08-16
updated: 2026-09-03
depends: []
origin: [../../planning/RESEARCH-agent-loop-economics.md]
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 77 · Harness audit — doctor for the machine, not the record

## Objective

`aof work doctor` has **34 finding codes** and every one of them is about the *record*:
`control-unresolved`, `stale-parent`, `doc-over-budget`, `register-duplicate-id`,
`story-done-under-not-started`. Not one is about the **machine that produces the record**.

`aof work observe` covers the other half — but only what a transcript can see. That boundary is why
the 2026-08-16 research arc found things neither command could have:

| Finding | Cost | Why doctor missed it | Why observe missed it |
|---|---|---|---|
| `aof-qa` is told to `Edit` and has no `Edit` | **41.8% of m52's tokens** | not a record defect | not in a transcript |
| The design lane targets `work.ui.baseUrl`; config has no `work.ui` | every UI story → guaranteed `INCONCLUSIVE` | not a record defect | looks like a normal failed command |
| `run-store.heartbeat()` has zero callers | the 8-day zombie run | not a record defect | invisible — nothing ran |
| `dispatchReadySet` has no production caller | the bound is prose | not a record defect | invisible |
| The spawn passes no `--model`, `--effort`, or cache flag | 927k cache-create per spawn | not a record defect | the *effect* is visible; the cause is not |
| `TOOLCHAIN_RE` cannot match this repo's test commands | reported 0% where a retro said 33% | not a record defect | **observe is the thing that is wrong** |

Every one of those is a **static fact about the repo**, computable by code, with no model in the
loop. They were found by reading the prompt layer against the tool grants, the config, and the call
graph — which is a lint, not a research project. The last row is the argument in miniature: a
measurement layer cannot audit itself.

So this is doctor's sibling, not observe's successor, and the boundary is clean:

> **`aof work doctor` asks whether the documents are coherent.**
> **`aof work audit` asks whether the machine that produces them is sound.**

It reuses doctor's finding/severity/`--json` contract wholesale — same shape, different subject —
and it attaches findings to **loop ids** where the registry already declares them
(`wiki/work/loops/*.md` carries `controlled:`, `measurement:`, `actuator:`, `ceiling:`, which is
already the schema a harness finding wants).

The second half is the reason the research could say *"everyone else caps at 250 steps and $3"*: a
**versioned reference corpus** on disk. Re-searching thirty vendor docs per diagnosis is expensive
and non-reproducible; a `wiki/reference/harness-baselines.md` holding the defaults table with source
URLs and a `checked:` date turns "what does everyone else default to?" from a research task into a
**join** — deterministic, diffable, and reviewable in a PR.

## Scope

In scope:
- **`aof work audit [scope] [--json] [--strict]`** — a registered command on the CLI spine, with
  doctor's finding shape (code, severity, ref, message, evidence) and no model anywhere in it.
- **The rule set**, each with a code and a cited seam:
  - `agent-capability-gap` — an agent instructed to use a verb its `tools:` does not grant. Would
    have caught QA-told-to-`Edit`, the PO told to run `aof work memory recall` without `Bash`, and
    the designer told to judge a render it cannot produce.
  - `spawn-uncapped` — what flags actually reach the spawned runtime. Today the argv is
    `--permission-mode auto --append-system-prompt <…>` and nothing else.
  - `cache-prefix-unstable` — a static finding, not a measurement: worktree-per-story **and** no
    `--exclude-dynamic-system-prompt-sections` cannot share a prompt-cache prefix, by Claude Code's
    documented rule.
  - `prompt-config-unsatisfiable` — a prompt mandating a config key that does not exist, or a tool
    the repo's own memory records as blocked.
  - `seam-unwired` — an exported function with no non-test caller. The call graph is already built
    (`aof graph impact`) and is not used for this.
  - `loop-ceiling-uncapped` — **already exists** (`src/work-loops.mjs:299`) as a `warn` emitted only
    by `aof work loops validate` and gating nothing. Bring it under the audit and give it teeth.
  - `instruction-duplicated` — the same rule stated at N sites (four copies of the graph-grounding
    block, ~10 KB).
  - `hook-duplicated` — identical matcher blocks registered twice; a process spawn per tool call.
- **`wiki/reference/harness-baselines.md`** — the versioned corpus: each row a bound, its value, the
  system that ships it, a source URL and a `checked:` date. Audit joins aof's own config against it
  and reports where aof declares no bound at all.
- **A `--refresh-baselines` path** that re-verifies the corpus against its sources and reports drift.
  Run rarely and deliberately; never on the audit path.
- **CI-runnable.** `--strict` fails the build, so a regression is caught at the commit that causes
  it rather than in the next quarter's research.

Out of scope:
- **The measurement half** — story/phase-scoped observe, ingested cost, append-only snapshots, the
  toolchain classifier — is milestone **68**. Audit reads static facts; 68 fixes the numbers.
- **`/aof:diagnose`, the model-driven synthesis.** The layer that reads audit + observe JSON and
  writes the argument is real and wanted, but it depends on both halves being trustworthy first. It
  is its own arc, and it should be scheduled **after** 68 and this milestone, not alongside them.
- **Acting on the findings.** Audit reports; the fixes live in 69–72, 73, 74 and 75. A rule here that
  cannot be pointed at an existing item is a rule that has nowhere to go.
- **Auditing downstream project repos.** The bundle ships to client projects and the rules should
  eventually run there, but the first target is aof's own harness, where the evidence is.

## Stories

Broken down 2026-09-03. The landing order is **{00 ‖ 01 ‖ 02 ‖ 03 ‖ 04} → {05}** — five stage-1
stories with no edge between them, then one stage-2 story that composes them. The partition is
`ARCHITECTURE.md#ADR-010`, drawn on the codebase graph built at the decision point (14,732 nodes /
35,911 edges, egress `none`, `builtAt 2026-09-03T02:46:14.389Z`).

**Three of this SPEC's eight rules were dropped on evidence at refine, and the scope list above is
left as written; this note and `ARCHITECTURE.md#ADR-009` are the amendment.** `spawn-uncapped` and
`cache-prefix-unstable` would re-derive green gates that already exist (`69/FF-6905`, `70/FF-7004`),
and `prompt-config-unsatisfiable`'s flagship subject — the design lane targeting an undeclared
`work.ui.baseUrl` — was closed by milestone 71, with a bounded re-sweep of every `work.*` key
referenced by a prompt finding no replacement. `RESEARCH.md` carries the measurement for each.

**A second amendment, larger than the first: the SPEC's opening premise is stale.** *"A registered
command on the CLI spine, with doctor's finding shape"* was **already delivered by milestone 59** —
`aof work audit` exists, with three lanes and 26 finding codes. 77 is therefore a **rule-family
addition to an existing lane registry**, not a new command, and its thesis narrowed accordingly
(`ARCHITECTURE.md#ADR-001`): three of the five surviving rules have their repo-local instance already
gated bespoke, and what 77 builds is the **travelling** form that runs wherever the bundle is
installed. Two corrections of fact fall out of the same pass: loop records live in `.aof/loops/*.md`
(installed from `src/bundle/loops/`), not `wiki/work/loops/*.md`; and the reference corpus ships as
`src/harness-reference.mjs` rather than `wiki/reference/harness-baselines.md`, because the payload
carries no `wiki/` and a corpus under it could not travel (`ARCHITECTURE.md#ADR-007`).

- [x] `00_story_the-prompt-layer` — a pure lane over the installed prompt layer emitting `audit-agent-capability-gap` and `audit-instruction-duplicated`; it under-reports by construction and states its own blindness on every run.
- [x] `01_story_the-hook-wiring` — a pure lane over an injected settings object emitting `audit-hook-duplicated`; it detects and does not repair, and `72/ADR-005 §3`'s refusal to change the merge rule stands.
- [x] `02_story_the-seam-liveness` — a pure lane that reads the graph artifact through the shipped readers, emits `audit-seam-unwired`, and turns every unknown into a stated limit rather than a clean seam.
- [x] `03_story_the-reference-corpus` — the reference corpus, the bounds join (`audit-bound-undeclared` / `audit-bound-off-reference` / `audit-reference-stale`), and a hand-run refresh program reachable from no CLI door.
- [x] `04_story_the-two-roots` — the audit's own child programs resolve against the TOOLKIT root rather than the audited one, so the command runs in a governed project at all; closes `TECH_DEBT` items 72 and 70.
- [x] `05_story_the-lanes-are-registered` — the four lanes join `REPORT_LANES` with their ctx keys, codes disjoint from doctor's, floors and limits asserted from the registry.

## Dependencies

None. This is deliberate and worth stating: **the audit half does not wait on telemetry.** Every rule
above is a static fact about files already on disk, which is what makes this the cheapest item in the
arc and the one that keeps the rest of it honest.
