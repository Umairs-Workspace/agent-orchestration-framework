# 201/01 · The pick is a model call a project can see and set — example map
<!--
Drafted 2026-11-17 by the PO at refine's discovery beat. Grounding, measured the same day:
- One lean `claude -p --model haiku` call from an empty directory outside the project exited 0 in
  8 s, read 856 input tokens, used the subscription sign-in and left no transcript directory
  (ARCHITECTURE "Measured facts").
- `claude --bare` never reads OAuth or the keychain (`claude --help`, 2.1.326).
- The memory node has one reader, and the schema's memory node is closed
  (packages/knowledge/src/memory-config.mjs; schemas/aof.schema.json:797).
The rules are the SPEC's third scope bullet and ADR-004. No person was asked, so every example is
proposed.
-->

## R1 · The pick is one `claude` call at the project's model, run outside the project
- E1 · A recall with a 20-card shortlist starts one `claude` process: model `haiku`, the query and the 20 cards on stdin, no tools, and a working directory that is not inside the project. It answers `[3, 1]`, and the block is the records ranked 3rd and 1st [proposed]
- E2 · The recall runs inside a Claude Code session (`CLAUDECODE=1`, `CLAUDE_CODE_SSE_PORT=4711`): the child's environment holds neither [proposed]
- E3 · After a real recall on this node, the project's transcript directory holds no session for the pick [proposed]

## R2 · A model that is absent, slow, failing or garbled leaves the lexical block
- E4 · No `claude` resolves on PATH: no process is started, the block is the lexical top 5, and stderr names `pick-unavailable` [proposed]
- E5 · `claude` has not answered after the time limit: the child is ended, and stderr names `pick-timeout` [proposed]
- E6 · `claude` exits 1 saying "Not logged in": stderr names `pick-failed` [proposed]
- E7 · `claude` resolves to `claude.cmd`, a shell shim: no process is started, and stderr names `pick-unavailable` [proposed]

## R3 · A project sets the pick under `memory.recall.pick`, and a bad value is refused
- E8 · The config has no `memory.recall`: the pick is on, at `haiku`, with a 20 s limit [proposed]
- E9 · `memory.recall.pick` is `{ "enabled": false }`: no process is started, the block is the lexical top 5, and nothing is announced [proposed]
- E10 · `memory.recall.pick` is `{ "model": "sonnet", "timeoutMs": 45000 }`: the child is started at `sonnet` and given 45 s [proposed]
- E11 · `memory.recall.pick` is `{ "timeoutMs": 500 }`: every memory verb refuses with `invalid-memory-recall-pick` at `memory.recall.pick.timeoutMs` [proposed]

## R4 · A project can see what the pick is
- E12 · `aof memory status` on a node where `claude` resolves prints `recall: pick haiku, 20 s (default) · claude resolves` [proposed]
- E13 · On a node with no `claude`, the line ends `· claude not found, so every block is the lexical top 5` [proposed]
- E14 · With the pick turned off, the line is `recall: pick off (project setting)` [proposed]
- E15 · `aof project show --json` carries `recall.pick` as `{ "enabled": true, "model": "haiku", "timeoutMs": 20000, "source": "default" }` [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-004 · Which model, by default? (`haiku`, the one 177 measured.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-004 · How long may the pick take? (20 s, about twice 177's p95 of 10.7 s. A project may set 1 s to 120 s.)
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-004 · Does `aof memory status` check that `claude` is signed in? (No. It says whether `claude` resolves, and spends no tokens. A signed-out `claude` shows as `pick-failed` at the recall.)
- Q4 · technical · defaulted ARCHITECTURE.md#ADR-004 · Does a Codex or opencode session's recall still ask `claude`? (Yes, when it resolves. No memory key follows the execution runtime today. It is a second provider for that session, `aof project show` names it, and `enabled: false` turns it off.)
- Q5 · technical · defaulted ARCHITECTURE.md#ADR-004 · How do tests supply `claude`? (A stand-in executable named through an environment variable, as the board's headless conversation does. No test starts the real one.)
