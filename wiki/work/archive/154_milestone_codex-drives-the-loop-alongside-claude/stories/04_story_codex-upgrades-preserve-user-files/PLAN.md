# 154/04 · Codex upgrades preserve operator-owned files — build plan

Advisory to the builder; the task features are the acceptance contract.

## Mechanism

Reuse lock hashes and drift refusal for ordinary files; add explicit owned entries/blocks for co-authored TOML, hooks and guidance. Preflight all target collisions before writing. Migration removes only unchanged tracked obsolete paths and commits lock state after success.

## Verification step

Apply, edit operator fields, update and apply again in an isolated fixture; compare preserved bytes/semantic values and final lock. Exercise interruption recovery and FF-15404 with a destructive-write red probe.

## Out of scope

No writes to credentials, trust grants or the operator's live generated directories during tests.

