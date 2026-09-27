# Setting up the aof Discord bot

aof has its own Discord bot. It posts to a channel you choose when a driven loop needs you: when
a session asks a question, when someone answers it, when an unanswered lane is parked, when the
loop halts, dies or is relaunched, and when a milestone is accepted. Setup takes three steps:
create the bot once in the Discord Developer Portal, store its token once per machine, and turn it
on per project with the id of the channel to post to.

This guide covers the setup. The design is in milestone 131's `ARCHITECTURE.md`: ADR-007 (the bot
posts, and replaces the webhook), ADR-005 (the notifier) and ADR-006 (the answer path).

> **Coming from the webhook?** aof no longer posts through an incoming webhook, and there is no
> fallback to one. `aof messaging init discord` now refuses a webhook URL. Create the bot below,
> run `init` with its token, and re-run `aof messaging enable discord --channel <channel-id>` in
> each project, because a channel enabled before this needs a channel id. You can delete the old
> webhook in Discord.

## How it fits together

| Piece | Where it lives | Committed? |
|---|---|---|
| The bot token (the secret) | `<aof home>/messaging/discord.secret`, written by `aof messaging init discord` | No. It is machine-wide, outside every checkout, and owner-only (`0600` on POSIX) |
| The channel id | `work.notify.channels.discord.channelId` in the project's `.aof/aof.config.json`, written by `aof messaging enable discord --channel <channel-id>` | Yes. An id is not a secret |
| The per-project switch | the `work.notify` block itself | Yes. It never holds a URL, webhook or token |
| An optional override | the env var `AOF_DISCORD_BOT_TOKEN` (or the name a channel's `tokenEnv` gives) | No |

**The token is the credential.** It never enters argv, config, logs or command output. aof reads it
at the moment of each send, so a running daemon or loop picks up a newly stored token without a
restart. Posting is one HTTPS request per message and needs no running bot process.

## 1. Create the bot in the Developer Portal

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and choose
   **New Application**. Name it `aof`, or any name you will recognise in the member list, and
   accept the terms.
2. Open **Bot** in the left menu. Every new application already has a bot user. Set its username
   and avatar here if you like. These are what the messages show.
3. Still on **Bot**, choose **Reset Token**, confirm, and **Copy** the token. Discord shows it only
   once. Do not paste it into a chat, a file in a checkout, or a command line. Step 2 reads it from
   a hidden prompt.
4. Still on **Bot**, turn **Public Bot** off, so that only you can add it to a server.
5. Under **Privileged Gateway Intents** on the same page, turn on **Message Content Intent** and
   save. Posting does not need it. Answering by reply (below) does, because without it a
   bot receives replies with their text removed. Turning it on now means you do not have to come
   back.
6. Open **General Information** and note the **Application ID**. You only need it in the unusual
   case described under "The invite URL" below.

## 2. Store the token on this machine

On every machine that runs loops, run:

```
aof messaging init discord
```

In a terminal it asks `Discord bot token:` and echoes nothing as you paste. From a script, pipe
the token on stdin instead, for example from a password manager's CLI. It is never accepted as an
argument, because argv lands in shell history and the process list. The output is:

```
Stored the Discord bot token for this machine at <aof home>/messaging/discord.secret.
Invite the bot to your server: https://discord.com/oauth2/authorize?client_id=<application-id>&scope=bot+applications.commands&permissions=2147552320
Switch it on per project with `aof messaging enable discord --channel <id>`.
```

- `init` checks only the token's shape, offline, and makes no network call. A value that is not
  a bot token, such as a webhook URL, is refused with `messaging-token-invalid` and nothing is
  stored. A wrong but well-formed token shows up on the first send as a `401`
  (`notify-delivery-failed`).
- Running `init` again replaces the stored token and says `Replaced`.
- This is per machine. A mesh worker does not need the token. One bot serves the whole mesh from
  the control node.

### The invite URL

`init` builds the invite URL from the token itself, because a bot token's first segment encodes
the bot's id. It asks for the `bot` and `applications.commands` scopes and these permissions:

| Permission | Bit | Why |
|---|---|---|
| VIEW_CHANNEL | `1 << 10` | see the channel it posts to |
| SEND_MESSAGES | `1 << 11` | post the notifications |
| ADD_REACTIONS | `1 << 6` | acknowledge an answer given by reply |
| READ_MESSAGE_HISTORY | `1 << 16` | read the message a reply points at |
| USE_APPLICATION_COMMANDS | `1 << 31` | the slash commands |
| **total** | `2147552320` | the `permissions=` value |

For every application created since 2016, the bot's id equals the **Application ID**, so the URL
is right as printed. If yours ever differ, replace the `client_id=` value with the Application ID
from **General Information**.

Open the URL in a browser, choose your server, keep every permission ticked, and **Authorize**.
You need **Manage Server** on that server to add a bot. On someone else's server, send the URL to
an admin.

## 3. Choose the channel and turn it on for a project

1. In Discord, create a text channel for aof, for example `#aof`. Every question a session asks is
   posted verbatim, and it can name files, decisions and code, so make it **Private** and add only
   the people who may answer. Then add the bot too: **Edit Channel → Permissions → Add members or
   roles** → the bot. A private channel hides itself from the bot unless you do.
2. Turn on **Developer Mode** (**User Settings → Advanced → Developer Mode**). Right-click the
   channel and choose **Copy Channel ID**.
3. In the project's root, run:

   ```
   aof messaging enable discord --channel <channel-id>
   ```

   ```
   Enabled discord on channel <channel-id> for this project in <project>/.aof/aof.config.json.
   ```

   This adds `{ "channels": { "discord": { "type": "discord", "channelId": "<channel-id>" } } }`
   under `work.notify` and changes nothing else. Commit the config change like any other. Running
   it again with the same id changes nothing. A different id adds a second channel,
   `discord-2`. Without `--channel` it is refused with `messaging-channel-id-required`, and an id
   that is not 17 to 20 digits with `messaging-channel-id-invalid`.

   To let people answer by reply and run the slash commands in the same step, add their Discord
   user ids (right-click a name → **Copy User ID**), comma-separated:

   ```
   aof messaging enable discord --channel <channel-id> --allow <user-id>,<user-id>
   ```

   ```
   Enabled discord on channel <channel-id> for this project in <project>/.aof/aof.config.json.
   Added 2 user ids to the answer list of "discord" (2 may answer by reply).
   ```

   `--allow` only ADDS to the channel's `allow` list: ids already there stay, and running it again
   with the same id changes nothing. An id that is not 17 to 20 digits is refused with
   `messaging-allow-invalid`, and nothing is written. To remove someone, edit the file.

To turn it off: `aof messaging disable discord`. To stop sending from a machine entirely, delete
`<aof home>/messaging/discord.secret`. No verb removes it.

## 4. Check it

```
aof messaging status
```

```
discord
  this machine: set (<aof home>/messaging/discord.secret)
  env override AOF_DISCORD_BOT_TOKEN: not set
  this project: enabled (discord → <channel-id>)
```

`status` reports only whether a token is present, never its value. `--json` returns the same
facts, with the channel ids in `project.channelIds`. Once a channel has an `allow` list (see
"Answering by reply" below), its line adds `, N may answer by reply` (`project.allowCounts`), and
never the ids themselves. `<aof home>` is `~/.aof` unless
`AOF_GLOBAL_HOME` is set.

**Send a test message.** In the project's root:

```
aof messaging test discord
```

```
Posted the Discord test message to discord → <channel-id> (message <message-id>).
```

It posts `**aof — test message** · <project>` to each discord channel of the project, through the same
checks and sender a real notification uses, and pings nobody. The token is read from the store
and never printed. When the post does not arrive, it exits non-zero with
`messaging-test-failed` and names the fix from Discord's answer:

| Discord answered | What it means | What to do |
|---|---|---|
| `401` | the token is wrong or was reset | `aof messaging init discord` with the current token |
| `403` | the bot cannot see or post in the channel | invite it with the URL `init` printed, and give it View Channel and Send Messages in the channel |
| `404` | the channel id is wrong, or the bot is not in that server | copy the id again (Developer Mode → Copy Channel ID) |

With no token stored, or no discord channel enabled, it posts nothing and names the command to
run. Accepting a milestone (`aof work status <NN> done`) is the end-to-end check through aof
itself, and posts `**<NN> — accepted**` with the title.

## What the messages look like

Every message uses the same headline as the terminal and the board, `**<ref> — <phrase>** (<phase>,
<elapsed>)`, then ` · <project>` and ` · <node>`, then a body, then the action. The project is the
config's `name`, else the project's folder, so one channel can serve several projects:

```
**03/00 — waiting on you** (build, 12s) · my-project · node-7297
Decision needed: … Options: … I would pick: … What the answer changes: …
Answer: `aof work answer 03/00 "…"`
```

The seven events and their phrases are `waiting on you`, `answered by <who>`, `parked, unanswered`,
`loop halted on <stop>`, `loop died`, `loop relaunched` and `accepted`. Messages are plain text,
posted as the bot, with all mentions disabled, so a question can never ping `@everyone`. A body
over Discord's 2,000-character cap is cut, and the headline, the answer command and the link are
always kept.

## Answering by reply in Discord

A person on the project's answer list can answer a waiting session by **replying** to the bot's
question message. Discord's own Reply works, and so does swiping the message on a phone. The reply's
text is the answer, verbatim. It goes through the same path as `aof work answer`: the same checks,
the first answer wins, and `answered by …` is posted. The record says the answer came via Discord.

**Nobody can answer from Discord until you set `allow`.** A reply from anyone else is refused
visibly, and nothing changes.

### What it needs

1. **The Message Content intent** (step 1.5 above). Without it the bot cannot read a reply's text,
   and Discord closes its connection. The loop's degrade line then shows
   `discord-intent-disallowed`, naming the toggle. Turn it on, then restart the desktop app.
2. **A running control node.** The bot's connection lives in the control node's serve daemon, which
   the desktop app runs. Replies are read only while the desktop app is running. The daemon
   starts the bot only if it finds a token when it starts, so after your first
   `aof messaging init discord`, restart the desktop app once. Without a token it logs
   `discord-bot-off` and starts without the bot. Posting still works without the bot, because each
   post is a plain request.
3. **Each person's Discord user id.** With **Developer Mode** on (step 3.2), right-click the
   person's name and choose **Copy User ID**.
4. **The `allow` list**, on the channel in the project's `.aof/aof.config.json`. Add ids with
   `aof messaging enable discord --channel <channel-id> --allow <user-id>` (step 3), or edit the file:

   ```json
   "notify": {
     "channels": {
       "discord": {
         "type": "discord",
         "channelId": "111111111111111111",
         "allow": ["222222222222222222"]
       }
     }
   }
   ```

   Replace the two placeholders with your channel id and the user ids. `allow` holds unique ids of
   17 to 20 digits. When it is non-empty, the bot's question messages read
   ``Answer: reply to this message, or `aof work answer <ref> "…"` ``.

### What the bot does with a reply

| The reply | What the bot does |
|---|---|
| from someone on `allow`, and the session is waiting | answers it, and adds ✅ to the reply. `answered by @<name>` is posted as usual |
| from someone not on `allow` | replies: *You are not on this project's answer list (`work.notify.channels.discord.allow`), so the answer was not taken.* |
| `allow` is absent or empty | replies: *Answering from Discord is off for this project — nobody is on its answer list (`work.notify.channels.discord.allow`). Nothing was changed.* |
| the ask was already answered | replies: *`<ref>` was already answered by @<name> <how long ago> — the first answer stands.* |
| the session is no longer waiting | replies: *`<ref>` is no longer waiting on an answer — nothing was changed.* |
| longer than 8,000 characters | replies: *The answer is too long — at most 8,000 characters. Nothing was changed.* |
| empty (an attachment only) | replies: *The answer is empty — reply with what the session should do.* |
| from a bot, not a reply, a reply to a message that is not one of the bot's questions, or in another channel | nothing at all |

The bot's replies ping nobody. The answer is recorded as `@<username>`, never as a user id,
because run records can be committed to a public repository. A question can be answered by reply
for 30 days after it was posted.

## Slash commands

The bot answers four commands in an aof channel. They use the `applications.commands` scope and
the USE_APPLICATION_COMMANDS permission, which the invite URL already grants, so the bot needs no
second invite. The commands appear in a server once the bot is connected: the control node
registers them in every server an aof channel lives in when it connects, and checks again every
hour.

| Command | Options | What it does | Reply |
|---|---|---|---|
| `/status` | `workspace` (optional) | lists what is in progress in each project, with its execution and node and any question waiting | only you see it |
| `/asks` | `workspace` (optional) | lists the questions waiting or parked, each with a link to the bot's question message | only you see it |
| `/loop stop` | `scope`, `workspace` (optional) | asks the loop for that scope to stop. The first request drains, and a second cancels the session in flight | the channel sees it |
| `/loop resume` | `scope`, `workspace` (optional) | hands a halted supervised loop back to the desktop app, which relaunches it with `--resume` on its next poll | the channel sees it |

**Who can run them.** A command reaches only the projects whose Discord channel is the one it is
run in, and only for people on that channel's `allow` list (see "Answering by reply" above). A
command in a channel no project uses answers *This channel is not an aof project channel*. Someone
not on any `allow` list gets a refusal ending `(discord-command-not-allowed)`, and nothing runs. A
command sent in a direct message is refused, because a direct message names no project.

**Several projects in one channel.** `/status` and `/asks` show one section per project. `/loop`
acts on exactly one project, so name it with `workspace:` (its folder name or its workspace id).
Without it, a channel that reaches several projects refuses with `(discord-scope-ambiguous)` and
names each one.

**What the loop commands say.** `/loop stop` answers in the channel with who asked:

- `@<name> asked <scope> to stop — draining (a second /loop stop cancels the in-flight session)`
- `@<name> asked <scope> to stop — cancelling the in-flight session`
- `@<name> asked <scope> to stop — not running — marked stopped; /loop resume clears it`

`/loop resume` answers `@<name> handed <scope> to the supervisor — it relaunches with --resume on
its next poll`.

**`/loop resume` starts nothing itself.** It asks the supervisor: it writes a request that the
desktop app reads on its next poll, and the desktop app relaunches the loop with `--resume`. So it
needs two things:

- the loop was started with `--supervised`, and
- the desktop app is running on the control node.

An unsupervised loop is refused, `loop-hand-off-not-supervised`, and the refusal names the command
to run in a terminal instead: `aof work loop <scope> --resume`. A loop that is still running is
refused, `loop-hand-off-running`, and one that last ran on another node is refused,
`loop-hand-off-not-local`: hand it back on that node. From a terminal, the same hand-off is
`aof work loop <scope> --hand-off`.

## Options

All of these go in the project's `.aof/aof.config.json`, under `work.notify`:

```json
"notify": {
  "channels": {
    "discord": {
      "type": "discord",
      "channelId": "<channel-id>",
      "events": ["session-needs-input", "session-parked-unanswered", "loop-halted"],
      "tokenEnv": "MY_TEAM_BOT_TOKEN"
    }
  },
  "link": "https://example.test/board#{ref}"
}
```

- `channelId` is required: the channel the bot posts to.
- `events` sends only the listed events (default: all seven).
- `tokenEnv` names the env var that overrides the stored token when it is set and not blank
  (default `AOF_DISCORD_BOT_TOKEN`). This is how CI or a one-off shell can post as a different bot.
  A blank value falls through to the store.
- `link` adds a link line, with every `{ref}` filled in. It is off by default because the board
  runs on an ephemeral loopback port that a phone cannot open.

## When nothing arrives

Delivery is best-effort. Each send is bounded at 5 seconds and never retried, and it never fails
or blocks a run. A failure is reported once, by name, on the loop's degrade line:

| Code | Meaning | Fix |
|---|---|---|
| `notify-channel-unconfigured` | this machine has no token, the stored value is not a bot token (for example an old webhook URL), or the channel has no `channelId` | the message names the fix: `aof messaging init discord`, or `aof messaging enable discord --channel <channel-id>` |
| `notify-delivery-failed` | Discord refused the post or it timed out (the HTTP status or error name is given, never the token) | `401`: reset the token and re-run `init`. `403`: add the bot to the channel. `404`: check the channel id |
| `notify-rate-limited` | Discord returned 429 | nothing. Messages resume once the limit clears, and a dropped message is not re-sent |

Also check:
- **No `work.notify` in the project** means no network calls at all. Run `aof messaging status` in
  the project root.
- **The loop runs on another machine.** The token must be stored on the machine that posts. Until story 12
  lands, an ask from a mesh worker is answerable but is not posted to Discord.
- **An env override is set**: it wins over the store. `status` shows `env override …: set`.

### When a reply is not answered

The bot reports its connection problems on the control node's daemon log, once each, by name:

| Code | Meaning | Fix |
|---|---|---|
| `discord-bot-off` | the daemon found no bot token when it started, so it did not start the bot | `aof messaging init discord`, then restart the desktop app |
| `discord-intent-disallowed` | Discord refused the Message Content intent (close 4014) | turn on **Message Content Intent** in the Developer Portal, then restart the desktop app |
| `discord-token-rejected` | Discord rejected the token (close 4004) | reset the token, re-run `init`, then restart the desktop app |
| `discord-identify-budget` | the bot has nearly used its daily connection allowance | nothing. It waits for Discord's reset and connects then |
| `notify-ask-index` | a question was posted, but its message could not be recorded, so a reply to it is ignored | check that `<aof home>/messaging/` is writable, and answer that one from the terminal |
