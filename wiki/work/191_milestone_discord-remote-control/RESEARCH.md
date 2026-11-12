---
doc: research
---
# 191 · Discord drives the work from a phone — Research

Answered at refine, 2026-11-11, solo (the main session played the researcher). The SPEC's two open
unknowns are answered here as far as the record and the installed CLI answer them. What is left can
only be measured against a real Remote Control session, and is carried as a build-time `@manual`
check, never guessed.

## Q1 · Can `claude` turn Remote Control on at launch, and how does the link get back?

**Measured on this machine, `claude --version` → `2.1.322 (Claude Code)`, `claude --help`:**

- `--remote-control [name]` — "Start an interactive session with Remote Control enabled (optionally
  named)". Alias `--rc` (docs). It is a launch flag, so the launcher can type one command line and
  nothing else.
- `--session-id <uuid>` — "Use a specific session ID for the conversation (must be a valid UUID)".
  The control already mints a `randomUUID()` for every launched session (50/ADR-002 §2,
  `packages/mesh/src/ui-serve.mjs:743`), so the same id can be handed to `claude`.
- `-n, --name <name>` sets a display name; `--remote-control <name>` names the Remote Control
  session itself.

**From the Remote Control docs (`code.claude.com/docs/en/remote-control`, read 2026-11-11):**

- A session's name in the Claude app's list is, in order: the name passed to `--remote-control`, …,
  else an auto-generated `<hostname>-<adjective>-<noun>`. "In the Claude mobile app, tap **Code** in
  the navigation to reach the session list. Remote Control sessions show a computer icon with a green
  status dot when online."
- In an interactive session, "the terminal shows an `/rc active` indicator that links to the session
  on claude.ai. The indicator is hidden when the terminal is too narrow to fit it. To see the session
  URL and a QR code … run `/remote-control` again."
- The session URL's id is "the part of the session's URL at claude.ai/code between `/code/` and any
  `?`".
- Remote Control can also be on for every session (`remoteControlAtStartup: true` in the user's
  `~/.claude/settings.json`), but a checked-in project setting can only turn it OFF. aof therefore
  turns it on per launch with the flag, never through a settings file.
- Signed out: `claude --remote-control` "still starts an interactive session and shows a Remote
  Control failure notification shortly after launch". A signed-out daemon therefore yields a
  session with no link, not a failed start.
- An interactive session survives a network drop: "Claude Code retries for as long as the outage
  lasts and reconnects on its own".

**Finding.** Remote Control is turned on with one launch flag, and the session is findable by the
name aof gives it, whatever happens to the link. The link is an OSC-8 hyperlink in the session's
footer, not a line the session is guaranteed to print. aof reads the PTY's own output for the first
`https://claude.ai/code/…` URL within a bound, and the reply names the session either way (ADR-003).

**Left to measure at build (191/01, `@manual`):** the exact bytes the footer emits on a PTY of the
launcher's size (80×24 is the handler's default), and so whether the URL is present in the stream at
all at that width. If it is not, the PTY is opened wider for a launched Claude session. That choice
is the developer's, made against the measurement and recorded in `VERIFICATION.md`.

## Q2 · Does a launched session stop at the folder-trust prompt?

**From the docs:** "in a directory you haven't trusted yet, `claude remote-control` … asks
`Trust <directory>? [y/N]`". The interactive session shows Claude Code's ordinary trust dialog.
Nobody on a phone can answer a dialog inside a PTY.

**From the code:** a launched session runs in the project's checkout root, or in
`<project>/.aof/mesh/session-worktrees/<item>` (`packages/mesh/src/worktrees.mjs:205`), so both sit
inside the project folder.

**Finding.** A session inside a folder the operator has already trusted does not prompt. Claude Code
keeps trust per folder, and whether a child folder inherits a parent's acceptance is not stated in
the docs. **Left to measure at build (191/01, `@manual`):** start a launched Claude session in a
fresh `session-worktrees/<item>` of a project whose root is trusted, and record whether the dialog
appears. Either way the start does not hang: when no link is seen inside the bound, the reply says
where to find the session (ADR-003 §4). That reply also covers a session stuck at the dialog.

## Q3 · Does a Discord-started session need a time limit beyond the TTL and the reaper?

**From the code:** the session TTL (`resolveSessionTtlSeconds`, 120 s) and the reaper (48/ADR-006)
retire only a record whose pings stopped. A launched session pings every 30 s for as long as its PTY
lives (50/ADR-004 §2), so a forgotten session is never reaped. With ADR-002's `exec`, the PTY ends
when `claude` ends. Nothing ends an idle `claude`.

**Finding.** Without a limit, a session started from a phone and forgotten runs until `/session end`
or a daemon restart. Whether it should end on its own is the operator's call. It is put to them as
191/03 Q1 and never defaulted.

## Q4 · Which node holds a project the channel serves?

**From the code:** the bot's served workspaces are the control daemon's own project plus the control
node's mesh members (`servedWorkspacesOf`, `packages/messaging/src/bot.mjs`), each loaded from a
local `projectRoot`. The fleet route refuses a workspace that is not checked out on the control
(`workspace-not-local`, `packages/mesh/src/ui-serve.mjs:387`).

**Finding.** Every project a channel serves is checked out on the control node, so the control node
is always a node that holds it, and is the default target. That is why ADR-001 exists: today the
control node is never its own dispatch target (50 OUTCOME, Assumptions), so the default would refuse
`session-target-not-connected`, and on a single-node mesh (175/ADR-005) every start would.
