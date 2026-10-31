# 04 · The Mac runbook and acceptance — build plan

## Mechanism

**A sibling section, shaped like the WSL one.** The deploy rules already have a section per
node. Add a macOS section in the same shape, for this standalone laptop:
- **First-time setup**, in this order:
  1. Xcode command-line tools, then `rustup`.
  2. `node scripts/install-local.mjs --desktop`.
  3. The single-node nomination (ADR-005): read the id with `aof mesh relay --json`, then set
     `mesh.relay.controlNode` to it in `~/.aof/aof.config.json`.
  4. `aof mesh desktop install --app-artifact ~/.aof/bin/aof-mesh-desktop.app --autostart`.
  5. `aof mesh desktop run`.
- **Deploy:** `node scripts/install-local.mjs --skip-ui`, plus `--desktop` when `apps/desktop/`
  changed. The npm-linked CLI needs nothing.
- **Restart:** `aof mesh desktop stop && aof mesh desktop run`, the one restart that is legal over
  SSH, because launchd starts the app (ADR-003).
- **Verify at the source:** `--version`, the daemon `Build:` lines, `isControlNode: true`, and
  the daemon-environment auth probe, adapted from the WSL one to read the plist's PATH.
- **Gotchas:** the ones RESEARCH found:
  - the captured PATH goes stale after a Node bump (re-run `install --autostart`);
  - the 16-character process name;
  - the crash recovery (ADR-001 §5).

`apps/desktop/README.md` gains macOS prerequisites beside Windows' MSVC and WebView2, and the
`--desktop` row names the `.app`. `ROADMAP.md`'s "Other deferred items" gains one entry: daemon
parent-watch for crash containment on macOS, citing 175/ADR-001 §5.

## Verification step

Task 01 is the check. The operator runs it on this laptop, with a GUI login, from a fresh clone,
using only the new section. Each time the operator has to type a command the section does not
name, that is a finding against task 00, not a pass with a note.

## Out of scope

- Signing, notarising or a `.dmg`: a release milestone.
- The deploy rules' other node sections: unchanged.
- A verb for the control-node nomination (ADR-005, alternatives).
- Editing `CLAUDE.md` or `AGENTS.md`. The deploy rules are the one home for this; link to them,
  don't copy them.
