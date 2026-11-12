@executable @cli @work @work-stream
Feature: the right notifications carry buttons

  WHY. Buttons are offered only where someone can use them, the same `replyable` rule the
  answer-by-reply line follows. Each message's context is indexed by its id, so a tap never trusts
  the client for it (ADR-007 §1, §3).

  Background:
    Given a discord channel "c1" for workspace "ws-a" ("aof")

  Scenario: every custom_id comes from the one grammar
    When a halt and a two-choice ask are rendered
    Then their custom_ids are "aof:resume", "aof:session", "aof:answer:0" and "aof:answer:1"
    And `parseButtonId` reads each back to its action and index

  Scenario: a halt's message is indexed with its scope and node
    When `notify` delivers `loop-halted` for scope "191" from node "node-6eb3" and Discord answers message id "9001"
    Then the index record for "9001" holds event "loop-halted", scope "191", nodeId "node-6eb3", workspaceId "ws-a" and the project root

  Scenario: an ask's message is indexed with the choices it rendered
    When `notify` delivers `session-needs-input` with choices ["Yes, ship it", "No, hold"] and Discord answers message id "9002"
    Then the index record for "9002" holds those choices in that order

  Scenario Outline: the other events carry no buttons
    Given the channel's allowlist is ["111111111111111111"]
    When `notify` delivers <event>
    Then the posted message has no components

    Examples:
      | event                                        |
      | session-answered for item "191/02"           |
      | loop-relaunched for scope "191"              |

  Rule: R1 · A halt offers the two ways forward

    Scenario Outline: E1 · a halt or a death in an allowlisted channel carries both buttons
      Given the channel's allowlist is ["111111111111111111"]
      When `notify` delivers <event> for scope "191"
      Then the posted message carries `Resume` and `Open a session here`

      Examples:
        | example | event       |
        | E1      | loop-halted |
        | E1      | loop-died   |

    Scenario: E2 · a channel with no allowlist gets no buttons
      Given the channel has no allowlist
      When `notify` delivers `loop-halted` for scope "191"
      Then the posted message has no components

  Rule: R2 · A fixed-choice question is answered with one tap

    Scenario: E4 · a two-choice question carries one button per choice
      Given the channel's allowlist is ["111111111111111111"]
      When `notify` delivers `session-needs-input` with choices ["Yes, ship it", "No, hold"]
      Then the posted message carries buttons "Yes, ship it" and "No, hold", in that order

    Scenario Outline: E5 · a question the buttons cannot carry is answered by reply
      Given the channel's allowlist is ["111111111111111111"]
      When `notify` delivers `session-needs-input` with <choices>
      Then the posted message has no components
      And its action line says to answer by reply

      Examples:
        | example | choices                        |
        | E5      | 6 choices                      |
        | E5      | a choice of 81 characters      |
        |         | one choice, "only one"         |
        |         | no choices                     |

    Scenario: a parked question with three choices carries three buttons
      Given the channel's allowlist is ["111111111111111111"]
      When `notify` delivers `session-parked-unanswered` with choices ["A", "B", "C"]
      Then the posted message carries buttons "A", "B" and "C"
