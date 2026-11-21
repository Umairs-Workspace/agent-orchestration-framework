# 203/01 · Every init scenario renders to its committed baseline — build plan

Advisory and the builder's own. The task features are the contract.

## Mechanism

This story is data plus baselines over story 00's API. Almost no logic is new.

The `work-init` lane module exports the lane: `{ id: "work-init", scenarios: [...] }`. Each
scenario has `{ id, base, files, steps }`. `files` maps a project path to its text, and that is
how a profile's `.aof/aof.config.json` and the customised project's user files arrive. `steps` is
one argv each, `["work", "init", "--runtime", "<list>", "--json"]`, with its expected exit code.
Keep the scenario table in ADR-005's order, so the file reads like the ADR.

The lane registry gains the lane. The `work-init` suite produces one
case per scenario (`compare`, assert it passes, and use the report as the message), and the cases
the features name over the stored deltas: the `removed.golden` prefixes, the `notion` delta, the
empty home. The twice-run case calls the harness's run twice. It then applies only the exported rules whose
ids are `eol`, `temp-paths` and `instants`, by filtering story 00's rule list and calling each
rule's own `apply`. That writes no rewrite of its own, so FF-20301 holds, and it is not a second
normaliser.

Then write the baselines once: `node scripts/golden.mjs --lane work-init --update`. Read the
`notion` delta before committing. It must hold only its config (E6). A larger delta is a finding
about the render, not a baseline to accept.

## Verification step

From a clean state: `node scripts/golden.mjs --lane work-init` passes, a second `--update` writes
nothing, and `git status` is clean. Then run E16 in a scratch worktree (task 04): edit one sentence
of `packages/core/assets/commands/refine.md`, check the failure lists only refine's renders, each
with one hunk, then accept, read `git diff --stat` over the baselines, and revert. Save the
failure text and the diffstat under `evidence/`.

A failure of the twice-run check means an unstable render. Find the writer whose order follows
`readdir`, an object's insertion order or a `Set`, and sort it there. Do not add a rule.

## Out of scope

- `work update` in any form, idempotence included. Story 02.
- Changing what `init` does to a user's file at an aof path. The baseline holds it, and the
  operator decides separately (STATE).
- The Windows run. Story 02 runs the whole suite there once both lanes exist.

## Known traps

- `default` is about 1.9 MB of `.golden` files. Commit it in its own commit, so the lane's code
  diff stays readable.
- A scenario's config file must be written before the step. A plain `init` writes no config, so
  the profile is the config the project already holds (ARCHITECTURE "Measured facts").
- `.codex/hooks.json` in the customised start must be a valid matcher group
  (`{"hooks":{"Stop":[{"hooks":[{"type":"command","command":"echo mine"}]}]}}`). A flat shape makes
  `init` refuse with `codex-hooks-unparseable`, which was measured.
- Two new golden suite files move the golden directory's row in `acd-source-directory-budget`.
