---
doc: retrospective
updated: 2026-09-23
---
# 132 · Run records carry the node id, not the node name — Retrospective

## R1 — an id change between refine and verify invalidated the @manual contract, and took the control daemon down

- **Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** product owner
- **Raised by:** `aof:verify`, reading the identity sidecar at the source (`F-1`, `F-2`)

**What happened.** Task 04 was written against a hostname-derived sidecar. Between refine and
verify, the control node was hand-pinned with `aof mesh identity --name` (615678a). That made the
contract's first scenario unrunnable. It also left `mesh.relay.controlNode` naming the old id, so
the operator's next restart came up with no control daemon, and nothing said why.

**Why.** Only one of the two verbs that change an id reported what the change strands. The one
used for the hand-pin was the silent one. The contract's precondition was a measurement taken at
refine, and nothing re-took it before the operator was asked to restart.

**Lesson.** A verb that moves an identity must name everything keyed by the old id, and every such
verb must name it through the same scan (fixed here: task 05). At verify, re-measure a `@manual`
task's preconditions at the source before asking the operator for a restart. A precondition
recorded at refine is a claim about the past.

## R2 — a restart that brings back one daemon out of two is not a restart that worked

- **Kind:** near-miss · **Area:** operations · **Stage:** verify · **Owner:** product owner
- **Raised by:** `aof:verify`, finding only `:4181` listening after the relaunch

**What happened.** After the relaunch, the fleet page answered 200 and `mesh ui` logged the new
build, so everything visible looked healthy. The control daemon was absent, and it came to light
only because the fleet check needed `:4182`.

**Lesson.** After a restart, confirm each supervised daemon's own `Build:` line and listening port.
A healthy UI says nothing about the control daemon beside it.

## R3 — a written environmental fact had gone stale

- **Kind:** mistake · **Area:** environment · **Stage:** verify · **Owner:** operator
- **Raised by:** the WSL re-join, which timed out (`F-4`)

**What happened.** `.claude/rules/build-deploy-restart.md` records (measured 2026-07-27) that the
WSL guest reaches the host on every IPv4 it owns. On 2026-09-23 the guest reached the vEthernet
gateway but not the LAN address that `:4182` binds, so enrollment was unreachable. The WSL node's
last sighting, 2026-09-03, fits a network change that predates this story.

**Lesson.** Probe an environmental claim from the rules before building on it. A dated measurement
is only true for that date.

## R4 — a tree-wide rename reached a path built from segments, and a comment moved a digest pin

- **Kind:** near-miss · **Area:** testing · **Stage:** verify · **Owner:** product owner
- **Raised by:** the changed-file test run after the placeholder rename (`f76c153`)

**What happened.** The rename matched `runs/<name>/` written as a slash path, but two tests built
the same path from array segments (`"runs", "<name>"`). They silently lost their fixture folder. A
comment-only edit under `ui/` also moved FF-5307's digest. The changed-file run caught both before
the commit.

**Lesson.** When renaming a path segment across the tree, also match it as a standalone string
next to its parent segment, and run every changed test file before committing. A digest pin
counts comments as content.
