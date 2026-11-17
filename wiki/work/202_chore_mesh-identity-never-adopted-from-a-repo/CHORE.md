---
type: chore
number: 202
slug: mesh-identity-never-adopted-from-a-repo
title: "A machine never takes its mesh node id from a repository"
status: done
owner: developer
created: 2026-11-17
updated: 2026-11-17
depends: []
schema: 1
aofVersion: 0.1.0
---
# 202 · A machine never takes its mesh node id from a repository

## Intent

A node id belongs to one machine and lives in that machine's `~/.aof/mesh/identity.json`. Today a
machine with no identity of its own silently takes one from the repository it is in: a committed
`mesh.nodeId` or `mesh.salt`, or a committed legacy `.aof/mesh/identity.json`. Two machines then
join as the same node, and removing the committed key later re-keys the machine that depended on it.
This closes that path, so no node id is ever copied or changed without someone running a command for it.

## Definition of Done

- [x] On a machine with no identity file of its own, `aof mesh identity` refuses to take a node id from
      the project's committed `mesh.nodeId` or `mesh.salt`, or from a committed legacy
      `.aof/mesh/identity.json`, and names the pin-first way out.
- [x] `aof mesh join` refuses the same way, before anything is sent to the control node.
- [x] A machine that already has its own identity file is unaffected: its id is the one used, and
      nothing new is refused.
- [x] `aof mesh identity --name <id>` still pins an id explicitly on such a machine (the deliberate way out).
- [x] The managed `.aof/.gitignore` ignores the legacy `mesh/identity.json`.
- [x] The `config-mesh-machine-key` warning tells `mesh.nodeId` and `mesh.salt` to pin first, never
      just delete.
- [x] The runtime audit is re-stamped for every audited file touched, and the boundary check reports no findings.
- [x] Focused suites for each changed module are green apart from the known MacBook reds.
- [x] `aof work validate` is green (no regression)

## Notes

Raised in the 199 verify session (2026-11-17). Today's resolution order is: the machine's own
`~/.aof/mesh/identity.json`, then a legacy per-repo `.aof/mesh/identity.json`, then a committed
`config.mesh.nodeId` (`packages/core/src/application/bindings/work.mjs`). This repository commits
none of the three; the guard is for repositories that do.
