@executable @cli @design
Feature: "aof design-system use" names exactly one system in the config, and the validator holds the block to that

  WHY. A system is named by its title, `name`, which is how the operator knows it, or by its link,
  `artifact`, which survives a rename. Exactly one of the two names it (ADR-005, amended
  2026-11-26). `use` is the one writer of the block, through a surgical merge that leaves every
  other key as it was (ADR-003). The validator catches a block nobody wrote through `use` before
  any refine reads it. The CLI never resolves a name: that is the session's single `list` call.

  "The config" is the project's ".aof/aof.config.json", and "the block" is
  "work.ui.designSystem". "The link" is "https://claude.ai/artifact/5M7UeXXcx16TP3vzVFNDzd".

  Rule: R5 · "aof design-system use" names exactly one system, and writing one form removes the other

    Scenario: E13 · naming the system by its title
      Given this repository's config, with no block
      When "aof design-system use --name AOF --mode owned --source apps/ui/src/index.css" runs
      Then the block is {"enabled": true, "name": "AOF", "mode": "owned", "source": ["apps/ui/src/index.css"]}
      And every other key in the config, and the file's indentation, is unchanged

    Scenario: E14 · naming it by its link removes the title, and "reference" drops the source
      Given the block of E13
      When "aof design-system use --artifact <the link> --mode reference" runs
      Then the block is {"enabled": true, "artifact": "<the link>", "mode": "reference"}

    Scenario: E15 · both forms at once are refused, and nothing is written
      When "aof design-system use --name AOF --artifact <the link> --mode owned --source apps/ui/src/index.css" runs
      Then it is refused, saying a system is named by "--name" or "--artifact", not both
      And the config is byte-identical to before

    Scenario Outline: what use refuses, writing nothing
      When "aof design-system use <arguments>" runs
      Then it is refused with <reason>
      And the config is byte-identical to before

      Examples:
        | arguments                                                         | reason                                         |
        | --mode owned --source apps/ui/src/index.css                       | that "--name" or "--artifact" is required      |
        | --name "" --mode reference                                        | that the name is empty                         |
        | --artifact https://example.com/x --mode reference                 | that the link is not a claude.ai artifact link |
        | --name AOF --mode shared                                          | that the mode is "owned" or "reference"        |
        | --name AOF --mode owned                                           | that "owned" needs "--source"                  |
        | --name AOF --mode reference --source apps/ui/src/index.css        | that "reference" takes no "--source"           |
        | --name AOF --mode owned --source apps/ui/src/missing.css          | that "apps/ui/src/missing.css" does not exist  |
        | --name AOF --mode owned --source ../elsewhere/index.css           | that the path leaves the project root          |

    Scenario Outline: both link forms are accepted
      When "aof design-system use --artifact <link> --mode reference" runs
      Then the block's "artifact" is <link>

      Examples:
        | link                                                                     |
        | https://claude.ai/artifact/5M7UeXXcx16TP3vzVFNDzd                        |
        | https://claude.ai/code/artifact/7d3f0c2e-1b4a-4f6e-9a2b-0c1d2e3f4a5b     |

    Scenario: running it again with the same values changes nothing
      Given the block of E13
      When "aof design-system use --name AOF --mode owned --source apps/ui/src/index.css --json" runs
      Then it reports the block unchanged
      And the config is byte-identical to before

    Scenario: a source given in Windows form is stored with forward slashes
      When "aof design-system use --name AOF --mode owned --source apps\ui\src\index.css" runs
      Then the block's "source" is ["apps/ui/src/index.css"]

  Rule: R6 · The validator reports each defect of the block under its own code

    Scenario: E16 · both forms set
      Given the block is {"enabled": true, "name": "AOF", "artifact": "<the link>", "mode": "reference"}
      When "aof project validate" runs
      Then it reports "design-system-name-and-artifact" at "work.ui.designSystem"

    Scenario: E17 · on with no system named, and off with none
      Given the block is {"enabled": true, "mode": "reference"}
      When "aof project validate" runs
      Then it reports "design-system-unnamed"
      When the block is {"enabled": false}
      Then "aof project validate" reports no "design-system-*" finding

    Scenario: E18 · the source follows the mode
      Given the block is {"enabled": true, "name": "AOF", "mode": "owned"}
      Then "aof project validate" reports "design-system-source-missing"
      When the block is {"enabled": true, "name": "AOF", "mode": "reference", "source": ["apps/ui/src/index.css"]}
      Then "aof project validate" reports "design-system-source-stray"

    Scenario Outline: each other defect has its own code
      Given the block is <block>
      When "aof project validate" runs
      Then it reports <code> at <path>, and no other "design-system-*" finding

      Examples:
        | block                                                                    | code                         | path                                  |
        | {"enabled": true, "name": "  ", "mode": "reference"}                     | "design-system-empty-name"   | "work.ui.designSystem.name"           |
        | {"enabled": true, "artifact": "claude.ai/artifact/x", "mode": "reference"} | "design-system-bad-artifact" | "work.ui.designSystem.artifact"       |
        | {"enabled": true, "name": "AOF", "mode": "shared"}                       | "design-system-bad-mode"     | "work.ui.designSystem.mode"           |
        | {"enabled": true, "name": "AOF"}                                         | "design-system-bad-mode"     | "work.ui.designSystem.mode"           |
        | {"enabled": true, "name": "AOF", "mode": "owned", "source": []}          | "design-system-source-missing" | "work.ui.designSystem.source"       |
        | {"enabled": true, "name": "AOF", "mode": "reference", "colour": "teal"}  | "design-system-unknown-key"  | "work.ui.designSystem.colour"         |
        | "on"                                                                     | "design-system-bad-value"    | "work.ui.designSystem"                |

    Scenario: a block use wrote validates clean
      Given the block of E13
      When "aof project validate" runs
      Then it reports no "design-system-*" finding

    Scenario: the block is never a per-person setting
      Given ".aof/aof.config.local.json" holds a "work.ui.designSystem" block
      When the config is loaded
      Then the local block is refused as "config-local-key-not-allowed" and is not honoured
