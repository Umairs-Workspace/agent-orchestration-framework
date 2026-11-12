---
doc: examples
---
# 193/03 · A project turns it on and is told what it needs — example map
<!--
Drafted at refine's discovery beat, 2026-11-12, and re-cut the same day at the operator's review:
the practice is opt-in ("in some projects this sort of approach may not be necessary"), and
`aof:init` no longer asks. Struck because the record answers them: that it is off unless a project
turns it on, and that the doctor and the update warn once when it is on with no profile (SPEC
Scope, first bullet and the adoption path); that the role is the operator's own free text (SPEC
Scope, the profile). Relabelled technical: the key's name, which verb turns it on, whether a
profile flag replaces or fills, and why the switch has no machine-wide form.
-->

## R1 · Operator-aware discovery is off unless a project turns it on
- E1 · A project with discovery on and no `operatorAware` key: the switch resolves off, and the doctor says nothing about a profile [proposed]
- E2 · `aof work init-config --operator-aware on` in that project: the key is written `true`, and the output says no profile is declared yet and names the command that declares one [proposed]
- E3 · The same command in a project with discovery off: refused `examples-operator-aware-without-discovery`, and no file changes [proposed]

## R2 · A profile flag replaces what it names, and leaves the rest
- E4 · `aof work init-config --expertise fraud=working` on a project that lists `fraud: new` and `tenancy-law: expert`: `fraud` becomes `working`, `tenancy-law` and the role are untouched [proposed]
- E5 · `aof work init-config --global --operator-role "A"` writes the role into the global config and leaves the project's file byte-for-byte as it was [proposed]
- E6 · `aof work init-config --expertise fraud=guru` is refused `operator-profile-bad-value`, and no file changes [proposed]

## R3 · A project that turned it on hears once that no profile is declared
- E7 · The switch on, no profile in the project or on the machine: `aof work doctor 193/03` reports one `operator-profile-undeclared` warning, naming the `init-config` command [proposed]
- E8 · The same project once a role is declared: the warning is gone [proposed]
- E9 · Discovery on and the switch off: no warning, whatever the profile [proposed]
- E10 · `aof work update` in the project of E7 ends with the same line the doctor printed [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-006 · What is the switch called, and may it be set for the whole machine? (`work.examples.operatorAware`, in the project's config only: rendered commands are committed, so a render must not depend on the machine.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-006 · Does a profile flag fill a hole, as tags do, or replace? (It replaces what it names: the operator is correcting a statement about themselves.)
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-006 · Does `aof work update` repeat the doctor's warning? (Yes, as it does for the test layout.)
