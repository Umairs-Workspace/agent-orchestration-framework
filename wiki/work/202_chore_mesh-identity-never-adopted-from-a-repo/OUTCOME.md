# 202 · A machine never takes its mesh node id from a repository — Outcome

## Delivered

### A repository's node id is never adopted silently
On a machine with no `~/.aof/mesh/identity.json` of its own, `aof mesh identity` and `aof mesh join` refuse with `identity-from-repository` when the id they would use comes from the repository (a committed `mesh.nodeId` or `mesh.salt`, or a legacy `.aof/mesh/identity.json`). The refusal names the id and its source. `join` refuses before anything is sent to the control node. `aof mesh identity --name <id>` keeps that id and `aof mesh identity --reidentify` mints the machine its own; either writes the machine's identity file, after which nothing is refused. A machine that has its own identity file uses it, whatever the repository carries.

- **Reads are unchanged** — `loadWorkspace` still resolves an id from the repository when the machine has none, so a machine already running on one keeps it. Only the two verbs refuse; the heartbeat, launcher and session hooks do not check.

### The legacy per-repo identity file stays out of git
`aof work init` and `aof work update` add `mesh/identity.json` to the managed `.aof/.gitignore`.

### The committed-identity warning pins first
The `config-mesh-machine-key` warning for `mesh.nodeId` and `mesh.salt` says not to just delete the key, and to run `aof mesh relay --json` and `aof mesh identity --name <that id>` on each machine already joined before removing it.
