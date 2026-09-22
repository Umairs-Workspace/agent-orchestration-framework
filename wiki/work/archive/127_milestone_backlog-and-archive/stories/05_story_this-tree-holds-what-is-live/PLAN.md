# Build brief — 05 · This tree holds what is live

Advisory, the builder's own. The task features are the contract; this is the shape of the change.

## The mechanism

This story runs the milestone against itself, in three moves. First the one config line, then
the add → promote round trip proved on a SHAPE COPY of the real stream — every `.md` and
`.feature` under the work dir copied to a scratch project (2 MB; no `runs/`), so `next`,
`validate`, `promote` and the board face run over the stream's actual `depends:` edges and
numbering without a single write to the operator's checkout. Second, the archive verb with
`--done`, once, for real: read `git status` before, list the candidates behind the gate, move,
stage EXACTLY the envelope's paths so git pairs the renames, fix the four `wiki/memory.md` links
by hand, run `memory ingest`. Third, the outsider's check as a suite over the real tree that
names real refs (`52`, `32`, the live three) and pins one measured number — the resolving-link
count taken immediately before the move.

Measure before you move: the link scan (03/01's rule) over every `.md` under the work directory, the `aof work
debt` findings set, `git status --porcelain`, `aof work next 32`. Every "same as before"
assertion in task 02 rests on a number you took first.

Do this LAST and on a clean checkout, on the milestone branch: other lanes edit this tree
mid-session, so gate on the item ref, check `git status` before and after the move, never
`git add -A`, and never run the move from a dispatch worktree whose `cd` persisted.

## The verification step

Task 02's suite green through the runner's `--only` selection of its one file
under an isolated global home, plus the two path-reader controls and 03's own suite as focused
runs. `aof work validate` `[]` and `aof work doctor` with no `error` from the repository root
over the moved tree. The work directory listed and read by eye: three live milestones, one blocked uat, the
imported `42_structural-overhaul`, three root files, `archive/`, `backlog/`.

## Out of scope

Any code change — this story writes no `src/` file; if the move surfaces a defect, it is fixed
in the story that owns the file, not here. Archiving `127` itself (after its accept, by the
operator). Anything about `42_structural-overhaul` (not an item; a migration is its own item).
