Feature: Help and every hint the CLI prints name aof memory, and the alias stays one implementation

  WHY. A hint that names `aof work memory` sends whoever follows it to the alias, which keeps the
  alias load-bearing after the prompts move (178/ADR-001, ADR-003). The usage text is shared by
  both doors, so it is the one place the alias's output changes. The stale-store hint, the
  import-milestone reindex warning and the work-command examples follow it (ratified in this
  contract, STATE 2026-10-29). Two registered doors are one implementation only while the alias's
  functions are the canonical command's own (FF-17801).

  THE FIXTURE: as task 00, a temp project under an isolated "AOF_GLOBAL_HOME".

  Rule: R3 · Every hint the CLI prints spells aof memory

    @executable @cli @work @memory
    Scenario Outline: E7 · both doors print usage that names aof memory
      When "<argv>" runs
      Then it exits 0
      And stdout's first line opens "Usage: aof memory <verb>"
      And stdout holds no "aof work memory"

      Examples:
        | example | argv                 |
        | E7      | aof memory -h        |
        | E7      | aof work memory -h   |

    @executable @cli @work @memory
    Scenario: a refused flag prints the canonical usage through either door
      When "aof work memory recall x --bogus" runs
      Then it exits 1
      And its usage line names "aof memory <verb>"

    @executable @cli @work @memory
    Scenario: E8 · help lists memory in a section of its own
      When "aof --help" runs
      Then it holds a section titled "Memory:" whose line opens "aof memory <verb>"
      And the "Usage:" section holds no line opening "aof memory"
      And the "Work (ACD work stream):" section still holds a memory line
      And the "Also:" tail does not mention memory

    @executable @cli @work @memory
    Scenario: E9 · a stale store names aof memory ingest as the fix
      Given the local index was written at a version below the one this build writes
      When "aof memory status" runs
      Then its last line names "`aof memory ingest`" as the command that rebuilds it
      And no line names "aof work memory"

    @executable @cli @work @memory
    Scenario: an import whose reindex fails names aof memory reindex
      Given "aof import milestone" materialises a digest and its memory reindex throws "disk full"
      When the import completes
      Then its warning reads "Run `aof memory reindex` to index it."

    @executable @cli @work @memory
    Scenario: the unknown-work-command examples name aof memory
      When "aof work no-such-subcommand" runs
      Then its examples list holds "aof memory recall \"pin line endings\""
      And holds no "aof work memory"

  Rule: R4 · The alias is the canonical command at a second route

    @executable @cli @work @memory
    Scenario: E10 · both doors are registered and share the canonical functions (FF-17801)
      Given the default application's command registry
      Then command "memory" is registered at route "memory"
      And command "work:memory" is registered at route "work memory"
      And "work:memory"'s run, argv, render and json are the same function objects as "memory"'s
      And "memory" and "work:memory" are both in KNOWLEDGE_COMMAND_IDS

    @executable @cli @work @memory
    Scenario: E10 · an alias with its own render fails FF-17801 (red probe)
      Given a planted registry where "work:memory"'s render is a wrapper around "memory"'s
      When the FF-17801 control runs over it
      Then it fails naming "render" as the function that is not shared

    @executable @cli @work @memory
    Scenario: E11 · the frozen lists carry both ids
      Then the command inventory fixture holds an entry for "memory" with route ["memory"]
      And it still holds "work:memory" with route ["work", "memory"]
      And the cli-bijection and route-coverage controls each carry a row for "memory"
      And the routed-door control still finds no memory branch in the CLI ladder
