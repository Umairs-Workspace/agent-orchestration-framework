---
doc: architecture
---
# 182 · Renumber decisions

## ADR-001 — Explicit vacant-slot renumber through the stream seam
Expose aof work renumber <ref> --to <number> [--dry-run]. The source is an exact live numbered ref; nested items stay under their parent, archived sources are refused, and occupied destinations (including archived numbers) are refused. No other item shifts. Plan every document edit before writing. The existing item-lock guard precedes the writer, and the existing stream.reindexed event carries the exact source/destination remap to run, Notion and mesh effects. Memory refresh follows the write and effects; its failure reports moved=true with a recovery command, never a false claim that no move occurred.

## ADR-002 — Current references migrate; historical evidence stays original
Rewrite work-owned Markdown/feature paths, qualified item/control/lesson citations, dependencies, child parents and moved headings. Do not globally replace bare numbers or source-code strings. Preserve runs, verification captures, observability and feedback ledgers as evidence; the existing run-ref reactor remains their typed identity writer. A dated .renumber-history.json records each map. Recall accounting follows only migrations after each observation's capture time, preserving original observation bytes and distinguishing later reuse of a number. Rebuild the full memory corpus after a move rather than an item-only index. Local lesson/control ids stay stable.

## ADR-003 — Guarded preflight and honest recovery
Dry-run is read-only, including memory and effects. All destination and document checks precede the move; stale planned bytes refuse. Ordinary write errors roll back edited documents and the folder. The process is not a crash-atomic filesystem transaction: an abrupt machine/process failure requires inspection of the source/destination and history before retrying, as with existing stream renumbering. Event/effect failures remain visible rather than being hidden by a successful folder rename. Only the selected item and references are changed; unrelated milestone numbers remain stable.

The new verb is CLI-only, like promote/archive: no board-host mutation route is introduced. Its entry in the route-coverage deferral set records that boundary.

## ADR-004 — Account for the new operation in structural budgets

The work source layer gains two modules: the single-item writer and a separate historical identity reader so read-side accounting never imports the writer. The work command and core binding layers each gain their one renumber face/wiring module. The stream test layer gains the suite for this new write act. The existing directory-budget rows rise only by those delivered counts (45→47, 38→39, 63→64, 37→38), with zero allowance and explicit reasons. No new unbounded family is introduced.

Prior recall 41/F-4102 identifies the existing insertion writer's inline-list assumption. This new verb handles inline lists and quoted scalar dependencies, and refuses unsupported block-list depends before mutation rather than leaving hidden stale edges. The shared frontmatter grammar and existing insert behavior are unchanged.
