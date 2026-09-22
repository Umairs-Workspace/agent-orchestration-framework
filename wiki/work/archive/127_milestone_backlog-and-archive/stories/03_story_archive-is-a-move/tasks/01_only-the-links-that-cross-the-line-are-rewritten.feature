@executable @cli @work @work-stream
Feature: the move rewrites only the relative links that cross the archive line, and every one of them still resolves to what it resolved to before

  ADR-004 §2 names two link shapes the move rewrites: a root-sibling `../NN_…` that becomes
  `../archive/NN_…`, and a link from inside the moved folder to a root sibling that gains one `../`.
  Measured on 2026-09-15 over this working tree's `wiki/work` (`.md` files, inline `](…)` links with
  a relative target), those two are the SMALLER half of what a move breaks: 2,192 relative links in
  all, 96 of which cross from one item to another (the 82 the SPEC counted, plus 127's own), and
  1,868 of which LEAVE their item folder for somewhere that is not an item — `../../../src/…`,
  `../../../ui/src/…`, `../../../test/arch/…`, `../../planning/…`, `../../ROADMAP.md` — 1,190 of
  them resolving today. A rewrite bounded to sibling links would leave every one of those 1,190
  pointing one level short after the move. So THIS CONTRACT SHARPENS ADR-004 §2 BY MEASUREMENT,
  ratified in this beat: the sibling case is one instance of the general rule, and the general rule
  is the invariant —

    EVERY RELATIVE LINK RESOLVES TO THE SAME PATH AFTER THE MOVE AS IT DID BEFORE.

  The rewriter (`rewriteCrossingLinks` in `src/work/archive.mjs`) is SYNTACTIC and MINIMAL. It
  scans every `.md` file under `<workDir>` — all three roots, the moved folders at their new
  location included — for inline markdown links `](<target>)` (image links `![…](…)` are the same
  syntax) whose target is RELATIVE: it begins with `./`, `../`, or a bare path segment, and carries
  no scheme (`http:`, `https:`, `mailto:`, `file:`), no leading `/`, and is not an anchor-only
  `#…`. A `#fragment` or `?query` suffix is kept verbatim; a percent-encoded segment (`%20`) is
  decoded for resolution and left encoded in the text. For each such link it resolves the target
  against the file's directory and classifies it against the set M of folders moving in THIS run:
    (i)   the file is inside a folder in M and the target resolves OUTSIDE every folder in M — the
          link gains ONE `../` prefix. A root sibling, `wiki/planning/`, `wiki/ROADMAP.md`, `src/`,
          `ui/`, `test/` and an absent path are all "outside", and all gain the same `../`;
    (ii)  the file is outside every folder in M and the target resolves INSIDE a folder in M — the
          link gains `archive/` immediately before the moved folder's own `NN_type_slug` segment.
          From a root sibling's doc `../12_…` → `../archive/12_…`; from a story under a live
          milestone `../../../12_…` → `../../../archive/12_…`; from a doc in a sibling's `mocks/`
          `../../12_…` → `../../archive/12_…`; from a file AT the work root (`TECH_DEBT.md`,
          `ROADMAP.md`, `loops.md`) the bare `12_…` → `archive/12_…` and `./12_…` → `./archive/12_…`;
          from a backlog leaf `../../12_…` → `../../archive/12_…`;
    (iii) file and target are both inside folders in M (the same folder, or two folders archived in
          the same `--done` run) — UNTOUCHED: both ends move one level together;
    (iv)  neither end is in M — untouched.
  Whether the target EXISTS is never consulted: a link that was broken before the move is rewritten
  by the same rule and is exactly as broken afterwards, pointing at the same absent path. A link
  inside a fenced code block is a link like any other — the rule is syntactic, and one rule over
  the whole file is what makes the count in the envelope mean something.

  WHAT IS NEVER TOUCHED. A number (`number:` in any frontmatter, `NN` in any folder name, the
  `# NN ·` heading); a citation by ref (`12/ADR-001`, `m12/FF-1201`, `depends: [12]`, `parent: 12`,
  a bare `12` in prose); any frontmatter line at all — the rewriter matches link syntax and
  `number:` is not link syntax, which is the textual leg FF-12705 pins; any file that is not `.md`
  — a `.feature`, `.json`, `.ndjson`, `.png`, `.html`, and the retired `.mjs` suites under
  `35_…/reference/retired-dispatch-tests/` whose `import "../../../../src/work.mjs"` moves with
  them and stays in no runner (ADR-004 §3); reference-style `[x]: path` definitions and HTML
  `href=`/`src=` attributes, of which this tree holds zero across items (measured) — they are not
  in scope and the count says so. The rewriter touches no file outside `<workDir>`: nothing outside
  `wiki/work` links into an item folder (measured 0), and a `README.md` or `docs/` that ever does
  is its own item's concern.

  BYTES AND LINE ENDINGS (m22/R5, surfaced by recall: a git-as-bus convention must pin line
  endings). A file is read as bytes, rewritten in memory, and written back ONLY when at least one
  link changed — an untouched file keeps its mtime. Each file's own line endings are preserved: a
  CRLF file's rewritten line still ends `\r\n`, an LF file's still `\n`, a UTF-8 BOM stays where it
  was, and no trailing newline is added or removed. Outside the rewritten link text every byte is
  identical.

  THE ORDER OF THE TWO ACTS. The engine pre-flights everything, RENAMES first (every folder in M,
  in number order), then runs ONE rewrite pass over the whole tree with M known. A rewrite failure
  after the renames is `archive-rewrite-failed` (500) naming the file, with the moves already made
  reported in `detail.archived` — the tree is never left with a half-moved folder (a rename is
  atomic) and never with a rewrite applied for a move that did not happen.

  THE FIXTURE's links (task 00's `buildArchiveFixture`), each named here so a scenario can cite it:
    in `12_milestone_theta/SPEC.md`: `[alpha](../10_milestone_alpha/SPEC.md)`,
      `[roadmap](../../ROADMAP.md)`, `[cli](../../../src/cli.mjs)`, `[state](./STATE.md)`,
      `[story](stories/00_story_theta-one/STORY.md)`, `[gone](../99_milestone_gone/SPEC.md)`,
      `[iota](../13_chore_iota/CHORE.md)`, `[site](https://example.com/12_milestone_theta)`,
      `[abs](/wiki/work/12_milestone_theta)`, `[tasks](#tasks)`, `[mock](../10_milestone_alpha/mocks/a%20b.png)`,
      a fenced code block holding `](../10_milestone_alpha/SPEC.md)`, and the prose `see 10/ADR-001`;
    in `12_milestone_theta/STATE.md` (CRLF): `[alpha](../10_milestone_alpha/SPEC.md)`;
    in `12_milestone_theta/stories/00_story_theta-one/STORY.md`: `[alpha](../../../10_milestone_alpha/SPEC.md)`,
      `[cli](../../../../../src/cli.mjs)`, `[spec](../../SPEC.md)`;
    in `12_milestone_theta/tasks/00_theta.feature`: the text `](../10_milestone_alpha/SPEC.md)`;
    in `11_chore_beta/CHORE.md`: `[theta](../12_milestone_theta/SPEC.md)`,
      `[theta tasks](../12_milestone_theta/stories/00_story_theta-one/STORY.md#tasks)`, and `depends: [12]`;
    in `10_milestone_alpha/stories/00_story_alpha-one/STORY.md`: `[theta](../../../12_milestone_theta/SPEC.md)`;
    in `10_milestone_alpha/mocks/README.md`: `[theta](../../12_milestone_theta/SPEC.md)`;
    in `TECH_DEBT.md` (work root): `[theta](12_milestone_theta/SPEC.md)` and `[theta2](./12_milestone_theta/STATE.md)`;
    in `backlog/chore_gamma/CHORE.md`: `[theta](../../12_milestone_theta/SPEC.md)`;
    in `13_chore_iota/CHORE.md`: `[theta](../12_milestone_theta/SPEC.md)`;
    in `archive/05_milestone_zeta/SPEC.md`: `[theta](../../12_milestone_theta/SPEC.md)`.

  What would quietly undo this: a rewrite bounded to `../NN_` sibling links (the 1,190 escape); a
  rewrite that consults existence and "fixes" a broken link; a `writeFile` with `"utf8"` that
  normalises CRLF; a resolver that keeps the `%20` decoded in the text; a pass that rewrites BEFORE
  the renames so a failed rename leaves the links wrong.

  ADR-004 §2, §3, §5; m22/R5; FF-12705.

  Scenario: every relative link in the tree resolves to the same path after the move as before
    Given the archive fixture, with every relative inline link under the work dir resolved to an absolute path and recorded, existing or not
    When `aof work archive 12 --json` runs
    Then every relative inline link under the work dir, resolved again from its file's NEW location, resolves to the SAME recorded absolute path — with the one remap applied: a path that was under `<work>/12_milestone_theta/` is now the same path under `<work>/archive/12_milestone_theta/`
    And the set of links that resolve to an existing file is the same set as before the move, `[gone]` still absent among them
    And the envelope's `rewritten` names exactly the files that changed, with their link counts, ordered by path

  Scenario Outline: a link that crosses the line is rewritten by its shape, and a link that does not is untouched
    Given the archive fixture
    When `aof work archive 12` runs
    Then in `<file>` the link `<before>` now reads `<after>`
    And the file's every other byte is unchanged

    Examples: from inside the moved folder, outward — one `../`, whatever is outside
      | file                                                        | before                                   | after                                       | why                                            |
      | archive/12_milestone_theta/SPEC.md                          | ../10_milestone_alpha/SPEC.md            | ../../10_milestone_alpha/SPEC.md            | a root sibling                                 |
      | archive/12_milestone_theta/SPEC.md                          | ../../ROADMAP.md                         | ../../../ROADMAP.md                         | leaves the work tree                           |
      | archive/12_milestone_theta/SPEC.md                          | ../../../src/cli.mjs                     | ../../../../src/cli.mjs                     | leaves the wiki                                |
      | archive/12_milestone_theta/SPEC.md                          | ../99_milestone_gone/SPEC.md             | ../../99_milestone_gone/SPEC.md             | broken before, equally broken after           |
      | archive/12_milestone_theta/SPEC.md                          | ../10_milestone_alpha/mocks/a%20b.png    | ../../10_milestone_alpha/mocks/a%20b.png    | the encoding is kept in the text               |
      | archive/12_milestone_theta/SPEC.md                          | ../10_milestone_alpha/SPEC.md (in a fence) | ../../10_milestone_alpha/SPEC.md          | a fenced link is a link                        |
      | archive/12_milestone_theta/STATE.md                         | ../10_milestone_alpha/SPEC.md            | ../../10_milestone_alpha/SPEC.md            | the CRLF file, its line still ending `\r\n`    |
      | archive/12_milestone_theta/stories/00_story_theta-one/STORY.md | ../../../10_milestone_alpha/SPEC.md   | ../../../../10_milestone_alpha/SPEC.md      | from a nested story, the same one `../`        |
      | archive/12_milestone_theta/stories/00_story_theta-one/STORY.md | ../../../../../src/cli.mjs            | ../../../../../../src/cli.mjs               | nested, leaving the wiki                       |

    Examples: from outside, inward — `archive/` before the moved folder's segment
      | file                                                    | before                                                          | after                                                                   | why                                   |
      | 11_chore_beta/CHORE.md                                  | ../12_milestone_theta/SPEC.md                                   | ../archive/12_milestone_theta/SPEC.md                                   | a root sibling's doc                  |
      | 11_chore_beta/CHORE.md                                  | ../12_milestone_theta/stories/00_story_theta-one/STORY.md#tasks | ../archive/12_milestone_theta/stories/00_story_theta-one/STORY.md#tasks | into the moved folder's story, fragment kept |
      | 10_milestone_alpha/stories/00_story_alpha-one/STORY.md  | ../../../12_milestone_theta/SPEC.md                             | ../../../archive/12_milestone_theta/SPEC.md                             | from a story under a live milestone   |
      | 10_milestone_alpha/mocks/README.md                      | ../../12_milestone_theta/SPEC.md                                | ../../archive/12_milestone_theta/SPEC.md                                | from a sibling's mocks/               |
      | TECH_DEBT.md                                            | 12_milestone_theta/SPEC.md                                      | archive/12_milestone_theta/SPEC.md                                      | a bare segment from the work root     |
      | TECH_DEBT.md                                            | ./12_milestone_theta/STATE.md                                   | ./archive/12_milestone_theta/STATE.md                                   | the `./` spelling is kept             |
      | backlog/chore_gamma/CHORE.md                            | ../../12_milestone_theta/SPEC.md                                | ../../archive/12_milestone_theta/SPEC.md                                | from a backlog leaf                   |
      | archive/05_milestone_zeta/SPEC.md                       | ../../12_milestone_theta/SPEC.md                                | ../../archive/12_milestone_theta/SPEC.md                                | from an item ALREADY archived — the same syntactic insert, not a re-normalised `../12_…` |
      | 13_chore_iota/CHORE.md                                  | ../12_milestone_theta/SPEC.md                                   | ../archive/12_milestone_theta/SPEC.md                                   | iota is NOT in this run's M, so it is outside |

    Examples: untouched — inside the moved folder, and everything that is not a relative link
      | file                                                           | before                                        | after                                         | why                                   |
      | archive/12_milestone_theta/SPEC.md                             | ./STATE.md                                    | ./STATE.md                                    | within the moved folder               |
      | archive/12_milestone_theta/SPEC.md                             | stories/00_story_theta-one/STORY.md           | stories/00_story_theta-one/STORY.md           | within, bare segment                  |
      | archive/12_milestone_theta/stories/00_story_theta-one/STORY.md | ../../SPEC.md                                 | ../../SPEC.md                                 | within, upward                        |
      | archive/12_milestone_theta/SPEC.md                             | https://example.com/12_milestone_theta        | https://example.com/12_milestone_theta        | a scheme                              |
      | archive/12_milestone_theta/SPEC.md                             | /wiki/work/12_milestone_theta                 | /wiki/work/12_milestone_theta                 | an absolute path                      |
      | archive/12_milestone_theta/SPEC.md                             | #tasks                                        | #tasks                                        | an anchor                             |
      | archive/12_milestone_theta/SPEC.md                             | see 10/ADR-001                                | see 10/ADR-001                                | a citation by ref is not a link       |
      | 11_chore_beta/CHORE.md                                         | depends: [12]                                 | depends: [12]                                 | a number is never written             |

  Scenario: links between two items archived in the same run are left alone, and the same links are rewritten when the items are archived one at a time
    Given the archive fixture
    When `aof work archive --done --yes` runs, moving `12` and `13` together
    Then `archive/13_chore_iota/CHORE.md` still reads `[theta](../12_milestone_theta/SPEC.md)` — both ends moved, so the relative path holds — and `archive/12_milestone_theta/SPEC.md` still reads `[iota](../13_chore_iota/CHORE.md)`
    And neither file appears in the envelope's `rewritten`
    Given a fresh archive fixture
    When `aof work archive 12` runs and then `aof work archive 13` runs
    Then after the first, `13_chore_iota/CHORE.md` reads `[theta](../archive/12_milestone_theta/SPEC.md)` and `archive/12_milestone_theta/SPEC.md` reads `[iota](../../13_chore_iota/CHORE.md)`
    And after the second, `archive/13_chore_iota/CHORE.md` reads `[theta](../12_milestone_theta/SPEC.md)` and `archive/12_milestone_theta/SPEC.md` reads `[iota](../13_chore_iota/CHORE.md)` — the two orders converge on the same tree

  Scenario: the rewriter opens only markdown, writes only what changed, and pins every file's own bytes
    Given the archive fixture, with the mtime and bytes of every file under the work dir recorded
    When `aof work archive 12` runs
    Then `archive/12_milestone_theta/tasks/00_theta.feature` and `archive/12_milestone_theta/reference/retired.mjs` are byte-identical to their records, their `](../10_milestone_alpha/SPEC.md)` and `import "../../../../src/work.mjs"` untouched
    And `archive/12_milestone_theta/runs/.heartbeats.ndjson` and every `.md` file with no crossing link (`10_milestone_alpha/SPEC.md`, `archive/06_chore_eta/CHORE.md`) keep their recorded mtime
    And `archive/12_milestone_theta/STATE.md` still contains no bare `\n` — every line ends `\r\n` — and its byte length grew by exactly 3 (the one `../`)
    And no `.md` file under the work dir gained or lost a trailing newline, and no frontmatter line anywhere changed
