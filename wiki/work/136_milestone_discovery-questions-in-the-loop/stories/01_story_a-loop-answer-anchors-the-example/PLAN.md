# 136/01 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios. The read and write sets
are in `STORY.md`'s frontmatter and are not repeated here.

## The mechanism

**One more source inside `collectAnswers`** (`answers.mjs`). Today the loop over `readRuns(item)`
takes `run.brief.answers` from a settled run and the live transcript from a running one. Add, for
every run whatever its state, the records read from `run.asks` by a small pure helper beside
`readAnswers` (call it `readAskAnswers(run)`; it stays private unless a test needs it):

- skip anything that is not an array, and any entry that is not an object;
- keep an entry only when `answer` and `answeredAt` are non-empty strings and `question` is a
  string;
- read the token with `readMapToken(question)`; then refuse the entry if any LATER line of the
  question also answers `readMapToken` (split on `\n`, so a blank-line-separated second block is
  caught too). A token mid-line does not count;
- yield `{ token: mapToken(...), question, answer, toolUseId: null, sessionId: run.sessionId ?? null,
  at: answeredAt, entrypoint: null, by: entry.by ?? null }`.

The existing story filter, de-duplication and sort then apply unchanged, except that the de-dup key
for an ask is its run and `askedAt` (a harness record keeps `toolUseId`). No channel filter: the
operator ruled that every `via` counts (map Q1).

Do not touch `recordAnswers`, the settle seam or the doctor lane. The ask is already on the record.

**FF-13601** is a new case in `acd-example-answer-one-reader.test.mjs`, beside FF-13401. Over
comment-stripped `packages/specification-by-example/src/**`: a property read of `asks` appears only
in `answers.mjs`, and only inside `collectAnswers` or the helper it calls; and `answers.mjs` holds no
regular expression naming an `[EQ]` id of its own. Keep the detector simple and record the red
probes the task names in `VERIFICATION.md`.

## The verification step

`node scripts/test.mjs --only test/examples/example-answers.test.mjs test/arch/examples/acd-example-answer-one-reader.test.mjs test/examples/doctor-examples-lane.test.mjs test/examples/continue-door-examples.test.mjs`
with `AOF_GLOBAL_HOME` isolated. The doctor-lane and door suites are importers of the collector and
must stay green untouched. The fixtures already build run records under a temp item; add `asks`
entries in the shape `answerRunAsk` writes.

## Out of scope

131's ask writers and verb, the settle stamp, the doctor lane's codes, and the refine prose (02).
