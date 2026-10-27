---
doc: research
---
# 172 · Excalidraw phase 3 — Research

One blocking unknown, resolved by measurement at refine (2026-10-27): can the architect's
conversation run as a headless `claude` session that streams its answer as it is written, holds
the conversation across turns, and runs on the operator's subscription login?

## Q1 · A headless `claude` session that streams and holds a conversation

**Measured** with claude 2.1.310 on the Windows control node, `claude.exe` resolved from
`~/.local/bin` (the native install, not an npm `.cmd` shim), every `CLAUDE*` variable stripped from
the child's environment:

```
claude -p --input-format stream-json --output-format stream-json --include-partial-messages
  --verbose --model haiku --permission-prompts none --allowedTools "Bash(echo:*)"
  --no-session-persistence
```

Two user messages were written to stdin as `{"type":"user","message":{"role":"user","content":[…]}}`
lines, the second only after the first turn's `result` line.

- **One session across both turns.** Every line carried the same `session_id`; the second turn
  recalled a word given in the first. The process exited 0 when stdin closed.
- **The answer streams.** `stream_event` lines carry `content_block_delta` / `text_delta` chunks of
  a few characters to a few words (17 deltas over two short answers). The full message also arrives
  as an `assistant` line once the block completes, and each turn ends with one `result` line
  (`subtype: "success"`, `result`, `total_cost_usd`, `permission_denials`).
- **Tools run in the turn.** The allowed `Bash(echo:*)` call ran (`tool_use` on an `assistant`
  line, its `tool_result` on a `user` line) without any prompt.
- **Latency.** The first text delta arrived 17.7 s after the first message (cold start, hooks and
  plugins loading); the second turn's first delta 12 s after its message.
- **Other line types seen:** `system` (`init`, `status`, `hook_started`, `hook_response`,
  `thinking_tokens`), `rate_limit_event`. A reader must ignore any type it does not know.
- **Subscription.** No API key was in the environment; the run used the machine's `claude` login.

`claude --help` (2.1.310) documents the flags used: `--input-format stream-json` ("realtime
streaming input", print mode only), `--include-partial-messages` (stream-json output only),
`--permission-prompts none` ("anything that would prompt is denied automatically; the permission
mode still decides everything else"), `--replay-user-messages`, `--no-session-persistence`.

**Not measured:** what a denied tool looks like on the stream (the probe's second command was not
attempted by the model), and a slash command (`/aof:diagram-review …`) as the user message. Both are
the first live check of 172/00 (its `@uat`), and the stand-in session of its `@executable` suite
emits the documented shapes.

## Prior decisions this touches

- **m38/ADR-013 retired `claude -p` from the loop's worker driver** because a print-mode turn
  cannot pause to ask a human: a question-ended turn reports `completed`. That reason does not
  apply here — the architect's conversation IS the operator's turns, and each reply is the next
  user message on the same session. The loop's driver is unchanged.
- **The provider seam** (`@aof/execution/providers`) resolves `claude` on PATH with PATHEXT, as the
  terminal does; the conversation session resolves its executable through it.
