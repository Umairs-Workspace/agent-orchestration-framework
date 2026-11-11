# 178/01 · `aof memory` is the command and `aof work memory` its alias — example map

## R1 · `aof memory` answers every memory verb through the one implementation
- E1 · `aof memory recall "pin line endings" --kind near-miss --block` prints the same block lines `aof work memory recall` printed before this story, over the same index [proposed]
- E2 · `aof memory status --json` on a project with no `memory.backend` answers the `none` backend's status document, exit 0 [proposed]
- E3 · `aof memory recall "no-such-term-xyzzy" --kind no-such-kind --block` prints zero bytes, not a blank line [proposed]

## R2 · `aof work memory` answers byte for byte what `aof memory` answers
- E4 · `aof work memory recall "seam" --json` and `aof memory recall "seam" --json` print identical bytes and exit codes [proposed]
- E5 · `aof work memory record-recall 178 --input obs.json` resubmitted with the same id answers `replayed: true` through either door, and the ledger gains one row in all [proposed]
- E6 · `aof work memory status` prints no deprecation line on stdout or stderr [proposed]

## R3 · Every hint the CLI prints spells `aof memory`
- E7 · `aof memory -h` and `aof work memory -h` both print usage text that opens `Usage: aof memory <verb>` [proposed]
- E8 · `aof --help` lists the memory line in a Memory section of its own, and the Work section still carries it [proposed]
- E9 · `status` over a version-3 store, under a build that writes version 4, names `aof memory ingest` as the fix [proposed]

## R4 · The alias is the canonical command at a second route
- E10 · In the registry, `work:memory`'s `render` is the very function object `memory`'s is; a wrapper around it fails FF-17801 naming `render` [proposed]
- E11 · The command inventory holds `memory` at `["memory"]` and still holds `work:memory` at `["work","memory"]` [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-001 · Is the alias a spine-level `cli.aliases` concept or a second registered command? A second registered command spread from the canonical descriptor.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-001 · Does the alias print a deprecation notice? No. The SPEC says it prints nothing extra.
- Q3 · technical · defaulted STATE.md · Do the stale-store hint, the import-milestone reindex warning and the work-command examples also spell `aof memory`? Yes. ADR-001 named only the usage text, but these are the same kind of hint, and a hint naming the alias would keep the alias load-bearing. Ratified in this contract (STATE, 2026-10-29).
- Q4 · technical · defaulted STATE.md · Does a one-word route get its own help section? Only a word `HELP_FAMILY_TITLES` names as a family. Without that, `aof memory` would join `init` and `migrate` in Usage.
- Q5 · technical · defaulted STATE.md · Chosen by the operator at build, 2026-10-29 (STATE, 178/01 built). The `local` backend ranks every survivor, so a bare miss over the ingested fixture is never empty. E3 takes `--kind no-such-kind`, the method 128's empty-block case uses.
- Q6 · technical · defaulted STATE.md · Chosen by the operator at build, 2026-10-29 (STATE, 178/01 built). The spine's unknown-flag refusal names the command id, which ADR-001 keeps as `work:memory`. The `--undeclared-flag` row leaves E4 for a scenario of its own: equal bytes apart from that name.

<!-- No business question remains: the SPEC fixes the alias's silence and the byte-for-byte bar;
     ADR-001 settles the mechanism. Examples stay proposed. -->
