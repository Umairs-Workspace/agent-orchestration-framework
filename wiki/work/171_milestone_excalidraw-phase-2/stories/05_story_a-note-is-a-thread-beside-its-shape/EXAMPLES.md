# 171/05 · A note is a thread beside its shape — example map

## R1 · A reply continues the note, reopens it, and reaches an open session
- E1 · A note on `gateway` was answered by the architect; the operator replies "And what about the cache?": the note holds three turns — the note, the answer, the reply — and is open again [proposed]
- E2 · A note the architect answered with a proposal gets a reply: the note is open again, and the proposal is unchanged [proposed]
- E3 · The operator replies to a withdrawn note: the reply is refused, and the note stays withdrawn [proposed]
- E14 · The architect's session is running when the operator replies: the reply's review invocation is typed into it [proposed]

## R2 · The architect's answer is a turn of the thread
- E4 · The architect responds to the reply: the thread gains an architect turn, and the note's answer is that turn's text [proposed]
- E5 · A note recorded and answered before this milestone, with no thread: it reads as two turns, the note then the answer [proposed]
- E6 · The architect's context for the note carries all three turns, oldest first [proposed]

## R3 · A note's thread is read beside the shape it names
- E7 · A note names `gateway`: a pin sits on Gateway's top-right corner, and clicking it opens the thread beside Gateway [proposed]
- E8 · Gateway has two notes: its pin shows 2, and the thread lists both notes [proposed]
- E9 · A note names the whole diagram: no pin is drawn; the note is in the review panel [proposed]
- E10 · The shape a note names is deleted: no pin is drawn; the note is in the review panel [proposed]
- E11 · A note names `gateway` and `cache`: one pin sits on the corner of the box that encloses both [proposed]

## R4 · The pin says whether the architect is waiting on the operator
- E12 · The last turn is the architect's: the pin is drawn in the console's primary colour [proposed]
- E13 · The last turn is the operator's: the pin is drawn muted [proposed]


## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-006 · Is a reply to a withdrawn note allowed? No: withdrawing closes a note by the operator's choice; a new note is the way to raise it again.
- Q2 · technical · defaulted DESIGN.md · Where does a pin sit for a note on several shapes? One pin, on the corner of the box enclosing them all.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-006 · How long may a thread grow? Within the record's existing size limit; past it the reply is refused `diagram-review-too-large`.
