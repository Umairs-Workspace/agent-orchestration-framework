# Writing a practice's prose — slots and fragments

A practice adds prose to a command or a role brief through a **slot** and a **fragment**. The
command marks a slot where prose may go. The practice's own package declares a fragment that fills
it. A project is given the fragment only when it has turned the practice on in its own config, so a
project that has not turned it on never loads a sentence of it.

Why it works this way is recorded in
[`wiki/work/192_milestone_buildable-commands/ARCHITECTURE.md`](../work/192_milestone_buildable-commands/ARCHITECTURE.md)
(ADR-001 to ADR-004). This page only says how.

## 1. Mark a slot in the command

A slot is one line, alone on its line:

```markdown
<!-- slot:contract.discovery -->
```

A name is lower-case words joined by dots and hyphens. A name appears at most once in one text.
Any other line, such as `<!-- slot:Contract -->` or a marker with text beside it, is ordinary text.

The line above the marker decides its shape:

- A **block slot** has a blank line above it. Its fragments are joined by one blank line. With
  nothing on, the marker line and the blank line above it are removed.
- An **inline slot** has text on the line above it. Its fragments are joined by a newline. With
  nothing on, only the marker line is removed.

Either way, an empty slot leaves nothing behind: no heading, no marker, no "skip this" sentence.

A slot added to a command goes into its Codex text too: the Codex variant's body, or its attached
`procedure.md` section, carries the same marker at the same place. A Codex text may also carry a
slot the common source does not, filled for Codex alone.

## 2. Declare the practice and its keys

A practice is declared once, in its package's `assets/bundle.json`, with the config keys that turn
it on. The keys live here and nowhere else; a fragment names its practice, never its keys.

```json
{
  "practices": [
    {
      "id": "notes",
      "title": "Notes",
      "summary": "Adds a notes beat to refine.",
      "keys": ["work.notes.enabled"]
    }
  ],
  "members": [
    {
      "id": "notes-refine",
      "kind": "fragment",
      "practice": "notes",
      "target": "command:refine",
      "slot": "contract.notes",
      "file": "fragments/notes/refine.md",
      "variants": { "codex": { "file": "fragments/notes/refine.codex.md" } }
    }
  ]
}
```

An id is unique across every package. A practice must name at least one key.

## 3. Declare a fragment

A fragment is a member of kind `fragment`. It names its `practice`, its `target` as
`<kind>:<id>` (`command:refine`, `agent:aof-qa`) and its `slot`, as in the specimen above.

Its body lives in its own package, under `assets/`. The convention is
`fragments/<practice>/<target>.md` for the common body and `<target>.codex.md` for Codex.

- `file` is the common body, used by Claude Code and OpenCode.
- `variants.codex.file` is the Codex body. A Codex body is written by hand, in that runtime's own
  wording (the native question tool, not `AskUserQuestion`; `$aof-verify`, not `aof:verify`).

One file may hold several slots' bodies, each under its own line:

```markdown
<!-- fragment:contract.notes -->
The notes beat, as it reads in refine.

<!-- fragment:output.notes -->
  - One indented bullet, kept as written.
```

A fragment takes the section named after its slot, or the one `section` names. Blank lines at
either end of a body are dropped; nothing else is, indentation included.

## 4. Order and replacement

Within one slot, fragments keep a declared order: by the package's place in the registries (core,
then integrations, then practices, each in registration order), then by the member's place in its
package's `members`. The order of keys in a project's config never matters.

A fragment may replace another with `"replaces": "<fragment id>"`. It may replace only a fragment
of its own package, in the same target and slot. When both are on, the replaced one is dropped and
the replacer stands at its own position. When the replacer is off, the original renders as if
nothing replaced it.

## 5. What is refused at load

The bundle refuses to load, naming the member and its package, when:

- a fragment names a practice, a target or a slot that nothing declares or carries;
- a runtime's texts carry the slot and the fragment has no body for that runtime, or the fragment
  has a body for a runtime whose texts do not carry it;
- a body file or its section is missing;
- a `replaces` names another package's fragment, another slot, or nothing;
- a practice has no keys, or its id is declared twice;
- a slot name is repeated in one text, or a common source's slot is missing from a Codex text.

## 6. How a project turns a practice on

A key is on only when it holds the boolean `true` in the project's own config file,
`.aof/aof.config.json`. `false`, `"true"`, `1`, an object and an absent key are all off. The
machine-wide config is never asked, because rendered commands are committed and two clones of one
commit must render the same commands. A practice with several keys is on only when every one is.

After changing a key, the project runs `aof work update`. It re-renders the commands the change
touches and reports each `updated`; a command a person has edited is a drift warning, left as is.
`aof work update` lists each optional practice, whether it is on, and its keys (`practices` in
`--json`); `aof work init` does not. Each render records which practices it was built with in the
lock's `work` section, and `aof work doctor` compares that record with the project's config and
reports a key changed since the last update, naming the key and the commands: `practice-render-stale`
is an error for a practice on but rendered off and a warning the other way round, and an install
with no record gets one `practice-render-unrecorded` warning. The update clears each.

## 7. Ship a template variant

A practice that changes a document's form ships its own version of one template file: a member of
kind `template-variant` naming its `practice`, the `template`, the file's `name` and its own `file`:

```json
{
  "practices": [{ "id": "notes", "title": "Notes", "summary": "Adds a notes map.", "keys": ["work.notes.enabled"] }],
  "members": [{ "id": "notes-examples", "kind": "template-variant", "practice": "notes",
    "template": "story", "name": "EXAMPLES.md", "file": "templates/notes/EXAMPLES.md" }]
}
```

When the practice is on, `.aof/templates/work/<template>/<name>` holds the variant, stamped as every
template is; when it is off, the default is installed there, unchanged. A variant of a file the
template does not hold is refused at load. Two variants of one file cannot both be on: the update
is refused, naming both, and writes nothing. A person's edit to an installed template is a drift
warning, as for any managed file, and is kept as they wrote it.
