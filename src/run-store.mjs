// Compatibility composition; @aof/execution owns run services.
import { createRunStore } from "@aof/execution/runs";
import { reportDegrade } from "./degrade.mjs";

const implementation = createRunStore({
  reportDegrade,
  getAnswerTokens: () => import("@aof/work/examples/map"),
  readSessionAnswers: async (...args) => {
    const { readSessionAnswers } = await import("./work-examples/answers.mjs");
    return await readSessionAnswers(...args);
  },
});

export const COST_SOURCES = implementation.COST_SOURCES;
export const DEFAULT_PARK_MINUTES = implementation.DEFAULT_PARK_MINUTES;
export const EXIT_REASONS = implementation.EXIT_REASONS;
export const PRICE_TABLE_VERSION = implementation.PRICE_TABLE_VERSION;
export const SPEND_ENVELOPE_KEYS = implementation.SPEND_ENVELOPE_KEYS;
export const TOKEN_BUCKET_KEYS = implementation.TOKEN_BUCKET_KEYS;
export const answerRunAsk = implementation.answerRunAsk;
export const applyTransition = implementation.applyTransition;
export const completeRun = implementation.completeRun;
export const heartbeat = implementation.heartbeat;
export const isLegalTransition = implementation.isLegalTransition;
export const isRetryable = implementation.isRetryable;
export const isRunning = implementation.isRunning;
export const isStale = implementation.isStale;
export const mapVendorTokensToBuckets = implementation.mapVendorTokensToBuckets;
export const openRunAsk = implementation.openRunAsk;
export const parkRunAsk = implementation.parkRunAsk;
export const parseResumeAfter = implementation.parseResumeAfter;
export const priceVendorTokens = implementation.priceVendorTokens;
export const pruneRun = implementation.pruneRun;
export const readRuns = implementation.readRuns;
export const reclaimRun = implementation.reclaimRun;
export const reclaimStaleRuns = implementation.reclaimStaleRuns;
export const recordAnchorReading = implementation.recordAnchorReading;
export const recordAnswers = implementation.recordAnswers;
export const recordSessionId = implementation.recordSessionId;
export const retryReadiness = implementation.retryReadiness;
export const retryRun = implementation.retryRun;
export const rewriteRunItemRef = implementation.rewriteRunItemRef;
export const runNodeRecordPath = implementation.runNodeRecordPath;
export const runRecordPath = implementation.runRecordPath;
export const runsDir = implementation.runsDir;
export const settleRun = implementation.settleRun;
export const settleRunFromVendor = implementation.settleRunFromVendor;
export const shouldRetry = implementation.shouldRetry;
export const staleRunningRuns = implementation.staleRunningRuns;
export const startRun = implementation.startRun;
