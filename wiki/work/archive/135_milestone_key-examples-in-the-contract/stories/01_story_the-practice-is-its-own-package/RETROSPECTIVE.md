---
doc: retrospective
updated: 2026-10-03
---
# 01 · The practice is its own package — Retrospective

## R1 — a package move's write set missed every control that pins the moved code

- **Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** architect
- **Raised by:** the developer, at 01's build

**What happened.** Beyond `files:`, the move had to touch six more files:
- `packages/core/src/application/bindings/commands/doctor.mjs`, whose gate resolver became unused
- FF-5905, which pins `createWorkDoctor`'s signature and the lane roster
- the bundle suites' package-purity inventory and owner count
- `scripts/workspace-runtime-audit.json`, the source digests
- 142's Plan 09 ledger, the case-name hashes

**Why.** Refine listed the modules that move, not the controls that pin a moved module's path,
signature or digest.

**Lesson.** When refine plans a package move, it greps for every control that names a moved module
by path, by signature or by digest, and lists those controls in `files:` beside the module.
