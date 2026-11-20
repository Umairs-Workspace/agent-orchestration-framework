@executable @cli @assets @scaffold
Feature: Drift fails with a summary and a diff per file

  WHY. A failure has to say what changed in terms a reviewer reads: which files, and the lines in
  each. And it has to say how to accept the change when it was meant. A baseline is stored as a
  delta from a named base, so that an edit to a shared file shows once (ADR-003, ADR-004).

  Background:
    Given a fixture lane "fixture" whose baselines live under a temp baseline root

  Rule: R3 · The expected tree is the base's tree, minus what is removed, overlaid with the scenario's own files, and drift fails with a summary, a diff per file and the command that accepts it

    Scenario: E13 · the expected tree is materialised from a base and a delta
      Given scenario "base" has a baseline holding "project/a.md" and "project/b.md"
      And scenario "s" names base "base", stores "project/b.md" with other text, and lists "project/a.md" in removed.golden
      When the expected tree of "s" is materialised
      Then it holds "project/b.md" with the other text, and nothing else

    Scenario: a chain of bases materialises in order
      Given scenario "c" names base "b", and "b" names base "a"
      And each stores one file the others lack
      When the expected tree of "c" is materialised
      Then it holds all three files

    Scenario: E14 · a base that does not exist fails by name
      Given scenario "s" names base "nowhere"
      When the expected tree of "s" is materialised
      Then it fails naming "s" and "nowhere"

    Scenario: E15 · a cycle of bases fails, naming the chain
      Given scenario "x" names base "y", and "y" names base "x"
      When the expected tree of "x" is materialised
      Then it fails naming "x → y → x"

    Scenario: a base in another lane is named as "<lane>/<scenario>"
      Given lane "other" has scenario "root" with a baseline holding "project/r.md"
      And scenario "s" in lane "fixture" names base "other/root"
      When the expected tree of "s" is materialised
      Then it holds "project/r.md"

    Scenario: an unchanged tree passes, and prints nothing
      Given scenario "s" whose fixture output equals its baseline
      When the harness compares scenario "s"
      Then it passes

    Scenario: E16 · a changed line fails with a summary, a hunk and the command that accepts it
      Given scenario "s" whose fixture output differs from its baseline in line 10 of "b.md"
      When the harness compares scenario "s"
      Then it fails
      And the report opens with "1 changed", then the path "project/b.md"
      And it shows a unified diff of "project/b.md" with the old line, the new line and 3 lines of context on each side
      And its last line is "node scripts/golden.mjs --lane fixture --scenario s --update"

    Scenario Outline: each kind of difference is counted under its own heading
      Given scenario "s" whose fixture output <differs>
      When the harness compares scenario "s"
      Then the report opens with "<summary>"
      And it shows <diff>

      Examples:
        | example | differs                                   | summary   | diff                                                 |
        | E17     | has "c.md" that its baseline lacks         | 1 added   | the whole of "project/c.md" diffed against nothing    |
        |         | lacks "a.md" that its baseline holds       | 1 removed | the whole of "project/a.md" diffed against nothing    |
        |         | writes "x.json" into the home              | 1 added   | the whole of "home/x.json" diffed against nothing     |

    Scenario: E18 · past 20 files, the report lists every path and shows 20 diffs
      Given scenario "s" whose fixture output changes 25 files
      When the harness compares scenario "s"
      Then the report lists all 25 paths
      And it shows the diffs of the first 20 in path order
      And it says 5 diffs were left out, and that the script prints them all

    Scenario: E19 · a changed step record fails even when no file changed
      Given scenario "s" whose files equal its baseline and whose step envelope does not
      When the harness compares scenario "s"
      Then it fails
      And the report says the step records changed and shows their diff

    Scenario: E20 · a scenario with no baseline fails and writes nothing
      Given scenario "s" with no baseline directory
      When the harness compares scenario "s"
      Then it fails saying "s" has no baseline
      And its last line is "node scripts/golden.mjs --lane fixture --scenario s --update"
      And no file exists under the baseline root
