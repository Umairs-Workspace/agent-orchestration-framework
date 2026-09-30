# Application construction

Plan 02 replaces configured-module initialization with explicit construction. Baseline: `6a04b43`
(`142 plans`). No command, persisted format, dependency version, or installed asset changes are
intended. Construction is synchronous; opening a database, starting a listener or terminal, and
resolving integration credentials remain runtime operations.

## Entry points and ownership

[`createApplication({ env })`](../../../../src/application/assemble.mjs) constructs a fresh application.
The default is `process.env`; an explicit environment supplies that application's workspace and
global-home policy. It returns command invocation/lookup, CLI presentation, and named execution,
effects, work, mesh and server APIs, plus `close()`.

The [224-entry construction ledger](02-construction.json) records each compatibility entry, its
constructor, and the exact collaborators supplied by construction. It is review documentation,
never a runtime discovery mechanism. `bindings/` contains focused core constructors which select
public package APIs and pass named methods to factories. No feature receives a universal service
container. The graph test derives its edges from the actual constructor calls, independently of
this ledger.

| Scope | State and ownership |
| --- | --- |
| Process | Installed asset locations, public API/error identities, stateless command definitions, and the default application used by existing CLI/HTTP/MCP entries. Definitions that need no configured collaborators stay shared; registry membership and configured command factories are application-owned. Core leaf utilities for asset references, build information and tool storage retain process diagnostic reporting. Provider executable discovery, transcript roots, child-process environments and integration credentials retain their existing process/invocation override semantics. |
| Application | Workspace/global-mesh path policy, injected diagnostic reporter, run services, effect registry/dispatcher/outbox, domain transition factories, worker active-worktree map, command registry and configured transport APIs. Separate applications construct separate instances. |
| Workspace | Configuration and work paths are loaded for the requested project and passed in invocation context. An application can serve multiple workspaces without retaining the last workspace as ambient state. |
| Invocation/startup | Journal/projection handles, batch caches, listeners, launchers, gateways and terminal sessions. Existing close/stop contracts remain available. The application additionally owns handles/listeners/launchers opened through its configured entry points; operations retain responsibility for their internal sessions and child resources. Registration opens none of them. |

The environment option isolates application configuration and global storage; it is not a process
sandbox or an alternate integration-credential store. Per-call path overrides continue to win.

## Construction order and runtime recursion

1. `foundation.mjs` creates paths, diagnostics and filesystem services. `workspace.mjs` adds work
   configuration/loading. `session-driver.mjs` and `session-hooks.mjs` construct their narrow
   execution and presence services independently.
2. `assemble.mjs` builds stores and readers, product configuration/editing, run records, effect
   registration/dispatch, domain services and transitions, commands, transport APIs and the registry.
   Every named constructor appears once at its application scope.
3. Journal and projection openers are lifetime-managed before consumers capture them. The work,
   execution and assignment transitions share that application's reactor table, journal and delivery
   services. Worker, launcher and reclaim code share its worker state and run transitions.
4. Construction marks the application ready only after the complete first-party registry exists.

The item-lock binding receives the already constructed propagation decision directly. It no longer
holds a deferred module binding. Runtime recursion remains where operations require it: reactors
call transitions, run services collect answers, and loop/HTTP/MCP operations invoke commands.
Explicit asynchronous callbacks return already constructed services and call `assertReady()` first.
They resolve no imports and cannot be used while constructing or after closing. The graph guard
checks every supplied callback's readiness gate and rejects static service cycles.

The shared command port has the same readiness gate. CLI, board HTTP and graph MCP dispatch through
their application's registry, preserving the input/context/result/error contract. No transport
spawns a CLI process to perform a domain operation.

## Lifetime and lightweight entry points

[`lifetime.mjs`](../../../../src/application/lifetime.mjs) owns opened journal/projection handles,
started launchers, and setup/board/fleet HTTP servers. Manual close/stop disowns a resource and keeps
the existing synchronous or asynchronous contract. Application close revokes runtime callbacks,
closes owned resources in reverse order, attempts all closes even if one fails, reports an aggregate
error, and clears the worker map. Server shutdown also destroys upgraded sockets so terminal
connections cannot keep the server alive. Repeated close does not close resources twice. A resource returned
by a startup already in flight when close occurs is immediately disposed by that startup; close
does not wait for unfinished startup operations to return.

Lightweight session hooks import `default-session-hooks.mjs`, with shared default foundation and
workspace instances. Session drivers have a separate default assembly. The full default application
reuses those same instances, preserving identity for old import paths without putting the registry
on the hook path. The installation salt operation now lives in mesh's public node-identity module,
so presence hooks do not need the identity command family. The identity command factory still
supplies its injected sidecar writer to that shared operation; a public test covers persistence,
existing-salt reuse, absent sidecar paths and unchanged write-error identity.

Existing `src/` entries remain compatibility exports until Plan 06. The new construction graph
reaches no configured compatibility entry, and no package imports assembled core. Direct core
implementation leaves remain deliberate dependencies for Plan 03 relocation.

## Contributions and declared extensions

The contracts registry remains the only registry. Package contributions retain deterministic order,
including feature commands under shared namespaces. All 117 baseline descriptors, schemas, routes,
aliases, defaults and validation metadata match the
[frozen baseline inventory](../../../../test/fixtures/application/command-inventory.json).

An owner may declare `extensionPoints` with permitted contributor names, flag names and positional
argument names. A contribution's `extensions` adds only those declared inputs. Positional additions
require the owner to describe existing positions in `cli.spec.arguments`; options and arguments
receive type, enum, required and default validation through both CLI conversion and direct registry
invocation. Extensions resolve after owner registration, with additive order determined by the
contribution order. First-party descriptors currently need no same-command additions.

Unknown targets/points/contributors, duplicate IDs/routes/inputs, common-flag collisions and handler
or route replacement fail deterministically. Extension application preserves the original owner,
operation and presentation. It cannot silently replace another package's behavior.

## Verification

- All 117 ordered JSON descriptors match `6a04b43`; 18 real child-CLI cases preserve stdout, stderr
  and exit status byte for byte, covering help/version, text/JSON, validation/refusal, work, memory,
  graph, assets and migration surfaces.
- All 224 configured compatibility entries preserve 1,502 exported names, types and primitive
  values. The baseline comparison needs registry-first import order: an arbitrary entry order
  reproduces its `serveBoard` initialization cycle, which the new construction removes.
- Eight application checks cover the construction graph, startup/credential-read refusal probes,
  descriptor parity, isolated configuration/journal/worker state, CLI/HTTP/MCP invocation identity,
  real HTTP/upgraded-socket cleanup, late startup disposal and failed-resource cleanup. Registration/help starts no child process, listener,
  request or native PTY, reads no credential environment variables and creates no global home.
- All 12 contracts registry cases and six mesh command cases pass. A fresh copied installation passes
  all 32 selected registry, effects, execution and mesh command/transition cases; public APIs resolve inside the copied installation,
  with all 117 descriptors unchanged.
- The standalone JavaScript payload compiles and retains all 222 previously reachable configured
  services and all 313 baseline package modules. Native PTY remains external. This checks bundling,
  not native SEA injection/signing or platform release artifacts.
- Source guards follow actual supplied collaborators and public implementations. They retain their
  planted violations and nonempty scans. Session-driver and worker closures increase by one module
  each (29 to 30; 117 to 118) for the explicit path policy, with their ownership denysets unchanged.
- Pinned Yarn `test:unit`: 997 passes, one baseline asset-render failure. The full `test` run finished
  with 11,475 passing unit cases and 48 failures. All 27 source-guard failures now pass in focused
  reruns; 20 failures are inherited and documented below. One transcript quiet-window timing check
  passed its separate 35-case suite rerun. The full run began before the final source corrections;
  these are separate, reconciled results, not a claim that the full suite is green.
- Corrected selections pass: 113 mesh cases, 64 driver/census/run cases, 27 board cases, 20 declaration
  cases, 21 loop resume cases and 12 doctor cases. Earlier construction/census and lane corrections
  pass all 27 and six cases respectively. The final application suite passes all eight checks.
- All 134 CLI integration cases pass in the full run. Desktop Rust tests pass all 118 cases, and
  `cargo check` for the desktop shell passes. Verification used Windows and Node 22.22.2; native SEA
  injection/signing and the cross-platform release matrix remain later-plan checks.
- No UI source, dependency, lockfile, generated assistant asset or managed lifecycle state changed.
  No package installation or UI rebuild was needed.

Detailed local logs and comparison scripts are under `.tmp/workspace-migration/plan02/`.

Inherited failures are kept distinct from moved-source assertions corrected in this plan:

| Existing failure family | Evidence and follow-up |
| --- | --- |
| Registry single-home/framework-owned installed-loop parity, trigger asset line endings, learning-edge manifest/lock parity | Four architecture cases recorded on `e343d50` in Plan 01; registry parity also reproduced on `6a04b43`. Plan 07 owns installed assets. |
| Day-one audit/supervision citations | Two architecture cases recorded on `e343d50`; supervision also reproduced on `6a04b43`. Plans 06/07 own source readers and canonical citations. |
| Token-bucket writer and item vocabulary source discovery | Two architecture cases recorded on `e343d50`. Plan 06 owns these old compatibility-path readers. |
| Adapter, architect/refine and autonomous skill renders | Three cases reproduced on `6a04b43` (`baseline-known.log`, `baseline-render.log`, `baseline-autonomous.log`). Plan 07 owns generated-copy parity. |
| Trigger source-copy fixture and heartbeat bound source reader | Both reproduced on `6a04b43` (`baseline-loop-readers.log`): the copy lacks workspace package resolution, and the bound assertion reads the old configured entry. Plan 06 owns fixture/source-reader migration. |
| Day-one anchor asset parity | Reproduced on `6a04b43` (`baseline-anchors.log`). Plan 07 owns the installed asset/citation reconciliation. |
| Readiness-rule source reader and debt cited-path filtering | Both reproduced on `6a04b43` (`baseline-final-work.log`, `baseline-debt.log`). Plans 06/08 own the remaining fixture/reader reconciliation and final behavior audit. |
| Repository toolchain declaration under Windows Yarn | Reproduced on `6a04b43` with the active Yarn run's exact PATH shim (`baseline-final-work.log`): the declared `node` resolves to Yarn's temporary `node.CMD`, which the no-shell executable policy refuses. Plans 05/08 own this tooling check. The baseline archive has no Yarn installation state, so reproduction used the existing shim without installing anything. |
| Repository work-record expectations | Three full-run failures reproduced on `6a04b43` (`baseline-live-tree.log`): the ordinary-engineering 142 spec lacks managed-record frontmatter, a backlog story lacks its context contract, and completed story 141 remains at the stream root. Plan 08 owns reconciliation of these repository-wide expectations. No lifecycle state was changed to satisfy the tests. |

## Handoff

Plan 03 can move the explicit core assembly with its deliberate implementation dependencies.
Plan 06 removes compatibility exports and remaining old source-reader assumptions; Plan 07 handles
canonical citations and installed asset parity. Plans 04/05/08 still own app relocation, distribution
and final native/platform verification. These notes do not advance managed AOF lifecycle state.
