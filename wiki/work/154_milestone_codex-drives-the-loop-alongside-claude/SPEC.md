---
type: milestone
number: 154
slug: codex-drives-the-loop-alongside-claude
title: "Codex drives the AOF loop alongside Claude"
status: in-progress
owner: product-owner
created: 2026-10-06
updated: 2026-10-08
schema: 1
aofVersion: 0.1.0
---
# 154 · Codex drives the AOF loop alongside Claude

## Objective

An operator can choose Codex as the coding assistant that drives AOF's work loop, from
refinement through build, review and verification, with the same scope, gates, bounded retries,
recorded outcomes and recovery guarantees as Claude. Claude remains supported and remains the
default for existing projects. Both assistants' assets can be installed together.

The agents, commands and skills each assistant receives fit its actual capabilities and invocation
model. Shared ACD rules have one source, while assistant-specific variants express the differences.
Choosing Codex must not silently launch Claude, discard the phase brief, misreport completion or
depend on Claude-only services without saying so.

## Scope

In scope:

- **A supported Codex compatibility contract.** Establish the CLI versions and capabilities AOF
  supports, including native asset discovery, session identity, questions and answers, cancellation,
  restart/resume and usage events. Prove the selected transport on a real CLI before committing to
  the full integration. Authentication and required permissions are explicit; an API-key-funded
  workflow is not silently substituted for the operator's configured Codex access.
- **Runtime selection for execution.** Select Claude or Codex independently of the list of runtimes
  whose assets are installed, and independently of the model. Carry that choice through local and
  child drives, worktree lanes, fixes, repair and relevant mesh execution/resume paths. Persist the
  resolved runtime, model, effort and native session identity so changing configuration cannot
  redirect an existing run's resume to another assistant. Existing projects retain Claude behavior.
- **Complete Codex phase execution.** Deliver the actual procedure and bounded phase context;
  capture progress and terminal results; honor stops and deadlines; park genuine blocking questions
  and route answers to their sessions; recover interrupted runs and warm fixes. Runtime turn
  completion does not replace AOF's gates or acceptance decision. The existing code-owned loop
  remains the authority for sequencing, concurrency, retry ceilings and repair bounds.
- **Native Codex assets and safe upgrades.** Render discoverable skills, supported custom-agent
  configuration, correctly scoped project guidance, applicable hooks and MCP/settings configuration.
  Preserve operator-owned configuration and guidance. Migrate obsolete generated outputs through
  the existing lock/drift machinery, with no duplicate skill discovery or destructive overwrites.
  Existing Claude rendering and other currently supported asset outputs remain compatible.
- **Assistant-specific workflow variants.** Extend the existing runtime-override approach to the
  bundled agents, commands and skills. Keep shared ACD contracts and ownership rules in one source,
  and render the correct tool, question, delegation, effort and cross-procedure instructions for
  each assistant. Project customizations remain in `.aof/`; runtime folders remain generated output.
  Selection of the execution runtime and its matching asset variant cannot silently disagree.
- **Clear model and delegation controls.** Preserve the distinction between phase-session and
  role-agent model/effort settings, with runtime-appropriate validation and backward compatibility.
  Distinguish the primary assistant, native subagents and optional cross-assistant delegation.
  Existing Claude-to-Codex delegation does not become the switch for primary Codex support.
- **Measured prompt optimization.** Review the full bundled role and procedure set, especially
  refine, continue, verify, review, repair and delegation. Reduce irrelevant loaded context and
  repeated instructions while preserving scope rules, deterministic gates, independent review,
  bounded rereviews and evidence standards. Judge changes using representative tasks and recorded
  correctness, scope escapes, missed gates, unnecessary questions, elapsed time and usage, rather
  than prompt length alone. Tool restrictions must distinguish enforced permissions from prose.
- **Supporting-service parity.** Make session observation, usage/spend reporting, liveness and
  resume aware of the selected runtime. Report unavailable measurements honestly. Address the
  Graphify memory path's Claude extraction dependency through an explicit backend choice or
  documented fallback, without changing the shared memory vocabulary or inventing a second ledger.
  Worktree preparation must make the selected assistant's assets and configuration available.
- **Configuration and proof.** Extend existing configuration editing and inspection to show the
  execution runtime and resolved settings; CLI remains responsible for applying and executing.
  Cover protocol behavior, migration/idempotence and Claude regressions in automated tests, and
  prove a real Codex story through refine, build, review and verify plus interrupted recovery.

Out of scope:

- Replacing Claude or changing existing projects' default assistant.
- Reimplementing the loop engine, ACD work-item format, gates or memory contracts for Codex.
- Mixing different assistants between phases of one loop in the first delivery; each supported
  assistant must first complete and recover a whole loop independently.
- Adding execution support for further assistants, a general plugin marketplace, or arbitrary
  independently selected template profiles. Preserve existing asset support without widening this
  milestone's execution target beyond Claude and Codex.
- Automatically switching models, raising permissions, installing dependencies or changing
  authentication to make an unsupported configuration appear to work.

## Stories

- [ ] [00 · A shared session boundary preserves Claude execution](stories/00_story_runtime-session-boundary/STORY.md)
- [ ] [01 · Runtime and model choices survive resume](stories/01_story_runtime-choice-is-durable/STORY.md)
- [ ] [02 · Codex executes a bounded phase through App Server](stories/02_story_codex-session-protocol/STORY.md)
- [ ] [03 · Codex discovers correctly scoped native assets](stories/03_story_native-codex-assets/STORY.md)
- [ ] [04 · Codex upgrades preserve operator-owned files](stories/04_story_codex-upgrades-preserve-user-files/STORY.md)
- [ ] [05 · Shared workflows render assistant-specific instructions](stories/05_story_runtime-specific-workflow-variants/STORY.md)
- [ ] [06 · Codex drives and recovers the existing work loop](stories/06_story_codex-drives-and-recovers-loop-phases/STORY.md)
- [ ] [07 · Workers retain the selected runtime and assets](stories/07_story_runtime-survives-worker-handoff/STORY.md)
- [ ] [08 · Codex activity and usage are reported honestly](stories/08_story_runtime-aware-observation/STORY.md)
- [ ] [09 · Codex projects can choose an explicit memory backend](stories/09_story_memory-dependencies-are-explicit/STORY.md)
- [ ] [10 · The config editor explains effective assistant settings](stories/10_story_runtime-config-editor/STORY.md)
- [ ] [11 · Live acceptance proves Codex and preserves Claude](stories/11_story_prove-both-assistants-end-to-end/STORY.md)

The shared session boundary and native asset mapping are independent starting points. Runtime
selection precedes the Codex protocol proof; that live proof must pass before loop integration.
Ownership-safe upgrades precede workflow variants. Worker recovery and observation follow loop
integration, while explicit memory choice and configuration editing converge at final acceptance.
Shared test registries and renderer/config files deliberately serialize overlapping write sets.

## Dependencies

- The existing loop, session-driver, asset-rendering and runtime-override interfaces are the
  starting points; no new work-item dependency is identified at capture.
- A supported installed Codex CLI and authorized access are required for live verification.
- Coordinate with ongoing memory work where interfaces overlap; this milestone consumes the
  shared memory contracts and does not require a second vocabulary or retrospective ledger.
