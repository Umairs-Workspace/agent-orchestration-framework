@executable @cli @design
Feature: "aof design-system check" compares a system's tokens with the code, and exits non-zero on drift

  WHY. An owned system is only as good as its agreement with the code (ADR-007). The extraction's
  own review uses this check to prove the system it published holds exactly the code's tokens
  (ADR-004 §5). Story 03 wires it into verify. The comparison is deterministic, so it is a verb
  (ADR-003). It compares values only: usage notes and edits made on the page are the system's own,
  and a re-sync keeps them.

  "index.css" is this repository's "apps/ui/src/index.css". "The system's tokens" is a tokens.json
  in the type's shape.

  Rule: R4 · "aof design-system check" compares a system's tokens with the code, and exits non-zero on drift

    Scenario: E9 · a system built from the code has no drift
      Given a tokens.json that "aof design-system tokens apps/ui/src/index.css --json" printed
      And a usage note on every token, "meta.source" set, and "name" and "version" added
      When "aof design-system check --tokens tokens.json --source apps/ui/src/index.css --json" runs
      Then it reports no change, nothing added and nothing missing
      And it exits 0

    Scenario: E10 · a changed value is drift
      Given the system holds "color-primary" = {"light": "hsl(174 72% 30%)"}
      And the code declares "--color-primary: hsl(174 72% 27%)"
      When "aof design-system check" runs
      Then "changed" holds "color-primary" in theme "light", with the system's "hsl(174 72% 30%)" and the code's "hsl(174 72% 27%)"
      And it exits 1

    Scenario: E11 · a token on one side only is drift
      Given the code declares "--color-warning", which the system lacks
      And the system holds "color-legacy", which the code no longer declares
      When "aof design-system check" runs
      Then "added" holds "color-warning" and "missing" holds "color-legacy"
      And it exits 1

    Scenario: E12 · with no source to compare against it is refused
      Given no "--source" is given and "work.ui.designSystem" holds no "source"
      When "aof design-system check --tokens tokens.json" runs
      Then it is refused, saying to pass "--source" or to configure "work.ui.designSystem.source"

    Scenario Outline: what is and is not drift
      Given the system and the code differ only in <difference>
      When "aof design-system check" runs
      Then it exits <exit>

      Examples:
        | difference                                                          | exit |
        | a token's usage note                                                | 0    |
        | "meta", "name" or "version"                                         | 0    |
        | whitespace inside a value, "hsl(174  72% 27%)" against "hsl(174 72% 27%)" | 0    |
        | a "dark" value the system holds and the code does not               | 1    |
        | the radius "0.5rem" against "8px"                                   | 1    |
        | a type style's lineHeight                                           | 1    |

    Scenario: with no --source it compares against the configured source
      Given "work.ui.designSystem" is {"enabled": true, "name": "AOF", "mode": "owned", "source": ["apps/ui/src/index.css"]}
      And a tokens.json printed from index.css
      When "aof design-system check --tokens tokens.json" runs
      Then it exits 0

    Scenario: --source wins over the configured source
      Given the configured "source" is ["apps/ui/src/other.css"]
      When "aof design-system check --tokens tokens.json --source apps/ui/src/index.css" runs
      Then it compares against "apps/ui/src/index.css" alone

    Scenario Outline: a tokens file it cannot use is refused
      Given the "--tokens" file is <file>
      When "aof design-system check" runs
      Then it is refused, naming the file and <reason>

      Examples:
        | file                                              | reason                      |
        | absent                                            | that it cannot be read      |
        | not JSON                                          | that it is not JSON         |
        | a DTCG map {"color": {"brand": {"$value": "#f00"}}} | that a family is not a list |

    Scenario: without --json it prints the drift as three sections
      Given the drift of E10 and E11
      When "aof design-system check" runs without "--json"
      Then it prints "Changed", "Added" and "Missing", each naming its tokens
