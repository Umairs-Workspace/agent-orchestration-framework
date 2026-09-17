# Build brief — 03 · Archive is a move

Advisory, the builder's own. The task features are the contract; this is the shape of the change.

## The mechanism

Three layers, the reindex shape exactly. The FACE (`src/commands/archive.mjs`) resolves the ref
through `findWork`, refuses in the order task 00 spells (missing/both-forms → not-found → not a
driver → backlog → already archived → not done → destination exists), selects the `--done` set
and gates it (`archive-confirm-required` unless `--yes`), then calls the SEAM and renders. It
declares its own three flags — `insert-shared.mjs` is off limits (FF-12705) — and imports only
`work.mjs`, the seam and `command-error.mjs`.

The SEAM (`transitionStreamArchived` beside `transitionStreamReindexed` in the
stream-transitions effects module) is lock → fact → event: `guardItemLock` over every driver
and story ref that moves, the engine as the fact, `stream.archived` appended and drained, with the
d2 rule for a journal that will not open. Its one reactor row in `table.mjs` is `publish-projection`
— nothing to remap, because no ref changes.

The ENGINE (the `archive` module of the work family, `reindex.mjs`'s twin: fs only, no effects, no reindex, no
`number:`) renames every folder in M under `archive/` in number order, then runs ONE rewrite pass
over every `.md` under the work dir with M known. The rewriter is syntactic: for each inline
`](target)` with a relative target, resolve against the file's directory and classify against M —
file-in/target-out gains `../`; file-out/target-in gains `archive/` before the moved segment;
both-in or both-out is untouched. Existence is never consulted; each file's own EOL and BOM are
preserved; a file with no change is not written.

The two path-readers (`acd-tune-carries-no-second-rule`, `acd-declared-program-single-speller`)
resolve their fixture through `findWork` inside an async `run`. The wrapper `archive.md` drives
the verb and computes nothing; `verify.md` gains one `Next:` line; `aof work update` renders both.

## The verification step

Over the archive fixture (127/01's three roots + `12_milestone_theta` done with the links task 01
lists): archive `12`; every relative link in the tree resolves to what it resolved to before; `find
12`, `doc 12 SPEC`, `validate`, `doctor 12` and `next 11` (depends: [12]) still answer; `next` and
the default `list` do not; `git status` shows the rename plus exactly the rewritten files; the
journal holds one `stream.archived` with `[publish-projection]` settled; in the item-lock fixture
the store's `12` row carries the new `source_path`. Then `--done --yes` over `12` + `13`: the
link between them is untouched. FF-12705 green, six red probes recorded, four budget rows moved.

## Out of scope

Running `--done` over this repository (05); the board's toggle and the cache's `archived` column
(04); any automatic archive on `done`; rewriting anything outside the work directory; the retired `.mjs`
suites' relative imports (they move, stay in no runner).
