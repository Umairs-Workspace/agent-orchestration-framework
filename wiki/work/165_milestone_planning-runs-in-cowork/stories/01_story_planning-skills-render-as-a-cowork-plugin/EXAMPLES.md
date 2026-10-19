# 165/01 · The planning skills render as a Cowork plugin — example map

## R1 · The plugin carries shatter and explain, and each runs only when invoked as `/aof:<skill>`
- E1 · The plugin is rendered: it holds `.claude-plugin/plugin.json` named `aof`, `skills/shatter/SKILL.md` and `skills/explain/SKILL.md`, and nothing else [proposed]
- E2 · The plugin is rendered: no `skills/refine/` and no `commands/` folder appear [proposed]
- E3 · aof's package version is `0.1.0`: `plugin.json` says `"version": "0.1.0"` [proposed]
- E9 · The shatter skill's description opens with "Use only when the user invokes `/aof:shatter`", so a Claude Code session in another repo, where the plugin also syncs, does not load it on a passing mention of a PRD [proposed]

## R2 · A skill runs the command's own procedure, unchanged
- E4 · The shatter skill's body, after its preamble, is the body of `packages/core/assets/commands/shatter.md` character for character [proposed]
- E5 · Codex's `$aof-shatter` skill renders exactly as it did before this story [proposed]

## R3 · Without the aof CLI, a skill keeps to Markdown and changes no state by hand
- E6 · Cowork's shell has no `aof`: the preamble says to probe `command -v aof`, skip each `aof` step, and list the skipped steps in the report [proposed]
- E7 · Shatter runs without `aof` in a repo whose intake is `stream`: the preamble says the drivers stay in the backlog, to be promoted from Claude Code or Codex, and never to write a `number:` or a `status:` by hand [proposed]
- E8 · Any skill: the preamble says never to commit [proposed]

## R4 · A package rebuilt from the same sources is the same file
- E10 · The plugin is packaged twice from unchanged sources: the two files are byte-identical [proposed]
- E11 · The package is opened: there is exactly one `.claude-plugin/plugin.json`, at the archive's root [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-002 · Which commands become skills? shatter and explain. refine needs the CLI's run mint, graph and doctor, and stays in the coding runtimes.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-002 · Skills or commands? Skills, because they load in Cowork, chat and Claude Code alike.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-005 · How is the archive written? An in-repo stored zip with a fixed timestamp and sorted entries.
