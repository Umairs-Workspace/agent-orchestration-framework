@executable @cli @design
Feature: "aof design-system tokens --merge" re-syncs a system's tokens from the code the way the type's merge does, and never writes to the code

  WHY. At accept, an owned system is re-synced from its code (ADR-007). The Design System type's
  re-sync merges: it updates changed values, adds new tokens, keeps usage notes and edits made on
  the page, and lists the tokens the code no longer defines before removing them (RESEARCH R3).
  Merging two token files is deterministic file assembly, so it is a verb and never prose
  (ADR-003). The session publishes the file the verb writes. The direction is code to system only,
  so the verb refuses to write over any source file.

  "The code" is a CSS file whose @theme declares "--color-primary: hsl(174 72% 27%)" and
  "--color-warning: hsl(38 92% 50%)". "The system" is a tokens.json in the type's shape, with
  "name": "AOF", "version": "2", "editing": "code", and a "meta.source" recording the repo, the ref
  "518f07d3" and the paths ["apps/ui/src/index.css"] (RESEARCH R3). Its colour tokens are
  "color-primary" = {"light": "hsl(174 72% 30%)"}, usage "Primary actions", then "color-legacy" =
  {"light": "hsl(0 0% 50%)"}, usage "Old borders".

  Rule: R2 · "aof design-system tokens --merge" re-syncs a system's tokens from the code the way the type's merge does, and never writes to the code

    Scenario: E4 · a changed value is updated, and its usage note is kept
      When "aof design-system tokens index.css --merge system.json --out merged.json --json" runs
      Then merged.json's "color-primary" has the value {"light": "hsl(174 72% 27%)"} and the usage "Primary actions"
      And "changed" holds "color-primary" in theme "light", with the system's "hsl(174 72% 30%)" and the code's "hsl(174 72% 27%)"

    Scenario: E5 · a token only the code declares is appended
      When the merge runs
      Then merged.json's colour tokens are "color-primary", then "color-warning"
      And "color-warning" has the value {"light": "hsl(38 92% 50%)"} and an empty usage
      And "added" holds "color-warning"

    Scenario: E6 · a token the code no longer declares is listed, then removed
      When the merge runs
      Then "removed" holds "color-legacy" with its last value {"light": "hsl(0 0% 50%)"} and its usage "Old borders"
      And merged.json holds no "color-legacy"

    Scenario: E7 · what the page owns is kept, and the source is restamped
      Given the system's "color-primary" also carries "deprecated": true, added on the page
      When "aof design-system tokens index.css --merge system.json --out merged.json --ref 6a3826de" runs
      Then merged.json's "name", "version" and "editing" are the system's
      And "color-primary" still carries "deprecated": true
      And "meta.source" records the ref "6a3826de" and the paths ["index.css"], and its other fields are the system's

    Scenario: E8 · the merge never writes over the code
      When "aof design-system tokens apps/ui/src/index.css --merge system.json --out apps/ui/src/index.css" runs
      Then it is refused, naming "apps/ui/src/index.css" as a source file
      And "apps/ui/src/index.css" is unchanged, and no file is written

    Scenario: E9 · a merged system has no drift from its code
      Given merged.json from E4
      When "aof design-system check --tokens merged.json --source index.css --json" runs
      Then it reports no change, nothing added and nothing missing
      And it exits 0

    Scenario Outline: themes, aliases and what cannot be placed
      Given the code and the system differ in <difference>
      When the merge runs
      Then <outcome>

      Examples:
        | difference                                                                                      | outcome                                                                                            |
        | the code's ".dark" declares "--color-primary: hsl(174 60% 40%)", which the system lacks           | "color-primary" gains "dark", "color.themes" gains {"id": "dark", "name": "Dark"}, and "added" holds it in theme "dark" |
        | the system holds a "dark" value for "color-primary" and the code declares no ".dark"              | the "dark" value is dropped, and "removed" holds "color-primary" in theme "dark"                   |
        | the code declares "--color-ring: var(--color-primary)"                                           | "color-ring" is appended with the value {"light": "{color-primary}"}                               |
        | the code declares "--color-scrim: color-mix(in srgb, black 40%, transparent)"                    | "unplaced" lists "--color-scrim" with its reason, and merged.json holds no "color-scrim"           |
        | the system holds a "radius" token "0.5rem" and the code declares "--radius: 0.375rem"             | "radius" has the value "0.375rem", and "changed" holds it                                          |
        | only a token's whitespace, "hsl(174  72% 27%)" against "hsl(174 72% 27%)"                        | the system's value is kept, and "changed" is empty                                                 |

    Scenario: with no CSS files it merges from the configured source
      Given "work.ui.designSystem" is {"enabled": true, "name": "AOF", "mode": "owned", "source": ["apps/ui/src/index.css"]}
      When "aof design-system tokens --merge system.json --out merged.json" runs
      Then it merges from "apps/ui/src/index.css"
      And it refuses "--out apps/ui/src/index.css" as a source file

    Scenario Outline: a merge it cannot run is refused, and nothing is written
      Given <situation>
      When the merge runs
      Then it is refused, naming <named>
      And no file is written

      Examples:
        | situation                                                            | named                                                   |
        | "--merge" names no file                                              | the file, and that it cannot be read                    |
        | the "--merge" file is a DTCG map {"color": {"brand": {"$value": "#f00"}}} | the file, and that a family is not a list           |
        | "--merge" is given without "--out"                                   | "--out"                                                 |
        | no CSS file is given and no "source" is configured                   | "--source" and "work.ui.designSystem.source"            |

    Scenario: without --json it prints what the merge did
      When "aof design-system tokens index.css --merge system.json --out merged.json" runs
      Then it prints "Changed", "Added" and "Removed", each naming its tokens, and the path it wrote
