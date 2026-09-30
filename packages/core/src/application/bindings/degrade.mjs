// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createDegradeReporter } from "@aof/foundation/degrade";

export function assembleDegrade({ diagnosticsLogServices, env }) {
  // Application diagnostic policy and the legacy test-reset API. The reusable reporter
  // has no mesh dependency; core supplies the same durable log destination as before.

  const { createApplicationLogSink } = diagnosticsLogServices;

  const createSink = proc => createApplicationLogSink(proc, { env });
  let reporter = createDegradeReporter({ createSink });

  function setDegradeSinkForTest(factory) {
    reporter = createDegradeReporter({ createSink: factory ?? createSink });
  }

  function reportDegrade(code, error, extra = {}) {
    reporter.reportDegrade(code, error, extra);
  }

  return { setDegradeSinkForTest, reportDegrade };
}
