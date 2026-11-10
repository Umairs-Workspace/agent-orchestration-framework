Feature: Wiki source citations have an actionable diagnostic

  Rule: R1 · Doctor reports a local wiki source file that the shared resolver cannot resolve

    @executable @cli @work @memory
    Scenario: E1 · A nonexistent source file is named at its wiki occurrence
      Given a project with a valid work stream
      And wiki/memory.md cites "src/never-existed.mjs" on line 4
      And that file has neither a current file nor a recorded destination
      When I run "aof work doctor --json"
      Then a "warn" finding with code "wiki-source-unresolved" names wiki/memory.md
      And its message includes "src/never-existed.mjs" and line 4

    @executable @cli @work @memory
    Scenario: E2 · A recorded move to an existing file keeps the citation valid
      Given wiki/memory.md cites "src/moved.mjs"
      And recorded history moves it to the existing "packages/work/src/moved.mjs"
      When I run doctor
      Then no wiki-source-unresolved finding names that citation

    @executable @cli @work @memory
    Scenario: E3 · A move whose destination was deleted remains unresolved
      Given wiki/memory.md cites "src/deleted.mjs"
      And its recorded destination "packages/work/src/deleted.mjs" no longer exists
      When I run doctor
      Then a wiki-source-unresolved warning names that citation

    @executable @cli @work @memory
    Scenario Outline: Current files and chained moves resolve without requiring old line numbers
      Given wiki/memory.md cites "<citation>"
      And its resolution evidence is "<evidence>"
      When I run doctor
      Then the wiki-source-unresolved finding count for that citation is <warnings>

      Examples:
        | citation                             | evidence                                               | warnings |
        | src/current.mjs                       | current regular file, no Git history                    | 0        |
        | ../src/current.mjs:9999                | current regular file with only 3 lines                   | 0        |
        | src/current.mjs#L9999                  | current regular file with only 3 lines                   | 0        |
        | src/first.mjs                         | first moves to second, second moves to a current file   | 0        |
        | src/loop-a.mjs                        | cyclic rename chain with no existing file               | 1        |
        | src/directory.mjs                     | only a directory with that name exists                  | 1        |
        | src/missing.mjs                       | absent file and unavailable Git history                 | 1        |

    @executable @cli @work @memory
    Scenario Outline: Local citations retain their entire source path
      Given a direct wiki page contains "<form>"
      And the literal local file named in that form is absent
      When I run doctor
      Then the page has <warnings> wiki-source-unresolved findings
      And any finding cites the full path without dropping its package or application prefix

      Examples:
        | form                                                        | warnings |
        | [implementation](../packages/work/src/absent.mjs)            | 1        |
        | inline code naming apps/ui/src/absent.tsx                    | 1        |
        | a fenced example naming src/absent.js                        | 1        |
        | [external](https://example.com/src/absent.mjs)                | 0        |
        | the family src/*.mjs                                        | 0        |
        | the directory src/                                          | 0        |
        | the non-source file test/absent.test.mjs                      | 0        |

    @executable @cli @work @memory
    Scenario: Repeated link labels and locators produce one actionable finding
      Given wiki/memory.md cites "src/missing.mjs" in a link label and target on line 4
      And it cites "../src/missing.mjs:12" again on line 9
      And the file cannot resolve
      When I run doctor twice over unchanged files
      Then each result has one wiki-source-unresolved warning for that page and file
      And both messages identify the first occurrence on line 4
      And their ordered wiki findings are identical

    @executable @cli @work @memory
    Scenario: A source file is inspected for existence without running it
      Given wiki/memory.md cites an existing src/side-effect.mjs
      And importing that module would create a marker file
      When I run doctor
      Then that citation has no unresolved finding
      And the marker file does not exist

    @executable @cli @work @memory
    Scenario: An external traversal cannot be accepted as a project source citation
      Given a direct wiki page cites a local source path with an interior traversal outside the project
      And only the external target exists
      When I run doctor
      Then the citation produces a wiki-source-unresolved warning
      And no external source content is read or executed
