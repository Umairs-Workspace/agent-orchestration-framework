# 165/01 · The planning skills render as a Cowork plugin — build plan

## Mechanism

Codex already turns a command into a skill: `mappedResource` and `mappedBody` in
`bundle-runtime.mjs` put a preamble about invocation and `$ARGUMENTS` in front of the command
body. Move the Codex wording into the codex mapping entry (`label`, the lines it emits), and
export one `commandAsSkill(resource, mapping)` that both runtimes use. Codex's call path must
produce exactly the bytes it produces today. Snapshot a codex render before the edit and compare
after.

`cowork-plugin.mjs` exports `renderPlanningPlugin({ version })`, which returns a file map. It
calls `loadBundle()`, takes the base (non-variant) `shatter` and `explain` resources, and renders
each through `commandAsSkill` with the cowork mapping. The output frontmatter carries only `name`
and `description`, with the description opening on the explicit invocation (E9). The stamp
`<!-- aof-generated: true; aof-runtime: cowork -->` goes after the frontmatter. The cowork
preamble lines are ADR-002's three rules: invocation and `$ARGUMENTS`, CLI-absent, and Markdown
only with no commit. Write them once, in the mapping.

`stored-zip.mjs` exports `zipStored(fileMap)`, which returns a `Buffer`. It writes local headers,
a central directory and an end-of-central-directory record, using method 0 and a CRC-32 table.
Entries are sorted by path, and the DOS time and date are fixed (1980-01-01 00:00). Paths are
UTF-8, so set general-purpose flag bit 11.

## Verification step

Render the plugin, zip it, and read the bytes back with an independent reader. `python -m
zipfile -l` is enough, or write a small central-directory walk in the suite. You should see
exactly three entries, with `.claude-plugin/plugin.json` at the root. Zip it a second time and
`Buffer.equals` must be true. Then strip the shatter skill's frontmatter and preamble: what is
left must `===` the body `loadBundle()` gives for shatter. A failure here means the mapping
re-wraps or trims the body, which is the drift FF-16502 exists to stop.

## Out of scope

- Writing files to `.aof/cowork/` or any lock entry. That is 165/03.
- The pm-skills packages. That is 165/02, which returns its own file maps.
- A `cowork` runtime for `aof work init`. The SPEC rules it out, so add no entry to
  `CAPABILITIES`.

## Known traps

- A comment placed before the frontmatter makes the frontmatter parse as empty, silently. Put the
  stamp after the closing `---`.
- `normalizeArgumentHint` already strips quotes and dashes. Reuse it rather than writing a
  second one.
