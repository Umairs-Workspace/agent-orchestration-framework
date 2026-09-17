# 127/02 · Promote mints the number — Outcome

## Delivered

### One mint
`aof work promote <slug> [--at P] [--yes] [--json]` (`src/commands/promote.mjs`, `/aof:promote`)
is the only place a top-level number is minted: it resolves exactly one backlog row by slug
(`promote-not-found` / `promote-ambiguous` / `promote-numeric-ref` otherwise), takes the next
number from `appendPosition` over every NUMBERED row — live and archived — or opens the slot at
`P` through the existing reindex seam (`transitionStreamReindexed`, `space: "top-level"`, the
count gate unchanged), renames the backlog leaf into the stream and stamps `number:` and the
`# NN · ` heading prefix surgically; `status:` and `updated:` are untouched.

### An archived number is never re-minted
`--at P` refuses (`promote-number-archived`) when an archived driver holds a number in the shift
range, and the append counts archived rows, so no promotion writes a number an archived folder
already carries.

### `depends:` is validated at promotion
A backlog item's `depends:` is a planning note until `promote` reads it: a numeric entry must
resolve live or archived (`promote-depends-unresolved`), an entry naming another backlog slug is
refused (`promote-depends-backlog`) with both ways out named.

### `insert-*` are what `promote --at` is
`insert-milestone|chore|uat` scaffold into `backlog/` and promote at `P` through `promote.mjs`'s
`runInsertTopLevel`; `insert-story` keeps the nested engine (a milestone's local axis is not a
stream number); `src/commands/insert-shared.mjs` shrank 638 → 628 lines and neither it nor any
insert face computes a number.

### `work.intake` is write-side only
`initConfig` writes `work.intake: "backlog"` only into a config it creates; an absent key reads as
`"stream"`; the token appears in `src/**` only in `init.mjs`, `init-update.mjs`, `promote.mjs`
(one refusal text) and the bundle prompts; no reader branches on it. A phase door
(`work:continue|refine|verify`) refuses a backlog ref (`phase-backlog-ref`).

### The prompts have one door
`aof:add-milestone|chore|spike|uat|story` scaffold un-numbered under `<work.dir>/backlog/[group/]`
under either setting and compute no number — under `"stream"` they call `aof work promote`;
`aof:refine` and `aof:continue` promote a backlog ref as step 0 and continue with `created.ref`;
`aof:add-story` refuses a backlog parent ("promote first") and an archived one; all eleven prompts
are rendered into the three runtime trees with their manifest hashes.

## Assumptions

- **the fleet cache row** — a promoted item enters the cache as an appended insert does; the
  cache-first row SHAPE for backlog and archived items is 127/04's.
- **`promote-finding-to-chore` / `promote-gap-to-chore`** — unchanged callers of `appendPosition`;
  they append to the stream, never to the backlog (SPEC out-of-scope, revisit if the backlog turns
  out to be where they belong).

