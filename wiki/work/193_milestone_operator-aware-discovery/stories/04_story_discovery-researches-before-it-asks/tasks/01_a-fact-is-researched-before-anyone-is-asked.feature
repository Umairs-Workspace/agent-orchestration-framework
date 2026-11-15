@executable @docs @work @planning
Feature: A fact is researched before anyone is asked

  WHY. Between "the record does not say" and "ask the operator" there was no step. Now a fact goes
  to the researcher first, unless the operator is expert in its domain (ADR-004 §2-§5). The level
  comes from the operator's profile and the domains the item names (ADR-003). One researcher pass
  serves the whole refine and is the research document's only writer.

  THE TEXTS UNDER TEST: "the fixture" and "the discovery passage" as in task 00, read from the
  fixture's render; "the researcher brief" is the fixture's rendered researcher agent.

  Rule: R2 · A fact is researched before anyone is asked, unless the operator is expert in its domain

    Scenario: E4 · below expert, a fact goes to research and is not asked
      When the discovery passage is read
      Then it says a "domain" question whose domain the operator knows at "working" or "new" goes to the researcher before any person is asked
      And it says a question a finding settles is marked "researched F<n>", and the examples it supports are labelled with the same finding
      And it says such a question is not put to the operator as a question of its own

    Scenario: E5 · an expert is asked directly
      When the discovery passage is read
      Then it says a "domain" question whose domain the operator knows at "expert" is asked of them directly, by its token
      And it says no research is run for it

    Scenario: E6 · a fact research cannot settle becomes a decision
      When the discovery passage is read
      Then it says a question no source settles, or whose sources disagree, or that the finding shows to be a choice, is relabelled "policy"
      And it says it is then asked with the finding as its background and a recommendation

    Scenario: E7 · with no profile, every domain is new and the hand-back says so
      When the discovery passage and the "<output>" region are read
      Then the passage says an undeclared profile makes every domain "new"
      And the output says the hand-back names the gap and the "aof work init-config --operator-role" command in one line

    Scenario: the session reads the profile and the domains once
      When the discovery passage is read
      Then it reads the operator's profile from "aof project show --json"
      And it reads the item's domains from "domains:" in the record doc's frontmatter
      And it says that when the record doc names none, the PO adds "domains:" to its frontmatter, reusing the profile's own domain names where one fits
      And it says these are subject areas the operator may or may not know, not the feature-area tags of "work.tags.domains"
      And it does not tell the session to read "~/.aof/aof.config.json" itself

    Scenario Outline: the level decides what happens to a fact
      When the discovery passage is read
      Then it says a "domain" question at level "<level>" is <handled>

      Examples:
        | level                 | handled                                                |
        | expert                | asked directly, with no research                       |
        | working               | researched, then confirmed in the batch, briefly       |
        | new                   | researched, then put in the batch with background first |
        | a domain not listed   | handled as "new"                                       |

    Scenario: a question takes the level of its domain
      When the discovery passage is read
      Then it says the PO attributes each "domain" question to one of the item's domains
      And it says one it cannot attribute takes the lowest level among them, and "new" when the item names none

    Scenario: one researcher pass, and one writer of the research document
      When the discovery passage is read
      Then it says the domain questions of every story being refined go to the researcher together, in one pass
      And it says in orchestrated mode that is one "aof-researcher", never one per story
      And it says in solo mode the session plays the researcher itself
      And it says only that pass writes findings into the research document

    Scenario: the researcher brief owns the finding
      When the researcher brief is read
      Then it says each domain question gets one finding, in the research template's form
      And it says a finding names its source: a URL or a named document and its section for a fact about the world, "path:line" for a fact in the repository
      And it says what the model recalls is not a source
      And it says a question no source settles is reported as not settled, with what was consulted, and never guessed
      And it still says the researcher reports and does not decide

    Scenario: the role reaches every PO and researcher prompt, the Decide stage's included
      When the fixture's refine command is read
      Then it says, where it says who plays the roles, that every PO and researcher prompt the session writes opens with the operator's role when a profile is declared
      And it says a solo session holds the role while it plays those roles
      And it says the role is read from "aof project show --json"

    Scenario: the briefs pitch their work at the role and the level they were given
      When the PO brief and the researcher brief are read
      Then each says its prompt may open with the operator's role, and to write for that reader
      And the PO brief says to pitch each question at the level given for its domain

    Scenario: a decision is still never defaulted, and a finding is not a default
      When the discovery passage and the "--autonomous" block are read
      Then each says a "policy" question never takes a default
      And the passage says a finding with no source settles nothing
