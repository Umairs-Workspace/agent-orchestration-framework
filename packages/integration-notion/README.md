# @aof/integration-notion

Private workspace for Notion integration behavior. `createNotionEffects(getServices)`
from `@aof/integration-notion/effects` returns two contribution groups: `local` remaps
the sidecar, and `integration` conditionally synchronizes milestone status.

Core deliberately registers the local group before mesh projection and the integration
group after it, preserving cascade order. Registration performs no service loading or
external calls. Core supplies workspace loading, sidecar remapping, and synchronization;
their implementations and the CLI command still live under `src/notion/` and `src/commands/`.

Run `yarn workspace @aof/integration-notion test` for the package tests.
