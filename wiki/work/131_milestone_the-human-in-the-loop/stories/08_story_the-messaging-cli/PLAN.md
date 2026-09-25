# 08 · The messaging CLI — build plan

## Mechanism

One new leaf, one new command module, and one changed line of resolution in `deliver`.

1. **The store first (task 01).** `secret.mjs` is the only code that joins the `messaging`
   segment into a path. Build the path from `defaultGlobalWorkspaceDir(process.env)`, never from
   an injected `env`. Write to a temp file in the same directory and rename it. Re-apply
   `chmod 0600` / `0700` after the rename on non-win32. A read trims, and answers `null` on any
   failure. Put `isDiscordWebhookUrl` in `discord.mjs` as an escaped pattern, and hang it on the
   `CHANNELS.discord` entry as `accepts`, so that the command validates through the registry and
   not by type name.
2. **The send (task 05).** In `deliver`, replace the single `env?.[channel.urlEnv]` read with
   "the env value if not blank, else `readMessagingSecret(channel.type)`". Keep the redaction pass
   keyed on whichever URL was used. Reword the unconfigured degrade so it names both remedies.
   That is the whole runtime change. Stories 03 and 04's firing sites do not move.
3. **The command (tasks 00, 02–04).** Write one module that exports four Command objects, each
   registered by one import and one list entry in `command-core.mjs`, the way
   `commands/mesh/desktop.mjs` exports its three. `init`'s argv adapter is where input is read:
   refuse any extra positional first, then use the injectable prompt seam on a TTY (`password`
   from `@inquirer/prompts`, loaded lazily as `promptOrchestratorModel` does), or the first
   line of stdin otherwise. The adapter hands `run()` the URL under a key that no render prints.
   `enable`/`disable` go through `findProjectConfig` and delegation's `readConfig`/`writeConfig`,
   and touch only `config.work.notify`. `status` calls `messagingSecretPresent` and a
   non-blank check on the env var. It never calls `readMessagingSecret`.
4. **The register (task 05, ruling 4).** Widen FF-13106's env-read leg to admit
   `readMessagingSecret(`, and add the store-path leg. Probe it by joining `"messaging"` in the
   command module, observe that leg red, restore the module, and record the probe in
   VERIFICATION's fitness register the way 06 did.

## Verification step

Under an isolated `AOF_GLOBAL_HOME`, run `test/notify/index.mjs`,
`acd-loop-ask-reaches-every-face` and `acd-source-directory-budget` through
`node scripts/test.mjs --only`. Then run one hand probe from a temp project with the source CLI.
Pipe a fixture URL into `aof messaging init discord`, then run `aof messaging enable discord` and
`aof messaging status --json`, and grep all three outputs for the token segment. Expect no hits.
Then start a `127.0.0.1:0` server answering 204, store ITS URL with `init`, and accept a fixture
milestone with `work:status`. One POST arrives with no env var set and no restart in between. A
wrong build shows as the token in an output, a written `url` key, or an `unconfigured` degrade
while a URL is stored.

The hand probe's server URL is not Discord-shaped, so `init` refuses it. Write it with
`writeMessagingSecret` from a one-line node script instead. That tests the send path, not the
shape check.

## Out of scope

- Re-authoring 07's precondition to `init` + `enable`. That is 07's re-refine.
- A second channel type, a verb that deletes the stored URL, and a mesh worker's secret.
- A `work.notify` block in this repository's committed `.aof/aof.config.json`.

## Known traps

- `reportDegrade` throttles per code for 5 s. The no-restart case asserts one
  `notify-channel-unconfigured` and then a delivery, so reset the sink between legs as the
  existing cases do.
- `src/notify/`'s FF-13106 sweep also bans the literal `discord.com/api/webhooks` in `src/**`. The
  shape pattern must escape its dots.
