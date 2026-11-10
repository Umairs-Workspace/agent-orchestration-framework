# 158 · Delegated native permission review

Scope: the user authorizes automatic approval handling by starting the loop/graph
(EXAMPLES Q1/Q2). The native reviewer evaluates actions in that task context.
This document records the inline security lens; it introduces no human approval gate.

| Threat | Required control | Evidence |
| --- | --- | --- |
| AOF silently falls back to user review or disables sandboxing | Verify native reviewer/policy acknowledgement before phase tools run; no sandbox/config/trust mutation | FF-15801 and task 00 |
| Client RPC becomes unconditional grant | Native reviewer owns approval; unexpected client permission requests receive no grant and an explicit routing failure | FF-15801 and task 02 |
| Business answers or another lane forge approval | Review events bind to owned run/session/turn/review identity; no answer command can mutate the native decision | FF-15802 and task 02 |
| Old metadata authorizes a new operation after restart | Observation only, no grant replay or AOF permission cache | FF-15802 and task 03 |
| Commands, paths or rationale leak in shared artifacts | Allowlisted metadata projection; fixture canaries in all raw payload fields are absent from runs and notifications | Task 02 |
| A persistence failure is reported as successful approval or verification | Cancel and fail on observation persistence faults; distinguish native execution from durable evidence | Task 03 |
| Approval of an action is mistaken for completed work | Await the native operation and phase-result envelope; native denial is never overridden | Tasks 00 and 02 |

The reviewer remains subject to native/managed policy. Existing local configuration
and credentials are not read for evidence collection, rewritten, or copied by this
story. Native reviewer rationale stays in native diagnostics; shared AOF records
carry decision state and identifiers rather than sensitive action content.

No controls or live tests have run at refine. Implementation must register the
pending controls and record genuine negative probes and live acceptance evidence.
