# 198/01 · A Claude project extracts its design system and names it in config — example map
<!--
Drafted at refine's discovery beat (2026-11-26). The real input is this repository's own:
apps/ui/src/index.css, whose @theme block declares 20 colours (hsl, one light theme) and one
radius, "--radius: 0.5rem". "The block" is work.ui.designSystem in .aof/aof.config.json.
ADR-003, ADR-004 and ADR-005 (amended 2026-11-26) settle every rule below, so no business
question is left for a person. The engineering choices still open are technical, and each one
takes the default it names.
-->

## R1 · The design-system practice is registered on its key, and it changes no render while it has no fragments
- E1 · "aof work update" in a project with no work.ui block: the practice list holds a "design-system" row keyed on "work.ui.designSystem.enabled", off. With "enabled": true, the row reads on [proposed]
- E2 · The bundle rendered for claude, codex and opencode with the key on and with it off: every rendered file is byte-identical [proposed]

## R2 · The extract command is Claude's alone, and it is installed whether the key is on or off
- E3 · A project installed for claude, codex and opencode, with no work.ui block: ".claude/commands/aof/design-system.md" exists, and no Codex skill or OpenCode command is named "design-system" [proposed]
- E4 · The rendered command says to read "from-code.md" from the Design System type at run time, and the package ships no copy of it [proposed]

## R3 · "aof design-system tokens" prints the token lists the type reads, from the code, and lists every value it could not place
- E5 · apps/ui/src/index.css: 20 colour tokens in one theme "light", among them "color-primary" = "hsl(174 72% 27%)", and one radius token "radius" = "0.5rem". Nothing is unplaced [proposed]
- E6 · "--color-primary: hsl(174 72% 27%)" in @theme and "--color-primary: hsl(174 60% 40%)" under ".dark": one token "color-primary" whose value is {"light": "hsl(174 72% 27%)", "dark": "hsl(174 60% 40%)"}, and the themes are light, then dark [proposed]
- E7 · "--color-ring: var(--color-primary)" becomes the alias "{color-primary}". "--color-scrim: color-mix(in srgb, black 40%, transparent)" and "--color-none: transparent" are listed as unplaced, each with its file, its line and the reason [proposed]
- E8 · With "--mocks wiki/work": a mock that paints "#b3261e", which no code token holds, lists that value as mock-only, with every file it appears in. A mock that paints "hsl(174 72% 27%)" lists nothing [proposed]

## R4 · "aof design-system check" compares a system's tokens with the code, and exits non-zero on drift
- E9 · A tokens.json that "tokens" printed from index.css, with usage notes and "meta.source" added: no drift, exit 0 [proposed]
- E10 · The system holds "color-primary" = "hsl(174 72% 30%)" while the code holds "hsl(174 72% 27%)": reported as changed, with both values and the theme, exit non-zero [proposed]
- E11 · The code adds "--color-warning", and the system holds "color-legacy", which the code no longer defines: "color-warning" is reported as added and "color-legacy" as missing, exit non-zero [proposed]
- E12 · No "--source", and no configured source: refused, naming both ways to give one [proposed]

## R5 · "aof design-system use" names exactly one system, and writing one form removes the other
- E13 · "use --name AOF --mode owned --source apps/ui/src/index.css" on this repository's config: the block is {"enabled": true, "name": "AOF", "mode": "owned", "source": ["apps/ui/src/index.css"]}, and every other key in the file is unchanged [proposed]
- E14 · Then "use --artifact https://claude.ai/artifact/5M7UeXXcx16TP3vzVFNDzd --mode reference": the block holds "artifact" and "mode": "reference", and no "name" or "source" [proposed]
- E15 · "use --name AOF --artifact https://claude.ai/artifact/5M7UeXXcx16TP3vzVFNDzd --mode owned --source apps/ui/src/index.css": refused, and the file is not written [proposed]

## R6 · The validator reports each defect of the block under its own code
- E16 · "name" and "artifact" both set: "design-system-name-and-artifact" [proposed]
- E17 · "enabled": true with neither: "design-system-unnamed". The same block with "enabled": false: no finding [proposed]
- E18 · "mode": "owned" with no "source": "design-system-source-missing". "mode": "reference" with a "source": "design-system-source-stray" [proposed]

## R7 · Extract builds the system from the code and the mocks, publishes it only after the operator agrees, and names it only when its title is unambiguous
- E19 · AOF's own run: the inventory lists 20 colours, 1 radius, and the bar, nav, scope segment, pills, cards and terminal pane. The operator agrees. A Design System titled "AOF", marked "editing": "code", exists, and .aof/aof.config.json names it as "name": "AOF" [proposed]
- E20 · A system titled "AOF" is already among those the operator can open: the run stops before publishing, naming every candidate's title and link, and the config is not written [proposed]
- E21 · The operator declines the inventory: nothing is published, and the config is unchanged [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-003§1 · What is a token's name? The custom property without its leading "--" ("color-primary", "radius"). CSS keeps property names unique, the type wants a name used once across families, and check matches on it.
- Q2 · technical · defaulted RESEARCH.md#R3 · Which properties go to which family? "--color-*" to color, "--radius" and "--radius-*" to radius, "--spacing" and "--spacing-*" to spacing, "--shadow-*" to shadow, "--font-*" to type.families, and "--text-*" (with its "--line-height") to a type style in the group "Text". Any other property is unplaced as having no family. **Amended 2026-11-27 (198 VERIFICATION F-03):** those namespaces place first, and a `--text-*` holding a colour is a colour. Any other name is placed as the type's `from-code.md` step 4 places it: a colour by its value, a length by its name (`space|gap|pad` to spacing, `radius|rounded` to radius, `shadow` to shadow), and a bare `var()` as a colour alias kept only if it resolves. Only what still matches none is unplaced as having no family.
- Q3 · technical · defaulted RESEARCH.md#R3 · Which selectors are themes? "@theme" and ":root" are the first theme, "light". ".dark", "[data-theme=x]" and ".theme-x" are themes "dark" and "x", in file order. A declaration under any other selector is unplaced.
- Q4 · technical · defaulted RESEARCH.md#R3 · What happens to values the type cannot read? A "var()" naming one placed colour token becomes its alias. Any other "var()", any "color-mix()" and any named colour is unplaced, because the type drops each of them.
- Q5 · technical · defaulted ARCHITECTURE.md#ADR-003§2 · Who finds the mock-only values of ADR-004 §2? The verb, through "tokens --mocks <dir>…", because the prose holds no parsing. It reads the colour literals and custom-property values in every ".dc.html" and ".html" under each dir. It lists one that equals no code token, after both are normalised to RGBA, with the files it appears in. Lengths are not listed.
- Q6 · technical · defaulted ARCHITECTURE.md#ADR-007§1 · How is a mock-only value the operator accepts kept for an owned system? It is added to the code first, and "tokens" runs again. It is never written into the system alone, so check stays clean from the first publish.
- Q7 · technical · defaulted ARCHITECTURE.md#ADR-004§5 · How does check run at the extraction's review, before "use" has written any config? "--source <file>…" gives the files, and it wins over the configured "source".
- Q8 · technical · defaulted ARCHITECTURE.md#ADR-007§1 · What counts as drift? A value that differs in any theme, compared as text with whitespace collapsed, plus a token only one side holds. Usage notes, "meta", "name" and "version" are not compared. Drift exits 1, and a refusal exits through the CLI's error path.
- Q9 · technical · defaulted ARCHITECTURE.md#ADR-005§3 · The codes, and when they apply: "design-system-name-and-artifact", "design-system-unnamed", "design-system-empty-name", "design-system-bad-artifact", "design-system-bad-mode", "design-system-source-missing", "design-system-source-stray", "design-system-unknown-key", and "design-system-bad-value" for a block that is not an object. Every shape check applies whether or not the practice is on. Only "unnamed" waits for "enabled": true, and a missing "mode" is "bad-mode" only then.
- Q10 · technical · defaulted ARCHITECTURE.md#ADR-005§1 · What may "source" hold? Paths relative to the project root, written with forward slashes. "use" refuses a path that does not exist or that leaves the root.
- Q11 · technical · defaulted ARCHITECTURE.md#ADR-003§1 · How do the verbs reach the CLI? A practice's contribution may carry "commands", assembled as an integration's are. The help lists them under "Design system".
- Q12 · technical · defaulted ARCHITECTURE.md#ADR-004§4 · Which mode does extract write? Always "owned", with the CSS files it read as "source". A system someone else owns is named by hand, through "use --mode reference".
- Q13 · technical · defaulted ARCHITECTURE.md#ADR-004§5 · Which title does extract publish under? The one the operator agrees to at the inventory review. The session proposes the project's name.
- Q14 · technical · defaulted ARCHITECTURE.md#ADR-001§5 · Does the practice list name runtimes for "design-system"? No. It has no fragment yet, and a practice with no fragment names none.
