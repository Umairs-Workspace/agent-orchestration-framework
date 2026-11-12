---
doc: examples
---
# 192/04 · Discovery researches before it asks — example map
<!--
Drafted at refine's discovery beat, 2026-11-12, and re-cut the same day at the operator's review:
every example below is what a project with operator-aware discovery ON is given. That a project
with it off is given none of it is 192/03's first rule and FF-19204. Struck because the record
answers them: that an unplaceable question is `domain` and is researched first; what each level
does; that researched examples return as one batch to skim and object to; that `I would pick` is
mandatory and `Background:` is added below `expert` (SPEC Scope). Relabelled technical: how many
researchers run, whether the batch carries a token, where an item names its domains, and whether
background counts toward a driven ask's length.
-->

## R1 · A question the PO cannot place is a fact to research, not a question for the operator
- E1 · Drafting a tenancy story, the PO cannot tell whether "How much notice before a landlord enters?" is law or the client's choice: it labels the question `domain` [proposed]
- E2 · "How many days of arrears before we chase?" is the client's choice: it is labelled `policy`, asked of the operator, and never defaulted [proposed]
- E3 · The architect finds "What does the deposit scheme require?" labelled `technical` and relabels it `domain` [proposed]

## R2 · A fact is researched before anyone is asked, unless the operator is expert in its domain
- E4 · The operator is `new` to `tenancy-law`: the notice question goes to the researcher, finding F1 cites the Act, the question closes as researched F1, and the operator is never asked it [proposed]
- E5 · The operator is `expert` in `tenancy-law`: the same question is asked of them directly, by its token, with no research [proposed]
- E6 · Research finds two sources that disagree on the deposit deadline: the question becomes `policy` and is asked, with the finding as its background and a recommendation [proposed]
- E7 · No profile is declared: every domain is treated as `new`, and the hand-back names the gap and the `init-config` command in one line [proposed]

## R3 · What research settles comes back as one batch to skim
- E8 · Story 7/2 has three researched examples: the operator gets one question listing all three with their sources, and answers "no objection" [proposed]
- E9 · The operator objects to the second: it goes back to `proposed`, its question becomes `policy`, and it is asked by its own token [proposed]
- E10 · In a session a loop drives, the batch is one ask for the story, after its policy questions; left unanswered, the story stays at the Contract gate [proposed]

## R4 · Every question comes with a recommendation, and with background below expert
- E11 · A policy question to an operator `working` in its domain carries a `Background:` line, then `I would pick:`, and its first option is the pick [proposed]
- E12 · The same question to an `expert` carries `I would pick:` and no `Background:` [proposed]
- E13 · A driven ask carries `Background:` between its first line and the loop's four lines, the whole under 1,500 characters [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-004 · How many researchers run in a refine? (One pass for every story's domain questions; it is the research document's only writer.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-004 · Does the batch carry a map token? (No. Its anchor is the finding; an objection is asked by the example's own token.)
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-003 · Where does an item name its domains? (`domains:` in its record doc's frontmatter.)
- Q4 · technical · defaulted ARCHITECTURE.md#ADR-005 · Does background count toward a driven ask's 1,500 characters? (Yes.)
