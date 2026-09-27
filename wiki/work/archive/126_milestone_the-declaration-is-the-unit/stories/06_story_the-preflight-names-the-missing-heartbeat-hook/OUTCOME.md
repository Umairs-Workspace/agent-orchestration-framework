# 126/06 · The preflight names the missing heartbeat hook — Outcome

## Delivered

### A fourth preflight check, and the count that supersedes three
`PREFLIGHT_CHECKS` is `["claude-authenticated", "payload-build", "workspace-identity-pinned",
"heartbeat-hook-installed"]` — the new code appended LAST, so the three that shipped with `126/04`
keep their order and only the count moves. Both `install` and `run` report four lines through the one
shared render.

### Every workspace on this node is asked whether it can record liveness at all
`heartbeat-hook-installed` walks the same workspace list its sibling does and asks two questions of
each: does its `.claude/settings.json` register the `claude-run-heartbeat` bundle hook, and is the
file that registration names on disk. Both, because a registration pointing at a missing file fails
at hook time and reads as healthy from the settings document alone. The registration is found by
WALKING the document for the `aofManaged` marker rather than by spelling a path, so a re-nesting of
the bundle's hook tree does not silently turn the check green.

### It fails closed, and names every offender rather than the first
An unreadable settings document, a node with no identity yet, a resolver that throws, and a resolver
answering `ok: false` are each a `fail` naming the cause — never a pass. Every workspace lacking the
hook is named; a workspace carrying it is not. A node with no workspaces registered is a `pass`.

### Its message is readable, and skips are counted
The skip list is reported as a COUNT, never enumerated. Measured on the control node 2026-09-10 with
327 skipped workspaces: this check's message is **1,353 characters** and names seven real offenders,
against `workspace-identity-pinned`'s **16,827** on the same data.

### It reports; it repairs nothing
No `aof work update` is invoked, nothing is written under any project root, every read goes through
an injected seam, and a failing check refuses neither verb. The remedy — `aof work update` — is named
in the message.

## Assumptions

- **A registered hook whose file exists will fire** — the check proves registration and presence, not
  execution. A Claude session that ignores its project's `PostToolUse` hooks would still write no
  liveness and this check would still read `pass`.
- **`resolveNodeWorkspaces` is the roster** — a workspace this node has never registered is not
  checked, and workspaces the resolver skips are counted rather than inspected.

## Gaps

### A workspace can still be missing the hook at the moment a loop is declared
- **Status:** open
- **Discharge condition:** `aof work loop --supervised` itself refuses, or warns, when the scope's own
  workspace carries no `claude-run-heartbeat` hook.
The check reports at `install` and `run` — the two verbs an operator invokes deliberately. Declaring a
supervised loop in an unhooked workspace between those two moments is still silent, which is exactly
the sequence that produced the measured 8h34m bill.
