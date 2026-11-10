# 168/03 · The board shows a prototype — example map

## R1 · A prototype card sits in an existing lane, mapped from its own status
- E1 · An `active` prototype 169: its card is in the `in-progress` lane [proposed]
- E2 · A `paused` prototype: its card is in the `not-started` lane [proposed]
- E3 · A `done` prototype and an `abandoned` one: both cards are in the `done` lane [proposed]

## R2 · The card says it is a prototype and shows its own status word
- E4 · The `paused` card's tag reads `prototype · paused`, although it sits in the `not-started` lane [proposed]
- E5 · The `abandoned` card's tag reads `prototype · abandoned`, although it sits in the `done` lane [proposed]

## R3 · A prototype is never counted as milestone work
- E6 · A board with one milestone at `in-progress` and two `active` prototypes: the active-milestone count is 1 [proposed]
- E7 · A board with a `paused` prototype and no blocked `uat`: the blocked-gate count is 0 [proposed]

## R4 · Opening a prototype card shows its own two documents
- E8 · Opening prototype 169's card: the panel opens on `PROTOTYPE.md`, offers a `STATE.md` tab, and offers no SPEC, ARCHITECTURE, VERIFICATION, RETROSPECTIVE, RUNS or Findings tab [stated Q1]
- E9 · `work:doc` for 169's `PROTOTYPE` answers the file's text; for a folder with no `PROTOTYPE.md` it answers `present: false` [proposed]

## Questions
- Q1 · business · answered · When you open a prototype's card on the board, what should the detail panel show? Today a spike or chore card opens on a SPEC tab it does not have. (a) The card in its lane is enough for now; the panel stays as it is for spike and chore. (b) The panel opens on `PROTOTYPE.md`, with a tab for `STATE.md`; this adds two document names to the board's reader. (b) lets you read the wants and hand-off without leaving the board, and costs a server change in this story. Answer (2026-10-22): (b) open on `PROTOTYPE.md`, with a `STATE.md` tab.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-007 · Where does each status go? `active` to in-progress, `paused` to not-started, `done` and `abandoned` to done, in one function in `model.ts`.
