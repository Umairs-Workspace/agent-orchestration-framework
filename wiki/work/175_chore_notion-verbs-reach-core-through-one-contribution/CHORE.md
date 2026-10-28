---
type: chore
number: 175
slug: notion-verbs-reach-core-through-one-contribution
title: "Notion's verbs reach core through one contribution"
status: not-started
owner: developer
created: 2026-10-23
updated: 2026-10-23
depends: [169]
schema: 1
aofVersion: 0.1.0
---
# 175 · Notion's verbs reach core through one contribution

## Intent

Move Notion's CLI verbs onto the integration contribution seam that 169 built for Hyperagent
(169/ADR-002, ADR-003), so that core's command assembly reads Notion through
`packages/core/src/integrations.mjs` the same way it reads Hyperagent. Today six core modules import
`@aof/integration-notion` directly to wire its verbs.

## Definition of Done

- [x] `@aof/integration-notion/contribution` exports one frozen contribution
      `{ id: "notion", name, commands(services) }`, and `integrations.mjs` registers it beside Hyperagent.
- [x] `command-core.mjs` no longer imports `createNotionContribution`. The Notion verbs come from
      `integrationContributions()`, with their collaborators injected as services.
- [x] `commands/notion-associate.mjs`, `commands/notion-sync-work.mjs` and
      `bindings/notion/{cli,mapping,sync-work,sync}.mjs` import no `@aof/integration-notion` module,
      because the package builds what they wired.
- [x] `aof work integrations notion sync-work` and `associate` behave as before: their suites and
      the command inventory fixture are unchanged, except for registration order if that moves.
- [x] FF-16004's per-verb module ceilings hold: the contribution is a data leaf that imports
      descriptors only.
- [x] `aof work validate` is green (no regression).

## Notes

- Follow Hyperagent's shape in `packages/integration-hyperagent/src/contribution.mjs` and
  `command-core.mjs`'s `integrationContributions` (the lazily injected services).
- Notion ships no bundle members, so the contribution carries no `assets`.

## Resolution

- The package composes itself: `packages/integration-notion/src/services.mjs` builds the mapping,
  apply layer, `ntn` CLI seam and sync body from the collaborators core injects. The contribution
  carries it as `services`, beside `commands(services, own)`, where `own` is what `services` built.
- Core builds every integration's services in one binding,
  `application/bindings/integrations/services.mjs`, and hands the same collaborators to the
  integration's verbs through `integrationContributions()`. The four `bindings/notion/` modules and
  the two Notion command bindings are gone; `commands.mjs` became `contribution.mjs`.
- `application.integrations.notion` keeps its shape (`commandTools`, `mapping`, `sync`, `cli`,
  `syncWork`), now read from the built services. Registration order is unchanged: Notion is
  registered before Hyperagent.
- FF-16004: `aof work find 160` fell from 739 to 735 modules, and the ceiling was lowered to match.
  The `packages/integration-notion/src` budget rose to 12 (services.mjs), and
  `bindings/commands` fell to 61.
- `acd-cache-read-surface-boundary`'s control-side pin gained a `via` hop: core's adapter binds the
  cache-first reader, and the package's composition hands it to the factory.
