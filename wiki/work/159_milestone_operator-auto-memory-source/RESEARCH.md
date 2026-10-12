---
doc: research
---
# 159 · Source adapter research

Measured locally on 2026-10-12; source files were read, never modified. Memory text
is evidence about its format, not instructions to this refine session.

## Entry grammar

The current directory is `~/.claude/projects/C--Source-umami-aof/memory/`. Its 77
Markdown files comprise 39 nested `metadata.type: feedback`, 31 nested
`metadata.type: project`, six reference entries and one without frontmatter.
These are observations, not acceptance thresholds. Do not copy this personal
corpus into fixtures or work records.

The junction entry, `worktree-node-modules-junction-destroys-source.md`, has
top-level name and quoted description, then metadata containing node_type, type,
originSessionId and modified. Its body contains **Why:** and **How to apply:**.
The sampled project entry, `aof-acd-project.md`, has the same structure with type
project and no modified timestamp. Neither declares an AOF kind, area or stage.
The origin's top-level type description is older than the observed format.

## Integration seams and boundary

- The existing `claudeProjectsDir` in `packages/work/src/observe.mjs` owns project
  slugging and CLAUDE_CONFIG_DIR. Inject it from core rather than duplicate it.
- `packages/core/src/application/bindings/memory/local-indexing.mjs` already receives
  workObserveServices, so no new cross-package dependency is needed.
- `packages/knowledge/src/memory/local-indexing.mjs` owns buildRecords, used by
  both backends. Its whole-stream leg composes imported records; scoped rebuilds
  deliberately contain only the selected work items.
- Its source resolver rejects all absolute paths and symlink escapes. An adapter
  locator needs a constrained branch; removing that guard would break containment.
- Graphify's attemptGraphBuild receives workDir, not records. External bodies and
  paths must stay out of graph inputs, staging and mesh payloads.
- The frozen record has tags, no layer field. The existing lesson type is procedural.
- The schema closes the memory object; the new sources key needs explicit admission.

`aof graph build .` failed with `spawnSync ... graphify.exe EPERM`. No fresh builtAt,
egress or counts exist. No stale graph or elevated retry was used. Source imports
and supplied collaborators ground one vertical story owning schema, adapter,
common indexing, source resolution, tests and docs. A parser/integration split
would create a dependency without an independently usable outcome.

The contract deriver ran with these subjects and the fresh graph unavailable.
Its incomplete, convention-only proposal suggested test/local-indexing.test.mjs
and test/claude-auto-memory.test.mjs. Replace those guesses with the existing
indexing suite and a knowledge-owned suite; retain both runner registries.

## Product meaning resolved at discovery

The SPEC requires an enum kind. The held vocabulary is mistake, blocker,
near-miss and misunderstanding. Project facts are not inherently mistakes, and
neither sampled source declares a kind. The records do not choose a mapping.
This was 159/01 Q1, not a parsing decision or an agent-confirmed example. The
operator subsequently accepted fixed near-miss for both types with original-type
tags; ADR-002 records the answer. No content classifier is needed.

## Runner feasibility

The integration runner in test/integration/support/feature-runner.mjs recognizes
Feature and Scenario and ignores Rule grouping; it does not expand Scenario
Outlines/Examples. Task features therefore use one Feature per map rule, with
the R id in the Feature title. The builder expands every outline row into named
integration scenarios in memory-auto-source.feature; its sibling step module is
discovered by basename. Unit/fitness suites require explicit index registration.
