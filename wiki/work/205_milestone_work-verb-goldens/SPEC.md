---
type: milestone
number: 205
slug: work-verb-goldens
title: "What the aof work verbs print and change in a work stream is held to baselines over a fixture stream"
status: in-progress
owner: product-owner
created: 2026-11-20
updated: 2026-11-23
depends: [203]
schema: 1
aofVersion: 0.1.0
---
# 205 · What the aof work verbs print and change in a work stream is held to baselines over a fixture stream

## Objective

The `aof work` verbs read and change a work stream that is, today, a folder tree. The folder name
carries identity and order, frontmatter carries status and dependencies, and nesting carries the
hierarchy. A refactor of how items are stored, such as the store interface in
208, must leave every verb's behaviour exactly as it was. Nothing checks that
as a whole today.

This milestone builds a synthetic fixture stream and holds the verbs to baselines over it, using
the golden-diff harness from 203.

It is met when every read verb's output and every write verb's change to the stream has a
baseline, and the suite is written so it can later run against a store other than files.

## Scope

In scope:
- **A fixture stream** covering every item type (milestone, story, task, chore, spike, uat,
  prototype) and every status, plus the backlog, the archive and `depends` edges, including
  blocked ones.
- **Read verbs.** Both `--json` and text output: `list`, `next`, `find`, `doc`, `validate`, and
  the `doctor` lanes that read the stream.
- **Write verbs.** Each runs on a temp copy, and the baseline is the tree diff it makes:
  `promote` (tail and `--at`), the `insert-*` verbs, `archive`, `status`, `renumber`.
- **Refusals.** The refusals the write verbs give, such as an illegal status move or a `depends`
  naming a backlog slug, are part of the baseline.
- **Written to be reused.** The suite drives the verbs, never the file layout directly, so it can
  serve as the conformance suite for any later store.

Out of scope:
- The loop, the mesh and the board. They consume the stream, but their behaviour is not this
  suite's subject.
- The harness itself, which is built in 203.

## Stories

- [x] `00_story_portable-fixture` — One portable fixture exposes stream and CLI drift.
- [x] `01_story_read-output` — Read verbs preserve their JSON and terminal output.
- [x] `02_story_placement` — Promotion and insertion preserve the complete stream delta.
- [x] `03_story_lifecycle-and-identity` — Archive, status and renumber preserve mutations and refusals.

## Dependencies

- **203.** It provides the harness, the normaliser and the update flow.
