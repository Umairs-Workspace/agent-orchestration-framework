# 47 · /fleet with a repo filter — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### The repo filter

`/fleet` narrows to one workspace via `?repo=<workspaceId>`, applied at one seam above the region
fan-out, and every collection on the `GlobalMeshStatus` wire is either narrowed there or declared
machine-wide with its reason.

### Filter and scope composing by intersection

`?scope=` and `?repo=` are two independent questions answered together: scope narrows at the server,
repo narrows the result at the client, and the composition is an intersection taken per collection.

### The partial intersection as a third answer

A filter whose work is out of scope but whose machines are not renders **populated** — work regions at
`0 of N`, the node region naming the machines that carry the repo, and a notice stating the cause in
words.

### Five empty states, told apart by their cause

`empty`, unknown-filter, out-of-scope, filtered-empty and empty-mesh are separate renders selected by
one predicate; the out-of-scope state exists because "zero workspace rows survived" cannot otherwise
distinguish *the scope excluded it* from *the mesh does not have it*.

### A filter that survives the address bar

The narrowing is a deep link that survives refresh, poll and a second browser profile, and one
`popstate` listener re-derives both narrowings from the address, so Back and Forward re-narrow the
page.

### The filter control and its banner

A disclosure trigger in the shell's surface slot occupying a fixed 150px slot at `sm` and above, and a
"filtered by" chip row hoisted above the page's state ternary so it renders in the populated and empty
states alike.

### Region 5's relief under a filter

A filtered milestone card drops the workspace-name column every card would otherwise repeat, and the
attention cluster's yield order is a discrete ladder keyed to cluster arity: the drill-in and the
secondary token surrender their words whole to pinned glyphs, and the assignment target is the last
element to yield.

### The board drill-in that opens a board

The drill-in resolves through `GET /api/mesh/board-url`, which refuses a workspace whose checkout is
gone rather than answering 200 over an empty board; the local-shape boards branch unreachable since
m34 is deleted rather than repaired.

### A slot that degrades by truncating rather than by overprinting

The shell's surface-bar slot is `flex-nowrap` with shrinkable occupants, so a row that cannot fit
yields its one designated element instead of wrapping into the chrome above and the content below.

## Assumptions

- **The narrowing is client-side** — the server's existing scope narrowing does not filter the node
  roster, so a server-side repo filter would return every node in the mesh under a repo filter.
- **`src/` is not edited by the filter** — the read-only suites stay green without being touched,
  which is the checkable form of the assumption above.
- **`workspaceId` is the stable filter key** — `name` is nullable and mutable and `projectRoot` is
  machine-local, so a link built on either would not survive a rename or a second machine.
- **`?scope=` has consumers** — it is retained rather than subsumed, with its retirement condition
  stated but not acted on.
- **A session row carries its own `workspaceId`** — the classification that lets `sessions` be narrowed
  by rule 1 rather than declared machine-wide.
- **Every node is a member of every workspace on this mesh** — so `items == 0 && nodes == 0` is
  unreachable by any address here, and the filtered-empty and empty-mesh states are unrenderable on
  the live projection.
- **Region 5's budgets derive from the grid's own floor row** — `REGION5_ROW_FLOOR_PX = 286`, read
  from the `minmax()` in the source rather than from a measurement taken at one viewport.
- **The trigger's fit is the layout engine's** — no constant states the residual, so the row stays
  correct when an occupant is added, changed or removed by a later milestone.
- **The desktop window is 760×520** — which is why the fixed slot binds at `sm` (640) and not `md`.

## Gaps

### A pre-click mark for a card whose board cannot open
- **Status:** open
- **Discharge condition:** the global projection publishes a `resolvable` fact per workspace row, and
  the card renders it.
The projection is cross-machine and carries rows whose `projectRoot` names a path this machine has
never had. The failed state is specified and rendered *after* a click; nothing on the wire carries the
fact before one, and `controlNode` is not the same fact.

### `MeshSession.repo` and the `?repo=` URL key are two different concepts under one name
- **Status:** open
- **Discharge condition:** one of the two is renamed, or a recorded ruling states why one surface
  carries both.
`?repo=` is the operator's word for a workspace, resolved to a `workspaceId`; `MeshSession.repo` is a
field on a session row. Both now appear on the fleet surface.

### The abbreviated region-5 forms have no producer on the live mesh
- **Status:** open
- **Discharge condition:** a node id long enough to abbreviate exists on the live projection, or the
  fixture-backed face becomes the standing render target for these lanes.
Nothing on the live mesh has a node id long enough to engage the abbreviation ladder, so the story's
own benefit is measurable only against `test/support/mesh-ui-assign-fixture.mjs` standing as a face.

### No browser harness backs any layout claim in CI
- **Status:** open
- **Discharge condition:** a browser lane exists that a runner imports, or a recorded ruling states
  that layout claims are verified only at the gate.
Playwright is invoked on demand and is not a dependency, so every layout assertion in the suite reads
class strings from source. Three shipped defects in this milestone were invisible to that channel and
were found only by rendering.

### The a11y lane is off
- **Status:** open
- **Discharge condition:** `work.tags.domains` carries an `a11y` entry and an axe-core run stands
  behind the surface.
No automated accessibility check runs against this surface. The focus indicator's visibility and
whether a screen reader speaks the live region are consequently unverified in either channel.

### `aof-designer` cannot edit the document it owns
- **Status:** open
- **Discharge condition:** the agent definition grants `Edit`, or a recorded ruling states that
  whole-file rewrite is the intended mechanism.
Every `DESIGN.md` amendment in this milestone was authored by the designer as anchored patch text and
applied by a second party, with a transcription step between the author and the file.
