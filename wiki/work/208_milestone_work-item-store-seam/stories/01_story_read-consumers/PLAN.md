# 01 · Build brief

## Mechanism

Inject the workspace snapshot at the local leg of the current reader. Keep the projection merge, provenance, path-query translation and document lookup independent. Migrate domain readers that imported discovery directly, including the diagram planner and validation.

## Verification

Use distinct local and projected values so a fallback cannot pass by accident. Replay all read and diagnostic captures and inspect the bytes, channels and exit status.

The delivery uses the file provider. Live integration with an external tracker belongs to milestone 209.
