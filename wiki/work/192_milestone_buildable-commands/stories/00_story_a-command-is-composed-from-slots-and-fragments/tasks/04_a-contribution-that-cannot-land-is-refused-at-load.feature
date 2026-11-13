@executable @cli @assets @validate
Feature: A contribution that cannot land is refused at load

  WHY. A fragment that names a slot nobody carries would render nothing and say nothing, and the
  practice's author would learn of it from a user. So a contribution that cannot land stops the
  load, and the message names the member and the package that contributed it, as the loader
  already does for a duplicate member id (ADR-002 §6).

  Each case hands the loader one fixture bundle fragment, contributed by "@aof/planted-practice",
  that is sound except for the one fault named.

  Scenario Outline: a faulty contribution is refused, naming the member and its package
    Given a bundle fragment in which <fault>
    When the bundle is loaded
    Then the load is refused
    And the message names <named> and "@aof/planted-practice"

    Examples:
      | fault                                                                 | named                          |
      | a fragment names a practice no bundle declares                        | the fragment and the practice  |
      | a fragment names a target no bundle declares                          | the fragment and the target    |
      | a fragment names a slot no text of its target carries                 | the fragment and the slot      |
      | a slot is carried by the Codex procedure and the fragment has no Codex body | the fragment and "codex" |
      | a fragment has a Codex body for a slot the Codex texts do not carry   | the fragment and "codex"       |
      | a fragment's body file is missing                                     | the fragment and the file      |
      | a fragment's body file holds no section for its slot                  | the fragment and the section   |
      | a fragment replaces a fragment contributed by another package         | both fragments                 |
      | a fragment replaces a fragment of another slot                        | both fragments                 |
      | a fragment replaces a fragment that does not exist                    | the fragment and the missing id|
      | a practice is declared with an empty list of keys                     | the practice                   |
      | a practice id is already declared by another contributor              | the practice and both packages |
      | a fragment's id is already declared by another member                 | the member and both packages   |

  Scenario: a slot name repeated in one source is refused
    Given a fixture command whose source carries the marker for "demo.notes" twice
    When the bundle is loaded
    Then the load is refused, naming the command and the slot

  Scenario Outline: a line that is not a well-formed marker is ordinary text
    Given a fixture command whose source holds the line <line>
    When the bundle is loaded and rendered
    Then the line is rendered as written

    Examples:
      | line                                        |
      | <!-- slot: -->                              |
      | <!-- slot:Demo.Notes -->                    |
      | text before <!-- slot:demo.notes --> it     |
      | <!-- a comment that mentions a slot -->     |

  Scenario: a sound contribution loads, and the shipped bundle still loads
    Given the fixture fragment with no fault
    When the bundle is loaded
    Then the load succeeds
    And loading the shipped bundle succeeds
