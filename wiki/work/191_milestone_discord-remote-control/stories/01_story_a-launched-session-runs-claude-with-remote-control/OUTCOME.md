# 191/01 · A launched session runs Claude with Remote Control — Outcome

## Delivered

### A launch is a closed field on the spawn frame
A `session-spawn` frame may carry `launch`, and the only value a node accepts is `claude-remote-control` (`SESSION_LAUNCHES`). A frame with any other value is refused, and a frame without one opens a shell as before.

### The node types one command line it builds itself
For a Claude launch, the node types `exec claude --remote-control <name> --session-id <id>` (`… & exit` on Windows), built by `launchCommandLine` from the record's id and name. Nothing from the frame reaches the line, and a name that starts with `-` is refused.

### The session's name is derived from the record
`launchSessionName` names the session `<project folder>-<first 8 of the id>`, keeping the name class and at most 64 characters, with leading dashes dropped. That is the name the Claude app lists it under.

### One Claude launch is one record
A Claude launch registers under `claude-code` (`CLAUDE_HOOK_ASSISTANT`), the label Claude's own hooks use. So the launch and its hook pings upsert one record and one presence entry, and a hook ping never demotes a launched pane to not relaying. FF-19110 holds the label to its one home.

## Assumptions

- **The node's `claude` is installed and signed in** — the session starts either way, but Remote Control posts no link from a signed-out `claude`.
- **The workspace pins `mesh.workspaceId`, or is used from its primary checkout** — see the gap below.

## Gaps

### A session worktree in an unpinned workspace keys a second slot
- **Status:** open
- **Discharge condition:** a hook ping from a session worktree resolves its primary workspace's id (TECH_DEBT item 4, the workspace-identity single home), whether or not the workspace pins `mesh.workspaceId`.
In a workspace with no pinned `mesh.workspaceId`, the hook's cwd in a session worktree derives a different workspace id from the launch's. ADR-002's §4 amendment deferred this (F-05).
