# Build brief

## Mechanism

Four small edits around one fact — three new record types exist after 157/01:

- the layer map in `local-retrieval.mjs` names finding, feedback and run as episodic;
- both backends' status counters grow `findings` / `feedback` / `runs` so the legacy split still
  sums to `recordCount` (graphify keeps its lessons/adrs subset beside the full seam counts);
- `renderRecallBlock` puts an episodic record's summary on its line, keeping kind, area and tags,
  with source last — a lesson's or ADR's line must not change by one byte;
- recall honours the already-parsed `--all`: the whole scoped result, overriding `--limit`, with
  an empty query allowed. Ingest's existing `--all` meaning is untouched.

Tune is a classified non-consumer: no tune code changes. The regression proves its populations do
not double-count once the index holds episodic copies.

## Verification

Over an isolated temp stream with lessons and every episodic type, run status on local, graphify
and none; recall with and without `--all`; render a block before and after for a lesson. Assemble
the tune corpus with and without an ingested index and compare. Extend m148's layer-map-total
fixture with each new type and confirm it reds when one is left out of the map.

Run the declared suites with `node scripts/test.mjs --only <files>` under an isolated
`AOF_GLOBAL_HOME`.

## Out of scope

Record compilation and locators (157/01); workflow prompts (157/03); any new tune lane.
