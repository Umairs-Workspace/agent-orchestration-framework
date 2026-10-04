// THE ARCH/EXAMPLES CONTROLS — this directory's index, and the ONE place its membership is written
// down (119/03, ADR-010). A new control here is one import and one spread IN THIS FILE, and
// `scripts/test.mjs` is unchanged by its arrival. Membership is IMPORTED AND SPREAD, never derived.

// milestone 134 / story 02 — FF-13402 (the example map's grammar has one home).
import { archTests as acdExampleMapSingleHomeTests } from "./acd-example-map-single-home.test.mjs";
// milestone 134 / story 03 — FF-13401 (the harness's answer has one reader) and FF-13404 (the settle
// reads the transcript store that exists).
import { archTests as acdExampleAnswerOneReaderTests } from "./acd-example-answer-one-reader.test.mjs";
import { archTests as acdSettleReadsTheTranscriptStoreTests } from "./acd-settle-reads-the-transcript-store.test.mjs";
// milestone 134 / story 04 — FF-13403 (with the examples gate off, the doctor and the door are today).
import { archTests as acdExamplesOffIsTodayTests } from "./acd-examples-off-is-today.test.mjs";
// milestone 135 / story 01 — FF-13501 (the practice's package is depended on one way).
import { archTests as acdSbePackageOneWayTests } from "./acd-sbe-package-one-way.test.mjs";
// milestone 135 / story 04 — FF-13502 (the trace is declared, never inferred).
import { archTests as acdExampleTraceDeclaredTests } from "./acd-example-trace-declared.test.mjs";

export const tests = [
  ...acdExampleMapSingleHomeTests,
  ...acdExampleAnswerOneReaderTests,
  ...acdSettleReadsTheTranscriptStoreTests,
  ...acdExamplesOffIsTodayTests,
  ...acdSbePackageOneWayTests,
  ...acdExampleTraceDeclaredTests,
];
