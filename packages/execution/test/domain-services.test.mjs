import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createSvgRasterizer, findBrowser, viewBoxSize } from "@aof/execution/svg-rasterizer";
import { normalizeEffort, resolveSessionLaunch } from "@aof/execution/session-model";
import { buildRunAttribution, buildOtelResourceAttributes } from "@aof/execution/otel-attribution";

test("session launch precedence and run attribution preserve absent facts", () => {
  assert.equal(normalizeEffort("extra-high"), "xhigh");
  assert.equal(normalizeEffort("Extra-High"), null);
  assert.deepEqual(resolveSessionLaunch({ work: { agents: { session: { models: { verify: "model" }, effort: { verify: "low" } } } } }, "verify", { thinking: "max" }), { model: "model", effort: "max", effortSource: "--thinking", modelSource: "config" });
  assert.deepEqual(resolveSessionLaunch({}, "unknown"), { effort: "high", effortSource: "default" });
  assert.equal(buildOtelResourceAttributes(buildRunAttribution({ ref: "12/01", type: "story" }, { runId: "run", phase: "verify" })), "run.id=run,story.id=12/01,milestone.id=12,phase=verify");
  assert.equal(buildOtelResourceAttributes(buildRunAttribution(null)), "");
});

test("rasterization refuses unsupported input before spawning and preserves pinned lookup refusal", async () => {
  const { rasterizeSvg } = createSvgRasterizer({ reportDegrade: () => {} });
  assert.equal(findBrowser({ configured: "/missing", exists: () => false }).code, "diagram-png-renderer-missing");
  assert.deepEqual(viewBoxSize('<svg viewBox="0 0 2.2 3.4">'), { width: 3, height: 4 });
  await assert.rejects(rasterizeSvg({ svgPath: "source.drawio", spawn: () => assert.fail("must not spawn") }), { code: "diagram-png-source-not-svg" });
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-raster-contract-"));
  try {
    const svgPath = path.join(dir, "bad.svg");
    await writeFile(svgPath, "<svg/>");
    await assert.rejects(rasterizeSvg({ svgPath, spawn: () => assert.fail("must not spawn") }), { code: "diagram-svg-no-viewbox" });
  } finally { await rm(dir, { recursive: true, force: true }); }
});
