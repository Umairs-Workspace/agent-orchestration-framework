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
1. **The before replay — first, before the layout is read.** **Make the graph current first**, or
   the replay measures a stale graph rather than the declaration: every file added since the last
   build widens as `not-in-graph`. When HEAD's commit time (`git log -1 --format=%cI`) is later
   than the graph's `builtAt` (any `--plan --json` answer carries it), **say the graph is stale and
   stop**, naming `aof graph build . --offline` as the step to run first: it sends nothing to a
   hosted model and neither fetches nor publishes a shared graph. This command does not rebuild it,
   because its only write is the declaration. Then list the last 30 non-merge commits that touch a
   file outside the work dir:

   ```
   git log --no-merges -n 30 --format=%H -- . ":(exclude)<work.dir>"
   ```

   and for each `<sha>` run:

   ```
   aof test --scope impacted --commit <sha> --plan --json
   ```

   `--plan` selects and stops: it launches nothing, writes no record and is answered from none, so
   the replay costs seconds. Keep each result. From the 30, count:
   - **widened**: `scope` is `all`; keep every `widened[].reason` with its file, and count apart
     the widened files under `<work.dir>`;
   - **narrowed**: `scope` is `impacted`; keep `selected.length`;
   - **refused**: a `refusal` (for instance `changed-set-empty`); count it apart, never as either;
   - **the total**: `total`, the whole suite the declaration holds.

   The replay uses today's graph, so a file deleted since its commit widens as `not-in-graph`. That
   is honest, and it is reported in two parts: files that no longer exist at HEAD (deleted since),
   and files that do, which the graph never holds (a document, an asset), so only a coupling places
   them.
2. **Read the runner and the layout.** Read the declared `work.test.command` and `args` and the
   program they run, the gate (`work.test.gate`) and the program it runs, and the tracked test files
   (`git ls-files`). Run `aof project doctor --json` and read its `test-layout-*` checks: they name
   the test files the declaration cannot select, by directory, and the keys that are absent.
   **Check the selection's fidelity too**: read how the program treats a selected path. A runner
   that rewrites it (reduces it to a file name, or hands it to a filter that matches substrings)
   runs more suites than were selected. That is a finding for the project, reported in the output;
   this command does not fix it.
3. **Roots and suffixes.** Author `work.test.roots` as every directory that holds the runner's
   suites (the doctor's `test-layout-suites` directories are the candidates), and
   `work.test.suiteSuffixes` as the suffixes those suites end in, each starting with `.` or `_` (as `.test.mjs` or Go's `_test.go`). Declare a
   directory or a suffix only when the runner actually runs those files: a test-shaped file the
   runner never runs is not a suite, and declaring it makes nothing selectable. **Exclude it
   instead**: author `work.test.exclude` as `[{ paths, why }]`, where `paths` holds globs for the
   test-shaped files the runner does not run and `why` says what runs them, if anything. An excluded
   file is never selected, and the doctor stops counting it.
4. **Couplings, judged, each with its reason.** A coupling `{ paths, suites, via?, why }` is how
   a changed file that no import edge reaches selects the suites that read it (190/ADR-009). Author
   each one from a **search of the suites for the coupled paths**: grep the suite files for each
   candidate path, both as a literal string and as `path.join` segments, and read the suites that a
   hit names. Couple a path to exactly the suites shown to read it, and write the `why` from what
   the search found. The candidates are:
   - **documents and data the suites read**: fixtures, manifests, schemas, migrations;
   - **the work dir and the doc trees, always**: `<work.dir>`, root `*.md` and any other doc or
     asset tree. Every `aof:continue` edits them, so when no suite reads them, couple them to
     `suites: []`; left undeclared, each STATE or SPEC edit widens the run to the whole suite;
   - **code a suite reads from disk instead of importing**: a fitness test that walks a source
     tree, a guard that reads route pages, a suite that spawns a script. Couple those paths to the
     reading suites; for code the coupling adds to what the graph selects, and places a file no
     import reaches. **Never write `suites: []` for code**: an empty coupling never places code, so
     it changes nothing;
   - **a helper between the suites and the path**: when a hit is a module that is not a suite (a
     shared test-support file the suites import), name it in `via` instead of listing its
     importers. The selector expands it to every suite that reaches it, at selection time, so the
     list cannot go stale.

   Overlapping couplings combine: a file takes the readers of every coupling that matches it, and
   an empty one counts only where no matching coupling names a reader. **Escape glob syntax in
   folder names**: a route group such as `(crm)` beside `*` or `**` is read as a pattern group and
   matches `crm`, never the folder. Write `\(crm\)` (`\\(crm\\)` inside the JSON string) or
   `[(]crm[)]`, and the same for `[ ]` and `{ }`. The doctor's `test-layout-couplings-match` names
   any glob that matches no tracked file, so read it after the write.

   When a suite walks a directory or reads a manifest it does not name, couple the directory to
   it, or declare nothing for those paths, so they keep widening: a coupling built on a guess
   narrows on a guess. **Write `couplings: []` when no suite reads a document**, because that is the
   considered answer. Leaving the key absent means nobody asked the question.
5. **Gate resume, only for a program that honours the resume contract.** The resume contract is:
   the gate program takes **a newline-separated file list at `{files}`** and plans only those files,
   and writes **a JSON report at `{report}`** of the shape
   `{ "units": { "<unit>": ["<file>", …] }, "lanes": …, "notFinished": […], "notStarted": […] }`.
   Write `work.test.gate.reportArgs` (carrying `{report}`) and `filesArgs` (carrying `{files}`)
   **only when the gate program is shown to honour that contract**: its source reads the flag and
   writes that report. When the gate program also takes a flag that skips its lanes (the
   integration or cargo lanes a resume must not repeat once they finished), declare that flag as
   `work.test.gate.noLanesArgs` too. Otherwise **say that resume is unavailable for this
   runner**, name the resume contract as what would change the answer, and **leave the gate
   unchanged**. A template the program ignores would make `aof work regression-gate --resume` run
   the whole tree under a resume's name. With no gate declared there is nothing to resume, so
   declare none.
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
- **every reason that still widens** after, each with the files that caused it, with the widened
  files under `<work.dir>` counted apart and `not-in-graph` split into deleted-since and
  never-in-the-graph;
- **the graph**: its `builtAt`, which step 1 found current;
- **runner fidelity**: the finding from step 2, or that the program passes each selected path
  through unchanged;
- **near-total narrowing, said in one line**: when the narrowed median is within 10% of the total,
  say the narrowed runs are near-total, and name the composition root a near-total selection keeps
  reaching (the module that nearly every suite imports) when the replay shows one;
- **resume**: the templates written (`reportArgs`, `filesArgs` and, when the gate takes one, `noLanesArgs`), or that resume is unavailable for this runner, with the resume
  contract named;
- **the doctor's `test-layout-*` checks**, as it printed them.

Give no estimate of time saved: the replay counts suites, and a suite count is not a duration.
Next: `aof test --scope impacted` on the next change, or re-run `/aof:map-tests` after the test
layout moves.
</output>
