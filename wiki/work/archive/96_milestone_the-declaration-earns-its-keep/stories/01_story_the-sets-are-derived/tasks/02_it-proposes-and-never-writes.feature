@executable @cli @work @planning
Feature: The derivation proposes and the author subtracts, and nothing rewrites a declaration a person wrote

  The failure this milestone exists to cure is a systematically short declaration. A tool that
  silently narrowed an author's set would manufacture that same defect faster than hand-authoring
  did, and with the author's confidence attached — which is worse than the problem.

  So the asymmetry is deliberate and it is not a preference. An over-broad proposal costs a serialised
  wave: `ready-wave.mjs` computes disjointness from `files:`, so a wide set means two stories run one
  after the other. That is cheap, and it is VISIBLE — the operator sees the wave. A tool that
  overwrote an author's narrowing is neither: the cost lands later, on a builder, as an unplanned cold
  read, and nothing in the stream says why.

  The escape stays exactly as it is. An agent that must read outside the declared set reads it and
  reports the contract as incomplete; that is what makes a wrong set degrade rather than block, and
  the retrospectives show agents actually using it. This story changes how the set is AUTHORED and
  nothing about how it is ENFORCED.

  Re-derivation is the sharp case. An author who removes four proposed entries and re-runs the
  derivation must not get them back — otherwise the subtraction is advisory and the tool is the
  author. The proposal is rendered for a person to act on; it is never applied.

  What would quietly undo this: a `--write` or `--apply` flag added later "for convenience"; the
  refine prompt instructing an agent to overwrite the frontmatter with the proposal; and a proposal
  that renders identically whether or not the author has already narrowed it, which teaches the author
  their edit did not register.

  ADR-004 §5. FF-9602.

  Scenario: the derivation writes no story document
    Given the module that derives a proposal
    When it is examined
    Then it holds no write path to any `STORY.md`
    And it imports no write seam

  Scenario: an author's narrowing survives a re-derivation
    Given a story whose author removed four proposed entries from `reads:`
    When a proposal is derived for that story again
    Then the story's declaration is unchanged on disk
    And the four entries are reported as proposed-and-not-declared rather than restored

  Scenario: the proposal distinguishes what is already declared from what is new
    Given a story whose `files:` already names two of the proposed entries
    When a proposal is derived for that story
    Then those two are reported as already declared
    And the remaining entries are reported as newly proposed

  Scenario Outline: an over-broad set costs a wave and never a refusal
    Given two sibling stories whose declared write sets <relation>
    When the ready wave is computed
    Then they are <outcome>

    Examples: the visible, cheap cost the asymmetry buys
      | relation          | outcome                        |
      | share a file      | placed in different waves      |
      | share no file     | placed in the same wave        |

  Scenario: the escape path is untouched
    Given an agent that must read a file outside the story's declared `reads:`
    When it reads that file
    Then the read succeeds
    And the agent reports the contract as incomplete
    And nothing in this story's module set blocks the read

  Scenario: the refine command asks for a proposal and never for an application
    Given the shipped refine command document
    When its break-down and contract instructions are read
    Then they instruct the author to derive a proposal and subtract from it
    And they instruct no agent to overwrite a declaration with one
