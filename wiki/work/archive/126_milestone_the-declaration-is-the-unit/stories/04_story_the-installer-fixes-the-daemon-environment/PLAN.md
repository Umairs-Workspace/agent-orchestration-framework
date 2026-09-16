# 126/04 — build brief

Advisory, and the builder's. Not a contract: the task `.feature` scenarios are. Deviating from this
is not a finding.

## The mechanism

The desktop command module already has the two shapes this needs, and the whole story is applying
them to two new acts. The `stop` verb reaches the process table through injected list and kill
functions and declares a `--dry-run` because the CLI bijection gate spawns every mesh verb with
`--json` — a machine-wide act must never be performed by a probe. Copy that shape exactly.

**Autostart.** Two flags on the existing `install` verb, never a fifth verb: `--autostart` writes one
`REG_SZ` value under the current user's Run key naming the installed app by its absolute path in the
resolved install dir; `--no-autostart` deletes it. Both idempotent — writing the value it already
holds and deleting an absent one are successes, so a deploy script runs either unconditionally.
Every registry touch goes through one injected runner; the suites drive parse and decision over a
fake and nothing in CI reaches the real hive. Platform is a seam, injected so the leg runs on every
host: off Windows the flag returns a coded `autostart-unsupported-platform` refusal naming the
platform. A silent success on Linux is the worst outcome available and the one to test against.

**Preflight.** Three checks, reported by both `install` and `run`, each pass/fail with a code, none
of which writes anything. `claude` resolves and its auth status reports authenticated — the probe
that spends no tokens and catches the failure this milestone exists to prevent. The installed
payload's build id, read the way the deploy rules already read it. And each workspace registered to
this node carries its own pinned `mesh.workspaceId` — enumerate them through the resolver presence
already uses and read each workspace's own config. That last check is TECH_DEBT item 4 stated as a
report; its fix at the spawn is another story's. Resist repairing anything from a preflight.

## The verification step

Over a fake runner: write twice, one entry, two successes; remove an absent value, success; the
written value is the absolute app path. Over an injected non-Windows platform: the coded refusal,
non-zero, never `ok`. `--dry-run` with a recording runner: zero writes. The preflight over fixtures
that produce both a pass and a fail for each of the three checks, reported identically from
`install` and from `run`. Then the one real act on this machine: `aof mesh desktop install
--autostart`, read the key back with `reg query`, and remove it with `--no-autostart`.

## Deliberately out of scope

A Windows service — refused on the session-0 basis, recorded in ADR-007 so it is not re-proposed.
`scripts/install-local.mjs` — the dev deploy for this checkout, unchanged. The tauri autostart plugin
— not a dependency and the decision does not belong in the Rust shell. The end-to-end "log in and
work resumes" is the milestone's verification once `126/02` and `126/03` land.
