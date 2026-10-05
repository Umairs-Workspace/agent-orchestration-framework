# 149 · Manual mode: continue guides the operator who builds the work themselves — build plan

## Mechanism

Three seams, one per kind of change.

**The prompt.** `continue.md` gains `--manual` in its argument hint and execution-mode paragraph,
a `<manual_mode>` region inside `<process>`, placed before the dispatch on type, and one outcome
in `<output>`. The region is a short walk. It refuses a milestone or span, naming the ready set.
It does the story lane's step 1 read and halt, then the step 2 mint. It runs
`aof test --scope impacted --story <ref>` once, prints the guide, closes the run and hands back.
It points at steps 1 and 2 and never copies them.

**The door.** `createPhaseDoorCommand(phase)` declares `manual` only when `phase === "continue"`.
In `run()`, after the `beforeBuild` loop, a manual continue whose exact row is not a story or task
throws `continue-manual-not-a-story`. After `resolveContinueDecision`, a `remote` decision throws
`continue-manual-remote`. Throwing before `assignWork` is what keeps it from minting. `local`
appends ` --manual` to `command`. `running` is untouched.

**The review command.** `review.md` is a new bundle member (`kind: command`, claude and opencode,
`commandNamespace: aof`, as `repair` is). It mints, runs the story's tests, and then walks
continue's `<gate_ladder>` and step 5 with `<review_rounds>`, read from the rendered continue
command beside it. Its own text holds only the differences: no build, no developer, no lens
fixes, findings to the operator, one round per run, and the blast-radius ranking.

**Defaults taken (EXAMPLES.md):**
- **Q6:** the prompt composes the guide from `aof work tasks <ref> --json`, the frontmatter and
  `PLAN.md`. No new verb. The "why it matters" lines are judgement, which a verb cannot write.
- **Q7:** manual is a per-run flag only. `work.agents.mode` keeps its two values, and
  `LOOP_AGENT_MODES` is unchanged, so an unknown loop value resolves to `solo`.
- **Q8:** red is what `aof test --scope impacted --story <ref>` reports, the build terminator's
  own command.
- **Q11:** continue stays the one home of the ladder and the lanes. FF-7105 already holds that
  home to the shell, and copying it into a second prompt would need a second parity control.
- **Q12:** no `aof work review` door. Review is local and the board has no review act yet.
- **Q13:** the blast-radius ranking moves into `review.md` only. Putting it in continue's step 5
  would add a graph build (over 120 s here) to every agent review.

**Removal.** Delete `code-review.md` and its descriptor member. Strip `--ship` and the config key
from `autonomous.md`, and drop the key from `.aof/aof.config.json`. Point assimilate-code's next
step at `aof:verify`. Then run `node scripts/generate-bundle-manifest.mjs` and `aof work update`
at the root. Update deletes the three code-review renders and writes the review ones and the lock.

## Verification step

Run `node scripts/test.mjs --only` over every test file in `files:`, plus
`test/command/application-assembly.test.mjs` and `test/bundle/core-workspace.test.mjs`, with
`AOF_GLOBAL_HOME` isolated. Then, at the root, `aof work update --dry-run --json` must report
`skip` for every continue, review, autonomous and assimilate-code render. A
`git grep -n "code-review\|codeReview" -- packages/core/assets docs README.md .aof` must print
nothing. Task 04 (`@manual`) is the real proof.

## Out of scope

- A Manual button on the board, and an `aof work review` door (Q12).
- `--manual` on a milestone or span (Q4), and on refine or verify.
- The generic `aof assets add skill code-review` examples in `cli.mjs`, `prompt.mjs` and the
  integration features. They name a user's own asset, not this command.

## Known traps

- The 129/07 control matches `--solo \| --orchestrated` in the argument hint. Keep the two
  adjacent and append `| --manual` after them.
- The autonomous prompt's control asserts its exact config-key set and its command families. Both
  shrink here: `aof:code-review` leaves the family list.
- `story-context-contract` asserts "Three rounds is the hard cap" on code-review. That assertion
  goes. `review.md` must state no bound number (task 02), or acd-prompt-bounds wants a home row.
- Build after 147 lands: both write the manifest, the lock and `docs/acd.md`.
