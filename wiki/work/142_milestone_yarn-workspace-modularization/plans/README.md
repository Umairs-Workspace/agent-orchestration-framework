# Remaining workspace migration plans

Planning baseline: `e343d50` (`refactor: move domain transitions into owning workspaces`),
2026-09-29. These are ordinary engineering plans, outside the AOF workflow. They do not
create managed stories, runs, or acceptance state. Plans 01–08 are complete on the available host (Windows x64, 2026-10-01); the open platform/desktop
legs are listed in [08-VERIFICATION.md](08-VERIFICATION.md) and the [completion audit](../COMPLETION.md).

The agreed boundaries remain in [SPEC](../SPEC.md) and [MIGRATION](../MIGRATION.md).
[IMPLEMENTATION](../IMPLEMENTATION.md) records completed batches;
[COMPLETION](../COMPLETION.md) is the final requirements audit.

## What is already implemented

Pinned Yarn and the existing feature workspaces are in place. Substantial work, work-graph,
work-loop, execution, mesh, messaging, knowledge, Notion, effects and server implementations
already live in packages. Feature command contributions and the shared registry contract exist.
The latest batches moved mesh worker/launcher/transports and seven domain transition modules.
Graph MCP is already server-owned; the older knowledge row in COMPLETION is stale on that point.

The last recorded copied-payload check retains 117 command definitions; the package-test bridge
has 217 cases. These are baseline observations, not final verification or permanent count targets.
Core now owns the installed product under `packages/core/`; its configured compatibility adapters
and forwards remain private pending Plan 06. UI is at `ui/`, and desktop is at `app/desktop/`.

## Execution order

| Plan | Result | Prerequisites |
| --- | --- | --- |
| [01 — Remaining domain ownership](01-domain-ownership-PLAN.md) | Complete: domain services extracted; [452-file ownership ledger](01-module-ledger.json) and [verification notes](01-OWNERSHIP.md) recorded. | Current baseline |
| [02 — Service assembly and CLI contributions](02-composition-and-cli-PLAN.md) | Complete: explicit application construction and CLI contributions; [scope and verification](02-ASSEMBLY.md) recorded. | 01 ownership decisions |
| [03 — Core workspace](03-core-workspace-PLAN.md) | Complete: installed product and assets live in core; [package, installation and reconciled verification](03-CORE.md) recorded. | 01–02; applicable 05 staging integrated |
| [04 — UI and desktop applications](04-app-workspaces-PLAN.md) | Complete: `apps/ui` and `apps/desktop` own their builds and assets; [evidence](04-APPS.md). Live desktop run open. | Stable core/path contract from 03; integrate applicable 05 changes |
| [05 — Distribution and developer tooling](05-distribution-and-tooling-PLAN.md) | Implemented: copied/SEA payloads, worktree preparation, WSL transport and release gates pass on Windows/Linux x64; [evidence](05-DISTRIBUTION.md). App-layout confirmation done on Windows x64 at `2cd5d915` (Plan 08); other matrix legs remain open. | Start with 03; finish after 04 |
| [06 — Test ownership and adapter removal](06-tests-and-boundaries-PLAN.md) | Public APIs replace compatibility paths; whole-tree boundary checks enforce the architecture. | Prepare guards during 01; remove adapters after 02–05 |
| [07 — Assets, citations and skill compatibility](07-assets-and-skills-PLAN.md) | Complete: shipped assets and required CLI operations agree with final source locations; [evidence](07-ASSETS.md). | Update per move; final sweep after 06 |
| [08 — Final verification and handover](08-final-verification-PLAN.md) | Complete on this host: [verification and handover](08-VERIFICATION.md); platform limits explicit. | 01–07 |

Numbers describe the main sequence, not permission to leave intermediate builds broken. Bring
distribution changes, architecture-reader updates and canonical citation fixes into the batch
that moves their source. Establish baseline failures and test discovery before the first removal.

## Rules for every batch

- Preserve command IDs, flags, defaults, output, errors, persisted state and installed executable
  identity. Core includes the CLI; feature packages extend it. There is no `apps/cli`.
- Keep feature dependencies one-way through public exports and narrow service ports. Moving a
  cycle behind a dynamic import does not resolve ownership or initialization order.
- Use the pinned Yarn and authoritative `yarn.lock`; keep lifecycle scripts disabled except for
  existing reviewed exceptions. Run the supply-chain audit after dependency changes.
- Run focused behavior and distribution checks before broad verification. Preserve test IDs and
  prove source scans are nonempty and still reject violations after each move.
- Record changed files, commands executed, real test counts and remaining failures in the existing
  implementation notes. Use small, reversible commits without changing persistent data formats.
- Exercise workflow commands only in disposable fixtures for verification. Do not run AOF lifecycle
  commands against this milestone or change repository work-item state to make tests pass.

## Generated files and authorization

The user approved citation-only refreshes for `.aof/loops/autonomous-cascade.md`,
`.aof/loops/operator.md`, `.aof/loops/speed-thoroughness-autonomy.md` and their three lock hashes.
That does not authorize other generated-file refreshes. Plan 07 separates canonical product changes,
fixture rendering and the remaining checked-in generated changes. Prepare an exact diff before any
additional approval request; continue independent migration work while it remains pending.

## Completion standard

A moved filename, an adapter, a JavaScript bundle or a passing historical test selection is not
sufficient. Complete the migration only when the final package boundaries, base skill runtime,
application builds and applicable installation/platform checks have current evidence. Keep
unavailable native/platform checks visibly unverified rather than treating a stub as proof.
