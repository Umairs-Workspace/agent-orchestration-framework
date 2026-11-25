---
type: story
number: 04
slug: daemon-board-access
title: "A node checks board access in its own daemon environment"
parent: 209
depends: [00]
status: not-started
owner: product-owner
created: 2026-11-24
updated: 2026-11-24
schema: 1
aofVersion: 0.1.0
adrs: [ADR-001, ADR-004]
reads: [wiki/work/209_milestone_azure-devops-work-store/ARCHITECTURE.md#ADR-001, wiki/work/209_milestone_azure-devops-work-store/ARCHITECTURE.md#ADR-004, packages/work/src/store/board-definition.mjs, packages/work/src/store/work-item-store.mjs, packages/mesh/src/commands/desktop-layout.mjs, packages/core/src/application/workspace.mjs, wiki/work/209_milestone_azure-devops-work-store/RESEARCH.md, packages/core/src/application/bindings/commands/mesh/desktop-preflight.mjs, packages/mesh/src/commands/desktop-preflight.mjs]
files: [packages/mesh/src/commands/desktop-preflight.mjs, packages/core/src/application/bindings/commands/mesh/desktop-preflight.mjs, test/mesh/desktop/mesh-desktop-preflight-heartbeat.test.mjs, test/mesh/desktop/mesh-desktop-install.test.mjs, test/bundle/yarn-installation.test.mjs]
---
# 04 · A node checks board access in its own daemon environment

## User story

As a node operator, I want a board access check using the daemon's account and environment so that I can correct a failed sign-in before it consumes a delivery run.

## Notes

Own the generic daemon preflight capability and diagnostics at the existing preflight door. Exercise a signed-in shell with a failing daemon probe, an inaccessible board after token mint, a successful probe and a file-only project. The Azure adapter owns its credential command and HTTP details.

## Tasks

Task contracts are authored at story refinement.
