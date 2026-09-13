# 00 · The declared toolchain — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### The test runner aof launches is the project's declaration, and there is no default
`src/work-toolchain.mjs` is the only module in `src/` that reads `work.test.command`, `work.test.args`, `work.test.selectArgs`, `work.test.roots`, `work.test.deadlineMs` or `work.worktree.prepare`, and no program name a declaration may supply — `npm`, `vitest`, `pytest`, `yarn`, `pnpm` — is spelled anywhere in `src/` in an executable position. An absent declaration is `test-runner-undeclared` naming the key, and no program is substituted for the one nobody declared.

### The three ways a declaration fails are three different answers
`test-runner-undeclared` (nothing declared), `test-runner-declaration-invalid` (a present declaration with a bad field, the message naming the field) and `test-runner-unresolvable` (a well-formed `command` that resolves to no file) are distinct codes. Every field fault within one declaration shares the one code and is separated by the field its message names.

### The program is resolved to a real file before anything is launched
A bare name is resolved against `PATH` with `PATHEXT` honoured case-insensitively, an absolute path is carried unaltered, and a relative one is resolved under the project root — each checked to be an existing file, not merely an existing path. The resolution sits in FRONT of `runBounded`'s argument-vector door, so that door refuses exactly what it refused before and a command that resolves nowhere is a coded refusal rather than a spawn that fails later and further away.

### A shim is undeclarable, and the refusal says what to declare instead
A resolved `.cmd`, `.bat` or `.ps1` is refused by the resolver with a remedy naming an interpreter plus its script, rather than left to the seam to report as a failure to start.

### Every child process this milestone starts comes from the one bounded seam
`src/work-toolchain.mjs` imports `node:child_process` nowhere, names no `exec`/`execFile`/`execSync`/`spawnSync`/`fork`, passes no `shell:` option, and hands `runBounded` an argument vector plus the deadline the declaration states rather than the seam's own 60,000 ms default. The injected launch parameter is named `launch`, after no process API.

### Selection reaches the runner through one expansion rule
`{file}` expands in place, once per selected file; no other token is a placeholder — `{root}`, `{files}` and `{suite}` are carried through as literals. Zero selected files yields an empty selection, so a flag runner never emits a flag standing without its operand.

### A run that produced no verdict is never reported as a passing one
`exited` maps to the run's own verdict and its observed exit code; `deadline-expired` and `not-started` are each reported as themselves, with the bound applied or what was attempted, and each exits non-zero. The three are distinguishable from each other and from a run that exited non-zero.

### The prepare declaration is compiled by the same module and differs only in absence
`work.worktree.prepare` absent is a silent no-op — no refusal and no warning — while a present-but-malformed one is `worktree-prepare-declaration-invalid` raised where the declaration is compiled, not at the launch, and told apart from absence. A prepare command resolving nowhere is `worktree-prepare-unresolvable`.

### This repository declares its own test runner
`.aof/aof.config.json` carries `work.test` as `node scripts/test.mjs`, selecting with `["--only", "{file}"]`, rooted at `test`, bounded at 900,000 ms, reporting `tap` — an interpreter plus a script, never a shim. aof is now an installed project against its own boundary.

## Assumptions

- **`runBounded`'s door stays exactly as strict as it is** — the resolver is correct only because `argumentVectorProblem` (`src/work-audit/spawn.mjs:98-113`) still conjoins shell-shaped-and-nonexistent, so nothing that reaches the door has been relaxed to let this module through.
- **`work` accepts unknown properties in the schema** — `schemas/aof.schema.json` `$defs.work` sets `additionalProperties: true` and `src/config-editor.mjs:351` preserves the `work` block wholesale, so `work.test` needed no schema edit and survives a config rewrite.
- **`--only` is parsed by nobody until 72/02** — this repository's declared `selectArgs` names a flag `scripts/test.mjs` does not yet read; the declaration is data this story compiles, not an argv anything currently spends.
- **The census scope is the milestone's declared module set, not this story's one module** — FF-7201 walks `src/work-toolchain.mjs`, `src/work-test-select.mjs` and `src/commands/test.mjs`, restricted to those on disk with a floor of at least one, so 72/01 and 72/02 need not write into this story's control file.

## Gaps

### A fourth PATH resolver in `src/`
- **Status:** open
- **Discharge condition:** the four resolvers — `src/terminal-providers.mjs:33`, `src/tool-store.mjs:143`, `src/config-inspect.mjs:567` and this module's — are collapsed into one home, which requires writing across three files no single story owns.
Three module-private PATH resolvers already existed and none is importable; this module re-derives a fourth rather than extracting across three files outside its write set. The debt is ledgered, not absorbed silently.

### This repository declares no `work.worktree.prepare`
- **Status:** open
- **Discharge condition:** a prepare script exists under `scripts/` and `.aof/aof.config.json` declares `work.worktree.prepare` against it — owned by chore `m90`.
The compiler for the key ships and is driven over every fault shape, but this repository declares no prepare step, so absence takes the silent-no-op path here and 72/04's prepare step will not be exercised on this node until the chore lands. Recorded as `m72/F-72-AI`.
