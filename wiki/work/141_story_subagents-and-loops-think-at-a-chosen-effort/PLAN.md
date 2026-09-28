# 141 · build brief

This brief is advisory and belongs to the builder. The task features are the contract, and the
frontmatter holds the read and write sets.

## The mechanism

Claude Code has one effort knob per session, and a subagent with no `effort:` line inherits it
(checked against the docs 2026-09-28). So the design sets the SESSION and leaves subagents to
inherit, pinning only the roles the operator names:

1. **The vocabulary and the session default live in `session-model.mjs`.** Add `EFFORT_LEVELS`,
   `DEFAULT_EFFORT = "high"` and `normalizeEffort()` (`extra-high` → `xhigh`, unknown → refusal).
   `resolveSessionLaunch(config, phase, { thinking })` answers `effort` + `effortSource`, trying
   the flag, then config, then the default. `model` keeps its absence-is-silence rule. The
   resolver still reads only `work.agents.session`.
2. **The flag travels as argv.** `work:drive-<phase>` takes `thinking` (its input, `cli.spec.flags`
   and `cli.argv`), refuses an unknown level before the mint, and adds `effort` to the dry-run
   answer. It also reads `ctx.loopDrive.thinking` on the in-process path. `spawnLaneDrive` takes
   `thinking` and adds `--thinking <level>`. `drivePhaseInChild`, the wave's `drive` and the
   in-process `loopDrive` all hand it `resolved.thinking`.
3. **The loop resolves `thinking` the way it resolves `supervised`**, in `resolveInvocation` and
   `resolveLoopResume`. It becomes `buildLoopDeclaration`'s tenth key, and
   `recoverableDeclaration` projects it. Keep `usableDeclaration` at five keys.
4. **The role map** is `AGENT_EFFORT_MAP_PATH` / `agentEffortMap()` beside the model map in
   `bundle.mjs`. It merges `resource.effort` in `renderBundleOutputsWithConfig`, and the claude
   branch of the adapter's agent frontmatter emits `effort:` after `model:`. Validate it in
   `config-inspect.mjs` by mirroring the model-map block, codes included.
5. **Operator sessions.** `claudeSettingsPatch` carries `defaults: { effortLevel: "high" }` beside
   `settings`. `mergeClaudeSettings` applies a default only when the document lacks the key, and
   counts it as something to splice. `settings.claude.effortLevel` still wins as a plain setting.
6. **Prompts.** Each of the three phase commands gets a `--thinking` stop in its `<config>` block.
   Put it before the run mint (refine's mint is its first act).

## Watch for

- The agent-session driver's env scrub already drops `CLAUDE_EFFORT`. Add
  `CLAUDE_CODE_EFFORT_LEVEL`, the documented variable, which ranks with `--effort` as an explicit
  choice.
- Every driven session now gets `--effort high` when none was configured. Any test pinning an
  argv without `--effort` changes. Those tests are code, so update them.
- The dry-run answer gains a key. Check `acd-loop-probe-contract` / FF-5304: they pin the LOOP's
  probe, not the drive's, but confirm that.
- `.aof/aof.config.json` needs nothing. The lane reconcile resets `.aof/`, so commit the lock by
  hand.

## Verification

Run focused suites only, isolated with `AOF_GLOBAL_HOME=$(mktemp -d)`, through
`node scripts/test.mjs --only <files>` over the declared test set. Never use `--scope impacted`
or the full suite here.

End to end: install the payload, run `aof work update`, then
`aof work drive continue 141 --thinking extra-high --dry-run --json` should show
`effort.level: xhigh`, and the same command without the flag should show `high` / `default`.

## Out of scope

This story does not cover mesh-worker spawns, which build their own launch. It does
not cover effort for Codex or opencode agents. It adds no config knob for the default beyond the
existing `work.agents.session.effort` and `settings.claude.effortLevel`.
