---
type: story
number:
slug: codex-preamble-says-policy-where-operator-aware-is-on
title: "The Codex execution contract says `policy`, not `business`, in a project with operator-aware discovery on"
status: not-started
owner: product-owner
created: 2026-11-15
updated: 2026-11-15
schema: 1
aofVersion: 0.1.0
tags: [codex, discovery]
reads:
  - packages/core/assets/variants/codex/workflow.md
  - packages/specification-by-example/assets/bundle.json
  - wiki/work/193_milestone_operator-aware-discovery/ARCHITECTURE.md#ADR-006
  - test/arch/examples/acd-examples-off-is-today.test.mjs
---
# The Codex execution contract says `policy` where operator-aware discovery is on

## User story

As **an operator running Codex in a project with operator-aware discovery on**,
I want **every Codex agent's execution contract to name the question labels my maps use**,
so that **no agent is told about a `business` question my project no longer writes**.

Today the contract core renders at the head of every Codex agent says "A driven business question
retains its map token and one-question-per-ask form", and it says it in a project with
`work.examples.operatorAware` on too (m193/F-01, deferred at `aof:verify 193`). Core cannot say
`policy` there without changing every project's render (193/FF-19204). The shape the 193/04 review
named: a practice slot in that preamble, left empty by default, and an `operator-aware` fragment
that fills it.

## Tasks

## Notes

- With the switch off, every Codex render stays byte-for-byte what it is (FF-19204, FF-19208).
- The same stale label shows in `aof work update`'s practice list: the `discovery` row's summary
  says "asks its business questions" even where `operator-aware` is on beside it (m193/F-06).
  Its home is the `discovery` practice's `summary` in the package's `bundle.json`. Keep the row
  inside 120 columns (`backlog/chore_practice-list-fits-the-terminal`).
