// Application diagnostic policy and the legacy test-reset API. The reusable reporter
// has no mesh dependency; core supplies the same durable log destination as before.
import { createDegradeReporter } from '@aof/foundation/degrade';
import { createApplicationLogSink } from './diagnostics/log.mjs';

const createSink = proc => createApplicationLogSink(proc, { env: process.env });
let reporter = createDegradeReporter({ createSink });

export function setDegradeSinkForTest(factory) {
  reporter = createDegradeReporter({ createSink: factory ?? createSink });
}

export function reportDegrade(code, error, extra = {}) {
  reporter.reportDegrade(code, error, extra);
}
