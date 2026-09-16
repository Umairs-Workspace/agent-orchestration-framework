---
type: story
number: 125
slug: the-loop-graph-gets-a-published-face
title: "The loop graph gets a published face"
status: done
owner: product-owner
created: 2026-09-07
updated: 2026-09-13
depends: []
schema: 1
aofVersion: 0.1.0
# DERIVED at refine by `src/story-contract-derive.mjs` (incomplete: five of six subjects are files the
# graph does not carry), then subtracted (the composer's suites, unreachable by this change) and ADDED:
# the artefact + two PRDs being published, the release workflow + lint as idiom, `face.mjs` for
# `deriveRouteTable`, which task 02's control asks instead of keeping route names beside it.
reads:
  - wiki/work/loops.md
  - wiki/planning/PRD-acd-loop-engineering.md
  - wiki/planning/PRD-graph-engineering.md
  - src/loop-document.mjs
  - src/commands/loop-document.mjs
  - src/spine/face.mjs
  - src/command-core.mjs
  - test/arch/loop/acd-loop-document-current.test.mjs
  - test/arch/loop/acd-loop-document-eol-pinned.test.mjs
  - test/bundle/release-workflow-lint.test.mjs
  - test/support/source-slice.mjs
  - .github/workflows/release.yml
  - .gitattributes
  - wiki/work/79_story_committed-loop-graph/STORY.md
files:
  - .github/workflows/pages.yml
  - docs/_config.yml
  - docs/_layouts/default.html
  - docs/index.md
  - scripts/site/build-site.mjs
  - README.md
  - .gitignore
  - test/bundle/site-build.test.mjs
  - test/bundle/index.mjs
  - test/arch/loop/acd-site-is-projected-not-copied.test.mjs
  - test/arch/loop/index.mjs
  - test/arch/command/acd-readme-names-what-ships.test.mjs
  - test/arch/command/index.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  # ADDED at review: the workflow lint's CRLF read boundary gets ONE home, shared with the release lint.
  - test/support/workflow/workflow-lint.mjs
  - test/bundle/release-workflow-lint.test.mjs
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 125 · The loop graph gets a published face

## User story

As someone deciding whether to adopt aof — or as the operator six months from now trying to recall
why a loop is shaped the way it is,

I want the loop and graph machinery documented on a published site, with the loop graph itself
rendered from the registry rather than retyped,

so that understanding what `aof work loop` actually does costs a page of reading instead of an
archaeology pass over two planning PRDs, seventeen registry records, fifteen `ARCHITECTURE.md`
files and roughly fifty fitness functions.

## Why this is a real gap, measured

The README documents the **codebase** graph (`aof graph build|query|impact|triage`, §Graphify
codebase intelligence) and says nothing at all about the **loop** machinery. Grepped at HEAD,
2026-09-07: `README.md` and `AGENTS.md` contain zero occurrences of `aof work loop`, `work loops`,
`work tune`, `work trigger`, `acceptor`, `frozen-set` or `Loop-Ready`.

Worse, what the README *does* say about it is stale. Line 77 still describes `/aof:autonomous` as
deprecated *"(loop engineering replaces it; still works until that lands)"* — the replacement landed
in milestone 53. A reader is told the loop shell is forthcoming while it is the thing driving their
repository.

Everything real lives where only a maintainer would look: `wiki/planning/PRD-acd-loop-engineering.md`
and `PRD-graph-engineering.md`, the records under `.aof/loops/`, the per-milestone ADRs of 52–63 and
68–79, and unusually dense source comments. `.github/workflows/` holds `release.yml` and nothing else,
so there is no publishing path today.

## The load-bearing design idea

**The graph page is generated, and a check fails if it drifts.**

`aof work loops document --write` already renders `wiki/work/loops.md` — the Mermaid diagram of every
declared node and edge, plus the health census (17 records, 23 edges, per-check finding counts). That
artifact is the honest one because it is projected from the registry rather than described from
memory.

So the site must not *copy* it. A CI job runs the regeneration and fails on a non-empty diff, exactly
as the existing drift check does. Without that gate this story ships a document that is true on the
day it merges and quietly wrong within a milestone — which is the same defect it exists to fix, one
level up.

Two consequences settled at refine rather than discovered at build: **Mermaid does not render itself
on Pages** (Jekyll needs an explicit client-side include, unlike repository Markdown), and **the
narrative and the projection are different kinds of document** — the PRDs are prose published as-is,
`loops.md` is a build artifact, and mixing their update rules is how a drift gate ends up disabled.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_the-site-has-a-publishing-path.feature` — one workflow publishes, the gate answers on a pull request, the deploy only on the default branch
- [x] `tasks/01_the-graph-page-is-projected-not-copied.feature` — the graph page is staged through `loopDocumentPath`, provenance is stated, and story 79's control gates the deploy
- [x] `tasks/02_the-readme-stops-being-stale.feature` — the deprecated row states what is true, and the README cannot name a command that does not resolve

## Notes

**Scope boundary.** This story publishes what is already true. It does not write new design
documentation, does not re-litigate any ADR, and does not touch `src/` beyond whatever the drift
check needs. Correcting the README's stale `/aof:autonomous` line is in scope — it is the same
defect at a smaller grain, and leaving it while publishing a site about the loop would be absurd.

**Independent of 124.** That milestone changes edges and return paths; nothing it does invalidates a
page describing the loop shell, and nothing here blocks it. Drawn standalone deliberately rather than
folded into 124, whose subject is the graph's own correctness rather than its readership.

**Settled at refine (2026-09-07).** **Jekyll**, shell at **`docs/` on the default branch**, deployed
by a **GitHub Actions Pages workflow** (the classic branch-and-folder path serves only committed
bytes, which would commit the generated document a second time — this story's own defect). The
generated page and the two PRDs are **staged at build time**; the reasoning is a criterion in `tasks/00`.

**Raised 128; accept it first (2026-09-12).** Task 02's control found `aof work memory` (five true
README lines) absent from `deriveRouteTable` — 42 left it an unrouted ladder door. Story 128 routes
it; this control is green only with 128's code in the tree. No `depends` edge: this story was
in-progress before 128 existed, and the doctor rightly refuses working ahead of an unmet edge.

**Two controls re-homed at build (2026-09-12).** Refine put both under `test/arch/bundle/`, which
124/02's FF-12405 leg 10 freezes at 23 parity controls. Neither is one: the placement control shares
its predicate with `acd-loop-document-current` (`test/arch/loop/`); the README control resolves
against the route table (`test/arch/command/`). `files:` above is the repaired declaration.

**The Liquid guard (clause amended at review, 2026-09-12).** On the real Pages image Jekyll 3 has no
`render_with_liquid`, and Liquid strips the Mermaid hexagons at `wiki/work/loops.md:47-49`; the build
wraps every staged body in `{% raw %}…{% endraw %}`, and task 01's "published as authored" clause
now names that guard as the third and last thing the build may add.

**One placement is decided by a delivered control, not by preference.** Story 79's drift check
asserts that `wiki/work/loops.md` has exactly two readers inside `src/`. The site builder therefore
lives under `scripts/`, where that walk does not reach — see `tasks/01`.
