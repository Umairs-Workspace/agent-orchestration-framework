import assert from "node:assert/strict";
import { assetRuntimePath, createAssetReferenceIndex, expandAssetReferences } from "../src/asset-references.mjs";

export const assetReferenceTests = [
  { name: "154/03 typed skill references use the native kind root while workflow locations stay stable", run() {
    assert.equal(assetRuntimePath("skill", "helper", "codex"), ".agents/skills/helper/SKILL.md");
    assert.equal(assetRuntimePath("workflow", "audit", "codex"), ".codex/aof/workflows/audit.md");
    assert.equal(assetRuntimePath("skill", "helper", "claude"), ".claude/skills/helper/SKILL.md");
    assert.equal(assetRuntimePath("skill", "helper", "opencode"), ".opencode/skills/helper/SKILL.md");
  } },
  { name: "154/03 typed references retain target validation and expand all selected references", run() {
    const index = createAssetReferenceIndex([{ kind: "skill", id: "helper", runtimes: ["codex"] }], [{ id: "audit", runtimes: ["codex"] }]);
    assert.equal(expandAssetReferences("Read {{skills.helper}} then {{workflows.audit}}", "codex", index), "Read .agents/skills/helper/SKILL.md then .codex/aof/workflows/audit.md");
    assert.throws(() => expandAssetReferences("{{skills.helper}}", "claude", index), /does not target runtime/);
    assert.throws(() => expandAssetReferences("{{skills.missing}}", "codex", index), /Missing asset reference/);
  } }
];
