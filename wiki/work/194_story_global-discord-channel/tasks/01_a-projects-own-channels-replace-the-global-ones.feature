@cli @work
Feature: a project's own channels replace the global ones, and a project can switch the global one off

  WHY. Some projects belong in a channel of their own, and some must not post at all. A project's
  own `work.notify.channels` therefore wins whole: its channels and its `allow` lists, never a mix
  with the global ones (194 Q1). A project declares "none here" with an empty `channels` object,
  and `aof messaging disable discord` writes exactly that while a global channel exists, so the
  global config is never edited from inside a project (194 Q2, Q5).

  THE FIXTURE BELOW: as in task 00. The global channel is "1571198918107078736", with
  `allow: ["1119197349521137757"]`.

  Rule: R2 · A project's own channels take precedence over the global ones

    @executable
    Scenario: E5 · a project with a channel of its own posts there only
      Given project B declares "work.notify.channels.discord" on channel "1580000000000000001"
      When a "loop-stopped" notification is sent for project B
      Then exactly one message is posted, to channel "1580000000000000001"
      And nothing is posted to channel "1571198918107078736"

    @executable
    Scenario: E6 · a project's own allow list replaces the global one on the same channel
      Given project B declares "work.notify.channels.discord" on channel "1571198918107078736" with "allow" ["1200000000000000002"]
      And project B's open ask was posted to channel "1571198918107078736"
      When user "1200000000000000002" replies to that message
      Then the answer is recorded on project B's ask
      And when user "1119197349521137757" replies to that message, it is refused naming project B's "work.notify.channels.discord.allow"

  Rule: R3 · A project can switch the global channel off for itself

    @executable
    Scenario: E7 · disabling discord in a project that only inherits the global channel records "none here"
      Given project C has no "work.notify"
      When "aof messaging disable discord" runs in project C
      Then project C's config has "work.notify.channels" equal to {}
      And the global "aof.config.json" is byte-identical
      And when a "loop-stopped" notification is sent for project C, nothing is posted

    @executable
    Scenario: disabling a project's own channel while a global one exists leaves "none here", not the global channel
      Given project B declares "work.notify.channels.discord" on channel "1580000000000000001"
      When "aof messaging disable discord" runs in project B
      Then project B's config has "work.notify.channels" equal to {}
      And project B's workspace loads with no channels

    @executable
    Scenario: with no global channel, disable removes the block exactly as it does today
      Given the global config has no "work.notify"
      And project B declares "work.notify.channels.discord" on channel "1580000000000000001"
      When "aof messaging disable discord" runs in project B
      Then project B's config has no "work.notify"

    @executable
    Scenario: enabling discord again in an opted-out project gives it a channel of its own
      Given project C has "work.notify.channels" equal to {}
      When "aof messaging enable discord --channel 1580000000000000001" runs in project C
      Then project C's "work.notify.channels.discord" is on channel "1580000000000000001"
      And the global "aof.config.json" is byte-identical
