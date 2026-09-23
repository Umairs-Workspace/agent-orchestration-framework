# 137 · AOF.md has a template like every other record doc — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by the main-session govern command that accepts the
  item (aof:verify). States product STATE, never motive. An ADDITIONAL artifact: no identity
  frontmatter, never this item's record doc.
-->

## Delivered

### The AOF.md digest has a shipped template
`src/bundle/templates/milestone/AOF.md` declares the digest's eleven frontmatter keys in order (`source` and `importedAt` marked `# OMIT`) and its four sections, Intent, Scope, Decisions and Lessons, and `aof work update` installs it at `.aof/templates/work/milestone/AOF.md`; no native scaffold writes an `AOF.md`.

### Every imported digest is rendered from that template by one renderer
`src/work/digest-template.mjs` renders it for both the co-located write and the legacy-store path: keys in template order, a missing OMIT key dropped, sections in template order, a half that was not recovered left out, and `schema`/`aofVersion` stamped, so a fresh import never shows as stale.

### Validate holds every digest to the template's closed key and section sets
A digest record doc gets an error for a missing required key, an unknown key, an unknown section, a section out of order or a section that appears twice; the sets are parsed from the shipped template, not listed a second time.

## Assumptions

- **The contract is the shipped template, not the installed copy** — the renderer and validate both read `src/bundle/templates/milestone/AOF.md` through `readAssetText`, so an edited or stale `.aof/templates/work/milestone/AOF.md` changes neither.

## Gaps

### The superseded separate-store digest writer
- **Status:** open
- **Discharge condition:** `materializeImport`'s separate-store path is deleted, or production code calls it again.
Only tests reach this path, and it survives because the co-located rule superseded it; it now renders through the one renderer, so it cannot drift from the contract.
