@executable @cli @work @work-stream
Feature: The home moves to `.aof/loops/` — one resolution, resolved from `aofDir`, and no second door

  ADR-012 supersedes 52/ADR-001 decision 4 (`path.join(ctx.workspace.workDir, "loops")`) and keeps
  its decision 3 (one directory, extended by `kind:`, never by a sibling) verbatim. The move is
  smaller in code than the STORY's first draft claimed and larger in reach: `loopsDirectory` is
  **module-private** — a bare `function` at `src/work-loops.mjs:491`, not exported, with exactly ONE
  caller, `loadLoops` at `:498`. So there is no "5 dependents" fan-out to renegotiate; there is one
  expression, `path.resolve(value, "loops")` at `:494`, and one accessor above it,
  `typeof workDir === "string" ? workDir : workDir?.workDir` (`:492`). That accessor's OBJECT branch
  is **dead code on HEAD** — all three `src/` callers (`loops-show.mjs:18`, `loops-graph.mjs:88`,
  `loops-validate.mjs:30`) pass `ctx.workspace.workDir`, a string. The whole home change is
  `?.workDir` → `?.aofDir` plus three call sites passing the workspace OBJECT.

  `aofDir` is not invented here: `loadWorkspace` already computes it (`src/work.mjs:174`) and already
  returns it (`:249` — `{configPath, config, projectRoot, workDir, aofDir, identityPath,
  globalMeshRoot}`), for the reason recorded in its own comment at `:170-173` — milestone 28's verify
  decision, which **already superseded** a work-stream-co-location choice (22/ADR-002+003) in favour
  of `.aof/`, because `.aof/` is where aof's own config/lock live and is git-tracked. This story is
  the second application of that same ruling, not a new principle.

  The STRING overload survives, and survives deliberately. `loadLoops("<some-base>")` keeps meaning
  `<some-base>/loops`, so **every one of the ~25 `loadLoops(` call sites across six suites** passes a
  temp base and stays byte-unchanged — `loadLoops(temp)` at `acd-loop-finding-envelope:209,297,311,312,326`,
  `acd-loop-vocabulary-closed:108`, `acd-loop-registry-not-an-item-type:88`,
  `work-loops-record:105,357,369,381,740,759,776,844`, `work-loops-value:85,1238`, and the fresh-process
  leg at `test/support/loop-registry-fixture.mjs:202`, whose `workDir` (`:158`) is a string. That is a
  test affordance and is named as one; it is NOT a second home, because no `src/` module is permitted
  to use it (the invariant below), so there is exactly one production answer to "where does the
  registry live".

  **What the overload does NOT save, and this task owns.** The shared builder roots its registry at
  `<temp>/work/loops` (`test/support/loop-registry-fixture.mjs:147-149`), while
  `work-loops-commands.test.mjs`'s `dressWorkspace` (`:177-185`) writes `<temp>/.aof/aof.config.json`
  — so after the move the **spawned real CLI** resolves `<temp>/.aof/loops` (empty) while the builder
  writes `<temp>/work/loops`. No config placement can reconcile them: `aofDir` is either the config's
  own dir when its basename is `.aof`, or `<projectRoot>/.aof` (`src/work.mjs:168,174`). That breaks
  **19 `runCli` sites** (`:492,522,523,743,776,1029-1031,1239,1288,1327,1398-1400,1433,1443,1459,1476-1478`)
  and **6 path assertions** (`:529,530,748,764,1044,1410`). The fix is one optional parameter on the
  builder — `parent = "work"`, passed `".aof"` by `work-loops-commands`'s `withWorkspace` — which
  leaves every other caller byte-identical. So the pin below is on the CALL SITES, not on the file:
  no `loadLoops(` call site is rewritten to the object form, and the builder gains exactly one
  defaulted parameter. A directory junction or a copy-at-dress-time were both considered and refused
  (the copy desyncs `fixture.write()`).

  The other half is the **five** sites that hand the three COMMANDS a synthetic
  `{ workspace: { workDir } }` — `work-loops-commands.test.mjs:199` (a helper with ~30 callers) and
  `:1362`, `acd-loop-registry-not-an-item-type.test.mjs:87`, `acd-loop-render-deterministic.test.mjs:96`,
  `acd-loop-finding-envelope.test.mjs:271` — plus the header comment at `work-loops-commands.test.mjs:13`
  that documents the shape as "the seam milestone 53 composes through". Once a command reads
  `ctx.workspace.aofDir`, a workspace carrying only `workDir` resolves to `undefined` and
  `loopsDirectory` throws (`:493`). These five gain `aofDir`; they are not made to fall back, because
  an `aofDir ?? workDir` tolerance would rebuild `<work.dir>/loops` as a live second home.

  `src/work.mjs` is NOT edited — the milestone's zero-god-node-edit property (ADR-003 §3) is
  preserved by this story too. ADR-012 §1–§3, as measured against `src/work-loops.mjs:490-503`,
  `src/work.mjs:159-249` and `src/mesh-store.mjs:48-53` (the precedent resolver, read and
  deliberately NOT imported — a loop module importing the mesh store would cross the family boundary
  FF-5202 exists to keep legible).

  Scenario: the registry resolves under the workspace's `.aof`, not under its work stream
    Given a workspace whose `projectRoot` is `<root>`, whose `work.dir` is `./wiki/work` and whose `aofDir` is `<root>/.aof`
    When the loader resolves the registry directory
    Then it is `<root>/.aof/loops`
    And it is not `<root>/wiki/work/loops`
    And the answer does not vary with `work.dir` — a workspace configured `work.dir: "./docs/stream"` resolves to the same `<root>/.aof/loops`

  Scenario: `work.dir` no longer decides where the registry lives
    Given two workspaces sharing a `projectRoot` but configured `work.dir: "./wiki/work"` and `work.dir: "./work"`
    When each resolves the registry directory
    Then both answer `<root>/.aof/loops`
    And a record written under either `work.dir` is not loaded
    And no config key is read to decide the location — ADR-012 carries 52/ADR-001 decision 4's "no config key, one home, no second door" forward unchanged

  Scenario: the three commands pass the workspace OBJECT, never a string
    Given the registered commands `work:loops-show`, `work:loops-graph` and `work:loops-validate`
    When each resolves its registry
    Then each calls `loadLoops(ctx.workspace)`
    And none calls `loadLoops(ctx.workspace.workDir)`
    And none joins a `loops` path segment of its own

  Scenario: the string overload survives, and is what keeps the loader's call sites byte-unchanged
    Given the loader is handed the string `<temp>`
    When it resolves the registry directory
    Then it is `<temp>/loops`
    And every `loadLoops(` call site across the six fixture suites is unchanged in the diff
    And none is rewritten to the object form

  Scenario: the shared builder gains one defaulted parameter, and nothing else
    Given `test/support/loop-registry-fixture.mjs`
    When the diff is read
    Then it gains exactly one optional parameter controlling the registry's parent directory
    And that parameter defaults to the value it hard-codes today, so every existing caller is behaviourally byte-identical
    And only `work-loops-commands.test.mjs` passes a different value, because only it spawns the real CLI

  Scenario: the spawned-CLI fixture resolves the same registry the builder writes
    Given `work-loops-commands.test.mjs` dresses a workspace with a real `.aof/aof.config.json`
    When the real CLI is spawned against that fixture
    Then the registry it resolves is the directory the builder wrote
    And its nineteen spawn sites and six path assertions pass unchanged
    And the fixture's `pathOf`, `loopsDir` and `write` still describe the registry the CLI reads

  Scenario: no `src/` module uses the string overload
    Given every module under `src/`
    When each call to `loadLoops` is read
    Then every one passes an object
    And no `src/` module outside `src/work-loops.mjs` passes a `loops` segment to `path.join` or `path.resolve`
    And the three `route: ["work", "loops", <verb>]` declarations are not counted — a route word is not a path segment
    And the string overload is therefore unreachable in production, which is what makes it an affordance rather than a second home

  Scenario: a workspace with no `aofDir` is refused, not silently re-homed
    Given a workspace object carrying `workDir` and no `aofDir`
    When the loader resolves the registry directory
    Then it throws rather than resolving
    And it does NOT fall back to `<workDir>/loops`
    And the reason is the point: a fallback would make the superseded home live again, and ADR-012 supersedes it rather than deprecating it

  Scenario: the five synthetic-workspace test sites gain `aofDir`
    Given the five sites that construct `{ workspace: { workDir } }` for a loop command
    When each is read after the change
    Then each carries an `aofDir`
    And none carries a fallback that would let a missing `aofDir` pass
    And `work-loops-commands.test.mjs`'s header note about the composed seam is updated to the shape milestone 53 actually composes

  Scenario: the god-node is not edited
    Given the diff for this story
    Then `src/work.mjs` does not appear in it
    And the milestone's zero-`work.mjs`-edit property still holds across all stories
    And `aofDir` is consumed as `loadWorkspace` already returns it, with no new field and no new derivation

  Scenario: the loader keeps its whole contract at the new home
    Given a `.aof/loops/` directory that does not exist
    When the registry is loaded
    Then the result is `{ present: false, nodes: [], findings: [] }` with `source` naming the `.aof/loops` path
    And an EMPTY `.aof/loops/` directory is a different fact — `present: true` with no nodes
    And the sixteen loader finding codes are unchanged
    And `ADMITTED_KEYS`, `NODE_KINDS`, `POINTER_SCHEMES` and `ENDPOINT_SCHEMES` are unchanged

  Examples:
    | workspace shape                                       | resolved registry directory     |
    | `{aofDir: "<root>/.aof", workDir: "<root>/wiki/work"}`| `<root>/.aof/loops`             |
    | `{aofDir: "<root>/.aof", workDir: "<root>/work"}`     | `<root>/.aof/loops`             |
    | `{aofDir: "<root>/.aof"}`                             | `<root>/.aof/loops`             |
    | `"<temp>"` (the string overload)                      | `<temp>/loops`                  |
    | `{workDir: "<root>/wiki/work"}` (no `aofDir`)         | throws — never `<root>/wiki/work/loops` |
    | `{}`                                                  | throws                          |
    | `null` / `undefined`                                  | throws                          |

  Examples:
    | call site                                | before                          | after                    |
    | `src/commands/loops-show.mjs:18`         | `loadLoops(ctx.workspace.workDir)` | `loadLoops(ctx.workspace)` |
    | `src/commands/loops-graph.mjs:88`        | `loadLoops(ctx.workspace.workDir)` | `loadLoops(ctx.workspace)` |
    | `src/commands/loops-validate.mjs:30`     | `loadLoops(ctx.workspace.workDir)` | `loadLoops(ctx.workspace)` |
    | `src/work-loops.mjs:492`                 | `workDir?.workDir`              | `workDir?.aofDir`        |
    | `src/work-loops.mjs:494`                 | `path.resolve(value, "loops")`  | unchanged                |
    | `src/work.mjs`                           | —                               | unchanged, and pinned as such |
