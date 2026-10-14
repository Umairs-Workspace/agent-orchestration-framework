# 157/02 · Every consumer accounts for the episodic pool — Outcome

## Delivered

### Status counts an episodic layer
`aof work memory status` puts `finding`, `feedback` and `run` under the episodic layer of the layer map. Both backends report the same partition, and every count sums to `recordCount`.

### Recall returns an item's whole history
`aof work memory recall … --all` returns every record in scope and overrides `--limit`; without it the limit still applies. A failed run's block line shows its `failureReason`, and a lesson's block line is unchanged.

### Lesson-only consumers stay lesson-only
Tune's corpus counts each lesson once over an ingested stream, and lesson recurrence never matches an episodic record.
