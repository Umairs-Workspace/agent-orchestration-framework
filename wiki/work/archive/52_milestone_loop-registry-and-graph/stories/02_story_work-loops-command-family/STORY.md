---
type: story
number: 02
slug: work-loops-command-family
title: "`work:loops show|graph|validate` — the three verbs and the one readable picture"
parent: 52
status: done
owner: product-owner
depends: [52/00, 52/01]
created: 2026-08-14
updated: 2026-08-14
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 52/02 · `work:loops show|graph|validate`

## User story

As an **operator at a terminal**, I want three registered commands with stable `--json` contracts —
one that shows me the declared loops, one that draws them as a picture I can commit and read in a PR,
and one that reports the graph's pathologies — so that aof's improvement machinery is something I can
**query and look at**, not something I have to reconstruct by reading seven prompt files.

## Context

Three command objects, three files, three routes, registered into the existing command core. The
milestone-08 spine holds: every observable is a registered command with a `--json` contract before it
is anything else.

The CLI route table is **derived from the registry** (`deriveRouteTable`/`resolveRoute`, longest-prefix
matching, and four-word routes already ship), so this story adds **no `src/cli.mjs` branch**. Its edit
surface outside its own new files is six lines in `src/command-core.mjs` — the milestone's only change
to a pre-existing **source** file.

One correction, caught at refine and measured twice, because ADR-008 originally got it wrong: the
CLI↔command bijection arch-test is registry-derived, but it is **not** free. Only its **adapter** leg
is. Both of the others fail on the registration diff, for the same root cause — the test assumes a
`work:` command's id-suffix *is* its route words:

- **Route-reachability** (`:283-289`) asserts `routes.has(\`work ${sub}\`)`, with `sub` derived from
  the **id** (`loops-show`) — but `deriveRouteTable` keys on `cli.route.join(" ")`, i.e.
  `"work loops show"` (`src/spine/face.mjs:92`). The lookup misses, and ADR-008 forbids the
  ladder-branch fallback.
- **Spawn-and-parse** (`:249`) ends `default: throw new Error(...)` — deliberate, per its own comment
  at `:197-199` — so three unmapped subs throw.

`work:loops-*` is the **first `work:`-namespaced command with a three-word route** (the only other
3+-word routes are `notion:*`, which the `work:` filter excludes), which is why this latent assumption
has never been exercised. **This story owns the fix**: three `argsFor` cases, and making the
reachability leg derive its probe words from `command.cli.route` rather than from the id. Both fire on
the registration diff, so they belong in it.

The rendering is a deterministic Mermaid flowchart, chosen against a stated test: PRD constraint —
"if a loop, its watcher, its reference-owner and its auditor cannot be reviewed in a PR, they are not
governed." Mermaid renders in a PR diff and reads plainly in a terminal with no tool installed. The
`--json` form carries the model for anyone who wants to render differently.

The `--json` shapes are a **consumed contract**, not a CLI render: milestone 53's Loop-Ready score
composes these checks through `invoke()`, reading `summary`, never the human output.

ADR references: 52/ADR-008 (one command per verb, the three frozen `--json` contracts, no bundle
wrapper), 52/ADR-009 (deterministic Mermaid, no UI surface), 52/ADR-007 §6 (exit 0 — report, never
enforce).

## Acceptance

- `aof work loops show [--json]`, `aof work loops graph [--json]`, `aof work loops validate [--json]`
  each resolve through the registry-derived route table with **no `src/cli.mjs` dispatch branch**.
- Each command emits exactly one parseable `--json` envelope, and each result carries `source` as a
  raw absolute path (the face relativises — never the command).
- From a nested directory, the existing universal
  `--config <workspace>/.aof/aof.config.json` flag selects the workspace explicitly; every printed path
  is still relative to that nested invocation cwd.
- A repo with **no** `loops/` directory is not an error: `present: false`, empty nodes, exit 0.
- `show` returns nodes with `fields` as `Field` objects (`kind` always present) and `edges` as typed
  `Endpoint`s where `resolved` is `null` for extra-registry schemes — so "not resolved here" is never
  mistaken for "resolved fine".
- `graph` emits byte-identical Mermaid for the same model across repeated calls and across separate
  processes: nodes sorted by `id`, edges sorted by (source, type, target), edge type as the link
  label, node shape by `kind`.
- `validate` returns `findings` plus a `summary` carrying error/warn counts and a per-check
  `{ ran, findings }` map — so "ran and found nothing" is distinguishable from "did not run".
- `work:loops validate` **exits 0** whenever it produced a report. Severity travels in the JSON;
  nothing here gates.
- `test/arch/acd-work-command-cli-bijection.test.mjs` stays green across the registration diff: three
  `argsFor` cases are added (probes `["work","loops",<verb>,"--json"]` against the bijection fixture,
  which has no `loops/` directory → `present: false`, exit 0, exactly one envelope), **and** the
  route-reachability leg derives its probe words from `command.cli.route` instead of assuming the
  id-suffix is the route — so the gate covers multi-word routes generally, not just this family.
- `aof work loops-show --json` (the id spelled as an argv word) does **not** resolve — the route words
  are the argv form, the hyphenated id is not.
- No file under `ui/`, `src/cli.mjs`, `src/work.mjs`, `src/work-doctor*.mjs` or
  `src/bundle/commands/` is touched.

## Tasks

- [x] [00 — `work:loops-show` and its contract](tasks/00_loops-show.feature)
- [x] [01 — `work:loops-validate` and its summary](tasks/01_loops-validate.feature)
- [x] [02 — `work:loops-graph`, the deterministic Mermaid rendering](tasks/02_loops-graph-mermaid.feature)
- [x] [03 — registration, routing and the absent-registry case](tasks/03_registration-and-routing.feature)

## Notes

No `/aof:*` bundle wrapper ships here — a conscious, recorded departure from the standing house rule,
with a named discharge trigger (52/ADR-008): the milestone that first makes an ACD phase consult the
loop graph ships the wrapper alongside the caller that justifies it.

Workspace discovery is exact-cwd unless `--config` is supplied; ancestor discovery is not part of this
story. The two nested-cwd scenarios therefore exercise the existing universal config selector explicitly.
