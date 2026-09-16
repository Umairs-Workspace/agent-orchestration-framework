@executable @cli @work @work-stream
Feature: The scope guard — two admitted forms, and a coded refusal for everything else

  The guard that exists because `nextWork` fails open. RESEARCH §Q3 measured it at the
  source: `inRange` (`src/work.mjs:847-860`) admits `^\d+$` and `^(\d+)-(\d+)$` and falls
  through to `() => true` for everything else, so `aof work next 53/02` is silently
  UNSCOPED — it offers the first ready item anywhere in the stream. Inside a read that is a
  surprise; inside a loop it is a machine driving milestone 12 because the operator typed a
  story ref. ADR-003 §1 closes it by admitting exactly two frozen forms and refusing the
  rest OUT LOUD, and ADR-003 §3/§4 rules that `src/work.mjs` is not widened to do it — the
  three-parser drift is TECH_DEBT item 49's, not this milestone's. The guard is a decision
  about the SHAPE of a scope string and nothing else: it never reads the stream, never
  resolves a ref, never asks whether a milestone exists — `work:next` owns existence, and a
  guard that answered it would be a fourth scope parser in the milestone that just measured
  three. Everything it decides is `(plain data) => decision`: an admission carries the
  matched form id and the scope VERBATIM (ADR-004 §2 persists that same string into
  `brief.loop.scope`, so a normalising guard would silently rewrite durable state); a
  refusal carries `code: "loop-scope-unsupported"`, the offending scope verbatim, BOTH
  admitted forms with an example each, and the alternative `aof work drive <phase> <ref>`
  (ADR-002) — the one way to drive a single story, which needs no `nextWork` and therefore
  has no scope problem. A refusal is a decision, not an exception: the module cannot spawn,
  mint or write anything, so "nothing happened" is observable here as "the decision carries
  no act to execute — no `drive`, no `ref`, no `phase`". Mechanised as
  `test/work-loop-scope-guard.test.mjs`: a table-driven suite exporting `{ name, run }`
  over frozen literal fixtures — no tmpdir, no spawn, no clock — registered in
  `scripts/test.mjs` with this story, so the evidence lands with the contract (TECH_DEBT
  item 48). ADR-003 §1–§4, ADR-005 §3, ADR-006 §1, as measured by RESEARCH §Q3.

  Scenario: a bare driver number is admitted as the `driver` form
    Given the scope `53`
    When the engine decides the scope
    Then the scope is admitted
    And the matched form is `driver`
    And the admitted scope is the string `53`, byte-identical to the input
    And no refusal code is decided

  Scenario: an inclusive range is admitted as the `range` form
    Given the scope `50-53`
    When the engine decides the scope
    Then the scope is admitted
    And the matched form is `range`
    And the admitted scope is the string `50-53`, byte-identical to the input

  Scenario: the guard never normalises — the admitted scope is what `brief.loop.scope` will carry
    Given the scopes `007`, `0` and `53-53`
    When the engine decides each scope
    Then each is admitted
    And each decision's scope is byte-identical to its input — no trim, no zero-strip, no `Number` round-trip
    And `007` is not rewritten to `7`
    And `53-53` is not rewritten to `53`

  Scenario: a story ref is refused, and the refusal names both admitted forms and the alternative
    Given the scope `53/02`
    When the engine decides the scope
    Then the decision is a refusal with code `loop-scope-unsupported`
    And it carries the offending scope `53/02` verbatim
    And it names the `driver` form with an example
    And it names the `range` form with an example
    And it names `aof work drive <phase> <ref>` as the way to drive one story
    And it names no fix inside `nextWork` — the widening is TECH_DEBT item 49's, not the operator's

  Scenario: a refusal is a decision with nothing to execute
    Given the scope `53/02`
    When the engine decides the scope
    Then the decision carries no `ref`
    And it carries no `phase`
    And its act is not `drive`
    And a caller that executed every act in the decision would spawn nothing, mint nothing and write nothing

  Scenario: an empty scope is refused, never read as "no scope"
    Given the scope `` (the empty string)
    When the engine decides the scope
    Then the decision is a refusal with code `loop-scope-unsupported`
    And it is NOT admitted as an unscoped whole-stream walk — which is exactly what `nextWork` does with it today

  Scenario: a whitespace-only scope is refused
    Given the scope `   `
    When the engine decides the scope
    Then the decision is a refusal with code `loop-scope-unsupported`
    And the offending scope is carried verbatim, spaces included

  Scenario: a REVERSED range is refused, because it admits no driver at all
    Given the scope `53-52`
    When the engine decides the scope
    Then the decision is a refusal with code `loop-scope-unsupported`
    And the reason says the range admits no driver — `lo` is greater than `hi`
    And the refusal is the point: `inRange("53-52")` builds a predicate matching nothing, so `work:next` would answer `done` over a stream it never looked at

  Scenario: a degenerate but non-empty range is admitted
    Given the scope `53-53`
    When the engine decides the scope
    Then the scope is admitted as the `range` form
    And it is not refused — one driver is a legitimate range, an empty one is not

  Scenario: a non-string scope is refused — the guard coerces nothing
    Given the scope is the number `53`
    When the engine decides the scope
    Then the decision is a refusal with code `loop-scope-unsupported`
    And `String(53)` is never taken as an admission — the CLI hands strings, and a guard that coerces is a guard that guesses

  Scenario: the guard decides on FORM alone — existence is `work:next`'s answer
    Given the scope `999`, which names no milestone in any stream
    When the engine decides the scope
    Then the scope is admitted as the `driver` form
    And the engine reads no work directory to decide it
    And the same decision is returned whatever tree the process is running in

  Scenario: the level refusal precedes the scope refusal
    Given the scope `53/02` and the level `L3`
    When the engine decides the invocation
    Then the decision is a refusal with code `loop-level-locked`
    And it is not `loop-scope-unsupported` — ADR-006 §1 refuses the level BEFORE the scope is resolved
    And exactly one refusal is decided, never two

  Scenario: the same refused scope decides identically every time
    Given the scope `53/02`
    When the engine decides the scope twice in one process and once in a fresh process
    Then all three decisions serialise byte-identically
    And the offending scope is carried verbatim in each, so the operator can copy it back

  Examples:
    | scope input       | decision | form / code                              |
    | `53`              | admitted | driver                                   |
    | `7`               | admitted | driver                                   |
    | `0`               | admitted | driver                                   |
    | `007`             | admitted | driver — verbatim, not normalised to 7   |
    | `12345`           | admitted | driver                                   |
    | `50-53`           | admitted | range                                    |
    | `0-0`             | admitted | range                                    |
    | `53-53`           | admitted | range — one driver is not an empty range |
    | `9-100`           | admitted | range                                    |
    | `53/02`           | refused  | loop-scope-unsupported                   |
    | `53/2`            | refused  | loop-scope-unsupported                   |
    | `53/02/00`        | refused  | loop-scope-unsupported                   |
    | `loop-artifact`   | refused  | loop-scope-unsupported                   |
    | `53_loop-artifact`| refused  | loop-scope-unsupported                   |
    | `` (empty)        | refused  | loop-scope-unsupported                   |
    | `   ` (spaces)    | refused  | loop-scope-unsupported                   |
    | a lone tab        | refused  | loop-scope-unsupported                   |
    | `53 ` (trailing)  | refused  | loop-scope-unsupported — no trim         |
    | ` 53` (leading)   | refused  | loop-scope-unsupported — no trim         |
    | `5 3`             | refused  | loop-scope-unsupported                   |
    | `53-`             | refused  | loop-scope-unsupported                   |
    | `-53`             | refused  | loop-scope-unsupported                   |
    | `-`               | refused  | loop-scope-unsupported                   |
    | `53--54`          | refused  | loop-scope-unsupported                   |
    | `53-52`           | refused  | loop-scope-unsupported — reversed, empty |
    | `100-1`           | refused  | loop-scope-unsupported — reversed, empty |
    | `53-54-55`        | refused  | loop-scope-unsupported                   |
    | `53.0`            | refused  | loop-scope-unsupported                   |
    | `+53`             | refused  | loop-scope-unsupported                   |
    | `1e2`             | refused  | loop-scope-unsupported                   |
    | `0x35`            | refused  | loop-scope-unsupported                   |
    | `٥٣` (Arabic-Indic digits) | refused | loop-scope-unsupported — `\d` is ASCII |
    | `NaN`             | refused  | loop-scope-unsupported                   |
    | `*`               | refused  | loop-scope-unsupported                   |
    | `all`             | refused  | loop-scope-unsupported                   |
    | the number 53     | refused  | loop-scope-unsupported — no coercion     |
    | `null`            | refused  | loop-scope-unsupported                   |
    | absent / undefined| refused  | loop-scope-unsupported                   |
    | `true`            | refused  | loop-scope-unsupported                   |
    | `["53"]`          | refused  | loop-scope-unsupported                   |
    | `{ scope: "53" }` | refused  | loop-scope-unsupported                   |

  Examples:
    | refusal payload key | value                                                        |
    | code                | `loop-scope-unsupported`, always                             |
    | scope               | the offending input, verbatim                                |
    | admits[0]           | the `driver` form and an example                             |
    | admits[1]           | the `range` form and an example                              |
    | reason              | why this input matched neither admitted form                 |
    | alternative         | `aof work drive <phase> <ref>` — drive one story             |
    | ref / phase / act   | absent — a refusal leaves the caller nothing to execute      |
