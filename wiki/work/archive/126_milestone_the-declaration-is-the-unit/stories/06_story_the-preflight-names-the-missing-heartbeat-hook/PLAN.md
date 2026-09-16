# 126/06 — build brief

Advisory, and the builder's. Not a contract: the task `.feature` scenarios are. Deviating from this
is not a finding.

**WRITTEN AFTER THE BUILD, AND SAYING SO.** Every other story in this milestone has a `PLAN.md`
authored at `aof:continue` before its build. This one does not, because this story was authored,
built and accepted inside a single `aof:verify` session with no `aof:refine` and no `aof:continue`
— no plan, no run record, no structural review and no behavioural review. That is a lifecycle
breach, it is recorded as a finding in the milestone's `VERIFICATION.md`, and this document is the
record of what was built rather than the brief that guided it. Read it as such.

## The mechanism

A fourth preflight check on `mesh:desktop-install` and `mesh:desktop-run`, appended LAST to
`PREFLIGHT_CHECKS` so the three that shipped with `126/04` keep both their order and their codes and
only the count moves.

`heartbeat-hook-installed` walks this node's workspaces — the same roster
`workspace-identity-pinned` already enumerates through `resolveNodeWorkspaces` — and asks two
questions of each: does its `.claude/settings.json` register the `claude-run-heartbeat` bundle hook,
and is the file that registration names present on disk. Both, because a registration pointing at a
missing file fails at hook time and reads as healthy from the settings document alone.

The registration is found by WALKING the settings document for an `aofManaged` marker equal to the
bundle id, not by spelling a path into the hooks tree. The nesting is the bundle's business; a
spelled path would turn the check green the day the bundle re-nests its hooks, which is the failure
mode this check exists to prevent one level down.

Two new injected seams, `settingsFn` and `hookFileFn`, the shape `claudeFn` / `workspacesFn` /
`workspaceConfigFn` already use. Their defaults read the real disk, so both shared test fixtures gain
inert ones in the same diff — `126/04`'s own retrospective recorded that a default-seamed probe
silently widens what every existing test of the verb reaches, and this is that lesson applied on the
day the seam lands rather than after somebody notices.

## The verification step

Over injected seams: the four conditions (registered and present; registered and absent; not
registered; settings unreadable), every offender named rather than the first, an empty workspace list
as a pass, and the three ways a node can fail to enumerate as fails. Then the honest one — call
`runPreflight({})` on this machine with no injection at all and read what it says about the real
workspaces this node carries.

## Deliberately out of scope

Repair of any kind: no `aof work update` is invoked, nothing is written under any project root, and a
failing check refuses neither verb. Whether `aof work loop --supervised` should itself refuse in an
unhooked workspace — the sequence that actually produced the measured bill — is this story's stated
gap, not its subject.

`126/04 task03`'s delivered `.feature` is not edited. It asserts "exactly three checks" in three
scenarios and remains the true record of what `126/04` shipped; this story's own `.feature` states
the count of four and names the supersession, and the SUITES follow it.
