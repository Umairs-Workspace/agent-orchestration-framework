# 203/00 · The harness — build plan

Advisory and the builder's own. The task features are the contract.

## Mechanism

Four small modules in the golden support folder, each with one job, and one script in front of
them.

1. **Run** (`harness.mjs`). It takes a lane and a scenario. It makes one temp root, writes the
   starting files, and runs each step through `spawnCliSync` with `cwd` set to the project and
   `AOF_GLOBAL_HOME` set to the home. Then it walks both trees into a `Map<path, Buffer>` and
   returns the trees plus the step records. Clean-up goes in a `finally`. The guard and the
   clean-up copy `bundleFixtureRoot` in `cli-spawn.mjs`, but a scenario's root is removed when the
   scenario ends, not at process exit.
2. **Normalise** (`normalise.mjs`). An exported, frozen array of `{ id, apply(text, ctx) }`. `ctx`
   carries the two temp paths, their realpaths, the version (`packageVersion()`) and the build id
   (`readBuildInfo()`). Decode with `new TextDecoder("utf-8", { fatal: true })`, so bad bytes
   throw and can be named.
3. **Store** (`baseline-store.mjs`). It reads a scenario's directory and walks the base chain
   (ADR-003 §2), detecting a cycle with a visited list it can print. It returns the expected tree
   and the expected step records. `compare(expected, actual)` returns
   `{ added, removed, changed, stepsChanged }`. The report renderer is here too, and it calls
   `line-diff.mjs`.
4. **Write** (`baseline-writer.mjs`). Given a scenario's normalised actual tree and its base's
   materialised tree, it computes the minimal delta and syncs the directory to it: it writes
   changed files and deletes stale ones, compares before writing so an unchanged file keeps its
   mtime, and reports what it touched.

`lanes.mjs` exports a frozen array of lane modules, empty in this story. `scripts/golden.mjs`
parses `--lane`, `--scenario` and `--update`, orders scenarios base-first (a topological sort over
`base`), and calls run, then compare or write. The suite calls run and compare only.

The fixture lane belongs to the self-test alone. `golden-harness.test.mjs` declares it in-test,
with `fixture-verb.mjs` as its command and a temp baseline root. That is why the run, the store
and the writer each take the baseline root as a parameter, defaulting to
the committed baselines directory. The script takes the same as `--root <dir>`, plus `--lane-module <path>`
for a lane outside the registry. Both exist for the self-test. The write tests run
`scripts/golden.mjs` as a child process with those two flags and never import the writer, so
FF-20302 stays true.

## Verification step

Run `node scripts/golden.mjs --lane fixture --update` against a temp root through the self-test.
Then edit one line of the fixture verb's output and run the suite's comparison. The report must
show `1 changed`, one hunk with the line and 3 lines of context, and the update command, and the
temp baseline root must be byte-identical before and after. If the root changed, or the diff
shows more than the one line, the store or the normaliser is wrong.

Then probe each fitness function red: add a seventh rule, import the writer from a test, and
`git check-attr` a path with the pin removed. Record each message in `VERIFICATION.md`.

## Out of scope

- Any aof verb, scenario or committed baseline. Stories 01 and 02.
- Retiring `manifest.json` or `acd-bundle-manifest-hashes`. The SPEC defers it.
- A coupling in `work.test` so `--scope impacted` selects the golden suite on an asset change.
  No coupling key exists yet. Select by file.

## Known traps

- macOS `os.tmpdir()` is `/var/…`, but a child's `process.cwd()` reports `/private/var/…`.
  `temp-paths` needs both forms, or every envelope path leaks the temp root.
- Windows paths appear JSON-escaped (`C:\\Users\\…`) inside envelopes. Match the escaped form, not
  only the raw one.
- A blanket backslash rewrite breaks the bundle's regex prose (E10). Separators change only inside
  matched temp paths, and in tree keys.
- The two new golden directories and the three new testing controls each move a row in
  `acd-source-directory-budget`, which has no allowance (57 F-57-M-2). Move the rows in this story.
- The update script must spawn nothing itself. A child process or computed import in a script
  owes an entry in the workspace runtime audit.
