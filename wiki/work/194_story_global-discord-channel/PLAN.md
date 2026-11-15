# 194 · Global Discord channel settings — build plan

## Mechanism

The seam is `loadWorkspace` in the core work binding. It already reads the global
`aof.config.json` and merges its `mesh` block under the project's (`readGlobalMeshConfig`). Read
`work.notify.channels` from the same file in the same pass. When the project's config has no
`work.notify.channels` KEY, put the global channels in; when the key is present, even as `{}`,
leave it alone (replace, never merge, 194 Q1/Q5). `link` is never inherited. Record where the
channels came from on the returned workspace (e.g. `notifyChannelsFrom: "global" | "project" |
null`) beside `config`, as the `mesh` overlay keeps its own provenance out of the config shape.

Everything that answers in or posts out (`notify`, `handleReply`, `handleButton`, the slash-command
`reach()` and the registrar) already reads `workspace.config.work.notify.channels` from
`loadWorkspace`. So it needs no change to find the channel. It changes only where a refusal names
the `allow` key: when the channels came from the global layer, say the global file.

`aof messaging` is the exception: its verbs read and write the project file raw, through
`readConfig`/`writeConfig` from `work/delegation.mjs`. Inject two more collaborators the same way
(read and write the global config at `globalWorkspacePaths({ env }).configPath`). Then:
`--global` on `enable`/`disable` points the existing edit at the global file. `status` adds a
global line and the project's `from`. `test` builds its workspace from the effective channels, not
the raw project file. Project-level `disable` writes `channels: {}` when the global config has
channels of the type, and deletes the block as today otherwise.

Follow the mesh precedent's failure behaviour exactly: a missing, unreadable or wrong-shaped global
file reads as "no global channels" and never throws from `loadWorkspace`.

## Verification step

On this MacBook: `aof messaging enable discord --channel <id> --global`, then in a project with no
`work.notify`, `aof messaging status` shows the channel "from the global config", and
`aof messaging test discord` lands in the real channel. Then run `aof messaging disable discord`
in that project: `status` says it is switched off and `~/.aof/aof.config.json` is byte-identical.
A failure looks like `test` refusing `messaging-not-enabled` (it is still reading the raw project
file), or `status` saying enabled after the project-level disable (the block was deleted instead of
left as `{}`).

## Out of scope

- A global `link` — it names one repo's URL; inheriting it would point every project at one repo.
- Merging global and project `allow` lists — Q1 chose replace; a union is a later story if wanted.
- `aof messaging test --global` outside a project — `test` runs where a project's effective
  channels can be computed; `status` covers checking from outside.
- Other channel types — only `discord` exists; the replace rule is written over `channels` as a
  whole, so a second type inherits it unchanged.

## Known traps

- Tests MUST run under a fresh `AOF_GLOBAL_HOME`: this story reads and writes the global config,
  and an unisolated run edits the real `~/.aof/aof.config.json` that the live daemons read.
- Project-level `disable` today deletes `work.notify` once `channels` is empty. Left unchanged,
  an opted-out project silently falls back to the global channel: the opposite of Q2.
- The daemons load modules once: a manual check needs `install-local` + a desktop restart first.
