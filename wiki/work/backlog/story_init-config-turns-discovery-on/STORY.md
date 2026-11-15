---
type: story
number:
slug: init-config-turns-discovery-on
title: "`aof work init-config` turns discovery on, so operator-aware discovery can be adopted without editing JSON by hand"
status: not-started
owner: product-owner
created: 2026-11-15
updated: 2026-11-15
schema: 1
aofVersion: 0.1.0
tags: [config, discovery]
reads:
  - packages/core/src/application/bindings/work/init.mjs
  - packages/core/src/application/bindings/config-inspect.mjs
  - wiki/work/193_milestone_operator-aware-discovery/ARCHITECTURE.md#ADR-006
---
# `aof work init-config` turns discovery on

## User story

As **an operator turning operator-aware discovery on in a project that has never used discovery**,
I want **one `aof work init-config` command to turn on both discovery and the switch**,
so that **adopting the practice never needs a hand edit of `.aof/aof.config.json`**.

Today `aof work init-config --operator-aware on` refuses with
`examples-operator-aware-without-discovery` until `work.examples.enabled` is `true`, and no
`init-config` flag sets that key. In 193's live run on a fresh project, the operator had to run
`init-config` once, edit the JSON by hand, then run it again (m193/F-05).

## Tasks

## Notes

- One candidate shape: an `--examples on|off` flag. Another: `--operator-aware on` turns discovery
  on too, and says so. Choose at refine.
