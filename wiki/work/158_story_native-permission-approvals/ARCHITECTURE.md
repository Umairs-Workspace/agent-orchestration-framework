# 158 · Native permission approvals

Decisions settled on 2026-10-11 before contract authoring. Q1/Q2 in EXAMPLES.md
replace the initial human-approval premise: starting a loop or graph authorizes
the assistant to handle native approvals. Solo architect, QA and developer lenses
are performed inline; this is not an independent-agent review.

## ADR-001: Native automatic review is the delegated approver

**Status:** Accepted for implementation. **Date:** 2026-10-11.

**Context.** Claude already selects permission-mode auto. Both admitted Codex
versions expose approvalsReviewer auto_review; RESEARCH R5 records the evidence.
Native review evaluates the action using its task context and returns a decision.
The user rejected approval surfaces and per-grant consent in Q1/Q2.

**Decision.** AOF selects the native reviewer for every driven Codex phase,
including foreground, detached, graph-dispatched, worker, repair and resumed turns.
Set approvalsReviewer to auto_review and approvalPolicy to on-request on native
thread start/resume. Verify the effective acknowledgement before starting a turn.
This invocation-scoped policy needs no new user flag or configuration opt-in.
It does not edit the user's Codex config, sandbox, permission profiles, writable
roots, model, effort, trust records, managed requirements or reviewer instructions.
If the native server rejects or cannot acknowledge the requested reviewer/policy,
fail explicitly before phase tools run; never silently use user review or bypass.

The phase brief states the actual operator-selected item/phase and that launching
this work delegates ordinary task-related permission decisions to native automatic
review. It does not claim that every conceivable action is authorized. The native
reviewer keeps responsibility for its action-specific decision and grant lifetime.
AOF does not require a separate once/turn/session consent selection, extend a grant,
persist an allow rule, or synthesize an approval. This is the same approval ownership
as Claude auto, not a replacement AOF model or a rule that accepts every RPC.

Supersede the decline-only permission clause of m154/ADR-004 for automatically
reviewed work. Its business-question lifecycle remains unchanged. Native review
normally owns the request and resumes the operation internally; AOF observes the
result rather than returning a second response. An unexpected client approval RPC
cannot be auto-accepted or converted to a business question: validate its family
and identity, reply with the profile's no-grant result when well-formed, then stop
with an explicit automatic-review routing diagnostic. Malformed/unknown requests
fail through the bounded protocol error path. No ordinary permission prompt is
posted to CLI, dashboard or Discord. Reviewer denial is never overridden by AOF.

The prior recall observation 8950b83a-a434-4ee6-a56e-4c958e888581 remains the source
for the conscious departure from m154/ADR-004; the other four returned records
were irrelevant and no near-miss was returned. No repeat recall was used to rebuild it.

**Alternatives.** Human approval UI conflicts with Q1/Q2. Always accepting RPCs
discards native risk review. A second AOF reviewer duplicates an admitted native
capability and requires new model/policy machinery. All are excluded.

## ADR-002: Observe review lifecycle without owning native grants

**Status:** Accepted for implementation. **Date:** 2026-10-11.

Normalize the admitted profile's autoApprovalReview started/completed notifications
at the adapter/profile seam, publish through runtime callbacks and persist through
the existing run observation writer. Keep review metadata in that run, not in an
approval-answer sidecar. Register each observation to its owning run, node/workspace,
session, turn and reviewId; targetItemId is nullable for network reviews and is not
a substitute for reviewId. Observe concurrent reviews independently. The phase stays
running with a nonterminal waiting-for-permission activity until its pending reviews
finish; native heartbeats and cancellation remain responsive.

Store only reviewer/policy provenance, review identity, known action type, status,
native times and decision source. Exclude raw action, command, cwd, paths, patch,
permission profile and rationale from shared run observations/logs/notifications.
Metadata persistence is awaited, and a persistence failure cancels the drive and
cannot result in a successful phase. Native approval may already have taken effect
before its event reaches AOF: do not claim write-ahead authorization, rollback,
exactly-once execution or a persisted decision when acknowledgement was lost.

Exact duplicate events are idempotent; conflicting terminal decisions or malformed
current-turn reviews fail explicitly. Events from another session/turn are ignored
without mutating this run. A matching terminal event without its start can be
recorded as observed-completion with start-not-observed, never fabricated history.
An approved review is not tool completion and never phase success. Denied/timedOut/
aborted reviews grant no access; the agent may continue by a different permitted
operation, while successful phase settlement still requires the existing valid
native phase-result envelope and no unresolved review. A missing result at turn
completion is incomplete review evidence and fails visibly.

Use existing phase and schedule deadlines, event/frame/queue bounds and cleanup.
Review activity proves liveness, not useful work or a reason to reset deadlines.
Owner loss, cancellation or disconnect marks unresolved reviews interrupted or
unknown; do not replay review notifications as authorization after restart.
Fresh attempts re-establish automatic review and carry no old decision cache.

Keep the existing explicit recovery door: a new loop invocation without --resume
can verify an already-built story. The old permission failure remains recorded;
the completed build is not re-driven. Bare --resume must not silently turn a
non-retryable historical failure into an automatic retry. Update its diagnostic
to name the new delegated-review capability and the existing fresh-launch remedy.

**Boundaries.** Graph proposal coupling connects profile → adapter → runtime →
drive and the worker core binding. Existing runtime-events owns the reducer and
runs owns persistence; no protocol policy enters loop engine/cycle/wave. Existing
graph builtAt is 2026-10-06T18:17:31.942Z, not a fresh graph. Source reads confirm
these seams. No diagram is needed for this extension of the existing native path.

## Fitness functions

The session-control directory owns two new controls, one per accepted ADR:
reviewer selection/acknowledgement and review lifecycle/settlement. These extend
its existing session authority and lifecycle subjects; FF-15403 separately keeps
the client-side no-grant invariant. The directory budget moves from 36 to the
delivered 38 with zero allowance; future cases extend these owners. The enclosing
adapter source audit is re-pinned only after confirming its two audited process
expressions are unchanged; no new subprocess authority is introduced.

158 supersedes FF-5307's byte pin for packages/execution/src/runs.mjs only.
The measured production diff adds the settleRuntimeReviews import and calls it
when an existing transition writes brief. This is the atomic owner-loss boundary
required by ADR-002: pending observations become unknown/interrupted, and pending
review evidence refuses successful settlement. Existing record keys and legal
state edges, board/UI readers and run-status representation remain unchanged.
The frozen-surface assertion stays registered and pins the new measured digest;
the delivered milestone 53 contract is not edited.

Land and register these controls in test/arch/session/index.mjs with their subject.
Record actual red mutations and observed failure messages in VERIFICATION.md.
Update m154/FF-15403's runnable assertion to distinguish native reviewer decisions
from client-side bypass, preserving its no-bypass/no-fallback invariant. Do not
edit delivered feature files or the delivered ADR text.

| ID | Invariant | Enforced by | Source |
| --- | --- | --- | --- |
| FF-15801 | Driven Codex work selects and verifies native auto review; AOF never unconditionally grants client RPCs or widens sandbox policy | test/arch/session/acd-native-permission-authority.test.mjs — registered; green and red-probed | ADR-001 |
| FF-15802 | Review observations cannot cross native/run identity, manufacture success, replay authority or outlive drive cancellation/deadline | test/arch/session/acd-native-permission-lifecycle.test.mjs — registered; green and red-probed | ADR-002 |
