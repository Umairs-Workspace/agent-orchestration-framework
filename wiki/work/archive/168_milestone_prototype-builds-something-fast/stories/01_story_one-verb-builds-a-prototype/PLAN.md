# 01 · One verb builds a prototype — build plan

## Mechanism

**The CLI half** is one command module shaped like `insert-chore`: a factory that receives
`runInsertTopLevel` and the shared flags from its core binding, registered in `command-core`.
Its `run` dispatches in this order:

1. Exactly one of `--stop`, `--done`, `--abandon` may be set (`prototype-one-move`).
2. Classify the positional. All digits → resolve as a ref (`prototype-ref-unknown` if nothing,
   `prototype-not-a-prototype` if another type). A slug matching an existing prototype → ref.
   Anything else → the ask, and the move is start.
3. **Start** derives the slug (or takes `--slug`), calls `runInsertTopLevel({ type: "prototype" })`
   and `append: true`, then fills `## Intent`, the first `## Wants` line and `- <date> · started`.
   The append form is the bare `promoteRow(..., { atGiven: false })` the promote verb already
   performs, taken only when `append` is set. Without it a missing `at` is still
   `insert-invalid-at`, so every `insert-*` face keeps its delivered refusal.
4. **Continue** appends the addition and its log line, then reopens through `setItemStatus` (the
   per-type edges from 00) when the status is not `active`.
5. **Stop / done / abandon** reads `## Hand-off`, refuses on the template placeholder, makes the
   move, and appends the dated line plus the hand-off as `> ` lines.

Section edits are line-level: find the `## <name>` heading, append before the next `## `. One
small helper in the module, used for Wants and Log alike; do not grow a markdown parser.

**The prompt half** is `prototype.md`: read the record and hand-off, check the branch
(`git branch --show-current`, read-only) and say the one `main` line, call the verb, build,
keep `## Shortcuts` current, `--log` as it goes, write the hand-off before `--stop`. Its
`allowed-tools` are add-chore's minus `Agent`. Declare it in `bundle.json` with add-chore's
runtimes and the codex `workflow.md` section; regenerate `manifest.json`.

## Verification step

In an isolated home and temp tree: start a prototype, add a want, try `--stop` (refused), write
a hand-off by hand, `--stop`, continue, replace the hand-off, `--done`. The Log must then hold
`started`, `want added`, `stopped` + quote, `reopened`, `done` + quote, in that order, and
`aof work validate` exits 0 after every step. Then `aof work update` in a scratch project and
look for `prototype.md` under `.claude/commands/aof/` and `.opencode/commands/aof/`.

## Out of scope

- Diagrams on a prototype — 02.
- The board — 03.
- Committing, branching or archiving anything — the operator does that.

## Known traps

- FF-12703 counts `appendPosition` callers; reach it only through `runInsertTopLevel`.
- FF-7103 source-parses `DOCS_BY_TYPE`; its admissible set gains `prototype` with a reason, and
  the type the loop may create stays `chore`.
- The scaffold leaves no `backlog/` behind (the alias's rollback) — E1 asserts that.
