# 157/03 · A retry, a triage and a retrospective recall what happened before — example map

## R1 · A retried build acknowledges its prior attempt before building
- E1 · Story 39/02 on attempt 2, attempt 1 failed with `cap-exhausted` and verify recorded F-02: the build record names both before any implementation, and one `continue-episodic` observation is submitted [proposed]
- E2 · The same story on attempt 1: no episodic recall and no `continue-episodic` observation [proposed]
- E3 · Attempt 2 with memory off: the build record says the prior attempt is unavailable, and an empty observation is submitted [proposed]

## R2 · A finding is triaged against the stream's prior findings
- E4 · A new finding on item 41 matches 39/02's F-01 by cause: triage cites 39/02 F-01 and the finding stays open for a person to close [proposed]
- E5 · The recall returns only the finding being triaged: it is excluded, and triage records a distinct incident [proposed]

## R3 · The retrospective's evidence comes through recall
- E6 · An item with 3 findings, 2 raw feedback and 4 terminal runs: the retrospective cites all 9 from one `--all` recall [proposed]
- E7 · Memory off: the retrospective reports its episodic evidence unavailable rather than reading the raw files [proposed]

## Questions
- Q1 · technical · defaulted ADR-004 · Should a matched prior finding close the new one automatically?

<!-- No business question remains: the SPEC names both edges and the retrospective path;
     ADR-004 settles duplicates as human/agent judgement. Examples stay proposed. -->
