@executable @cli @work @validate
Feature: A fact is closed by a cited finding, a decision only by a person

  WHY. A fact needs a way to be settled that is neither a person nor a default: a finding, cited by
  its id (ADR-001 §2, §3). A decision keeps the rule `business` had: only a person's answer closes
  it (ADR-001 §4). The map's queries say which questions are open and which lines cite a finding,
  so the doctor lane and the build door ask one place.

  Rule: R2 · A fact is closed by a cited finding, a decision only by a person

    Scenario: E4 · a cited finding closes a fact and never a decision
      Given a map holding "- Q1 · domain · researched F2 · What notice must a landlord give?"
      And "- Q2 · policy · researched F2 · How many days of arrears before we chase?"
      When the map is asked which questions are still open
      Then it answers Q2 and not Q1

    Scenario: E5 · a fact is never closed by a default
      Given a map holding "- Q1 · domain · defaulted ADR-004 · What notice must a landlord give?"
      When the map is asked which questions are still open
      Then it answers Q1

    Scenario: E6 · an example cites the finding that supports it
      Given a rule holding "- E1 · 24 hours' written notice, entry at 10:00 the next day: allowed [researched F2]"
      When the map is parsed
      Then example E1 has provenance "researched" and finding "F2"
      And an example whose label is "[researched]" is reported malformed with reason "bad-provenance"

    Scenario Outline: what closes a question depends on who owns it
      Given a map holding one question of class "<class>" in state "<state>"
      When the map is asked which questions are still open
      Then the question is <listed>

      Examples:
        | class     | state             | listed     |
        | policy    | open              | listed     |
        | policy    | asked             | listed     |
        | policy    | answered          | not listed |
        | policy    | defaulted ADR-004 | listed     |
        | policy    | researched F2     | listed     |
        | business  | defaulted ADR-004 | listed     |
        | business  | researched F2     | listed     |
        | business  | answered          | not listed |
        | domain    | open              | listed     |
        | domain    | asked             | listed     |
        | domain    | answered          | not listed |
        | domain    | researched F2     | not listed |
        | technical | open              | not listed |
        | technical | researched F2     | not listed |

    Scenario Outline: the state names exactly one finding
      Given a map whose Questions section holds "- Q1 · domain · <written> · x"
      When the map is parsed
      Then question Q1 has state "<state>" and pointer <pointer>
      And its malformed reason is <reason>

      Examples:
        | written          | state      | pointer | reason      |
        | researched F2    | researched | "F2"    | none        |
        | researched F12   | researched | "F12"   | none        |
        | researched       | open       | null    | "bad-state" |
        | researched F0    | open       | null    | "bad-state" |
        | researched F02   | open       | null    | "bad-state" |
        | researched Q2    | open       | null    | "bad-state" |
        | researched F2 F3 | open       | null    | "bad-state" |

    Scenario Outline: an example's label names exactly one finding, at the end of the line
      Given a rule holding "- E1 · some outcome <label>"
      When the map is parsed
      Then the line's malformed reason is <reason>

      Examples:
        | label                          | reason           |
        | [researched F2]                | none             |
        | [researched F0]                | "bad-provenance" |
        | [researched Q1]                | "bad-provenance" |
        | [Researched F2]                | "bad-provenance" |
        | [researched F2] [proposed]     | "bad-provenance" |
        | [researched F2 F3]             | "bad-provenance" |

    Scenario: the map lists every line that cites a finding, in line order
      Given a map with example E2 labelled "[researched F1]", question Q1 in state "researched F1" and question Q2 in state "researched F3"
      When the map is asked for its research claims
      Then it answers E2 citing "F1", Q1 citing "F1" and Q2 citing "F3", each with its line number, in line order

    Scenario: a cited finding is not a person's claim
      Given a map whose only non-proposed example is labelled "[researched F1]"
      When the map is asked for the claims a person must stand behind for story "193/00"
      Then it answers none

    Scenario: a finding id is never an answer token
      When the token reader reads "193/00 F1 · Is this finding right?"
      Then it answers no token
