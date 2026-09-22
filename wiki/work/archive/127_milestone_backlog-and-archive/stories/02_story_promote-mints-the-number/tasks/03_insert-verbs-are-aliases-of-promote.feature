@executable @cli @work @work-stream
Feature: insert-milestone, insert-chore and insert-uat are scaffold-into-backlog plus promote --at

  ADR-003 §4 chose aliasing over retiring: the four verbs keep their names, their bundle wrappers
  and their accepted contracts, and `runInsertTopLevel`'s OWN slot-open + scaffold body
  (`insert-shared.mjs:244-300`) is deleted along with its numbering (`renumberDepends`, the
  pad-width arithmetic, `preflightTopLevelScaffold` / `writeTopLevelScaffold`). What replaces it is
  a composition of two things this story already has: a scaffold that lands in `backlog/`, and
  `promote --at P`.

  THE NESTED AXIS IS NOT AN ALIAS — decided in this contract. `insert-story --at SS --under NN`
  places a story INSIDE a live milestone's `stories/`, in the nested number space (41/ADR-005). A
  nested story is never a backlog leaf (the backlog holds DRIVERS only, ADR-001 §2 / ADR-005 §4;
  `task` and a parented story have no leaf grammar), so there is nothing for `promote` to move and
  no top-level number to mint: `runInsertStory` and its nested helpers stay in `insert-shared.mjs`
  unchanged, with 127/01's `insert-parent-archived` refusal. ADR-003 §4's list names `story` as a
  verb whose NAME and wrapper are kept, and its smaller-diff argument (deleting `runInsertTopLevel`'s
  body, `insert-shared.mjs:244-300`) is about the top-level path alone — this is the reading, spelled
  out here so FF-12703 asserts exactly it: the TOP-LEVEL slot-open is reached from `promote.mjs` and
  nowhere else in `src/commands/`; the nested slot-open keeps its one caller.

  THE LAYERING, so `reindex.mjs`'s importer set does not grow and no import cycle forms:
  - `insert-shared.mjs` keeps `DOCS_BY_TYPE` (FF-7103 source-parses it there), the template
    mechanics (`stripBundleMarker`, `renderTemplate`, `stampVersion`, `deriveTitle`), `normalizeSlug`
    / `parsePosition`, `INSERT_FLAGS`, `parseDependsInput`, the nested axis, and its one
    `countShiftedByInsert` import — now behind an EXPORTED gate helper that both the nested run and
    `promote` call (the threshold read, the `insert-confirm-required` refusal with `shifted` /
    `detail.shifted`). It gains `scaffoldBacklogDriver(workspace, { type, slug, today, depends })`:
    read every template for the type (pre-flight — `insert-template-missing` before any write),
    render with the number BLANK — the `number: NN` line becomes a bare `number:`, every
    `# NN · ` heading loses its `NN · ` prefix, and any other `NN` in the template's prose stays the
    literal placeholder it is beside `<slug>` and `<status …>` — stamp the born version, refuse
    `insert-backlog-exists` when `backlog/<type>_<slug>` already exists, write the leaf at the
    backlog ROOT (group ""), return `{ ref: slug, type, slug, parent: null, dir }`.
  - `promote.mjs` imports the gate helper and the two parsers FROM `insert-shared.mjs`, and EXPORTS
    `runInsertTopLevel(ctx, { type, slug, at, yes, today, dependsInput })` with its old signature
    and envelope: scaffold into the backlog, then `promote --at P` — handing promote the LEAF it
    just wrote (the resolved row), never the argument, so the resolver's refusals (`promote-not-found`,
    `promote-ambiguous`, `promote-numeric-ref`) cannot fire on an alias and `insert-chore 12 --at 1`
    still yields `01_chore_12` as delivered. `--at` stays REQUIRED on the
    alias (`insert-invalid-at` when omitted, as delivered) — only bare `promote` appends — and the
    slug is normalised as it always was (trimmed, lowercased). A refusal at any point leaves
    the tree as it was — either the gate runs before the scaffold, or the scaffolded leaf is
    removed again on refusal. The second is the one that works: `promote-depends-*`,
    `promote-destination-exists` and `promote-number-archived` are checks promote runs OVER THE LEAF,
    so they can only fire once it exists — cheap pre-flights first (slug, `--at`, the template read,
    `insert-backlog-exists`), then the scaffold, then promote inside a rollback that removes the leaf
    it wrote and the `backlog/` root when the alias itself created it (on success too — a delivered
    cache suite counts the root's directories after an insert). The leaf is never left behind.
    Promotion then fills exactly what the blank render emptied — the `number:` line and the
    `# NN · ` prefixes — so a `NN_story_<slug>` bullet stays literal in the promoted doc too.
  - `insert-milestone.mjs`, `insert-chore.mjs`, `insert-uat.mjs`, `promote-finding-to-chore.mjs`
    and `promote-gap-to-chore.mjs` import `runInsertTopLevel` from `./promote.mjs` — that import
    line moves and nothing else changes (`INSERT_FLAGS` keeps coming from `insert-shared.mjs`). The two loop faces keep appending through `appendPosition`
    (ADR-003 §5, 71/ADR-003); the `PROMOTED_TYPE` literal, the seed and the idempotence scan are
    untouched and FF-7103 stays green.
  The uat's `--depends` is written INTO the backlog leaf as the operator gave it (current numbers)
  and comes out post-shift because task 01's engine rewrite reaches the backlog before the move —
  `renumberDepends` is deleted, not moved.

  EVERY DELIVERED INSERT SUITE STAYS GREEN AS WRITTEN: `work-insert-top-level-places`,
  `work-insert-uat-depends`, `work-insert-count-gate`, `work-insert-json-envelope`,
  `work-insert-atomic-preflight` (top-level leg), `work-insert-crlf-template-strip`,
  `work-insert-cli-confirm-envelope`, `work-scaffold-born-stamped`, `work-chore-template`, and
  `promote-gap-to-chore` / `promote-finding-to-chore`. Their assertions ARE the alias's contract
  for the envelope (`{ shifted, at, space, created }`), the codes, the born stamp and the strip;
  this task adds only what is new.

  THE BUNDLE PROMPTS FOLLOW THE VERBS (STORY.md Notes): `insert-milestone.md`, `insert-chore.md`,
  `insert-uat.md` keep their names and their step-2 CLI call, and their objective now says what
  the verb is — a scaffold into the backlog promoted at P. `insert-story.md` is unchanged.

  `insert-shared.mjs` is measured before and after (task 06): 638 lines at HEAD; a file that has not
  shrunk is a review finding (ARCHITECTURE §Codebase health).

  What would quietly undo this: a second `countShiftedByInsert` import (in `promote.mjs`); a
  private copy of the scaffold in `promote.mjs`; `renumberDepends` surviving under another name;
  an alias that leaves `backlog/<type>_<slug>` behind on a refused gate; `insert-story` routed
  through `promote`.

  ADR-003 §4, §5; 41/ADR-002; 41/ADR-005; 71/ADR-003; 127/01 (`insert-parent-archived`).

  Scenario: insert-milestone --at P produces the same tree as scaffold-into-backlog plus promote --at P
    Given the insert fixture with milestones 00–04
    When `aof work insert-milestone widget-support --at 2 --json` runs in one copy of the fixture
    And in a second copy `scaffoldBacklogDriver` writes `backlog/milestone_widget-support` and `aof work promote widget-support --at 2` runs
    Then the two work directories are byte-identical file for file (SPEC.md, STATE.md, every shifted neighbour), `updated:`/`created:` dates held equal by `today`
    And the first run's envelope is `{ shifted: 3, at: 2, space: "top-level", created: { ref: "02", type: "milestone", slug: "widget-support", parent: null, dir } }` — the delivered shape, `created` carrying no `depends` key
    And neither tree holds a `backlog/` folder afterwards (the fixture had none; the alias's transient leaf is gone)

  Scenario: insert-chore and insert-uat alias the same way
    Given the insert fixture with milestones 00–02
    When `aof work insert-chore tidy-config --at 1 --json` runs
    Then `01_chore_tidy-config/CHORE.md` exists with `number: 01`, the heading `# 01 · Tidy Config`, and `created` reports `ref: "01", type: "chore"`
    When `aof work insert-uat release-gate --at 1 --depends 0,2 --json` runs on a fresh fixture
    Then `01_uat_release-gate/SESSION.md` carries `depends: [0, 3]` and `created.depends` is `[0, 3]` — the operator's current numbers, framed post-shift by the engine's rewrite, with no arithmetic in the alias

  Scenario Outline: each alias is the same composition — the slug normalised, the position required, the depends framed by the engine
    Given the insert fixture with milestones 00–02
    When `aof work insert-<verb> <slug> <flags> --json` runs
    Then the result is <result>

    Examples: type, position, depends, and the refusals that are the alias's own
      | verb      | slug           | flags                | result                                                           | why                                                                 |
      | milestone | widget-support | --at 0               | `00_milestone_widget-support`, `shifted: 3`, the three now 01–03 | zero shifts everything                                              |
      | milestone | widget-support | --at 3               | `03_milestone_widget-support`, `shifted: 0`                      | at the tail, nothing moves                                          |
      | milestone | widget-support | --at 9               | `09_milestone_widget-support`, `shifted: 0`, 03–08 empty         | beyond the tail leaves a gap, as insert always has                  |
      | chore     | Tidy-Config    | --at 1               | `01_chore_tidy-config`, `created.slug: "tidy-config"`            | the alias lowercases, as `normalizeSlug` always has                 |
      | chore     | ` tidy `       | --at 1               | `01_chore_tidy`                                                  | and trims                                                           |
      | uat       | gate           | --at 1 --depends 2,0 | `depends: [3, 0]`, `created.depends: [3, 0]`                     | order as given; only the entry at or above P moves                  |
      | uat       | gate           | --at 1 --depends 1   | `depends: [2]`, `created.depends: [2]`                           | the named target itself shifts                                      |
      | uat       | gate           | --at 1 --depends 0   | `depends: [0]`, `created.depends: [0]`                           | below P — unchanged                                                 |
      | uat       | gate           | --at 1               | `depends: []`, `created.depends: []`                             | no `--depends` is an empty list on a uat, present in the envelope   |
      | uat       | gate           | --at 1 --depends 7   | refused `promote-depends-unresolved` naming `7`; no leaf remains | promote's check reaches the alias — a target must exist NOW         |
      | milestone | Widget_Support | --at 1               | refused `insert-invalid-slug`                                    | `_` is outside the slug grammar                                     |
      | milestone | -widget        | --at 1               | refused `insert-invalid-slug`                                    | a slug starts with a letter or digit                                |
      | milestone | widget-support | (no --at)            | refused `insert-invalid-at`                                      | the alias keeps `--at` required — only bare `promote` appends       |
      | milestone | widget-support | --at -1              | refused `insert-invalid-at`                                      | the alias's own code, not `promote-invalid-at`                      |

  Scenario: a refused alias leaves nothing behind
    Given the insert fixture with milestones 00–09 and `work.insert.confirmThreshold: 5`
    When `aof work insert-milestone widget-support --at 2` runs without `--yes`
    Then it is refused with code `insert-confirm-required` naming 8, and `listItems` over the fixture is identical to before — no shift, no `backlog/` row, no `backlog/` directory
    When the SPEC.md template is deleted and `aof work insert-milestone widget-support --at 2 --yes` runs
    Then it is refused with code `insert-template-missing` and again nothing exists that did not before

  Scenario Outline: a refused alias leaves the tree as it was, whichever check refused it
    Given the insert fixture with milestones 00–09 and `work.insert.confirmThreshold: 5`, plus <setup>
    When `aof work insert-<verb> <slug> <flags>` runs
    Then it is refused with code `<code>`, `listItems` over the fixture is identical to before, and `backlog/` holds exactly what the setup put there and nothing else

    Examples: every refusal on the alias's path, before and after the transient leaf
      | setup                                               | verb      | slug           | flags                     | code                       | why                                                               |
      | nothing                                             | milestone | Widget_Support | --at 2 --yes              | insert-invalid-slug        | refused before any scaffold                                       |
      | nothing                                             | milestone | widget-support | --at ten --yes            | insert-invalid-at          | refused before any scaffold                                       |
      | nothing                                             | milestone | widget-support | --at 5                    | insert-confirm-required    | five shifted meets the threshold of five                          |
      | the chore template deleted                          | chore     | tidy           | --at 2 --yes              | insert-template-missing    | pre-flight: every template is read before any write               |
      | `backlog/uat_gate/SESSION.md` already present       | uat       | gate           | --at 2 --yes              | insert-backlog-exists      | the pre-existing leaf is untouched — the alias never promotes it  |
      | nothing                                             | uat       | gate           | --at 2 --depends 42 --yes | promote-depends-unresolved | promote's refusal after the scaffold — the transient leaf is gone |
      | a stray `02_milestone_widget-support/` (no SPEC.md) | milestone | widget-support | --at 2 --yes              | promote-destination-exists | the destination check precedes the shift                          |
      | `archive/10_chore_old`                              | milestone | widget-support | --at 2 --yes              | promote-number-archived    | 09's +1 would land on the archived 10                             |

  Scenario: an alias into a stream whose backlog already holds the slug is refused
    Given the three-root fixture (backlog `chore_gamma`) with the chore template present
    When `aof work insert-chore gamma --at 12` runs
    Then it is refused with code `insert-backlog-exists` naming `backlog/chore_gamma`, and that leaf is untouched — the alias never promotes a leaf it did not scaffold

  Scenario: the backlog scaffold writes an un-numbered record doc that validate accepts
    Given the insert fixture
    When `scaffoldBacklogDriver` writes a `milestone` leaf `alpha-idea`
    Then `backlog/milestone_alpha-idea/SPEC.md` and `STATE.md` exist at the backlog root, the frontmatter carries `type: milestone`, a bare `number:` line, `slug: alpha-idea`, `title: "Alpha Idea"`, `status: not-started`, today's `created`/`updated`, `schema: 1` and the running `aofVersion`
    And the heading reads `# Alpha Idea` — no number, no ` · `
    And the leading `<!-- aof-generated: bundle -->` marker is stripped exactly as the insert scaffold strips it (CRLF and BOM tolerant)
    And `aof work validate` reports zero findings on the leaf, and `listItems` answers `{ number: null, ref: "alpha-idea", backlog: "" }` for it

  Scenario Outline: the blank render empties the number line and the numbered headings, and promotion fills exactly those
    Given the insert fixture
    When `scaffoldBacklogDriver` writes a <type> leaf `alpha-idea` (depends `[]` for a uat) and then `aof work promote alpha-idea` runs
    Then in <doc> the template line <line> reads <backlog> in the backlog leaf and <promoted> after promotion

    Examples: per doc, the lines that carry the number and the placeholders that never did
      | type      | doc        | line                                                   | backlog                      | promoted                          | why                                                          |
      | milestone | SPEC.md    | `number: NN`                                           | `number:` (bare)             | `number: 00`                      | the one identity line                                        |
      | milestone | SPEC.md    | `# NN · <Milestone Title>`                             | `# Alpha Idea`               | `# 00 · Alpha Idea`               | the prefix goes with the number and returns with it          |
      | milestone | SPEC.md    | the `NN_story_<slug>` bullets under `## Stories`       | unchanged, literal           | unchanged, literal                | a story's placeholder is never the milestone's number        |
      | milestone | SPEC.md    | the comment `… NN_story_<slug> item with parent: NN.`  | unchanged, literal           | unchanged, literal                | prose `NN` is a placeholder, not an identity                 |
      | milestone | STATE.md   | `# NN · <Milestone Title> — State`                     | `# Alpha Idea — State`       | `# 00 · Alpha Idea — State`       | the companion's heading follows                              |
      | milestone | STATE.md   | the `NN_story_<slug>` bullet                           | unchanged, literal           | unchanged, literal                | the same rule in the companion                               |
      | uat       | SESSION.md | `# NN · <Session Title> — UAT Session`                 | `# Alpha Idea — UAT Session` | `# 00 · Alpha Idea — UAT Session` | the uat heading                                              |
      | uat       | SESSION.md | `depends: [<milestone numbers this session accepts>]`  | `depends: []`                | `depends: []`                     | the operator's list replaces the placeholder, empty or not   |
      | uat       | STATE.md   | `# NN · <Session Title> — State`                       | `# Alpha Idea — State`       | `# 00 · Alpha Idea — State`       | the uat companion                                            |
      | chore     | CHORE.md   | `# NN · <Chore Title>`                                 | `# Alpha Idea`               | `# 00 · Alpha Idea`               | the chore heading                                            |
      | chore     | CHORE.md   | `depends: []`                                          | `depends: []`                | `depends: []`                     | the chore template's own literal, kept                       |

  Scenario: the two loop faces still append through appendPosition, unchanged in behaviour
    Given the insert fixture with milestones 00–02 and a finding to promote
    When `work:promote-finding` runs
    Then the chore lands at `03` with `shifted: 0`, seeded exactly as before (the promotion key in `## Notes`, the definition of done), and a second run of the same finding is refused as the duplicate it is
    And `promote-gap "x" --at 1` still opens slot 1 — the operator's `--at` on the gap face survives (71/ADR-009 §1)

  Scenario: insert-story keeps the nested engine and refuses an archived owner
    Given the three-root fixture with the story template present
    When `aof work insert-story alpha-two --at 1 --under 10` runs
    Then `10_milestone_alpha/stories/01_story_alpha-two/STORY.md` exists with `parent: 10`, no backlog leaf was created at any point, and no `stream.reindexed` remap names a top-level ref
    When `aof work insert-story zeta-two --at 1 --under 5` runs
    Then it is refused with code `insert-parent-archived` exactly as 127/01 left it

  Scenario: the slot-open's callers in src/commands are promote and nothing else
    Given `src/commands/**` with comments stripped
    When every import of `../work/reindex.mjs`, every call of the exported gate helper and every call of `transitionStreamReindexed` with `space: "top-level"` is read
    Then `reindex.mjs` is imported by `src/commands/insert-shared.mjs` and by no other module under `src/commands/`
    And `transitionStreamReindexed` with the top-level space is called from `src/commands/promote.mjs` and from no other module under `src/commands/`; the nested call sits in `insert-shared.mjs`'s `runInsertStory`
    And `runInsertTopLevel` is defined in `src/commands/promote.mjs` and imported from there by exactly `insert-milestone.mjs`, `insert-chore.mjs`, `insert-uat.mjs`, `promote-finding-to-chore.mjs` and `promote-gap-to-chore.mjs`
    And none of the four verb faces `insert-milestone.mjs`, `insert-chore.mjs`, `insert-uat.mjs`, `insert-story.mjs` contains `parseInt`, `Math.max` or a `number:` write (the mechanics module keeps `parsePosition` and the nested axis's own parses), and `insert-shared.mjs` no longer contains `renumberDepends`, `preflightTopLevelScaffold` or `writeTopLevelScaffold`
