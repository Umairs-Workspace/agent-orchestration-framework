---
type: milestone
number: 209
slug: azure-devops-work-store
title: "A project can keep its work-item tracking in Azure DevOps, and the aof work verbs behave as they do over files"
status: done
owner: product-owner
created: 2026-11-20
updated: 2026-11-26
depends: [206, 208]
schema: 1
aofVersion: 0.1.0
---
# 209 · A project can keep its work-item tracking in Azure DevOps, and the aof work verbs behave as they do over files

## Objective

A team can use its upstream board to see the work AOF is driving. AOF defines a manifest
schema for upstream work boards and executes the selected board
definition behind the `WorkItemStore` interface from 208. The project keeps that YAML file
under `.aof/`. It can also keep a custom board adapter there and reference it from the YAML.
The adapter exposes a small, high-level interface for reading board data and applying work-item
changes. It owns the provider calls and their sequencing internally.

Azure DevOps is the first worked example. AOF drives the tracked fields on the board, including
title, status, parent, dependencies and order. An in-flight milestone keeps its durable local
work folder throughout refinement and execution. Completing refinement publishes the item and
links it to its board ID. In board mode the documents stay in place after completion. Archiving
is available only in local file mode.

It is met when:
- a project that selects the Azure DevOps store can run the `aof work` verbs and the loop
  end to end;
- the 205 suite exercises the Azure board definition using recorded HTTP responses, with archive cases checking that archiving is available only in local file mode;
- a test project can configure a second board and supply a custom adapter under its own
  `.aof/` without changing or rebuilding AOF;
- an external change to a linked board item stops the running workflow, preserves the local
  work and identifies the changed item. An explicit resync restores AOF's tracked values on
  the board and verifies the result before work can resume;
- one verified run against a real Azure DevOps project is recorded.

## Scope

In scope:
- **Manifest and execution.** AOF owns the schema, validation and shared execution of board
  operations. Each project's YAML declares its field and state mappings, how to perform the
  required operations, and which optional capabilities its board supports. Provider-specific
  executable code belongs to the consuming project and is loaded through an explicit reference
  in the selected definition. Adding a board requires no provider-specific code in AOF.
- **Optional uploads.** A board can declare attachment support and which files it accepts.
  A board without upload support can still satisfy the tracking contract. An uploaded file is
  a copy of a repository artifact.
- **Azure example.** The opt-in definition supplies the organisation, project, process template
  and area path. Use the HTTP operations measured in spike 206 and use `az` for authentication.
- **Guarded status writes**, using the mechanism the spike found.
- **Change detection and recovery.** Retain the last acknowledged board revision or equivalent
  comparison data. Detect an intervening change even when the local item has no pending edit.
  On detection, stop workflow progression and further ordinary board writes. Keep the conflict
  visible across a restart. Resync runs from AOF to the board on operator request and updates
  the acknowledged state after verification. An intervening edit during resync leaves the
  workflow stopped. Use the polling measurements from spike 206 for the Azure example.
- **Auth.** A preflight that checks `az` auth in the daemon's own environment, the way
  `daemon-claude-authenticated` checks `claude`.
- **Conformance.** Exercise the Azure definition through the work verbs against recorded responses,
  including rejection of a stale status change. Exercise a project-owned adapter through the same
  entry point.

Out of scope:
- Moving the documents (SPEC, ADRs, `.feature`, VERIFICATION) into Azure DevOps.
- Other trackers, such as Jira or GitHub Issues. The interface and the conformance suite are what
  make them possible later.
- Migrating an existing file-based stream into Azure DevOps. That is worth a later item of its own.

## Stories

- [x] `00_story_board-definition` — A project selects a validated board definition.
- [x] `01_story_azure-board-adapter` — An Azure project supplies the mapped reads and guarded writes.
- [x] `02_story_linked-work-items` — An operator can publish and continue working in the local folder.
- [x] `03_story_conflict-and-resync` — A workflow detects an external edit and recovers on operator request.
- [x] `04_story_daemon-board-access` — A node checks board access in its own daemon environment.
- [x] `05_story_board-conformance` — The public work verbs and loop are verified against a board.

## Dependencies

- **208.** It provides the interface this store implements.
- **206.** It answers the mapping, guarded-write, polling and auth questions.
