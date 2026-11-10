# 157/01 · Episodic records resolve to their sources — example map

## R1 · A declared finding becomes exactly one finding record
- E1 · A VERIFICATION Findings table row `| F-03 | major | … |` and a `### F-03` heading in the same register: one record, id F-03, source the first declaration, text holding both [proposed]
- E2 · A prose sentence citing F-03 outside the register, and an `F-04` inside a code fence: no record for either [proposed]
- E3 · Item 39/02 and item 41 both declare F-01: two records, told apart by their item [proposed]

## R2 · Only raw feedback becomes a feedback record
- E4 · A ledger with 2 raw, 1 classification and 3 recall rows: 2 feedback records [proposed]
- E5 · A raw row after a blank line keeps its physical line number, so line 4 is cited as `FEEDBACK.ndjson:4#` [proposed]

## R3 · Only a terminal run becomes a run record, carrying its stalls when known
- E6 · Runs in states done, failed, cancelled, running and queued: 3 run records [proposed]
- E7 · A failed continue run with failureReason `cap-exhausted`: stage `build`, status `failed`, failureReason in the summary [proposed]
- E8 · A run whose session has no matching observability agent: stalls reported unavailable, never 0 [proposed]
- E9 · A run whose matching agent has an empty stalls array: stalls reported as a known 0 [proposed]

## R4 · A record's source resolves to the exact value it came from
- E10 · A run source ending `runs/node-7297/20261011T183057623Z-0000.json#` resolves to that file's root object [proposed]
- E11 · A source `../../etc/passwd#` or an absolute path is refused, never read [proposed]
- E12 · A store written at index version 2 reports stale until the next ingest [proposed]

## Questions
- Q1 · technical · defaulted ADR-001 · Do cancelled runs count as terminal, or only done and failed?
- Q2 · technical · defaulted ADR-002 · Does a JSON source extend the record shape or the locator string?

<!-- No business question remains: the SPEC scopes the three types, terminal runs only and the
     stalls fold; the ADRs settle every engineering choice. Examples stay proposed. -->
