@executable @docs @work @work-stream
Feature: The document — a fenced Mermaid block, a health summary, and no frontmatter to trip over

  The artefact is a markdown file that renders where markdown renders: on GitHub, in an editor
  preview, and in the board. A bare `.mmd` would satisfy 52/ADR-009's letter and not the operator's
  ask, so the document is a `.md` wrapping a fenced `mermaid` block.

  THE GRAPH BYTES ARE NOT THIS STORY'S TO CHOOSE. `renderLoopGraph` is exported from
  `src/commands/loops-graph.mjs` and its output is frozen by 52/FF-5208 across ten
  `structural-duplicate` scenarios — canonical node order, canonical edge order, six declared glyphs
  plus the undeclared parallelogram, and the total node-key mangle. This story wants exactly those
  bytes, so it IMPORTS the renderer and restates none of it. That is the discipline 78/FF-7802 already
  names for the item-scoped renderer, applied here to the repo-wide one.

  NO FRONTMATTER, DELIBERATELY. The bundle convention puts `<!-- aof-generated: … -->` first, and
  finding F-73-G records that a leading comment BEFORE frontmatter breaks frontmatter parsing
  silently. This document is not a work item and no register check reads it, so it carries no
  frontmatter at all and the trap cannot be sprung.

  THE SUMMARY IS WHAT MAKES IT A HEALTH DOCUMENT and not only a picture. `work:loops-validate` already
  computes the finding counts and the per-check census; carrying them onto the page answers "is this
  graph healthy" beside "what shape is it".

  Scenario: the document wraps the renderer's bytes in a fenced mermaid block
    Given a loop registry
    When the document is composed for it
    Then it contains one fenced code block tagged `mermaid`
    And the bytes inside that fence are exactly what the exported renderer produced for that registry
    And no glyph, node ordering or edge ordering is restated outside the renderer

  Scenario: the frozen renderer is left byte-unmodified
    Given the exported renderer in `src/commands/loops-graph.mjs`
    When this story has landed
    Then that file is byte-unmodified by this story
    And 52/FF-5208's determinism and glyph assertions are unchanged

  Scenario: the document opens with a generated marker and names its own regenerating command
    Given a composed document
    Then its first line is a generated-artefact marker
    And no frontmatter block precedes that marker
    And the document names the command that regenerates it, so a reader who finds it stale knows what to run

  Scenario: the document has no frontmatter at all
    Given a composed document
    Then it carries no frontmatter block
    And parsing it as a work record yields no frontmatter rather than a malformed one

  Scenario: the health summary carries the counts the read commands already compute
    Given a loop registry with declared records and edges
    When the document is composed for it
    Then it states the declared node count and the declared edge count
    And it states the error and warning finding totals
    And it states each named check and how many findings that check raised

  Scenario Outline: a registry state is stated on the page, never left for the reader to infer
    Given a loop registry in state <registry state>
    When the document is composed for it
    Then the document states <stated on the page>
    And it is not silently empty

    Examples: the states a reader must be able to tell apart
      | registry state                           | stated on the page                                     |
      | records, edges, and no findings           | the counts, and that no check raised a finding          |
      | records and edges, with warning findings  | the counts, and the warning total with its per-check split |
      | records and edges, with error findings    | the counts, and the error total with its per-check split |
      | records present but declaring no edges    | the node count, and an edge count of zero               |
      | no registry directory present             | that no loop registry is declared, and where it was looked for |

  Scenario: composition is deterministic for a fixed registry
    Given a fixed loop registry
    When the document is composed twice in the same process
    Then the two documents are byte-identical

  Scenario: composition reaches no clock, no filesystem and no environment
    Given the composer and an injected model
    When the document is composed
    Then the composed bytes carry no timestamp, no hostname and no path outside the project
    And composing the same model in a different working directory yields byte-identical output

  Scenario: the summary and the picture describe the same registry
    Given a registry whose graph shows more visual nodes than it has declared records
    When the document is composed for it
    Then the stated node count is the declared-record count
    And the fenced block still renders the undeclared endpoints
    And the document does not present the two numbers as a contradiction
