---
doc: architecture
---
# 159 · Operator auto-memory source

Decide closed on 2026-10-12 after the operator answered 159/01 Q1. The ADR set
below is the basis for the single contract-authoring beat; no implementation is made here.

## ADR-001: Compose an opt-in source at the common record builder

**Status:** Accepted
**Date:** 2026-10-12

Add optional memory.sources, an array of unique values whose admitted member is
claude-auto-memory. Absent or empty preserves existing records and performs no
auto-memory discovery or reads. The none backend remains inert. No dependency
installation or active-project opt-in belongs to this milestone.

A knowledge-owned leaf reads the selected project's local memory/*.md. Core supplies
the existing claudeProjectsDir resolver using the workspace project root, not the
shell's incidental cwd. Honour CLAUDE_CONFIG_DIR. Do not enumerate other projects,
query workers or fall back to another user or checkout. An absent root is empty.

Compose once through buildRecords on whole-stream ingest, after existing records,
in deterministic filename order. Both local and graphify inherit it. Preserve
scoped-rebuild semantics: a work-item-only ingest contains no operator records.
Document that whole-stream ingest is needed to include them. Rebuild removes
deleted entries and, after disabling the source, all adapter records. No merging
or deduplication. One vertical story follows the shared-indexer/core-binding
coupling; unavailable graph evidence and the source-based boundary are in RESEARCH.

## ADR-002: Preserve procedural content without inventing source metadata

**Status:** Accepted
**Date:** 2026-10-12

The SPEC settles that nested metadata.type feedback or project emits a lesson with
owner operator and source <absolute path>:1. Exclude user, reference, unsupported
types, MEMORY.md's index body and entries without valid frontmatter. Keep why and
how-to-apply in full searchable body text. Do not index origin-session metadata.
Source prose is data and never commands or configuration.

Technical mapping: item and itemSlug operator:claude-auto-memory; filename
including extension as stable id; original type as a tag. Content edits do not churn
identity. Use name as title (filename fallback), description as summary (first
nonblank body line fallback). Fields absent from the source stay empty strings;
tags stay an array. Existing lesson -> procedural supplies the layer. No new record
shape or index version; key-absent behavior remains unchanged.

**Kind is near-miss for both admitted types.** On 2026-10-12 the operator answered
159/01 Q1, "Ok let’s go with your suggestion", accepting the fixed near-miss
mapping and original-type tag. This is an adapter policy, not a claim that the
source author labelled a historical event a near-miss. No content classifier runs.
Area, stage and status stay blank; conformance reports the blank area/stage honestly.
The source format does not define AOF metadata; arbitrary similarly named keys
do not override this mapping or the fixed operator owner.

Parse the measured frontmatter subset: a leading optional UTF-8 BOM, opening and
closing --- delimiters, LF or CRLF, top-level name/description scalars and nested
metadata.type. Accept plain, single-quoted and double-quoted scalar strings, including
colon characters inside quoted descriptions. Require the nested type; a top-level
type alone is not an eligible entry. A duplicate/conflicting recognized key or
malformed recognized value is diagnosed and skipped, not guessed. Do not claim a
general YAML implementation or install one for this bounded format. Unknown metadata
is ignored. A missing name/description uses the fallbacks above; an empty body is
valid when the entry has a nonblank name or description. With all three blank,
skip the unusable entry with a diagnostic. The original body survives unchanged
inside text (line-ending normalization is permitted), with title/description also
searchable. Metadata such as originSessionId is excluded from that searchable blob.

## ADR-003: External source resolution is a constrained read capability

**Status:** Accepted
**Date:** 2026-10-12

Only an enabled adapter record with the exact operator namespace may resolve an
absolute Markdown locator. Parse the final :1 without confusing a Windows drive
colon. The adapter branch treats a # inside a filename literally; only the exact
terminal :1 Markdown form is accepted, never :1#/pointer. Validate the source
against the selected memory root and its real path.
Refuse traversal, sibling-prefix tricks, JSON pointers and links/junctions out of
that root. Absolute locators on ordinary records remain refused. The adapter and
resolver share containment logic; existing work/import guards are unchanged.

Read regular Markdown entries, not linked directories, recursive descendants or
referenced attachments. Absent root is empty. Unreadable roots and malformed or
unreadable entries get visible, bounded diagnostics without raw personal content;
valid siblings remain ingestible. Missing/malformed data authorizes no extra read.

Diagnostics use the existing core-supplied reportDegrade service; extend its
injection at the existing binding, not a new output stream or record field. Tests
inject readers/reporters to exercise permission failures portably. Test data stays
under a synthetic CLAUDE_CONFIG_DIR and isolated AOF_GLOBAL_HOME. No fixture reaches
the operator's real home, and graphify tests inject the graph invocation seam.

No new store, source write, graph staging, remote call or mesh transport. Existing
derived indexes stay ignored. Graphify input stays the work stream alone; this
source's contents must never be sent to extraction.

## Fitness functions

| id | invariant | enforced by | source |
|---|---|---|---|
| FF-15901 | Disabled source makes no external reads; enabled records are deterministic, derived and read-only | `test/arch/memory/acd-auto-memory-source.test.mjs` | ADR-001 |
| FF-15902 | Only enabled adapter records resolve within the selected memory root; existing containment remains intact | `test/arch/memory/acd-auto-memory-source.test.mjs` | ADR-003 |
| FF-15903 | External content reaches neither graph extraction nor mesh; indexes stay ignored | `test/arch/memory/acd-auto-memory-source.test.mjs` | ADR-003 |

Register the suite in `test/arch/memory/index.mjs`, which scripts/test.mjs imports.

Controls land with the subject in the runnable tree. Required red probes: introduce
a read while disabled; accept a forged/escaping locator; stage an external canary
for extraction/transport. No execution evidence is claimed at refine.

## Recall decisions

Architect query: read-only operator auto-memory source adapter vocabulary node isolation,
with area architecture. Results: item 35 ADR-006 (adr), 49 ADR-009 (adr), 148 ADR-001
(adr), 52 ADR-004 (adr), 11 ADR-004 (adr). Honour item 148's vocabulary home and item
11's advisory graph boundary. Mesh admission, browser layout persistence and edge
grammar are irrelevant here. No near-miss returned. PO query: operator Claude
auto-memory feedback project ingest recall, scoped to item 159, returned empty.

Ledger observations: architect a089a0cc-6fb6-4ec2-b072-06baf40d4430;
PO fe71d2a7-bb31-40ee-83b7-144056bf7543. The results were retained without
rerunning recall; the observation timestamps record their later capture.
