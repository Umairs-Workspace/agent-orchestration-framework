@cli @work
Feature: the global channel is set, shown and tested from `aof messaging`

  WHY. A config key nobody can discover is one nobody adopts. The operator sets the global channel
  with the verb they already know, plus `--global`, and `status` says where each project's channel
  comes from, so "why is this project posting there?" has an answer on screen.

  THE FIXTURE BELOW: `AOF_GLOBAL_HOME` is a fresh temp dir with a stored synthetic bot token, and,
  unless a scenario says otherwise, no `aof.config.json`. Discord is a fake HTTP seam.

  Rule: R4 · The global channel is set and read from the CLI

    @executable
    Scenario: E8 · enable --global writes the global config and no project
      Given the working directory is a temp dir with no ".aof" above it
      When "aof messaging enable discord --channel 1571198918107078736 --allow 1119197349521137757 --global" runs
      Then it exits 0
      And the global "aof.config.json" has "work.notify.channels.discord" equal to { "type": "discord", "channelId": "1571198918107078736", "allow": ["1119197349521137757"] }
      And no ".aof/aof.config.json" exists under the working directory

    @executable
    Scenario: enable --global keeps every other key of an existing global config
      Given the global "aof.config.json" holds "mesh.fabric" "direct" and "mesh.relay.controlNode" "node-6eb3"
      When "aof messaging enable discord --channel 1571198918107078736 --global" runs
      Then the global "aof.config.json" still holds "mesh.fabric" "direct" and "mesh.relay.controlNode" "node-6eb3"
      And it holds no "url", "webhook" or "token" key anywhere

    @executable
    Scenario: enable --global run inside a project still writes only the global config
      Given project A has a config with no "work.notify"
      When "aof messaging enable discord --channel 1571198918107078736 --global" runs in project A
      Then project A's config is byte-identical
      And the global "aof.config.json" has "work.notify.channels.discord" on channel "1571198918107078736"

    @executable
    Scenario Outline: E9 · status says where each project's discord channel comes from
      Given the global "aof.config.json" has "work.notify.channels.discord" on channel "1571198918107078736"
      And <project>
      When "aof messaging status" runs there
      Then the discord entry's global line reads "enabled (discord → 1571198918107078736)"
      And its project line reads <project line>
      And "--json" reports the project's channels with "from" <from>

      Examples:
        | project                                                              | project line                                                     | from        |
        | the working directory is project A, which has no "work.notify"      | "enabled (discord → 1571198918107078736, from the global config)" | "global"    |
        | the working directory is project B, with its own channel 1580000000000000001 | "enabled (discord → 1580000000000000001)"                        | "project"   |
        | the working directory is project C, with "work.notify.channels" {}   | "disabled here (the global channel is switched off)"             | "project"   |
        | the working directory has no ".aof" above it                         | "no project here"                                                | null        |

    @executable
    Scenario: E10 · test in a project that inherits the global channel posts to it
      Given the global "aof.config.json" has "work.notify.channels.discord" on channel "1571198918107078736"
      And project A has no "work.notify"
      When "aof messaging test discord" runs in project A
      Then exactly one test message is posted, to channel "1571198918107078736"
      And it exits 0

    @executable
    Scenario: E11 · disable --global removes the global channels and touches no project
      Given the global "aof.config.json" has "work.notify.channels.discord" on channel "1571198918107078736" and "mesh.fabric" "direct"
      And project B declares its own channel "1580000000000000001"
      When "aof messaging disable discord --global" runs in project B
      Then the global "aof.config.json" has no "work.notify" and still holds "mesh.fabric" "direct"
      And project B's config is byte-identical

    @executable
    Scenario: disable --global with no global channel changes nothing and says so
      Given the global "aof.config.json" has no "work.notify"
      When "aof messaging disable discord --global" runs
      Then it exits 0, reporting discord is not enabled globally and nothing changed
      And no global "aof.config.json" is created

    @executable
    Scenario: a channel the bot cannot place points at both ways to enable one
      Given no served project and no global config names channel "1599999999999999999"
      When user "1119197349521137757" runs "/loop status" in channel "1599999999999999999"
      Then the answer names "aof messaging enable discord --channel <id>" and "--global"

    @manual
    Scenario: on this MacBook, a real project with no channel of its own posts to the real global channel
      Given this machine's stored bot token, and "aof messaging enable discord --channel <the operator's channel> --global"
      And a project whose config has no "work.notify"
      When "aof messaging test discord" runs in that project
      Then the test message appears in the operator's Discord channel
      And "aof messaging status" in that project says the channel comes from the global config
