# Build brief — 01 · One enumerator, three roots

Advisory, the builder's own. The task features are the contract; this is the shape of the change.

## The mechanism

The seam is `listItems` — the one function the 302 importers of the work module already reach the
stream through, and the only place a directory listing is turned into item rows. The change is a
walk of two more roots inside that one function: a recursive descent under `backlog/` whose leaf
folders match the new un-numbered grammar (a second exported constant beside the existing regex,
plus the two root names exported once), and a flat scan of `archive/` that reuses the existing
top-level + stories walk verbatim and stamps the row. Everything else in the story is REMOVAL or
a guard: the two private copies of the item regex become imports; the work-root scanners either
call `listItems` (observe's three functions, migrate-folder's mint → `appendPosition`, freshness's
roadmap lane → `snapshot.items`) or are named on the allow-list with the reason the feature gives
(doctor's ORPHAN lane — the one reader that must see what the enumerator drops; provenance, a
SYNCHRONOUS resolver that cannot await; ratchet; and the three foreign-tree scans). Doctor's
snapshot gains the archive listing and the two backlog shapes as new fields that DEFAULT to empty,
so the literal snapshots three suites build stay valid.
The filtering rule is one exported predicate over ENUMERATOR rows; the scheduling walkers call it,
the resolving readers do not. `listStream`/`findWork` keep the frozen seven keys on live rows and
add `number: null` + `backlog` / `archived: true` only on rows from the new roots; `read.mjs`
threads `all` to `listStream`; `list.mjs` grows the `--all` flag.

Two sites carry a decision the features spell out: `appendPosition` counts every NUMBERED row
(live + archived — a number is never retired); `selectAffected` shifts live rows only.

Order that avoids grinding: (1) regex constant + root names + predicate + the three-root walk with
the three-root fixture (task 00's preamble), and the new enumerate suite; (2) retire the copies and
the scanners one file at a time, running that file's owning suite after each (they are in
`files:`); (3) thread the predicate through `nextWork`, `listStream` (+ `--all` on the face and
`read.mjs`) and rewrite `recent.md`'s step 1; (4) validate/doctor's backlog rules and the orphan
lane; (5) sweep the `.number` sites last — write FF-12702 first and let it name each unguarded
site. Land the three arch-tests with their subject and register each in `test/arch/work/index.mjs`.

## The verification step

Over the three-root fixture: `aof work find delta --json` returns the row with `number: null` and
`backlog: "ideas"`; `aof work find 05 --json` returns it with `archived: true`; `aof work next
--json` names `10/00` and `11` only; `aof work list --json` names the live rows then the backlog
rows and no archived row; `--all` appends `05`, `05/00`, `06`; `aof work validate` is `[]` and `aof
work doctor` reports no `orphan-folder` for the roots. Then FF-12701 / FF-12702 / FF-12706 are green
in a focused run of `test/arch/work/index.mjs` (under `AOF_GLOBAL_HOME=$(mktemp -d)`, never the full
suite), each with its red probe recorded in `VERIFICATION.md` (task 05).

## Out of scope

The verbs that create either root's contents (02, 03); the cache row shape and the board (04);
`promote --at`'s refusal over archived numbers (02); doctor's scope grammar (a backlog slug already
resolves through `itemInScope`'s slug branch).
