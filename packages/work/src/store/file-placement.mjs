import { commandError } from "@aof/contracts/error";
import { reindexForInsert, refsTouchedByInsert } from "../reindex.mjs";
import { archiveItems, refsMovedByArchive } from "../archive.mjs";
import { planRenumber, applyRenumber, describeRenumber } from "../renumber.mjs";
import { createFilePromoteCommand } from "../commands/promote.mjs";
import { createFileArchiveCommand } from "../commands/archive.mjs";
import { createFileMigrateFolderCommand } from "../commands/migrate-folder.mjs";
import { createFilePrototypeCommand } from "../commands/prototype.mjs";
import { createFilePromoteFindingCommand } from "../commands/promote-finding-to-chore.mjs";
import { createFilePromoteGapCommand } from "../commands/promote-gap-to-chore.mjs";
import { createFileWorkInsertion } from "../insertion/scaffold.mjs";
import { createFileWorkUpgrade } from "../upgrade.mjs";

const plans = new WeakMap();

// High-level operations retain their shipped file engines. Runtime collaborators
// are application-owned transition services; no consumer supplies a file fallback.
export async function applyFilePlacement(store, workDir, request, runtime = {}) {
  const { operation, input = {}, entry, stage } = request;
  const { ctx, services } = runtime;
  if (operation === "reindex") {
    return stage === "plan"
      ? { touched: await refsTouchedByInsert(workDir, input) }
      : reindexForInsert(workDir, input);
  }
  if (operation === "archive-move") {
    return stage === "plan"
      ? { touched: await refsMovedByArchive(workDir, input) }
      : archiveItems(workDir, input);
  }
  if (operation === "renumber") {
    if (stage === "plan") {
      const plan = await planRenumber(workDir, input);
      const handle = {};
      plans.set(handle, { store, plan });
      return { handle, touched: plan.touched, description: describeRenumber(plan) };
    }
    const owned = plans.get(request.handle);
    if (owned?.store !== store) throw commandError("The renumber plan belongs to another store or has expired.", "work-store-plan-invalid", 409);
    plans.delete(request.handle);
    return applyRenumber(owned.plan);
  }
  if (operation === "insert") return createFilePromoteCommand(services).runInsertTopLevel(ctx, input);
  if (operation === "promote") {
    const engine = createFilePromoteCommand(services);
    return entry === "run" ? engine.runPromote(ctx, input) : engine.promoteCommand.run(input, ctx);
  }
  if (operation === "archive") {
    const engine = createFileArchiveCommand(services);
    return entry === "run" ? engine.runArchive(ctx, input) : engine.archiveCommand.run(input, ctx);
  }
  if (operation === "migrate") {
    const engine = createFileMigrateFolderCommand(services);
    return engine.migrateFolderCommand.run(input, ctx);
  }
  if (operation === "prototype") {
    const engine = createFilePrototypeCommand(services);
    return engine.prototypeCommand.run(input, ctx);
  }
  if (operation === "promote-finding") {
    const engine = createFilePromoteFindingCommand(services);
    return entry === "run" ? engine.runPromoteFindingToChore(ctx, input) : engine.promoteFindingToChoreCommand.run(input, ctx);
  }
  if (operation === "promote-gap") {
    const engine = createFilePromoteGapCommand(services);
    return entry === "run" ? engine.runPromoteGapToChore(ctx, input) : engine.promoteGapToChoreCommand.run(input, ctx);
  }
  if (operation === "insert-story") return createFileWorkInsertion(services).runInsertStory(ctx, input);
  if (operation === "scaffold") return createFileWorkInsertion(services).scaffoldBacklogDriver(ctx.workspace, input);
  if (operation === "upgrade") return createFileWorkUpgrade(services).runUpgrade(workDir, input);
  throw commandError(`Unsupported work store operation ${JSON.stringify(operation)}.`, "work-store-operation-unsupported", 400);
}
