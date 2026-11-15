@executable @docs @assets @distribution
Feature: The reference says how to write a slot and a fragment

  WHY. Milestone 193 writes the first new practice prose as fragments, and its author has only
  this milestone's ADRs to go on. One short reference page says how, in the order an author needs
  it, so the next practice does not read the loader to find out (ADR-001, ADR-002, ADR-003).

  Scenario: the page exists and says what it is for
    When "wiki/reference/practice-prose.md" is read
    Then its opening says a practice adds prose to a command or a role brief through a slot and a fragment
    And it says a project is given the prose only when it has turned the practice on

  Scenario Outline: the page answers each question an author has
    When "wiki/reference/practice-prose.md" is read
    Then it says <answer>

    Examples:
      | answer                                                                                   |
      | what a slot marker looks like, with one written out                                      |
      | that a block slot has a blank line above it and an inline slot does not, and what each leaves when empty |
      | that a slot added to a command goes into its Codex text too                              |
      | how a bundle fragment declares a practice and its keys, with one written out             |
      | how a fragment member names its practice, target and slot, with one written out          |
      | where a fragment's body lives, and how one file holds several slots' bodies              |
      | that a Codex body is written by hand, in that runtime's wording                          |
      | what decides the order of two fragments in one slot                                      |
      | how a fragment replaces another, and that it may replace only its own package's          |
      | that only the boolean true in the project's own config file turns a key on               |
      | that the project runs "aof work update" after changing a key                             |

  Scenario: every specimen on the page is one the loader accepts
    Given each bundle fragment specimen on the page, taken out of its code block
    When it is handed to the loader beside a fixture member that carries the slot it names
    Then the load succeeds

  Scenario: the page restates no decision's reasoning
    When "wiki/reference/practice-prose.md" is read
    Then it is at most 150 lines
    And it points at this milestone's ARCHITECTURE for why, and holds no "Alternatives" section
