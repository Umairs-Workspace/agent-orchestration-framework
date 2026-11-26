# 198/03 · An owned system stays true to its code — example map
<!--
Drafted at refine's discovery beat (2026-11-26). "On, owned" is "work.ui.designSystem" =
{"enabled": true, "name": "AOF", "mode": "owned", "source": ["apps/ui/src/index.css"]}. "The system"
is the Design System titled "AOF", https://claude.ai/artifact/5M7UeXXcx16TP3vzVFNDzd, at version
"2". Its tokens.json holds "color-primary" = {"light": "hsl(174 72% 30%)"} with the usage "Primary
actions", and "color-legacy" = {"light": "hsl(0 0% 50%)"}. "The code" is index.css, which declares
"--color-primary: hsl(174 72% 27%)" and "--color-warning: hsl(38 92% 50%)" and no "--color-legacy".
"The milestone" is a UI milestone being accepted, whose stories are all done.
ADR-003, ADR-005 and ADR-007 and the story's Notes settle every rule below: the direction is code to
system only, the re-sync is the type's merge (which keeps usage notes and page edits and lists
removed tokens before removing them), a name that does not resolve to exactly one system is a stop,
and drift after the re-sync is a finding. No business question is left for a person. Each
engineering choice still open is technical, and takes the default it names.
-->

## R1 · With the practice on, a milestone's DESIGN.md template records design-system changes, and with it off the template is today's
- E1 · No work.ui block: ".aof/templates/work/milestone/DESIGN.md" is today's template byte for byte [proposed]
- E2 · On, owned: the template holds "## Design-system changes" and "## Design-system gaps" just before "## Behavioural outcomes (cross-reference)", and with both sections taken out it is today's template byte for byte [proposed]
- E3 · The practice is turned off again and "aof work update" runs: the template is classified "update" and is today's again. One a person edited is "drift-warning" and is left alone [proposed]

## R2 · "aof design-system tokens --merge" re-syncs a system's tokens from the code the way the type's merge does, and never writes to the code
- E4 · The system and the code: the merged "color-primary" is {"light": "hsl(174 72% 27%)"} with its usage "Primary actions" kept, and "changed" lists it with both values [proposed]
- E5 · The code's "color-warning", which the system lacks, is appended after the system's own tokens with an empty usage, and "added" lists it [proposed]
- E6 · "color-legacy", which the code no longer declares, is listed under "removed" with its last value, and the merged file does not hold it [proposed]
- E7 · The system's "name", "version", "editing" and "meta" are kept, and a token's "deprecated": true added on the page is kept. "--ref 6a3826de" sets "meta.source.ref", and "meta.source.paths" becomes the source list [proposed]
- E8 · "--out apps/ui/src/index.css", a source file: refused, naming it, and no file is written [proposed]
- E9 · "aof design-system check" over the merged file and the same code: no drift, exit 0 [proposed]

## R3 · Accepting a milestone re-syncs an owned system from the code, and drift that survives the re-sync is a finding
- E10 · On, owned, one system titled "AOF", and the code as above: the check before reports the drift, the merge runs, the merged tokens are published to the system, read back and checked again with exit 0. VERIFICATION.md records the system's link with its versions "2" and "3", what changed, and "color-legacy" as removed, written before the publish [proposed]
- E11 · No token drift, and "## Design-system changes" reads "None.": nothing is published, and VERIFICATION.md records the system as in sync at version "2" [proposed]
- E12 · No token drift, and "## Design-system changes" names "component scope segment: gains a disabled state": that component's README and preview are updated from the milestone's committed mocks and published, and its tokens are untouched [proposed]
- E13 · The check after the re-sync still reports "color-primary" changed: a finding is logged in VERIFICATION.md with the check's report, and triaged like any other finding [proposed]
- E14 · Two Design Systems titled "AOF": verify stops before any publish, naming "AOF" and both titles and links [proposed]

## R4 · Nothing else re-syncs a system: not a reference system, not a story's accept, not the practice off, not another runtime
- E15 · "mode": "reference": verify publishes nothing to the system, whatever the code holds [proposed]
- E16 · Accepting one of the milestone's stories: no re-sync and no check [proposed]
- E17 · No work.ui block: the rendered verify is today's, for claude, codex and opencode, byte for byte [proposed]
- E18 · On, owned: ".claude/commands/aof/verify.md" holds the re-sync, and neither the Codex skill "aof-verify" nor ".opencode/commands/aof/verify.md" holds any of it [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-001§2 · Where does the re-sync hang in verify? A new block slot "checks.design-system", at the end of step 1, after the design-conformance review and before the findings step that triages its drift. Its twin goes in the Codex verify procedure of workflow.md and stays empty there (192/ADR-002 §7).
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-003§2 · Who performs the type's merge? The verb, as "tokens --merge <tokens.json> --out <file>". Merging two token files is file assembly, and ADR-003 keeps that out of prose. The verb follows the type's re-sync rules (RESEARCH R3), and the session publishes what it writes.
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-003§1 · Which code does the merge read? The CSS files given as arguments, else the configured "source", as "check" does (01 Q7).
- Q4 · technical · defaulted RESEARCH.md#R3 · What does a merge keep? Every field of a kept token except "value", every document field outside the token lists, and the system's token order. New tokens are appended in the code's declaration order. A theme value the code no longer declares is removed and listed with its theme. A value "tokens" cannot place is listed under "unplaced" and is not written.
- Q5 · technical · defaulted ARCHITECTURE.md#ADR-007§1 · When does the re-sync run? When a milestone is accepted, with the practice on and "mode" "owned". A story's accept does not run it: the milestone's accept follows within the same milestone.
- Q6 · technical · defaulted ARCHITECTURE.md#ADR-007§1 · Is the system republished when nothing drifted? No. Only when the check before reports drift, or "## Design-system changes" names a component.
- Q7 · technical · defaulted ARCHITECTURE.md#ADR-007§1 · Is drift before the re-sync that DESIGN.md never declared a finding? No. ADR-007 calls it the expected input. VERIFICATION.md records what changed, so the omission is visible.
- Q8 · technical · defaulted STORY.md#Notes · Are removed tokens asked about? No. They are listed in VERIFICATION.md before the publish, as the type's merge lists them, and then removed. The code is the source of truth (ADR-007).
- Q9 · technical · defaulted ARCHITECTURE.md#ADR-005§5 · What does VERIFICATION.md record? A "## Design-system re-sync" section: the system's link and its versions before and after, both checks' results, and what changed, was added and was removed. It records the link, never only the name.
- Q10 · technical · defaulted ARCHITECTURE.md#ADR-007§1 · How severe is drift after the re-sync? Not pre-judged. It is logged as a finding, with the check's report, and verify's own findings step triages it.
- Q11 · technical · defaulted 192/ADR-004 · What is the template variant? Core's milestone DESIGN.md, byte for byte, with the two sections inserted. The package's practice suite proves that, so the variant cannot drift from core's default unnoticed. "## Design-system gaps" is 02's reference-mode record (02 Q11), which gains its place here.
- Q12 · technical · defaulted ARCHITECTURE.md#ADR-007§1 · What may "--out" not be? Any of the source files the merge read, configured or given. That is the verb-level half of "nothing writes from the system back to the code".
- Q13 · technical · defaulted ARCHITECTURE.md#ADR-005§1 · Where is the @manual re-sync run? On a probe copy of AOF's system, named by "artifact" in a scratch worktree's config, so the operator's own system is never the test subject.
- Q14 · technical · defaulted ARCHITECTURE.md#ADR-004§3 · Who updates a changed component? The session, from the milestone's committed mocks, as extraction builds a component (ADR-004 §3). The verb handles tokens only.
