@executable @docs @assets @distribution
Feature: The README stops calling a landed thing forthcoming, and cannot name a command that is not there

  Grepped at HEAD on 2026-09-07, `README.md` and `AGENTS.md` contain zero occurrences of
  `aof work loop`, `work loops`, `work tune`, `work trigger`, `acceptor`, `frozen-set` or
  `Loop-Ready`. The README documents the CODEBASE graph at length and the LOOP machinery not at all.

  What it does say about it is worse than silence. Its `/aof:autonomous` row reads *"**deprecated**
  (loop engineering replaces it; still works until that lands)"* — telling a reader the loop shell is
  forthcoming while it is the thing driving their repository. The replacement landed in milestone 53.

  **The one line is a specimen, not the defect.** The defect is that a claim about the state of the
  system was written once and never re-asked, which is the same failure mode the site's drift gate
  exists to prevent for the graph page. So the fix carries a control: the README may not name a
  command that does not resolve. That is the cheapest generalisation of the exact thing that went
  wrong, and it costs no `src/` change — `deriveRouteTable` (`src/spine/face.mjs:90`) already derives
  the route set from the registry, so the control asks the shipped derivation rather than keeping a
  list beside it.

  **THE EXTRACTOR'S BOUND IS A CRITERION, MEASURED.** A naive `aof <word>` grep over this README
  reports `aof binds to`, `aof never reads`, `aof owns its`, `aof without anyone` and `aof commands`
  — five prose sentences read as invocations. A control that manufactures casualties gets deleted by
  the first person it wrongly reds, so the extractor is bounded to fenced code blocks and the command
  tables, and that bound is asserted rather than trusted. This is the same lesson FF-11903's left
  anchor records one control over.

  Scenario: the deprecated row states what is true
    Given the README's `/aof:autonomous` row after this change
    When it is read
    Then it does not claim that loop engineering has yet to land
    And it names the milestone in which the replacement landed
    And it still says what the command does for a reader who has one in flight

  Scenario: the loop machinery is findable from the README
    Given `README.md` after this change
    When it is read
    Then it names the loop verbs the CLI exposes
    And it links the published site as where the loop machinery is documented
    And the claim that the README says nothing about `aof work loop` is no longer true of it

  Scenario: every command the README spells resolves
    Given every `aof ...` invocation the README spells in a fenced code block or a command table
    When each is resolved against the route set `deriveRouteTable` derives from the registry
    Then every one of them resolves
    And the control keeps no list of route names of its own

  Scenario Outline: the extractor reads invocations and not prose
    Given the README line `<line>`
    When the extractor runs over it
    Then it <verdict>

    Examples:
      | line                                          | verdict                          |
      | a fenced line reading `aof work validate`     | extracts `work validate`         |
      | a table cell naming `aof graph impact`        | extracts `graph impact`          |
      | the prose sentence "aof binds to a workspace" | extracts nothing                 |
      | the prose sentence "aof owns its own stream"  | extracts nothing                 |
      | the prose phrase "the aof commands and skills"| extracts nothing                 |

  Scenario: the control is non-vacuous
    Given the control after this change
    When it reports how many invocations it extracted from the shipped README
    Then the count is at or above a declared floor
    And a README from which every fenced block was removed reds the control rather than passing it

  Scenario: an invented verb reds the control, and the failure says where
    Given a README in which one fenced invocation names a verb the registry does not carry
    When the control runs
    Then it fails
    And the failure names the invocation
    And the failure names the line it was spelled on
