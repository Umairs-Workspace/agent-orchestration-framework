---
doc: design
---
# 180 · One memory node in the config — Design

## Intent

The config editor gets a Memory section. It is the same kind of section as MCP Servers, Hooks,
Project Docs and Settings: one JSON node, edited in place, saved with one button, with the validator's
diagnostics underneath. An operator opens it to see what memory serves and to change it. If the
config still uses the old spelling, the section shows the new shape and says plainly that saving
will rewrite the old keys. That way, the editor itself never writes a legacy key. Nothing about the
other sections changes.

## Conformance source of truth

- **No mock exists yet** (asked at the refine review, see STATE). The binding checklist below is the
  source of truth. If the operator supplies a mock, it is committed under `mocks/memory-section.png`
  and becomes the source of truth for regions and components, and the checklist stays the source of
  truth for states.
- The sibling sections are the visual reference. `SectionEditor` (`apps/ui/src/config/App.tsx:835`)
  is the existing component, and the Memory section reuses it rather than adding a second layout.

## Render breakpoints

- The existing editor's two widths: the two-column layout above 1050 px and the single column below
  it (`max-[1050px]:grid-cols-1`). There are no new breakpoints.

## Screens / surfaces

### Surface 1 — the Memory section of the config editor (binding checklist)

**Layout regions, in order**
1. **The sidebar entry.** This is a fifth item in the "Expanded DSL" group, after Settings, labelled
   `Memory`, with the same icon size and row height as its siblings. Its count shows the number of
   keys in the node (for example `2` for `{ backend, corpora }`). It is shown only in project scope,
   like MCP Servers, Hooks and Project Docs.
2. **The header row.** The title is `Memory`. The hint is `Memory backend, corpora, the code graph's
   sharing and per-engine settings.` The Save button sits on the right, as in every section.
3. **The legacy notice.** This region appears only when the loaded config uses an old spelling. It
   is a bordered note, styled like the message area under the header. It lists each old key and its
   replacement, one per line (`graph.share → memory.graph.share`), and ends with
   `Saving writes the new shape.`
4. **The editor card.** The card title is `Memory`, and the description is `JSON object`. It holds
   the monospaced textarea with the node in the new shape. When the config uses an old spelling,
   the node is shown already rewritten.
5. **The validation panel.** These are the existing `ValidationPanel` rows for diagnostics whose
   path starts with `memory`. The legacy warnings are listed there with warning severity.

**Components**
- The existing `Button`, `Card`, `Textarea` and `ValidationPanel` primitives. No new component.
- The legacy notice reuses the message paragraph's classes (`rounded-md border border-border bg-card
  p-3 text-sm text-muted-foreground`).

**States**
- *Empty:* no `memory` key in the config. The textarea shows `{}` and the sidebar count is `0`. No
  notice.
- *Loading:* the editor's existing page-level loading state. This section has no loader of its own.
- *Error on save:* the first diagnostic's message appears in the message area, as in the siblings,
  for example a `memory-config-conflict` naming both paths, or an `invalid-memory-corpora`. The
  draft is kept.
- *Error on load:* a config the reader refuses (a conflict) still shows the node exactly as written,
  with the refusal in the validation panel. Nothing is rewritten in the textarea, because a
  conflict is the operator's to resolve.
- *Populated, new shape:* the node shown as written, with no notice.
- *Populated, legacy shape:* the node shown rewritten to the new shape, and the notice listing the
  moves.
- *Saved:* `Saved Memory` in the message area, and the page refreshes.

**Design ramp**
- The config editor's existing tokens and Tailwind classes. Dark and light follow the app theme, and
  the section adds nothing theme-specific.
