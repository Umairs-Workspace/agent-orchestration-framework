---
doc: state
---
# 154 · Codex drives the AOF loop alongside Claude — State

## Progress

- Captured on 2026-10-06 from the operator-requested codebase assessment and scheduled for the stream.
- Fully refined autonomously on 2026-10-06 using aof-refine in its configured/default solo mode.
  The main session performed PO, architecture, QA and feasibility passes; no role agents were spawned.
- Produced 12 stories, 28 task features and 89 scenarios/outlines (78 executable, 11 manual), with
  143 outline example rows. Every story has explicit read/write ownership, dependencies, a proposed
  example map and an advisory build plan.
- Research, eight accepted ADRs, security analysis, configuration UI design and the session-boundary
  diagram are authored. Six fitness controls are declared pending in the runnable test tree.
- Implementation has not begun. First ready wave: 154/00 (session boundary) and 154/03 (native assets).

## Refinement decisions

- Use one shared session boundary, wrapping current Claude behavior; Codex uses versioned App Server
  stdio. Installed CLI 0.130.0 is a candidate, not yet a supported profile: story 02 owes live
  capability proof before story 06 integrates it into the loop.
- Resolve execution separately from installed assets and delegation. Existing projects default to
  Claude; runtime-scoped phase/role models and effort retain provenance on durable execution records.
- Pending business questions survive transport interruption in the existing ask store. Permissions
  are separate and never auto-approved; ambiguous answer delivery is reconciled or halted.
- Render Codex-native assets with ownership-aware migration; runtime selects matching variants over
  shared workflow contracts, then project overrides apply. No free-form template-profile selector.
- Memory extraction choice is explicit; no invented Codex Graphify provider or silent fallback.
- No mock or alternate design direction was supplied. Existing config styling plus DESIGN's binding
  checklist is the documented UI baseline. There are no unanswered business-rule questions, no
  deferred story contracts, and no fabricated confirmed examples; map examples remain proposed.
- Architect and PO memory recalls ran. Architecture honoured native identity, capability honesty
  and freshness lessons; PO recall returned no content. Neither recall surfaced a near-miss.
- Fresh root graph build failed in the restricted process environment, then its authorized retry
  timed out after 120 seconds. No fresh graph was available and no stale artifact was used. The
  shipped story-contract deriver reported incomplete proposals with graph unavailable; subject
  citations, direct source imports and actual owning suites supplied the fallback. Generic root
  test guesses were removed in favour of workspace suites. Shared-file overlaps remain explicit.
- Diagram-design used the configured AOF style and a static component view. Its HTML self-check and
  AOF SVG/PNG export passed; the PNG was visually inspected. The export embeds SVG typography;
  system sans/mono fallbacks keep it readable when the optional web fonts are unavailable.

## Notes & decisions in flight

- Preserve Claude functionality and its existing default. The operator requested Codex support for
  the loop and relevant surrounding services, including optimized agents, commands and skills with
  assistant-specific templates where appropriate.
- Initial inspection found the local phase driver directly calling `driveInteractiveClaudeSession`
  in `packages/work-loop/src/commands/drive.mjs`. Its phase command and transcript/resume handling
  are Claude-specific. The separate Codex branch in `packages/execution/src/session-driver.mjs`
  omits the procedure/context and parses streamed stdout as one JSON document.
- Read-only probes against installed `codex-cli 0.130.0` confirmed that the existing
  `codex exec --ask-for-approval never` flag placement is rejected. An in-memory render confirmed
  Markdown Codex agents that omit model/effort settings and a `src` rule emitted beneath
  `.codex/src/AGENTS.md` rather than the actual project hierarchy.
- `packages/core/src/model.mjs` already merges per-runtime resource overrides. The bundle loader
  and command-to-skill mapping are the extension points to investigate. The configuration UI also
  already exposes runtime overrides; avoid creating a competing configuration surface.
- Source prompt sizes at inspection: continue approximately 8,078 words, refine 5,624 and verify
  4,072. These are an optimization baseline, not a mandate to remove workflow guarantees.
- The assessment's Codex App Server candidate is now selected by ADR-003, with compatibility and
  recovery still subject to the live profile proof. Schema/help inspection is not live proof.
- The Graphify memory adapter currently selects `claude-cli` extraction. Codex-only operation must
  make that dependency explicit and resolve it within the supporting-service scope.
- Official documentation consulted during the assessment: [App Server](https://learn.chatgpt.com/docs/app-server),
  [non-interactive execution](https://learn.chatgpt.com/docs/non-interactive-mode),
  [skills](https://learn.chatgpt.com/docs/build-skills),
  [subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents),
  [project guidance](https://learn.chatgpt.com/docs/agent-configuration/agents-md) and
  [hooks](https://learn.chatgpt.com/docs/hooks). Recheck these against the chosen supported CLI at refine.

## Verification

- Capture check: `aof work validate 154 --json` returned no findings on 2026-10-06.
  Repository-wide `aof work validate --json` reported stale `reads:` paths in other existing
  work items, including archived items; those findings are outside this milestone's capture.
- Initial assessment used code inspection, CLI version/help checks and an in-memory renderer probe;
  it did not run a model or establish successful end-to-end Codex execution.
- Implementation, protocol/migration tests, Claude regression checks and live Codex acceptance
  evidence remain outstanding and are now specified by the authored task contracts.
- Final refinement validation: `aof work validate 154 --json` returned `[]`.
- The shipped feature parser read all 28 features: every scenario has exactly one verification lane,
  and no structural findings occurred. Architecture is 1,194 words (budget 1,400); plans are 17 lines.
- `aof work next 154 --json` returned ready, with 154/00 and 154/03 in the first disjoint wave.
- Doctor confirms 12/12 stories have task payloads and reports no example-map errors or unwitnessed
  story dependencies. It is NOT green: six missing-red-probe errors are expected until the declared
  tests exist and are exercised. Their literal placeholders are retained to avoid manufacturing
  passing evidence. Warnings: six pending controls, one unconfigured control-runner check, twelve
  unbuilt rubric joins, plus the stream's existing numbering gap and aggregate dependency warning.
- Doctor's loop-readiness score is 70/100: pending red probes and repository loop-registry grounding
  warnings prevent clearance. The registry reports zero errors and 33 warnings, including 11
  grounding and four anchor-grounding findings. Those repository controls were not changed here.
- Runtime tests, UI build and model-backed probes were not run in this documentation-only phase.
  Story 11 requires clean detached sharded verification with isolated global state, real lifecycle
  evidence for both assistants and repeated prompt evaluations before milestone acceptance.

## Next

`aof:continue 154`. Build the ready stories, then the declared dependency order; do not interpret
refinement completion as runtime support or milestone acceptance.
