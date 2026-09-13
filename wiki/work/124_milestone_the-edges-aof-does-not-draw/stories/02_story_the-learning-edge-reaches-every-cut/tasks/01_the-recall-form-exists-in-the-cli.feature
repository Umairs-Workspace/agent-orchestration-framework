@executable @cli @memory
Feature: every verb and flag a recall block spells is asserted against the shipped surface, read from code

  **`aof work memory` is not in the registry, and the check must say so rather than fail to find it.**
  `src/cli.mjs:601` names it in its own comment as one of "the deliberately-unrouted doors (work
  memory, session)"; `src/cli.mjs:241` dispatches it by string compare (`if (subcommand ===
  "memory")`); and `grep -rn "memory" src/command-core.mjs` returns **nothing at all**. So
  `listCommands()` carries no `work memory` entry, and FF-12405's "read from the registry" does not
  resolve for this verb. The machine-readable surface is the seam module's own exports:
  `MEMORY_VERBS` (`src/work/memory.mjs:28`) = recall, brief, ingest, reindex, status; `SCOPE_FLAGS`
  (`:44`) = area, stage, kind, owner, item, status; and `parseMemoryArgv` (`:140-205`), whose own
  branches are the sole home of `--json` (`:159`), `--block` (`:163`), `--all` (`:169`) and
  `--limit` (`:172`).

  **`--block` is real and `--help` does not mention it.** `memoryUsage()`
  (`src/work/memory.mjs:343-353`) prints eight lines naming the five verbs, `--area --stage --kind
  --owner --item NN --status`, `--limit N` and `--json` — measured by running
  `AOF_GLOBAL_HOME=$(mktemp -d) node src/cli.mjs work memory --help`, exit 0. The word `block`
  appears nowhere in it. A control that read `--help`, or the usage string, as the surface would red
  on the one flag both carriers actually spell.

  **An invented flag produces no runtime signal whatever — it corrupts the query instead.**
  `parseMemoryArgv:190-192` ignores an unknown flag, and the branch `continue`s **without consuming
  the next argv element**, so the flag's value falls through to `positionals` and is joined into the
  query at `:199`. Measured: `node src/cli.mjs work memory recall "seam" --scope architecture
  --block` exits **0** and returns architecture-heavy records — the invented flag silently rewrote
  what was asked. There is nothing downstream to catch it, which is why the assertion is static.

  **The decided form runs today.** `AOF_GLOBAL_HOME=$(mktemp -d) node src/cli.mjs work memory recall
  "seam objective scope" --block` exits 0 and prints **5** compact record lines — `HOOK_LIMIT = 5`
  (`src/work/memory.mjs:213`), one line per record, no header (`:231-233`). `node src/cli.mjs work
  memory status` prints `memory: backend=graphify records=2152`. The empty case is reachable through
  backend `none` (absent memory ≡ none, `05/ADR-002`), **not** through a no-match query: measured,
  `recall "zzqqxx nonexistent token" --block` still returned 5 records, because the ranking backend
  always answers.

  What would quietly undo this: reading the surface from `memoryUsage()` or `--help` (neither knows
  `--block`); reading it from `listCommands()` (there is no entry to find, so a lenient lookup
  answers "nothing to check" and passes forever); a per-line regex that misses the wrapped invocation
  at `refine.md:122-123`; asserting flags exist while never asserting the verb does; and a check that
  sweeps only `shatter.md`, leaving the other carriers' flags unasserted.

  ADR-007 §3. FF-12405.

  Scenario: the surface is read from code, never from prose
    Given the check that validates a recall block's form
    When its sources are examined
    Then the verb vocabulary comes from `MEMORY_VERBS` and the scope-flag vocabulary from `SCOPE_FLAGS` (`src/work/memory.mjs:28`, `:44`)
    And the non-scope flags come from `parseMemoryArgv`'s own branches (`:159`, `:163`, `:169`, `:172`)
    And no leg reads `memoryUsage()`, the `--help` output, or any `.md` as the surface

  Scenario: the unrouted door is asserted as unrouted, so an empty lookup can never read as a pass
    Given the command registry
    When it is searched for a `work memory` command
    Then no registered command's route is `work memory`
    And the check names `src/work/memory.mjs` as its surface for that reason
    And the surface it read is non-empty — 5 verbs and 6 scope flags

  Scenario Outline: each token a bundle recall spells resolves in the shipped surface
    Given the token <token>
    When it is looked up in <source>
    Then it is <verdict>

    Examples: the tokens the carriers spell, plus one that exists nowhere
      | token     | source                            | verdict |
      | recall    | MEMORY_VERBS (memory.mjs:28)      | present |
      | ingest    | MEMORY_VERBS (memory.mjs:28)      | present |
      | --block   | parseMemoryArgv (memory.mjs:163)  | present |
      | --json    | parseMemoryArgv (memory.mjs:159)  | present |
      | --limit   | parseMemoryArgv (memory.mjs:172)  | present |
      | --area    | SCOPE_FLAGS (memory.mjs:44)       | present |
      | --item    | SCOPE_FLAGS (memory.mjs:44)       | present |
      | --kind    | SCOPE_FLAGS (memory.mjs:44)       | present |
      | --scope   | neither list nor any branch       | absent  |

  Scenario: an invented flag reds here, and the run that proves nothing else catches it
    Given a recall block edited to spell `--scope architecture`
    When the check runs
    Then it fails and names the flag and the `file:line` that spells it
    And the same argv run against the CLI exits 0 and folds `architecture` into the query, surfacing no error

  Scenario: every memory invocation in the bundle is read, and read over joined lines
    Given every `aof work memory` invocation in `src/bundle/commands/*.md`
    When they are read as commands rather than as lines
    Then the reading finds 7 — `assimilate-code.md:75`, `continue.md:259`, `refine.md:122` and `:124`, `verify.md:162` and `:212`, and shatter's new one
    And the two that markdown wrapped mid-command are each read as one invocation
    And each one's verb and every flag it spells is checked, not only shatter's

  Scenario: the check is non-vacuous in both directions
    Given the check's own report
    When it is inspected after a green run
    Then at least one token was asserted present and at least one asserted absent
    And the count of invocations it examined is reported and is greater than one
