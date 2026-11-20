---
type: milestone
number: 209
slug: azure-devops-work-store
title: "A project can keep its work-item tracking in Azure DevOps, and the aof work verbs behave as they do over files"
status: not-started
owner: product-owner
created: 2026-11-20
updated: 2026-11-20
depends: [206, 208]
schema: 1
aofVersion: 0.1.0
---
# 209 · A project can keep its work-item tracking in Azure DevOps, and the aof work verbs behave as they do over files

## Objective

A team that runs its delivery in Azure DevOps should not have to keep a second tracker in the
repo. This milestone adds an Azure DevOps store behind the interface from 208,
driven through the `az` CLI. Azure DevOps then holds identity, title, status, parent, dependencies
and order. The documents stay in the repo, in a folder keyed by the Azure DevOps id.

It is met when:
- a project that selects the Azure DevOps store can run the `aof work` verbs and the loop
  end to end;
- the 205 suite passes against it through a fake `az` that replays recorded
  responses;
- one verified run against a real Azure DevOps project is recorded.

The scope below is provisional. Spike 206 may reshape it, or replace it
with a one-way mirror.

## Scope

In scope:
- **The store.** An implementation of the `WorkItemStore` interface over `az boards` (and
  `az rest` where the CLI falls short), following the spike's mapping of types and states.
- **Configuration.** The organisation, project, process template and area path live in config.
  The store is opt-in, and a project without it changes nothing.
- **Guarded status writes**, using the mechanism the spike found.
- **Change detection.** Polling with a local cache, at a cadence the spike measured.
- **Auth.** A preflight that checks `az` auth in the daemon's own environment, the way
  `daemon-claude-authenticated` checks `claude`.
- **Conformance.** The 205 suite, run against this store through a fake `az`.

Out of scope:
- Moving the documents (SPEC, ADRs, `.feature`, VERIFICATION) into Azure DevOps.
- Other trackers, such as Jira or GitHub Issues. The interface and the conformance suite are what
  make them possible later.
- Migrating an existing file-based stream into Azure DevOps. That is worth a later item of its own.

## Stories

To be broken down by `aof:refine`.

## Dependencies

- **208.** It provides the interface this store implements.
- **206.** It answers the mapping, guarded-write, polling and auth questions.
