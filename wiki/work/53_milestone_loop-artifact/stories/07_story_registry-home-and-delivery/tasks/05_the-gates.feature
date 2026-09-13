@executable @cli @work @validate
Feature: The two fitness functions, their registration, and the three bundle gates this story must land green

  ADR-011 gives every story its own evidence and declares `scripts/test.mjs` an append-only
  registration hub with a per-story labelled block. Story 07 lands **FF-5312** (the home is single)
  and **FF-5313** (a delivered record is framework-owned), plus one behavioural suite — and it lands
  them through a namespace that is **mined**, which is why this task exists as a contract rather than
  a footnote.

  **The naming trap, measured.** Two ACCEPTED milestone-52 gates pin the `acd-loop-*` namespace to a
  literal roster of exactly nine files. `test/arch/acd-loop-finding-envelope.test.mjs:358-359` does
  `readdir("test/arch")`, filters `name.startsWith("acd-loop-") && name.endsWith(".test.mjs")`, and
  `deepEqual`s the result against a nine-name array; it also position-asserts milestone 52's story-04
  runner block (`lines[importAt + 2 + 9] === ""`, and no tenth line beginning `  ...acdLoop`) and
  asserts each file is imported and spread **exactly once, file-wide** (`:389-396`).
  `test/work-loops-coverage-ledger.test.mjs` repeats the roster as `NINE_GATES` (`:149-155`),
  re-derives the block shape (`:687-700`), and forbids by name any new suite whose alias begins
  `acdLoop`, that lives under `test/arch/`, or whose basename begins `acd-loop-` (`:675-677`).

  So a gate named `acd-loop-registry-single-home` would redden **two accepted gates** on the day it
  landed. This story does not do that, and it does not widen the m52 rosters either — the same
  reasoning ADR-002 used when it declined to rename three shipped commands to win a naming argument.
  Its gates are named out of the mined namespace: `acd-registry-single-home` and
  `acd-registry-framework-owned` (verified: neither `startsWith("acd-loop-")`), with aliases
  `acdRegistrySingleHomeTests` / `acdRegistryFrameworkOwnedTests` (neither `startsWith("acdLoop")`).
  Its behavioural suite is `test/work-loops-home-and-delivery.test.mjs` — safe because the ledger's
  suite list is a literal of milestone 52's own six (`:161-166`), not a glob over `test/work-loops-*`.

  **The bundle gates.** Three exist and this story meets all three. `acd-bundle-membership` asserts
  the declared member set equals the on-disk file set under the bundle root, so the nine records must
  be **declared** members, not merely dropped in — it then absorbs them with no test edit.
  `acd-bundle-manifest-hashes` asserts every shipped entry hashes to its re-render and that the
  manifest path set deep-equals the rendered path set — it goes green on regeneration, and it is a
  correct gate because it fails on path-set equality rather than on a count.
  `test/bundle-asset-manifest-complete.test.mjs:51` pins `direct.length === 62` for the real
  `src/bundle/**` tree; nine records make it 71, and the file's own note at `:47-50` instructs that
  the literal moves in the same diff as the tree. (The pin read `61` when this contract was first
  refined; an intervening shipped UAT state template moved the pre-story base to `62` before the
  story began. ADR-015 §9 rules the row at the measured truth — the contracted **+9** is untouched,
  and deleting that unrelated template to satisfy the older literal is refused.)

  **The pre-existing reds this story inherits and must clear — THREE, measured by running them.**
  *(Refined as FOUR; the fourth was cleared elsewhere on the branch before this story's regeneration
  ran — ruled below, per ADR-015 §9.)*

  Three are one defect. `test/bundle.test.mjs:283-289` builds `loadedIds` from
  `resources + hooks + templates` and compares it against the FULL descriptor, which since milestone
  43 also carries the `asset` kind: descriptor **50**, loaded **49**, `diff: ["artifact-sync-enqueue"]`.
  That reddens `bundle/loader: … faithful to the descriptor`, its cwd-stability outline and its
  child-process leg. The fix is a missing term rather than a widened expectation — both outline legs
  compare against values DERIVED from the descriptor (`:309`, `:344`), and **no literal in that file
  enumerates kinds** (`:114-118` counts agents/commands/skills/templates/hooks and simply omits
  `asset`, while `:197` already admits it as valid). But the term is missing in **three** places, not
  one: `:283-287`, `:318-322`, and inside the child-process `--eval` string at `:339`.

  A fourth was refined in and is **withdrawn at ADR-015 §9**: this contract expected
  `test/arch/acd-bundle-manifest-hashes.test.mjs` case 1 to be RED (a stale manifest hash for
  `.aof/templates/work/task/example.feature`, left by commit `d38e720`) and to be corrected by *this*
  story's regeneration, making the manifest diff **ten** changed entries. It was cleared elsewhere on
  the branch first, so this story's regeneration finds nothing to correct. Measured at the ruling: the
  gate is **3 pass / 0 fail** and the manifest diff this story owns is **nine ADDED entries, zero
  changed**. A reviewer should expect nine, not ten — and this story neither claims nor needs the
  clearance of a red it did not inherit.

  None of the three is story 07's defect. All three are cleared here, because nine new asset members
  widen the descriptor/loader mismatch from 1 to 10 and the story cannot land green over it — and
  because a story that adds nine members to the kind the gate forgets is the story that must not
  leave it forgotten.

  Scenario: FF-5312 — the registry has exactly one home, and it is `.aof/loops/`
    Given the repository source after this story
    Then `src/work-loops.mjs` resolves the registry from the workspace's `aofDir` and from nothing else
    And no module under `src/` outside the loader builds a path ending in a `loops` segment
    And no module under `src/` calls `loadLoops` with a string
    And `src/work.mjs` is unchanged
    And this repository's `.aof/loops/` is byte-identical to `src/bundle/loops/`
    And `wiki/work/loops/` does not exist

  Scenario: FF-5313 — a delivered record is framework-owned
    Given the nine declared bundle members
    Then each is `kind: "asset"` with a target under `.aof/loops/` and both runtimes declared
    And none is `kind: "template"`
    And no rendered loop-record output begins with the template stamp
    And `ADMITTED_KEYS`, `NODE_KINDS`, `POINTER_SCHEMES` and `ENDPOINT_SCHEMES` are unchanged
    And neither the shipped manifest nor the install lock carries an entry for `.aof/aof.config.json`
    And each record's body names its bundle source and points tuning at the config

  Scenario: the gates are named out of the mined namespace
    Given `test/arch/` after this story
    When the `acd-loop-` prefixed files are swept
    Then neither of this story's gates appears in that sweep
    And neither of this story's aliases begins `acdLoop`
    And milestone 52's two accepted roster gates are unedited
    And the sweep is unchanged BY THIS STORY — noting that 53/05's planned eight `acd-loop-*` files would change it, which is 53/05's ruling to make and not this story's to pre-empt

  Scenario: registration is its own labelled block, and does not disturb the position-asserted one
    Given `scripts/test.mjs` after this story
    Then this story's imports sit under a labelled `milestone 53 / story 07` comment
    And its spreads sit under the matching labelled comment
    And milestone 52's story-04 import block still terminates with a blank line immediately after its ninth import
    And no line beginning `  ...acdLoop` follows milestone 52's ninth spread
    And each of this story's suites is imported exactly once and spread exactly once, file-wide
    And no suite is imported without being spread — an unspread import is a gate that never runs

  Scenario: the nine records are declared members, not files that appeared
    Given the bundle root on disk
    When the declared member set is compared with the file set
    Then they are equal
    And each of the nine resolves to a readable file
    And the membership gate needs no edit to absorb them

  Scenario: the manifest gate goes green by regeneration alone
    Given the manifest after the nine members are declared and it is regenerated
    Then every entry's hash equals the hash of its re-rendered content
    And the manifest's path set deep-equals the rendered path set
    And the gate is not edited

  Scenario: the SEA asset-map count moves in the same diff as the tree
    Given the real `src/bundle/**` tree grows by nine files
    Then the pinned file count moves from 62 to 71 in this diff
    And the asset map enumerates every one of the nine
    And the tripwire is honoured rather than disarmed

  Scenario: the pre-existing descriptor/loader mismatch is cleared, not inherited
    Given `test/bundle.test.mjs`'s loader cases on HEAD
    Then three of them fail today because `loadedIds` omits the `asset` kind
    And the descriptor carries 50 members while the loader reports 49
    When the loaded set includes assets at all three sites that build it
    Then all three pass
    And they still pass after the nine records take the descriptor to 59 and the loaded set to 59
    And the fix is a missing term, not a widened expectation — no literal in that file enumerates kinds, and both outline legs derive their expectation from the descriptor

  Scenario: the manifest diff this story owns is nine ADDITIONS and nothing else
    Given `test/arch/acd-bundle-manifest-hashes.test.mjs` after the nine members are regenerated in
    Then every one of its cases passes
    And the manifest diff attributable to this story is exactly nine ADDED entries
    And no pre-existing entry's hash is changed by it
    And a reviewer is told to expect nine, so a tenth changed entry is read as another story's work rather than this one's
    And the stale task-example-template hash this contract was refined expecting to correct is NOT this story's to clear — it was cleared elsewhere on the branch first, and a regeneration that finds nothing to correct is the right outcome, not a missed one (ADR-015 §9)

  Examples:
    | artifact                                        | name                                          | alias                            | safe? |
    | FF-5312 gate                                    | `test/arch/acd-registry-single-home.test.mjs` | `acdRegistrySingleHomeTests`     | yes   |
    | FF-5313 gate                                    | `test/arch/acd-registry-framework-owned.test.mjs` | `acdRegistryFrameworkOwnedTests` | yes |
    | behavioural suite                               | `test/work-loops-home-and-delivery.test.mjs`  | `workLoopsHomeAndDeliveryTests`  | yes   |
    | *(refused)* a gate in the m52 namespace         | `test/arch/acd-loop-registry-single-home.test.mjs` | `acdLoopRegistrySingleHomeTests` | **no — reddens two accepted gates** |

  Examples:
    | gate                                       | today | after nine records | edit needed |
    | `acd-bundle-membership`                    | green | green              | none — declare the members |
    | `acd-bundle-manifest-hashes` (cases 1–3)   | green (measured 3/0 at the ADR-015 §9 ruling — the stale template hash was cleared elsewhere on the branch) | green | regenerate the manifest |
    | `bundle-asset-manifest-complete` (`:51`)   | green | red on the count   | `62` → `71`, and the decomposition comment at `:44` |
    | `bundle.test.mjs` loader cases (×3)        | **red on HEAD** | still red    | include `bundle.assets` in `loadedIds`, at all three sites |
    | `acd-loop-finding-envelope` roster leg     | green | green              | none — names avoid the sweep |
    | `work-loops-coverage-ledger` `NINE_GATES`  | green | green              | none — names avoid the sweep |
