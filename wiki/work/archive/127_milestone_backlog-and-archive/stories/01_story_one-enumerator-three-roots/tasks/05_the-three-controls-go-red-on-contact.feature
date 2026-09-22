@manual @cli @work @work-stream
Feature: The three controls this story lands each go red for the probe their register row names

  A control that has never failed has never been seen to hold anything. Every declared fitness
  function owes a RED PROBE in the milestone's `VERIFICATION.md` fitness register once it lands —
  what was changed to make it fail, and the message observed (the refine skill's own rule). The three
  this story lands are FF-12701 (`test/arch/work/acd-work-root-one-enumerator.test.mjs`), FF-12702
  (`test/arch/work/acd-number-null-safe.test.mjs`) and FF-12706
  (`test/arch/work/acd-next-walkers-exclude-archived.test.mjs`); their probes are the ones
  `ARCHITECTURE.md`'s register names, spelled out here so the builder runs each and records it.

  The probe is applied to a scratch copy or reverted immediately — the working tree is shared with
  concurrent lanes, so a probe is never left in place across a hand-back. Each run is a focused suite
  (`node scripts/test.mjs --only test/arch/work/index.mjs` under `AOF_GLOBAL_HOME=$(mktemp -d)`);
  never the full suite on this machine.

  Scenario: FF-12701 fails for a second regex home and for a second scanner
    Given the landed control passing at HEAD
    When a private `const ITEM_RE = /^(\d+)_(milestone|story|task|uat|spike|chore)_([a-z0-9-]+)$/;` is pasted back into `src/work/doctor.mjs`
    Then the control fails with a message naming `src/work/doctor.mjs` as a second definition
    When that is reverted and `import { readdirSync } from "node:fs"` plus a `readdirSync(workDir)` call are added to `src/work/reindex.mjs` (which already imports `ITEM_RE`)
    Then the control fails with a message naming `src/work/reindex.mjs` as an undeclared pairing
    And both messages are recorded against FF-12701 in `VERIFICATION.md`, and the tree is clean afterwards

  Scenario: FF-12702 fails for an unguarded reduce
    Given the landed control passing at HEAD
    When the `number != null` guard is removed from `appendPosition`'s row filter in `src/work-promote/promotion.mjs`
    Then the control fails with one finding naming that file and line
    And the message is recorded against FF-12702 in `VERIFICATION.md`, and the tree is clean afterwards

  Scenario: FF-12706 fails when a resolving reader filters and when a walker stops filtering
    Given the landed control passing at HEAD
    When `.filter((row) => !row.archived)` is added to `findWork`'s match set
    Then the control fails naming `findWork` as a resolving reader that filters, and the fixture leg reports `findWork("05")` empty
    When that is reverted and the predicate is dropped from `nextWork`'s driver walk
    Then the control fails naming `nextWork`, and the fixture leg reports an archived or backlog ref in the ready set
    And both messages are recorded against FF-12706 in `VERIFICATION.md`, and the tree is clean afterwards
