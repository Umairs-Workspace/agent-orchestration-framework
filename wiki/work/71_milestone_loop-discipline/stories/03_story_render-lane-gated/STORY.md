---
type: story
number: 03
slug: render-lane-gated
title: "The render lane is gated on renderability — and this milestone supersedes 07's `npx playwright` clause"
parent: 71
status: done
owner: product-owner
created: 2026-09-01
updated: 2026-09-03
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/71_milestone_loop-discipline/ARCHITECTURE.md#ADR-005, wiki/work/71_milestone_loop-discipline/ARCHITECTURE.md#ADR-008, wiki/work/07_milestone_design-conformance/ARCHITECTURE.md#ADR-002, src/bundle/commands/continue.md, src/bundle/commands/verify.md, src/bundle/agents/aof-designer.md, src/bundle/agents/aof-qa.md, test/arch/acd-conformance-verdict-contract.test.mjs, test/arch/acd-design-conformance-bundled.test.mjs, package.json, scripts/test.mjs, test/arch/acd-design-role-split.test.mjs, schemas/aof.schema.json]
files: [src/bundle/commands/continue.md, src/bundle/commands/verify.md, src/bundle/manifest.json, test/arch/acd-render-lane-is-gated.test.mjs, test/arch/acd-conformance-verdict-contract.test.mjs, test/arch/acd-design-conformance-bundled.test.mjs, scripts/test.mjs, test/arch/acd-design-role-split.test.mjs, schemas/aof.schema.json, .claude/commands/aof/continue.md, .codex/skills/aof-continue/SKILL.md, .opencode/commands/aof/continue.md, .claude/commands/aof/verify.md, .codex/skills/aof-verify/SKILL.md, .opencode/commands/aof/verify.md]
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 03 · The render lane is gated on renderability — and this milestone supersedes 07's `npx playwright` clause

## User story

As the operator of a UI story whose design lane cannot possibly render,
I want the render precondition checked before anything is spawned, and the render itself driven
through a renderer that actually works here,
so that a design conformance pass either produces a judgeable screenshot or costs one recorded line —
never three breakpoints of failed invocations plus two agent spawns to reach a verdict the config
had already determined.

## Why

The design lane cannot succeed in this repository, and the prompt layer never checks before paying
for it.

- `continue.md:234` and `verify.md:100` mandate `npx playwright screenshot`, which this repo's own
  records show is **policy-blocked** here — corroborated by seven artefacts that route around it via
  the cached `ms-playwright` Chromium instead, a path no prompt states.
- The base URL is read from `work.ui.baseUrl`, and `.aof/aof.config.json` has **no `work.ui` key** at
  all. So the outcome is decided before the lane starts.
- There is **no renderability precondition anywhere in the layer**, and `continue.md:134` forbids the
  cheap exit — so every UI story burns three breakpoints × N surfaces of failed invocations plus two
  agent spawns to arrive at an `INCONCLUSIVE`.

The lane itself is worth keeping: it catches real design gaps at build time, far cheaper than at the
`aof:verify` gate or a cross-milestone UAT. **This is a gate, not a deletion** — `STATE.md` says so
in as many words.

## Tasks

- [x] `tasks/00_renderability-is-checked-before-any-spawn.feature` — the precondition (a resolvable
      base URL and a resolvable renderer) is evaluated first; a failed precondition records the reason
      and skips, spawning nothing.
- [x] `tasks/01_the-render-runs-through-the-cached-chromium.feature` — the render invocation is the
      cached-Chromium form, and this milestone's contract states that it supersedes 07's clause.

## Notes

- **The delivered milestone-07 `.feature` files are IMMUTABLE and are not touched** — not edited, not
  annotated, not tagged. The clause this story supersedes is stated at
  `wiki/work/07_milestone_design-conformance/stories/02_story_review-wiring-and-convention/tasks/01_review-renders-and-judges.feature:25`
  and `.../tasks/03_conformance-loop-bundled.feature:49-50,76`. The superseding rule is stated in
  **71's own contract**, and no file under `wiki/work/07_*` appears in this story's `files:`.
- **The arch tests are code and may change.** `acd-conformance-verdict-contract.test.mjs` and
  `acd-design-conformance-bundled.test.mjs` are amended in place to assert 71's rule. `07/ADR-002`'s
  untouched leg — Playwright absent from `package.json` `dependencies`/`devDependencies` — stays
  enforced.
- **The ban is on the render INVOCATION only.** `aof-qa.md`'s Playwright harness, the
  `toHaveScreenshot` visual regression and the axe-core a11y lane are QA's own lane and stay exactly
  as they are; the control must not be satisfiable by deleting design conformance.
- The three verdict tokens `CONFORMS` / `GAPS` / `INCONCLUSIVE` are 07's closed set and are not
  widened here.
- **There are THREE guards on the `npx playwright` clause, not two** (ADR-009 §5):
  `acd-conformance-verdict-contract.test.mjs`, `acd-design-conformance-bundled.test.mjs`, and
  `acd-design-role-split.test.mjs:91`. All three are in `files:`. Their surviving legs — including
  `acd-conformance-verdict-contract.test.mjs:55-68`'s three Verdict literals and
  `acd-design-role-split.test.mjs:68,92-97` — must stay enforced, so the supersession cannot be
  satisfied by deletion.
- **The invocation carries the breakpoint width** (ADR-009 §C): `--window-size=<W>,<H>`. Dropping it
  would be a silent regression in a delivered contract wearing a mechanism swap's clothes.
- **"Resolvable renderer" means exists-and-executable, checked at the precondition** (ADR-009 §D), and
  **discovery globs rather than templates** — the cache layout is not stable
  (`chromium-1169/1181/1187 → chrome-win/`, `chromium-1200…1234 → chrome-win64/`, plus
  `chromium_headless_shell-<rev>`). A declared-but-broken binary is the precondition's finding, named
  with the path that failed.
- **`work.ui` is `additionalProperties: false`** in `schemas/aof.schema.json` with exactly
  `{baseUrl, a11y}` — so `work.ui.renderer` cannot be declared without editing the schema, which is
  why it is in `files:`. ADR-005 §3's contrary claim is superseded by ADR-009 §4.
