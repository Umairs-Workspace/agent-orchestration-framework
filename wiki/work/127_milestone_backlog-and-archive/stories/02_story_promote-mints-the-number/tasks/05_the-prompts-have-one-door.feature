@manual @docs @work @scaffold
Feature: The aof:add-* prompts land on the intake, compute no number, and the phase prompts promote as step 0

  The second minting place the SPEC counts is the `aof:add-*` prompts' "Next top-level number `NN`
  = max `NN` across `work.dir` + 1" — agent arithmetic over a directory listing (41/ADR-002 named
  it the thing the deterministic CLI exists to replace). After this task no prompt computes a
  top-level number: an item is born un-numbered under `backlog/` and gets its number from
  `aof work promote` (ADR-003 §1, ADR-005 §3). The prompts are prose contracts, so the scenarios
  here are run by an agent following them against a scratch repository (`aof work init` into a
  temp dir with the templates), and their TEXT is asserted by task 04's FF-12703 leg.

  THE REWRITE, prompt by prompt (`src/bundle/commands/`, re-rendered by `aof work update` into the
  three runtime trees):
  - `add-milestone.md`, `add-chore.md`, `add-spike.md`, `add-uat.md`: step 1 reads `work.intake`
    (absent ⇒ `"stream"`) and an optional group from the arguments (`in <group/path>`); the
    folder is `<work.dir>/backlog/[<group>/]<type>_<slug>/` under EITHER setting — under
    `"backlog"` that is where it stays; under `"stream"` the prompt immediately runs
    `aof work promote <slug> --json` and reports the minted ref. The scaffolded record doc carries
    NO `number:` value and its heading is `# <Title>`; `depends NN,NN` (chore / spike / uat) is
    written as given and "validated at promotion"; `add-uat`'s default span is the numbered
    milestones the operator confirms. The framing questions and the PO hand-off are unchanged.
  - `add-story.md`: `under milestone NN` where NN resolves to a LIVE milestone is unchanged (the
    nested index is the milestone's own local axis, not a stream number); under a milestone that
    `aof work find` answers with `number: null` it REFUSES with "promote first —
    `aof work promote <slug>`" (ADR-005 §4, a backlog driver has no `stories/`); under an archived
    milestone it refuses too ("archived is out"); standalone follows the driver rule above as
    `story_<slug>`.
  - `refine.md`, `continue.md`: a new step 0 in `<config>` — when `aof work find "<ref>" --json`
    answers a row with `number: null`, run `aof work promote <slug> --json` first and use
    `created.ref` as THE ref for everything that follows (the run mint, every `aof work` call,
    the hand-back). The promotion appends; a position is the operator's to name through
    `aof:promote`. A promote refusal (task 02's planning note, task 00's ambiguity) is a stop.
    This is the one door for chore and spike too, which have no refine.
  - `insert-milestone.md`, `insert-chore.md`, `insert-uat.md`: objective reworded to what the verb
    now is (a scaffold into the backlog promoted at P); the CLI step is unchanged.
  - `promote.md`: new (task 04).
  The `.claude/commands/aof/*.md`, `.codex/skills/aof-*/SKILL.md` and `.opencode/commands/aof/*.md`
  renders of every prompt above are regenerated and committed with the manifest hashes.

  What would quietly undo this: a prompt that keeps "max NN + 1" as a fallback "when promote is
  unavailable"; an `add-story` that scaffolds `stories/` under a backlog milestone; a `refine` that
  promotes with `--at`; a prompt that reads `intake` to decide what to LIST.

  ADR-003 §1, §7; ADR-005 §3, §4; 41/ADR-002.

  Scenario: under intake backlog, add-milestone lands an un-numbered leaf and mints nothing
    Given a scratch project with `work.intake: "backlog"` and an empty `wiki/work`
    When `/aof:add-milestone "search across the fleet"` is followed
    Then `wiki/work/backlog/milestone_search-across-the-fleet/SPEC.md` and `STATE.md` exist, the frontmatter carries no `number:` value, the heading is `# Search Across The Fleet` (or the PO's title), and no folder was created at the root
    And `aof work find search-across-the-fleet --json` answers `number: null, backlog: ""`, and `aof work validate` is green
    And the hand-back names `aof:promote search-across-the-fleet` as the way into the stream

  Scenario: a group from the arguments is a path and nothing more
    Given the same project
    When `/aof:add-chore "tidy the config" in ideas/later` is followed
    Then the leaf is `wiki/work/backlog/ideas/later/chore_tidy-the-config/CHORE.md` and `find tidy-the-config` answers `backlog: "ideas/later"`

  Scenario: under intake stream, add-* appends through promote and never computes a number
    Given a scratch project with `work.intake: "stream"` holding `03_milestone_gap` and `07_milestone_last` (a gap at 04–06)
    When `/aof:add-chore "tidy the config"` is followed
    Then the chore is at `08_chore_tidy-the-config` — `appendPosition`'s answer — and no `backlog/` folder remains
    And the transcript shows `aof work promote tidy-the-config --json` and no directory-listing arithmetic

  Scenario: an absent intake behaves as stream
    Given a scratch project whose config has no `work.intake`
    When `/aof:add-spike "de-risk the routing"` is followed
    Then the spike is numbered at the root through `aof work promote`, exactly as under `"stream"`

  Scenario: add-story under a backlog milestone refuses with promote first
    Given the three-root fixture as a scratch project
    When `/aof:add-story "the first slice" under milestone delta` is followed
    Then the agent stops with "promote first — `aof work promote delta`", and no `stories/` directory exists under `backlog/ideas/milestone_delta`
    When `/aof:add-story "the first slice" under milestone 5` is followed
    Then the agent stops with an archived-is-out refusal and `archive/05_milestone_zeta/stories/` gains nothing
    When `/aof:add-story "the first slice" under milestone 10` is followed
    Then `10_milestone_alpha/stories/01_story_the-first-slice/STORY.md` exists with `parent: 10` — the live nested path is unchanged

  Scenario: a standalone add-story is a backlog driver
    Given a scratch project with `work.intake: "backlog"`
    When `/aof:add-story "a standalone slice"` is followed
    Then `wiki/work/backlog/story_a-standalone-slice/STORY.md` exists with no `parent:` line and no `number:` value, and an empty `tasks/` beside it

  Scenario: depends on a backlog driver is written as given and left to promotion
    Given a scratch project with `work.intake: "backlog"` holding backlog `chore_gamma`
    When `/aof:add-chore "after gamma" depends gamma` is followed
    Then `backlog/chore_after-gamma/CHORE.md` carries `depends: [gamma]` verbatim and the hand-back says it is validated at promotion
    And `aof work promote after-gamma` is then refused with `promote-depends-backlog` — task 02's rule, reached through the prompt's output

  Scenario: refine promotes a backlog ref as step 0 and continues with the number
    Given the three-root fixture as a scratch project
    When `/aof:refine delta` is followed
    Then the first `aof work` call after the find is `aof work promote delta --json`, the run is minted as `aof work run-start 12`, and every later step names `12`
    And `12_milestone_delta` is `in-progress` when the break-down begins, and `backlog/ideas/milestone_delta` no longer exists
    When `/aof:continue gamma` is followed instead
    Then `aof work promote gamma --json` runs first and the chore is worked as `12` — the same door for a type that has no refine

  Scenario: refine stops on a promote refusal
    Given the three-root fixture with `backlog/chore_gamma/CHORE.md` carrying `depends: [delta]`
    When `/aof:refine gamma` is followed
    Then the agent stops at the `promote-depends-backlog` refusal, mints no run, and names the two ways out (promote delta first, or drop the entry)

  Scenario: the promote wrapper drives the verb and hands off by type
    Given the three-root fixture as a scratch project
    When `/aof:promote delta at 10` is followed
    Then `aof work promote delta --at 10 --json` runs, the count-gate is surfaced if it fires, and the hand-back names `10_milestone_delta` and `aof:refine 10`
    When `/aof:promote epsilon` is followed
    Then the spike lands at the tail and the hand-back points at its own `SPIKE.md` and `aof:verify <NN>`, not at refine

  Scenario: every rewritten prompt is re-rendered into the three runtime trees
    Given the working tree after the build
    When `aof work update` runs and `git status` is read
    Then it reports nothing to re-render, and for each of `add-milestone`, `add-chore`, `add-spike`, `add-uat`, `add-story`, `insert-milestone`, `insert-chore`, `insert-uat`, `refine`, `continue` and `promote` the claude, opencode and codex renders are current, the claude and codex hashes in `src/bundle/manifest.json` matching the rendered files
