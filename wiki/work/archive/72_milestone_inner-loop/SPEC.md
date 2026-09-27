---
type: milestone
number: 72
slug: inner-loop
title: "The inner loop — the tools an agent grinds against"
status: done
owner: product-owner
created: 2026-08-16
updated: 2026-09-03
depends: [68]
origin: [../../planning/PRD-acd-loop-performance.md, ../../planning/RESEARCH-agent-loop-economics.md]
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context.
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 72 · The inner loop — the tools an agent grinds against

## Objective

**The single largest token line item in the corpus is caused by a missing entry in a tool list.**
`aof-qa.md:6` grants `Read, Grep, Glob, Bash, Write` — **no `Edit`** — while `aof-qa.md:31` orders
*"Author features with `Write`/`Edit` — NEVER a script you wrote to edit them"* and names the
consequence itself: *"the turn count (and token cost) rises several-fold for the same deliverable."*
To change three rows of a 25,451-byte `.feature`, QA must re-emit the whole file. Telemetry shows it
collapsing into the forbidden path — one delta run wrote `scratchpad/apply.mjs`, `align.mjs`,
`final.mjs`, `edits.txt` and re-ran a node script five times for 74.6k output tokens. Thirteen such
runs are **661.6k tokens, 41.8% of milestone 52**.

Around it sits a cluster of inner-loop costs that share one shape: **an instruction with no
mechanism behind it.**

- **Selective testing is a per-agent chore.** `.claude/rules/build-deploy-restart.md:153` says
  *"never run the full suite on this machine — run focused suites via test-array imports instead."*
  There is no command that does that. So each agent hand-writes a throwaway `.mjs` importing the
  arrays it wants, which is why **805 of 4,950 write events are scratchpad files** and why the same
  throwaway command was re-run 33×, 31×, 30×, 26×, 26×, 23×. And because those commands are
  `AOF_GLOBAL_HOME=… node …` rather than `npm test`, the observability classifier scores them as
  `"bash"` and reports **zero** toolchain grind.
- **The suite itself is the worst case for this.** 734 `*.test.mjs` files; `scripts/test.mjs` is
  275,100 B with **728 static imports** assembling 700 suites, run **strictly serially** —
  `Promise.all`: 0, `.only`: 0, argv filters: 0. Measured: full suite **~7.5–8 min**;
  `scripts/check.mjs` **≥10 min**.
- **Every worktree throws its dependencies away.** Clone is a full `git clone` with no `--depth` or
  `--filter` (`src/mesh-worker-execution.mjs:776`); nothing in the runtime installs dependencies, so
  the agent pays `npm install` on its own tokens; and `removeWorktree(…, { force: true })` (`:1785`)
  deletes `node_modules` on every completion. The next story pays it again.
- **Editing without checking is the dominant grind mode.** Interleave patterns across 125 runs:
  **write-first 112, batched 10, tight fix-test loop 3**, at **18.0 edits per verified run**. Worst
  case, `Build story 49/05`: **199 edits against 1 test run**, one file edited 70×, 65 error-ish
  results. **10.0% of all tool calls in the corpus return an error.**
- **Documents are thrashed as hard as code.** 3.71× write amplification; `ARCHITECTURE.md` rewritten
  **150 times** in milestone 66 while sitting at exactly its 700-line budget — a budget that is a
  `warn` (`src/work-doctor-budget.mjs:40-62`) nothing enforces.
- **Hooks are registered twice.** `SessionStart`, `UserPromptSubmit` and `SessionEnd` each have two
  identical matcher blocks (`.claude/settings.json:3-63`), so `aof session ping` shells **twice on
  every user turn** — each a cold Node boot through `src/cli.mjs`, which statically imports 64 KB of
  `work.mjs` and a 76-import `command-core.mjs`. Add a `PreToolUse` boot on every `Bash` call.

The published wins here are large and well-measured. Google TAP: distance-based test filtering ran
**50% of affected tests for a 55% resource saving with no missed breakages**. Meta: **~⅓ of tests,
>99.9% of regressions caught**, *"doubled the efficiency of our testing infrastructure."*
SWE-agent: a **pre-apply lint/typecheck gate on edits was worth 3 SWE-bench points** — it makes the
agent better, not merely cheaper. pnpm's global virtual store names git worktrees as its target use
case: *"each worktree gets a nearly free `node_modules`."*

**One honest correction.** The PRD calls targeted test execution its *"highest-confidence, cheapest
win"* on the strength of a 46%-of-active-time figure from milestone 346. In **this** repo the
measured toolchain share is ~6% and all-tool wait is 15.9%, because model generation is **84.1%** of
agent-active time. The lever is still worth pulling — it removes the scratchpad chore, the grind
storms and the error rate — but it is not the headline, and the reason it looked like the headline
is a broken classifier reporting zero while a hand-written retro reported 33%.

## Scope

In scope:
- **Targeted test execution as a first-class command.** `aof test --scope impacted|file|all` over
  the existing test-array registry, so selective testing is a tool rather than a chore each agent
  re-implements. Full suite once at the gate.
- **Tool-output filtering at the boundary.** A `PreToolUse` hook that rewrites test/build commands
  to failures-only output — the pattern Anthropic ships, *"reducing context from tens of thousands
  of tokens to hundreds."*
- **A pre-apply validation gate on edits.** Lint/typecheck the proposed content and reject before
  write, per SWE-agent's measured +3 points.
- **A write-thrash guard.** Reject or flag the Nth write to the same path within one run; make the
  doc-line budget bind rather than warn.
- **Worktree dependency reuse.** Stop discarding `node_modules` on completion; a shared store or a
  warm pool, whichever the toolchain here supports.
- **De-duplicated hooks and a lazy path for the session verbs**, so a hook is not a full CLI boot.

Out of scope:
- **The `Edit` grant for `aof-qa` and `aof-product-owner`** — pulled out to **chore 76**, which lands
  on the lifecycle change set's timescale rather than this milestone's. It is two frontmatter words
  and the largest measured token saving in the corpus; waiting for a `not-started` milestone to be
  refined would ship a known regression in the meantime. This milestone still owns everything the
  grant does not fix — the write-thrash guard, the doc budget that binds, the pre-apply edit gate.
- **Parallelising or restructuring the test suite itself.** Real (734 files, strictly serial, 8
  minutes) but it is aof's own project debt, not framework capability. Track in `TECH_DEBT.md`.
- **Remote build caches** (Turborepo/Nx/Bazel). Measured elsewhere at ~50% task-duration reduction,
  but the gains are a function of change locality and the ~10 s cache-server startup can dominate
  short tasks. Revisit once 68 can price it.
- **Predictive/ML test selection.** Deterministic impact selection first; a model over it is a
  later question.
- **Context and cache work** — milestone 70. **Loop caps** — 69 and 71.

## Stories

Broken down 2026-09-02. The landing order is **{00 ‖ 01 ‖ 03} → {02 ‖ 04}** — three stage-1 stories
with no edge between them, then two stage-2 stories that are parallel with each other. The partition
is `ARCHITECTURE.md#ADR-008`, drawn on the codebase graph built at the decision point (14,551 nodes /
35,577 edges, egress none, `builtAt 2026-09-02T18:25:21Z`).

**Two of this SPEC's six levers were declined on evidence at refine** — the pre-apply edit gate and
the blocking write-thrash guard. `ARCHITECTURE.md#ADR-006` records why and `TECH_DEBT.md` item 87
carries the measurement that would re-decide each. The scope list above is left as written; this note
is the amendment.

- [x] `00_story_the-declared-toolchain` — the test runner is something the project DECLARES, resolved by one module and launched through one bounded seam; no program name is spelled in `src/`, and an absent declaration is a coded refusal rather than a guessed `npm test`.
- [x] `01_story_the-selection` — changed files to suite files through the shipped code graph, read and never built, where every unknown WIDENS to the whole suite and is named; no flag suppresses a widening.
- [x] `02_story_the-test-commands-face` — `aof test --scope impacted|file|all`: one registered command composing 00 and 01, failures-only by default, carrying `gate: false` and consumed by no door.
- [x] `03_story_the-cold-boot` — a session verb stops loading the 88-module command registry, and this repo's three duplicate hook blocks go without changing the framework merge rule that carried them.
- [x] `04_story_the-prepared-worktree` — a worktree is handed its dependencies once through the declared program; nothing is ever linked into one, and no worktree is deleted by filesystem call.

## Dependencies

- **68 (loop-telemetry)** — every claim in this milestone's objective is a number the current
  observability layer either mis-reports or cannot see. Fixing the classifier is 68's job; acting on
  what it then shows is this one's.
