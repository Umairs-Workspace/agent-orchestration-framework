# 169 · Hyperagent plans the work — Outcome

## Delivered

### Planning can be handed to Hyperagent end to end
A project turns on `work.integrations.hyperagent`, uploads the planner package once to the Hyperagent account, and from then on `/aof:hyperplan` takes a request to a draft pull request whose branch `aof work validate` passes. Measured on 2026-10-23 with draft PR #18. The parts: the verbs and skills (m169/00), the integration seam (m169/01), the aof-home package (m169/02) and its single zip upload (m169/03).
- **The Hyperagent agent named by `work.integrations.hyperagent.agent` exists, has the seven `aof-*` skills and has GitHub write access** — the doctor names the first two, and a read-only integration ends a run `blocked`.

### Hyperagent is an integration package, and core names none outside one registry
Everything Hyperagent ships (verbs, `/aof:hyperplan`, planner files) lives in `packages/integration-hyperagent` and reaches core through one contribution read by `packages/core/src/integrations.mjs`. The model knows exactly claude, codex and opencode (FF-16901, FF-16902). A new integration is one package plus one registry line.

## Gaps

### Notion is still imported across core
- **Status:** open
- **Discharge condition:** `@aof/integration-notion` reaches core only through `integrations.mjs`, and FF-16901's named exception is removed.
Ten core modules import `@aof/integration-notion` directly. FF-16901 names it as an exception (ADR-003, as amended).
