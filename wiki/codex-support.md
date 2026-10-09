# Claude Code and Codex in AOF

AOF keeps one workflow and selects native assistant assets and execution at separate
boundaries. Deterministic tests exercise both paths. Live provider lifecycle, recovery,
worker reconnect and prompt-performance acceptance are still pending; a fixture pass
does not establish those claims.

## Three separate choices

- Installed assets: `aof work init --runtime claude,codex` installs both native bundles.
  Claude uses `.claude/commands/aof/` and `.claude/agents/`; Codex uses
  `.agents/skills/aof-*/` and `.codex/agents/*.toml`. Both share contracts under `.aof`.
- Phase execution: the selected model identifies the assistant. AOF validates native
  capabilities before launch. Installed assets and agent mode do not select a model.
- Role execution: `work.agents.mode: "solo"` runs inline. Orchestrated work requires
  the native role launcher and requested model/effort capabilities. Optional Claude
  cross-assistant delegation remains separately opt-in.

Runtime variants are selected automatically. There is no independent template picker.
Project overrides retain their final precedence over the selected bundled variant.

## Use different assistants in one loop

Install both bundles with `aof work init --runtime claude,codex`, then start one loop:

```powershell
aof work loop 07 --level L2 --model refine=gpt-6-astra:high --model continue=sonnet:high --model verify=sonnet:high
```

This selects Codex/Astra for refinement and Claude/Sonnet for implementation and
verification. Replace `07` with the project work item. Codex must advertise the
requested native model and effort. `--dry-run --json` inspects the invocation without
starting model work. Solo operation uses `work.agents.mode: "solo"`.

For standing choices, set `work.agents.session.models` and `.effort`, keyed by
`refine`, `continue`, and `verify`. The configuration editor accepts these same
model/effort choices and shows the saved inferred assistants.

A phase-specific `--model` overrides an unqualified `--model`, then configured phase
choices. Neither `work loop` nor `work drive` accepts a runtime flag. Known Claude
aliases/model IDs select Claude; OpenAI model IDs select Codex, and other native
IDs are resolved through the advertised catalogue. Unknown or ambiguous IDs and
unsupported model/effort pairs refuse before launch; there is no provider fallback.
Review and repair use the implementation (`continue`) model and settings.

Existing `work.loop.runtime` and `work.loop.runtimes` settings remain defaults for
phases with no neutral model choice, including older runtime-scoped configuration.
They cannot override an explicitly selected phase model. Asset-install commands
still use `--runtime` to choose which bundles to install.

The loop records the complete phase plan; each session records only its own native
execution envelope. `aof work loop 07 --resume` retains that plan even after config
edits. Conflicting resume flags are refused. Worker handoff carries the complete
plan and prepares both runtime asset sets when needed. Existing single-runtime
records retain their version-1 format; mixed plans use version 2.

Story 156 corrects milestone 154's original single-runtime scope. Its mixed-loop
regression uses scripted assistant transports through the real loop and records;
that is not a claim of a live Astra/Sonnet model acceptance run.

## Select, inspect and apply

Merge these settings into the existing `.aof/aof.config.json`; preserve its other fields:

```json
{
  "name": "runtime-example",
  "resources": [],
  "memory": { "enabled": true, "backend": "local" },
  "work": {
    "dir": "wiki/work",
    "agents": {
      "mode": "solo",
      "session": {
        "models": { "refine": "gpt-6-astra", "continue": "sonnet", "verify": "sonnet" },
        "effort": { "refine": "high", "continue": "high", "verify": "high" }
      }
    }
  }
}
```

```sh
aof project validate --json
aof project show --json
aof work init --runtime claude,codex --json
aof assets apply --dry-run --json
aof assets apply --json
aof work update --json
```

`work update` reads the installed runtime manifest; it has no `--runtime` flag.
Use `project migrate` first only for a legacy root `aof.config.json`. Migration keeps
the old file for inspection and makes `.aof/aof.config.json` authoritative.

Inspection separates `assetRuntimes` from `execution.runtime` and reports each resolved
phase/role value and source. Scoped values live under `work.agents.runtimes.<runtime>`:
`session.models`/`session.effort` by phase and `models`/`effort` by AOF role id, such as
`aof-qa`. Codex does not inherit legacy Claude aliases. Native model capabilities must
confirm requested model/effort pairs; inspection without a catalog says they are unproven.
The `/config` editor shows saved resolved values. Saving updates configuration only.

## Drive, resume and roll back

For a declared fixture milestone numbered 07:

```sh
aof work loop 07 --model sonnet:high --model refine=gpt-6-astra:high --level L2
aof work loop 07 --resume
```

The initial declaration and runs pin runtime, transport, profile and settings. Resume
uses those recorded choices even after configuration edits. A conflicting
model/effort resume flag refuses before mutation. Native thread identity stays in the
existing `sessionId`; it is never synthesized from a run id.

To use Claude for all phases of new work, select a Claude model, for example
`aof work loop 07 --model sonnet:high --level L2`. Existing Codex runs remain Codex; changing configuration cannot
convert their sessions. Keep both installed bundles if both assistants are still used.

Owned unchanged legacy `.codex/skills/` files migrate to `.agents/skills/`. Drifted old
skills block duplicates. Unowned TOML/guidance/hooks collisions and changed owned fields
are reported rather than overwritten. Inspect the source, generated file and ownership
record, preserve the user's changes, then retry. Do not delete a runtime directory or
force an entire shared configuration file to resolve one conflict. Native auth and
hook trust remain managed by the assistant and operator.

Memory is independent of execution. Explicit `memory.backend: "local"` is keyless local
retrieval. Graphify keeps its existing extractor vocabulary; absent
`memory.graphify.extractionBackend` means `claude-cli`, including on a Codex project.
Preflight names that dependency and the local alternative. It never silently switches.

## Protocol profile and proof limits

The shipped `codex-app-server-v1` profile currently admits CLI **0.160.0** over
`app-server --listen stdio://`. It refuses other versions, missing required capabilities,
invalid completion envelopes and unsupported mandatory requests. In particular, the
0.130.0 CLI observed during initial research is not admitted by this implementation.
There is no exec, PTY, model or Claude fallback for a failed Codex launch.

This is the tested protocol allowlist, not a claim of completed live compatibility.
Before live verification, check the CLI version and authorized existing account access
without inspecting credentials. Independent native roles additionally require a supported
launcher/model/effort combination. A missing prerequisite stays pending and leaves the
milestone unaccepted. Public schema support alone does not prove live recovery or mesh parity.

Permission requests stop for operator action. A business answer is not execution approval.
Persisted asks carry durable question tokens and native identity, not replayable RPC ids.
Recovery resumes the thread and delivers the recorded authorized answer in a new turn.
Unavailable usage/cost stays null; a subscription is not measured API cost.

## Reproduce deterministic evidence

From this source checkout, with its already-prepared pinned dependencies:

```sh
node scripts/verify-runtime-loop.mjs --runtime both --json
node test/integration/cli.mjs lifecycle
```

The first command creates temporary Git projects and isolated global homes, exercises
legacy migration, both native asset bundles, inspection/apply/update and the real loop's
phase drivers, rubric, validation, doctor and run settlement. Scripted PTY/App Server
transports supply assistant output. The failing variant keeps the observable task red
and must halt within the configured progress/reset bounds, respecting each phase cap,
without reaching verify. Its records explicitly say
`deterministic-scripted-transports` and `accepted: false`. Temporary state is removed.
The integration runner discovers these scenarios through its existing lifecycle feature.

The repository's broad gate is `yarn test:sharded`, run from a clean detached worktree
with an isolated `AOF_GLOBAL_HOME`; run `yarn ui:build` for the relevant UI revision.
Record the snapshot, exact command, registration count, failures and named isolated
retries. A focused fixture or incomplete run is not the broad gate. No install is needed
to rerun checks in an already-prepared tree.

## Prepare live verification explicitly

```sh
node scripts/verify-runtime-loop.mjs --runtime codex --prepare-live --json
```

This creates and retains an isolated project and global home, installs native assets,
and prints their paths. It performs **no assistant launch** and reports `prepared-only`,
`launched: false`, `accepted: false`. Use its project as the working directory and its
`globalDir` as `AOF_GLOBAL_HOME`. Invoke the same source CLI revision (or its matching
installed executable) for `work loop 07 --level L2` (the prepared fixture retains its Codex default). Use the operator's
explicitly authorized existing native access; do not copy credentials into the fixture.
Prepare a separate comparable Claude fixture with `--runtime claude`. Prepared live
fixtures request orchestrated roles so independent review must be supported or refused;
the operator workspace's mode is unchanged. Their strict task test starts red and
requires the actual answer, without a scripted completion marker.

At `$aof-verify 154`, record actual native versions/settings/session identities and gates;
interrupt and recover the pending-question, restart-before-answer, warm-fix, operator-stop
and worker-reconnect cases. Run the frozen prompt workload at least three times per case
and variant, recording correctness separately from elapsed time and available usage.
Visual design still needs a configured review URL and renders at 390, 768 and 1280 pixels.
Missing access, profile, worker, URL or measurements are pending evidence, never a pass.
