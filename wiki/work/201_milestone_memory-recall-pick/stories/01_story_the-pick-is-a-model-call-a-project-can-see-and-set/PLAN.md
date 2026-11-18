# 201/01 · The pick is a model call a project can see and set — build plan

Advisory and the builder's own. The task features are the contract.

## Mechanism

Story 00 left a hole shaped like a function: the seam calls an injected picker and falls back when
there is none. This story fills it, in three layers that each stay in their own package.

1. **Execution** gets one new leaf that asks a model one question. It takes an executable, a
   model, the text for stdin, a time limit and an environment. It builds the argv, starts the
   child in a fresh empty directory under the OS temp directory, writes stdin, collects stdout,
   ends the child at the limit, and returns the answer text or a miss code. It knows nothing about
   memory. Follow `conversation-session.mjs` for the two things it already gets right: one builder
   for the launch argv, and the environment scrub through `isSessionAttachmentKey`.
2. **Core** composes the picker in the command binding that already builds `recordRecall`. It
   resolves `claude` through the provider seam as the board's headless conversation does (a
   stand-in named by an environment variable first, a shell shim refused), reads the settings,
   asks knowledge's contract leaf for the request text, calls the execution leaf, and hands the
   answer text back to the leaf's reader.
3. **Knowledge** reads `memory.recall.pick` in `readMemoryConfig`, beside the other blocks, and
   reports it from `inspectMemoryConfiguration` and from `status`'s config lines.

The launch to build is the one measured in ARCHITECTURE: print mode, JSON output, `--tools ""`,
no session persistence, strict MCP config, no slash commands, no permission prompt, and the
pick's own system prompt. The answer is the `result` field of the JSON the CLI prints.

## Verification step

With a stand-in executable and `AOF_GLOBAL_HOME` isolated: run a block recall, then read what the
stand-in recorded. Its working directory must be outside the scratch project, its environment must
hold no `CLAUDE_CODE_*` key, and its argv must hold neither the query nor `--bare`.

Then once for real, on this node, as task 00's `@manual` scenario says: a recall against the
project's own index, timed, with `~/.claude/projects` listed before and after. A new directory
there means the child ran with session persistence or inside the project, and
`aof work observe` will count every pick as an agent session.

## Out of scope

- The instruction's wording beyond "it works and ends empty when nothing applies". Story 03's
  replay is what tunes it against 177's numbers.
- A picker for Codex or opencode. A node with no `claude` degrades (ADR-004, alternatives).
- A doctor check for an unavailable pick. `status` and the per-recall stderr line say it.

## Known traps

- `--bare` looks like the lean flag to reach for. It never reads OAuth or the keychain, so a
  subscription sign-in fails and every recall would degrade with `pick-failed`.
- Every child process is audited. `scripts/workspace-runtime-audit.json` keys an entry by the call
  expression and by the comment-stripped source of its whole file, so the new spawn needs an
  entry, and editing `config-inspect.mjs` means re-stamping its three entries with a reason.
  Item 199 hit this trap at its verify on 2026-11-17 (its finding F-03).
- The schema's memory node is closed and FF-18002 walks it. Add `recall` to the schema in the
  same change as the reader, or validation and the schema control disagree.
- `status` lines are pinned byte for byte in the routed memory command's suite. The new
  line goes after `corpora:` and the legacy lines, and before the stale-index line, which stays
  last (178/01 E9).
- `packages/execution/src` is held at 27 direct children with no allowance.
- The time limit must end the child, not only stop waiting for it. A `claude` left running holds
  a subscription slot.
