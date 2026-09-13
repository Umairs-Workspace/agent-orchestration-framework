@executable @docs @adapter @distribution
Feature: the edited bundle source re-renders into all three mirrors and both hash records agree

  `src/bundle/commands/shatter.md` is a bundle member whose descriptor declares
  `runtimes: ["claude","opencode"]` — and it renders **three** git-tracked outputs, because the codex
  render is a synthesised skill under a different resource identity:
  `.claude/commands/aof/shatter.md` (`command:shatter`, 112 lines),
  `.codex/skills/aof-shatter/SKILL.md` (`skill:aof-shatter`, 117 lines) and
  `.opencode/commands/aof/shatter.md` (`command:shatter`, 109 lines). The render set is therefore
  asked of `renderBundleOutputs`, never derived from the member's own `runtimes` array and never from
  a `src/bundle/` path prefix — the trap
  `test/arch/bundle/acd-declared-writes-include-generated-siblings.test.mjs:119-126` records by name
  after commit `231ee134` left three tracked renders stale.

  Measured at HEAD, all three are in parity: `hashContent` of each file on disk equals `hashContent`
  of its re-render — `sha256:94c6cf60…` (claude), `sha256:db88430b…` (codex), `sha256:47f8ea78…`
  (opencode). Each currently answers **0** to `grep -c "recall\|memory"`, exactly like the source.

  **One mirror is outside every hash control.** `src/bundle/manifest.json` declares
  `runtimes: ["claude","codex"]` and holds **zero** `.opencode/` entries (`grep -c "\.opencode/"` →
  0), while `.aof/aof.lock.json` holds **37**. `acd-bundle-manifest-hashes.test.mjs:23` re-renders
  with `manifest.runtimes`, so it hash-checks the claude and codex mirrors and never the opencode
  one. It also hashes the **re-render**, not the disk — so a regenerated manifest beside a stale
  mirror is green there. `acd-bundle-install-eol-pinned` reads `.opencode/commands/aof/verify.md` but
  only for its `.gitattributes` pin, not its content. The opencode mirror's freshness is asserted
  here or nowhere.

  The two hash records agree today where they overlap: `.claude/commands/aof/shatter.md` is
  `sha256:94c6cf602aaf628ab2437735ae34d8a545e7c60a121fe4b84c18ac78ecc366ea` in both
  `src/bundle/manifest.json` and `.aof/aof.lock.json`. `scripts/generate-bundle-manifest.mjs` is 13
  lines and writes `src/bundle/manifest.json` alone; the mirrors and the lock come from the
  apply/update path. All six files are pinned `text=set eol=lf` (`git check-attr text eol`).

  ADR-007 Consequences is explicit that **no new parity control is owed** — the existing pair already
  governs the write set and the hashes, and a sibling control is what this tree keeps refusing.

  What would quietly undo this: regenerating the manifest and forgetting the mirrors (the manifest
  hash test hashes the re-render and passes); the opencode mirror going stale because nothing hashes
  it; declaring the siblings in `files:` without landing them, which satisfies the declaration control
  while shipping stale renders; the lock's shatter hash drifting from the manifest's; a mirror
  rewritten by hand rather than rendered, so the block's wording differs from the source's; and a
  CRLF-checked-out mirror committed back, turning a six-file change into a whole-file diff nobody
  reads.

  ADR-007. FF-12405. `71/FF-7106`.

  Scenario Outline: every tracked render of the edited member matches a fresh re-render
    Given the mirror <path>
    When the bundle is re-rendered from `src/bundle/commands/shatter.md`
    Then the file's content hash equals the hash of its re-render
    And its resource identity is <resource>
    And its freshness is asserted here whether or not a shipped hash control covers it — <covered>

    Examples: three renders, one member, one of them uncovered by the shipped manifest
      | path                              | resource         | covered                                          |
      | .claude/commands/aof/shatter.md   | command:shatter  | yes — the manifest declares the claude runtime   |
      | .codex/skills/aof-shatter/SKILL.md| skill:aof-shatter| yes — the manifest declares the codex runtime    |
      | .opencode/commands/aof/shatter.md | command:shatter  | no — the manifest holds zero `.opencode/` entries |

  Scenario: the new block reaches every mirror
    Given the three tracked renders of `src/bundle/commands/shatter.md`
    When each is searched for the source's `aof work memory recall` invocation
    Then each contains it exactly once
    And `grep -c "recall\|memory"` on each is greater than 0, where it is 0 for all three today
    And each mirror's block is the render of the source's block, not a separately worded copy

  Scenario: the manifest is still a true content address of the bundle
    Given `src/bundle/manifest.json` after the edit
    When every entry is compared with a re-render under `manifest.runtimes`
    Then each entry's hash equals the hash of the member it names
    And the manifest's path set equals the rendered path set — no missing entry, no extra one
    And every hash matches `^sha256:[0-9a-f]{64}$`

  Scenario: the manifest and the lock agree on every path they both name
    Given `src/bundle/manifest.json` and `.aof/aof.lock.json` after the edit
    When the paths present in both are compared
    Then their hashes are equal for every such path
    And `.claude/commands/aof/shatter.md` carries the same hash in both records

  Scenario: the story declares every sibling its change lands
    Given this story's `files:` list
    When `acd-declared-writes-include-generated-siblings` runs over it
    Then it reports nothing for this story
    And the list names `src/bundle/commands/shatter.md`, `src/bundle/manifest.json` and all three tracked renders

  Scenario: the change is six files, each line-ending-pinned
    Given the diff this story lands
    When the changed paths are listed
    Then they are the bundle source, the three mirrors, `src/bundle/manifest.json` and `.aof/aof.lock.json`
    And `git check-attr text eol` answers `text: set` and `eol: lf` for each of the six
    And no mirror's diff is a whole-file rewrite caused by line endings

  Scenario: no new parity control is added
    Given `test/arch/bundle/`
    When its contents are listed after this story
    Then it holds the same 23 `*.test.mjs` suites and its `index.mjs`, unchanged
    And the parity claim is carried by `acd-bundle-manifest-hashes` and `acd-declared-writes-include-generated-siblings`
