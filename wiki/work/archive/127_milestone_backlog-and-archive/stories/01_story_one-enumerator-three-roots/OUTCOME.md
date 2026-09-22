# 127/01 · One enumerator, three roots — Outcome

## Delivered

### Three roots, one enumerator
`listItems` walks `<work.dir>` (the live stream, rows byte-identical to before), then
`<work.dir>/backlog/**` (groups at any depth; a leaf is a `<type>_<slug>` folder with no number,
never descended, never a task), then `<work.dir>/archive/` (`ITEM_RE` folders, name verbatim,
stories walked as at the root) — each root only when it is a directory, and a project with neither
root yields exactly the rows it yielded before.

### The row shapes
A backlog row carries `number: null`, `ref: <slug>`, `backlog: "<group path>"` (forward-slashed,
`""` at the backlog root); an archived row carries `archived: true`; a live row carries neither key
and the frozen seven-key `listStream`/`findWork` shape is widened only on the two new roots.

### One home for the grammar
`ITEM_RE`, `BACKLOG_ITEM_RE`, `BACKLOG_ROOT` and `ARCHIVE_ROOT` are each defined once, in
`src/work.mjs`; `src/work/doctor.mjs`, `doctor-freshness.mjs` and `src/work/reindex.mjs` import
them and define none. Six work-root scanners are allow-listed by path and reason in FF-12701
(doctor's orphan lane, routing's foreign form, recovery's foreign tree, migrate-folder's foreign
stories scan, provenance's synchronous resolver, ratchet); `observe.mjs`'s three scanners and
`doctor-freshness.mjs`'s roadmap lane now take rows from the enumerator, and `migrate-folder.mjs`
mints through `appendPosition`.

### One live-row predicate
`isLiveStreamRow(row)` ⇔ `row.number != null && row.archived !== true`, exported from
`src/work.mjs`. `nextWork`'s driver and story walks, `listStream`'s default path, `aof work list`,
`aof:recent` (through `aof work list --json`) and `insert-story --under` filter through it;
`findWork`, `validateWork`, `src/work/doctor.mjs`, `aof work read`, `depends` resolution and
`memory ingest` do not — an archived item resolves by its ref and satisfies the edge it is named
in, and `insert-story` refuses `insert-parent-archived` rather than scaffolding under `archive/`.

### `--all`
`aof work list --all` (and `listStream(workDir, { all: true })`) appends the archived rows after
the live and backlog rows; the default listing is live rows by number, then backlog rows by group
path then slug (plain string compare), and no archived row.

### validate and doctor over three roots
A backlog record doc must carry no `number:` and is otherwise checked as at the root; a backlog
row is neither a source nor a target in the depends graph; two backlog leaves sharing a slug are
one `backlog-slug-duplicate`; the numbering lanes run over every numbered row (archived included)
and no backlog row; `roadmap-folder-mismatch` counts an archived milestone as a folder and a
backlog milestone as nothing; the orphan lane knows both root names and walks the archive; the
scope grammar of doctor and validate reaches all three roots through the branches it already had.

### Every `.number` consumer is null-safe
The ten files holding a `.number` parse (asserted as the exact set by FF-12702) guard each site
within its enclosing function by `isLiveStreamRow`, a `!= null` test or a story narrowing;
`appendPosition` answers the highest number ever minted plus one over live AND archived rows (a
number is never retired), and `selectAffected` shifts live rows only.

### The three controls
FF-12701 (`acd-work-root-one-enumerator`), FF-12702 (`acd-number-null-safe`) and FF-12706
(`acd-next-walkers-exclude-archived`) are registered in `test/arch/work/index.mjs`, green, and each
observed red under the probe its register row names.

## Assumptions

- **A backlog slug is unique across the backlog tree** — a backlog ref IS its slug, so `findWork`
  resolves the first leaf it meets; validate's `backlog-slug-duplicate` is what makes a second one
  visible rather than silent.
- **A backlog slug is not all digits** — `milestone_12` is a leaf whose ref `"12"` collides with the
  numbered space and is unreachable through `findWork`'s numeric branch; the refusal belongs to
  `promote` (story 02).
- **The archive is flat** — an archived driver is a direct child of `archive/`; a nested or
  un-numbered folder there is neither a row nor a door, and the orphan lane names it.
- **The loop reaches the stream only through `work:next` and `work:list`** — `src/commands/loop.mjs`
  and `src/work/loop.mjs` import none of the four disk readers, which is the leg of FF-12706 that
  keeps the loop out of the walk.
- **Provenance stays synchronous** — `src/work-tune/provenance.mjs` keeps a `readdir` of its own
  (under the root and the archive) because its resolver chain cannot await `listItems`; it is an
  allow-listed keeper, not an enumerator.

## Gaps

### The cache-first row shape
- **Status:** open
- **Discharge condition:** story 04 lands `number: null` / `archived` on the projected row
  (`src/global-work-store.mjs` publishes every `listItems` row without them) and stops
  `cacheOnlyItem` (`src/work/read.mjs`) minting `number` from `ref`, so `nextWorkCacheFirst` on a
  peer node applies the same predicate the disk walk does.
On a peer node reading the cache, a backlog `delta` or an archived `05` row reads as live, and
`aof work next` there can propose it; the disk-walking `nextWork` cannot.

### `promote --at` over an archived number
- **Status:** open
- **Discharge condition:** story 02's `promote --at P` refuses when an archived item holds a number in
  the shift range, and decides explicitly whether a shift rewrites `depends:`/`parent:` in archived
  and backlog docs (`rewriteReferences` now re-lists all three roots).
`insert-milestone --at 5` over an archived `05` still re-mints the number today; the mint itself
(`appendPosition`) never does.

### The `aof.md`-carrying backlog milestone's digest message
- **Status:** open
- **Discharge condition:** `work.mjs`'s digest lane reads a backlog milestone's `AOF.md` through the
  `item.number == null` branch for the imported shape as well as the native one.
A backlog milestone carrying an `AOF.md` reports `digest milestone "" ≠ folder "null"` — a
message, not a wrong verdict.
