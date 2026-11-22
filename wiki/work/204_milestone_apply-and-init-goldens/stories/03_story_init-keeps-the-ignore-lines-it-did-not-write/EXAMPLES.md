# 204/03 · Init keeps the ignore lines it did not write — example map
<!--
Drafted 2026-11-21 by the PO at refine's discovery beat. Grounding, measured the same day on
81953d9b (ARCHITECTURE "Measured facts"): init writes the config, the lock and `.aof/.gitignore`
holding `/work/`; a second init refuses with `config-exists`; init replaces a user's
`.aof/.gitignore`; after `work init` it keeps the lock's `work` section; `--global` writes only into
`AOF_GLOBAL_HOME`, and a global command is refused. No person was asked, so every example is
proposed.

Struck before asking: whether init should keep the ignore lines it did not write. The operator
decided at refine that 204 fixes it (milestone STATE, 2026-11-21).
-->

## R1 · Init writes its scaffold, and a second init refuses and changes nothing
- E1 · `empty`, `init --runtime claude,codex,opencode`: the config names the three runtimes, the lock holds `items: []` and the three runtimes, `.aof/.gitignore` holds "/work/\n", and the home is empty [proposed]
- E2 · `re-init`, the same init run twice: the second exits 1 with `config-exists`, and the tree equals `empty`'s [proposed]

## R2 · Init keeps every line and section it did not write
- E3 · `customised`, a user `.aof/.gitignore` holding "scratch/\n" and a root `.gitignore` holding "node_modules/\n": the first becomes "scratch/\n/work/\n", and the second is untouched. Today the first becomes "/work/\n" [proposed]
- E4 · `after-work-init`, `work init --runtime claude` then `init --runtime claude`: `.aof/.gitignore` holds `work init`'s eight lines, then "/work/". Today it holds "/work/" alone [proposed]
- E5 · `after-work-init`: the lock's `work` section, normalised, equals the one in `work-init/claude`'s baseline, and init adds only its own top-level keys [proposed]

## R3 · `--global` writes only into the temp global home
- E6 · `global`, `assets add --global` for a skill, an agent and a rule: the home holds `aof.config.json` and the three asset bodies, and nothing else [proposed]
- E7 · `assets add --global command g-command`: exits 1, refusing a global command [proposed]
- E8 · After `assets use --global` for each and `assets apply`, the project holds the three rendered for each runtime that takes them, and every path any step reports starts with `<project>` or `<home>` [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-005 · Where does init's line go in an existing `.aof/.gitignore`? (Appended after every existing line, and only when absent.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-001 · How is `--global` held, when `assets apply --global` refuses by design? (Through `assets add --global` and `assets use --global`, then a plain apply.)
