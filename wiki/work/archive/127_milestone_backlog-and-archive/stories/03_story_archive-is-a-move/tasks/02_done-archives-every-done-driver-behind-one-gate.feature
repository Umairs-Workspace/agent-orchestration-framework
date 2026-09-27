@executable @cli @work @work-stream
Feature: aof work archive --done archives every done driver at the stream root, listed first and moved together behind one confirm gate

  `--done` is the same act as `<NN>`, iterated (ADR-004 §1): it selects every top-level driver AT
  THE STREAM ROOT — never a backlog row, never a row already under `archive/` — whose status is
  `done`, in number order, and moves them in ONE run. "One run" is what makes task 01's rule (iii)
  matter: every selected folder is in M together, so a link between two of them is untouched and
  the tree the operator gets is the one they would have got archiving the set in any order.

  THE GATE IS THE VERB'S OWN. Without `--yes` (or its alias `--force`), `--done` REFUSES with
  `archive-confirm-required` (400) after listing what it would move — the message names every
  candidate as `<NN> (<name>)` in number order and ends `re-run with --yes to confirm.`, and the
  envelope carries them structurally as `candidates: [{ ref, name, type }]` through `error.detail`
  (the generic face's one channel — `{ ok:false, error, code, candidates }`). There is no
  threshold: one done driver is gated exactly like fifty, because the operator asked for a SET
  and the list is the point. `<NN>` is never gated — one named folder is already the confirmation.
  The gate is not `guardSlotOpenCount` and imports nothing from `insert-shared.mjs` (FF-12705).

  NOTHING TO ARCHIVE IS NOT A REFUSAL. When no root driver is `done`, `--done` (with or without
  `--yes`) exits 0 with `{ archived: [], rewritten: [] }` and renders
  `Nothing to archive: no done driver at the stream root.` — a clean answer to a clean question.

  PRE-FLIGHT THE WHOLE SET, THEN MOVE. Every check task 00 makes for one driver runs for every
  candidate BEFORE the first rename — the item lock over every candidate and its stories, and the
  destination `archive/<name>` being free for each — so a hand-made `archive/13_chore_iota` refuses
  the WHOLE run as `archive-destination-exists` naming it, with `12` not moved. A `done` driver's
  stories are never a reason to stop (task 00's rule). The status is read from each record doc
  once, through the same `findWork` rows the listing used.

  THE ENVELOPE is task 00's with one entry per moved driver, `archived` in number order,
  `rewritten` one entry per changed file ordered by path. The render is one `Archived <NN> →
  archive/<name> (…)` line per driver in that order, then `Archived <N> item(s).`

  What would quietly undo this: a selection over `listStream` (which hides archived rows and lists
  backlog rows) rather than over `listItems` filtered to `parent == null && number != null &&
  archived !== true && status === "done"`; a per-item loop that archives `12` and only then
  discovers `13`'s collision; a gate that prompts on a TTY instead of refusing (the work face is
  non-interactive — the CLI bijection drives every verb as a child process with no stdin).

  ADR-004 §1, §2; ADR-002 §2; 08/ADR-003; FF-12705.

  Scenario: without --yes, --done lists what it would move and moves nothing
    Given the archive fixture, where `12_milestone_theta` and `13_chore_iota` are the root's two done drivers
    When `aof work archive --done --json` runs
    Then the process exits 1 with exactly one document `{ ok: false, error, code: "archive-confirm-required", candidates: [{ ref: "12", name: "12_milestone_theta", type: "milestone" }, { ref: "13", name: "13_chore_iota", type: "chore" }] }`
    And `error` names `12 (12_milestone_theta)` and `13 (13_chore_iota)` in that order and ends `re-run with --yes to confirm.`
    And every file and folder under the work dir is byte-identical to before

  Scenario: with --yes, --done moves every done root driver in one run and reports each
    Given the archive fixture
    When `aof work archive --done --yes --json` runs
    Then `archive/12_milestone_theta` and `archive/13_chore_iota` exist and neither folder remains at the root
    And the envelope's `archived` is `[{ ref: "12", … }, { ref: "13", … }]` in that order, and `rewritten` names `11_chore_beta/CHORE.md`, `10_milestone_alpha/stories/00_story_alpha-one/STORY.md`, `10_milestone_alpha/mocks/README.md`, `TECH_DEBT.md`, `backlog/chore_gamma/CHORE.md`, `archive/05_milestone_zeta/SPEC.md` and the moved folders' own crossing files — and NOT `archive/13_chore_iota/CHORE.md`, whose only link points into `12`
    And `10_milestone_alpha` (`in-progress`) and `11_chore_beta` (`not-started`) are still at the root, and the backlog's three leaves are byte-identical
    And the render (without `--json`, on a fresh fixture) is `Archived 12 → archive/12_milestone_theta (…).`, then `Archived 13 → archive/13_chore_iota (…).`, then `Archived 2 item(s).`
    And `aof work list --json` afterwards carries `10`, `10/00`, `11` and the three backlog rows and nothing else; `aof work list --all --json` adds `05`, `05/00`, `06`, `12`, `12/00` and `13`, each `archived: true`

  Scenario Outline: the selection is exactly the done drivers at the root
    Given the archive fixture, with <change>
    When `aof work archive --done --yes --json` runs
    Then `archived` lists exactly <archived> in number order
    And <still> is still where it was

    Examples: what is and is not a candidate
      | change                                                                    | archived     | still                                              | why                                              |
      | nothing changed                                                           | 12, 13       | `10_milestone_alpha` at the root                   | the baseline: two done root drivers              |
      | `13_chore_iota` rewritten to `status: in-review`                          | 12           | `13_chore_iota` at the root                        | only `done` is selected                          |
      | `12_milestone_theta` moved under `archive/` by hand beforehand            | 13           | `archive/12_milestone_theta` untouched             | an archived row is never re-selected             |
      | `backlog/chore_gamma/CHORE.md` rewritten to `status: done`                | 12, 13       | `backlog/chore_gamma` in the backlog               | a backlog row has no number and is never a candidate |
      | `10_milestone_alpha/stories/00_story_alpha-one` rewritten to `status: done` | 12, 13     | `10_milestone_alpha` and its story at the root     | a story is never a candidate; its milestone is in-progress |
      | `12_milestone_theta` and `13_chore_iota` both rewritten to `status: in-progress` | (none)  | both at the root, exit 0 with `archived: []`      | nothing to archive is a clean answer             |
      | `12_milestone_theta/SPEC.md` rewritten with its `status:` line deleted     | 13           | `12_milestone_theta` at the root                   | no status is not `done`                          |

  Scenario: a collision anywhere in the set refuses the whole run before the first rename
    Given the archive fixture, with an empty folder `archive/13_chore_iota` created by hand
    When `aof work archive --done --yes --json` runs
    Then the process exits 1 with `code: "archive-destination-exists"` naming `archive/13_chore_iota`
    And `12_milestone_theta` is still at the root and no `.md` file under the work dir changed

  Scenario: --done and <NN> are one verb and refuse each other's flags
    Given the archive fixture
    When `aof work archive 12 --done --json` runs
    Then the process exits 1 with `code: "archive-both-forms"`
    When `aof work archive 12 --yes --json` runs
    Then `12` is archived exactly as without `--yes` — the flag is accepted and changes nothing for a named driver
    When `aof work archive --done --force --json` runs on a fresh fixture
    Then `--force` confirms exactly as `--yes` does, and both `12` and `13` are archived
