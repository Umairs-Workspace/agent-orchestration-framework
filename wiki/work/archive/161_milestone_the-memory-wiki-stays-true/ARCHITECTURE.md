# 161 · The compiled wiki stays true

## Evidence and recall

The architect recalled `wiki source citation doctor shared resolver` with
`--area architecture --block`. The five returned ADRs were m62/ADR-011,
m62/ADR-006, m16/ADR-005, m63/ADR-015 and m119/ADR-004. The grammar/resolver
decisions are honoured below; budget and event-face decisions are irrelevant.
No near-miss was returned. The PO's query `memory wiki procedure recall ledger
recurrence promotion record types`, with `--item 161 --block`, returned nothing.
The two completed observations are recorded in this item's recall ledger:
architect `a39949fd-ab03-4535-8da7-01dd96e361f5` and PO
`ce36a6bf-5c97-44df-b33d-16ec488fc328`.

`aof graph build .` failed with `spawnSync graphify.exe EPERM`. There is no fresh
builtAt, egress or count result, and no stale artifact is treated as current.
Source imports establish the boundaries: the doctor command already reads citation
history (`packages/work/src/commands/doctor.mjs:96`) and appends workspace findings
after the item-scoped engine; the resolver imports the citation grammar
(`packages/work/src/cited-path-resolve.mjs:1`). The wiki has no code dependents.

A read-only inventory on 2026-10-14 used `pathCitationsIn`, `readCitationHistory`
and `resolveCitedPath`, with Git output captured by the shell because Node child
spawns were denied. All 12 direct `wiki/*.md` pages were inspected. Only memory.md
had source citations: eight distinct textual forms, all resolvable through the
4,984-entry history/ledger map. No other wiki page currently needs a citation fix.
This is an inventory, not evidence that the future doctor probe already exists.

## ADR-001: A workspace citation probe reuses the existing grammar and resolver

**Status:** Accepted · **Date:** 2026-10-14

Add a small `packages/work/src/wiki-citations.mjs` reader/probe and call it from
the existing doctor command boundary. Read direct regular Markdown files in
`<projectRoot>/wiki`, not recursively and not relative to cwd or work.dir. A
missing wiki directory is normal. An unreadable directory/page is a warning
`wiki-source-unreadable`, never a falsely clean scan. Do not traverse symlinked
pages outside the project. This introduces no config key or package dependency.

Extract concrete local file citations through `pathCitationsIn` and normalize
through the existing helpers, retaining full prefixes such as `packages/work/src/`
and `apps/ui/src/`. A source citation has a complete `src` path component;
ignore HTTP(S) URLs, wildcard families and extensionless directory mentions.
Check links, inline code and fenced examples alike: a literal local source file
claim is still a claim in a code block. Locators identify the file, not a promise
that the historical line number remains current. Do not add another path regex
or rename table; URL exclusion and source-path classification are this probe's
policy, not a second file-citation grammar.

Read history once at the command edge, share that same map with the existing
snapshot and this probe, and call `resolveCitedPath` with a file-existence callback.
Existence means a regular file at the resolved project-relative destination, not
merely a directory. Reuse its head/rename/module behavior unchanged, including
chains, absent history and deleted destinations. Never execute cited source.
Citation traversal must remain inside projectRoot. The resolver's existing
normalization of leading Markdown-relative prefixes remains authoritative.

Emit one `wiki-source-unresolved` warning per page and normalized missing file,
with the page as the finding path and the citation plus first occurrence's
one-based line in the message. Stable page/citation ordering makes repeated
calls deterministic. Keep the ordinary `{code,severity,path,message}` envelope:
raw absolute paths in the core and existing relative presentation at the faces.
Append these workspace findings after item scope filtering, so scoped and
unscoped doctor calls both report them once. Retain normal advisory/strict exit
behavior; these codes do not join control/acceptance gate code sets. `--explain`
and `--converge` keep their existing dedicated behavior.

This extends m119/ADR-004 with another consumer, not a superseding resolution
policy. The pure doctor engine acquires no filesystem or process dependency.
The new module owns both extraction policy and probing; there is no separate
registry/configuration layer for a single fixed wiki surface.

## ADR-002: The memory page compiles delivered behavior without freezing live totals

**Status:** Accepted · **Date:** 2026-10-14

Rewrite memory.md against delivered milestones 148, 153 and 157 and the current
source modules. Explain semantic/procedural/episodic layers and every emitted
record type, source provenance, vocabulary/tags, the derived-index rule, active
backend selection, the six declared decision-recall edges, complete verdict
observations, recurrence and promotion, effectiveness, and retrospective evidence
gathering. Distinguish decision observations from recurrence/evidence collection.
Describe installed workflow behavior as delivered and retire the obsolete brief
verb from the main verb table. Use `memory status --json` for current totals and
backend, rather than asserting an evergreen numeric count or a repository-wide
constant backend. Explain none/local/graphify configuration as supported choices.

The optional Claude auto-memory section is already delivered and is excluded
from the rewrite by the SPEC; preserve that section byte-for-byte. Source links
elsewhere use current full project paths. Other top-level wiki pages receive
only proven stale-citation repairs, with no prose modernization. The inventory
currently requires none; a new finding requires an explicit story declaration
update before writing its page. Do not index wiki pages or modify memory code,
source records, authored workflow assets or their generated runtime copies.

## Breakdown and ownership

01 owns the doctor probe, command integration, behavioral tests and its registered
architecture control. 02 owns only memory.md and checks the complete wiki surface
at milestone acceptance. They have disjoint writes and no dependency on one
another; the final whole-wiki probe runs after both have landed. All milestone
dependencies resolve to done. No UI, new business policy, research spike or
additional runtime is introduced.

Read/write proposals are derived from subject files, these citations and test
ownership with graph coupling explicitly unavailable. The author subtracts the
unneeded conventional doctor suite in favor of the existing command-core suite,
and adds the existing resolver, grammar, runner and memory evidence sources.

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-16101 | The wiki probe uses the shared citation grammar/resolver and stays at the impure command boundary; no second rename reader or executed cited source | pending `test/arch/command/acd-wiki-citation-resolver.test.mjs`, to be registered in `test/arch/command/index.mjs` by story 01; red probes bypass the resolver and sever the command call | ADR-001 |

The control lands with its subject, never under this work folder. Build records
the actual mutation and observed failure in VERIFICATION.md. Acceptance requires
the control to resolve and its registration and negative probe to pass.
