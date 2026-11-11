Feature: The documentation rewrite preserves its boundaries and all wiki citations resolve

  @manual @docs @work @memory
  Scenario: The optional auto-memory documentation is preserved verbatim
    Given the original section from "Optional source: your local Claude auto-memory" to the next peer heading is retained
    When I compare that section before and after the rewrite
    Then its bytes are identical
    And changes to other wiki pages, if any are explicitly declared, repair only unresolved source citations
    And no memory index source set or runtime asset is changed

  @manual @docs @work @memory
  Scenario: Every top-level wiki page passes the source citation inventory
    When I enumerate every direct wiki Markdown page against the project root
    And I resolve its concrete local source citations with the shared grammar, current history and resolver
    Then the inventory names every inspected page and reports zero unresolved source citations
    And every source link changed in memory.md points to a current full project path
    And the recorded evidence distinguishes an unavailable history read from an empty history
