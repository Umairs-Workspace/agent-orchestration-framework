---
type: milestone
number:
slug: operator-aware-discovery-in-anger
title: "Operator-aware discovery, after use — a glossary, a question the operator can pass on, and lints on what a question carries"
status: not-started
owner: product-owner
created: 2026-11-15
updated: 2026-11-15
schema: 1
aofVersion: 0.1.0
depends: [193]
---
# Operator-aware discovery, after use

## Objective

Milestone 193 delivered operator-aware discovery and deferred four things to a follow-up, to be
shaped once it had been used. This milestone holds those four, plus what 193's live run showed
(m193/F-02, m193/F-03). In that run, every rule held that code enforces. The rules that only the
beat's prose carries were followed in part:

- The researched-examples batch at level `new` came with no `Background:` line for its rules.
- A question's `Background:` and its pick's reason made claims that no source backs: a penalty
  from a section the research did not cover, and "agencies usually…".

## Scope

In scope, as candidates to be cut at refine:
- **Lints on question quality** (193 SPEC, deferred): a domain question below `expert` with no
  citation, a question with no recommendation, a batch at `new` with no background, and a
  `Background:` claim that cites no finding.
- **A project `GLOSSARY.md`** kept by the researcher, with questions linking its terms (193 SPEC,
  deferred).
- **A "not mine to decide" answer**, `deferred-to <who>`, with a self-contained question pack the
  operator can forward (193 SPEC, deferred).
- **Learning the profile from answers** (193 SPEC, deferred).

## Dependencies

- `193_milestone_operator-aware-discovery`, for the labels, the profile and the beat.
