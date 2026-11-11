# 158 · The loop handles native approvals on the operator's behalf — example map

## R1 · Starting the loop or graph delegates native approval handling
- E1 · The operator starts verification with gpt-6-astra:high; a sandbox-blocked test is reviewed and allowed by the native reviewer without another operator confirmation [stated Q1]
- E4 · Starting a loop selects automatic approval review while retaining the configured sandbox and selected phase model [stated Q2]
- E5 · A permission-scope request is handled by the native reviewer under launch authorization, with no separate once-versus-turn consent question [stated Q2]

## R2 · Foreground and unattended execution use the same delegated authority
- E6 · A background or worker verification reaches a native permission review and continues after approval without waiting for CLI, dashboard or Discord input [stated Q1]
- E7 · Worker A and worker B both report review 7: A's result is attributed only to A's run/session/turn [proposed]
- E12 · On Windows, the real Astra/high native reviewer allows a blocked test subprocess and verification continues without a new permission prompt [stated Q2]

## R3 · Native review outcomes are attributable and never manufactured
- E2 · A business-question answer saying "approve" arrives during a permission review: it does not alter the native review decision [proposed]
- E3 · An old turn's approved review 7 arrives after a new turn begins: it cannot approve or complete anything in the new turn [proposed]
- E10 · The native reviewer denies an operation: AOF records denial and does not convert it to approval or successful verification [proposed]

## R4 · Interrupted reviews and recovery preserve work and history
- E8 · A review has no result before the existing phase deadline: the drive stops with timeout and no fabricated decision [proposed]
- E9 · The native process disconnects before its review result is known: delivery stays unknown and no stored decision is replayed [proposed]
- E11 · A new loop verifies an already-built story after an old operator_action_required failure: it preserves the old failure and build, uses Astra/high and handles new approvals automatically [proposed]

## Questions
- Q1 · business · answered · Who approves native requests in foreground/background/worker loops? Operator answer: "I don't need to approve, you need to approve on my behalf. Just like claude does". E1 and E6 state that delegation; the proposed human approval surfaces are rejected.
- Q2 · business · answered · Is a separate choice required for each grant scope? Operator answer: "No dude. The approval is implicit by the user running the loop/graph". E4, E5 and E12 state launch authorization without further native-permission questions.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-001-native-automatic-review-is-the-delegated-approver · Use Codex's admitted native automatic reviewer instead of building an AOF approval UI or an unconditional RPC acceptor; preserve native grant semantics and managed restrictions.
- Q4 · technical · defaulted ARCHITECTURE.md#adr-002-observe-review-lifecycle-without-owning-native-grants · Reuse the existing bounded drive and run observation writer for metadata-only review activity; no durable approval-answer store or replay mechanism.

<!-- The answers were received through the two native question replies on 2026-10-11.
Proposed examples remain authored test cases, not claimed operator confirmations.
-->
