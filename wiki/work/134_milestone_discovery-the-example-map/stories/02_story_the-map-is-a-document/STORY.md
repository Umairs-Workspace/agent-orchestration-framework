---
type: story
number: 02
slug: the-map-is-a-document
title: "The map is a document — the EXAMPLES.md grammar and its one parser, the work-examples family, and the work.examples gate"
parent: 134
depends: []
status: not-started
owner: product-owner
created: 2026-09-23
updated: 2026-09-23
adrs: [ADR-001, ADR-002, ADR-004, ADR-006]
reads:
  - wiki/work/134_milestone_discovery-the-example-map/SPEC.md
  - wiki/work/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-001
  - wiki/work/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-002
  - wiki/work/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-004
  - wiki/work/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-006
  - src/config-inspect.mjs
  - src/feature-parse.mjs
  - schemas/aof.schema.json
  - scripts/test.mjs
  - test/diagrams/index.mjs
  - test/arch/diagrams/index.mjs
  - test/work/story-plan-document.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
files:
  - src/work-examples/map.mjs
  - src/config-inspect.mjs
  - schemas/aof.schema.json
  - scripts/test.mjs
  - test/examples/index.mjs
  - test/examples/example-map-parse.test.mjs
  - test/examples/examples-config-gate.test.mjs
  - test/arch/examples/index.mjs
  - test/arch/examples/acd-example-map-single-home.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 02 · The map is a document

## User story

As **the reviewer, and every piece of code that has to judge a story's example map**,
I want **the map's grammar (rules, examples, the three provenance labels, questions with a class and
one of four states, the one-line "not applicable") parsed by one pure module that fails closed on
anything it does not admit, and a `work.examples.enabled` gate that defaults off and has one
resolver**,
so that **the lane, the door and the prose all read the same map the same way, a misspelt label
can never slip past a gate, and a project that has not turned discovery on is untouched**.

What lands (ADR-001, ADR-002, ADR-004 §2, ADR-006 §1): `src/work-examples/map.mjs`. It parses the
map and exports the frozen vocabularies (FF-13402), the fail-closed `business` default, the
`defaulted`-is-open rule for business questions, and the pure queries the lane will compose (open
business questions, provenance claims with their tokens, rules with no example, rule count,
malformed lines). Also `examplesEnabledFromConfig` and its validator beside the `work.plan` pair,
and the schema entry. The work-examples family is founded: `src/work-examples/`, `test/examples/`
and `test/arch/examples/`, each with its exemption, which names its planned members so stories
03 and 04 edit no budget line. The two test indexes are registered in `scripts/test.mjs`.

## Tasks

To be authored at story refine.

## Notes

- Pure: `map.mjs` reads no file, config or clock. It takes the text and returns a value.
- The token a question carries (`<story ref> Q<n>` / `E<n>`, ADR-003 §2) is built by one exported
  function here, so the reader in 03 and the prose in 05 cannot spell it two ways.
- The `EXAMPLES.md` template is NOT here. It is story 05's, because `src/bundle/manifest.json`
  hashes the template and `refine.md` together.
