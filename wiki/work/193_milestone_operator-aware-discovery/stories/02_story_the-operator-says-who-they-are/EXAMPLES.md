---
doc: examples
---
# 193/02 · The operator says who they are — example map
<!--
Drafted at refine's discovery beat, 2026-11-12. Struck because the record answers them: the block's
two keys and the three levels, that a global default lives in `~/.aof/aof.config.json` and a
project overrides it, and that an unlisted domain is handled as `new` (SPEC Scope, third bullet).
Relabelled technical: the role's length limit, how the merge treats each key, and what an unknown
level resolves to.
-->

## R1 · The operator states a role and a level per domain
- E1 · A project whose `work.operator` holds the role "I run the build for a lettings agency. I am a developer, not a property manager." and expertise `property-management: working`, `tenancy-law: new` validates clean and resolves to exactly that [proposed]
- E2 · Expertise `tenancy-law: beginner` is refused by `aof project validate` as `operator-profile-bad-value`, and the level resolves `new` [proposed]
- E3 · A block spelt `{ "rol": "…" }` is refused as `operator-profile-unknown-key` [proposed]

## R2 · A project's statement overrides the machine-wide one, key by key
- E4 · Global: role "A", `fraud: expert`, `tenancy-law: new`. Project: `tenancy-law: working` and no role. Resolved: role "A", `fraud: expert`, `tenancy-law: working` [proposed]
- E5 · The same global, and a project whose only key is the role "B": resolved role "B", with both of the global's levels [proposed]
- E6 · `aof project show --json` for E4 answers the role with source `global`, `fraud` with source `global` and `tenancy-law` with source `project` [proposed]

## R3 · A domain nobody listed is new
- E7 · A profile that lists only `fraud: expert`, asked for the level of `tenancy-law`, answers `new` [proposed]
- E8 · No `work.operator` in the project or the global file: the profile is undeclared, every domain is `new`, and nothing is refused [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-003 · How long may the role be? (500 characters: it rides every PO and researcher prompt.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-003 · What does a level the resolver does not know resolve to? (`new`, the most explained, and the validator reports it.)
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-003 · How does a refine session read the resolved profile? (`aof project show --json`, so no session merges two files by hand.)
