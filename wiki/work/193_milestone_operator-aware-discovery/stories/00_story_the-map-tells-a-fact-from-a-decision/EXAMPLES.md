---
doc: examples
---
# 193/00 · The map tells a fact from a decision — example map
<!--
Drafted at refine's discovery beat, 2026-11-12. Struck because the record answers them: the two new
labels and what each means, and that a map using `business` stays valid (SPEC Scope, first bullet);
the new provenance and its spelling (SPEC Scope, second bullet). Relabelled technical: what the
parser reads an unknown class as, where a finding lives, and whether `business` may still be written.
-->

## R1 · A question is a fact about the world, a decision, or an engineering choice
- E1 · The question line `Q1 · domain · open · What notice must a landlord give before entry?` parses as class `domain`, state `open`, with no malformed line [proposed]
- E2 · The question line `Q2 · policy · open · How many days of arrears before we chase?` parses as class `policy` [proposed]
- E3 · A question whose class is `regulatory`, a word the grammar does not know, reads as `business` and is reported `bad-class` [proposed]

## R2 · A fact is closed by a cited finding, a decision only by a person
- E4 · A `domain` question in state `researched F2` is closed; the same state on a `policy` question leaves it open [proposed]
- E5 · A `domain` question in state `defaulted ADR-004` is still open: a fact is cited, never defaulted [proposed]
- E6 · An example whose label is researched F2 parses with provenance `researched` and finding `F2`; with the label researched and no id it is `bad-provenance` [proposed]

## R3 · A finding counts only when it names its source
- E7 · The heading `## F2 · What notice must a landlord give before entry?` with a `- **Source:**` line naming a URL reads as finding `F2`, sourced [proposed]
- E8 · The same heading with no Source line, or with `- **Source:**` and nothing after it, reads as `F2`, not sourced [proposed]
- E9 · Two `## F2 ·` headings in one document: `F2` resolves to neither [proposed]

## R4 · A map written before this change reads exactly as it did
- E10 · The map of story 189/00 (one `business · answered` question, one example `stated Q1`) parses to the value it parsed to before, each example gaining a null `finding` [proposed]
- E11 · A `business` question in state `asked` is still open, and in state `answered` still closed [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-001 · What does the parser read a class it does not know as? (`business`, the strictest. The PO's default for a question it cannot place is a labelling rule, 193/04's.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-001 · Where does a finding live, and what makes it sourced? (A `## F<n> ·` heading in the research document, with a `- **Source:**` line.)
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-001 · May a new map still write `business`? (Yes: it reads as `policy`, and the beat that ships today still teaches it.)
