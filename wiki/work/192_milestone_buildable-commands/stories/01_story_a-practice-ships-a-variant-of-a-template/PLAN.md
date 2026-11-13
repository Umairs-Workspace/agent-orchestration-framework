# 192/01 · A practice ships a variant of a template — build plan

## Mechanism

A template member is a directory, and the loader lists its files; the renderer then reads each
file and writes it under the project's template folder with the stamp in front. The variant
hangs off that one step. The loader accepts a member of kind `template-variant`, checks that the
template and the file it names exist, and keeps it beside the template. When the bundle is loaded
with a config, the variants whose practice is on are resolved against the template's files: for
a file with one variant on, the text is read from the variant's own file, in its contributor's
asset class; the output path, the stamp and the manifest entry are the default's.

Ask which practices are on through the function 192/00 wrote, and nowhere else. The two-on
refusal is raised where the variants are resolved, so a dry run meets it too and nothing has
been written when it fires. Follow the existing output-conflict refusal for its wording.

Because the path never changes, there is no new action to classify. The engine already answers
`update` when the desired text differs from the recorded one, and a drift warning when the file
on disk is not what the lock recorded.

## Verification step

Initialise a scratch project from a fixture bundle that holds the shipped story template and one
variant of its example map. Update with the key absent, on, and absent again. Read the installed
file each time: default, variant, default, and the first and third must be the same bytes. Then
turn on a second fixture practice with its own variant of the same file and update: it must
refuse and leave the lock's recorded hash for that file as it was.

A wrong build shows as the variant written to a second path beside the default, as two manifest
entries for one file, or as an update that picks one of two variants and says nothing.

## Out of scope

- Shipping a variant — milestone 193 ships the first two.
- A variant that replaces another practice's variant — nothing needs it yet, and two on at once
  is refused so the question stays visible.
- Not installing a template at all when a practice is off — the defaults stay everywhere.

## Known traps

- The template renderer is called from three places, and one of them renders with no config.
  Resolve variants when the bundle is loaded, so the renderer stays a plain loop.
- A variant's file lives in its contributor's package. Reading it from core's asset class finds
  nothing in a packaged build, and finds the wrong file in dev if a name collides.
