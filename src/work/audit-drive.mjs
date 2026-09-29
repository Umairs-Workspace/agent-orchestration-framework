// Transitional child launcher; the work package owns control execution.
import { pathToFileURL } from "node:url";
import { runAuditDriver } from "@aof/work/programs/audit-drive";

const invokedDirectly = process.argv[1] != null && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  await runAuditDriver();
}
