# 128 · work memory joins the route table — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by the MAIN-SESSION GOVERN COMMAND THAT ACCEPTS the
  item (ADR-004, reconciled at 85: aof:verify, or aof:assimilate-code, which reaches done in
  its own step) — never at insert, and never by a developer/evidence subagent, which is the threat
  the rule names (they have Write and have been observed to clobber records and fabricate decisions).
  States product STATE ("the system now IS X"), never motive ("we built X because Y" — that reasoning
  belongs in RETROSPECTIVE.md). This is an ADDITIONAL artifact: it carries no identity frontmatter and
  is never this item's record doc.
-->

## Delivered

### The `work memory` route
`work:memory` (`src/commands/work/memory.mjs`) is a registered command whose `cli.route` is
`["work", "memory"]`; `deriveRouteTable()` carries the key `work memory`, and
`resolveRoute(["work", "memory", …])` lands on it with the verb and its arguments as the rest.

### One door
`src/cli.mjs` carries no `subcommand === "memory"` branch and no `workMemoryCommandCli`;
`workMemoryCommand` is exported by nothing and imported by nothing under `src/`; `aof --help` lists
`aof work memory …` under `Work` and the static `Also:` tail names `aof session` alone.

### The seam's parse, applied by its one home
The command's `cli.argv` re-serialises the face's parse into argv and hands it to
`parseMemoryArgv`, so the six scope flags, `--item` as both recall filter and rebuild scope,
`--all`, and the non-positive-or-non-numeric `--limit` fallback are applied by the seam and not
copied; `SCOPE_FLAG_SPECS` is derived from the seam's `SCOPE_FLAGS`.

### One core path for both doors
`runMemoryVerb` answers help before resolving a backend, gates the verb as a coded `unknown-verb`
refusal (status 400), then resolves and dispatches through `executeMemoryVerb`; the routed
command's `run` calls it with the face's input, and `runMemory` — the in-process entry the twenty
test harnesses and the `retrospective-memory-ingest` loop record actuate — composes over it with
`parseMemoryArgv`'s.

### The help guard at the parse
`parseMemoryArgv` answers `help: true` for `--help` or `-h` anywhere in argv, checked before any
other token; through either door a help request prints the usage on stdout at exit 0 and reaches no
backend; `help` typed as a verb is an unknown verb.

### The two projections
`renderMemory` and `memoryJson` are the seam's one human and one `--json` projection per verb; the
command's `render`/`json` and the collector-based `defaultRender` call the same two. `--json` recall
is the records array; brief the digest without `text`; reindex/ingest the summary without
`records`; status the `{ backend, recordCount, … }` object; help `{ usage }`.

### A `null` render prints nothing
`runCommandFace` prints a rendered result only when it is not `null`; `renderMemory` answers `null`
for an empty injection block, so `recall <miss> --block` on a backend that answers no record is zero
bytes on stdout at exit 0.

### The spine's policies, inherited
An undeclared flag — `--bogus`, and `--help` alike — is `Unknown flag "…" for work:memory.` at exit
1; under `--json` every refusal is the face's one envelope carrying `code`.

### The one usage line
`MEMORY_USAGE` is the seam's exported usage line; `cli.spec.usage` and `memoryUsage()`'s first line
read it, and it spells `--all` and `--block`.

### The four frozen lists
`WORK_IDS` carries `work:memory`; `BOARD_DEFERRED` carries `memory` with its stated reason;
`argsFor("memory")` is `status --json`; `PRINTERS` has no `work/memory.mjs` row and
`PRINTER_CEILING` is 11; `src/work/memory.mjs` calls `console.log` nowhere.

### `src/commands/work/`
The directory exists with one member, and `SOURCE_DIRECTORY_BUDGETS` carries a row for it at
ceiling 1 / allowance 0 whose `why` names the fold of the other `work:*` commands as a separate
item; `test/integration/features` is a budget row (9) rather than an exemption, and
`test/integration/steps` is at 10.

### The integration scenario
`test/integration/features/work-memory.feature` runs through the real CLI with steps resolved by
convention from the shared grammar: `status` renders `memory: backend=none records=0` on a bare
fixture, `status --json` answers `backend: "none"`, and `bogus` fails naming the verb.

### 125's README control, green
`acd-readme-names-what-ships`'s *every command the README spells resolves* row passes unedited; the
five `aof work memory` lines the README spells resolve through `deriveRouteTable`.

### 124/02's leg 4, flipped
`acd-learning-edge-reaches-every-cut` leg 4 asserts that a registered command's route IS
`work memory`, and still reads the memory flag surface from `src/work/memory.mjs`'s own branches.

### The loop record
`retrospective-memory-ingest.md` (bundle member, installed copy and manifest entry in agreement)
states that the memory surface is the registered command id `work:memory` and that
`module:src/work/memory.mjs#runMemory` remains the narrowest real export for the ingest act; its
four seam line citations are the shipped seam's.

## Assumptions

- **the `none` backend is the bare default** — `status` on a fixture with no `memory.backend`
  answers `backend=none records=0` because absent ≡ none (05/ADR-002).
- **a miss is a backend property** — zero bytes from `--block` is observable only on a backend that
  answers no record; the graphify backend ranks records for any query (measured: five for a
  nonsense string), so on it the empty-block rule never fires.
- **scope flags stay hyphen-free** — `SCOPE_FLAG_SPECS` is derived from `SCOPE_FLAGS`, and the face
  binds `--foo-bar` to `fooBar`; a hyphenated dimension added to the seam would need its spec key
  camelCased by hand in the command.
- **a single-dash `-h` is a positional to the spine** — the guard lives in the seam's parse because
  the face never sees `-h` as a flag; a spine change that started treating single-dash tokens as
  flags would make the parse-side guard unreachable by that spelling and the spine's refusal the
  answer instead.
- **the record's line citations hold until the seam is next edited** — `m58/FF-5810` checks the
  defining-export citation only; the `runMemoryVerb` and reindex-alias citations are checked by
  nothing.

## Gaps

### The `work:*` fold into `src/commands/work/`
- **Status:** open
- **Discharge condition:** every `work:*` command module lives under `src/commands/work/`, the
  `src/commands` budget row falls by their count, and the `src/commands/work` row's ceiling rises
  to the fold's count with a `why` that names the fold as done.
`src/commands/work/` is founded with one member; the other `work:*` command modules remain direct
children of `src/commands/`, and the family row's ceiling of 1 refuses a second lone member that is
not the fold.
