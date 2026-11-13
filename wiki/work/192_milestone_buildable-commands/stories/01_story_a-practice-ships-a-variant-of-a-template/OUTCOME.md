# 192/01 · A practice ships a variant of a template — Outcome

## Delivered

### Template variants in a bundle fragment
A bundle fragment can declare a `template-variant` member that names its `practice`, its `template`, the `name` of the one file it stands in for, and its own `file`. With that practice on (every key holding the boolean `true` in the project's own config), `.aof/templates/work/<template>/<name>` holds the variant, carrying the default's stamp and the default's single manifest entry. With the practice off, the default is installed there, byte for byte, and every other file of the template is the default too.

### Variants that cannot land are refused
A variant whose practice or template no bundle declares, whose file name holds a path separator or names a file the template does not hold, or whose own file is missing, stops the load, naming the variant and its package. Two variants of one file that are both on refuse `aof work update`, and its `--dry-run` too, naming both variants and the path, before anything is written.

### Moving between the two is an ordinary managed update
Turning the practice on or off reports the installed file `updated`. A file a person has edited is reported as drift and kept, as for any managed file.

### Author reference
`wiki/reference/practice-prose.md` §7 says how to ship a variant, and its specimen is one the loader accepts.

## Assumptions

- **Fixture-proved** — the mechanism is proved on fixture practices (`notes`, `memos`). At this story's close, no shipped bundle declares a variant, and the shipped templates install with the hashes the manifest records. Milestone 193's `EXAMPLES.md` and `RESEARCH.md` variants are its first use.
