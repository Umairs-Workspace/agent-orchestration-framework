@cli @work @distribution
Feature: the AOF.md digest template ships with the record-doc set
  In order that an imported digest's shape lives in one reviewable file
  the bundle must ship an AOF.md template beside SPEC / STATE, filed under the milestone member,
  and it must never turn a native milestone scaffold into a digest

  Background:
    Given the bundle descriptor, bundle root and shipped manifest are read as they ship

  @executable
  Scenario: the bundle renders the template to the milestone template folder
    When the bundle's template outputs are rendered
    Then one output has the path `.aof/templates/work/milestone/AOF.md`
    And its content starts with the bundle marker comment followed by the template body
    And the shipped manifest carries an entry for that path with kind `template` and id `milestone`

  @executable
  Scenario Outline: the template's frontmatter declares the closed key set, in order
    When the frontmatter block of `src/bundle/templates/milestone/AOF.md` is read line by line
    Then line <position> declares the key `<key>`
    And that line <annotation> the `# OMIT` annotation

    Examples:
      | position | key        | annotation       |
      | 1        | doc        | does not carry   |
      | 2        | milestone  | does not carry   |
      | 3        | slug       | does not carry   |
      | 4        | title      | does not carry   |
      | 5        | status     | does not carry   |
      | 6        | imported   | does not carry   |
      | 7        | importedBy | does not carry   |
      | 8        | source     | carries          |
      | 9        | importedAt | carries          |
      | 10       | schema     | does not carry   |
      | 11       | aofVersion | does not carry   |

  @executable
  Scenario: the frontmatter declares no key beyond those eleven
    When the frontmatter block of the template is read
    Then it declares exactly 11 keys
    And the `doc` line's value is `digest`

  @executable
  Scenario: the template's `## ` sections are the closed, ordered section set
    When every line of the template starting `## ` is read in document order
    Then the headings are exactly `Intent`, `Scope`, `Decisions`, `Lessons`, in that order

  @executable
  Scenario Outline: a native scaffold never writes a digest
    When a <type> named `probe` is scaffolded into a fresh backlog through the shipped templates
    Then the scaffolded folder holds `<docs>`
    And it holds no `AOF.md`

    Examples:
      | type      | docs              |
      | milestone | SPEC.md, STATE.md |
      | uat       | SESSION.md, STATE.md |
      | chore     | CHORE.md          |

  @manual
  Scenario: `aof work update` lands the installed copy in this repo
    When `aof work update` is run from this repo's root after the build
    Then `.aof/templates/work/milestone/AOF.md` exists, starting with the bundle marker comment
    And its body after the marker is byte-identical to `src/bundle/templates/milestone/AOF.md`
    And `.aof/aof.lock.json` records the path
