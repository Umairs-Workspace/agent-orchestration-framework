@executable @cli @design
Feature: "aof design-system tokens" prints the token lists the type reads, from the code, and lists what it could not place

  WHY. The code holds the exact token values (RESEARCH R3), and code beats mocks (ADR-004 §2).
  Parsing them is deterministic, so it is a verb and never prose (ADR-003). Its output is the
  shape the Design System type's page reads: every family a LIST of {name, value, usage}, colour
  values per theme. A value the type would drop is listed, never silently lost. A value a mock
  paints that no code token holds is listed for the operator to accept or drop.

  "index.css" is this repository's "apps/ui/src/index.css": an @theme block of 20 hsl colours and
  "--radius: 0.5rem".

  Rule: R3 · "aof design-system tokens" prints the token lists the type reads, from the code, and lists every value it could not place

    Scenario: E5 · AOF's own tokens
      When "aof design-system tokens apps/ui/src/index.css --json" runs
      Then "color.themes" is [{"id": "light", "name": "Light"}]
      And "color.tokens" holds 20 tokens, in declaration order, among them {"name": "color-primary", "value": {"light": "hsl(174 72% 27%)"}}
      And "radius.tokens" holds {"name": "radius", "value": "0.5rem"}
      And "unplaced" is empty
      And every token carries a "usage" field, empty for the session to fill

    Scenario: E6 · a theme selector adds a theme to the same token
      Given a CSS file whose @theme declares "--color-primary: hsl(174 72% 27%)"
      And whose ".dark" rule declares "--color-primary: hsl(174 60% 40%)"
      When "aof design-system tokens" runs over it
      Then "color.themes" is light, then dark
      And "color-primary" has the value {"light": "hsl(174 72% 27%)", "dark": "hsl(174 60% 40%)"}

    Scenario: E7 · a var() of a placed colour becomes an alias, and what the type drops is listed
      Given a CSS file whose @theme declares "--color-primary: hsl(174 72% 27%)" and "--color-ring: var(--color-primary)"
      And "--color-scrim: color-mix(in srgb, black 40%, transparent)" and "--color-none: transparent"
      When "aof design-system tokens --json" runs over it
      Then "color-ring" has the value {"light": "{color-primary}"}
      And "unplaced" lists "--color-scrim" and "--color-none", each with its file, its line and its reason

    Scenario: E8 · a value only a mock paints is listed as mock-only
      Given "wiki/work" holds a mock "a.dc.html" that paints "#b3261e" and "hsl(174 72% 27%)"
      And a mock "b.html" that also paints "#b3261e"
      When "aof design-system tokens apps/ui/src/index.css --mocks wiki/work --json" runs
      Then "mockOnly" holds "#b3261e" with the files "a.dc.html" and "b.html"
      And "mockOnly" holds no entry for "hsl(174 72% 27%)"

    Scenario: E26 · each mock-only colour names the code token nearest it
      Given the code tokens "--surface: #f3f4f6" and "--ink: #111827"
      And "scratch/canvases/a" and "scratch/canvases/b" hold boards painting "#f4f4f6", "#101826" and "#e11d48"
      When "aof design-system tokens app/tokens.css --mocks scratch/canvases/a --mocks scratch/canvases/b --json" runs
      Then "mockOnly" holds "#f4f4f6" once, with both boards, nearest "surface" at distance 1
      And "#101826" is nearest "ink", and "#e11d48" is far from every token
      When the code declares no colour
      Then no "mockOnly" entry names a nearest token

    Scenario Outline: each property goes to its family, or is unplaced with its reason
      Given a CSS file whose @theme declares <declaration>
      When "aof design-system tokens --json" runs over it
      Then <outcome>

      Examples:
        | declaration                                            | outcome                                                                     |
        | "--spacing: 0.25rem"                                   | "spacing.tokens" holds {"name": "spacing", "value": "0.25rem"}              |
        | "--radius-lg: 0.75rem"                                 | "radius.tokens" holds {"name": "radius-lg", "value": "0.75rem"}             |
        | "--shadow-card: 0 1px 2px hsl(0 0% 0% / 0.1)"          | "shadow.tokens" holds "shadow-card"                                         |
        | "--font-mono: \"JetBrains Mono\", monospace"           | "type.families" holds "mono" = "\"JetBrains Mono\", monospace"              |
        | "--text-sm: 0.875rem" and "--text-sm--line-height: 1.25rem" | the "Text" group holds the style "sm", fontSize "0.875rem", lineHeight "1.25rem" |
        | "--animate-spin: spin 1s linear infinite"              | "unplaced" lists "--animate-spin" as having no family                       |
        | "--color-x: var(--undeclared)"                         | "unplaced" lists "--color-x" as naming no placed colour                     |

    Scenario Outline: which selectors are themes
      Given a CSS file that declares "--color-primary" under <selector>
      When "aof design-system tokens --json" runs over it
      Then <outcome>

      Examples:
        | selector                | outcome                                              |
        | ":root"                 | its value is the "light" theme's                     |
        | "[data-theme=contrast]" | "color.themes" gains "contrast"                      |
        | ".theme-sepia"          | "color.themes" gains "sepia"                         |
        | ".card"                 | "unplaced" lists it as declared under no theme       |

    Scenario Outline: a mock colour equal to a code token in another notation is not mock-only
      Given index.css declares "--color-card: hsl(0 0% 100%)"
      And a mock under "wiki/work" paints <value>
      When "aof design-system tokens apps/ui/src/index.css --mocks wiki/work --json" runs
      Then "mockOnly" <listed>

      Examples:
        | value                | listed                 |
        | "#ffffff"            | holds no entry for it  |
        | "rgb(255 255 255)"   | holds no entry for it  |
        | "#fefefe"            | holds "#fefefe"        |

    Scenario: a file it cannot read is refused by name
      When "aof design-system tokens apps/ui/src/missing.css" runs
      Then it is refused, naming "apps/ui/src/missing.css"

    Scenario: without --json it prints a table per family and the unplaced list
      When "aof design-system tokens apps/ui/src/index.css" runs
      Then it prints one section per family, with each token's name and value
      And a last section headed "Not placed", empty here

  Scenario: FF-19804 · the verbs reach no network, and the package's prose holds no token parsing
    When "test/arch/practices/acd-design-system-verbs-offline.test.mjs" runs
    Then it fails if any module under "packages/design-system/src" imports an HTTP client or calls "fetch"
    And it fails if any prose file under "packages/design-system/assets" holds "@theme" or a "--" property declaration
    And its prose leg reads at least one file, so it cannot pass over an empty package

  Scenario Outline: FF-19804 · each planted breach turns the control red
    Given <planted>
    When the FF-19804 cases run
    Then the control fails and names the file and the breach

    Examples:
      | planted                                                              |
      | a module under the package's src that imports "node:https"           |
      | a module under the package's src that calls "fetch("                 |
      | a prose file under the package's assets that declares "--color-x: red" |
