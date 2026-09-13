# Build brief — 03 · Archive is a move

Advisory, the builder's own. The task features are the contract; this is the shape of the change.

## The mechanism

The verb is a rename plus a bounded rewrite. Resolve the ref through `findWork`, refuse unless the
driver's status is `done`, refuse a story ref, then move the folder verbatim under `archive/`. The
rewrite touches ONLY relative markdown links that cross the archive line: inside the moved folder,
a link to a root sibling gains one `../`; at the root and under `backlog/`, a link into the moved
folder gains `archive/`. The rewriter matches link syntax, never a frontmatter line, which is what
FF-12705 pins — the command imports no reindex module and writes no number. `--done` is the same
act iterated over every done driver at the root, in number order, reported per item.

The fleet follows through the effect that already publishes a stream mutation after an insert;
this story raises the same transition with the new `dir`. The one runtime reader of a live item
path (the tune arch-test) is rewritten to resolve the story through `findWork` so no future move
touches it again.

## The verification step

Over a fixture stream: archive a done milestone that a root sibling links to and that links back;
`find NN`, `read NN`, `validate` and `doctor` still answer for it; `next` and the default
listing do not; both crossing links open; `git status` over the fixture shows renames plus the
two link lines and nothing else; archiving an in-progress driver is refused. FF-12705 green with
its red probe recorded.

## Out of scope

Running `--done` over this repository (05); the board's toggle (04); any automatic archive on
`done`.
