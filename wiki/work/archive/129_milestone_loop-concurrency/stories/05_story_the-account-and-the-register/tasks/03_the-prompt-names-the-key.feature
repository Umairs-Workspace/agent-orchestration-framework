@executable @cli @work @distribution
Feature: the autonomous prompt names work.loop.concurrency beside its home, and the renders agree

  `/aof:autonomous` is the prompt that shells out to `aof work loop` (53/ADR-008) and its
  `<config>` block is where an operator reads what the loop honours. It gains ONE paragraph naming
  `work.loop.concurrency` — its two values `sequential` (the default) and `refine_first`, what
  `refine_first` does in one sentence (refine every story first, then build the ready waves in
  worktree lanes, then verify), and that it is read from `.aof/aof.config.json` and never passed
  as a flag (ADR-001, alternatives) — in the same sentence-neighbourhood as the key, so FF-7101
  (`acd-prompt-bounds-name-their-home`, leg a) binds it: every `work.loop.*` key a bundled asset
  names must resolve through `LOOP_BOUND_VALUE_RESOLVERS`, which story 01 made true. No numeral is
  stated for it (a mode has no unit), so legs b and c are unaffected. The three renders
  (`.claude/commands/aof/autonomous.md`, `.codex/skills/aof-autonomous/SKILL.md`,
  `.opencode/commands/aof/autonomous.md`) and `.aof/aof.lock.json` are regenerated through
  `aof work update`; `src/bundle/manifest.json` through `node scripts/generate-bundle-manifest.mjs`
  — the manifest is derived, never hand-edited (01/ADR-002) — so the installed copies, the lock
  and the manifest agree with the source byte for byte.

  Background:
    Given `src/bundle/commands/autonomous.md` after this story

  Scenario: the prompt names the key and both values in one paragraph of the config block
    When the `<config>` block of `src/bundle/commands/autonomous.md` is read
    Then exactly one paragraph contains `work.loop.concurrency`
    And that paragraph contains each of `sequential`, `refine_first`, `.aof/aof.config.json` and the word `flag`
    And the paragraph's sentence naming `refine_first` names refine, lanes and verify in that order

  Scenario Outline: the paragraph states no cardinal for the key and adds no command token
    When the paragraph naming `work.loop.concurrency` is read
    Then <check>

    Examples:
      | check                                                                                                                              |
      | `statedValues(sentence, "concurrency")` from `acd-prompt-bounds-name-their-home.test.mjs` is `[]` for every sentence of it        |
      | no digit and no word of `zero` … `ten`, `once`, `twice` stands within the four words before the token `concurrency`               |
      | it contains no `aof work` and no `aof:` token, so the prompt's count of `aof work loop` stays exactly 2                              |

  Scenario: FF-7101 binds the key and stays green
    When `test/arch/command/acd-prompt-bounds-name-their-home.test.mjs` runs under an isolated global home
    Then `LOOP_BOUND_VALUE_RESOLVERS["work.loop.concurrency"]` is `resolveLoopConcurrency` by identity
    And `boundStatementProblems(await bundleAssets())` is `[]`
    And every case passes

  Scenario: the key is bound, not merely mentioned — FF-7101 reds when the resolver entry is absent
    Given `"work.loop.concurrency"` is removed from both resolver maps in `src/loop-bounds.mjs`
    When `test/arch/command/acd-prompt-bounds-name-their-home.test.mjs` runs under an isolated global home
    Then its first case fails with a message containing `commands/autonomous.md: names \`work.loop.concurrency\`, which LOOP_BOUND_VALUE_RESOLVERS does not carry`
    And after `src/loop-bounds.mjs` is restored its sha256 equals the pre-probe sha256 and the control is green

  Scenario: the three renders are byte-identical to the source's rendered form
    When `aof work update --dry-run --json` runs at the repo root
    Then `summary` reads `created` 0, `updated` 0, `deleted` 0 and `drift-warning` 0
    And the `actions` rows for `.claude/commands/aof/autonomous.md`, `.codex/skills/aof-autonomous/SKILL.md` and `.opencode/commands/aof/autonomous.md` each carry `action` `skip`
    And each of those three files on disk contains `work.loop.concurrency`

  Scenario: the manifest and the lock agree with the source
    When `serializeBundleManifest(generateBundleManifest())` from `src/work/bundle-manifest.mjs` is compared with the bytes of `src/bundle/manifest.json`
    Then they are equal
    And the manifest entries for `.claude/commands/aof/autonomous.md` (runtime `claude`) and `.codex/skills/aof-autonomous/SKILL.md` (runtime `codex`) carry `hashContent(<file bytes on disk>)`
    And both hashes differ from their values at HEAD before this story
    And `.aof/aof.lock.json`'s `work.files[]` rows for the three renders carry `hashContent(<file bytes on disk>)`, the `claude` and `codex` rows equal to the manifest's
    And `test/arch/bundle/acd-bundle-manifest-hashes.test.mjs` is green under an isolated global home

  Scenario: the shell-out suite admits exactly the one new key
    When `test/loop/autonomous-shell-out-prompt.test.mjs` runs under an isolated global home
    Then every case passes
    And its one changed assertion is the `survivors` case's config-key set, now `["work.agents", "work.agents.mode", "work.codeReview.autoComplete", "work.loop.concurrency"]`
    And every other assertion of the suite is byte-identical to HEAD's

  Scenario: the key is named only once story 01's resolver is in the tree
    Given `src/loop-bounds.mjs` carries `work.loop.concurrency` in both resolver maps (story 01, an ancestor of this story through 04)
    When FF-7101 runs over the edited prompt
    Then leg (a) resolves the key and is green
