---
type: milestone
number: 191
slug: discord-remote-control
title: "Discord drives the work from a phone — start a Claude session in any project, start a loop, and act on a notification with one tap"
status: in-progress
owner: product-owner
created: 2026-11-10
updated: 2026-11-12
schema: 1
aofVersion: 0.1.0
depends: [50, 131]
---
# 191 · Discord drives the work from a phone

## Objective

The operator is away from the desk more: in the office, travelling. They want to keep using AOF on
their personal projects from a phone. Discord already reaches them. It posts when a session needs a
human, takes an answer by reply, and offers `/status`, `/asks`, `/loop stop` and `/loop resume`
(131). But it can only watch and steer work that is already running. It cannot start anything, and
debugging or a quick fix still needs a session the operator remembered to open before leaving.

This milestone makes Discord the place work starts from. From a phone, with only Discord, the
operator can:

- start a Claude session in any project the channel serves and open it in the Claude app through
  Remote Control;
- start, stop and resume a loop;
- resume a halted loop, or answer a fixed-choice question, by tapping a button on the notification.

An outsider can verify this by doing each of these from a phone, with no terminal and no browser.

## Scope

In scope:

- **`/session start project:<p> [node:<n>] [item:<ref>]`.** Starts a session through the mesh
  session launcher (50), in its own worktree on the node that holds the project, or on `node` when
  it is given. With `item`, the session starts in that work item's worktree. The session always
  runs `claude` with Remote Control on: the launcher types the command into the PTY, which is the
  board's existing idiom (50/ADR-007), so the launcher still spawns a bare shell. The reply names
  the node and the project, and carries a tap-to-open link to the Remote Control session.
- **`/session list` and `/session end`**, so a session started from Discord does not run forever.
- **`/loop start scope:<s>`**, next to the existing stop and resume. It is handed to the supervisor
  the way `/loop resume` is (131/ADR-009 §6). The bot itself never starts a process, so a started
  loop gets the supervisor's environment, not the bot's.
- **Pick the project, don't type it.** The project option is autocompleted from the projects the
  channel serves. All commands, old and new, use one name for it. The existing commands call it
  `workspace`; refine decides whether it stays `workspace` or becomes `project`.
- **Buttons on notifications.** A halt notice carries **Resume** and **Open a session here**. A
  question with fixed choices carries one button per choice. Free-text questions stay answer-by-reply.
- **Discord never gives the operator a shell.** Every session started from Discord is Claude with
  Remote Control, and driving it still needs the operator's Claude sign-in. Someone who takes over
  the operator's Discord account could start a session but not use it. Who may issue each command is
  the existing per-channel user allowlist (131/ADR-009 §2–§3), extended to the new commands.

Out of scope:

- Accepting or verifying work from Discord. Acceptance is where the operator looks at the work
  itself; it stays at the desk.
- A free-form chat with the bot. The Remote Control session is the conversation.
- A bare shell started from Discord. That stays a fleet-UI action.
- A native mobile app, and putting the fleet UI on the tailnet. Both are separate pieces of work.
- Hermes, or any second agent in front of AOF.

Open unknowns for refine (a researcher's first questions):

- **How the Remote Control link gets back to the bot.** It could be read from the PTY's output, or
  the session could report it. Also: whether `claude` can turn Remote Control on at launch (a flag,
  or a setting for every session). If the link cannot be returned, the reply degrades to saying
  where to find the session in the Claude app, and the start still succeeds.
- **Whether a Discord-started session needs a time limit,** beyond the session TTL and reaper it
  already gets (50/ADR-004).

## Stories

Cut at refine, 2026-11-11 (ARCHITECTURE ADR-008). 00 → 01 → 02 → 03 in sequence on the session
lane; 04 and 05 run beside them; 06 waits for 02–05; 07 waits for 02.

- [ ] [00 · The control node hosts a launched session](stories/00_story_the-control-node-hosts-a-launched-session/STORY.md)
- [ ] [01 · A launched session runs Claude with Remote Control on](stories/01_story_a-launched-session-runs-claude-with-remote-control/STORY.md)
- [ ] [02 · Sessions start and list from the CLI](stories/02_story_sessions-start-and-list-from-the-cli/STORY.md)
- [ ] [03 · A launched session can be ended](stories/03_story_a-launched-session-can-be-ended/STORY.md)
- [ ] [04 · A loop starts through the supervisor](stories/04_story_a-loop-starts-through-the-supervisor/STORY.md)
- [ ] [05 · The project is picked, not typed](stories/05_story_the-project-is-picked-not-typed/STORY.md)
- [ ] [06 · Discord starts sessions and loops](stories/06_story_discord-starts-sessions-and-loops/STORY.md)
- [ ] [07 · Buttons on the notifications](stories/07_story_buttons-on-the-notifications/STORY.md)

## Dependencies

- `session-launcher` (50, done): the worker-side session spawn, the worktree it starts in, and the
  ordinary session record. `/session start` dispatches to it and adds nothing to its spawn path.
- `the-human-in-the-loop` (131, done): the notifier, the Discord gateway and bot, the slash-command
  table and its defer-then-edit order, the channel allowlist, and the supervisor `handOff` that
  `/loop start` reuses.
