# 158 · Native permission requests — research

Inspected 2026-10-11 during solo refinement. These are measured facts, not live approval evidence.
The operator's Q1/Q2 answers supersede the initial human-approval premise. R5 identifies
the native automatic reviewer used by the final contract.

## R1 · The present adapter cannot wait for approval

`packages/execution/src/codex-app-server.mjs:88` replies immediately using
`permissionReply`, then settles `operator_action_required`. Command and file-change
requests get `decline`; permission-profile requests get empty permissions with turn
scope. The request branch currently does not validate the permission payload's
session/turn identity. Positive decisions need validation before any publication.

The adapter owns one stdio server per operation. Its event queue serializes async
handlers; waiting for an operator inside that queue would delay later native events.
The child-close handler itself waits for that queue. A pending approval must not
prevent observing disconnect, cancellation, turn completion, or a second request.

`packages/execution/src/runtime-session.mjs:45` serializes publication callbacks and
aborts on persistence failure. `packages/work-loop/src/commands/drive.mjs:126` owns
the native drive's heartbeat. Permission waiting must keep the drive and heartbeat
alive, without manufacturing a terminal `needs-input` result.

## R2 · Local profile inspection

The declared profile admits `0.160.0` and `0.162.0-alpha.2`. Local discovery found:

| Installation | Reported version | Admitted |
| --- | --- | --- |
| npm launcher | 0.130.0 | No |
| VS Code extension | 0.162.0-alpha.17.2 | No |
| Codex desktop bundled executable | 0.162.0-alpha.2 | Yes |

Exported the desktop binary's protocol with `app-server generate-json-schema
--experimental --out .tmp/refine-158/codex-schema`. This starts no model session.
The scratch schemas are local evidence, not project dependencies or runnable tests.

| Native request | Observed fields and decision semantics |
| --- | --- |
| `item/commandExecution/requestApproval` | Required item, thread, turn and start timestamp. Command/cwd/reason can be absent. Also carries optional approval callback id, action kind, additional permissions, environment, available decisions and proposed persistent amendments. `accept` is distinct from `acceptForSession` and policy amendment decisions. |
| `item/fileChange/requestApproval` | Required item, thread, turn and start timestamp; optional reason and `grantRoot`. It does not contain the patch. Display needs matching native item data. `accept` approves the changes; `acceptForSession` also affects future changes. `grantRoot` explicitly describes a session-duration request with uncertain native support. |
| `item/permissions/requestApproval` | Required cwd, item, permissions, thread, turn and start timestamp. Permission profile can include network and filesystem access, including legacy read/write paths and entry-based paths. Response scope is `turn` or `session`; no operation-only scope exists. |

For commands/files, `decline` lets the agent continue the turn; `cancel` additionally
interrupts it. AOF must distinguish denial of one operation from phase completion.
Optional or missing display fields must not be invented from a friendly summary.
Opaque/missing operation details cannot earn a positive decision.

The installed `0.160.0` binary was not available. Its published tagged schema was
subsequently checked in R5; a schema is still not live approval compatibility proof.
Use version-specific fixtures for both admitted versions and do not admit another
version or assume identical optional fields from this export.

## R3 · Business answers are unsuitable as permission decisions

The existing ask store persists questions and answers for a later resumed turn.
`packages/work/src/commands/resume.mjs:363` exposes `work:answer`, with a caller-
supplied actor and a separate worker answer path. Neither free-text answers nor an
actor label establish permission authority. Native approval must reach the original
outstanding RPC, rather than becoming resumed agent input.

`packages/core/src/application/bindings/mesh/worker-execution.mjs:92` delegates native
worker phases to the same drive seam, with the primary run and worker checkout
joined there. This is the integration seam for keeping worker approval waits alive.
The operator answered Q1 by delegating approvals to the assistant, with no human
approval surface. Native automatic review now owns action-specific decisions; AOF
does not build an approval-answer channel. Business answers and arbitrary actor
labels still cannot forge a native review result.

## R4 · Existing constraints and verification owners

The delivered `m154/ADR-004` declines permission requests. Its registered control
`m154/FF-15403` deliberately mutates a decline into an accept to prove failure.
158 must supersede the decline-only policy in its own ADR and update the runnable
control's assertions, without editing delivered feature contracts.

Existing owners are `packages/execution/test/codex-app-server.suite.mjs`,
`packages/execution/test/runtime-session.suite.mjs`,
`packages/work-loop/test/runtime/phases.suite.mjs`,
`test/loop/loop-command-resume.test.mjs`, and
`test/arch/session/acd-codex-permission-boundary.test.mjs`. The permission fixture
currently omits required fields and therefore cannot establish valid positive flows.
New cases must use realistic per-version payloads and exercise actual adapter writes.

Recovery tests in `test/loop/loop-command-resume.test.mjs:64` already preserve old
permission failures and avoid automatic retries. New verification must keep that
history and the completed build, retain model/effort, and obtain fresh approval.
Live Windows Astra/high acceptance has not been attempted during refinement.

## R5 · Native automatic review already provides the requested delegation

Claude's existing driver selects permission-mode auto at
`packages/execution/src/session-driver.mjs:790`. The local desktop schema exposes
approvalsReviewer=auto_review on thread start/resume and turn start, with effective
approvalPolicy and approvalsReviewer in the thread response. It describes a native
reviewer agent making risk-based decisions, rather than an unconditional grant.

The public tagged 0.160.0
[start schema](https://raw.githubusercontent.com/openai/codex/rust-v0.160.0/codex-rs/app-server-protocol/schema/json/v2/ThreadStartParams.json),
[resume schema](https://raw.githubusercontent.com/openai/codex/rust-v0.160.0/codex-rs/app-server-protocol/schema/json/v2/ThreadResumeParams.json)
and [start response](https://raw.githubusercontent.com/openai/codex/rust-v0.160.0/codex-rs/app-server-protocol/schema/json/v2/ThreadStartResponse.json)
expose the same reviewer selection and effective response fields. Both admitted
versions therefore have protocol-level support; no version upgrade is required.

The tagged 0.160.0
[notification schema](https://raw.githubusercontent.com/openai/codex/rust-v0.160.0/codex-rs/app-server-protocol/schema/json/ServerNotification.json)
and local 0.162.0-alpha.2 export provide item/autoApprovalReview/started and
item/autoApprovalReview/completed. States are inProgress, approved, denied,
timedOut and aborted; completion reports decisionSource=agent. Review identity
is reviewId/threadId/turnId, with nullable targetItemId. Action types include
command, execve, writeStdin, applyPatch, networkAccess, mcpToolCall and
requestPermissions. These notifications are explicitly unstable; normalize by
the pinned profile and refuse malformed current-turn facts. A strict-review
notification is native policy state, not approval or a request to weaken review.

Official [automatic-review documentation](https://developers.openai.com/codex/auto-review)
confirms an eligible on-request/granular policy is needed, that reviewer selection
does not remove sandbox boundaries, and managed restrictions still apply. The
reviewer processes eligible requests instead of asking the person. AOF need not
create a second approver or send positive client RPC replies for native-owned
review. The public documentation's current features do not prove every behavior
of an older admitted build; the tagged/local schema and live acceptance remain
the evidence boundaries.

Implementation seams: `packages/execution/src/runtime-events.mjs:10` currently
normalizes only text/tool activity, and its reducer currently admits turn/usage/
text/tool kinds. Extend these for review metadata without counting waiting as
productive activity. `packages/execution/src/runs.mjs:1128` already persists the
reducer's observation under the owned run. No new grant store is necessary.

## R6 · Continuation compatibility check — 2026-10-11

The official tagged [0.160.0 ServerRequest schema](https://raw.githubusercontent.com/openai/codex/rust-v0.160.0/codex-rs/app-server-protocol/schema/json/ServerRequest.json)
also confirms the request fields used by the unexpected-client-request validator.
Command and file-change approval requests require itemId, startedAtMs, threadId
and turnId; permission-scope approval additionally requires cwd and permissions.
This matches the retained local 0.162.0-alpha.2 schema. The public tagged schema
is retained at .tmp/refine-158/codex-0160-requests.json. This is protocol-shape
evidence, not a live permission decision or acceptance result.
