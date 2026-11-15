# 194 · Global Discord channel settings — Outcome

## Delivered

### `aof messaging --global`
`enable discord --global` and `disable discord --global` write only `~/.aof/aof.config.json` and keep every other key in it. `status` prints a `global:` line and says where each project's channel comes from (`from: "global" | "project"`, plus `switchedOff`). `test discord` posts to an inherited channel.

### A project's own channels win whole
A present `work.notify.channels` key, even `{}`, is the project's declaration and replaces the global channels together with their `allow` lists. While a global channel exists, `aof messaging disable discord` in a project writes `channels: {}` there and never edits the global config.

### Inherited channels answer as well as post
Replies, buttons and slash commands in a global channel are admitted against the global `allow` list for every project that inherits that channel. The registrar registers a shared channel once, and a refusal names the global `aof.config.json` as the place to add the user.

### A global channel layer under every project
`loadWorkspace` gives a project whose config has no `work.notify.channels` key the global config's `channels`. The project's `work.notify.link` is never inherited, and a global config that is missing, invalid JSON or wrongly shaped leaves the project with no channels and never fails loading.

## Assumptions

- **One loader** — every notify, reply, button and slash-command path reads channels through `loadWorkspace`; `aof messaging` is the one raw reader, and it is given the global read and write explicitly.
- **The installed payload** — the daemons serve the global layer only once `install-local` has run and the desktop app has restarted.
