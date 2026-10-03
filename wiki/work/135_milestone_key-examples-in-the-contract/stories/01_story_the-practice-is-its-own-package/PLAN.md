# 135/01 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios. The read and write sets
are in `STORY.md`'s frontmatter and are not repeated here.

## The mechanism

**Found the package the way `@aof/work-graph` is founded:** a `package.json` with explicit `exports`
(`./map`, `./answers`, `./doctor-lane`, `./build-door`, `./story-probe`), `files: ["src"]`, the
`test-workspace.mjs` script and dependencies on `@aof/work` and `@aof/contracts` only. List it in
core's and the root's dependencies, run `yarn install` so the lock gains the workspace entry, then
run the supply-chain audit. Register `test/index.mjs` in `scripts/test.mjs` beside the other owned
package indexes.

**Move first, and only then invert.** Use `git mv` for `map.mjs`, `answers.mjs` and the lane, so the
history follows them. Repoint every importer: core bindings, the run store's `getAnswerTokens`
loader, the test support file and the root `test/examples` suites. Get everything green at this
point, before touching a seam.

**The three seams**, each a parameter that `@aof/work` accepts and names generically:

- `createWorkDoctor({ …, storyProbe })`. In `buildSnapshot`'s story branch, where the `EXAMPLES.md`
  probe sits today, call `storyProbe(item, { projectsDir, enabled })` when it is given. Merge its
  `docSizes` into the row's `docSizes` and its `extensions` into `row.extensions`. The package's
  `story-probe.mjs` holds today's body. The lane reads `item.extensions?.examples` where it used to
  read `item.examplesMap`. Keep `examplesEnabled` flowing as data, as it does today.
- The budget lane's `BUDGET_KEY` and `DEFAULT_BUDGETS` accept injected rows. `budgetKeyFor` is
  exported today, and 134's suites import it, so keep its signature.
- `createPhaseDoorCommands({ …, beforeBuild = [] })`. The continue door awaits each entry where
  `refuseOpenExamples` is called today, in the same position: after the backlog refusal and before
  the overlay read. The package's `build-door.mjs` exports the factory that core wires in with
  `examplesEnabledFromConfig`, `examplesFindings` and `collectAnswers`.

Once the seams exist, `@aof/work` has no import of the map and no `EXAMPLES.md` literal. FF-13501
proves that, and FF-13402's sweep keeps proving the grammar has one home. Its `THE_ONE_HOME` moves
to the package.

**Budget rows.** `packages/work/src` loses a child directory. The package's `src` and `test` are
new rows, or exemptions under the flat-layer threshold, following 134/ADR-002's founding rows.
State each in its `why`.

## The verification step

With `AOF_GLOBAL_HOME` and `CLAUDE_CONFIG_DIR` set to fresh temp directories, run through the test
runner's `--only`: the package's own index, every `test/examples` suite, every `test/arch/examples`
control, `packages/work/test/doctor.test.mjs`, `domain-services.test.mjs`, the work-doctor suite,
the source-directory budget and the workspace boundary check (`node scripts/check.mjs` if it runs
the boundaries). Then `aof work doctor 144` from the repository root on a freshly installed payload
must give the same example findings as before the move. Never run the full suite.

## Out of scope

Moving the bundle prose, the config resolver or `Rule:`: each stays where it is (ADR-001 §4).
