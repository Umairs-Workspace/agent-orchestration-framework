// THE ARCH/EXAMPLES CONTROLS — this directory's index, and the ONE place its membership is written
// down (119/03, ADR-010). A new control here is one import and one spread IN THIS FILE, and
// `scripts/test.mjs` is unchanged by its arrival. Membership is IMPORTED AND SPREAD, never derived.

// milestone 134 / story 02 — FF-13402 (the example map's grammar has one home).
import { archTests as acdExampleMapSingleHomeTests } from "./acd-example-map-single-home.test.mjs";
// milestone 134 / story 03 — FF-13401 (the harness's answer has one reader) and FF-13404 (the settle
// reads the transcript store that exists).
import { archTests as acdExampleAnswerOneReaderTests } from "./acd-example-answer-one-reader.test.mjs";
import { archTests as acdSettleReadsTheTranscriptStoreTests } from "./acd-settle-reads-the-transcript-store.test.mjs";

export const tests = [
  ...acdExampleMapSingleHomeTests,
  ...acdExampleAnswerOneReaderTests,
  ...acdSettleReadsTheTranscriptStoreTests,
];
