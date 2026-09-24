@manual @cli @work @distribution
Feature: on the real control node, a minted run names no machine and the fleet still sees its peers

  WHY THIS IS MEASURED AND NOT INFERRED. Every other task in this story is a unit or a scan; none
  of them proves the thing the story is for, which is that a run minted by the live daemon, on
  this machine, against the real identity sidecar, writes a folder and a `node` key that are safe
  to commit. Green tests are not a running system — the standing lesson on this repo — and the
  identity this story changes is read from `~/.aof/mesh/identity.json` at workspace load, so the
  only honest check is a fresh mint after a restart. 132's own refine run is the counter-example
  it exists to remove: `aof work run-start 132` wrote `132/runs/<hostname-id>/` while this contract
  was being authored.

  WHAT THE DEVELOPER RUNS, and where it stops. This task covers the CONTROL NODE only. The Mac
  worker and the WSL node also carry hostname-derived ids and also need `--reidentify`, but
  neither may be restarted from here — an SSH-spawned Mac daemon has no login session and burns
  runs, and the desktop supervisor is the operator's to quit and relaunch. Those two are an
  OPERATOR step, written up in `PLAN.md`; this task neither performs nor blocks on them, and says
  so in its evidence rather than leaving a reader to assume the fleet was fully migrated.

  RULINGS (QA, 2026-09-22). (1) Evidence is recorded in the story's `VERIFICATION.md` — the
  command, its unedited output, and the instant — and every pasted line has the repo's own scrub
  applied, because this evidence is committed. (2) "At the source" means the file on disk and a
  fresh process, never a re-assertion of an earlier step's output. (3) The deploy is
  `node scripts/install-local.mjs --skip-ui` and a restart of the desktop app BY THE OPERATOR; the
  developer does not start or force-kill a daemon. (4) If the fleet cannot be read because the
  daemons are down, that is recorded as such — an unreadable fleet is not a pass.

  Background:
    Given the story's code is installed on this node (`node scripts/install-local.mjs --skip-ui`)
    And `~/.aof/bin/aof.exe --version` reports `payload <buildId>` matching the stamped `BUILD_ID.json`
    And the operator has quit and relaunched the desktop app, so both daemons carry that build

  Scenario: the node re-identifies once, deliberately, and says what it invalidated
    Given `~/.aof/mesh/identity.json` reads a hostname-derived `nodeId` with a `derivedFrom` key
    When `aof mesh identity --reidentify --json` is run once
    Then the envelope's `from` is that hostname-derived id and its `to` matches `/^node-[0-9a-f]{4,8}$/`
    And the sidecar on disk now reads that opaque id
    And the envelope names the enrollment credential and node record keyed by the old id
    And running it a second time answers the same `to` and changes no bytes

  Scenario: a freshly minted run writes a folder and a node key that are safe to commit
    Given a scratch work item with no `runs/` directory
    When `aof work run-start <that item> --json` is run
    Then the envelope's `node` matches `/^node-[0-9a-f]{4,8}$/`
    And the record on disk sits at `<item>/runs/<that id>/<runId>.json`
    And reading that file shows its `node` key equal to the same opaque id
    And neither the path nor the file's bytes contain this machine's hostname, in any case or separator form
    And `aof work run-complete <that item> --outcome done` closes it, leaving the path unchanged

  Scenario: history still resolves across the rename
    Given an item carrying run records under BOTH the old hostname segment and the new opaque one
    When `aof work run-status <that item> --json` is run
    Then it answers every record from both segments, ascending by `runId`
    And each row renders the `node` its record carries
    And no record was moved, rewritten or lost

  Scenario: the fleet still sees its peers after the id changed
    When the fleet at `http://127.0.0.1:4181/?mode=fleet` is read
    Then this node appears under its new opaque id
    And each peer this node could see before the re-identification is still listed, joined rather than UNJOINED
    And a peer that is unjoined is recorded with the reason, not silently counted as absent

  Scenario: the working tree carries no machine name for this story's own runs
    When `git status --porcelain` and a recursive listing of this story's `runs/` are read
    Then no path under `runs/` contains this machine's hostname
    And `132/runs/<hostname-id>/`, written by this story's refine run, has been removed or renamed, and the evidence says which
    And `git ls-files` still names no run record carrying a live machine name

  Scenario: the two remaining nodes are named as outstanding, not assumed done
    When the evidence for this task is written
    Then it states that the Mac worker and the WSL node still carry hostname-derived ids
    And it names `aof mesh identity --reidentify` on each, plus the operator-side restart, as the outstanding step
    And it does not claim a fleet-wide migration this task did not perform
