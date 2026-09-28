@executable @cli @work @work-stream
Feature: promoting a backlog item rewrites every backlog slug edge that waits on it to the number it was minted

  THE GATE EXISTS; THE RESOLUTION DOES NOT. `classifyDepends` (`src/commands/promote.mjs`) already
  refuses a backlog item whose `depends:` names a backlog slug (`promote-depends-backlog`), so an
  item cannot enter the stream ahead of the work it waits on. What is missing is the other half:
  when the target IS promoted, the dependent's entry still names the target's slug, which is no
  longer in the backlog, so the dependent's next promote is refused `promote-depends-unresolved`
  and the operator re-types the edge by hand. This task makes promotion resolve the edges it
  satisfies.

  THE RULE. After the move and the stamp, promote rewrites every `depends:` entry that equals the
  promoted slug, in the record doc of every OTHER backlog row, to the minted ref exactly as the
  promoted folder spells it. The rewrite is surgical and per entry — the entry's own spacing and
  quotes are kept, every other entry and every other byte of the doc are untouched — and it runs
  AFTER the `--at` seam, because the shift rewrites numeric entries and the minted number is the
  one the item lands at. Two bounds:

    backlog rows only    a numbered item naming a slug is already validate's finding
                         (`does not resolve to a top-level item`), and stays the operator's to fix.
    a unique slug only   the `insert-*` aliases scaffold a root leaf and promote it directly, so a
                         grouped leaf can share its slug; an edge then names the leaf still in the
                         backlog, and nothing is rewritten.

  THE ENVELOPE. `rewired: [{ ref: <slug>, dir: <leaf dir> }]`, ordered by backlog path (group, then
  folder name), is present iff at least one doc was rewritten — so every promote that rewires
  nothing reports byte-for-byte the delivered envelope (127/02 task 00). The `--json` face
  forward-slashes each `dir`, as it does `created.dir` and `from.dir`. The human render adds one
  line after the delivered one: `Rewired <n> backlog edge(s) to <NN>: <slug>, <slug>.` The
  `insert-*` aliases keep their delivered four-key envelope; the disk rewrite still happens under
  them.

  THE REFUSAL TEXT CHANGES; ITS CODE AND ITS SHAPE DO NOT. `promote-depends-backlog`'s line read
  "a planning note, not a gate", and after this story the entry IS the gate. It now reads:
  `` `<entry>` is still in the backlog — this item waits on it. Promote `<entry>` first, or drop
  the entry. `` 127/02 task 02's scenario still holds as written: it names the entry and says to
  promote it first or drop it.

  THE FIXTURE is 127/01's three-root fixture (`buildThreeRootFixture`): live `10_milestone_alpha`
  and `11_chore_beta` (`depends: [05]`); backlog `chore_gamma` (group ""), `ideas/milestone_delta`,
  `ideas/later/spike_epsilon`; archived `05_milestone_zeta` and `06_chore_eta`. The next number is
  12. Cases land on the promote suite, `test/work/stream/work-promote-mints-the-number.test.mjs`.

  What would quietly undo this: rewriting before the seam (the shift then carries the edge one
  past its target); a substring or case-folded match (`gammas`, `Gamma`); a whole-line
  reserialise through `parseFrontmatter`; a second copy of the per-entry rewriter in `promote.mjs`
  instead of the one in `src/work.mjs`; an import of `src/work/reindex.mjs` from `promote.mjs`
  (FF-12703); a `rewired: []` on a promote that rewired nothing.

  Scenario: a dependent is refused while the item it waits on is still in the backlog
    Given the three-root fixture, with `backlog/ideas/milestone_delta/SPEC.md` carrying `depends: [gamma]`
    When `aof work promote delta --json` runs
    Then it is refused with code `promote-depends-backlog` and `detail.entries` `[{ entry: "gamma", code: "promote-depends-backlog" }]`
    And the message reads `` `gamma` is still in the backlog — this item waits on it. Promote `gamma` first, or drop the entry. ``
    And the backlog leaves, their groups and the stream are byte-identical to before the command

  Scenario: promoting the target rewrites the edge, and the dependent then promotes
    Given the three-root fixture, with `backlog/ideas/milestone_delta/SPEC.md` carrying `depends: [gamma]`
    When `aof work promote gamma --json` runs
    Then `12_chore_gamma` exists at the stream root
    And `backlog/ideas/milestone_delta/SPEC.md` carries `depends: [12]`, every other byte of the file unchanged
    And the envelope carries `rewired: [{ ref: "delta", dir: "<work>/backlog/ideas/milestone_delta" }]`, forward-slashed
    When `aof work promote delta --json` runs
    Then `13_milestone_delta` exists and the envelope's `created.depends` is `[12]`
    And `aof work validate --json` reports no finding it did not report before the first promotion

  Scenario: a slot opened with --at writes the number the target lands at, not one past it
    Given the three-root fixture, with `backlog/ideas/milestone_delta/SPEC.md` carrying `depends: [gamma, 10]`
    When `aof work promote gamma --at 10 --yes --json` runs
    Then `10_chore_gamma`, `11_milestone_alpha` and `12_chore_beta` exist at the stream root
    And `backlog/ideas/milestone_delta/SPEC.md` carries `depends: [10, 11]` — gamma where it landed, alpha where the shift moved it

  Scenario Outline: the rewrite is per entry and leaves the rest of the line as written
    Given the three-root fixture, with `backlog/ideas/milestone_delta/SPEC.md`'s depends line written as <before>
    When `aof work promote gamma --json` runs
    Then that line reads <after>
    And the envelope <rewired>
    And every other line of the doc is byte-identical, its line endings included

    Examples: exact matches only, each entry's own spelling kept
      | before                        | after                         | rewired                          | why                                                    |
      | `depends: [gamma]`            | `depends: [12]`               | lists `delta`                    | the headline                                           |
      | `depends: [ gamma , 05 ]`     | `depends: [ 12 , 05 ]`        | lists `delta`                    | spacing kept per entry; a number entry untouched       |
      | `depends: ["gamma"]`          | `depends: ["12"]`             | lists `delta`                    | the quote pair kept                                    |
      | `depends: ['gamma', 05]`      | `depends: ['12', 05]`         | lists `delta`                    | single quotes too                                      |
      | `depends: [epsilon, gamma]`   | `depends: [epsilon, 12]`      | lists `delta`                    | another backlog slug is untouched, order kept          |
      | `depends: [gamma, gamma]`     | `depends: [12, 12]`           | lists `delta` once               | a duplicate entry is the same edge, the doc listed once |
      | `depends: [gammas]`           | `depends: [gammas]`           | carries no `rewired` key         | exact, never a substring                               |
      | `depends: [Gamma]`            | `depends: [Gamma]`            | carries no `rewired` key         | case-sensitive — a slug is lowercase by grammar        |
      | `depends: []`                 | `depends: []`                 | carries no `rewired` key         | nothing names gamma                                    |

  Scenario: every backlog dependent is reached at any depth, and no numbered doc is written
    Given the three-root fixture, with `depends: [gamma]` on `backlog/ideas/milestone_delta/SPEC.md` and on `backlog/ideas/later/spike_epsilon/SPIKE.md`
    And `11_chore_beta/CHORE.md` carrying `depends: [05, gamma]`
    And `archive/06_chore_eta/CHORE.md` carrying `depends: [gamma]`
    When `aof work promote gamma --json` runs
    Then both backlog docs carry `depends: [12]`
    And `rewired` lists `epsilon` then `delta` — `ideas/later/spike_epsilon` sorts before `ideas/milestone_delta`
    And `11_chore_beta/CHORE.md` and `archive/06_chore_eta/CHORE.md` are byte-identical to before

  Scenario: a slug two backlog leaves share is rewired nowhere
    Given the three-root fixture, with `backlog/ideas/milestone_delta/SPEC.md` carrying `depends: [gamma]`
    When `aof work insert-milestone gamma --at 12 --json` runs
    Then `12_milestone_gamma` exists at the stream root and `backlog/chore_gamma` is still in the backlog
    And `backlog/ideas/milestone_delta/SPEC.md` still carries `depends: [gamma]` — the edge names the leaf still there
    And the envelope is the alias's delivered four keys `{ shifted, at, space, created }`

  Scenario: the render names what was rewired, in envelope order
    Given the three-root fixture, with `depends: [gamma]` on `backlog/ideas/milestone_delta/SPEC.md` and on `backlog/ideas/later/spike_epsilon/SPIKE.md`
    When `aof work promote gamma` runs without `--json`
    Then stdout is exactly two lines: `Promoted "gamma" to 12 (appended).` then `Rewired 2 backlog edge(s) to 12: epsilon, delta.`

  Scenario: a promote that rewires nothing is the delivered promote
    Given the three-root fixture, unchanged
    When `aof work promote delta --json` runs, and separately `aof work promote delta` without `--json`
    Then the envelope has exactly the keys `shifted`, `at`, `space`, `created` and `from`
    And the render is the single line `Promoted "delta" to 12 (appended).`

  Scenario: a refused promote rewrites nothing
    Given the three-root fixture, with `backlog/chore_gamma/CHORE.md` carrying `depends: [99]` and `backlog/ideas/milestone_delta/SPEC.md` carrying `depends: [gamma]`
    When `aof work promote gamma --json` runs
    Then it is refused with code `promote-depends-unresolved`
    And `backlog/ideas/milestone_delta/SPEC.md` still carries `depends: [gamma]`, byte-identical
