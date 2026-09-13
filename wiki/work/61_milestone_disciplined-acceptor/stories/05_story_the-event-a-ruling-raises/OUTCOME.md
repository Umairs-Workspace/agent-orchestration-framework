# 05 · The event a ruling raises — Outcome

## Delivered

### `harness.ruled` is a declared event with exactly one reactor
`EFFECTS` gained exactly one name and no tenth; its reactor set is one entry carrying a known locus
and an async `apply`, and the eight names already declared are byte-intact. The event is named for
what actually happens — the ruling, whether or not anything moved — because report-only is the
permanent steady state and an event called "changed" would leave every honest refusal untraced.

### The why travels with the change, and an incomplete record is refused
The ruling record carries the key, both values, the epoch, the evidence in the order it arrived, the
attained level, the counter-metric reading, the dwell declaration and who rendered it. The knob write
is surgical: every other key, its order, the file's indentation and its trailing newline survive a
write. No module in `src/` assigns at a declared tunable knob path outside that one seam.

### The ledger has ONE writer, and it is git-tracked beside the config it justifies
`src/work-acceptor/store.mjs` is the only module in `src/` that writes `.aof/acceptor-ledger.jsonl`;
the store is reached only from the seam and its reactor, and no command or face reaches it. The
ledger path is absent from `AOF_GITIGNORE_ENTRIES` — it is neither derived nor regenerable, and being
tracked is what makes the record reversible from git rather than merely present.

### The seam cannot report success with a knob written and no ledger line
The two halves are bound: a write that lands the configuration change without landing its
justification is not a state the seam can return.

### Redelivery changes nothing
Re-appending the same ruling identity yields a byte-identical ledger rather than a second line, and a
different record under that identity is refused — so at-least-once delivery cannot inflate the
evidence count the commit rule reads.

### An undeclared event name is refused, so the vocabulary's own comment is true for the first time
`applicableReactors` refuses an undeclared name with a code. Before this, a misspelled name appended
silently and resolved to zero reactors — a consequence quietly owed to nobody.

## Assumptions

- **The undeclared-name refusal is closed in the vocabulary's HOME, not in this milestone's seam** —
  one door for the act, per the ledger's own rule. Every `appendEvent` call site in `src/` is an
  admitted seam, and the set gained exactly the new one.
- **The refusal is a CONSTRUCTION refusal — it is thrown, so no event is produced at all** — and it
  is deliberately disjoint from the ruling lane's vocabulary.
