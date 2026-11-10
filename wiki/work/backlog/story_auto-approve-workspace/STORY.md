---
type: story
number:
slug: auto-approve-workspace
title: "A workspace can opt in to auto-approving claude's repository prompts, so a loop's lanes never sit on a dialog nobody can answer"
status: not-started
owner: product-owner
created: 2026-11-10
updated: 2026-11-10
schema: 1
aofVersion: 0.1.0
---
# A workspace can opt in to auto-approving claude's repository prompts

## User story

As **the operator who starts `aof work loop` in a repository and walks away**,
I want **to declare once, in that workspace's config, that loop lanes may approve claude's
repository prompts (folder trust, and the project's MCP servers I name) on my behalf — and, when I
have not declared it, for a lane that meets such a prompt to stop at once and tell me what to run**,
so that **a loop never burns its whole retry cap on 60-second timeouts behind a dialog no one can
see, and a repository I have never opened in `claude` myself can still be looped unattended.**

## Tasks

<!-- Authored by aof:refine. -->

## Notes

**Evidence (2026-11-10, voice-vox-company-portal, loop 14).** With the pty spawn fixed (node-pty's
`spawn-helper` restored to executable), every lane's `claude` started and then sat on a prompt until
the 60 s readiness timeout, three attempts per lane, halting `cap-exhausted` with only
`failureReason=timeout`. The screens are in `~/.aof/mesh/logs/degrade.log` (`screen-not-ready`):

1. **"Quick safety check"** — the folder-trust prompt, in its newer form that also lists the
   permission rules the project's `.claude/settings.json` pre-approves.
2. **The MCP enable prompt** for the project's `.mcp.json` servers (`voicevox`, `aspire`).

**Why aof's pre-trust stopped working.** `ensureWorktreeTrusted` (`packages/execution/src/claude-trust.mjs`)
writes `projects[<lane worktree>].hasTrustDialogAccepted`. Claude Code 2.1.312 keys trust — and the
`.mcp.json` server decisions — by the repository's CANONICAL root: a worktree's `.git` file is followed
through `commondir` to the main checkout ("Trusting it trusts that whole repository, including its
other worktrees"), and project permission rules apply only when that root is trusted explicitly.
Probed against an isolated `CLAUDE_CONFIG_DIR` copy: worktree-only → trust prompt; root trusted →
MCP prompt; root trusted + MCP servers decided → ready. The operator unblocked it by running
`claude` once in the portal and answering both prompts, which every lane then inherited.

**Shape to refine (not a decision yet).**
- An opt-in key, off by default (e.g. `work.loop.autoApproveWorkspace`), whose adoption path is
  delivered with it — the fail-fast message names the key ([[opt-in-config-needs-adoption-path]]).
- When on: before a lane spawns, record trust under the canonical root and the MCP decisions the
  config declares. aof never invents which MCP servers to enable. Trusting the root also applies to
  the operator's own sessions in that checkout, which is why it is opt-in.
- When off: recognise the trust / MCP prompt on the lane's screen and fail fast with a coded reason
  and the exact remedy, instead of retrying a timeout three times.
- The existing per-worktree write is now dead weight on current Claude Code; decide whether it stays
  for older versions.
