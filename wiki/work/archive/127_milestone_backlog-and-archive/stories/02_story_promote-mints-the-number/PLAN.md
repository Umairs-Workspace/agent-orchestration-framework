# Build brief — 02 · Promote mints the number

Advisory, the builder's own. The task features are the contract; this is the shape of the change.

## The mechanism

Promotion is three existing pieces in a new order. The slot-open that the top-level insert already
performs (count what shifts, gate it, re-index through the transition seam, leave the slot empty)
is the first; today it is followed by a template scaffold into the slot. Promote replaces the
scaffold with a RENAME of the backlog leaf into the slot and a surgical single-line stamp of
`number:` in its record doc — replace the bare line the CLI scaffold leaves, insert one after
`type:` when a prompt-authored doc has none; never a reserialise. The default position is the
existing highest-number-plus-one helper, unchanged. Before any of that runs, everything that can
refuse has: the slug resolves to exactly one backlog row, the doc's `depends:` names numbered items
(a backlog slug is a planning note, refused), and no number the promotion would write — `P` or a
shifted `n + 1` — is held by an archived driver.

The `insert-*` verbs then become the composition the other way round: scaffold into the backlog
(the number blank, the heading un-prefixed, the same templates and strip), promote at the
requested position. The composition lives beside promote, because it needs both halves and the
gate helper is imported the other way; the five callers change one import line. The nested story
axis is not part of this — a nested story is never a backlog leaf — so the nested run stays
where it is, and the shared insert module loses its top-level body and its depends arithmetic:
the engine's own reference rewrite reaches the backlog leaf before it moves, which is what makes
`--depends` come out post-shift with no arithmetic at all.

The intake setting is read on the write side only: the config half of init writes it into a
config it creates, promote's not-found text explains it, and the prompts read it to decide which
root a new folder is born in. Every prompt that computed "max + 1" stops; `refine` / `continue`
gain a step 0 that promotes a backlog ref and continues with the number. The phase door refuses a
backlog ref outright — a mint inside a dispatched run would read a worker's copy of the stream.

## The verification step

Over 01's three-root fixture: `aof work promote delta` moves it to the root as `12` and `find`,
`validate`, `next` and `list` agree on it; `promote delta --at 10` shifts 10 and 11 by one, lands
delta at 10 and rewrites the depends that named them in every root; `--at 5` is refused because
the archive holds 05; a backlog → backlog `depends:` is refused with the planning-note message.
Over the insert fixture: `insert-milestone x --at 2` produces byte-for-byte the tree that
scaffold + promote produces, and every delivered insert suite is green as written. FF-12703 and
FF-12704 green with red probes recorded; the shared insert module measured shorter than 638.

## Out of scope

Archiving (03); the cache/board shapes (04); this repository's own intake and archive (05); the
`promote-*-to-chore` loop verbs, which append to the stream unchanged.
