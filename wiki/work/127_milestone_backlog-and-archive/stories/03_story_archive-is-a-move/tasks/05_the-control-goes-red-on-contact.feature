@manual @cli @work @work-stream
Feature: FF-12705 lands, goes red for the probes its register row names, and the budgets it moved are recorded

  Every declared control owes a RED PROBE in the milestone's `VERIFICATION.md` fitness register
  once it lands (the refine skill's own rule; 127/01 task 05 and 127/02 task 06 are the
  precedents). This story lands one: FF-12705, `test/arch/work/acd-archive-never-renumbers.test.mjs`,
  exporting `archTests` and registered by one import + one spread in `test/arch/work/index.mjs`
  (119/ADR-010). Landing it clears the `pending — 127/03` marker from `ARCHITECTURE.md`'s register
  — by landing the file, never by re-marking.

  FF-12705 AS THIS CONTRACT SHARPENS IT (tasks 00, 01 and 03 — the amendments ratified in this
  beat). The register row names ONE subject, `src/commands/archive.mjs`; task 03 put the engine in
  `src/work/archive.mjs`, so the control sweeps BOTH, and the register row is amended to name both
  when the file lands. The legs:
    (a) DIRECT IMPORTS ARE A CLOSED SET. Over comment-stripped source, the import specifiers of
        `src/commands/archive.mjs` resolve to a subset of `{ node:*, src/work.mjs,
        src/effects/stream-transitions.mjs, src/command-error.mjs }`, and those of
        `src/work/archive.mjs` to a subset of `{ node:*, src/work.mjs }`. Neither names
        `src/work/reindex.mjs`, `src/commands/insert-shared.mjs`, `src/work-promote/promotion.mjs`
        or any `src/commands/*` module. A closed set is what makes the transitive question below
        small: the only allowed import that can reach the engine is the seam.
    (b) THE TRANSITIVE PATH IS THE SEAM AND NOTHING ELSE. The register says "transitively, over
        the graph's dependencies" — but `graphify-out/` is gitignored (m38/ADR-016: the graph is
        machine-local and derived), so a control that read it would be red on every clean checkout
        and at the regression gate. The walk is therefore SOURCE-LEVEL, the `acd-one-mint` way: a
        breadth-first walk over `src/**` from each of the two files, following relative import
        specifiers over comment-stripped source, resolving each to a repo path. Every path from
        either file to `src/work/reindex.mjs` or `src/commands/insert-shared.mjs` passes through
        `src/effects/stream-transitions.mjs` — the ONE sanctioned stream-store seam (the effects
        ledger's `APPEND_EVENT_ALLOWED`), whose own reindex import belongs to the insert cascade
        and is FF-12703's to hold. A path that reaches either without crossing the seam is named
        as the chain of files. Non-vacuous: the leg must FIND the seam path (`archive.mjs →
        stream-transitions.mjs → reindex.mjs`), so an exclusion with nothing to exclude fails.
    (c) NO NUMBER IS WRITTEN. Neither file's comment-stripped source contains `number:`,
        `parseInt(`, `Math.max(` or `appendPosition`.
    (d) THE REWRITER MATCHES LINK SYNTAX ONLY. `rewriteCrossingLinks` (`src/work/archive.mjs`) is
        driven over a scratch file whose frontmatter carries `number: 12` and whose body carries
        `](../12_milestone_theta/SPEC.md)`, with `12_milestone_theta` in M: the link line changes
        and the `number:` line is byte-identical; and over a file holding ONLY frontmatter
        (`number:`, `depends: [12]`, `parent: 12`), the file is returned unchanged with zero links
        counted. The regex the rewriter uses is asserted to require `](` before the target.
    (e) THE COMMAND CALLS THE SEAM, NOT THE ENGINE. `src/commands/archive.mjs` references
        `transitionStreamArchived(` and never `archiveItems(`; `archiveItems(`'s src callers are
        exactly `src/effects/stream-transitions.mjs` (task 03's own sweep, restated here so the
        control holds it after the story closes).

  THE BUDGETS THIS STORY MOVED are recorded beside the probe, each with its `why` naming 127/03:
  `src/commands` 68 → 69 (`archive.mjs`, contract-bound; the `src/commands/work/` row refuses a
  second lone member), `src/work` 41 → 42 (`archive.mjs`, the engine beside `reindex.mjs`),
  `test/work/stream` 33 → 34 (`work-archive-is-a-move.test.mjs`), `test/arch/work` 48 → 49
  (`acd-archive-never-renumbers.test.mjs`). `src/effects` stays at 12 — the seam gained a
  function, not a file — and `src/commands/insert-shared.mjs` is not opened by this story.

  The probe is applied to a scratch copy or reverted immediately — the working tree is shared
  with concurrent lanes, so a probe is never left in place across a hand-back. Each run is a
  focused suite (`node scripts/test.mjs --only test/arch/work/index.mjs` under
  `AOF_GLOBAL_HOME=$(mktemp -d)`); never the full suite on this machine.

  Scenario: FF-12705 fails for a reindex import, an insert-shared import, a number write, and a rewriter that touches frontmatter
    Given the landed control passing at HEAD
    When `import { reindexForInsert } from "../work/reindex.mjs";` is added to `src/commands/archive.mjs`
    Then the control fails leg (a) naming `archive.mjs` and the specifier `../work/reindex.mjs`
    When that is reverted and `import { INSERT_FLAGS } from "./insert-shared.mjs";` is added to `src/commands/archive.mjs`
    Then the control fails leg (a) naming `insert-shared.mjs`
    When that is reverted and `import { appendPosition } from "../work-promote/promotion.mjs";` is added to `src/work/archive.mjs`
    Then the control fails leg (a) naming `promotion.mjs`, and leg (c) naming `appendPosition`
    When that is reverted and the line `text = text.replace(/^number:.*$/m, "number: 00");` is added inside `rewriteCrossingLinks`
    Then the control fails leg (c) naming `number:` in `src/work/archive.mjs`, and leg (d) reporting the scratch file's `number:` line changed
    When that is reverted and the rewriter's regex is loosened to match `(../` without the leading `]`
    Then the control fails leg (d) — the frontmatter-only scratch file is no longer returned unchanged, or the regex assertion names the missing `](`
    When that is reverted and `src/commands/archive.mjs` is changed to call `archiveItems(` directly
    Then the control fails leg (e) naming `archive.mjs` as a caller of the engine
    And all six messages are recorded against FF-12705 in `VERIFICATION.md`, and the tree is clean afterwards

  Scenario: the transitive leg finds the seam path and refuses a second one, with no graph artifact present
    Given the landed control passing at HEAD, run in a scratch copy of the repository with no `graphify-out/` directory
    When the control runs
    Then leg (b) reports the seam path `src/commands/archive.mjs → src/effects/stream-transitions.mjs → src/work/reindex.mjs` as found and excluded, and passes
    When `src/work/archive.mjs` is given `import { countShiftedByInsert } from "./reindex.mjs";` in the scratch copy
    Then leg (b) fails naming the chain `src/work/archive.mjs → src/work/reindex.mjs` as one that does not cross the seam
    When that is reverted and `src/commands/archive.mjs` is given `import { normalizeSlug } from "./insert-shared.mjs";` through a new intermediate `src/commands/archive-flags.mjs` that re-exports it
    Then leg (a) names `./archive-flags.mjs` as outside the closed set, AND leg (b) names the chain `src/commands/archive.mjs → src/commands/archive-flags.mjs → src/commands/insert-shared.mjs` — the walk is transitive, not one hop, and the two legs fail independently
    And both messages are recorded against FF-12705 in `VERIFICATION.md`

  Scenario: the register carries no pending marker for this story's control, and names both subjects
    Given `wiki/work/127_milestone_backlog-and-archive/ARCHITECTURE.md`
    When the `## Fitness functions` row for FF-12705 is read after the build
    Then it names `test/arch/work/acd-archive-never-renumbers.test.mjs` with no `pending` token, and its invariant names both `src/commands/archive.mjs` and `src/work/archive.mjs`
    And `aof work doctor 127/03` reports no `control-unresolved` finding for it, and `aof work validate 127/03` is green

  Scenario: the budgets are raised with a stated why, and nothing else moved
    Given `test/arch/testing/acd-source-directory-budget.test.mjs` after the build
    When `node scripts/test.mjs --only test/arch/testing/index.mjs` runs under `AOF_GLOBAL_HOME=$(mktemp -d)`
    Then it is green, and the rows for `src/commands`, `src/work`, `test/work/stream` and `test/arch/work` read 69, 42, 34 and 49, each `why` naming 127/03 and the file
    And every other row's ceiling is unchanged from this story's base commit — `git diff <base> -- test/arch/testing/acd-source-directory-budget.test.mjs` touches exactly those four rows
    And the four numbers are recorded in `VERIFICATION.md` beside FF-12705's probe
