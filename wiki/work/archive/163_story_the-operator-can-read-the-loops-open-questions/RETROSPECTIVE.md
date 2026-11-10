---
doc: retrospective
updated: 2026-10-18
---
# 163 · The operator can read the loop's open questions — Retrospective

The story was loop-driven: one refine run and one solo build run, and both finished on the first
attempt. It produced two lessons, and the first is a repeat.

## R1 — 150/R1 recurred: the `files:` census left out most of what a new work verb touches

- **Kind:** mistake (recurring) · **Area:** process · **Stage:** refine → build · **Owner:** product owner (refine) · **Raised by:** builder
- **What happened:** A new `work:*` verb touched far more than `files:` named. The build also had to change `WORK_COMMAND_IDS`, `assemble.mjs`, `ask-request.mjs`, the bundle and manifest, the codex `workflow.md` variant and its `.agents` render, `README.md`, six command-count pins, the kernel port list, FF-16004's module ceiling and the prompt audit. `files:` was widened during the build.
- **Why:** Refine listed the verb's own modules and its tests. Adding a command has a fixed fan-out (the registry, the count pins, the bundle renders, the docs), and that fan-out is the same for every new verb, yet nobody had written it down.
- **Lesson:** When refine adds a `work:*` verb, it copies the command fan-out of the last story that added one (its final `files:`) as the starting census, then trims it. The fan-out is a known list, not a discovery.
- **Refs:** STATE feedback · m150/R1

## R2 — `install-local --skip-ui` on a checkout with no UI build empties the installed board

- **Kind:** near-miss · **Area:** process (tooling) · **Stage:** verify · **Owner:** builder · **Raised by:** verifier
- **What happened:** Verify ran `install-local --skip-ui` for task 04's `@manual` from a checkout with no `apps/ui/dist`. The installer mirrored the empty source and printed `synced ui/dist (0 files)`, which left `~/.aof/bin/ui/dist` empty. The daemons were down, so nothing broke at that moment, but the next desktop start would have served no board.
- **Why:** The flag says "reuse the existing ui/dist". What it actually skips is the build step, while the copy still runs from the source tree.
- **Lesson:** Before `--skip-ui`, confirm that `apps/ui/dist` exists. After any install, read the `synced ui/dist (N files)` line: a count of 0 means the installed board was just emptied. Until F-02 is fixed, build the UI first on a fresh checkout.
- **Refs:** VERIFICATION F-02
