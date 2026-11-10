Feature: Doctor checks the whole direct wiki surface

  Rule: R2 · Every direct wiki page is checked against the project root, including scoped doctor calls

    @executable @cli @work @memory
    Scenario: E4 · A story scope does not hide another wiki page's broken source link
      Given wiki/agents.md cites the missing "src/absent.mjs"
      And the project has story 161/01
      When I run "aof work doctor 161/01 --json"
      Then wiki/agents.md has one wiki-source-unresolved warning
      And the ordinary in-scope work findings are preserved

    @executable @cli @work @memory
    Scenario: E5 · Nested work records are outside this wiki probe
      Given every direct wiki page has resolving source citations
      And wiki/work/old/SPEC.md cites "src/absent.mjs"
      When I run doctor
      Then the wiki source probe reports no finding for wiki/work/old/SPEC.md

    @executable @cli @work @memory
    Scenario: E6 · A project without a wiki retains its existing doctor behavior
      Given a project with a valid work stream outside wiki
      And no wiki directory
      When I run doctor
      Then there is no wiki-source-unresolved or wiki-source-unreadable finding
      And the ordinary work findings are preserved

    @executable @cli @work @memory
    Scenario: All direct pages are checked, including a page added after the probe ships
      Given wiki/memory.md has no unresolved source citation
      And wiki/new-guide.md and wiki/agents.md each cite a missing source file
      When I run doctor
      Then each of those two pages has its own wiki-source-unresolved warning

    @executable @cli @work @memory
    Scenario: Finding identity is stable across working directories and work-directory configuration
      Given the project config sets work.dir to "planning/work"
      And wiki/agents.md cites a missing source file
      When I run doctor from the project root and a nested directory
      Then both results identify the same wiki page and missing citation
      And the JSON face displays the page relative to each invocation's working directory
      And no wiki directory under planning/work is searched

    @executable @cli @work @memory
    Scenario Outline: An incomplete scan reports its unavailable input
      Given the wiki scan encounters "<condition>"
      When I run doctor
      Then a wiki-source-unreadable warning identifies "<path>"
      And it does not claim that input passed citation checking
      And any other readable direct pages are still checked

      Examples:
        | condition                                      | path           |
        | permission failure listing the wiki directory   | wiki           |
        | permission failure reading one Markdown page    | wiki/agents.md |
        | a Markdown symlink pointing outside the project | wiki/agents.md |

    @executable @cli @work @memory
    Scenario: Existing strict behavior makes a wiki warning fail only the strict call
      Given an otherwise healthy project with one unresolved wiki source citation
      When I run "aof work doctor --json"
      Then the exit code is 0 and the finding has severity warn
      When I run "aof work doctor --strict --json"
      Then the exit code is 1 and the same warning is present

    @manual @cli @work @memory
    Scenario: The shipped command detects a planted citation without changing the real wiki
      Given a disposable valid project with a clean direct wiki page
      When I append a citation to "src/aof-wiki-negative-probe.mjs" on that page
      And I run the shipped doctor command normally and with --strict
      Then both outputs name the page and missing citation
      And only the strict invocation fails due to that warning
      When I remove the planted citation and repeat doctor
      Then that warning disappears
