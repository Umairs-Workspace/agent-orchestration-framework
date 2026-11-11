@executable @cli @planning
Feature: The package is reproducible

  WHY. Cowork takes a plugin as an uploaded .zip or .plugin holding one .claude-plugin/plugin.json.
  aof writes that archive itself, with no new dependency. The same sources must give the same bytes,
  so a re-run that changed nothing is visibly a no-op and two packages can be compared.

  Rule: R4 · A package rebuilt from the same sources is the same file

    Scenario: E10 · packaging twice from unchanged sources gives identical bytes
      Given the aof planning plugin is rendered
      When it is packaged twice
      Then the two packages are byte-identical

    Scenario: E11 · the archive holds one plugin manifest at its root
      Given the aof planning plugin is rendered
      When it is packaged
      Then a zip reader lists exactly the plugin's three files
      And exactly one entry is named ".claude-plugin/plugin.json"
      And every entry's content equals the rendered file

    Scenario: the order a file map is given in does not change the bytes
      Given a file map of "b.md", "a/x.md" and "a.md"
      When it is packaged in that order and again in reverse order
      Then the two packages are byte-identical
      And the archive lists its entries as "a.md", "a/x.md", "b.md"

    Scenario Outline: a stored entry round-trips its bytes and checksum
      Given a file map holding "<path>" with content "<content>"
      When it is packaged
      Then a zip reader reads "<path>" back as "<content>"
      And the entry's recorded CRC-32 matches its content

      Examples:
        | path            | content          |
        | empty.md        |                  |
        | skills/a/S.md   | hello            |
        | ünïcode/név.md  | café ✓           |
