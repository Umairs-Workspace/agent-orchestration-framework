# 205/00 · One portable fixture exposes stream and CLI drift — example map

## R1 · The same logical seed exposes every supported work shape
- E1 · Listing all of orchard includes archived 30, backlog queued and the standalone task 14 as well as the nested stories under 10 [proposed]
- E2 · The four prototypes 15–18 expose active, paused, done and abandoned, while the governed items collectively expose all five governed statuses [proposed]
- E3 · In an independently seeded copy, 10/00 is ready and 10/01 waits for 10/00 [proposed]

## R2 · A comparison detects the smallest observable drift and can be replayed
- E4 · Two fresh runs of the same read in the same configured layout compare cleanly, including the final newline [proposed]
- E5 · Dropping one trailing space from a document or one byte from an attachment in a scratch expectation fails and identifies the artifact [proposed]
- E6 · Promoting queued under two different configured stream roots gives the same stream-relative delta and leaves both original seeds intact [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-001 · How are CLI channels, fixture time and the global journal handled while comparing stream evidence?
