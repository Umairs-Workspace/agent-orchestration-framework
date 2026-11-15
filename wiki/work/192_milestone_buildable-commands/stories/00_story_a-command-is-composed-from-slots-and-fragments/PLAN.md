# 192/00 · A command is composed from slots and fragments — build plan

## Mechanism

Everything hangs off the loader. `readDescriptor` already appends each contributor's bundle
fragment to core's descriptor; it now also collects each fragment's `practices` list and accepts
members of kind `fragment`. `loadBundle` takes a `config`, asks one pure function which practices
are on, and composes every text of every member before it returns: the common body, each runtime
variant's body, and each associated file. Nothing downstream changes shape. A resource still has
a `body` and `runtimeVariants`; they just no longer hold a marker.

Keep the new module pure and small: the marker grammar, `practiceStates`, the selection of a
slot's fragments (order, then `replaces`), and the two-shape composition of one text. The loader
does the reading, through the asset seam it already uses for a variant's section, and hands the
module strings. Read a fragment's body the way `variantText` reads a section, but do not trim
spaces: only blank lines at either end go. The first line's indentation is part of the body.

The config comes from the callers that have a project. `synthesizeBundleConfig` reads the
project's file today, after the bundle is loaded; turn that around so init and update read the
config first and load with it, and keep it the one config read on the render path. The loader's
default is an empty config, which is what the manifest generator and the Cowork plugin get.

Validation belongs in the load, beside the duplicate-id refusal, and follows its wording: name
the member and the contributing package.

## Verification step

Initialise a scratch project from a fixture bundle with one slotted command and one practice,
under its own `AOF_GLOBAL_HOME`. Render it three times: key absent, key `true`, key removed
again. The second must hold the fragment where the marker stood; the first and third must be
byte for byte the same and hold neither the fragment nor a marker. Then run the shipped bundle's
manifest check: every hash must be unchanged, because no shipped source has a slot yet.

A wrong build shows as a marker in a rendered file, as a doubled blank line where an empty block
slot stood, or as a changed hash in the shipped manifest.

## Out of scope

- Any slot in a shipped source, and any shipped practice — 192/02.
- Template variants — 192/01. Leave the template half of the loader alone.
- The lock record, the doctor lane and the update's list — 192/03. `practiceStates` is written
  here because the composition needs it; nothing here records or prints its answer.
- One source for the Claude and Codex bodies — the SPEC rules it out.

## Known traps

- `variantText` trims a section. A fragment body read through it loses the indentation of its
  first line, and a bullet's continuation paragraph falls out of its list item.
- The Codex body of a mapped command is an associated file, not `body`. Compose those too, or the
  Codex procedure keeps its marker.
- `cowork-plugin.mjs`, `bundle-manifest.mjs` and `orchestrator.mjs` read the loaded bundle without
  passing through the synthesis. That is why composition is the loader's.
- The update's test seam hands in a bundle that is already loaded. Once the loader composes, a
  fixture practice can only be turned on and off by the project's config if the seam hands in
  something the update can load with that config: a descriptor, or a function of the config.
- Two directory budgets move in this story's diff, each with its reason: the row for the
  directory the new module joins, and an exemption for the new arch subject directory. The
  budget control fails without both.
