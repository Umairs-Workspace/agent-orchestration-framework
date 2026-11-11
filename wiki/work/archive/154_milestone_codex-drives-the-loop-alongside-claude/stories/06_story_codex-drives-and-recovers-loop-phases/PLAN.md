# 154/06 · Codex drives and recovers the existing work loop — build plan

Advisory to the builder; the task features are the acceptance contract.

## Mechanism

Make phase drivers consume the resolved execution and session boundary. Preserve loop state/retry decisions; persist question/session facts before parking. Store answer delivery state in the existing ask record, reconcile ambiguity on restart and send a new turn rather than a stale RPC response.

## Verification step

Run the injected loop through all phases and restart checkpoints, with a deliberately red gate and duplicated answers. Assert no premature pass, no second question ledger, preserved native identity and unchanged Claude fixtures.

## Out of scope

Worker transport and usage aggregation are later stories; do not replace engine sequencing.

