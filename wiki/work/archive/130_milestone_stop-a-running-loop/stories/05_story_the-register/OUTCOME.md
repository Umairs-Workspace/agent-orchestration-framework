# 05 · The register — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by aof:verify (the main-session govern command that
  accepts the item). States product STATE, never motive. An ADDITIONAL artifact: never the record doc.
-->

## Delivered

### Seven stop controls run on every suite run
FF-13001–FF-13007 live in three files under `test/arch/loop/` (`acd-loop-stop-request-single-home`, `acd-loop-stop-settles-the-run`, `acd-loop-stop-reaches-every-face`), registered by import and spread in that directory's `index.mjs`, 20 cases green, with FF-13007's cargo half in `supervision.rs`.

### Every control has been seen red
Each control's named mutation was applied in place, observed failing with the message recorded in `VERIFICATION.md`'s fitness register, and reverted byte-for-byte; the three with a sweep also carry a non-vacuity probe (a misspelt needle reds the sweep as reading the empty set).

### The budget table moved by exactly the register
The `test/arch/loop` row rose 59 → 62 by exactly the three files and the `src/loop` exemption's `why` names its new members, in this one story's hands.

## Assumptions

- **Cited halves are resolved, not re-run** — FF-13006's `fleetCurrentWorkLines` pin and FF-13007's cargo half are checked for existing and being registered; the cargo half runs under `cargo test`, not under the node runner.
- **FF-13003's importer-set leg is the one guard against a re-implemented route** — measured: the standing mesh-ui controls stay green when the declaration read is re-implemented inside `ui-serve.mjs`.
