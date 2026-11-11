# 153/02 · Lessons name recurrence and promotion — Outcome

## Delivered

### Forward lesson metadata
From each retrospective's `promotionFrom` watermark onward, a lesson's meta line carries `**Promoted to:** control:<id> | rule:<path> | prompt:<path> | none` and an optional `**Recurs:** <item>/R<n>`. Both are held by the memory-vocabulary validate rule and indexed into the lesson's `status` and `tags`. Lessons below the watermark are never rewritten.

### Calibrated recurrence matching
`aof work memory recurrence "<text>" --exclude <item>/R<n> --json` scores the text against every indexed lesson, across kinds. It names `qualifying` only when a score is strictly above threshold 0.23 (calibration `153.02-1`). The result always carries the threshold and the calibration version. The matcher shares no code with retrieval, so base ranking is unchanged (FF-15302).

- **Labelled basis** — the threshold holds only as long as `test/arch/memory/fixtures/recurrence-pairs.json` and its frozen split stand. A change to the weights or the rule bumps the calibration version and re-measures.

## Gaps

### Paraphrased and prose-only recurrences
- **Status:** open
- **Discharge condition:** a matcher or parser story amends ADR-002 so restated lessons and fieldless prose lessons can be scored on their full text.
A lesson restated in different words (scores 0.02–0.08), or written as free prose that is indexed by its title alone, does not qualify. Marking it `Recurs` stays the author's manual act.
