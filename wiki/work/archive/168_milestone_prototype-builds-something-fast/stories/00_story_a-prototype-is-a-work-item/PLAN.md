# 00 · A prototype is a work item — build plan

## Mechanism

**Collapse the map before adding the type** (ADR-002). `RECORD_DOC_BY_TYPE` goes in the pure
identity leaf. `recordDoc` keeps only the milestone's AOF.md-first branch and reads every other
answer from the map; the two doctor copies and the ratchet's copy import it and are deleted.
Do this as its own green step, then add `prototype → PROTOTYPE.md` as one entry. FF-16801
proves no fifth copy appears.

**The grammar** is two regex alternations (`ITEM_RE`, `BACKLOG_ITEM_RE`). Leave `isDriver` and
`isDependTarget` alone: a prototype answering false to both is what keeps it out of `nextWork`
and makes a `depends:` naming one the existing unresolved finding.

**The lifecycle** sits beside the frozen five in `lifecycle.mjs`: `PROTOTYPE_STATUS`,
`PROTOTYPE_STATUS_EDGES`, `statusVocabularyFor(type)` and `itemStatusEdges(from, type)`. Every
caller that passes no type keeps today's answer. `setItemStatus` already receives the item, so
it passes `item.type` to both checks; its invalid-status message names the vocabulary it used.

**Validate** keeps the native frontmatter branch and swaps `VALID_STATUS.has` for the per-type
vocabulary. A prototype branch after it reads `PROTOTYPE.md`'s headings and the folder's
`STATE.md` headings and reports a missing one, a present `depends:` or `parent:`, and an Intent
or Wants still holding the template's placeholder text. The doctor's coherence lane returns
early for a prototype, before any lifecycle check runs.

**The templates** follow the chore template's shape: no leading `aof-generated` comment, a
`## Hand-off` placeholder sentence that 01's stop refusal can match exactly. Declare them in
`bundle.json` as template `prototype` so `aof work update` renders them into
`.aof/templates/work/prototype/`, where the scaffold reads them.

## Verification step

In an isolated `AOF_GLOBAL_HOME` and a temp work tree, hand-write `169_prototype_demo/` with a
well-formed pair and run the CLI: `aof work find 169 --json` names type `prototype`;
`aof work status 169` lists `paused|done|abandoned`; `aof work validate` exits 0; flip the
status through all four words and validate after each. Then delete `## Shortcuts` and see exactly
one finding. A green validate with the heading deleted means the prototype branch never ran.

## Out of scope

- The verb that writes these folders — 01.
- The board's handling of the four words — 03; `api.ts` is not touched here.
- Archiving a done prototype — not in this milestone.

## Known traps

- `VALID_STATUS`'s five words and order are destructured by `knowledge/src/import/recovery.mjs`;
  add a new set, never edit that one.
- The ratchet's copy reads the map at module load; import it, do not re-derive it.
