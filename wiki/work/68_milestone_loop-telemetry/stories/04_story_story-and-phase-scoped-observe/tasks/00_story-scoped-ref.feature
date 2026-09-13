@executable @cli @work @work-stream
Feature: A story ref resolves — the observe resolver reads one level deeper than the top

  `resolveMilestoneFolder` (`src/work-observe.mjs:988-1006`) reads only the **top level** of
  `wiki/work`. Executed on this tree: `"52"` resolves to a folder; `"52/00"` resolves to `null` and
  throws `milestone-not-found` (`:1020-1024`). Stories live one level down, in
  `<milestone>/stories/`, and the resolver never descends. A framework whose unit of parallel work
  is the story cannot report on a story.

  The same resolver has a quieter second defect. Its substring branch (`:1003`) makes a bare `"00"`
  resolve to *milestone* 00 — so the ref that looks most like a story ref answers confidently about
  something else. A wrong answer delivered without complaint is worse than the throw, because
  nothing prompts the reader to doubt it.

  The rest of the work stream already resolves refs by folder-name lookup rather than by globbing,
  and already understands `NN`, `NN/SS` and slug forms. This task brings observe to that same
  behaviour rather than inventing a second ref grammar next to it.

  ADR-006 (the miner is repaired, not retired); the milestone-08 spine (the answer lands through
  the registered command, task 02).

  Scenario: a story ref resolves to the story's own folder
    Given a milestone with stories on disk
    When observe is asked about a story ref of the form `NN/SS`
    Then it resolves to that story's folder
    And it reports on that story rather than on its parent milestone

  Scenario: a bare milestone ref keeps working exactly as it does today
    Given a milestone with stories on disk
    When observe is asked about that milestone by its number
    Then it resolves to the milestone folder
    And it reports on the milestone

  Scenario: an ambiguous ref is refused rather than silently resolved
    Given a work stream containing both a milestone numbered `00` and stories numbered `00`
    When observe is asked about the bare ref `00`
    Then the ref resolves to the top-level item, or is refused as ambiguous
    And it never resolves to a story of a different milestone by substring

  Scenario Outline: the ref forms observe answers to
    Given a work stream with milestones, stories and their folders on disk
    When observe is asked about <ref form>
    Then the outcome is <outcome>

    Examples: resolvable
      | ref form                              | outcome                                   |
      | a milestone number                    | the milestone's folder                    |
      | a milestone number with leading zeros | the same milestone's folder               |
      | a story ref `NN/SS`                   | that story's folder                       |
      | an exact folder name                  | that folder                               |

    Examples: refused, loudly
      | ref form                              | outcome                                   |
      | a milestone number that does not exist| refused, naming the ref that did not resolve |
      | a story index no milestone has        | refused, naming the ref that did not resolve |
      | a story ref under a missing milestone | refused, naming the ref that did not resolve |

  Scenario: a refusal names what was asked for
    Given a ref that matches no item
    When observe is asked about it
    Then the failure states the ref that did not resolve
    And it does not report on some other item instead
