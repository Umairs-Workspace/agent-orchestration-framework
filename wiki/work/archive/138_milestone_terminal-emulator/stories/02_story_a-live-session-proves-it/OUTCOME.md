# 02 · A live session proves it — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by aof:verify (the main-session govern command that
  accepts the item). States product STATE, never motive. An ADDITIONAL artifact: never the record doc.
-->

## Delivered

### The deployed driver is observed working on both nodes
On this node's payload and the WSL node's tree, a drive under an empty `CLAUDE_CONFIG_DIR` stops `failed / blocked_screen` with `first-run` within 2 s of launch. A loop over the same fixture halts `run-not-retryable` with `screen=first-run`. A real drive pastes its directive on the input box 4.7 s after launch, its session id is captured, and its cancel leaves the REPL frame in the degrade log, with no fallback code.

### Every driven session declares the terminal the PTY is
Each interactive driven session launches with `TERM=xterm-256color`, the terminal the PTY and the screen model emulate, whatever the launching shell carries (m138/F-01).

### The WSL deploy carries the lockfile, and a failed install is not stamped
`scripts/deploy-wsl.sh` syncs `package-lock.json` with `package.json`. A failed `npm ci` exits 1 and leaves `.aof-wsl-deploy` as it was (m138/F-02).

## Gaps

### The Mac worker has not been measured
- **Status:** open
- **Discharge condition:** the Mac worker pulls, runs `npm ci`, and a drive there under an empty config names `first-run` in seconds.
Until then it runs the byte gate and logs `screen-model-unavailable` once (ADR-001 §4).
