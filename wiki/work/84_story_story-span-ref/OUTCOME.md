# 84 · A story span is a ref — Outcome

## Delivered

### The story-span ref form
`NN/MM-PP` is an admitted work-item ref: `aof work find 44/01-03` resolves it to the story rows
44/01, 44/02 and 44/03, ordered by story number rather than by directory listing order, and a span
that names no existing story answers with the empty set at exit 1 on the human face and `[]` at exit
0 on `--json`.

### A span-scoped walk
`aof work next 44/01-03` narrows the walk to driver 44 and to the stories 01..03 within it, and
answers with the same `readySet`/`wave`/`heldSet` shape every other scope form answers with. The
milestone's own dependency answer is unchanged by the narrowing: an in-span story that depends on an
out-of-span sibling is reported `blocked` naming that sibling as a full ref.

### A span never offers its milestone
No driver-grained offer reaches a span-scoped answer. Every in-span story being done answers
`{ state: "done" }` rather than offering the milestone for acceptance; a uat session, spike or chore
addressed by a span offers nothing rather than itself; and an un-broken-down milestone addressed by a
span offers nothing rather than "needs break-down". A driver-level `depends` block still reports
`blocked` at the milestone.

### A continue lane for a named subset
`aof:continue` dispatches on a span as well as on an item type. Its span branch reuses the milestone
lane and states three differences from it: the walk is scoped to the span and never widened to the
bare milestone mid-walk, an out-of-span dependency is reported and stops the walk rather than being
built, and the milestone's own `status:` is neither moved nor accepted.

## Assumptions

- **The two admitting surfaces are `find` and `next` alone** — `aof work loop` keeps its frozen
  `LOOP_SCOPE_FORMS` guard and still refuses story refs with `loop-scope-unsupported`, so
  `aof:autonomous` continues to take `NN-MM` driver ranges only.
- **`src/work.mjs` cannot import `src/work-ref-scope.mjs`** — the session driver's root-inclusive
  import reach measures the ADR-015 §5 ceiling of 24 exactly, so FF-5301 reddens on the import alone.
  The span parser therefore sits in `work.mjs` beside `inRange` rather than in the subtree-scope leaf.
- **The span's ordering is the milestone walk's ordering** — callers that drive a span's members in
  sequence rely on `findWork` returning them sorted by story number.

## Gaps

### An unparsed scope is still silently discarded by `next`
- **Status:** discharged (by story `86`, 2026-09-04)
- **Discharge condition:** `inRange`'s trailing `return () => true` no longer applies to a shape that
  looks like a story ref — either the fall-through becomes an explicit unscoped decision the caller
  can see, or `^\d+/` shapes that are not spans are refused.

`inRange` returns `() => true` for every shape it cannot parse, so `aof work next 44/01`,
`44/01-03x` and an en-dashed `44/01–02` each walk the whole stream and return other milestones'
stories, with no indication the scope was ignored. `findWork` answers `[]` for the same strings, so
the two surfaces disagree about what a story-grained ref means. This predates the span form; the
span form makes it reachable by teaching a story-grained vocabulary that only `find` implements.

### A span-scoped `skipped` list is driver-grained across the whole stream
- **Status:** discharged (by story `86`, 2026-09-04)
- **Discharge condition:** `skippedEntries` resolves a span to the single driver it names, as
  `inRange` already does.

`skippedEntries` (`src/commands/next.mjs`) treats a span as an un-named scope, because `namedDriver`
is an exact top-level ref match no span satisfies. A finished span therefore reports every held
driver in the stream: with milestone 12 held on another node, a finished `44/01-03` renders
`Nothing free in 44/01-03 — everything actionable is being worked elsewhere: 12 …`. Observable only
with mesh item-locks active.

### The `continue.md` span branch is unguarded by any test
- **Status:** discharged (by story `86`, 2026-09-04)
- **Discharge condition:** a prompt-contract lane asserts the span branch's presence in
  `src/bundle/commands/continue.md`, in the shape `test/work-dispatch-lanes.test.mjs` lane
  `dispatch/02` already uses against that same file.

No test references the span form or any of the span branch's prose. The branch could be deleted from
the shipped prompt and the 12-lane suite plus the bundle-manifest hash test stay green — the hash
detects a change to the file, not the absence of a claim within it.
