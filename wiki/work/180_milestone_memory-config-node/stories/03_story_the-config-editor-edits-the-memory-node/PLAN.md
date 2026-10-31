# Build brief

## Mechanism

The server half is `config-editor.mjs`.
- **Loading.** `loadEditableConfig` adds two fields to the payload in project scope. `memory` is the
  node the editor should show, which is what `sectionJson` renders. `memoryLegacy` is the `legacy`
  list:
  - when the raw config reads cleanly, call `rewriteLegacyMemoryConfig(raw)` and show its `memory`;
  - when `readMemoryConfig` refuses with `memory-config-conflict`, show `raw.memory ?? {}` as
    written and push the refusal into `diagnostics` at path `memory`.
- **Saving.** `saveEditableSections` accepts a `memory` key.
  1. Check the payload. Anything but a plain object is refused with `invalid-memory-section`. An
     object that carries a legacy key (`sources` or `graphify`) is refused with
     `memory-config-legacy-write` at that key's path, because the editor never writes the old
     spelling.
  2. Build the candidate config: the existing config, with `memory` replaced by the payload and the
     root `graph` deleted.
  3. Call `readMemoryConfig(candidate)`. A throw becomes `{ ok: false, diagnostics }`, carrying the
     error's code and path, and nothing is written.
  4. Otherwise write through the existing `baseConfig` merge, which spreads `...existing` first, so
     foreign sections survive.

  Drop `graph` from the spread explicitly. `baseConfig` does not name it, but `...existing` carries
  it.

The client half is `App.tsx`.
- Add `memory` to `SectionKind` and to `sections`, after Settings, filtered to project scope as its
  siblings are.
- `sectionCount` counts the node's keys, and `sectionSchemaHint` says `JSON object`.
- `sectionHint` uses DESIGN's text.
- In `SectionEditor`, render the legacy notice above the card when `payload.memoryLegacy` is
  non-empty: one line per move, then `Saving writes the new
  shape.` Diagnostics with a `memory` path already reach `ValidationPanel` through the existing
  path filter.

Watch for:
- The existing section save body is `{ [activeSection]: parsed }`, so `memory` arrives as its own
  key. Keep it that way. Do not route it through `executionSettings`.
- `setup-ui.test.mjs` mounts the real App against a fake fetch. Add the cases there, and add the
  pure save cases to `config-editor.suite.mjs`.

## Verification

Under an isolated `AOF_GLOBAL_HOME`, run `config-editor.suite.mjs` and the `setup-ui` surface suite,
then `yarn ui:build`. End-to-end: `aof work ui` (or the setup UI) over a temp project holding E2's
legacy config. Open Memory, see the notice, save, and read the file: the new shape, no `sources`, no
root `graph`. Take a screenshot of the populated-legacy state and the saved state for the designer's
DESIGN.md conformance judgement.

## Out of scope

`aof work update`'s migration (story 02). Any structured form. The section is the JSON editor its
siblings are.
