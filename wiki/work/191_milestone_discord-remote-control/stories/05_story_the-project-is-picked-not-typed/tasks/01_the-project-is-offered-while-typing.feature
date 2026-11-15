@executable @cli @work @work-stream
Feature: the project is offered, never refused, while typing

  WHY. On a phone, picking beats typing. The offer comes from the same allowlist that guards the
  command, so it never suggests a project the user could not then address. Autocomplete only
  suggests: the command still validates what arrives (ADR-006 §2).

  Background:
    Given a channel serving "aof" (id "ws-a") and "notes" (id "ws-n")

  Scenario: an autocomplete answers without a deferral or a verb
    Given the user is allowed on both projects
    When an autocomplete interaction for `/status` arrives with "project" focused and value ""
    Then the callback is type 8 with choices [{name:"aof",value:"ws-a"},{name:"notes",value:"ws-n"}]
    And nothing was deferred and no verb was invoked

  Scenario: a prefix match ranks above a containment match
    Given projects "taof" and "aof", the user allowed on both
    When the user types "aof"
    Then the choices are "aof" then "taof"

  Scenario: never more than 25 choices
    Given 30 projects served by the channel, the user allowed on all
    When the user types ""
    Then the callback carries exactly 25 choices

  Scenario Outline: an interaction from nowhere useful gets an empty list
    When an autocomplete interaction arrives <where>
    Then the callback is type 8 with choices []

    Examples:
      | where                            |
      | from a direct message            |
      | from a channel no project serves |

  Rule: R2 · The list offers only projects the user may address

    Scenario: E3 · a user allowed on one project is offered only that one
      Given the user is allowed on "aof" only
      When the user types "" and then "a"
      Then both offers are [{name:"aof",value:"ws-a"}]

    Scenario: E4 · a user on no allowlist is offered nothing, and nothing is posted
      Given the user is on no allowlist
      When the user types "a"
      Then the callback is type 8 with choices []
      And no refusal text is posted

    Scenario: E5 · case is ignored
      Given the user is allowed on both projects
      When the user types "NO"
      Then the choices are [{name:"notes",value:"ws-n"}]
