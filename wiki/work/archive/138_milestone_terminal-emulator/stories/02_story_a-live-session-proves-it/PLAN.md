# 02 · A live session proves it — build plan

## Mechanism

No source changes. Three legs, in the order that risks the least.

1. **Deploy, then read the deploy.** Install from the main checkout with `--wsl --skip-ui`. Read
   the version stamp and the emulator's `package.json` beside the payload, then the distro's stamp
   and package. Stop at the first mismatch: every later leg would be measuring the old build.
2. **Zero-token before the token.** An empty `CLAUDE_CONFIG_DIR` makes claude show its theme
   picker, and 01 registers that as `first-run`, a failure. Run the direct drive first: if the
   variable does not reach the session, one bounded drive shows it. Then run the loop on a second
   fixture story. On the WSL node, drive the distro's deployed driver from a scratch script (import
   it by its path in `~/source/aof`). Invoke that script by its `/mnt/…` or distro path, never as an
   inline multi-line argument: `wsl.exe` mangles those.
3. **One real turn, cancelled.** Mint a run, lend it with `--run`, and pipe the drive's stdin from
   something that closes after 45 s. The session id is captured seconds after the paste. The cancel
   then stops the session through the stop bracket, which writes the REPL to the degrade log.

## Verification step

Each leg's paste slots in `VERIFICATION.md` are filled from what the commands printed and what the
logs hold. The story is ready for review only when every `Then` and `And` of the three tasks has
its paste. A leg that fails (a cap stop, a fallback line, a mismatched build id) is a finding with
its evidence, never a retried leg that happened to pass.

## Out of scope

- The Mac worker (`npm ci` after its pull is the operator's).
- Restarting the desktop app or any daemon. No leg needs one.
- A mesh-dispatched run on the WSL worker daemon. The daemon calls the same driver, and
  restarting it is the operator's act.

## Known traps

- The test-bed's lanes mean the loop leg runs in a dispatch worktree. Its trust dialog may appear
  there, and standing consent answers it. Record that if it happens.
- Pasted evidence goes through the repository's scrub. The private-terms guard refuses real
  spellings of the operator's paths.
- The distro's `claude` may be a different version from this node's. Paste both versions, because a
  first-run screen drawn differently on Linux is a finding for 01's recogniser, not a flaky leg.
