@executable @docs @assets @scaffold
Feature: The reference says how to ship a variant

  WHY. The author of milestone 193's template variants reads one page to learn how a practice
  adds prose. The variant is the other half of that, and belongs on the same page (ADR-004).

  Scenario Outline: the page answers each question about a template variant
    When "wiki/reference/practice-prose.md" is read
    Then its section on template variants says <answer>

    Examples:
      | answer                                                                              |
      | how a variant member names its practice, the template and the file, with one written out |
      | that the variant is installed at the default's own path when the practice is on     |
      | that the default is installed when the practice is off                              |
      | that two variants of one file cannot both be on                                     |
      | that a person's edit to an installed template is kept, as for any managed file      |

  Scenario: the specimen on the page is one the loader accepts
    Given the variant specimen on the page, taken out of its code block
    When it is handed to the loader beside the shipped story template and a declared practice
    Then the load succeeds

  Scenario: the page stays one page
    When "wiki/reference/practice-prose.md" is read
    Then it is at most 150 lines
