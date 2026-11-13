---
doc: verification
---
# 192 · Commands are built at render from a core body and the fragments of the practices a project has turned on — Verification

Written at `aof:verify 192`. Opened at refine (2026-11-13) only to carry the red-probe register
for the controls `ARCHITECTURE.md` declares. FF-19205, FF-19206 and FF-19207 landed with 192/00 and were each probed red on 2026-11-13.

One developer-run `@manual` check is owed by 192/02 and is recorded below: this checkout's
rendered refine command, Codex refine skill and three briefs, compared with the same files at the
commit before the story, whitespace collapsed (ADR-005 §4).

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-19205 | `test/arch/practices/acd-slot-leaves-nothing-behind.test.mjs` | green (192/00) | red when the empty block slot keeps its blank line (`bundle-compose.mjs`), and when the loader returns the common body uncomposed (`bundle.mjs`), 2026-11-13 |
| FF-19206 | `test/arch/practices/acd-fragment-lands-on-every-runtime.test.mjs` | green (192/00) | red when the fixture Codex procedure loses the `demo.notes` slot its common source carries, naming `notes-demo`, `codex`, `demo.notes`, 2026-11-13 |
| FF-19207 | `test/arch/practices/acd-render-reads-project-config-only.test.mjs` | green (192/00) | red when `bundle-compose.mjs` imports `node:os`, and when the update merges the machine-wide config before loading, 2026-11-13 |
| FF-19208 | `test/arch/practices/acd-off-renders-no-practice-prose.test.mjs` | green (192/02) | red when "When it is off, write no `EXAMPLES.md`." is written back into core's refine source, naming NONE's Claude and opencode refine commands and `EXAMPLES.md`, 2026-11-13; the four planted leaks of task 00 (that sentence, a discovery fragment under a practice on for every project, the map bullet in the Codex PO brief, the build brief in the Codex refine procedure) each red in the suite itself |

## @manual — 192/02 E4 and E5: the committed copies changed only at the seams

Developer-run, 2026-11-13. Before touching a source, the thirteen rendered copies were saved from
this checkout at `d86f2151` (the commit before the story). After the move, `aof work update` was run
with this tree's own CLI (`node packages/core/bin/aof.mjs`); it updated four files and skipped 232.
Each pair was then compared with every run of whitespace collapsed to one space, reporting the span
from the first difference to the last.

| copy | result |
|---|---|
| `.claude/commands/aof/refine.md` | differs only at the Contract's opening: "…under `tasks/`, opening with the discovery beat below when the project has turned it on." now reads "…under `tasks/`." |
| `.opencode/commands/aof/refine.md` | the same, and only that |
| `.agents/skills/aof-refine/procedure.md` | the same, and only that |
| `.agents/skills/aof-refine/SKILL.md` | differs only in "…before writing tasks; retain executable/manual/UAT lanes…" now reading "…before writing tasks. Retain executable/manual/UAT lanes…" |
| `.claude/agents/aof-{product-owner,architect,qa}.md` | identical (byte for byte; the update skipped them) |
| `.opencode/agents/aof-{product-owner,architect,qa}.md` | identical (byte for byte) |
| `.codex/agents/aof-{product-owner,architect,qa}.toml` | identical (byte for byte) |

E4 and E5 hold: no sentence is missing or doubled, no Claude wording reached a Codex file, and the
only changes are the two seam edits ADR-005 §4 lists. The briefs are byte-identical because their
slots are inline and the fragment bodies are the lines that stood there. A scratch project with
nothing on was then rendered (the NONE project of FF-19208): its refine command holds none of the
discovery or brief words, and is 104 lines shorter than the same command with both keys on.
