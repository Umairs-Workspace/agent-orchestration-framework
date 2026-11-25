@cli @adapter @board
Feature: Use a project-supplied board through the work store
  Rule: R3 · A project supplies the required operations and can omit optional capabilities
    @executable
    Scenario: E5 · A second board supplies a story through its own bindings
      Given a fresh project selects .aof/boards/team.yaml which binds reads to listCards
      And its sibling module returns card 71 as story 17/00 under 17 depending on 16
      When I find 17/00 through the installed CLI
      Then its identity, title and parent match the card
      And the selected store's record read reports dependency 16 and the supplied revision

    @executable
    Scenario: E6 · Tracking works with both optional capabilities omitted
      Given the fixture board supplies only the three required operations
      When I list its work and read a selected item
      Then both reads succeed and the adapter receives no probe or attachment request

    @executable
    Scenario Outline: A mapped operation preserves the request and reply across the store boundary
      Given the project module records requests and returns a distinguishable reply per binding
      When the selected store requests <operation> with <input>
      Then the corresponding binding receives that input and its caller observes <reply>

      Examples:
        | operation      | input                                               | reply                         |
        | selected read  | board ID 71                                         | mapped values and revision 8  |
        | change read    | opaque cursor c17                                   | revision 9 and cursor c18     |
        | guarded change | intent k3, ID 71, revision 8, new title and parent  | applied ID 71 and revision 9  |
        | guarded change | intent k4, ID 71, stale revision 7                  | refusal for ID 71             |
