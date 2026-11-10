@cli @work @work-stream
Feature: /aof:explain says what each item is for

  WHY. The operator holds a number or a backlog folder and has forgotten the reason for it. The
  command resolves each ref through `aof work find <ref> --json`, reads the item's record doc
  through `aof work doc` (and, for `--verbose`, its stories through `aof work list <ref>` and its
  tasks through `aof work tasks`), and prints one explanation per ref, in the order given. The
  default is three to five sentences: what the item delivers, who it is for, and why it exists.
  `--verbose` adds scope, the stories or tasks it groups with their status, its `depends:` edges,
  and what is still open. Every sentence comes from the record; a purpose the record does not
  state is reported as not written down, never invented.

  The `@executable` scenarios read the command's prose, because a session writes the answer; the
  `@manual` run and the `@uat` sign-off judge the answers themselves.

  Rule: R2 · Every ref in the call is answered, in the order given, archived work included

    @executable
    Scenario: E3 · each ref is resolved and explained in the order given
      When "packages/core/assets/commands/explain.md" is read
      Then it resolves every ref through "aof work find <ref> --json", one ref at a time, in the order given
      And it never globs the work tree for a record doc

    @executable
    Scenario: E4 · an unresolvable ref is named and the call goes on
      When "packages/core/assets/commands/explain.md" is read
      Then an empty answer from "aof work find" is reported as the ref matching no work item
      And the command goes on to the next ref

    @executable
    Scenario: E5 · a backlog item is explained and marked as not yet scheduled
      When "packages/core/assets/commands/explain.md" is read
      Then a row with "number: null" is explained and marked as in the backlog, not yet scheduled
      And a backlog folder path is passed to "aof work find" as typed

    @executable
    Scenario: E6 · a fragment that matches several items is listed, and none is explained
      When "packages/core/assets/commands/explain.md" is read
      Then an answer of more than one row lists each row's ref and title
      And explains none of them, and says to ask again with one ref

    @executable
    Scenario: E10 · archived, done work is explained like any other, marked archived
      When "packages/core/assets/commands/explain.md" is read
      Then a row with "archived: true" is explained and marked archived and done

    @manual
    Scenario: a real call over every kind of ref
      Given the payload is installed
      When "/aof:explain 147 999 wiki/work/backlog/story_a-halted-lane-is-reaped 129 loop" is run in a Claude Code session in this repository
      Then 147 is explained first, in three to five sentences
      And 999 is reported as matching no work item
      And the backlog story is explained and marked not yet scheduled
      And 129 is explained and marked archived and done
      And "loop" lists its matches by ref and title and explains none

  Rule: R3 · The default answer is short; --verbose goes in depth

    @executable
    Scenario: E7 · the default answer is three to five sentences on what, who and why
      When "packages/core/assets/commands/explain.md" is read
      Then without "--verbose" each item gets three to five sentences: what it delivers, who it is for and why it exists
      And it names where each is read from per type: a story's user story, a milestone's objective, a spike's question, a chore's intent and a uat session's scope

    @executable
    Scenario: E11 · a milestone's default answer counts its stories and names none
      When "packages/core/assets/commands/explain.md" is read
      Then without "--verbose" a milestone's answer adds how many stories it groups and how many are done
      And names none of them

    @executable
    Scenario: E8 · --verbose adds scope, the stories or tasks, the depends edges and what is open
      When "packages/core/assets/commands/explain.md" is read
      Then with "--verbose" each item also gets its scope
      And the stories it groups, read through "aof work list <ref>", each with its status and a one-line purpose
      And for a story, its tasks, read through "aof work tasks <ref>"
      And its "depends:" edges
      And what is still open

    @uat
    Scenario: the operator can decide from the answer
      Given "/aof:explain" run over three items the operator does not remember, one with "--verbose"
      When the operator reads the answers
      Then they can say for each whether to schedule, refine or drop it without opening a record doc

  Rule: R4 · The answer says only what the record says

    @executable
    Scenario: E9 · an unwritten purpose is reported as not written down, and none is invented
      When "packages/core/assets/commands/explain.md" is read
      Then a record whose purpose section is empty or still the template's placeholder is reported as having no purpose written down yet
      And the command says it states nothing the record does not say
