import { createFoundationServices } from './foundation.mjs';
export const defaultFoundation = createFoundationServices();
export const { reportDegrade, setDegradeSinkForTest } = defaultFoundation.degrade;
export const { applicationLogPath, createApplicationLogSink, readApplicationLog } = defaultFoundation.diagnosticsLog;
