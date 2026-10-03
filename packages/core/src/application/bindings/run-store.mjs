// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createRunStore } from "@aof/execution/runs";

export function assembleRunStore({ degradeServices, provideWorkExamplesAnswers }) {
  // Core composition; @aof/execution owns run services.

  const { reportDegrade } = degradeServices;

  const implementation = createRunStore({
    reportDegrade,
    getAnswerTokens: () => import("@aof/specification-by-example/map"),
    readSessionAnswers: async (...args) => {
      const { readSessionAnswers } = await provideWorkExamplesAnswers();
      return await readSessionAnswers(...args);
    },
  });

  const COST_SOURCES = implementation.COST_SOURCES;
  const DEFAULT_PARK_MINUTES = implementation.DEFAULT_PARK_MINUTES;
  const EXIT_REASONS = implementation.EXIT_REASONS;
  const PRICE_TABLE_VERSION = implementation.PRICE_TABLE_VERSION;
  const SPEND_ENVELOPE_KEYS = implementation.SPEND_ENVELOPE_KEYS;
  const TOKEN_BUCKET_KEYS = implementation.TOKEN_BUCKET_KEYS;
  const answerRunAsk = implementation.answerRunAsk;
  const applyTransition = implementation.applyTransition;
  const completeRun = implementation.completeRun;
  const heartbeat = implementation.heartbeat;
  const isLegalTransition = implementation.isLegalTransition;
  const isRetryable = implementation.isRetryable;
  const isRunning = implementation.isRunning;
  const isStale = implementation.isStale;
  const mapVendorTokensToBuckets = implementation.mapVendorTokensToBuckets;
  const openRunAsk = implementation.openRunAsk;
  const parkRunAsk = implementation.parkRunAsk;
  const parseResumeAfter = implementation.parseResumeAfter;
  const priceVendorTokens = implementation.priceVendorTokens;
  const pruneRun = implementation.pruneRun;
  const readRuns = implementation.readRuns;
  const reclaimRun = implementation.reclaimRun;
  const reclaimStaleRuns = implementation.reclaimStaleRuns;
  const recordAnchorReading = implementation.recordAnchorReading;
  const recordAnswers = implementation.recordAnswers;
  const recordSessionId = implementation.recordSessionId;
  const retryReadiness = implementation.retryReadiness;
  const retryRun = implementation.retryRun;
  const rewriteRunItemRef = implementation.rewriteRunItemRef;
  const runNodeRecordPath = implementation.runNodeRecordPath;
  const runRecordPath = implementation.runRecordPath;
  const runsDir = implementation.runsDir;
  const settleRun = implementation.settleRun;
  const settleRunFromVendor = implementation.settleRunFromVendor;
  const shouldRetry = implementation.shouldRetry;
  const staleRunningRuns = implementation.staleRunningRuns;
  const startRun = implementation.startRun;

  return { COST_SOURCES, DEFAULT_PARK_MINUTES, EXIT_REASONS, PRICE_TABLE_VERSION, SPEND_ENVELOPE_KEYS, TOKEN_BUCKET_KEYS, answerRunAsk, applyTransition, completeRun, heartbeat, isLegalTransition, isRetryable, isRunning, isStale, mapVendorTokensToBuckets, openRunAsk, parkRunAsk, parseResumeAfter, priceVendorTokens, pruneRun, readRuns, reclaimRun, reclaimStaleRuns, recordAnchorReading, recordAnswers, recordSessionId, retryReadiness, retryRun, rewriteRunItemRef, runNodeRecordPath, runRecordPath, runsDir, settleRun, settleRunFromVendor, shouldRetry, staleRunningRuns, startRun };
}
