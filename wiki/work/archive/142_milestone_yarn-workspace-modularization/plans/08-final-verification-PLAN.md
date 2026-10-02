# Plan 08 — Verify the complete migration and hand it over

Status: complete on this host 2026-10-01; native/platform legs listed in [08-VERIFICATION.md](08-VERIFICATION.md) remain open. Depends on all preceding plans in the [index](README.md).

## Objective

Prove the final tree satisfies the agreed package boundaries and preserves the installed product.
Replace incremental extraction evidence with a current, reproducible requirements audit.

## Work

- [x] Reconcile [COMPLETION](../COMPLETION.md) against the final code, manifests and
  [SPEC](../SPEC.md). Remove stale outstanding claims, including already-extracted MCP/transitions,
  and attach current evidence to every requirement rather than copying old passing counts.
- [x] Capture the tested revision, worktree state, tool versions, dependency installation mode and
  platform for each check. Keep durable summaries and reproduction commands in tracked notes.
- [x] Run final installation/supply-chain gates before broad verification. Review the final package
  graph, export map and dependency inventory for undeclared or unnecessary dependencies.
- [x] Run the package tests, root unit/full suites, CLI integration and real child-process smoke
  checks using their correct runners. Inspect `scripts/check.mjs` coverage and run any omitted gates.
- [x] Triage every failure as migration regression, demonstrably pre-existing issue, environmental
  limitation or pending approved change. Record reproduction and impact; fix migration regressions.
  Never alter unrelated work-item state or weaken architecture guards to produce a green run.
- [ ] Complete the verification matrix below on available supported hosts/CI. (Windows x64 complete; Linux/WSL re-run, macOS, arm64, hosted CI and the live desktop app are open.) Preserve unavailable
  platform checks as open requirements rather than marking them passed from source inspection.
- [x] Audit final command/skill compatibility, persisted record formats, effect ordering/replay,
  generated assets and optional integration isolation against the baseline.
- [x] Update package/developer docs and milestone implementation/state/completion notes. Summarize
  final ownership, public entry points, verification and remaining limitations for handover.

## Verification matrix

| Surface | Required proof |
| --- | --- |
| Fresh checkout/worktree | Pinned immutable Yarn installation, disabled scripts policy, supply-chain audit, no dependency resolution through another checkout. |
| Package architecture | Declared acyclic dependencies; explicit public exports; no feature-to-core/private sibling/legacy imports; nonempty guards that reject planted violations. |
| Core and skills | Complete contribution/argument inventory; source and installed CLI; required skill operations in fixtures without UI/desktop. |
| Behavior and durability | Work/run lifecycle, assignment/reclaim, cache authority, loop dispatch, effect replay/acknowledgement and messaging/knowledge boundaries remain compatible. |
| Copied payload | Execute from an isolated root/unrelated cwd; imports, assets and child entries remain entirely within the payload. |
| React UI/server | Production UI build, asset serving and shared invocation; board/fleet/terminal integration behavior. |
| Desktop | Locked Rust core tests, native Tauri check/build/resources, real process supervision and application smoke test. |
| Standalone/native | Real SEA executable, correct native PTY sidecar, actual terminal interaction, UI/assets and release archive checks. |
| Supported platforms | Windows, relevant WSL paths and the existing release matrix; record native build/smoke evidence per platform. |
| Generated output | Canonical manifest and fixture rendering parity; separately identify approved checked-in refreshes and any pending ones. |

## Completion gate

- [x] The root is private; core owns `aof` and its required runtime; apps and domains own their actual
  implementations. No required package exists only as an empty shell or a forwarding layer.
- [x] All plans have concrete evidence and no unresolved migration regression. Any unrelated baseline
  failure has a documented reproduction and explicit disposition, not an implicit waiver.
- [x] Required native/platform or generated-parity gaps remain visibly open until resolved. Do not
  call the full migration complete merely because local JavaScript tests pass.
- [x] The final review explains what moved, the supported public seams, how to build/test/install and
  exactly which environments were verified. Local commits can be prepared under existing authority;
  pushing, publishing or deploying is not required by this plan.

This milestone stays ordinary project documentation throughout; completion reporting does not require
invoking AOF workflow commands against the repository.
