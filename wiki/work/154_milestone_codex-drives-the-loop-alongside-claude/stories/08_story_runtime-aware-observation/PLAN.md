# 154/08 · Codex activity and usage are reported honestly — build plan

Advisory to the builder; the task features are the acceptance contract.

## Mechanism

Normalize adapter events once, attach native thread/turn attribution, and accumulate deduplicated deltas into existing run reporting. Separate driver liveness from productive activity; runtime-specific parsers supply only supported metrics.

## Verification step

Replay duplicate, cumulative, out-of-order and missing usage through the real reporting seam; inspect two runs sharing a thread. Assert no doubled totals, invented cost or Claude cache warning, and red-probe FF-15406.

## Out of scope

No price estimation, transcript scraping from unrelated sessions or second observation database.

