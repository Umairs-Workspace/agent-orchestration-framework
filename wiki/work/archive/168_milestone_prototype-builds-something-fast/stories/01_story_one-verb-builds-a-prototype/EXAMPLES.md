# 168/01 · One verb builds a prototype — example map

## R1 · Start creates the prototype from the ask, through the one number mint
- E1 · With the stream at 168, `aof work prototype "a CSV importer for bank statements" --today 2026-10-23`: creates `169_prototype_csv-importer-for-bank-statements/` with `PROTOTYPE.md` (status `active`, the ask as `## Intent` and as `- 2026-10-23 · a CSV importer for bank statements` under `## Wants`) and `STATE.md` (`- 2026-10-23 · started` in `## Log`) [proposed]
- E2 · `--slug importer` with the same ask: the folder is `169_prototype_importer` [proposed]
- E3 · `aof work prototype "999"` when no item 999 exists: refused as `prototype-ref-unknown`, and nothing is created [proposed]
- E4 · The ask's slug already names a `backlog/prototype_<slug>` leaf: refused as `insert-backlog-exists`, with nothing written [proposed]

## R2 · Continue folds a new ask into the wants and reopens the prototype
- E5 · `aof work prototype 169 "export to JSON too" --today 2026-10-24` on an `active` prototype: Wants gains `- 2026-10-24 · export to JSON too`, Log gains `- 2026-10-24 · want added: export to JSON too`, status stays `active` [proposed]
- E6 · The same on a `paused` prototype: the want is added, status becomes `active`, and Log gains `reopened` [proposed]
- E7 · `aof work prototype 169` with no addition on a `done` prototype: status becomes `active`, Log gains `reopened`, Wants is unchanged [proposed]
- E8 · `aof work prototype 168` where 168 is a milestone: refused as `prototype-not-a-prototype` [proposed]
- E9 · `aof work prototype 169 --log "dropped the PDF want"`: Log gains `- <date> · dropped the PDF want`, and nothing else changes [proposed]

## R3 · Stop and complete need a written hand-off, and keep a copy of it in the Log
- E10 · `--stop` while `## Hand-off` still holds the template placeholder: refused as `prototype-handoff-missing`, status unchanged [proposed]
- E11 · `--stop` after the session wrote a hand-off: status `paused`, and Log gains `- <date> · stopped` followed by the hand-off as a quoted block [proposed]
- E12 · `--done` on a `paused` prototype with a hand-off: status `done`, Log gains `done` and the quoted hand-off [proposed]
- E13 · `--abandon` on an `abandoned` prototype: refused as `status-edge-not-applicable`, naming `active` [proposed]

## R4 · The prototype is built in the operator's own session
- E14 · `/aof:prototype` carries no `Agent` tool, makes no branch or worktree, runs no review lane and makes no commit [proposed]
- E15 · The command ships for claude and opencode and as a codex workflow section, and `aof work update` brings it into a project [proposed]
- E16 · `aof:explain 169` answers with the prototype's `## Intent` [proposed]
- E17 · `/aof:prototype "a CSV importer"` while the checkout is on `main`: the command says once, before building, that you are on `main` and should commit to a branch, then builds as normal [stated Q1]
- E18 · The same on branch `work/csv`: no branch line, it just builds [proposed]

## Questions
- Q1 · business · answered · You start a prototype while this checkout is on `main`. A prototype builds on the current branch and the command never commits, so the code and the new folder sit uncommitted on `main` until you move them. Should the command (a) just build, (b) build and say once, at the start, that you are on `main` and should commit to a branch, or (c) refuse until you switch branch? (b) costs one line. (c) stops a timed test until you make a branch. Answer (2026-10-22): (b) build, and say once at the start that you are on `main`.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-004 · How is the slug made from the ask? Lowercased words joined by `-`, with leading filler (`a`, `an`, `the`, `build`, `me`) dropped and at most six words kept; `--slug` overrides it.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-004 · Does a move record a time of day? No, only the date.
- Q4 · technical · defaulted ARCHITECTURE.md#adr-004 · Does the verb mint a run record? No.
