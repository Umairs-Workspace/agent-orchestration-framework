# 178/02 · Every bundle prompt, skill and doc spells `aof memory` — example map

## R1 · Every shipped asset spells `aof memory`
- E1 · `refine.md`'s architect recall reads `aof memory recall "<the decision in a few words>" --area architecture --block`, and so do the codex workflow variant's 21 lines that spelled the alias [proposed]
- E2 · Across `packages/*/assets/`, the 53 occurrences measured on 2026-10-29 in 15 files become 0 [proposed]
- E3 · A planted asset line wrapped as `aof work` / `memory recall` across two lines fails FF-17802, naming the file and line [proposed]

## R2 · The generated folders are re-rendered, never hand-edited
- E4 · After `aof work update`, `.claude/commands/aof/refine.md`, `.agents/skills/aof-refine/procedure.md` and `.opencode/commands/aof/refine.md` spell `aof memory recall` [proposed]
- E5 · A second `aof work update --dry-run` reports nothing to change, and `.aof/aof.lock.json` carries the new hashes [proposed]

## R3 · The planner skills change the spelling only
- E6 · Hyperagent's `aof-refine` skill lists `` `aof memory recall` → search the repository (code search scoped to `<work.dir>`) ``, with the substitution text unchanged [proposed]
- E7 · The Cowork planning skill rendered by `aof planning init --runtime cowork --force` carries `aof memory recall`, because it is rendered from `shatter.md` [proposed]

## R4 · The docs spell `aof memory`, and tests and history keep the alias
- E8 · The README's memory block reads `aof memory status`, `aof memory reindex`, `aof memory recall "pin line endings"`, and each resolves through story 125's README control [proposed]
- E9 · `schemas/aof.schema.json`'s `memory.backend` description names "the `aof memory` verbs" [proposed]
- E10 · `test/integration/features/work-memory.feature` and every `wiki/work` document keep `aof work memory` [proposed]
- E11 · The learning-edge control parses `aof memory recall … --block` out of `refine.md` and still finds at least one recall per roster entry [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-003 · Does FF-17802 also scan the generated folders? No. They are rendered from the assets, and the lock's drift check covers them.
- Q2 · technical · defaulted STATE.md · Does the learning-edge control accept both spellings? No. It reads `aof memory` only. A prompt still on the alias is FF-17802's to refuse, so the edge control never has to.
- Q3 · technical · defaulted STATE.md · Does the README's milestone table row for 05 change? No. It records what milestone 05 delivered, so it is history. The command reference above it is migrated.
- Q4 · technical · defaulted ARCHITECTURE.md#adr-003 · Does this story re-upload the Hyperagent skills or the Cowork plugin? No. Both are the operator's manual steps, named in the hand-over.

<!-- No business question remains: the operator ruled on Hyperagent and Cowork (STATE), and ADR-003
     fixes what migrates and what stays. Examples stay proposed. -->
