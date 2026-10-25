@executable @cli @work @design
Feature: The house palette is read from the style guide, and nowhere else

  WHY. A first draft came out uncoloured at 170's UAT until a note asked for the house style. The
  project's style guide already names each role's colour in its semantic-roles table; reading it
  there, rather than copying colours into config, keeps one source (ADR-004, 170 RETROSPECTIVE R5).

  Rule: R1 · The palette is read from the style guide's semantic-roles table

    Scenario: E1 · this repository's style guide gives the console's colours
      Given a project whose "work.diagrams.style" names a copy of this repository's ".aof/diagrams/style.md"
      When the house palette is read
      Then the palette is
        | role   | colour  |
        | paper  | #f3f5f7 |
        | ink    | #1b1f27 |
        | muted  | #585f6a |
        | link   | #13766d |
        | accent | #ba2646 |

    Scenario: E2 · with no style configured there is no palette
      Given a project with diagrams on and no "work.diagrams.style"
      When the house palette is read
      Then there is no palette

    Scenario Outline: a style guide without the roles a node needs gives no palette
      Given a project whose style guide <shape>
      When the house palette is read
      Then there is no palette

      Examples:
        | example | shape                                                  |
        | E3      | has no "Semantic roles" table                          |
        |         | has a "Semantic roles" table with no "paper" row       |
        |         | has a "Semantic roles" table with no "ink" row         |
        |         | names "paper" as "not-a-colour"                        |
        |         | is named in config but missing from disk               |

    Scenario: a role whose light value is an rgba colour is read as written
      Given a project whose style guide gives "accent-tint" the light value "rgba(186,38,70,0.08)"
      When the house palette is read
      Then the palette's "accent-tint" is "rgba(186,38,70,0.08)"

    Scenario: only the light column is read
      Given a project whose style guide gives "paper" the light value "#f3f5f7" and the dark value "#1b1f27"
      When the house palette is read
      Then the palette's "paper" is "#f3f5f7"
