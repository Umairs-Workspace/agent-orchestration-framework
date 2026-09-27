# PRD — aof as the Outer-Loop Agent Harness

> Planning PRD, upstream of ACD: the seam `aof:shatter` consumes. **Not shattered yet** (operator,
> 2026-09-26). Origin: research on 2026-09-26 into three sources. The first is Avid's *How to Build
> Agentic Harness using Jev* and its reference build **keel 0.2.0**, a Rust macOS workspace that puts
> a typed decision layer over several coding providers. The second is **TypeSafe Jev**, a "System
> One" model that returns typed Choice / Noul / Score answers with calibrated probabilities instead of
> text. The third is **DeepSeek Harness** (`dsh`), DeepSeek's MIT plugin harness. The finding: coding
> harnesses are settling into three layers. The **inner loop** is turns, steps, tools and sandbox
> (Claude Code, Codex, dsh). The **decision layer** makes typed choices the host can check (keel).
> The **outer loop** runs objective → build → verify → evidence → recovery across machines. dsh builds
> the inner loop and explicitly defers the outer one. aof has built most of the outer loop but has no
> first-class boundary to the inner one. This arc makes aof the outer-loop harness. It owns which
> provider runs a unit, what comes back, what is permitted, and what was decided and why. Every
> provider keeps its own inner loop.

> **Relationship to other PRDs.** [PRD-acd-loop-engineering.md](./PRD-acd-loop-engineering.md) built
> the code-owned loop shell this arc stands on. Its rule, "the CLI owns the shell; phases stay
> prompts", holds here unchanged. [PRD-acd-loop-performance.md](./PRD-acd-loop-performance.md) owns
> cost and model economics; this arc consumes its telemetry and does not re-own model-map tuning. The
> backlog milestone `terminal-emulator` (2026-09-25) is complementary; see Constraints.

## Objective

**Objective.** Turn aof from an orchestrator that *types into* a coding CLI into the **outer-loop
agent harness** that owns the boundary to it. There are four levers, foundation first.
(1) **Structured signals:** the driver learns session identity, turn end, waiting-for-input and tool
activity from typed events, not from terminal bytes, transcript filenames and printed sentinels.
(2) **A provider seam:** the loop and the mesh drive one interface (launch, signals, outcome, resume,
cancel). The interactive Claude CLI is the default provider; Codex and any ACP agent (dsh among them)
sit behind the same seam. (3) **A decision layer:** the host prepares named candidates and a
deterministic policy picks one or abstains; a typed selector such as Jev is optional. The host
re-checks the pick, and a receipt records what was offered, chosen, validated and observed.
(4) **Decisions that improve under review:** receipts become a replayable corpus for `aof work tune`,
and a changed policy lands only through the acceptor, with a human's accept. aof builds **no**
turn/step engine, tool registry or sandbox: providers own their inner loops.

## Context & Constraints

### The three layers, and where each system sits (2026-09-26)

| Layer | Owns | Claude Code / Codex | dsh | keel | aof today |
|---|---|---|---|---|---|
| Inner loop | turns, steps, tools, context, compaction, sandbox | yes | yes (Cordis plugins) | an embedded loop under DeepSeek's harness licence | no, by design |
| Decision layer | a typed pick among host-prepared options, re-checked, with a receipt | — | typed interception points, no selector | Laya (local) or Jev (hosted) at route and step focus | pure deciders only (`decideWave`, `haltDecision`, `shouldRetry`); no candidates as data, no receipts |
| Outer loop | objective → build → verify, budgets, recovery, triggers, evidence | same-session `/goal` and `/loop` | `goal` + `ralph`, deliberately thin | none | loop, waves/lanes, gates, grades, mesh, asks, observe, tune |

**dsh defers what aof already ships.** dsh's design note for its outer loop
([harness-level loop](https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/notes/implemented/feature/2026-07-16-harness-level-loop.md))
lists as deferred work, next to aof's shipped equivalent:

- independent evaluation (a deterministic checker, an adversarial verifier, a criteria contract) → aof's grade records, `@executable` scenarios, fitness functions and architect/QA review;
- aggregate budgets → `loop-bounds` and spend ingest;
- a persistent runner with restart recovery → `aof work loop --resume`, run reclaim and heartbeats;
- scheduling and triggers → `work-trigger` and the mesh;
- a loop journal → run records and the effects ledger;
- stuck-pattern detection → `observe` and the progress sampler;
- per-round fan-out, separate evaluator and worker, and dynamic provider/model choice → waves, maker/checker roles and session-model routing.

aof's gap is on the other side: the boundary to the provider.

### The boundary today

- The driver ([agent-session-driver.mjs](../../src/agent-session-driver.mjs)) spawns interactive
  `claude` in a node-pty PTY. It types the directive after a readiness guess. Everything else it
  infers:
  - the session id, from the first new transcript file;
  - needs-input, from a sentinel the model is told to print;
  - provider waits, from a regex over raw bytes;
  - done, from process exit or transcript idleness.
- What that costs, measured:
  - 12 attempts lost on 2026-09-24 to a dialog nothing could see and to directives typed before the
    TUI was listening
    ([terminal-emulator SPEC](../work/backlog/milestone_terminal-emulator/SPEC.md));
  - three loop deaths on 2026-09-12 and two on 2026-09-24 at a PTY kill inside the loop's own
    process ([child-drive.mjs](../../src/loop/child-drive.mjs) header).
- **Structured signals already flow, and are thrown away.** The bundled `PostToolUse` heartbeat hook
  ([run-heartbeat-enqueue.mjs](../../src/bundle/hooks/run-heartbeat-enqueue.mjs)) appends
  `{runId, at}` and discards the hook's stdin payload (session id, tool name, event). The driver
  already exports `AOF_RUN_ID` into the session. aof already renders `SessionStart`, `SessionEnd`
  and `UserPromptSubmit` hooks for Claude, Codex and OpenCode.
- Codex runs only on the mesh path, as a one-shot `codex exec --json` with a 10-minute timeout: no
  resume, no asks. [terminal-providers.mjs](../../src/terminal-providers.mjs) already names
  `claude`, `codex` and `gemini` as providers for human terminals.
- No tool-level allow/deny gate exists for unattended runs. PRD-acd-loop-engineering named one for
  triggers; nothing in `src/` enforces it.

### Ideas taken from dsh and keel (ideas, not dependencies)

- **Typed interception points.** dsh has `agent/pre-step`, `tools/pre-execute` and
  `agent/turn-stopping`, each returning a typed allow / deny / ask / continue. aof names its own
  points on the provider boundary (session started, tool about to run, turn about to stop, waiting
  for input) and gives each a typed decision. For the Claude CLI these points are its hooks; dsh's
  Claude hooks bridge maps them the same way.
- **Model-visible means logged.** dsh checks at runtime that every model request can be rebuilt from
  its session log. aof's version: **decided means logged.** Every decision can be rebuilt from its
  receipt.
- **The host prepares the menu, and picking is not permission** (keel). Candidates carry opaque ids,
  preconditions and an expiry. The pick is re-checked before use. No pick widens what the policy gate
  allows.
- **Answerers that fail closed** (dsh's approval chain). The ask plane (milestone 131) becomes one
  answerer in a chain: policy → optional selector → operator via Discord → deny.
- **Continue the same session, or start fresh with a bounded handoff** (dsh `goal` vs `ralph`). aof
  already has both retry shapes: resume the same session, or a fresh attempt with a fix brief. This
  arc names them and bounds the fix brief as a structured handoff.
- **Restoring is observation, not authority** (dsh goals restore disarmed). A resumed loop or a woken
  trigger spends nothing beyond what its declared autonomy level already authorised.
- **Receipt → scenario → replay → human-approved baseline** (keel's "what self-improving should
  mean"). This is exactly `work-tune` plus the acceptor, with receipts as a new corpus lane.
- **Real-example snapshots** (dsh requires a recorded real run for every change a model or human
  sees). Recorded provider event streams become replay fixtures for the driver.

### Constraints

- **Claude stays on the interactive CLI, on the subscription.** m38's research §4.3
  ([RESEARCH](../work/archive/38_milestone_cross-machine-worker-execution/RESEARCH.md),
  docs-grounded, July 2026) found that the Agent SDK does not permit Claude subscription login for
  third-party agents, so moving the driver onto it forces per-token API billing. dsh's Claude provider
  runs the SDK on the machine's native login; aof does not build on that. An SDK-backed Claude
  provider is an explicit API-billing opt-in, never the default.
- **Outer loop only.** aof gets no turn/step engine, tool registry, context manager, compaction or
  sandbox of its own. PRD-acd-loop-engineering's rule holds: the CLI owns the shell, and phase logic
  stays in the phase prompts.
- **Picking never grants permission.** A selector picks from host-prepared candidates or abstains.
  Config pins always win. These all fall back to today's deterministic behaviour, recorded as a
  fallback and never counted as a selector win: an abstention, a malformed answer, a stale candidate,
  an unreachable selector.
- **Deterministic first; the selector is optional.** Every decision point ships with a deterministic
  policy, which is today's pure decider. An external selector is off by default. It is not
  recommended until it beats that policy on measured total task cost: selector time + provider time
  + retries + review rounds. Jev is hosted and paid, and it sends state off the machine, so state is
  redacted first. keel's local Laya build runs on Apple Silicon only.
- **Extend; never add siblings.**
  - Signals extend the heartbeat hook and its queue.
  - Providers extend the `terminal-providers` seam and the driver's `driver` option.
  - Receipts go in one existing home, not a new store: beside the run, the way heartbeats are (the
    run store stays frozen), or in the effects ledger. The architect picks one.
  - Tuning extends `work-tune` and the acceptor.
- **Providers are separate processes.** No in-process dependency on dsh or any other harness.
  External providers speak their own protocol (ACP, Codex app-server) over stdio. AGENTS.md's
  supply-chain rules apply to any client library.
- **Availability is honest per node.** A provider that cannot run on a node is simply absent from
  that node's candidates, never a failed launch. For example, dsh's sandbox backends (bwrap,
  Landlock, Seatbelt) do not run on Windows.
- **The terminal-emulator milestone is complementary.** Hooks report only what happens inside a
  session. Screens before the session starts (MCP approval, login, trust) still need the rendered
  screen. Signals should land first, so the emulator covers only what hooks cannot see.

## Scope

**In scope**

- **Structured signals from the interactive CLI.** Extend the bundled heartbeat hook to keep the
  event name, session id and tool name from its stdin payload. Register Claude `SessionStart`, `Stop`
  and `Notification` into the same queue, keyed by the `AOF_RUN_ID` the launch already exports. The
  driver then reads each fact from a signal first and falls back to today's mechanism: the session id
  from `SessionStart` (fallback: the transcript-directory watch), turn end from `Stop` (fallback:
  idleness or process exit), waiting for input or permission from `Notification` (fallback: the
  sentinel), and tool activity from `PostToolUse`, which liveness already reads. Codex and OpenCode
  get the same where their events exist (`OPENCODE_UNMAPPED_EVENTS` already names the gaps). The hook
  stays non-blocking and store-free, like the heartbeat hook today.
- **The provider seam.** One interface that the loop's child drive and the mesh worker both call:
  launch, signals, outcome, resume and cancel. The outcome is `done | failed | needs-input` plus a
  reason from the closed failure vocabulary, and the seam's vocabulary is the existing `driver`
  option and the `terminal-providers` ids. `claude` (the interactive CLI) moves behind it with a
  byte-identical launch, and its outcome reads signals first. `codex` moves off one-shot `codex exec`
  to whichever protocol the spike picks, gaining resume and asks, or stays one-shot and says so. Each
  attempt records its provider, model and node. Presence publishes each node's available providers
  (the binary resolves, it is authenticated, it is supported on that OS). A provider is a candidate
  for a phase only if that phase's assets render for it.
- **An ACP provider.** One generic ACP client provider: initialize, start or resume a session,
  prompt, stream updates as signals, answer `session/request_permission` through the policy gate, and
  cancel. The first target is dsh's `acp` profile on the WSL worker; any other ACP agent comes after.
- **The decision layer.** Each decision point is declared: host-prepared candidates (opaque id,
  description, payload, preconditions, expiry), a state digest, a policy that returns one id or
  abstains, a re-check before use, and a receipt. Today's pure deciders are the default policies, so
  nothing changes when no selector is configured. Each point can have an optional selector adapter,
  off by default; Jev's `state` + `questions` → answer + probabilities + confidence is the reference
  shape. State is redacted before it leaves the machine, each point has its own threshold, and a
  timeout falls back. The first three points are: **route** (provider × model × effort × node for a
  unit, with pinned config winning); **stopped turn** (complete, asking the operator, blocked or
  unclear, read from the `Stop` signal and the last message, with the sentinel as the deterministic
  policy); and **next move after a failed attempt** (only from the moves the closed failure
  vocabulary already admits: resume, a fresh attempt with a fix brief, a stronger model, ask, halt).
  No selector can make a non-retryable class retryable. Receipts show in `aof work observe` and in
  the item's loop record.
- **The policy gate.** For unattended runs, Claude `PreToolUse` and ACP permission requests go to one
  aof policy: path and command allow/deny lists, with a typed allow / deny / ask. `ask` goes to the
  ask plane, and with no answerer the gate denies (fails closed). The policy is data in
  `.aof/aof.config.json`, rendered into the hook entry, and the hook timeout bounds the wait.
- **Decision replay.** Receipts become a `work-tune` corpus lane. `aof work tune` replays a changed
  policy, threshold or selector against the recorded candidates and reports valid picks, abstentions
  and fallbacks. For routes it also reports the recorded outcome: grade, attempts, review rounds and
  spend. Acceptance uses a separate held-out set, and the change lands through the acceptor, accepted
  by a human and reversible. Honest limit: replay re-runs the decision, not the downstream work.

**Out of scope**

- A turn/step engine, tools, sandbox, context management or compaction: these belong to the
  providers.
- Claude on the Agent SDK under a subscription login.
- aof dispatching the ACD roles (developer, architect, QA) as separate provider sessions instead of
  subagents inside the phase session. That re-opens loop-engineering's "phases stay prompts" rule;
  it is listed as adjacent below.
- Training or fine-tuning a selector, and any selector-policy change applied without the acceptor and
  a human.
- Counterfactual credit assignment (would another route have done better?) beyond recording which
  policy decided. That needs live A/B units.
- New desktop or board UI, beyond showing providers, receipts and asks through the existing faces.
- The screen-reading work itself, which is the terminal-emulator milestone.

## Milestones

> Foundation first. One spike gates the build. Signals are the foundation the seam and the gate
> read. The decision layer needs more than one provider to route between, and replay needs receipts.

- **provider-protocols** *(spike: the blocking unknowns)*. It answers four questions, measured on
  the Windows control node, the WSL worker and the Mac. First, which Claude hook events fire in an
  interactive session, and with what payload: does `Notification` fire for permission and idle
  waits, does `Stop` fire on a turn that ends in a question, and does `SessionStart` carry the
  session id before the first prompt? Second, for Codex, which gives resume and approvals: app-server
  or `exec`? Third, can dsh's `acp` profile be driven on the WSL worker through one prompt, with a
  permission request, to a terminal state, and which aof bundle assets can a dsh session load
  (skills, commands, subagents, and hooks through its Claude hooks bridge)? Fourth, what are
  Anthropic's current Agent SDK auth terms, and does `CLAUDE_CODE_OAUTH_TOKEN` suit unattended CLI
  launches on a worker? It gates session-signals, provider-seam and acp-provider.
- **session-signals**: extend the heartbeat hook and its queue into the session signal channel
  (`SessionStart`, `Stop`, `Notification`, `PostToolUse`, with their payloads). The driver reads the
  signals first and keeps its current fallbacks. Recorded event streams become replay fixtures.
  **Depends on the spike's hook finding.** It narrows the terminal-emulator backlog milestone to
  pre-session screens.
- **provider-seam**: one provider interface for the loop's child drive and the mesh worker, with
  `claude` behind it byte-identically and `codex` on the protocol the spike picks. Each attempt
  records provider, model and node; presence publishes per-node providers; a provider is a candidate
  only where the phase's assets render. **Depends on session-signals and on the spike's Codex
  finding.**
- **acp-provider**: a generic ACP client provider, first against dsh's `acp` profile on the WSL
  worker, with permission requests answered through the policy gate once it exists. It is admitted
  only for phases whose assets reach the agent. **Depends on provider-seam and on the spike's ACP
  finding.**
- **decision-layer**: declared decision points with candidates as data, re-check and receipts.
  Today's pure deciders are the default policies. There is an optional, redacting, off-by-default
  selector adapter, with Jev's API as the reference shape. The first points are route, stopped turn
  and next move after a failed attempt. **Depends on provider-seam** (route candidates) **and
  session-signals** (the stopped-turn point reads `Stop`).
- **policy-gate**: one aof policy behind Claude `PreToolUse` and ACP permission requests for
  unattended runs, with a typed allow / deny / ask. `ask` goes to the ask plane, and the gate fails
  closed. The policy is config data rendered into the hook entry. **Depends on session-signals and on
  milestone 131** (the ask plane). It is independent of decision-layer.
- **decision-replay**: receipts become a `work-tune` corpus lane. A changed policy, threshold or
  selector is replayed against recorded candidates, compared on a held-out set, and lands through the
  acceptor with a human's accept. **Depends on decision-layer**, and consumes milestone 62's
  `work-tune` and the acceptor.

## Adjacent techniques (captured, not scoped here)

- **Role sessions.** aof would dispatch developer, architect and QA as separate provider sessions
  instead of subagents in one phase session. That gives each role its own provider and model, and
  exact per-role spend. It moves maker/checker orchestration from prompt into code, so it needs its
  own PRD.
- **dsh as a render target.** Render aof's bundle for dsh (skills, agents as presets, hooks through
  its Claude hooks bridge) so a dsh session can run whole phases, not just bounded units.
- **Cheap-provider lanes.** Route bulk or mechanical units to a cheaper provider (DeepSeek through
  dsh). Once routing exists, this supersedes the Codex delegation toggle
  ([delegation.mjs](../../src/work/delegation.mjs)).
- **A local selector off Apple Silicon.** Run Laya's upstream open weights on the WSL or Linux
  worker, but only after the hosted selector has proven its worth on measured total task cost.

## Sources

- Avid, *How to Build Agentic Harness using Jev* (X article, 2026-09-23) — <https://x.com/av1dlive/status/2102802621664985241>
- keel 0.2.0 at the article's snapshot — [decision architecture](https://github.com/codejunkie99/keel/blob/3fc24b0ee3eff8938dde33c90bbf93125bc4e804/docs/decision-architecture.md), [route selection](https://github.com/codejunkie99/keel/blob/3fc24b0ee3eff8938dde33c90bbf93125bc4e804/crates/engine/src/jev_routing.rs)
- TypeSafe — [System One](https://docs.typesafe.ai/concepts/system-one.md), [HTTP API](https://docs.typesafe.ai/api.md)
- DeepSeek Harness — [repository](https://github.com/deepseek-ai/deepseek-harness), [architecture](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md), [Claude Code subagent provider](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/subagent/subagent-claude-code/README.md), [Claude Code hooks bridge](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/hooks/hooks-claude-code/README.md), [SAFETY.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/SAFETY.md)
- ACP — [agentclientprotocol/claude-agent-acp](https://github.com/agentclientprotocol/claude-agent-acp)
