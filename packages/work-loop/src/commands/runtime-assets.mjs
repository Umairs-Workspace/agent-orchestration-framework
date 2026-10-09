import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { commandError } from "@aof/contracts/error";

// The loop checks before minting a run; each drive checks again in its own checkout.
export async function validateNativeAssets(cwd, phase) {
  const remedy = "Run `aof work update` in this project to refresh its installed AOF assets.";
  const missing = target => commandError(`Missing native asset: ${target}. ${remedy}`, "runtime-asset-missing", 409);
  const procedure = path.join(cwd, ".agents", "skills", `aof-${phase}`, "SKILL.md");
  let skill;
  try { skill = await readFile(procedure, "utf8"); } catch { throw missing(procedure); }
  if (!skill.includes("aof-runtime: codex")) throw commandError(`The installed procedure is not a Codex variant: ${procedure}. ${remedy}`, "runtime-asset-incompatible", 409);
  for (const [mention, target] of [["procedure.md", path.join(path.dirname(procedure), "procedure.md")], ["workflow-contract.md", path.join(cwd, ".codex/aof/workflows/workflow-contract.md")]]) {
    if (skill.includes(mention)) try { await access(target); } catch { throw missing(target); }
  }
  const role = phase === "review" ? "aof-qa" : null;
  let roleInstructions = "";
  if (role != null) {
    const target = path.join(cwd, ".codex", "agents", `${role}.toml`);
    try { roleInstructions = await readFile(target, "utf8"); } catch { throw missing(target); }
  }
  return { procedure, role, roleInstructions };
}
