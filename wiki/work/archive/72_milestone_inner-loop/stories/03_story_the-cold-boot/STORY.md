---
type: story
number: 03
slug: the-cold-boot
title: "The cold boot — a session verb stops loading the whole command registry, and the duplicate hook blocks go"
parent: 72
status: done
owner: product-owner
created: 2026-09-02
updated: 2026-09-07
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/72_milestone_inner-loop/ARCHITECTURE.md#ADR-005, src/claude-settings.mjs, src/commands/mesh/session.mjs, src/spine/face.mjs, src/frozen-set.mjs, src/bundle/hooks/claude-session-start.json, src/bundle/hooks/claude-session-prompt-ping.json, src/bundle/hooks/claude-session-end.json, test/arch/acd-audit-never-imports-project-code.test.mjs, test/arch/acd-test-suite-registration.test.mjs, test/support/source-slice.mjs]
files: [src/cli.mjs, .claude/settings.json, test/cli-session-boot-closure.test.mjs, test/arch/acd-session-verb-boots-no-registry.test.mjs, test/arch/acd-managed-hook-not-duplicated.test.mjs, test/bundle-claude-session-hooks.test.mjs, scripts/test.mjs]
---
# 03 · The cold boot

## User story

As the operator whose every typed prompt fires a hook,
I want `aof session ping` to load what a session verb needs and nothing else, and to fire once rather
than twice,
so that presence tracking costs a hook's worth of work instead of the whole CLI's.

**The boot cost is one import, not the two the SPEC assumed.** Measured at HEAD: `src/cli.mjs` takes
363–384 ms to import, of which `src/command-core.mjs` alone is **324–351 ms** — because that module
statically imports all 88 command modules. `src/work.mjs`, which the SPEC named as "64 KB" of the
problem, is **16 ms**. Whole process 0.609 s against 0.150 s for the session module alone. So the fix
is precise: keep the registry out of the session verb's static import closure, and the rest follows.

`src/spine/face.mjs` is out too, for the same reason — it reaches the registry (measured 332–370 ms
against `command-core`'s 324–351 ms). And a **lazy** path that awaits the registry on the hot path is
the same cost with a different spelling, so the session module's own closure holds no dynamic
`import()` of it either.

The second half is the duplication. `SessionStart`, `UserPromptSubmit` and `SessionEnd` each carry two
command-equivalent blocks in `.claude/settings.json` — one hand-authored, one `aofManaged` — so
`aof session ping` shells twice on every turn. **The framework merge rule is NOT changed.**
`spliceSettings` (`src/claude-settings.mjs:254-317`) carries unmanaged entries through on
`isAofEntry`'s rule (`:169-174`) — *"aof recognises its own, and ONLY its own"* — and that is the
`55/ADR-004` escape hatch protecting an operator's own hooks. The SPEC's implied remedy would have
deleted this repo's `guard-test-isolation` entry. So this story deletes THIS REPO's three redundant
hand-authored blocks and adds a REPO control that no unmanaged entry duplicates a managed one; it
touches `src/claude-settings.mjs` not at all.

That control asserts the converse explicitly and drives it: a genuinely distinct unmanaged entry is
ADMITTED, and the `Bash|PowerShell` guard already in that file is planted-and-required-green. A control
that reds on an operator's own hook would be arguing for the framework change this milestone refuses.

## Tasks

- [x] `tasks/00_a-session-verb-boots-no-registry.feature` — the registry and the face module are absent from both static import closures, no lazy import of the registry sits on the session path, the session arm dispatches above every registry use, the verb behaves as before, and no wall-clock assertion appears
- [x] `tasks/01_a-managed-hook-is-not-duplicated.feature` — no unmanaged settings entry resolves to the same invocation as a managed one, equivalence taken over the resolved invocation rather than object identity, a genuinely distinct unmanaged hook admitted, and the merge untouched

## Notes

- **No wall-clock assertion appears in FF-7205.** A timing leg reds on a slow machine and proves
  nothing structural; its ABSENCE is asserted so the next author does not add one. The measured
  milliseconds above are evidence for the decision, not the test.
- The closure walk follows static relative imports recursively wherever the modules live — the
  technique `59/FF-5904` uses, not a directory sweep.
- Equivalence for the duplicate control is over the RESOLVED INVOCATION (the command plus its args,
  with the project-dir variable left unexpanded), not object identity, so a reformatted copy is still
  a copy.
- **Deleting the unmarked blocks costs a delivered test its subject** (F-72-O). Delete the THREE
  UNMARKED groups, never the marked ones: `spliceSettings` (`src/claude-settings.mjs:281-312`) keeps
  unmarked groups by reference and re-appends the managed ones on every patch, so deleting the marked
  block restores the duplication at the next `aof work update`, while deleting the unmarked one is
  terminal. `test/bundle-claude-session-hooks.test.mjs:655-660` then reds, because it builds its
  drift-detection reference by filtering the UNMARKED `SessionStart` entries out of this repo's own
  settings. The repair is **pin the literal** — see the finding for why the other two are refused, and
  ADR-005 for the supersession this records against 49/07's delivered criterion.
- **`helpText()` is the third registry consumer** and ADR-005 §1 names only two. It becomes `async`
  (`src/cli.mjs:584`, called at `:53` and `:149`); it is not exported and has exactly those two call
  sites, so the ripple stays inside this file and none of its five dependents is affected. A missed
  `await` at `:149` renders `[object Promise]` into an error message and
  `test/arch/acd-cli-entry-executes.test.mjs:57` would stay green on it.
- **Hoist the session arm to the FIRST statement of `run()`**, not merely above `resolveRoute` — that
  makes "above every use of the registry" true under both readings, since `helpText()` at `:53` is
  itself a transitive registry use sitting above the arm today. Benign delta to record in `OUTCOME`:
  `deriveRouteTable`'s route-id collision check (`src/spine/face.mjs:96-98`) stops running on the
  session path; it still fires on every other verb and in the arch suite.
- Three traps the arch-tests must avoid: the positional-slice ledger in
  `test/arch/acd-test-suite-registration.test.mjs:148-167` is shrink-only and rejects
  `.slice(x, …indexOf(…))` — use `functionBody` from `test/support/source-slice.mjs` or compare bare
  offsets; test names must be unique across the whole assembled suite (`:196`); and module scope must
  be inert, because that gate imports every suite file. The no-wall-clock lane is **self-referential** —
  a control reading its own source for `Date.now` finds those strings in its own detector table.
