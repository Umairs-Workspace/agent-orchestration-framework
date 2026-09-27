@executable @docs @work @planning
Feature: the PO brief learns the map and the token, and the architect brief learns the classification review

  WHY. In orchestrated mode the PO and the architect are separate agents, briefed only by their
  own agent documents. If the PO brief does not know the map, a spawned PO drafts none; if it does
  not know the token, the main session's questions cannot be matched to map lines (ADR-003 §2). If
  the architect brief does not know the review, a `technical` label that is really policy takes a
  default nobody checked (ADR-004 §1). Each brief learns its own half and nothing more. The PO
  brief also says the PO does not ask: the main session does, because a subagent has never called
  `AskUserQuestion` (RESEARCH R2) and the answer is anchored to the run's own session (ADR-003 §2).

  RULINGS (QA, 2026-09-24).
  (1) This suite reads the two SOURCE briefs and their six rendered copies, and pins content, not
      wording (133/05's precedent). The map passage sits in the brief's `<ownership>` section.
  (2) The PO brief's token is taught as task 00's is: one worked question per form, which story
      02's `readMapToken` reads back to a story ref and an id. A spoken token the reader drops
      would leave the person's answer anchoring nothing.
  (3) The PO brief pairs each person-licensed label with the token whose answer licenses it, as
      task 00 ruling 4 does. "That token" alone is ambiguous for `stated Q<n>`, which is anchored
      by the QUESTION's token, not the example's.
  (4) The PO agent's `tools:` line keeps `AskUserQuestion`: `src/bundle/frozen-set.jsonc` pins it,
      and this story does not change it. The brief's "does not ask" is the rule the PO follows.
  (5) "Its own half and nothing more" is pinned positively. No negative check reads the architect
      brief for the token or the PO brief for the review, because a negative over prose breaks on
      a harmless cross-reference.

  Background:
    Given `src/bundle/agents/aof-product-owner.md` and `src/bundle/agents/aof-architect.md` are read from this checkout

  Scenario: the PO brief owns the example map
    When the PO brief's ownership section is read
    Then it says the PO drafts a story's `EXAMPLES.md` when `work.examples.enabled` is on: its rules, two or three key examples per rule with real values including the awkward edge, and its questions
    And it says the PO labels every question `business` or `technical`, and that a question it cannot place is `business`

  Scenario: the PO brief says the PO proposes, and never asks or writes a person's label
    When the PO brief is read
    Then it says every example the PO writes is `proposed`
    And it says the PO never writes `confirmed` or `stated` without a person's recorded answer for that token
    And it says the PO does not ask the map's questions itself, and returns them for the main session to ask

  Scenario Outline: the PO brief names the token whose answer licenses each person's label — <label>
    When the PO brief is read
    Then it says <label> is written only after the person's recorded answer to <token>

    Examples:
      | label                      | token                                       |
      | an example's `confirmed`   | the example's own token, `<story ref> E<n>` |
      | an example's `stated Q<n>` | the question's token, `<story ref> Q<n>`    |
      | a question's `answered`    | the question's token, `<story ref> Q<n>`    |

  Scenario: the PO brief carries the token's shape
    When the PO brief is read
    Then it gives the token as `<story ref> Q<n>` for a question and `<story ref> E<n>` for a proposed example put to a person

  Scenario Outline: the token the PO brief teaches is one the reader reads back — <form>
    When the PO brief is read
    Then it shows one worked question text that opens with a <form> token
    And `readMapToken` from `src/work-examples/map.mjs` reads that text to a story ref and an id beginning `<letter>`

    Examples:
      | form                                              | letter |
      | question token, put to a person                   | Q      |
      | example token, a proposed example put to confirm  | E      |

  Scenario: the architect brief owns the classification review
    When the architect brief's ownership section is read
    Then it says the architect reviews every `technical` label on a story's example map and relabels one that is really policy as `business`
    And it says a technical question may take a documented default, recorded as `defaulted <pointer>`
    And it says an ADR never settles a business question

  Scenario Outline: every rendered copy of the two briefs carries its half and matches a fresh render — <copy>
    When <copy> is read
    Then it carries the same <half> passage as its source
    And it is byte-identical to what `aof work update` renders from the current source

    Examples:
      | copy                                  | half                  |
      | `.claude/agents/aof-product-owner.md`   | example map           |
      | `.codex/agents/aof-product-owner.md`    | example map           |
      | `.opencode/agents/aof-product-owner.md` | example map           |
      | `.claude/agents/aof-architect.md`       | classification review |
      | `.codex/agents/aof-architect.md`        | classification review |
      | `.opencode/agents/aof-architect.md`     | classification review |
