---
type: spike
number: 206
slug: azure-devops-work-items
title: "Can Azure DevOps hold aof's work-item tracking through az boards?"
status: not-started
owner: researcher
created: 2026-11-20
updated: 2026-11-20
depends: []
timebox: 2d
schema: 1
aofVersion: 0.1.0
---
# 206 · Can Azure DevOps hold aof's work-item tracking through az boards?

## Question

Can Azure DevOps, driven through the `az boards` CLI, hold the tracking half of aof's work items
(identity, title, status, parent, dependencies and order) well enough to sit behind the store
interface from 208? Or is a one-way mirror, the same shape as the Notion sync,
the right first step?

These sub-questions decide it:

1. **Mapping.** How do ACD's item types map onto a process template (Agile, Scrum, Basic)?
   Milestone, story and task map naturally. Chore, spike, uat and prototype don't. Can ACD's
   status lifecycle map onto each template's states without losing a legal move?
2. **Guarded writes.** Can `az boards work-item update` refuse a write when the item changed since
   it was read (the equivalent of `expectFrom`)? If not, does `az rest` with a JSON-patch `test` on
   `/rev` work, and at what cost?
3. **Listing and change detection.** What does a WIQL query cost for a stream the size of this
   repo's? How often can the loop poll it, and does a service hook or other push exist that the CLI
   can use?
4. **Auth.** Can `az` authenticate inside a daemon's own environment, with no login session, on
   macOS, Windows and WSL, and on every mesh node? This is the same kind of failure that hit
   `claude` auth on the Mac.
5. **Mirror or source of truth.** What does a team lose with a mirror, and what does a source of
   truth cost, given the answers above?

## Timebox

- Box: `2d` — stop and record the best-available finding at the boundary, timebox extension
  requires explicit re-scoping.

## Investigation

## Finding

## Outcome / Next

Unblocks 209, or replaces it with a mirror integration if the finding says
so.
