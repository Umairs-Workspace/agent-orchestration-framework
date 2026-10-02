// The run store, built from `@aof/execution`'s own factory. Core's binding also hands it work's answer-token
// reader and session-answer reader; the suites that use this helper never reach either, so both refuse if
// called - a suite that starts to need them is a cross-package test and belongs at the root.
import { createRunStore } from "@aof/execution/runs";

const needsWork = (name) => () => { throw new Error(`the run store reached ${name}, which is work's: this suite is cross-package`); };

export const runStore = createRunStore({
  reportDegrade() {},
  getAnswerTokens: needsWork("getAnswerTokens"),
  readSessionAnswers: needsWork("readSessionAnswers"),
});
