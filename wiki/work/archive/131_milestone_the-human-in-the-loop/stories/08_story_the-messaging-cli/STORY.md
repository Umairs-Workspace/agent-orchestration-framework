---
type: story
number: 08
slug: the-messaging-cli
title: "The messaging CLI — `aof messaging init discord` keeps the webhook machine-wide under ~/.aof, `enable`/`disable` switch it per project, and `status` says whether it is set without ever showing it"
parent: 131
depends: [2]
status: done
owner: product-owner
created: 2026-09-25
updated: 2026-09-25
schema: 1
aofVersion: 0.1.0
adrs: [ADR-005]
reads:
  - wiki/work/131_milestone_the-human-in-the-loop/SPEC.md
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-005
  - src/notify/form.mjs
  - src/paths.mjs
  - src/fs.mjs
  - src/workspace.mjs
  - src/degrade.mjs
  - src/command-error.mjs
  - src/spine/face.mjs
  - src/cli.mjs
  - src/work/orchestrator.mjs
  - src/commands/orchestrator-delegation.mjs
  - src/work/delegation.mjs
  - src/commands/work/memory.mjs
  - src/commands/mesh/desktop.mjs
  - src/mesh/launcher.mjs
  - test/notify/notify-discord.test.mjs
  - test/command/command-core-contract.test.mjs
  - test/arch/command/acd-command-route-derived.test.mjs
  - scripts/test.mjs
files:
  - src/notify/secret.mjs
  - src/notify/notify.mjs
  - src/notify/discord.mjs
  - src/commands/messaging/messaging.mjs
  - src/command-core.mjs
  - schemas/aof.schema.json
  - test/notify/notify-messaging.test.mjs
  - test/notify/notify-channels.test.mjs
  - test/notify/index.mjs
  - test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - wiki/work/131_milestone_the-human-in-the-loop/VERIFICATION.md
---
# 08 · The messaging CLI

## User story

As **the operator who wants a loop's questions on Discord**,
I want **to give aof the webhook once per machine with `aof messaging init discord`, then switch it on
or off per project with `aof messaging enable discord` / `aof messaging disable discord`, and ask
`aof messaging status` whether it is set**,
so that **setting it up is one command rather than a user env var plus a desktop restart, and no
project's config or history ever holds the secret**.

## Tasks

- [x] `tasks/00_the-messaging-family-is-founded-and-registered.feature` — the four `messaging:*` commands routed from one module in `src/commands/messaging/`, the help lists them, the new directories budgeted
- [x] `tasks/01_the-webhook-is-kept-machine-wide-owner-only.feature` — `src/notify/secret.mjs`: one owner-only file under the global home, written atomically; `isDiscordWebhookUrl` beside the renderer
- [x] `tasks/02_init-reads-the-url-from-a-prompt-or-stdin-never-argv.feature` — `init discord` takes the URL from a hidden prompt or stdin, refuses it in argv, and never echoes it
- [x] `tasks/03_enable-and-disable-write-only-work-notify.feature` — `enable`/`disable discord` write only `work.notify`, idempotently, and refuse outside a project
- [x] `tasks/04_status-says-whether-it-is-set-never-what.feature` — `status` reports stored / override / enabled per type, and never the value
- [x] `tasks/05_the-notifier-reads-the-store-at-send-with-no-restart.feature` — the send reads env override, then the store, on every send; FF-13106 amended with its red probe

## Notes

- **Amends ADR-005 §1 (the secret).** Today the URL is read only as `env[urlEnv]`, so it reaches a
  supervised loop only through the desktop app's environment, which is why 07's procedure needed a
  restart. The operator's call (2026-09-25): the secret is stored machine-wide, and the per-project
  switch is the `work.notify` block. The env var stays as an override. Refine amends the ADR in the
  milestone's ARCHITECTURE.md.
- **The shape the operator named** (2026-09-25): the verb family is `aof messaging` (not `notify`).
  `init discord` is global; `enable` / `disable discord` are per project; `status` reports presence
  and never the value.
- **Rulings to carry into refine** (from the conversation that framed it, not yet contract):
  - The URL is read from a prompt or stdin and never from argv, because argv lands in shell history and
    the process list.
  - It is stored in its own file under `~/.aof/` (honouring `AOF_GLOBAL_HOME`), readable by the
    owner only, in the same way the mesh GitHub App key is a `.pem` file with only its path in config.
  - It is read at the point of send, so a daemon picks it up with no restart.
  - `enable` / `disable` write only `work.notify` in the project's `.aof/aof.config.json`, never a
    `url`, `webhook` or `token` key (FF-13106 still holds).
- **131/07 depends on this story.** Its PRECONDITION becomes `aof messaging init discord` plus
  `aof messaging enable discord` in the test-bed, re-authored at 07's re-refine. 07 is not accepted,
  so its contract is still open.
- Out of scope: Slack or other channel types (a renderer entry later), and a mesh worker's secret
  (a worker's ask is ratified as not surfaced).

## Accept decision

**Accepted 2026-09-25 (`aof:verify 131/08`).**
- **Evidence.** The story lane was green: 84 ok and 0 not ok. The controls it crosses were green: 61 ok. A hand probe and a live send with no restart passed (VERIFICATION `### 131/08`).
- **Gates.** `aof work validate 131/08` returned PASS. `aof work doctor` reported no `control-unresolved`.
- **Findings.** None is a blocker for 08. F-131-01 was fixed in the gate, and F-131-04 was ruled as built. F-131-02 goes to the operator and must be discharged before 07 runs. F-131-03 is inherited and goes to the milestone gate.
