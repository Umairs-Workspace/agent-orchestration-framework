import { createApplication } from "aof/application";

// Reconstruct the configured store so persistence checks cannot reuse an in-memory instance.
export async function readRunsFromFreshApplication(item) {
  const application = createApplication();
  try { return await application.execution.runs.readRuns(item); }
  finally { await application.close(); }
}
