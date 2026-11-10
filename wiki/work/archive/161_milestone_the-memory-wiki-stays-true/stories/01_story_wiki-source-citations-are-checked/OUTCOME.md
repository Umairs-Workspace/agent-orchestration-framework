
# 161/01 · Wiki source citations are checked by doctor — Outcome

## Delivered

### Wiki source citations are a doctor finding
`aof work doctor`, scoped or unscoped, reads every Markdown page directly inside `<project root>/wiki`. It reports each cited local `src/` file that resolves to no current file through `resolveCitedPath` and the recorded rename history as one `wiki-source-unresolved` warning per page and file, naming the first occurrence's line.

### An incomplete scan says so
An unlistable wiki directory, an unreadable page, or a Markdown symlink pointing outside the project is a `wiki-source-unreadable` warning that claims nothing about that input's citations. A project with no `wiki/` directory reports nothing new.

### Existence is a stat, never an import
A cited source file is checked for existence as a regular file inside the project. It is never imported or executed. A directory, an external URL, a glob family, a non-source path and a path that traverses outside the project never count as a resolving source citation.

## Assumptions

- **Warnings stay advisory** — both codes are severity `warn`, so they fail only `aof work doctor --strict`, never an ordinary doctor run or the accept door.
- **The scan is direct, not recursive** — `wiki/work/` and other nested folders are outside the probe; the work stream's records keep their own gates.

## Gaps

### Line-number locators are not checked
- **Status:** open-by-decision
- **Discharge condition:** a milestone decides that a cited line past a file's end is a finding (161/ADR-001 chose file-only resolution).
A citation such as `src/x.mjs:9999` resolves whenever the file exists, however many lines it has.
