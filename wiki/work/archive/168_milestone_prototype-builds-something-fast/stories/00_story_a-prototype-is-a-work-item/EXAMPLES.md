# 168/00 · A prototype is a work item — example map

## R1 · A `NN_prototype_<slug>` folder at the root is a work item that every ref reader resolves
- E1 · `wiki/work/169_prototype_csv-importer/` holding `PROTOTYPE.md` (`type: prototype`, `number: 169`): `aof work find 169 --json` answers one row with type `prototype`, slug `csv-importer` and its status [proposed]
- E2 · The same folder under `backlog/` as `prototype_csv-importer/` (no number): `aof work find csv-importer` answers it with `number: null` [proposed]
- E3 · A folder named `169_prototypes_csv-importer` (plural): not an item, and `find 169` answers nothing [proposed]

## R2 · A prototype has its own four status words and only their moves
- E4 · A prototype at `active`: `aof work status 169` lists its legal moves as `paused|done|abandoned` [proposed]
- E5 · A prototype at `done` asked to move to `active`: the move is made and `updated:` is bumped [proposed]
- E6 · A prototype at `active` asked to move to `in-review`: refused as `status-edge-not-applicable`, naming `paused|done|abandoned` [proposed]
- E7 · A milestone at `in-progress` asked to move to `paused`: refused, because the frozen five never gained the word [proposed]

## R3 · Validate holds a prototype to its two files and nothing else
- E8 · `PROTOTYPE.md` with Intent, Wants and Shortcuts, `STATE.md` with Hand-off and Log, no `stories/`, `tasks/` or VERIFICATION, in each of `active`, `paused`, `done` and `abandoned`: `aof work validate` exits 0 and `aof work doctor 169` reports nothing on it [proposed]
- E9 · `PROTOTYPE.md` with no `## Shortcuts` heading: one validate finding naming the missing section [proposed]
- E10 · No `STATE.md` in the folder: one validate finding naming `STATE.md` [proposed]
- E11 · `status: in-progress` on a prototype: `invalid status "in-progress"`, naming the four words [proposed]
- E12 · `depends: [12]` on a prototype: one finding saying a prototype carries no `depends:` [proposed]

## R4 · A prototype is never scheduled and nothing waits on it
- E13 · A stream holding only an `active` prototype: `aof work next` offers nothing [proposed]
- E14 · A milestone with `depends: [169]`, where 169 is a prototype: the existing "does not resolve to a top-level item" finding [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-003 · Are `paused` and `abandoned` new words on their own, or mapped onto `blocked` and `done`? Their own words, declared beside the frozen five.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-005 · Is `## Diagrams` a required section? Optional; only Intent, Wants and Shortcuts are required.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-005 · Does the doctor's coherence lane report on a prototype? No; its lifecycle lanes skip the type.
- Q4 · technical · defaulted ARCHITECTURE.md#adr-005 · Does the untouched template validate clean? No; it is red until start fills Intent and the first Want, so a hand-made folder is not a prototype yet.
