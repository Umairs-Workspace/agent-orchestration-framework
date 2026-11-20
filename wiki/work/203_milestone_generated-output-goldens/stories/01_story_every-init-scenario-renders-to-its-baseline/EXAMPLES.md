# 203/01 · Every init scenario renders to its committed baseline — example map
<!--
Drafted 2026-11-20 by the PO at refine's discovery beat. Grounding, measured the same day on
4cac6cd8 (ARCHITECTURE "Measured facts"): the three-runtime init writes 238 files; the three
single-runtime inits hold exactly its files between them; nothing is written to the home; Notion
ships no member; over a customised project, init keeps the user's files and hooks and overwrites
a user file at an aof path. The scenario list is ADR-005's. No person was asked, so every example
is proposed.

Struck before asking: whether this story should stop `init` overwriting a user's file at an aof
path. The SPEC answers it, because this milestone holds what aof generates and does not change
the verbs. The product question behind it is raised for the operator in the milestone STATE.
-->

## R1 · Each runtime's init renders to its baseline, and writes nothing to the global home
- E1 · `default`, `work init --runtime claude,codex,opencode` in an empty folder: its 238 files equal the whole committed baseline, and the home is empty [proposed]
- E2 · `claude`, `work init --runtime claude`: its 97 files equal `default` minus the `removed.golden` list, which names every `.agents/`, `.codex/` and `.opencode/` path [proposed]
- E3 · `codex` with 138 files and `opencode` with 76 files: likewise, each against its own `removed.golden` [proposed]
- E4 · Every step's envelope is held, so a new member shows as one more `create` line in each scenario that renders it [proposed]

## R2 · Each profile holds exactly what it turns on
- E5 · `all-practices`, config `work.examples.enabled`, `work.examples.operatorAware` and `work.plan.enabled` all true: its delta holds 18 changed files and its config. They are refine in each runtime (`.claude/commands/aof/refine.md`, `.opencode/commands/aof/refine.md`, and the codex skill's `SKILL.md` and `procedure.md`), the architect, product-owner, QA and researcher agents in each runtime, and the `EXAMPLES.md` and `RESEARCH.md` templates [proposed]
- E6 · `notion`, config `work.integrations.notion: {}`: its delta holds `project/.aof/aof.config.json.golden` and nothing else [proposed]
- E7 · `hyperagent`, config `work.integrations.hyperagent: {}`: its delta adds `.claude/commands/aof/hyperplan.md`, `.opencode/commands/aof/hyperplan.md` and the codex skill `.agents/skills/aof-hyperplan/`, plus its config, and changes nothing else [proposed]
- E8 · Learning has no key: `/aof:teach` is in `default`, so no profile's delta names it [proposed]

## R3 · Over a project holding the user's own files, init keeps them, and its baseline says what it did to each
- E9 · A user command `.claude/commands/deploy.md` holding "# Deploy": kept byte for byte [proposed]
- E10 · A user `.claude/settings.json` with the permission `Bash(npm test)` and a `Stop` hook running `say done`: both kept, and aof's hooks, denies and `aofManaged` entries added [proposed]
- E11 · A user `.codex/hooks.json` with a `Stop` hook running `echo mine`: kept, beside aof's session hooks [proposed]
- E12 · A user `.codex/config.toml`, `.opencode/opencode.json`, `AGENTS.md`, `CLAUDE.md` and root `.gitignore`: each kept byte for byte [proposed]
- E13 · A user `wiki/work/.gitignore` holding `scratch/`: the user's line kept, and aof's two heartbeat lines added [proposed]
- E14 · A user file at `.claude/agents/aof-architect.md` holding "mine": replaced by aof's architect, and the envelope reports it as `update`. This is today's behaviour, and it is held [proposed]

## R4 · The render is the same bytes on every run, and a meant edit shows as exactly that edit
- E15 · `default` run twice, normalising only line endings, temp paths and instants: the two trees are byte-identical [proposed]
- E16 · One sentence edited in `packages/core/assets/commands/refine.md`: the failure shows `changed` for that command's renders in `default`, one hunk each, plus each scenario whose delta stores that file, and no other file [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-005 · Must every profile be crossed with every runtime and both starting states? (No. Profiles run on all three runtimes, and the measured union property covers each runtime alone.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-005 · What does `all-practices` turn on, given that learning has no key? (Every practice key that exists. Learning is in every render.)
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-002 · What happens if the twice-run check finds an unstable order? (It is fixed in the module that renders it, in this story, and never given a normaliser rule.)
