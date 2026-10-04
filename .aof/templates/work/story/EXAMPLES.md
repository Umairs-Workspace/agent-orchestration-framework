<!-- aof-generated: bundle -->

# <story ref> · <story title> — example map
<!--
The story's example map: its rules, two or three KEY examples per rule, and every question the
record cannot answer. The PO drafts it at refine's discovery beat, only when
`work.examples.enabled` is on, and `aof work doctor` judges it before any Scenario is written.

- A rule is a heading; under it, examples with real values, the awkward edge included. Each
  example ends with exactly one provenance label.
- `[proposed]` is the agent's. `[confirmed]` is written only after a person's recorded answer to
  the example's own token, `<story ref> E<n>`; `[stated Q<n>]` only after the answer to that
  question's token, `<story ref> Q<n>`.
- A question is `business` (a person decides it, and it never takes a default) or `technical`
  (it may take a documented default, `defaulted <pointer>`). One you cannot place is `business`.
- A question's state is open, asked, answered or `defaulted <pointer>`. Only `answered` closes a
  business question.
- Ids are unique across the whole map. Close every comment on its own line.

A story with no rule a person owns replaces this whole map with one line:
Not applicable: <why no person owns a rule in this story>
-->

## R1 · A member may hold at most five loans at once
- E1 · A member holding 4 loans borrows a 5th book: the loan is issued [proposed]
- E2 · A member holding 5 loans asks for a 6th: the loan is refused [confirmed]
- E3 · A member holding 5 loans returns 1 and borrows 1 at the same desk visit: issued [stated Q2]

## R2 · An overdue loan blocks new loans
- E4 · A member with one loan a day overdue asks for a book: the loan is refused [proposed]

## Questions
- Q1 · business · open · Does a reserved book count toward the five?
- Q2 · business · answered · May a member swap a book in the same desk visit?
- Q3 · business · asked · Does a loan renewed online reset its overdue clock?
- Q4 · technical · defaulted ADR-004 · Is the limit read from config or held as a constant?
