@cli @work
Feature: a project that declares no channel of its own uses the global one, both ways

  WHY. The operator drives several projects from one Discord server. Today each project must run
  `aof messaging enable discord --channel <id>` and repeat the same `allow` ids before it notifies
  or answers anything. A channel declared once in `~/.aof/aof.config.json` should serve every
  project that has none of its own, for posting out (notifications, asks) and for answering in
  (replies, buttons, slash commands), because all of those read the workspace's loaded config.

  THE FIXTURE BELOW: `AOF_GLOBAL_HOME` is a fresh temp dir whose `aof.config.json` holds
  `work.notify.channels.discord = { type: "discord", channelId: "1571198918107078736",
  allow: ["1119197349521137757"] }`, and a stored synthetic bot token. Projects A and B are temp
  dirs with an `.aof/aof.config.json` of their own. Discord is a fake HTTP seam; nothing reaches the
  real API.

  Rule: R1 · A Discord channel declared in the global config serves every project that declares none of its own

    @executable
    Scenario Outline: a project with no channels key of its own loads the global channel
      Given project A's config <project notify>
      When project A's workspace is loaded
      Then its config's "work.notify.channels" is the global "discord" channel on 1571198918107078736
      And its config's "work.notify.link" is <link>

      Examples:
        | project notify                                                  | link                   |
        | has no "work.notify"                                            | absent                 |
        | has "work.notify.link" "https://x.test/{ref}" and no "channels" | "https://x.test/{ref}" |

    @executable
    Scenario: E1 · a loop stop in a project with no channel of its own posts to the global channel
      Given project A has no "work.notify"
      When a "loop-stopped" notification is sent for project A
      Then exactly one message is posted, to channel "1571198918107078736"

    @executable
    Scenario: a global link is not inherited, because a link names one repo
      Given the global config also sets "work.notify.link" to "https://global.test/{ref}"
      And project A has no "work.notify"
      When project A's workspace is loaded
      Then its config has no "work.notify.link"

    @executable
    Scenario Outline: a global config aof cannot use leaves a channel-less project silent and never breaks loading
      Given the global "aof.config.json" <global state>
      And project A has no "work.notify"
      When project A's workspace is loaded
      Then loading succeeds
      And its config has no "work.notify.channels"

      Examples:
        | global state                               |
        | does not exist                             |
        | is not valid JSON                          |
        | has "work.notify.channels" set to a string |

    @executable
    Scenario: E3 · an allowed user's reply in the global channel answers the asking project
      Given project A has no "work.notify"
      And project A's open ask was posted to channel "1571198918107078736"
      When user "1119197349521137757" replies to that message
      Then the answer is recorded on project A's ask, by "@<username>"

    @executable
    Scenario: E4 · a refusal for a user not on the global allow list says where to add them
      Given project A has no "work.notify"
      And project A's open ask was posted to channel "1571198918107078736"
      When user "1200000000000000002" replies to that message
      Then no answer is recorded
      And the refusal names "work.notify.channels.discord.allow" and the global config file "aof.config.json" under the aof home

    @executable
    Scenario: E2 · a slash command in the global channel reaches every channel-less project it serves
      Given projects A and B both have no "work.notify"
      And the bot serves both projects
      When user "1119197349521137757" runs "/loop status" in channel "1571198918107078736"
      Then both projects are counted on that channel and both are kept for that user
      And the command registrar registers channel "1571198918107078736" once
