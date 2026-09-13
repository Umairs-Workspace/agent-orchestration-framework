# Build brief — 05 · This tree holds what is live

Advisory, the builder's own. The task features are the contract; this is the shape of the change.

## The mechanism

This story runs the milestone against itself. It sets the intake key in this repository's config,
runs the archive verb with `--done` over the real stream, and records the outsider's check as a
behavioural test over the real tree plus the command transcripts. The diff is almost entirely
renames; the reviewer reads it as such. The ledger entries the milestone discharged (the regex
copies, the scanners) are deleted, not annotated.

Do this LAST and on a clean checkout: other lanes edit this tree mid-session, so gate on the item
ref, check `git status` before and after the move, and never `git add -A`.

## The verification step

The SPEC's last paragraph, executed: add an item and find it under `backlog/` with no number;
promote it and find it at the root with the next number, with `find`, `validate`, `next` and the
board agreeing; `aof work find 52`, `read 52`, `memory ingest`, `depends` resolution and
`validate` answer for the archived milestone while `next`, `loop` and the default listings do
not; `ls wiki/work` is a short list of live items. `aof work validate` and `aof work doctor` are
green over the whole tree after the move.

## Out of scope

Any code change — this story writes no `src/` file; if the move surfaces a defect, it is fixed in
the story that owns the file, not here.
