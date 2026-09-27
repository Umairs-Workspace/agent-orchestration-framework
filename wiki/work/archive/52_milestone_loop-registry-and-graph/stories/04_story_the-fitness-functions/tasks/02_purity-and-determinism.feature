@executable @cli @work @validate
Feature: Purity, determinism and comparability — the checks read nothing, invent nothing, and render the same bytes twice

  Three gates over one property: the checks module is a function of its argument and nothing
  else. FF-5205 (`test/arch/acd-loop-checks-pure.test.mjs`) bans the I/O, the clock and the
  dynamic import in the house call-form discipline, bans the import edge to the loader in BOTH
  directions and TRANSITIVELY (ADR-011 §1, ADR-012 §7/G3 — the import graph is walked, not the
  direct specifiers grepped, so a one-hop laundering module cannot satisfy it; the two lanes
  share no source-side import at any depth, which is what keeps 52/00 and 52/01 independent),
  pins every export to `(model) => Finding[]` over the frozen `Model` of ADR-011 §7, and proves
  determinism twice over — repeated invocation and a fresh subprocess, because an in-process
  repeat cannot catch a module-load-time clock read or an iteration order that depends on
  process state. The purity claim is only real because the loader NORMALISES: cadence reaches
  the checks as a kind and a millisecond count, so the checks parse no value string and need no
  vocabulary — and "parses no value string" is mechanised as a NAMED PROXY rather than a
  decision procedure (ADR-012 §7/G1): the banned scheme-prefixed literals are a tripwire whose
  false-negative surface is ACCEPTED, because the real guarantee is the normalised `Model` plus
  the determinism legs. FF-5208
  (`test/arch/acd-loop-render-deterministic.test.mjs`) holds the same line for the Mermaid
  text, pins its FROZEN glyphs and the TOTAL node-key mangle of ADR-012 §5/E1, and keeps the
  registry out of `ui/`. FF-5206
  (`test/arch/acd-loop-timescale-comparability.test.mjs`) is the exhaustive one: the
  cadence-kind cross-product is closed and finite, so "never invents a comparison" is asserted
  over every pair rather than promised — and the ratio is DIRECTED, so a fast supervisor is an
  inversion rather than a pass. ADR-003, ADR-006, ADR-007, ADR-009, ADR-011, ADR-012.
  Every source assertion strips comments FIRST: a rationale header that names `Date.now(` is
  prose, and a gate that cannot tell prose from a call is a gate that fails on a sentence.

  Scenario: the checks module imports no filesystem, process, child-process or os module
    Given `src/work-loops-checks.mjs` with comments stripped
    When its import statements are read
    Then it imports none of `node:fs`, `node:fs/promises`, `node:child_process`, `node:process`, `node:os`
    And a `require()` of any of them fails the gate the same way
    And the gate reports the module was actually read, so an empty read fails

  Scenario: neither loop lane imports the other, in either direction
    Given `src/work-loops-checks.mjs` and `src/work-loops.mjs`, each with comments stripped
    When the import GRAPH is walked from each module — transitively, not as a direct-specifier grep (ADR-012 §7/G3)
    Then no path from the checks module reaches `./work-loops.mjs`
    And no path from the loader reaches `./work-loops-checks.mjs`
    And a dynamic import of either specifier fails the gate the same way
    And a one-hop module that re-exports one lane into the other FAILS it too — laundering the edge does not satisfy a transitive assertion
    And the walk reports the modules it visited, so a walk that never left the two entry modules fails

  Scenario: a forbidden module named only in a comment does not fail the gate
    Given a header comment in the checks module explaining "no `node:fs`, ever — ADR-007 §4"
    When the gate reads the module with comments stripped
    Then the gate passes
    And moving the same token into an `import` statement fails it

  Scenario: the checks module reads no clock
    Given `src/work-loops-checks.mjs` with comments stripped
    When the gate reads the source
    Then it contains no `Date.now(` call
    And it contains no argless `new Date()` call
    And a pure conversion taking an argument — `new Date(ms)` — does not fail the gate

  Scenario: the checks module performs no dynamic import
    Given `src/work-loops-checks.mjs` with comments stripped
    When the gate reads the source
    Then it contains no `import(` call form
    And a static `import … from` statement is not mistaken for one
    And `import.meta` is not mistaken for one

  Scenario: the checks module parses no declared value string
    Given `src/work-loops-checks.mjs` with comments stripped
    When the gate reads the source
    Then it carries no scheme-prefixed token literal — `periodic:`, `event:`, `module:`, `command:`, `config:`, `prose:`
    And it carries no `split(":")` over a declared value — the loader already split every scheme from its operand
    And comparing a normalised `kind` against `"periodic"` or `"event"` is not a parse and does not fail the gate
    And a check that re-derives a duration from a cadence string fails the gate
    And this leg is a named PROXY, never a decision procedure (ADR-012 §7/G1) — a regex carrying no scheme literal passes it, and that false negative is ACCEPTED, not overlooked
    And the real guarantee is the normalised `Model` of ADR-011 §7 plus the determinism legs below; this grep is the tripwire, not the proof

  Scenario: every exported check has the model-in findings-out shape
    Given every function exported by `src/work-loops-checks.mjs`
    When each is invoked over a literal fixture model carrying `source`, `present`, `nodes` and `findings`
    Then each declares exactly one parameter
    And each returns an array
    And every element of that array is a finding object, never a string or a nested array
    And no check requires anything of the model the frozen shape does not carry
    And the exported check set is non-empty

  Scenario: the same literal model yields byte-identical findings on repeated invocation
    Given a literal fixture model exercising every check
    When every check runs over it twice in the same process
    Then the two serialisations are byte-identical
    And the finding order is identical, not merely the finding set — the frozen order of ADR-012 §3/C6, whose composition FF-5209 pins

  Scenario: the same literal model yields byte-identical findings in a fresh process
    Given the same literal fixture model
    When every check runs over it in a newly spawned process
    Then the serialisation is byte-identical to the in-process result
    And a module-load-time clock read or process-state-dependent ordering fails this and not the repeat

  Scenario: the Mermaid rendering is byte-identical on repeated invocation
    Given a literal fixture model with several nodes and several edge types
    When the renderer runs over it twice in the same process
    Then the two texts are byte-identical, including trailing newline

  Scenario: the Mermaid rendering is byte-identical in a fresh process
    Given the same literal fixture model
    When the renderer runs in a newly spawned process
    Then the text is byte-identical to the in-process text

  Scenario: the rendering's order is canonical, not insertion order
    Given a fixture model whose nodes are declared in reverse lexicographic id order
    When the renderer runs
    Then nodes appear in lexicographic `id` order
    And edges appear sorted by source, then edge type, then target
    And rendering the same model with its declaration order shuffled produces identical text

  Scenario: the rendering's glyphs are the frozen literals, not merely different from each other
    Given a fixture model carrying a `kind: loop` node, a `kind: actor` node, an extra-registry endpoint and a dangling endpoint
    When the renderer runs
    Then the loop node is delimited `["…"]` and the actor node `(["…"])`
    And the extra-registry endpoint and the dangling endpoint are both delimited `[/"…"/]`
    And each edge is labelled with its frontmatter key verbatim — `data-feed`, `target-setting`, `monitoring`, `veto`, `parameter-tuning`
    And each node key is TOTALLY mangled — every character outside `[A-Za-z0-9_]` replaced by `_` (ADR-012 §5/E1 supersedes the `:`→`__` rule, under which a `module:` endpoint stayed unrenderable)
    And a diff swapping a delimiter for another valid Mermaid shape fails the gate

  Scenario: every emitted node key is renderable and unique, module endpoints and collisions included
    Given a fixture model carrying a `module:src/run-store.mjs#isStale` endpoint and two ids engineered to mangle to the same key
    When the renderer runs
    Then every emitted node key matches `^[A-Za-z0-9_]+$` — no colon, slash, dot or `#` survives into a key
    And the colliding keys carry `_2`, `_3` … suffixes in `id`-sort order, so the key set stays unique
    And no declared endpoint is dropped from the picture to avoid mangling it — a rendering that omits a declared edge lies about the graph, which is worse than an ugly key
    And each visible label still carries the real id verbatim

  Scenario: the two counts answer different questions, and the picture may hold more nodes than nodeCount
    Given a fixture model with a dangling endpoint and an extra-registry endpoint
    When the rendering's `nodeCount` and `edgeCount` are read
    Then `nodeCount` counts DECLARED RECORDS only, so an endpoint-only node is not counted
    And `edgeCount` counts EVERY declared edge, including those to extra-registry and dangling endpoints
    And the rendered text may therefore carry more visual nodes than `nodeCount`, which is not a defect (ADR-012 §5/E2)

  Scenario: no file under ui references the loop registry
    Given every source file under `ui/`, comments stripped
    When each is read
    Then none carries `work-loops`, `loops-show`, `loops-graph`, `loops-validate` or `work:loops-`
    And none carries a `"loops"` string literal in a route or argv position
    And the sweep reports the number of files it read, so a zero-file sweep fails
    And the sweep is token-scoped — the thirteen files that use the English word "loop" in comments today do not fail it

  Scenario: an inversion is emitted only when both endpoints are periodic and the directed ratio is under three
    Given a two-node model, both `kind: loop` and both present in the registry, joined by one `target-setting` edge from source to endpoint
    And `cadence: periodic:10s` on the source and `periodic:5s` on the endpoint
    When the timescale check runs
    Then the ratio taken is the SOURCE's period divided by the ENDPOINT's period
    And exactly one finding is emitted, with code `loop-timescale-inversion` at severity `warn`
    And no `loop-timescale-not-comparable` finding is emitted for that pair

  Scenario: a supervisor faster than the loop it supervises is an inversion, not a pass
    Given the same two-node model with `periodic:1s` on the source and `periodic:60s` on the endpoint
    When the timescale check runs
    Then a `loop-timescale-inversion` is emitted — the directed ratio is one sixtieth, which is under three
    And a gate reading the larger period over the smaller would have called this clean, under a code named "inversion"

  Scenario: a periodic pair separated by three or more emits nothing
    Given the same two-node model with `periodic:45s` on the source and `periodic:15s` on the endpoint
    When the timescale check runs
    Then no finding is emitted for that pair
    And a ratio of exactly 3 emits nothing — 3 is the threshold, not the boundary of the fault

  Scenario: every other cadence-kind pair emits not-comparable and names the side off the clock
    Given a two-node model, both `kind: loop` and both present in the registry, joined by one `target-setting` edge
    And each ordered pair drawn from the closed cadence kinds — periodic, the four event triggers, and unknown
    When the timescale check runs over all 36 ordered pairs
    Then the 35 pairs with at least one non-periodic side each emit exactly one `loop-timescale-not-comparable` at severity `warn`
    And each such finding names which endpoint is not on a clock
    And no pair emits both a not-comparable and an inversion
    And the two nodes are DISTINCT, so the cross-product is untouched by the self-edge narrowing of ADR-012 §3/C1

  Scenario: an edge outside the loop-to-loop domain emits nothing at all
    Given a `target-setting` edge whose source is a `kind: actor` node
    When the timescale check runs
    Then no finding is emitted — not an inversion, and not a not-comparable
    And an actor carries no `cadence` by schema, so a not-comparable would report a field that cannot exist
    And an edge to an extra-registry endpoint emits nothing
    And an edge to a dangling `loop:`/`actor:` endpoint emits nothing — the loader already reported it once as `loop-graph-dangling-endpoint`
    And a SELF-EDGE — source and endpoint the same node — emits nothing either, whatever the cadence on either side (ADR-012 §3/C1 narrows the domain; the self-reference is already reported once, by another code with its own owner)
    And an inversion on a self-edge would be a duplicate AND misleading, naming a timescale problem where the problem is self-reference
    And `not-comparable` therefore keeps its precise meaning: two declared loops whose supervision relation cannot yet be checked

  Scenario: the cross-product is generated from the exported vocabulary, not a hand-kept list
    Given the cadence kinds and event triggers exported by `src/work-loops.mjs`
    When the cross-product is built
    Then it is derived from those exported sets
    And the import is test-side only — the checks module still takes nothing from the loader
    And a widened trigger set would be covered with no edit to this gate

  Scenario: the check never converts an event trigger to a duration
    Given `src/work-loops-checks.mjs` with comments stripped
    When the gate reads the source
    Then it contains no mapping from any of the four `event:` triggers to a number, a duration or a unit
    And no object literal, Map or switch keys a trigger name to a millisecond value
    And the ADR's own prose naming "per-item ≈ minutes" would be a comment, and does not fail the gate

  Scenario: the timescale check reads target-setting edges only
    Given a two-node model joined by a `data-feed` edge, both endpoints `periodic:` with a ratio of 1
    When the timescale check runs
    Then no finding is emitted — a data-feed edge is not a supervision relation
    And the same pair joined by `target-setting` emits `loop-timescale-inversion`

  Examples:
    | forbidden form                                     | module guarded              | in a stripped comment | in call form |
    | import … from "node:fs"                            | src/work-loops-checks.mjs   | passes                | fails        |
    | import … from "node:fs/promises"                   | src/work-loops-checks.mjs   | passes                | fails        |
    | import … from "node:child_process"                 | src/work-loops-checks.mjs   | passes                | fails        |
    | import … from "node:process"                       | src/work-loops-checks.mjs   | passes                | fails        |
    | import … from "node:os"                            | src/work-loops-checks.mjs   | passes                | fails        |
    | import … from "./work-loops.mjs"                   | src/work-loops-checks.mjs   | passes                | fails        |
    | import … from "./work-loops-checks.mjs"            | src/work-loops.mjs          | passes                | fails        |
    | a TRANSITIVE path to the other lane, via any intermediate module | both loop lanes | passes  | fails        |
    | Date.now(                                          | src/work-loops-checks.mjs   | passes                | fails        |
    | new Date() — argless, host clock                   | src/work-loops-checks.mjs   | passes                | fails        |
    | new Date(ms) — pure conversion, takes an argument  | src/work-loops-checks.mjs   | passes                | passes       |
    | import( — dynamic                                  | src/work-loops-checks.mjs   | passes                | fails        |
    | a scheme-prefixed literal — periodic:, event:, module:, command:, config:, prose: | src/work-loops-checks.mjs | passes | fails |
    | split(":") over a declared value                   | src/work-loops-checks.mjs   | passes                | fails        |
    | an event-trigger to duration map, of any form      | src/work-loops-checks.mjs   | passes                | fails        |
    | work-loops, loops-show, loops-graph, loops-validate, work:loops- | every file under ui/ | passes   | fails        |
    | a "loops" literal in a route or argv position      | every file under ui/        | passes                | fails        |
