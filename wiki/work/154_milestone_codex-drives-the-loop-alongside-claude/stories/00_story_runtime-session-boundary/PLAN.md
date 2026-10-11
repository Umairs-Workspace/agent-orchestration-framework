# 154/00 · A shared session boundary preserves Claude execution — build plan

Advisory to the builder; the task features are the acceptance contract.

## Mechanism

Add an injected runtime dispatcher around the current Claude transport. Normalize the narrow result and awaited callback contract while retaining legacy exports. Leave phase routing on the old call until integration; run the same Claude fixture through both entry points.

## Verification step

Compare legacy and neutral Claude calls for command/context, identity, failure and cancellation; register FF-15401 and demonstrate its red probe. No live model is needed.

## Out of scope

Codex transport and changing phase routing belong to later stories.

