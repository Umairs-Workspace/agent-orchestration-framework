// Fitness function: acd-recall-pick-launch — FF-20103 (201/ADR-004 §2–§4).
//
// THE INVARIANT — the pick's launch has one builder. The argv of the pick's `claude` call is built
// only in `packages/execution/src/model-ask.mjs`. It never carries `--bare` or a permission
// bypass, and always carries the no-tools and no-session flags. The child's environment passes
// through `isSessionAttachmentKey`, and its working directory is never the project root. The
// launch then turns the child's auto-memory off, because a `claude` with it on creates a project
// directory for whatever directory it is started in (measured 2026-11-17).
//
// WHY A CONTROL. Each clause is a way the pick fails that no stand-in test sees. `--bare` looks
// like the lean flag and never reads the subscription sign-in, so every real pick would be
// `pick-failed`. A permission bypass, or tools, turns a call that reads record text into one a
// hostile record could steer. Session persistence, the caller's working directory or the calling
// session's environment leaves a transcript in the project, fires its hooks, and has
// `aof work observe` count every pick as an agent session.
//
// The instruction rides stdin: the launch carries no system-prompt flag of either form, because
// aof never replaces a `claude` system prompt (70/FF-7004) and the append form is the loop's one
// launch seam's (70/FF-7005).
//
// Four legs: the module's own source (one builder, one spawn, no shell, a temp directory, the
// scrub), the built argv driven with several inputs, the composition (only core's memory binding
// calls the ask, and it builds no argv and starts no process of its own), and red probes.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { modelAskArgs, modelAskEnvironment } from "@aof/execution/model-ask";
import { isSessionAttachmentKey } from "@aof/execution/session-model";
import { readRuntimeFiles } from "../../support/read-src-files.mjs";
import { functionBody, matchedParenSpan, stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MODULE = "packages/execution/src/model-ask.mjs";
const BINDING = "packages/core/src/application/bindings/commands/work/memory.mjs";
const NEVER = ["--bare", "--dangerously-skip-permissions", "--allow-dangerously-skip-permissions", "bypassPermissions", "--system-prompt", "--append-system-prompt"];
// The flags that make the call one answer with no tools and no trace.
const ALWAYS = ["--no-session-persistence", "--strict-mcp-config", "--disable-slash-commands"];

/** THE SHIPPED DETECTOR over the module's comment-stripped source: one message per breach. */
export function launchViolations(code) {
  const hits = [];
  for (const token of NEVER) if (code.includes(token)) hits.push(`spells ${token}`);
  const builder = functionBody(code, "export function modelAskArgs(");
  if (!builder) hits.push("has no modelAskArgs builder");
  else {
    if (!/"--tools",\s*""/u.test(builder)) hits.push("launches without --tools \"\"");
    for (const flag of ALWAYS) if (!builder.includes(`"${flag}"`)) hits.push(`launches without ${flag}`);
    if (!/"--permission-prompts",\s*"none"/u.test(builder)) hits.push("launches without --permission-prompts none");
    if (!/"-p"|"--print"/u.test(builder)) hits.push("launches outside print mode");
  }
  const spawns = [...code.matchAll(/\bspawn\(/gu)];
  if (spawns.length !== 1) hits.push(`spawns ${spawns.length} times, not once`);
  for (const match of spawns) {
    const call = matchedParenSpan(code, match.index);
    if (!call) hits.push("has a spawn( call whose arguments do not close");
    else {
      if (!/\bshell:\s*false\b/u.test(call.body)) hits.push("spawns without shell: false");
      if (!/\{\s*cwd,\s*env,/u.test(call.body)) hits.push("spawns without the working directory and environment it was handed");
    }
  }
  if (/\bshell:\s*true\b/u.test(code) || /\bexec\(/u.test(code)) hits.push("reaches a shell");
  if (!/cwd = await mkdtemp\(path\.join\(os\.tmpdir\(\),/u.test(code)) hits.push("does not start the child in a fresh directory under the OS temp directory");
  if (/process\.cwd\(\)/u.test(code)) hits.push("reads the caller's working directory");
  if (!/env: modelAskEnvironment\(env\)/u.test(code)) hits.push("launches without the scrubbed environment");
  const scrub = functionBody(code, "export function modelAskEnvironment(");
  if (!scrub || !/isSessionAttachmentKey\(key\)/u.test(scrub)) hits.push("does not scrub the environment through isSessionAttachmentKey");
  return hits;
}

// A launch flag spelled in source: any of the flags only this launch uses.
const LAUNCH_FLAG_RE = /["'`]--(?:no-session-persistence|strict-mcp-config|disable-slash-commands)["'`]/u;

export const archTests = [
  {
    name: "arch/201 FF-20103: the pick's launch has one builder — no tools, no session, no MCP, no slash commands, never --bare or a bypass, one spawn with no shell, in a temp directory, with the environment scrubbed",
    run: async () => {
      const code = stripComments(await readFile(path.join(repoRoot, MODULE), "utf8"));
      assert.deepEqual(launchViolations(code), []);

      // ONE BUILDER: no other runtime module spells the launch's flags or imports the ask but core's binding.
      const spellers = [];
      const callers = [];
      for (const file of await readRuntimeFiles(repoRoot, { runtime: "node" })) {
        const rel = file.rel.replaceAll("\\", "/");
        const source = stripComments(await readFile(file.path, "utf8"));
        if (LAUNCH_FLAG_RE.test(source)) spellers.push(rel);
        if (rel !== MODULE && /(?:\bfrom\s+|\bimport\s*\(\s*)["'][^"']*model-ask(?:\.mjs)?["']/u.test(source)) callers.push(rel);
      }
      assert.deepEqual(spellers, [MODULE], "the launch's flags are spelled in the one builder");
      assert.deepEqual(callers, [BINDING], "the ask is called from core's memory binding and nowhere else");

      // THE COMPOSITION builds no argv and starts no process of its own.
      const binding = stripComments(await readFile(path.join(repoRoot, BINDING), "utf8"));
      assert.match(binding, /\bawait askModel\(\{/u, "the binding asks through askModel (non-vacuity)");
      assert.match(binding, /await import\("@aof\/execution\/model-ask"\)/u, "…and loads the launcher only when a pick is made, so no other verb pays for it (160/FF-16004)");
      assert.doesNotMatch(binding, /\bfrom\s+["']@aof\/execution\/model-ask["']/u);
      assert.doesNotMatch(binding, /child_process|\bspawn\(|\bexecFile\(/u, "the binding starts no process itself");
      assert.doesNotMatch(binding, /["'`]--[a-z]/u, "the binding spells no launch flag");
      assert.doesNotMatch(binding, /process\.cwd\(\)|\bcwd\b/u, "the binding hands the ask no working directory: the ask makes its own");
    },
  },
  {
    name: "arch/201 FF-20103: the built argv always carries the no-tools and no-session flags and never --bare or a bypass, whatever model and instruction it is given, and the scrub is the session-attachment predicate",
    run: () => {
      for (const launch of [{}, { model: "haiku" }, { model: "sonnet", instruction: "Pick the cards that apply." }, { model: "--bare" }]) {
        const args = modelAskArgs(launch);
        assert.equal(args[args.indexOf("--tools") + 1], "", `no tools: ${JSON.stringify(args)}`);
        for (const flag of ALWAYS) assert.ok(args.includes(flag), `${flag}: ${JSON.stringify(args)}`);
        assert.equal(args[args.indexOf("--permission-prompts") + 1], "none");
        // A flag is an argument in a flag's position: a model or an instruction that merely spells
        // one is a VALUE, and sits after `--model` or `--append-system-prompt`.
        const flags = args.filter((arg, index) => arg.startsWith("--") && args[index - 1] !== "--model");
        assert.ok(!flags.some((flag) => NEVER.includes(flag)), `no --bare, no bypass and no system-prompt flag among the flags: ${JSON.stringify(flags)}`);
        assert.ok(!args.includes("Pick the cards that apply."), "the instruction is never an argument: it rides stdin");
      }
      const env = { HOME: "/h", PATH: "/bin", CLAUDECODE: "1", CLAUDE_CODE_SSE_PORT: "4711", CLAUDE_PID: "7", VSCODE_PID: "9", TERM_PROGRAM: "vscode", CLAUDE_EFFORT: "max" };
      const scrubbed = Object.fromEntries(Object.entries(env).filter(([key]) => !isSessionAttachmentKey(key)));
      assert.deepEqual(modelAskEnvironment(env), { ...scrubbed, CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1" }, "the caller's environment, scrubbed, plus the one key the launch sets: auto-memory off");
      assert.deepEqual(Object.keys(scrubbed), ["HOME", "PATH"]);
    },
  },
  {
    name: "arch/201 FF-20103 (red probes): --bare, each bypass, tools, a saved session, a shell, the caller's directory and an unscrubbed environment each fire",
    run: async () => {
      const code = stripComments(await readFile(path.join(repoRoot, MODULE), "utf8"));
      const plant = (from, to) => { const planted = code.replace(from, to); assert.notEqual(planted, code, `the plant ${to} applied`); return launchViolations(planted); };
      assert.ok(plant('"--output-format", "json"', '"--output-format", "json", "--bare"').includes("spells --bare"));
      assert.ok(plant('if (nonBlank(model)) args.push("--model", model);', 'args.push("--append-system-prompt", "x");').includes("spells --append-system-prompt"));
      assert.ok(plant('if (nonBlank(model)) args.push("--model", model);', 'args.push("--system-prompt", "x");').includes("spells --system-prompt"));
      assert.ok(plant('"--permission-prompts", "none"', '"--permission-prompts", "none", "--dangerously-skip-permissions"').includes("spells --dangerously-skip-permissions"));
      assert.ok(plant('"--permission-prompts", "none"', '"--permission-mode", "bypassPermissions"').some((hit) => hit === "spells bypassPermissions" || hit === "launches without --permission-prompts none"));
      assert.ok(plant('"--tools", ""', '"--tools", "Bash"').includes('launches without --tools ""'));
      assert.ok(plant('"--no-session-persistence", ', "").includes("launches without --no-session-persistence"));
      assert.ok(plant('"--strict-mcp-config", ', "").includes("launches without --strict-mcp-config"));
      assert.ok(plant("shell: false", "shell: true").includes("spawns without shell: false"));
      assert.ok(plant('cwd = await mkdtemp(path.join(os.tmpdir(), "aof-model-ask-"))', "cwd = process.cwd()").includes("reads the caller's working directory"));
      assert.ok(plant("env: modelAskEnvironment(env)", "env").includes("launches without the scrubbed environment"));
      assert.ok(plant("!isSessionAttachmentKey(key)", "true").includes("does not scrub the environment through isSessionAttachmentKey"));
    },
  },
];
