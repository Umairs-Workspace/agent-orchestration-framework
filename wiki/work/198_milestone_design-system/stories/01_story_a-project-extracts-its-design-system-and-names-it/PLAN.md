# 198/01 · Build brief

Advisory, for the builder. The task features are the contract. The frontmatter of `STORY.md` is
the read and write set, and `EXAMPLES.md` holds the defaults (Q1–Q14) the features assume.

## The mechanism

Four seams. Build them in this order, because extraction's prose needs all three verbs.

1. **The package and its practice.** Copy `@aof/specification-by-example`'s shape: a data-leaf
   `contribution.mjs`, and an `assets/bundle.json` holding the practice `design-system` (key
   `work.ui.designSystem.enabled`, no fragments) and one command member, `design-system`. Give
   that member `"runtimes": ["claude"]`, `"mapped": false` and `"commandNamespace": "aof"`, as
   `@aof/learning`'s `teach` has. Without `mapped: false`, Codex would get a mapped copy. Register
   it last in `PRACTICES`.
2. **The verbs reach the CLI through the practices registry.** `integrationContributions` in
   `command-core.mjs` reads only `INTEGRATIONS` today. Generalise it, or add a sibling that reads
   `PRACTICES`, so that any contribution carrying `commands(services)` is assembled the same way.
   Only `@aof/design-system` carries it. Follow `@aof/integration-hyperagent`'s `commands.mjs`:
   - descriptors are loaded eagerly, and implementations are imported lazily when a verb runs;
   - ids are `design-system:tokens|check|use`, under the route `["design-system", <verb>]`;
   - errors are mapped through the injected `commandError`.

   Add `"design-system": "Design system"` to `HELP_FAMILY_TITLES` and `HELP_FAMILY_ORDER` in
   `cli.mjs`. The application count in `application-assembly.test.mjs` goes from 144 to 147, and
   `command-inventory.json` is regenerated, not hand-edited.
3. **`tokens` and `check` are pure functions over text.** `tokens.mjs` takes the CSS text and
   returns `{ color, type, spacing, radius, shadow, unplaced }` in the type's shape (R3). It is a
   small declaration scanner: track the selector context (`@theme`, `:root`, theme selectors,
   other) and take every `--x: v;` declaration. It needs no CSS library. `mockValues` scans
   `.dc.html`/`.html` text for colour literals and custom-property values, and normalises both
   sides to RGBA for comparison. `check.mjs` runs `tokens` over the sources and diffs the result
   by name and theme (Q8). The verb layer does the file reads, so both modules stay testable with
   no disk. FF-19804 holds the whole `src/` off the network.
4. **`use` and the validator share one shape check.** `config.mjs` exports the block's
   diagnostics (Q9), as a pure leaf in the manner of `@aof/contracts/operator-profile`. Two
   callers use it:
   - `config-inspect.mjs`'s `validateWork` calls it next to `operatorProfileDiagnostics`;
   - `use` builds the new block, refuses anything the diagnostics flag, and then writes.

   The write is read → set `work.ui.designSystem` → `writeJson`, through foundation's `formatJson`
   with the previous text, so indentation and key order survive. It never re-serialises the file
   from a re-parse that drops anything. An unchanged block writes nothing.

The command, `assets/commands/design-system.md`, is ADR-004 §1–§5 and nothing more: inputs →
`tokens --mocks` → component inventory → operator review → resolve the title (stop on a
collision) → create from the type, built by its `from-code.md` read at run time → `check
--source`, clean → operator approval → `use --name … --mode owned --source …`.

Keep `@theme` and every `--x:` grammar out of it (FF-19804's prose leg).

## Watch for

- 198/00 also edits `test/arch/practices/index.mjs`, and `aof work next` already serialises 01
  behind it. Rebase on 00 before adding FF-19804's import.
- 00's practice list adds `runtimes` only for a practice whose every fragment is scoped. With
  zero fragments that test is vacuously true. Check that `design-system`'s entry holds no
  `runtimes` (task 00), and raise it as a finding against 00 if it does.
- Run the supply-chain audit after the `yarn.lock` change.

## Verification

From a clean worktree with `AOF_GLOBAL_HOME=$(mktemp -d)`, run by file:
- the package's suites;
- the config-inspect and application-assembly command suites;
- the arch/practices index.

Then, in this checkout, run `aof design-system tokens apps/ui/src/index.css --json`. It must
print 20 colours and one radius, with nothing unplaced. After that, `aof work update --dry-run`
should plan only `.claude/commands/aof/design-system.md` and the manifest. Task 05 is the
operator's real run.

## Out of scope

Fragments (02, 03), `mocks import`/`capture` (02), and wiring `check` into verify (03).
