---
type: story
doc: retrospective
number: 04
parent: 191
slug: a-loop-starts-through-the-supervisor
title: "Retrospective — a loop starts through the supervisor"
created: 2026-11-15
updated: 2026-11-15
promotionFrom: 1
---
# 191/04 · Retrospective

These are the lessons from delivering and accepting the story, one `R<n>` per lesson. Findings are referenced here, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — A new decision path read workspace identity by its raw key

- **Kind:** mistake · **Area:** architecture · **Stage:** build · **Owner:** developer · **Raised by:** the outsider check · **Promoted to:** none

**What happened.** The start, the spend of its request and the supervisor's standalone fallback each
read `config.mesh.workspaceId` directly. Every other mesh reader asks `resolveWorkspaceId`. A project
published but not hand-pinned was refused at the outsider check, although the mesh had registered it
under its derived id. Fixing only the start would have left a request no launch could spend, and a
loop the supervisor restarted after every finish.

**Why.** Every fixture pinned `mesh.workspaceId`, so the raw read and the one precedence agreed in
every test. Nothing structural forbids the raw read on a decision path.

**Lesson.** Workspace identity on any decision path goes through `resolveWorkspaceId`, and a
contract that touches identity has a scenario with an unpinned workspace. A fitness function that
refuses a raw `mesh.workspaceId` read outside the identity home and a named allowlist would make
this structural (TECH_DEBT item 4). Candidate for the architect.

**Refs:** 191/F-14 · 191/04 task 03 · `packages/mesh/src/workspace-identity.mjs`

## R2 — A refusal named a remedy that cannot do what it says

- **Kind:** mistake · **Area:** process (product) · **Stage:** build · **Owner:** developer · **Raised by:** the outsider check · **Promoted to:** none

**What happened.** `loop-start-no-workspace` told the operator to run `aof mesh identity`, which
publishes the node's record and never writes `mesh.workspaceId`. No verb writes it.

**Why.** The message was written from the name of the verb, not from what the verb does, and no
scenario followed the advice.

**Lesson.** A refusal that names a fix is tested by applying that fix: the scenario runs the
remedy and shows the refusal gone.

**Refs:** 191/F-14
