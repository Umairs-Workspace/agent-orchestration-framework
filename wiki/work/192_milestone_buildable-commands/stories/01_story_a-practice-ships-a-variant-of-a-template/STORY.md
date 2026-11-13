---
type: story
number: 01
slug: a-practice-ships-a-variant-of-a-template
title: "A practice ships a variant of a template — installed in place of the default when the project has turned the practice on, and the default otherwise"
parent: 192
depends: [00]
status: in-review
owner: product-owner
created: 2026-11-13
updated: 2026-11-13
adrs: [ADR-004]
reads:
  - wiki/work/192_milestone_buildable-commands/SPEC.md
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-002
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-003
  - wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md#ADR-004
  - packages/core/src/work/bundle.mjs
  - packages/core/src/work/bundle-compose.mjs
  - packages/core/src/work/bundle-synthesis.mjs
  - packages/core/src/work/update.mjs
  - packages/core/src/render-plan.mjs
  - packages/core/assets/bundle.json
  - packages/core/test/bundle-compose.suite.mjs
  - packages/core/test/work-update.suite.mjs
  - wiki/reference/practice-prose.md
files:
  - packages/core/src/work/bundle.mjs
  - packages/core/src/work/bundle-compose.mjs
  - packages/core/test/bundle-compose.suite.mjs
  - packages/core/test/work-update.suite.mjs
  - wiki/reference/practice-prose.md
schema: 1
aofVersion: 0.1.0
---
# 192/01 · A practice ships a variant of a template

## User story

As **someone who maintains a practice that changes the form of a document**,
I want **to ship my own version of a template, installed in place of the default only in a
project that has turned my practice on**,
so that **the template a project copies teaches the forms that project uses, and a project
without my practice keeps the template it has**.

What lands (ADR-004): a member of kind `template-variant` in a bundle fragment, naming its
practice, the template and the file it stands in for. With the practice on, the file at the
template's usual installed path holds the variant; with it off, the default. This milestone ships
no variant of its own. Milestone 193 is the first user, with its `EXAMPLES.md` and `RESEARCH.md`,
so the mechanism is proved here on a fixture practice.

## Tasks

- [x] 00 [a practice that is on installs its variant](tasks/00_a-practice-that-is-on-installs-its-variant.feature)
- [x] 01 [a variant that cannot be installed is refused](tasks/01_a-variant-that-cannot-be-installed-is-refused.feature)
- [x] 02 [the reference says how to ship a variant](tasks/02_the-reference-says-how-to-ship-a-variant.feature)

## Notes

- This story adds no module and no control. It adds cases to the suites 192/00 created, and a
  section to the reference page 192/00 wrote.
- It shares no file with 192/02, so the two build in the same wave.
- The default templates stay installed in every project. Whether a project with a practice off
  should be given `EXAMPLES.md` or `PLAN.md` at all is not this milestone's question.
