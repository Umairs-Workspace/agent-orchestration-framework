---
doc: research
---
# 154 · Codex compatibility and repository grounding

## Findings

### R1 · Existing execution is not runtime-neutral

`packages/work-loop/src/commands/drive.mjs:47` binds the Claude driver;
line 134 builds Claude slash commands; line 564 calls the Claude driver directly.
`packages/core/src/application/bindings/commands/drive.mjs` composes the same dependency.
`packages/work-loop/src/child-drive.mjs` lends model/effort but no runtime.
The separate Codex branch in `packages/execution/src/session-driver.mjs:1775` parses stdout as
one JSON object and omits the procedure and phase context. Its tests intentionally exercise
spawn failure rather than a successful Codex session. Preserve the proven Claude path while
introducing an explicit adapter boundary; replacing its internals is not required.

### R2 · Installed protocol can express the required lifecycle

Observed 2026-10-06: installed CLI reports `codex-cli 0.130.0`. The command
`codex app-server generate-json-schema --out <temporary-directory>` succeeded without a model
call. Its public schemas include thread start/resume, turn start/interrupt, user-input and
permission request/response types, model listing and thread usage updates. TurnStartParams
contains `input`, `effort`, `outputSchema`, `approvalPolicy` and `sandboxPolicy`.
ThreadResumeParams prefers `threadId`; alternative history/path loading is deliberately unused.
The installed help calls App Server experimental. Version alone is therefore insufficient proof:
ship a tested protocol profile and reject missing required capabilities before launching work.

Official references: [App Server](https://learn.chatgpt.com/docs/app-server) and
[non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode).
The former documents structured lifecycle and permission requests; the latter documents JSONL
events for exec. They do not prove AOF integration, account access or restart behavior.

### R3 · A protocol request id is not a durable question

App Server requests carry thread/turn identities; interruption can clear pending server requests.
Do not persist a JSON-RPC id and replay it to a new process. AOF already owns durable asks in
`packages/work-loop/src/ask-request.mjs:35`, with answer validation and existing delivery channels.
Persist the normalized question before terminating a parked session. On answer, resume the native
thread and deliver the recorded token, question and answer as a new turn. If the native tool is
unavailable, require a structured question envelope at turn completion. Neither pathway grants
execution permission. Live interruption/restart proof remains a delivery task, not evidence claimed
by this refinement.

### R4 · Native rendering has concrete gaps

`packages/core/src/adapters.mjs:391` uses one root for all resource kinds. A read-only rendering
probe produced `.codex/agents/developer.md`, omitted model/effort, and placed a `src` rule at
`.codex/src/AGENTS.md`. Bundle mapping in `packages/core/src/work/bundle-runtime.mjs:87` prepends
interpretation guidance to the Claude procedure. The ordinary resource override merge in
`packages/core/src/model.mjs:177` can replace metadata/body; the bundle loader does not expose
equivalent variant authoring. The existing associated-file and typed-reference machinery can carry
focused procedure references. Preserve OpenCode output as well as Claude during this change.

Official [skills](https://learn.chatgpt.com/docs/build-skills),
[subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents),
[guidance](https://learn.chatgpt.com/docs/agent-configuration/agents-md) and
[hooks](https://learn.chatgpt.com/docs/hooks) describe different locations and schemas. Custom
agents use TOML; local skills are discovered under `.agents/skills`; project guidance follows the
repository directory hierarchy. Hook existence does not mean hook trust has been granted.

### R5 · Integration extends beyond spawn

`packages/execution/src/runs.mjs` owns durable runs and retry classification.
`packages/execution/src/spend.mjs` reads Claude-shaped usage, and
`packages/work/src/observe.mjs:68` selects Claude transcript directories.
`packages/mesh/src/worker-execution.mjs` has its own resume and terminal-input paths.
`packages/work-loop/src/dispatch.mjs:286` has Claude-local settings inheritance but also a useful
runtime-independent lock-based copy of ignored generated files. Audit every producer and consumer
of runtime, session and usage facts together; a local happy-path test is not mesh parity.

The memory backend in `packages/knowledge/src/memory/graphify-backend.mjs:88` hard-codes
`claude-cli`. Existing local retrieval provides an explicit alternative that needs no model.
No evidence establishes a Graphify Codex extraction backend, so this milestone will not invent one.

### R6 · Prompt and UI baseline

Inspected all eight bundled roles and the command/skill inventory. Major procedures contain
Claude-specific `/effort`, tool, question and delegation assumptions. Source word counts at capture:
continue 8,078; refine 5,624; verify 4,072. Compare candidate prompts with this baseline on matched
fixtures; lower word count alone does not establish equivalent behavior.
The existing configuration editor is `/config`, with runtime overrides and settings sections.
Extend its form vocabulary and preserve CLI execution ownership.

## Coupling evidence and limitations

Both prescribed memory recalls ran. Relevant recalled decisions: native session identity is never
fabricated (item 48); capability gaps must not become silent success (items 01 and 02); liveness
reuses existing freshness semantics (item 38). No near-miss was returned by these recalls.

The fresh root-only code graph command first failed sandbox process creation, then ran with
authorized access and timed out at its 120-second deadline. No stale graph is treated as current.
Story proposals therefore use subjects, citations and test conventions, with graph unavailable;
boundaries are checked against source imports and callers. Shared composition, schema and runner
files cause explicit dependency ordering rather than optimistic parallel ownership.

## Delivery evidence still required

The profile's live probes must establish discovery, a native thread id, complete/question/failure
outcomes, cancellation, restart with a parked answer, and usage on the chosen supported CLI.
Only public schemas and help were inspected during refinement. No paid model session, credential
inspection, dependency install or product implementation was performed. A failed live probe blocks
the dependent integration story until fixed; it never licenses a silent transport or model fallback.
