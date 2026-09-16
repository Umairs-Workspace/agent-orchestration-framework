---
type: story
number: 00
slug: the-declared-toolchain
title: "The declared toolchain — one declaration, one speller, one bounded launch, and no guessed program"
parent: 72
status: done
owner: product-owner
created: 2026-09-02
updated: 2026-09-03
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/72_milestone_inner-loop/ARCHITECTURE.md#ADR-001, src/work-audit/spawn.mjs, src/loop-bounds.mjs, src/command-error.mjs, src/terminal-providers.mjs, src/config-editor.mjs, schemas/aof.schema.json, test/arch/acd-audit-never-imports-project-code.test.mjs, test/arch/acd-test-suite-registration.test.mjs, test/arch/acd-loop-suite-registration.test.mjs, test/support/source-slice.mjs]
files: [src/work-toolchain.mjs, .aof/aof.config.json, test/work-toolchain-declaration.test.mjs, test/arch/acd-declared-program-single-speller.test.mjs, scripts/test.mjs]
---
# 00 · The declared toolchain

## User story

As the person who installs aof into a repository that is not this one,
I want the test runner aof launches to be something my project DECLARES,
so that a targeted-test command works in my repo on my toolchain, rather than working in aof's own
repo and lying in mine.

**The constraint that shapes this story is not preference, it is a measured boundary.** `66/ADR-004
§2` and `59/FF-5904` forbid the aof process importing project test code, because importing executes
it — 880 modules in this repo. And aof is a framework installed into two private downstream projects
and the mesh test-bed, none of which has a `scripts/test.mjs`. So the runner cannot be imported and
cannot be hard-coded. What is left is a declaration and a bounded spawn, and this story is both.

`work.test` in `.aof/aof.config.json` is resolved by exactly ONE module — `src/work-toolchain.mjs` —
the way `src/loop-bounds.mjs` is the one home for `work.loop.*`. **No program name is spelled
anywhere in `src/`**: no `"npm"`, `"vitest"`, `"pytest"`, `"yarn"` or `"pnpm"` literal in an
executable position, so a guessed default cannot exist as text. An absent or invalid declaration is a
coded refusal naming the key (`test-runner-undeclared`) and **no spawn** — never a fallback to
`npm test`, because a guessed program is a program nobody declared.

Selection reaches the runner through ONE expansion rule and not a grammar of styles: `selectArgs` is
an argv template in which `{file}` expands once per selected file. A positional runner falls out as
`["{file}"]`, a flag runner as `["--only", "{file}"]`. One rule; no `style` enum to grow a third
member later.

**Every child process this milestone starts comes from `runBounded`** (`src/work-audit/spawn.mjs`) —
argument vector, no shell, deadline armed, kill on expiry. This story authors no second bounded spawn
and imports `node:child_process` nowhere. That seam's argument-vector door refuses a **shell string**
but lets a **bare name through to the operating system** — `argumentVectorProblem`
(`src/work-audit/spawn.mjs:98-113`) conjoins the two conditions at `:102`
(`SHELL_SHAPED.test(command) && !exists(command)`), and the file says so at `:79-81`. Measured: bare
`node` runs, bare `npm` reaches the OS and comes back `not-started: spawn npm ENOENT`. So a missing
program becomes an error far from its cause. **PATH resolution happens in front of the door, in this
module**, so a command that resolves nowhere is a coded refusal naming the declaration — the door is
left exactly as strict as it was, never relaxed. A `deadline-expired` or `not-started` outcome is
reported as its own outcome and exits non-zero; a run that produced no verdict is a failure, never
folded into a pass.

This story ships the declaration, the compiler and the launch. It ships **no command** — `aof test` is
72/02's, and this module is useless on its own by design, which is what makes it independently
reviewable.

## Tasks

- [x] `tasks/00_the-runner-is-declared-or-there-is-no-run.feature` — one module reads the keys, the resolved program exists before any launch, and an absent or unresolvable declaration is a coded refusal with no spawn; no program name is spelled in `src/`
- [x] `tasks/01_one-bounded-launch-and-a-deadline-is-never-green.feature` — the one bounded seam with an argument vector and no shell, `{file}` expanded once per selected file, and a deadline expiry or failure to start reported as itself and exiting non-zero

## Notes

- `.aof/aof.config.json` is this repo's own declaration and this story is its sole writer. Adding
  `work.test` here is aof dogfooding its own boundary: this repo is just another installed project.
- **This module compiles TWO declarations, and they differ in absence.** `work.test` absent is a
  refusal; `work.worktree.prepare` absent is a silent no-op (72/ADR-007 §1). A present-but-malformed
  declaration is a refusal for both. Do **not** build a shared `resolveDeadlineOrRefuse` that carries
  the refusal into the prepare key — the refusal belongs to the `work.test` resolver, the compile-time
  field faults belong to both. 72/04 tests the prepare compiler and cannot build it: ADR-008 §2 makes
  this story its sole writer, which is why its rows are in `tasks/00` here.
- **Declare `work.worktree.prepare` in this repo's own config too.** Absent means silent no-op, so
  without it 72/04 ships a feature this repo never exercises and the motivating benefit — agents no
  longer paying for `npm install` — arrives only when someone later edits a file 72/04 may not touch.
  The declaration lookup needs the same injectable seam as `options.exec`: 30 test suites depend on
  `src/mesh-worktree.mjs`, and a door-calling suite whose `projectRoot` resolves to a config with the
  key would start spawning a real install.
- FF-7201 is this story's control (`test/arch/acd-declared-program-single-speller.test.mjs`). It
  carries the no-shell / no-second-seam clauses `59/FF-5904` makes over the audit family, asserted here
  over 72's own family — which that control does not reach.
- **Census scope: assert over the MILESTONE's module set, not this story's one module** (ADR-008 §1:
  `src/work-toolchain.mjs`, `src/work-test-select.mjs`, `src/commands/test.mjs`), over those that exist
  on disk, with a non-vacuity floor of ≥1 — otherwise 72/01 and 72/02 must each reach back into this
  story's control file to add themselves. **Do not widen the census tree-wide:** 23 modules under
  `src/` import `node:child_process` today and four carry a `shell:` option, none of them 72's. And do
  not widen the five frozen program names to "package-manager names" — `src/frameworks.mjs:66` builds
  `["npx", …]` and spawns it at `:104` with `shell` on win32; that is milestone 12's installer and it
  would red on arrival. State the admit as a SHAPE (a five-name literal that is not the `command`
  handed to the seam), never as a file allowlist, or a future `runBounded({ command: "npm" })` planted
  in an allowlisted file passes.
- `59/FF-5904` exports `spawnRouteProblems`, which covers seven of the eight plant rows — but
  `OTHER_SPAWN_APIS` omits bare `exec`, which is a census row here. Extend locally; editing that
  constant is a write outside this story's set.
- **Two refusal codes are required to be distinct and are unnamed.** Only `test-runner-undeclared` is
  fixed by ADR-001 §2. Proposed and open to the builder: `test-runner-declaration-invalid` (a present
  declaration with a bad field) and `test-runner-unresolvable` (a well-formed `command` that resolves
  nowhere). 72/02's face renders both.
- **Windows: a `.cmd` shim cannot be declared at all** under "no shell, ever" — Node 22 throws `EINVAL`
  on a batch file without `shell: true`, which `runBounded` catches and reports as `not-started`. Four
  of the five frozen names ship as `.cmd` on Windows, so the refusal message must say: declare an
  executable and its script (`node` + `path/to/runner.mjs`), not a shim. That is exactly what this
  repo's own declaration will be.
- **This adds a FOURTH PATH resolver.** `src/terminal-providers.mjs:33` (the only one handling
  `PATHEXT` correctly — copy its shape), `src/tool-store.mjs:143` and `src/config-inspect.mjs:567`
  already exist and are all module-private, so reuse is impossible without writing outside this set and
  extraction would touch three files. Re-derive ~18 lines here and ledger the one-home debt rather than
  absorbing it silently. Add an `isFile` check (a bare `npm` on Windows resolves to an extensionless
  POSIX shell script that exists and cannot be executed), and compare casing case-insensitively —
  `PATHEXT` returns `node.EXE`.
- `.aof/aof.config.json` needs **no schema edit** (`schemas/aof.schema.json` → `$defs.work` has
  `additionalProperties: true`) and survives a config rewrite (`src/config-editor.mjs:351` preserves
  the `work` block wholesale). The declaration will name a `--only` flag `scripts/test.mjs` does not
  parse until 72/02 — that is expected, and adding the parser here would poach 72/02's sole-writer
  region.
