import assert from "node:assert/strict";
import path from "node:path";
import { codexExecutables, desktopLocations, editorExecutables, selectCodexExecutable } from "../src/codex-executable.mjs";
import { createCodexAppServerAdapter } from "../src/codex-app-server.mjs";
import { codexFixture } from "./codex-app-server.suite.mjs";

const error = code => Object.assign(new Error("SECRET_DIAGNOSTIC"), { code });
const candidates = async function* () { yield "old"; yield "broken"; yield "working"; };
const readVersion = async bin => bin === "old" ? "0.130.0" : "0.163.0-alpha.10.2";
const registered = [{ identifier: { id: "openai.chatgpt" }, relativeLocation: "openai.chatgpt-26.1013.1-win32-x64" }];
const editor = "C:/users/fixture/.vscode/extensions/openai.chatgpt-test/bin/windows-x86_64/codex.exe";
const desktop = "C:/apps/Codex";
const bin = path.win32.join(desktop, "app", "resources", "codex.exe");
const discovered = deps => options => codexExecutables(options, { platform: "win32", exists: () => true,
  installedEditorExecutables: async () => [], installedDesktopLocations: async () => [], ...deps });

export const codexDiscoveryTests = [
  { name: "Codex operation deadline cancels discovery without starting a server", async run() {
    let aborted = false, launches = 0;
    const adapter = createCodexAppServerAdapter({ selectExecutable: async ({ signal }) => {
      await new Promise(resolve => signal.addEventListener("abort", resolve, { once: true }));
      aborted = true; throw error("abort");
    }, spawnChild: () => { launches++; throw Error("must not launch"); } });
    const result = await adapter.drive({ worktreeCwd: path.resolve(".tmp") }, { timeoutMs: 20 });
    assert.equal(result.failureReason, "timeout"); assert.equal(aborted, true); assert.equal(launches, 0);
  } },
  { name: "Codex never retries another installation after a phase turn has started", async run() {
    const probes = [codexFixture(), codexFixture({ scenario: "unknown-request" })]; let at = 0;
    const adapter = createCodexAppServerAdapter({ readVersion,
      selectExecutable: (options, deps) => selectCodexExecutable(options, { ...deps, candidates }),
      spawnChild: () => probes[at++].child, terminate: async child => child.kill(),
    });
    const result = await adapter.drive({ ...probes[0].brief, context: undefined }, probes[0].options);
    assert.equal(result.failureReason, "protocol_unknown_request"); assert.equal(at, 2);
    assert.equal(probes[1].calls.filter(call => call.method === "turn/start").length, 1);
  } },
  { name: "Codex missing registered executable produces an incomplete-discovery diagnosis", async run() {
    await assert.rejects(selectCodexExecutable({ env: {} }, { readVersion, candidates: discovered({
      installedDesktopLocations: async () => [desktop], exists: () => false,
    }) }), e => e.code === "runtime_discovery_failed" && e.discoveryIssues[0].code === "executable_missing");
  } },
  { name: "Codex discovery probes a repeated path only once across sources", async run() {
    let versions = 0;
    await assert.rejects(selectCodexExecutable({ env: { PATH: path.win32.dirname(bin) } }, {
      readVersion: async () => { versions++; return "0.130.0"; }, candidates: discovered({
        exists: value => value.toLowerCase() === bin.toLowerCase(), installedEditorExecutables: async () => [bin.toUpperCase()], installedDesktopLocations: async () => [desktop],
      }),
    }), { code: "unsupported_profile" });
    assert.equal(versions, 1);
  } },
  { name: "Codex desktop discovery uses system PowerShell and distinguishes timeout from no installed app", async run() {
    const env = { SystemRoot: "D:/Windows" };
    assert.deepEqual(await desktopLocations({ env }, { run: (exe, args, options, callback) => {
      assert.equal(exe, "D:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe");
      assert.equal(options.windowsHide, true); assert.equal(options.timeout, 15000);
      assert.ok(args.includes("-NoProfile")); callback(null, "");
    } }), []);
    await assert.rejects(desktopLocations({}, { run: (exe, args, options, callback) => callback({ killed: true }, "SECRET") }), { code: "discovery_timeout" });
    await assert.rejects(desktopLocations({}, { run: (exe, args, options, callback) => callback(error("EACCES"), "SECRET") }), { code: "discovery_failed" });
  } },
  ...["x64", "arm64"].map(arch => ({ name: "Codex editor registration discovers installed OpenAI binary without inherited PATH " + arch, async run() {
    const files = await editorExecutables({ env: { USERPROFILE: "C:/users/fixture" } }, { arch, read: async file => {
      if (file.includes(".vscode-insiders")) throw error("ENOENT");
      return JSON.stringify([...registered, { identifier: { id: "other.extension" }, relativeLocation: "openai.chatgpt-other" },
        { identifier: { id: "openai.chatgpt" }, relativeLocation: "../escape" }]);
    } });
    assert.deepEqual(files, [path.win32.join("C:/users/fixture/.vscode/extensions", registered[0].relativeLocation, "bin", arch === "arm64" ? "windows-aarch64" : "windows-x86_64", "codex.exe")]);
  } })),
  { name: "Codex editor discovery preserves a working registration when the other editor is corrupt", async run() {
    const issues = [];
    const files = await editorExecutables({ env: { USERPROFILE: "C:/users/fixture" }, onDiscoveryIssue: issue => issues.push(issue) }, {
      read: async file => file.includes(".vscode-insiders") ? "invalid" : JSON.stringify(registered),
    });
    assert.equal(files.length, 1); assert.deepEqual(issues, [{ source: "editor", code: "discovery_failed" }]);
  } },
  { name: "Codex discovery uses registered editor before an unavailable desktop lookup", async run() {
    let desktopCalls = 0;
    const selected = await selectCodexExecutable({ env: {} }, { readVersion, candidates: discovered({
      installedEditorExecutables: async () => [editor], installedDesktopLocations: async () => { desktopCalls++; throw error("discovery_timeout"); },
    }) });
    assert.equal(selected.bin, editor); assert.equal(desktopCalls, 0);
  } },
  { name: "Codex discovery continues to desktop after editor lookup failure", async run() {
    const selected = await selectCodexExecutable({ env: {} }, { readVersion, candidates: discovered({
      installedEditorExecutables: async () => { throw error("EACCES"); }, installedDesktopLocations: async () => [desktop],
    }) });
    assert.equal(selected.bin, bin);
  } },
  { name: "Codex discovery does not misreport a timed out desktop lookup as only an old CLI", async run() {
    await assert.rejects(selectCodexExecutable({ env: { PATH: "C:/old" } }, { readVersion: async () => "0.130.0", candidates: discovered({
      exists: value => value === "C:\\old\\codex.exe", installedDesktopLocations: async () => { throw error("discovery_timeout"); },
    }) }), e => e.code === "runtime_discovery_failed" && e.detectedVersions[0] === "0.130.0" && e.discoveryIssues[0].code === "discovery_timeout");
  } },
  { name: "Codex explicit executable never falls back to an unrelated installation after probe failure", async run() {
    const selectedCandidates = discovered({ installedEditorExecutables: async () => { throw Error("must not discover"); } });
    await assert.rejects(selectCodexExecutable({ codexBin: "C:/explicit/codex.exe", env: {} }, {
      candidates: selectedCandidates, readVersion, probeExecutable: async () => { throw error("protocol_disconnected"); },
    }), { code: "runtime_preflight_failed" });
  } },
  { name: "Codex selection tests App Server readiness and skips a recent but broken executable", async run() {
    const probed = [];
    const selected = await selectCodexExecutable({}, { candidates, readVersion, probeExecutable: async candidate => {
      probed.push(candidate.bin); if (candidate.bin === "broken") throw error("protocol_timeout"); return { models: [] };
    } });
    assert.deepEqual(probed, ["broken", "working"]); assert.equal(selected.bin, "working");
  } },
  { name: "Codex cancellation during a live probe prevents fallback to another binary", async run() {
    const controller = new AbortController(); let probes = 0;
    await assert.rejects(selectCodexExecutable({ signal: controller.signal }, { candidates, readVersion, probeExecutable: async () => {
      probes++; controller.abort(); throw error("protocol_disconnected");
    } }), { code: "abort" });
    assert.equal(probes, 1);
  } },
  ...[false, true].map(drive => ({ name: "Codex adapter reuses its real read-only handshake for candidate fallback " + (drive ? "before a phase" : "during preflight"), async run() {
    const probes = [codexFixture({ scenario: "initialization-error" }), codexFixture(), ...(drive ? [codexFixture()] : [])];
    const launched = []; let at = 0, live = 0;
    const adapter = createCodexAppServerAdapter({ readVersion,
      selectExecutable: (options, deps) => selectCodexExecutable(options, { ...deps, candidates }),
      spawnChild: executable => { launched.push(executable); return probes[at++].child; }, terminate: async child => child.kill(),
    });
    const options = { ...probes[0].options, onProcessLive: () => live++ };
    const result = drive ? await adapter.drive({ ...probes[0].brief, context: undefined }, options)
      : await adapter.inspectCapabilities({ ...options, cwd: probes[0].brief.worktreeCwd });
    assert.deepEqual(launched, drive ? ["broken", "working", "working"] : ["broken", "working"]);
    assert.equal(live, drive ? 1 : 0, "read-only probes cannot publish phase process identity");
    assert.equal(result.executable, "working");
    if (drive) assert.equal(result.outcome, "done"); else assert.ok(result.models.length);
    for (const p of probes.slice(0, 2)) assert.equal(p.calls.some(call => /^(thread|turn)\//u.test(call.method ?? "")), false);
    for (const p of probes) assert.ok(p.child.stdin.destroyed && p.child.stdout.destroyed && p.child.stderr.destroyed);
  } })),
  { name: "Codex preflight reports safe source diagnostics without subprocess output", async run() {
    const adapter = createCodexAppServerAdapter({ selectExecutable: async () => { throw Object.assign(error("runtime_discovery_failed"), {
      detectedVersions: ["0.130.0", "SECRET"], discoveryIssues: [{ source: "desktop", code: "discovery_timeout", message: "SECRET" }, { source: "SECRET", code: "discovery_failed" }],
      probeIssues: [{ code: "probe_failed", version: "0.163.0", stderr: "SECRET" }, { code: "SECRET" }],
    }); } });
    await assert.rejects(adapter.inspectCapabilities({ cwd: path.resolve(".tmp") }), e => e.code === "runtime_discovery_failed"
      && e.message.includes("Windows desktop: discovery timed out") && e.message.includes("0.130.0") && !e.message.includes("SECRET"));
  } },
];
