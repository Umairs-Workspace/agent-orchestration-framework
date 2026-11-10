# 154/09 · Codex projects can choose an explicit memory backend — build plan

Advisory to the builder; the task features are the acceptance contract.

## Mechanism

Thread an explicit supported extraction backend through the existing Graphify seam and config inspection. Preserve absent legacy behavior; make local/none alternatives visible without choosing them. Keep recall and ingest vocabulary unchanged.

## Verification step

Run ingest/recall against local with a spawn spy that rejects Claude; verify legacy Graphify args and unsupported selection refusal. No external extraction or key setup is needed for the deterministic cases.

## Out of scope

No new Graphify provider, automatic backend fallback or memory-corpus migration.

