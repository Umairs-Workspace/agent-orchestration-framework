---
doc: examples
---
# 190/04 · An existing project is told what its test declaration leaves out, and declares it — example map
<!--
Drafted at refine's discovery beat, 2026-11-10. Struck because the record answers them: whether
this belongs in 190 (the operator, 2026-11-10: "this needs to be delivered in this milestone");
the command's name and its two halves (the operator agreed the doctor check plus /aof:map-tests
approach on 2026-11-10); whether the skill may estimate time saved (ADR-008 §4, no).
-->

## R1 · The project doctor names what the test declaration leaves out, with its repair
- E1 · This repo at 4ff7fba6 (`roots: ["test"]`, no suffixes): `test-layout-suites` warns about 265 files, leading with `packages/work/test` (56) and `packages/core/test` (43), and names `/aof:map-tests` [proposed]
- E2 · This repo now (16 roots, `.test.mjs` and `.suite.mjs`): `test-layout-suites` is ok [proposed]
- E3 · A vitest project declaring `roots: ["src"]` with the default suffix, holding `src/cart.spec.ts`: one file is named, because `.spec.ts` is not a declared suffix [proposed]
- E4 · `test/fixtures/app/login.spec.ts` sits under a coupling's `paths`: it is not counted [proposed]
- E5 · `work.test.couplings` is absent: `test-layout-couplings` warns that every changed document widens the run [proposed]
- E6 · `work.test.couplings` is `[]`: ok [proposed]
- E7 · A gate declared with `args` and `jobsArgs` but no `reportArgs`: `test-layout-resume` warns that a stopped gate re-runs the whole tree [proposed]
- E8 · No `work.test.gate` at all: no resume check is reported [proposed]
- E9 · `work.test` is undeclared: the family reports nothing [proposed]

## R2 · A commit's selection can be replayed without running anything
- E10 · `aof test --scope impacted --commit 4ff7fba6 --plan --json` prints the selection and its reasons, launches no runner and writes no record [proposed]
- E11 · `--commit` and `--story` together: refused, naming the one-source rule [proposed]
- E12 · `--commit 4ff7fba6` without `--plan`: refused, because a run is always of the working tree [proposed]
- E13 · A merge commit: its changed set is the diff against its first parent [proposed]

## R3 · /aof:map-tests declares the layout and proves it by replay
- E14 · On a scratch clone of this repo with the pre-190 `work.test` block: the before replay of 30 commits shows them all widened. The skill declares the package roots, `.suite.mjs` and couplings, and the after replay shows fewer widened, with the median selected count [proposed]
- E15 · On a project whose gate is `vitest run --shard`: no resume templates are written, and the report says resume is unavailable and names the resume contract [proposed]
- E16 · The after replay's median is within 10% of the total: the report says the narrowed runs are near-total, and names the composition-root cause if one is visible [proposed]
- E17 · The skill's only write is to `work.test.*` in `.aof/aof.config.json` [proposed]
- E18 · `/aof:map-tests` with no flag writes the declaration, then shows the diff and both replays [stated Q2]
- E19 · `/aof:map-tests --dry-run` shows the before replay and the proposed `work.test.*` change, and leaves `.aof/aof.config.json` byte-identical [stated Q2]

## R4 · `aof work update` tells a project what its test declaration leaves out
- E20 · `aof work update` on this repo at 4ff7fba6's config: after the `Updated ACD:` line, one line per test-layout warning (suites, couplings, resume), each naming `/aof:map-tests` [stated Q1]
- E21 · `aof work update` on this repo now: no test-layout line [stated Q1]
- E22 · `aof work update --dry-run`: the same test-layout lines print, because the check reads the config and writes nothing [proposed]

## Questions
- Q1 · business · answered · After `aof work update`, should the test-layout warnings print at the end of the update itself, so a project finds out without running `aof project doctor`?
- Q2 · business · answered · Should `/aof:map-tests` write the config and then show you the diff and the replay, or show the proposed change and wait for your yes before writing?
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-008 · How many commits does the replay take? (30 non-merge commits that touch a file outside the work dir)
- Q4 · technical · defaulted ARCHITECTURE.md#ADR-008 · How does a deliberate test-shaped fixture outside the roots stop warning? (a coupling's `paths` covers it)
