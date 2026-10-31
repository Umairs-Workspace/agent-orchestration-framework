# 175/04 · The Mac runbook and acceptance — example map

## R1 · This laptop reaches a supervised single-node mesh with only documented commands
- E1 · A fresh clone on this laptop (x86_64), following only the runbook: `aof mesh status --json` answers `isControlNode: true`, `http://127.0.0.1:4181/?mode=fleet` lists one node, and the menu-bar icon shows healthy with both daemons running [proposed]
- E2 · `~/.aof/bin/aof --version` answers `0.1.0 (payload <buildId>)`, the buildId in `~/.aof/bin/BUILD_ID.json` [proposed]

## R2 · Quitting leaves no aof process behind
- E3 · The menu's Quit: within 10 s, `pgrep -fl "aof mesh"` prints nothing [proposed]
- E4 · `aof mesh desktop stop`: it returns once the app has gone, and `pgrep -fl "aof mesh"` prints nothing [proposed]

## R3 · Logging out and back in brings it back
- E5 · Autostart registered, log out, log back in, with no terminal opened: `:4181` answers again, and a supervised run's `claude` is authenticated [proposed]

## R4 · The restart over SSH goes through launchd
- E6 · From `ssh localhost`, `aof mesh desktop stop && aof mesh desktop run`: the daemons come back in the login session, and the deploy rules' auth probe, run with the plist's PATH, prints `MESH_AUTH_OK` [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-001 · What does the runbook say to do after a supervisor crash? Find the orphaned daemons with `pgrep -fl "aof mesh"`, stop them with SIGTERM, then `run`. It is a recovery step, not part of the restart.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-005 · How does the laptop become a single-node mesh? Set `mesh.relay.controlNode` in `~/.aof/aof.config.json` to the id `aof mesh relay --json` reports. There is no new verb.
