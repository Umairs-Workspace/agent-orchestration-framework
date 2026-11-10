---
aof-generated: true
description: Declare this project's test layout for `aof test` — replay recent commits' test selection, author `work.test` roots, suffixes, couplings and (only where the gate honours it) resume, then replay again and show what changed. `--dry-run` previews and writes nothing.
argument-hint: "[--dry-run]"
aof-invocation: /aof:map-tests
aof-runtime: claude
---

<objective>
Make `aof test --scope impacted` and the regression gate's resume work on THIS project's tree, and
prove it by replay. Every `work.test` key that narrows a run or resumes a gate keeps the old
behaviour when it is absent, so a project that was on aof before them still widens every run to the
whole suite, and `aof project doctor` names that as its `test-layout-*` warnings. This command
declares the missing keys from what the tree really holds, and shows the effect as the before and
after selection of the project's own recent commits.

**Its only write is `.aof/aof.config.json` `work.test.*`.** It edits no test, no runner config and
no source, and no other config key. **The report is the replay, never a promise**: it gives counts
the replay measured and no estimate of time saved.
</objective>

<config>
Parse "$ARGUMENTS" for one optional flag, **`--dry-run`**. With no flag the command writes the
declaration, then shows the diff and both replays. **`--dry-run` stops after the before replay and
the proposed `work.test.*` change**, and leaves `.aof/aof.config.json` byte-identical.

Read `.aof/aof.config.json` → `work.dir` (default `wiki/work`) and the current `work.test` block.
With no `work.test` declared there is no runner to replay: say so, name `work.test` as the key to
declare first, and stop. `aof test` refuses there too.
</config>

<process>
1. **The before replay — first, before the layout is read.** List the last 30 non-merge commits
   that touch a file outside the work dir:

   ```
   git log --no-merges -n 30 --format=%H -- . ":(exclude)<work.dir>"
   ```

   and for each `<sha>` run:

   ```
   aof test --scope impacted --commit <sha> --plan --json
   ```

   `--plan` selects and stops: it launches nothing, writes no record and is answered from none, so
   the replay costs seconds. Keep each result. From the 30, count:
   - **widened**: `scope` is `all`; keep every `widened[].reason` with its file;
   - **narrowed**: `scope` is `impacted`; keep `selected.length`;
   - **refused**: a `refusal` (for instance `changed-set-empty`); count it apart, never as either;
   - **the total**: `total`, the whole suite the declaration holds.

   The replay uses today's graph, so a file deleted since its commit widens as `not-in-graph`. That
   is honest, and it is reported as it is.
2. **Read the runner and the layout.** Read the declared `work.test.command` and `args` and the
   program they run, the gate (`work.test.gate`) and the program it runs, and the tracked test files
   (`git ls-files`). Run `aof project doctor --json` and read its `test-layout-*` checks: they name
   the test files the declaration cannot select, by directory, and the keys that are absent.
3. **Roots and suffixes.** Author `work.test.roots` as every directory that holds the runner's
   suites (the doctor's `test-layout-suites` directories are the candidates), and
   `work.test.suiteSuffixes` as the suffixes those suites end in, each starting with `.`. Declare a
   directory or a suffix only when the runner actually runs those files: a test-shaped file the
   runner never runs is not a suite, and declaring it makes nothing selectable.
4. **Couplings, judged, each with its reason.** A coupling `{ paths, suites, why }` is how a
   changed document (not code) selects the suites that read it. Author each one from a **search of
   the suites for the coupled paths**: grep the suite files for each candidate document path, both
   as a literal string and as `path.join` segments, and read the suites that a hit names. Couple a
   path to exactly the suites shown to read it, and write the `why` from what the search found. When
   a suite walks a directory or reads a manifest it does not name, couple the directory to it, or
   declare nothing for those paths, so they keep widening: a coupling built on a guess narrows on a
   guess. **Write `couplings: []` when no suite reads a document**, because that is the considered
   answer. Leaving the key absent means nobody asked the question.
5. **Gate resume, only for a program that honours the resume contract.** The resume contract is:
   the gate program takes **a newline-separated file list at `{files}`** and plans only those files,
   and writes **a JSON report at `{report}`** of the shape
   `{ "units": { "<unit>": ["<file>", …] }, "lanes": …, "notFinished": […], "notStarted": […] }`.
   Write `work.test.gate.reportArgs` (carrying `{report}`) and `filesArgs` (carrying `{files}`)
   **only when the gate program is shown to honour that contract**: its source reads the flag and
   writes that report. Otherwise **say that resume is unavailable for this runner**, name the
   resume contract as what would change the answer, and **leave the gate unchanged**. A template the
   program ignores would make `aof work regression-gate --resume` run the whole tree under a resume's
   name. With no gate declared there is nothing to resume, so declare none.
6. **The proposed change.** Assemble the new `work.test` block from steps 3–5 and print it as a diff
   against the current block. **Under `--dry-run`, stop here**: print the before replay and the
   proposed change, and write nothing. The config is left byte-identical.
7. **Write `work.test.*` and nothing else.** Edit `.aof/aof.config.json`, replacing only the keys
   steps 3–5 authored inside `work.test`. Every other key, in `work.test` and outside it, stays as
   it is. Then run `aof project validate`; a refusal means the edit is wrong, so fix it before going
   on.
8. **The after replay.** Run the same 30 commits through the same
   `aof test --scope impacted --commit <sha> --plan --json` and count them the same way.
9. **The project doctor, last.** Run `aof project doctor` and keep its `test-layout-*` checks.
</process>

<output>
Report, in this order:

- **the `work.test.*` diff** this run wrote (under `--dry-run`, the proposed one, saying nothing was
  written and the config is byte-identical);
- **the before and after replays**, side by side: of the 30 commits, how many widened, the
  **median and 75th-percentile selected count** among those that narrowed, and the total. Under
  `--dry-run`, the before replay only;
- **every reason that still widens** after, each with the files that caused it;
- **near-total narrowing, said in one line**: when the narrowed median is within 10% of the total,
  say the narrowed runs are near-total, and name the composition root a near-total selection keeps
  reaching (the module that nearly every suite imports) when the replay shows one;
- **resume**: the templates written, or that resume is unavailable for this runner, with the resume
  contract named;
- **the doctor's `test-layout-*` checks**, as it printed them.

Give no estimate of time saved: the replay counts suites, and a suite count is not a duration.
Next: `aof test --scope impacted` on the next change, or re-run `/aof:map-tests` after the test
layout moves.
</output>
