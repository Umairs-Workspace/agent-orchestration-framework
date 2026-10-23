---
type: chore
number:
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
# Notion's verbs reach core through one contribution

## Intent

Move Notion's CLI verbs onto the integration contribution seam that 169 built for Hyperagent
(169/ADR-002, ADR-003), so that core's command assembly reads Notion through
`packages/core/src/integrations.mjs` the same way it reads Hyperagent. Today six core modules import
`@aof/integration-notion` directly to wire its verbs.

## Definition of Done

- [ ] `@aof/integration-notion/contribution` exports one frozen contribution
      `{ id: "notion", name, commands(services) }`, and `integrations.mjs` registers it beside Hyperagent.
- [ ] `command-core.mjs` no longer imports `createNotionContribution`. The Notion verbs come from
      `integrationContributions()`, with their collaborators injected as services.
- [ ] `commands/notion-associate.mjs`, `commands/notion-sync-work.mjs` and
      `bindings/notion/{cli,mapping,sync-work,sync}.mjs` import no `@aof/integration-notion` module,
      because the package builds what they wired.
- [ ] `aof work integrations notion sync-work` and `associate` behave as before: their suites and
      the command inventory fixture are unchanged, except for registration order if that moves.
- [ ] FF-16004's per-verb module ceilings hold: the contribution is a data leaf that imports
      descriptors only.
- [ ] `aof work validate` is green (no regression).

## Notes

- Follow Hyperagent's shape in `packages/integration-hyperagent/src/contribution.mjs` and
  `command-core.mjs`'s `integrationContributions` (the lazily injected services).
- Notion ships no bundle members, so the contribution carries no `assets`.
