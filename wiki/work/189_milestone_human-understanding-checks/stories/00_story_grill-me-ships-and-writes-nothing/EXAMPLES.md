---
doc: examples
---
# 189/00 · `aof:grill-me` ships for Claude Code and writes nothing — example map
<!--
Drafted at refine's discovery beat, 2026-11-01. Q1 answered by the operator on 2026-11-01:
`grill-me` (offered `aof:check`, `aof:reflect` and `aof:practice`). Struck because the record answers them: Claude Code
only (188/ADR-007, spike 187 measured Claude alone); no run, status or file (SPEC: "learning feedback
remains session-local, outside authoritative work status"); exercises never in project source (SPEC
Scope, first bullet); a check is no sign-off (SPEC Scope, fourth bullet, and the 158 recall).
-->

## R1 · The check command ships for Claude Code only
- E1 · `aof work update` in a project rendering claude, codex and opencode writes `.claude/commands/aof/grill-me.md` and no Codex skill or OpenCode command for it [proposed]
- E2 · The README's command table lists `/aof:grill-me` and says Codex and OpenCode render no grill-me command [stated Q1]

## R2 · A check writes nothing, so nothing it observes reaches a gate
- E3 · `/aof:grill-me 188/02` on an `in-review` story: afterwards `git status` and the story's `status:` are exactly as before, and no `runs/` file was added [proposed]
- E4 · `/aof:grill-me 188` names the milestone's stories from `aof work list 188` and checks none of them [proposed]
- E5 · `/aof:grill-me` on a story with no `reads:` sends the operator to `aof:refine <ref>` and checks nothing [proposed]

## Questions
- Q1 · business · answered · What is the command called? (`aof:grill-me`, chosen over `aof:check`, `aof:reflect` and `aof:practice`)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-002 · Does a check refuse through code at a door, or in its prompt?
