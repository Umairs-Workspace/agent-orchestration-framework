
# 08 · The messaging CLI — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by the MAIN-SESSION GOVERN COMMAND THAT ACCEPTS the
  item (ADR-004, reconciled at 85: aof:verify, or aof:assimilate-code, which reaches done in
  its own step) — never at insert, and never by a developer/evidence subagent, which is the threat
  the rule names (they have Write and have been observed to clobber records and fabricate decisions).
  States product STATE ("the system now IS X"), never motive ("we built X because Y" — that reasoning
  belongs in RETROSPECTIVE.md). This is an ADDITIONAL artifact: it carries no identity frontmatter and
  is never this item's record doc.
-->

## Delivered

### The `aof messaging` command family
`aof messaging init|enable|disable|status <type>` are four routed commands from one module,
`src/commands/messaging/messaging.mjs`, and `aof --help` lists them under `Messaging:`.
`discord` is the only channel type accepted. Any other type is refused `messaging-unknown-channel`.

### A machine-wide, owner-only webhook store
A Discord webhook URL is kept in one file, `<global home>/messaging/discord.secret`, written
atomically. On POSIX the file is `0600` and its directory `0700`. `src/notify/secret.mjs` is the
only module that knows its path. FF-13106's store-path leg holds that.

### A URL that never passes through argv or output
`init discord` reads the URL only from a hidden `password` prompt on a TTY, or from the first line
of stdin. A positional after the type is refused `messaging-secret-in-argv`. The URL is validated
against Discord's four webhook hosts over https. No output, JSON answer or degrade message of any
verb contains it.

### A per-project switch that writes only `work.notify`
`enable discord` adds `work.notify.channels.discord = { type: "discord" }`, and `disable discord`
removes every channel of that type. Neither changes any key outside `work.notify`, and neither ever
writes a `url`, `webhook` or `token` key. Both are idempotent, and both are refused
`messaging-no-project` outside a project.

### A status that reports presence, never value
`messaging status` reports three facts per type: stored on this machine, env override set, and
enabled in this project. `--json` answers the same facts. It never reads the stored value.

### A send that reads the store every time, with no restart
`notify` resolves a channel's URL on every send. A non-blank `env[urlEnv]` wins. Otherwise it reads
the store. Otherwise it degrades `notify-channel-unconfigured`, naming both remedies. A running
daemon picks up an `init` without a restart.

## Assumptions

- **The process's global home is the operator's** — the store follows `AOF_GLOBAL_HOME` of the
  sending process, never an `env` handed to `notify`. A daemon started under a different global home
  reads a different store.
- **win32 owner-only is inherited, not asserted** — on Windows no mode is set. The file relies on
  the user profile's owner-only ACL.
