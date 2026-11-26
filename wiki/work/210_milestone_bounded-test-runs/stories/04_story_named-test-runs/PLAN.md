# 210/04 · Named test runs — build plan

## Mechanism

Rewrite `runTest`'s front half as a form dispatch. Exactly one of these holds: positional suites
(named), `--suggest`, `--failed` (refuse as not-yet-available until story 05 lands; 05 replaces
the branch), or `--all`. Each form computes `selected` and then shares the existing back half
unchanged: record lookup, lock, light-entry launch, record write. Delete the `impacted` branch and
its refusals wholesale rather than adapting them. The `refused(...)`/`result(...)` helpers and the
summary line stay, and the summary loses the widening and resolution clauses.

The **named form** checks every name against the suite predicate. The predicate is now
`suites.mjs`: `isSuiteFile` and `isExcludedTest` moved out of `select.mjs`, with
`story-contract-derive.mjs`, `layout.mjs` and FF-19005's leg re-pointed. It passes `reason` and
`mode: "named"` to the record. **`--suggest`** reads the working-tree changed set from
`changed.mjs` (trim it to that producer and drop `committedFiles` and `--since`), hands it to story
01's scan, prints the result and launches nothing. **`--all`** asks an injected `storyWork()` seam
first. The core binding implements it with `AOF_RUN_ID` → `readRuns`/`isRunning` over the
checkout's story and task items. Then it runs with an empty selection, as `scope all` did.

The **core binding** stops composing `test-select` and the code-relations port (FF-21001), and
composes the importer scan instead. `toolchain.mjs` drops `couplings` and `via`, and refuses a
present `work.test.couplings` as `test-config-key-removed`. Drop the key from this repo's
`.aof/aof.config.json` in the same commit.

**Controls:**

- FF-21001 replaces the widens-never-narrows file in the index.
- FF-21002 rewrites the one-selector legs around `importers.mjs`.
- FF-21003 is a leg in reports-not-decides: an empty selection is passed to the runner only from
  the `all` branch.

Plant each control's red once and keep the message for VERIFICATION.

## Verification step

Here, with `AOF_GLOBAL_HOME` isolated:

- `aof test test/testing/test-run-record.test.mjs --reason probe --json`: one suite runs, and the
  record holds the reason;
- the same command again: answered from the record;
- `aof test --suggest` with `record.mjs` touched: a listing, no launch;
- `aof work run-start` on a scratch story, then `aof test --all`: refused, nothing launched;
- `aof test --scope impacted`: unknown flag.

`grep -rn "impacted\|couplings" packages/work/src packages/core/src` must be empty outside
comments that cite history.

## Out of scope

`--failed`, the chain and the baseline (05). The prose (00). The gate's own run cap (03).
