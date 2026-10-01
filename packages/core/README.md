# aof (core)

The installed product. This workspace owns the `aof` executable identity and CLI (`bin/aof.mjs`,
`src/cli.mjs`), the canonical shipped assistant assets (`assets/`: commands, agents, loops,
templates, hooks and the generated `manifest.json`), configuration, rendering, and the explicit
application assembly (`src/application/`) that composes every feature package. Feature packages
(`@aof/work`, `@aof/work-graph`, `@aof/work-loop`, `@aof/execution`, `@aof/mesh`, `@aof/messaging`,
`@aof/knowledge`, `@aof/server`, `@aof/integration-notion`) contribute commands through the shared
registry; this package is the only one that depends on all of them.

## Entry points

- Source checkout: `node packages/core/bin/aof.mjs <command>` (after `node scripts/prepare-worktree.mjs`).
- Installed payload: `node scripts/install-local.mjs` copies this package, its production dependency
  closure, `assets/` and (optionally) the built UI beside the launcher; the single-file release
  (`scripts/build-sea.mjs`) embeds the same CLI.
- Public programmatic seams: `aof/application` (assembly), `aof/cli`, `aof/asset-base`,
  `aof/default-application` and the other explicit `exports` in `package.json`.

## Assets

`assets/` is canonical. Regenerate the manifest after editing it with
`node scripts/generate-bundle-manifest.mjs`; refresh a project's rendered copies with
`aof work update` (this repository's own `.claude/`, `.codex/`, `.opencode/` and `.aof/loops/`
copies are generated output, never a template source). Citations inside assets name the final owning
source files; `module:src/...` pointers in loop records are package-relative to this root and are
resolved through the composition binding (`src/application/bindings/work/loops.mjs`).

## Build and test

`yarn ui:build` (optional UI), `node scripts/supply-chain-audit.mjs`, `yarn test:workspaces`,
and focused suites via `AOF_GLOBAL_HOME="$(mktemp -d)" node scripts/test.mjs --only <files>`.
The CLI-only distribution never requires `apps/ui` or `apps/desktop`.
