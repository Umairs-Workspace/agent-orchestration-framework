// 63/02 — THE LAUNCH ENVELOPE COMPILES. The four task features of "the launch envelope
// compiles", driven over the real compiler and the real launch seam:
//
//   00 the fourth enforcement point compiles
//   01 an unattended launch resolves only the declared shape
//   02 every attended launch is byte-identical
//   03 the rule with no referent is replaced in the declaration
//
// The two delivered 55/04 suites (`frozen-set-compiled.test.mjs` and its arch control) widen
// by exactly their deferral lines and keep their own subject; this file is 63/02's own, so a
// reader of either can tell which milestone is asserting what.
//
// WHY THE ATTENDED ROWS CARRY LITERALS. "byte-identical to HEAD" is only a claim if the
// "before" value is written down. Every expected argv and env below was CAPTURED from this
// seam on the base commit, before the fourth point compiled, and pasted here — including the
// sha256 of the 1,044-character worker instruction, which is a token no one wants inline but
// which must not be allowed to drift silently either. A comparison that checked the program
// and the number of arguments would pass a launch whose flags were reordered, and a reordered
// argument list is a different prompt-cache key: a real cost paid quietly.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  bundledFrozenSet,
  compileFrozenSet,
  readFrozenSet,
  FROZEN_ENFORCEMENT_POINTS,
  FROZEN_SET_RELPATH,
  FrozenSetError,
} from "../../src/frozen-set.mjs";
import { driveInteractiveClaudeSession, resolveInteractiveDriverLaunch } from "../../src/agent-session-driver.mjs";
import { PROVIDER_IDS } from "../../src/terminal-providers.mjs";
import { loadBundle } from "../../src/work/bundle.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENVELOPE_POINT = "the worker launch envelope";
const ENVELOPE_MEMBER_ID = "gate-order";

// The member as 55 delivered it and as it stood until 2026-09-02: a rule that reads like a
// rule and behaves like a comment. Kept here as the "before" side of the re-declaration —
// the declaration itself no longer carries it, so this is the only remaining record of what
// changed, and of the one argument no attended launch may ever carry.
const PREVIOUS_MEMBER = Object.freeze({
  id: ENVELOPE_MEMBER_ID,
  protects: "the continue, validate, doctor, grade and verify gate order",
  enforcementPoint: ENVELOPE_POINT,
  aofManaged: ENVELOPE_MEMBER_ID,
  rule: Object.freeze({ argument: "--aof-gate-order" }),
});
const RETIRED_ARGUMENT = PREVIOUS_MEMBER.rule.argument;

// ---------------------------------------------------------------- fixtures and helpers ----

const which = (bin) => `/stub/bin/${bin}`;
const absentBinary = () => null;

const BASE_ENV = Object.freeze({
  PATH: "/stub/bin",
  HOME: "/stub/home",
  VSCODE_PID: "4242",
  TERM_PROGRAM: "vscode",
  TERM_PROGRAM_VERSION: "1.99",
  CLAUDECODE: "1",
  CLAUDE_CODE_SSE_PORT: "1234",
  CLAUDE_CODE_SESSION_ID: "parent-session",
  CLAUDE_PID: "9999",
  CLAUDE_EFFORT: "inherited-high",
  CLAUDE_AGENT_SDK_VERSION: "0.0.1",
  ORDINARY_INHERITED: "rides-through",
});
const launchEnv = () => ({ ...BASE_ENV });

const validRuleFor = Object.freeze({
  "tool-call hook entries": { event: "PreToolUse", matcher: "Bash", command: "node", args: ["${CLAUDE_PROJECT_DIR}/probe.mjs"] },
  "permission denials": { deny: ["Edit(.aof/probe/**)"] },
  "agent tool scope": { agents: { "probe-agent": ["Read"] } },
  [ENVELOPE_POINT]: { program: "probe-runner", args: ["probe", "loop"] },
});

const artifactFor = Object.freeze({
  "tool-call hook entries": (compiled) => compiled.hooks,
  "permission denials": (compiled) => compiled.permissions,
  "agent tool scope": (compiled) => Object.values(compiled.agentScopes),
  [ENVELOPE_POINT]: (compiled) => (compiled.unattendedLaunch == null ? [] : [compiled.unattendedLaunch]),
});

const memberAt = (point, rule) => ({
  id: "probe-member",
  protects: `the probe's subject at ${point}`,
  enforcementPoint: point,
  aofManaged: "probe-member",
  ...(rule === undefined ? {} : { rule }),
});

const declarationOf = (...members) => ({ version: 1, members });
const envelopeMemberOf = (declaration) => declaration.members.find((member) => member.id === ENVELOPE_MEMBER_ID);

function withEnvelopeRule(rule) {
  const declaration = structuredClone(bundledFrozenSet());
  const member = envelopeMemberOf(declaration);
  if (rule === undefined) delete member.rule;
  else member.rule = rule;
  return declaration;
}

function withoutEnvelopeMember() {
  const declaration = structuredClone(bundledFrozenSet());
  return { ...declaration, members: declaration.members.filter((member) => member.id !== ENVELOPE_MEMBER_ID) };
}

async function tempDir(body) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-unattended-envelope-"));
  try {
    return await body(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// A workspace whose frozen set is INSTALLED — the declaration written at the path a real
// install writes it to, read back through the same `readFrozenSet` production uses.
async function installedWorkspace(dir, declaration = bundledFrozenSet(), { compile = true } = {}) {
  const target = path.join(dir, ...FROZEN_SET_RELPATH.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(declaration, null, 2)}\n`, "utf8");
  // `compile: false` is for the ONE workspace that deliberately holds a declaration this
  // compiler refuses — the pre-63 spelling, before the bundle is installed over it.
  if (!compile) return { dir, target, compiled: null, declaredLaunch: null };
  const compiled = compileFrozenSet(await readFrozenSet(dir));
  return { dir, target, compiled, declaredLaunch: compiled.unattendedLaunch };
}

const unattendedRequest = (declaredLaunch, overrides = {}) => ({
  program: declaredLaunch.program,
  args: [...declaredLaunch.args],
  ...overrides,
});

const resolveUnattended = (declaredLaunch, request, extra = {}) => resolveInteractiveDriverLaunch("claude", {
  which,
  env: launchEnv(),
  terminalSessionId: "fixed-terminal-session",
  declaredLaunch,
  unattended: request,
  ...extra,
});

// Did anything spawn? The driver's refusal guard sits ahead of every filesystem touch, so a
// spy factory is enough to answer "and no process is started" honestly.
async function driveAndCountSpawns(options) {
  let spawns = 0;
  const outcome = await driveInteractiveClaudeSession({ itemRef: "63/02", worktreeCwd: "/stub/worktree" }, {
    ...options,
    ptySpawn: () => {
      spawns += 1;
      throw new Error("the refusal reached the spawn");
    },
  });
  return { spawns, outcome };
}

// ------------------------------------------------------- the attended byte-identity rows ----

// Captured from this seam on the base commit, BEFORE the fourth enforcement point compiled.
const BEFORE_INSTRUCTION = "sha256:9885486c96a318f1d5b1a0a06250072e08d51f549a7560e20ace6fd6ce977735";
const BEFORE_FLAGS = Object.freeze([
  "--permission-mode",
  "auto",
  "--exclude-dynamic-system-prompt-sections",
  "--append-system-prompt",
  BEFORE_INSTRUCTION,
]);
const BEFORE_ENV = Object.freeze({
  PATH: "/stub/bin",
  HOME: "/stub/home",
  ORDINARY_INHERITED: "rides-through",
  AOF_TERMINAL_SESSION: "fixed-terminal-session",
  AOF_TERMINAL_PROVIDER: "claude",
  ENABLE_PROMPT_CACHING_1H: "1",
});

// The one long token is compared by digest rather than inline: a 1,044-character system
// prompt pasted into a test is unreadable, and a length check is not identity.
const fingerprint = (args) => args.map((token) => (token.includes("\n")
  ? `sha256:${createHash("sha256").update(token, "utf8").digest("hex")}`
  : token));

const ATTENDED = Object.freeze([
  {
    launch: "a session a human drives locally, with no directive",
    options: {},
    args: [...BEFORE_FLAGS],
    env: { ...BEFORE_ENV },
  },
  {
    launch: "a session a human drives locally, carrying a phase directive",
    options: { command: "/aof:refine 63/02" },
    args: [...BEFORE_FLAGS],
    env: { ...BEFORE_ENV },
  },
  {
    launch: "the session the refine directive is typed into",
    options: { command: "/aof:refine 63/02" },
    args: [...BEFORE_FLAGS],
    env: { ...BEFORE_ENV },
  },
  {
    launch: "the session the continue directive is typed into",
    options: { command: "/aof:continue 63/02" },
    args: [...BEFORE_FLAGS],
    env: { ...BEFORE_ENV },
  },
  {
    launch: "the session the verify directive is typed into",
    options: { command: "/aof:verify 63/02" },
    args: [...BEFORE_FLAGS],
    env: { ...BEFORE_ENV },
  },
  {
    launch: "a session resumed from a persisted conversation",
    options: { resumeSessionId: "resumed-conversation-id" },
    args: [...BEFORE_FLAGS, "--resume", "resumed-conversation-id"],
    env: { ...BEFORE_ENV },
  },
  {
    launch: "a session carrying a chosen model and a chosen effort",
    options: { session: { model: "opus-5", effort: "high" } },
    args: [...BEFORE_FLAGS, "--model", "opus-5", "--effort", "high"],
    env: { ...BEFORE_ENV },
  },
  {
    launch: "a session carrying a chosen model and no effort",
    options: { session: { model: "opus-5" } },
    args: [...BEFORE_FLAGS, "--model", "opus-5"],
    env: { ...BEFORE_ENV },
  },
  {
    launch: "a session carrying neither a model nor an effort",
    options: { session: {} },
    args: [...BEFORE_FLAGS],
    env: { ...BEFORE_ENV },
  },
  {
    launch: "a session carrying run attribution",
    options: { attribution: { workspaceId: "ws-1", itemRef: "63/02", phase: "continue", runId: "run-1" } },
    args: [...BEFORE_FLAGS],
    env: { ...BEFORE_ENV, OTEL_RESOURCE_ATTRIBUTES: "run.id=run-1,phase=continue", CLAUDE_CODE_ENABLE_TELEMETRY: "1" },
  },
  {
    launch: "a session carrying no attribution",
    options: {},
    args: [...BEFORE_FLAGS],
    env: { ...BEFORE_ENV },
  },
  {
    launch: "a session carrying the run's item directory and run id",
    options: { heartbeat: { itemDir: "/stub/work/63/02", runId: "run-7" } },
    args: [...BEFORE_FLAGS],
    env: { ...BEFORE_ENV, AOF_RUN_ITEM_DIR: "/stub/work/63/02", AOF_RUN_ID: "run-7" },
  },
  // TWO SHAPES THE FEATURE'S TABLE DOES NOT ENUMERATE, and both were captured from the base
  // commit the same way the twelve above were. The table's rows are launch DESCRIPTIONS and
  // two pairs of them are the same option bag at this seam — deliberately, since a directive
  // is typed into the PTY and never reaches the argv, which is itself one of the claims. So
  // the rows below are what make "every distinct shape" true rather than merely stated: the
  // COMBINED one, where every optional decision is supplied at once so their argv order is
  // pinned against each other, and the one with NO DRIVER ID, which takes the `providerId`
  // default the seam has always applied.
  {
    launch: "a session carrying a directive, a resume, a model, an effort, attribution and a heartbeat at once",
    options: {
      command: "/aof:continue 63/02",
      resumeSessionId: "resumed-conversation-id",
      session: { model: "opus-5", effort: "high" },
      attribution: { workspaceId: "ws-1", itemRef: "63/02", phase: "continue", runId: "run-1" },
      heartbeat: { itemDir: "/stub/work/63/02", runId: "run-7" },
    },
    args: [...BEFORE_FLAGS, "--model", "opus-5", "--effort", "high", "--resume", "resumed-conversation-id"],
    env: {
      ...BEFORE_ENV,
      OTEL_RESOURCE_ATTRIBUTES: "run.id=run-1,phase=continue",
      CLAUDE_CODE_ENABLE_TELEMETRY: "1",
      AOF_RUN_ITEM_DIR: "/stub/work/63/02",
      AOF_RUN_ID: "run-7",
    },
  },
  {
    launch: "a session resolved with no driver id supplied at all",
    driver: undefined,
    options: {},
    args: [...BEFORE_FLAGS],
    env: { ...BEFORE_ENV },
  },
]);

// Twelve DISTINCT option bags over fourteen rows. Asserted rather than asserted-about: the
// two coincidences are a claim about this seam (a directive does not reach the launch), and a
// sentence counting rows while meaning shapes is how a table comes to look wider than it is.
const DISTINCT_ATTENDED_SHAPES = new Set(ATTENDED.map((row) => JSON.stringify([
  Object.hasOwn(row, "driver") ? row.driver ?? null : "claude",
  row.options,
]))).size;

const resolveAttended = (row, extra = {}) => resolveInteractiveDriverLaunch(Object.hasOwn(row, "driver") ? row.driver : "claude", {
  which,
  env: launchEnv(),
  terminalSessionId: "fixed-terminal-session",
  ...row.options,
  ...extra,
});

// Every flag the runtime is known to accept on this launch path. A token outside this set is
// an argument `claude` would reject — which is exactly what appending the retired spelling
// would have produced on the first compiled launch.
const KNOWN_FLAGS = Object.freeze([
  "--permission-mode",
  "--exclude-dynamic-system-prompt-sections",
  "--append-system-prompt",
  "--model",
  "--effort",
  "--resume",
]);

const EDITOR_ATTACHMENT_KEYS = Object.freeze(["VSCODE_PID", "TERM_PROGRAM", "TERM_PROGRAM_VERSION"]);
const PARENT_SESSION_KEYS = Object.freeze(["CLAUDECODE", "CLAUDE_CODE_SSE_PORT", "CLAUDE_CODE_SESSION_ID", "CLAUDE_PID", "CLAUDE_AGENT_SDK_VERSION"]);

export const unattendedLaunchEnvelopeTests = [
  // ------------------------------------------------------------------- task 00 ----
  {
    name: "63/02 task00 — the shipped declaration compiles with nothing left deferred, and every member lands in exactly one report",
    run: () => {
      const declaration = bundledFrozenSet();
      const compiled = compileFrozenSet(declaration);

      assert.deepEqual(compiled.deferred, [], "no member is reported deferred");
      assert.ok(compiled.installed.includes(ENVELOPE_MEMBER_ID), "the envelope member is reported installed");

      const reports = { installed: compiled.installed, deferred: compiled.deferred, escaped: compiled.escaped };
      const unreported = [];
      for (const member of declaration.members) {
        const homes = Object.entries(reports).filter(([, ids]) => ids.includes(member.id)).map(([name]) => name);
        if (homes.length !== 1) unreported.push(`${member.id} is reported in ${homes.length === 0 ? "no report" : homes.join(" and ")}`);
      }
      assert.deepEqual(unreported, [], "every declared member is reported in exactly one of installed, deferred, or not owned by aof");
      assert.equal(declaration.members.length, compiled.installed.length + compiled.deferred.length + compiled.escaped.length);
    },
  },
  {
    name: "63/02 task00 — the points that compile are the points a member may name, in both directions",
    run: () => {
      const compiles = [];
      for (const point of FROZEN_ENFORCEMENT_POINTS) {
        const compiled = compileFrozenSet(declarationOf(memberAt(point, validRuleFor[point])));
        assert.deepEqual(compiled.deferred, [], `a member at "${point}" is not deferred`);
        if (compiled.installed.includes("probe-member")) compiles.push(point);
      }

      // A census, not a count: the two SETS are compared, so a fifth point added to the
      // vocabulary arrives either compiled or refusing — never quietly deferred.
      assert.deepEqual(compiles, [...FROZEN_ENFORCEMENT_POINTS]);
      assert.deepEqual(FROZEN_ENFORCEMENT_POINTS.filter((point) => !compiles.includes(point)), [], "the declaration names no point that fails to compile");
      assert.deepEqual(compiles.filter((point) => !FROZEN_ENFORCEMENT_POINTS.includes(point)), [], "nothing compiles that a member may not name");
      assert.equal(compiles.length, 4, "the census is over four points, not over an empty vocabulary");

      // …and the compiling set cannot be wider than the vocabulary, because a point outside
      // it is refused by name rather than compiled.
      assert.throws(
        () => compileFrozenSet(declarationOf(memberAt("a surface nobody declared", { deny: ["Edit(x)"] }))),
        (error) => error instanceof FrozenSetError && error.code === "frozen-set-enforcement-point-unknown",
      );
    },
  },
  {
    name: "63/02 task00 — a marked member naming each of the four points is installed and produces that point's artifact",
    run: () => {
      const rows = [
        { point: "tool-call hook entries", artifact: "a hook entry" },
        { point: "permission denials", artifact: "a permission denial" },
        { point: "agent tool scope", artifact: "an agent tool scope" },
        { point: ENVELOPE_POINT, artifact: "an unattended launch shape" },
      ];
      assert.deepEqual(rows.map((row) => row.point), [...FROZEN_ENFORCEMENT_POINTS], "the outline's rows are the declared vocabulary");

      for (const { point, artifact } of rows) {
        const compiled = compileFrozenSet(declarationOf(memberAt(point, validRuleFor[point])));
        assert.deepEqual(compiled.installed, ["probe-member"], `${artifact}: the member is reported installed`);
        assert.deepEqual(compiled.deferred, [], `${artifact}: and nothing is deferred`);
        const produced = artifactFor[point](compiled);
        assert.equal(produced.length, 1, `${artifact}: the compiled set carries exactly one`);
      }

      const envelope = compileFrozenSet(declarationOf(memberAt(ENVELOPE_POINT, validRuleFor[ENVELOPE_POINT]))).unattendedLaunch;
      assert.deepEqual(
        { memberId: envelope.memberId, program: envelope.program, args: [...envelope.args] },
        { memberId: "probe-member", program: "probe-runner", args: ["probe", "loop"] },
        "the unattended launch shape is the one its member declared, and it names its member",
      );
    },
  },
  {
    name: "63/02 task00 — the compiled launch shape answers to the member that declared it, and is not a value the compiler holds",
    run: () => {
      const first = compileFrozenSet(withEnvelopeRule({ program: "first-runner", args: ["alpha"] })).unattendedLaunch;
      const second = compileFrozenSet(withEnvelopeRule({ program: "second-runner", args: ["beta", "gamma"] })).unattendedLaunch;

      assert.deepEqual({ program: first.program, args: [...first.args] }, { program: "first-runner", args: ["alpha"] });
      assert.deepEqual({ program: second.program, args: [...second.args] }, { program: "second-runner", args: ["beta", "gamma"] });
      assert.notDeepEqual({ program: first.program, args: [...first.args] }, { program: second.program, args: [...second.args] });

      // With the rule removed there is no artifact at all, so neither answer above is a value
      // the compiler would have produced without its member.
      assert.equal(compileFrozenSet(withoutEnvelopeMember()).unattendedLaunch, null);
    },
  },
  {
    name: "63/02 task00 — every malformed envelope rule refuses the whole compile, by code and by member name",
    run: () => {
      const rows = [
        { defect: "with no rule at all", rule: undefined },
        { defect: "whose rule is not an object", rule: ["work", "loop"] },
        { defect: "whose rule names no program", rule: { args: ["work", "loop"] } },
        { defect: "whose rule names a program that is not a string", rule: { program: 7, args: ["work", "loop"] } },
        { defect: "whose rule names no arguments", rule: { program: "aof" } },
        { defect: "whose rule names an argument that is not a string", rule: { program: "aof", args: ["work", 3] } },
        { defect: "whose rule carries a shape this point does not know", rule: { argument: RETIRED_ARGUMENT } },
      ];

      for (const { defect, rule } of rows) {
        let compiled = "the compile returned";
        assert.throws(
          () => { compiled = compileFrozenSet(withEnvelopeRule(rule)); },
          (error) => error instanceof FrozenSetError
            && typeof error.code === "string" && error.code.length > 0
            && error.memberId === ENVELOPE_MEMBER_ID
            && error.message.includes(ENVELOPE_MEMBER_ID),
          `an envelope member ${defect} is refused by name`,
        );
        assert.equal(compiled, "the compile returned", `${defect}: no compiled set is returned, not even a partial one`);
      }

      // The retired spelling is refused as a shape this point does not know, and says so.
      assert.throws(
        () => compileFrozenSet(withEnvelopeRule({ argument: RETIRED_ARGUMENT })),
        (error) => error.message.includes('"argument"') && error.message.includes("does not know"),
      );
    },
  },
  {
    name: "63/02 task00 — one malformed envelope member among well-formed members refuses the whole set",
    run: () => {
      const declaration = withEnvelopeRule({ program: "aof" });
      assert.ok(declaration.members.length > 1, "the malformed member really does sit among well-formed siblings");

      let compiled = null;
      assert.throws(() => { compiled = compileFrozenSet(declaration); }, FrozenSetError);
      assert.equal(compiled, null, "no enforcement point receives a rule from that compile");
    },
  },
  {
    name: "63/02 task00 — a second member at the envelope point refuses rather than silently overwriting the first",
    run: () => {
      const declaration = structuredClone(bundledFrozenSet());
      const usurper = {
        id: "second-envelope",
        protects: "the probe that a point carrying ONE artifact refuses a second claimant",
        enforcementPoint: ENVELOPE_POINT,
        aofManaged: "second-envelope",
        rule: { program: "usurper", args: ["takes", "over"] },
      };
      declaration.members.push(structuredClone(usurper));

      let compiled = "the compile returned";
      assert.throws(
        () => { compiled = compileFrozenSet(declaration); },
        (error) => error instanceof FrozenSetError && error.memberId === "second-envelope" && error.message.includes(ENVELOPE_MEMBER_ID),
        "the second claimant is refused by name, and the refusal names the member already holding the point",
      );
      assert.equal(compiled, "the compile returned", "no compiled set is returned");

      // Without the guard the LAST member wins and the first is gone with no report — an
      // enforcement point quietly answering to a member nobody expected. Order matters to
      // that failure, so it is driven both ways round.
      const reversed = structuredClone(bundledFrozenSet());
      reversed.members.unshift(structuredClone(usurper));
      assert.throws(() => compileFrozenSet(reversed), FrozenSetError, "…and the same either way round");
      assert.equal(compileFrozenSet(bundledFrozenSet()).unattendedLaunch.memberId, ENVELOPE_MEMBER_ID, "the shipped declaration still has exactly one claimant");
    },
  },
  {
    name: "63/02 task00 — an envelope entry nobody marked as aof's is left alone rather than reasserted",
    run: async () => tempDir(async (dir) => {
      const declaration = structuredClone(bundledFrozenSet());
      delete envelopeMemberOf(declaration).aofManaged;
      const { target, compiled } = await installedWorkspace(dir, declaration);
      const before = await readFile(target);

      assert.ok(compiled.escaped.includes(ENVELOPE_MEMBER_ID), "the entry is reported as one aof does not own");
      assert.equal(compiled.installed.includes(ENVELOPE_MEMBER_ID), false, "it is not reported installed");
      assert.equal(compiled.deferred.includes(ENVELOPE_MEMBER_ID), false, "it is not reported deferred");
      assert.equal(compiled.unattendedLaunch, null, "no unattended launch shape is produced from it");
      assert.deepEqual(await readFile(target), before, "the entry in the working tree is unchanged");
    }),
  },

  // ------------------------------------------------------------------- task 01 ----
  {
    name: "63/02 task01 — an unattended launch resolves the program and the leading arguments the declaration names",
    run: async () => tempDir(async (dir) => {
      const { declaredLaunch } = await installedWorkspace(dir);
      const launch = resolveUnattended(declaredLaunch, unattendedRequest(declaredLaunch));

      assert.equal(launch.refused, undefined, "a launch object is returned rather than a refusal");
      assert.equal(launch.bin, declaredLaunch.program, "the resolved program is the one the envelope member declares");
      assert.deepEqual(launch.args.slice(0, declaredLaunch.args.length), [...declaredLaunch.args], "the resolved arguments begin with the ones it declares, in the order it declares them");
      assert.equal(launch.memberId, ENVELOPE_MEMBER_ID);

      // A run may carry its own scope AFTER the declared tokens; the declared prefix is what
      // the envelope admits.
      const scoped = resolveUnattended(declaredLaunch, unattendedRequest(declaredLaunch, { args: [...declaredLaunch.args, "--scope", "63/02"] }));
      assert.deepEqual(scoped.args, [...declaredLaunch.args, "--scope", "63/02"]);
    }),
  },
  {
    name: "63/02 task01 — an unattended launch carries none of the session's own arguments and nothing identifying it as a session",
    run: async () => tempDir(async (dir) => {
      const { declaredLaunch } = await installedWorkspace(dir);
      const launch = resolveUnattended(declaredLaunch, unattendedRequest(declaredLaunch), {
        resumeSessionId: "a-persisted-conversation",
        session: { model: "opus-5", effort: "high" },
      });

      assert.equal(launch.args.some((token) => token.includes("NEEDS_INPUT")), false, "it carries no appended session instruction");
      assert.equal(launch.args.includes("--append-system-prompt"), false);
      assert.equal(launch.args.includes("--permission-mode"), false, "it carries no interactive permission mode");
      assert.equal(launch.args.includes("--resume"), false, "it carries no resumed conversation");
      assert.equal(launch.args.includes("a-persisted-conversation"), false);
      assert.equal(Object.hasOwn(launch, "providerId"), false, "nothing about it identifies it as a session");
      assert.equal(Object.hasOwn(launch.env, "AOF_TERMINAL_SESSION"), false);
      assert.equal(Object.hasOwn(launch.env, "AOF_TERMINAL_PROVIDER"), false);
      assert.equal(Object.hasOwn(launch.env, "ENABLE_PROMPT_CACHING_1H"), false);
      assert.equal(launch.unattended, true);

      // …and the attachment vectors a spawned run must never inherit are gone here too.
      for (const key of [...EDITOR_ATTACHMENT_KEYS, ...PARENT_SESSION_KEYS, "CLAUDE_EFFORT"]) {
        assert.equal(Object.hasOwn(launch.env, key), false, `${key} does not ride into an unattended launch`);
      }
      assert.equal(launch.env.ORDINARY_INHERITED, "rides-through", "every other inherited key rides through untouched");
    }),
  },
  {
    name: "63/02 task01 — every unattended request that is not the declared launch is refused, and starts no process",
    run: async () => tempDir(async (dir) => {
      const { declaredLaunch } = await installedWorkspace(dir);
      const declared = [...declaredLaunch.args];
      const rows = [
        { request: "naming a program the declaration does not name", unattended: { program: "claude", args: declared } },
        { request: "naming no program at all", unattended: { args: declared } },
        { request: "carrying no arguments at all", unattended: { program: declaredLaunch.program } },
        { request: "carrying a leading argument the declaration does not name", unattended: { program: declaredLaunch.program, args: ["run", ...declared.slice(1)] } },
        { request: "with one of the declared arguments removed", unattended: { program: declaredLaunch.program, args: declared.slice(0, -1) } },
        { request: "with the declared arguments in a different order", unattended: { program: declaredLaunch.program, args: [...declared].reverse() } },
        { request: "with an argument spliced in before the declared ones", unattended: { program: declaredLaunch.program, args: ["--verbose", ...declared] } },
        { request: "naming the declared program with a session's arguments", unattended: { program: declaredLaunch.program, args: ["--permission-mode", "auto"] } },
      ];
      assert.ok(declared.length > 1, "the reorder and removal rows are only meaningful over a multi-token declaration");

      for (const { request, unattended } of rows) {
        const answer = resolveUnattended(declaredLaunch, unattended);
        assert.equal(answer.refused, true, `${request}: it is refused`);
        assert.equal(typeof answer.code, "string", `${request}: with a code`);
        assert.ok(answer.code.length > 0);
        assert.equal(answer.memberId, ENVELOPE_MEMBER_ID, `${request}: the refusal names the envelope member`);
        assert.equal(Object.hasOwn(answer, "bin"), false, `${request}: no launch object is returned`);
        assert.notEqual(answer, null);

        const { spawns, outcome } = await driveAndCountSpawns({
          driver: "claude",
          which,
          env: launchEnv(),
          declaredLaunch,
          unattended,
        });
        assert.equal(spawns, 0, `${request}: no process is started`);
        assert.equal(outcome.processStarted, false);
        assert.equal(outcome.outcome, "failed");
      }
    }),
  },
  {
    name: "63/02 task01 — a request that is PRESENT AND EMPTY is refused, never sent down the attended path and never thrown out of the seam",
    run: async () => tempDir(async (dir) => {
      const { declaredLaunch } = await installedWorkspace(dir);

      // THE THREE THE FEATURE'S TABLE DOES NOT ENUMERATE. Its Examples header says "every way
      // a request can fail to be the declared launch" and lists eight, all of them well-formed
      // objects. These are the ones that are not objects at all, and they are what the
      // branch's `Object.hasOwn` guard exists for: with a truthiness test in its place
      // (`options.unattended != null`), an undefined or null request falls through to the
      // ATTENDED builder and a caller that asked to run unattended is handed an ordinary
      // session — `--permission-mode auto` and the worker instruction — REPORTED AS SUCCESS.
      // That is the quiet fallback 01's second paragraph says must not be reachable, and it
      // would be the fourth instance of the conflation species this milestone has already
      // produced three times. Driven here so the guard is pinned by more than its comment.
      const rows = [
        ["present and undefined", undefined],
        ["present and null", null],
        ["present and not an object at all", "aof work loop"],
        ["present as an array rather than an object", ["work", "loop"]],
        ["present as a number", 7],
      ];

      for (const [label, unattended] of rows) {
        let answer;
        assert.doesNotThrow(() => {
          answer = resolveInteractiveDriverLaunch("claude", { which, env: launchEnv(), declaredLaunch, unattended });
        }, `${label}: the seam's contract is never-throw`);

        assert.equal(answer.refused, true, `${label}: it is refused rather than launched`);
        assert.equal(answer.code, "unattended-launch-refused", `${label}: as a request that is not the declared launch`);
        assert.equal(answer.memberId, ENVELOPE_MEMBER_ID, `${label}: naming the envelope member`);

        // …and specifically NOT the attended session shape, named rather than implied.
        assert.equal(Object.hasOwn(answer, "bin"), false, `${label}: no launch object`);
        assert.equal(Object.hasOwn(answer, "args"), false);
        assert.equal(Object.hasOwn(answer, "env"), false);
        assert.equal(Object.hasOwn(answer, "providerId"), false, `${label}: nothing identifying it as a session`);
        assert.equal(JSON.stringify(answer).includes("--permission-mode"), false, `${label}: no interactive permission mode`);
        assert.equal(JSON.stringify(answer).includes("NEEDS_INPUT"), false, `${label}: no appended session instruction`);

        const { spawns, outcome } = await driveAndCountSpawns({ driver: "claude", which, env: launchEnv(), declaredLaunch, unattended });
        assert.equal(spawns, 0, `${label}: no process is started`);
        assert.equal(outcome.processStarted, false);
      }

      // The control that makes the five above a REFUSAL rather than a coincidence: the same
      // call with the key ABSENT is the attended launch, and it is the one this seam has
      // always given. "Not supplied" and "supplied and empty" are two answers.
      const absent = resolveInteractiveDriverLaunch("claude", { which, env: launchEnv(), declaredLaunch });
      assert.equal(absent.refused, undefined, "an absent key is not a request");
      assert.equal(absent.bin, "/stub/bin/claude");
      assert.ok(absent.args.includes("--permission-mode"), "…it is the ordinary attended session");
    }),
  },
  {
    name: "63/02 task01 — a declaration handed in half-built is refused as one that admits no unattended launch, not thrown",
    run: async () => tempDir(async (dir) => {
      const { declaredLaunch } = await installedWorkspace(dir);
      const request = { program: declaredLaunch.program, args: [...declaredLaunch.args] };

      // No production producer can reach these: `compileFrozenSet` yields either `null` or the
      // whole `{ memberId, program, args }`. They are pinned because the guard keeping them
      // out of the never-throw contract is otherwise held up by nothing — a half-built
      // declaration would reach `declared.args.length` and throw a TypeError out of a seam
      // whose one documented promise is that it does not.
      const rows = [
        ["nothing declared at all", null],
        ["a declaration that is not an object", "aof work loop"],
        ["a declaration naming a program and no arguments", { program: declaredLaunch.program }],
        ["a declaration naming arguments and no program", { args: [...declaredLaunch.args] }],
        ["a declaration whose arguments are not an array", { program: declaredLaunch.program, args: "work loop" }],
        ["a declaration whose program is not a string", { program: 7, args: [...declaredLaunch.args] }],
      ];

      for (const [label, declared] of rows) {
        let answer;
        assert.doesNotThrow(() => {
          answer = resolveInteractiveDriverLaunch("claude", { which, env: launchEnv(), declaredLaunch: declared, unattended: request });
        }, `${label}: the seam's contract is never-throw`);
        assert.equal(answer.refused, true, `${label}: it is refused`);
        assert.equal(answer.code, "unattended-launch-not-declared", `${label}: as a declaration admitting no unattended launch`);
        assert.equal(Object.hasOwn(answer, "bin"), false, `${label}: no launch object`);

        const { spawns } = await driveAndCountSpawns({ driver: "claude", which, env: launchEnv(), declaredLaunch: declared, unattended: request });
        assert.equal(spawns, 0, `${label}: no process is started`);
      }

      // Non-vacuity: the WHOLE declaration is admitted, so the six above fail on their shape.
      assert.equal(resolveInteractiveDriverLaunch("claude", { which, env: launchEnv(), declaredLaunch, unattended: request }).bin, declaredLaunch.program);
    }),
  },
  {
    name: "63/02 task01 — an unresolvable runtime still answers with nothing, and that is distinguishable from a refusal",
    run: async () => tempDir(async (dir) => {
      const { declaredLaunch } = await installedWorkspace(dir);
      const unresolvable = resolveInteractiveDriverLaunch("claude", {
        which: absentBinary,
        env: launchEnv(),
        declaredLaunch,
        unattended: unattendedRequest(declaredLaunch),
      });
      assert.equal(unresolvable, null, "the answer is the same one an unresolvable runtime has always produced");
      assert.equal(resolveInteractiveDriverLaunch("claude", { which: absentBinary, env: launchEnv() }), null, "…the same answer the attended path has always given");

      const refusal = resolveUnattended(declaredLaunch, { program: "claude", args: [...declaredLaunch.args] });
      assert.notEqual(refusal, null, "and it is distinguishable from the refusal a mismatched request produces");
      assert.equal(refusal.refused, true);

      // The three answers a caller must be able to tell apart, and each is a different value.
      const notSupplied = resolveInteractiveDriverLaunch("claude", { which, env: launchEnv(), unattended: unattendedRequest(declaredLaunch) });
      const notDeclared = resolveUnattended(compileFrozenSet(withoutEnvelopeMember()).unattendedLaunch, unattendedRequest(declaredLaunch));
      assert.equal(notSupplied.code, "unattended-launch-declaration-not-supplied", "a declaration never consulted is its own answer");
      assert.equal(notDeclared.code, "unattended-launch-not-declared", "…distinct from a declaration that admits no unattended launch");
      assert.equal(refusal.code, "unattended-launch-refused", "…distinct again from a request that is not the declared launch");
      assert.equal(new Set([notSupplied.code, notDeclared.code, refusal.code]).size, 3, "a fact never supplied and a fact that failed are different answers");
    }),
  },
  {
    name: "63/02 task01 — a refusal carries nothing a caller could spawn",
    run: async () => tempDir(async (dir) => {
      const { declaredLaunch } = await installedWorkspace(dir);
      const refusal = resolveUnattended(declaredLaunch, { program: "claude", args: [] });

      assert.equal(Object.hasOwn(refusal, "bin"), false, "it carries no program");
      assert.equal(Object.hasOwn(refusal, "program"), false);
      assert.equal(Object.hasOwn(refusal, "args"), false, "it carries no arguments");
      assert.equal(Object.hasOwn(refusal, "env"), false, "it carries no environment");
      assert.deepEqual(Object.keys(refusal).sort(), ["code", "detail", "memberId", "refused"]);
    }),
  },
  {
    name: "63/02 task01 — the declared launch is read from each workspace's own declaration at every resolution",
    run: async () => tempDir(async (root) => {
      const first = await installedWorkspace(path.join(root, "a"), withEnvelopeRule({ program: "first-runner", args: ["alpha"] }));
      const second = await installedWorkspace(path.join(root, "b"), withEnvelopeRule({ program: "second-runner", args: ["beta"] }));

      const firstLaunch = resolveUnattended(first.declaredLaunch, unattendedRequest(first.declaredLaunch));
      const secondLaunch = resolveUnattended(second.declaredLaunch, unattendedRequest(second.declaredLaunch));

      assert.deepEqual({ bin: firstLaunch.bin, args: firstLaunch.args }, { bin: "first-runner", args: ["alpha"] });
      assert.deepEqual({ bin: secondLaunch.bin, args: secondLaunch.args }, { bin: "second-runner", args: ["beta"] });
      assert.notDeepEqual(firstLaunch.args, secondLaunch.args, "neither answer is the other's");

      // Each workspace refuses the OTHER workspace's launch, which is what "read from the
      // declaration at every resolution" means when it is load-bearing rather than incidental.
      assert.equal(resolveUnattended(first.declaredLaunch, unattendedRequest(second.declaredLaunch)).refused, true);
      assert.equal(resolveUnattended(second.declaredLaunch, unattendedRequest(first.declaredLaunch)).refused, true);
    }),
  },

  // ------------------------------------------------------------------- task 02 ----
  {
    name: "63/02 task02 — every attended launch resolves exactly the program, argv and env it resolved before the fourth point compiled",
    run: () => {
      const compiledOut = compileFrozenSet(withoutEnvelopeMember()).unattendedLaunch;
      assert.equal(compiledOut, null, "the fourth point really is compiled out in the comparison arm");

      for (const row of ATTENDED) {
        const launch = resolveAttended(row);
        assert.notEqual(launch, null, `${row.launch}: it is a launch rather than a refusal`);
        assert.equal(launch.refused, undefined, `${row.launch}: it is a launch rather than a refusal`);
        assert.equal(launch.bin, "/stub/bin/claude", `${row.launch}: the program is the same one it resolved before`);
        assert.deepEqual(fingerprint(launch.args), row.args, `${row.launch}: the arguments are the same tokens in the same order`);
        assert.deepEqual(launch.env, row.env, `${row.launch}: the environment holds the same keys with the same values, with none added and none removed`);
        assert.deepEqual(Object.keys(launch.env).sort(), Object.keys(row.env).sort());

        // …and identical to the same call with the fourth point compiled out.
        const without = resolveAttended(row, { declaredLaunch: compiledOut });
        assert.deepEqual(
          { bin: without.bin, args: fingerprint(without.args), env: without.env, providerId: without.providerId },
          { bin: launch.bin, args: fingerprint(launch.args), env: launch.env, providerId: launch.providerId },
          `${row.launch}: the fourth point does not reach the attended path at all`,
        );
      }
      assert.equal(ATTENDED.length, 14, "the feature's twelve Examples rows are driven, plus the combined shape and the omitted driver id");
      assert.equal(DISTINCT_ATTENDED_SHAPES, 12, "…which is twelve DISTINCT inputs: two pairs of Examples rows are the same bag, because a directive is typed into the PTY and never reaches the launch");
    },
  },
  {
    name: "63/02 task02 — the environment decisions an attended launch makes are unchanged, key by named key",
    run: () => {
      for (const row of ATTENDED) {
        const { env } = resolveAttended(row);
        for (const key of EDITOR_ATTACHMENT_KEYS) assert.equal(Object.hasOwn(env, key), false, `${row.launch}: none of the editor-attachment keys are present`);
        for (const key of PARENT_SESSION_KEYS) assert.equal(Object.hasOwn(env, key), false, `${row.launch}: none of the parent-session keys are present`);
        assert.equal(Object.hasOwn(env, "CLAUDE_EFFORT"), false, `${row.launch}: the inherited effort override is not present`);
        assert.equal(env.ENABLE_PROMPT_CACHING_1H, "1", `${row.launch}: the one-hour prompt-cache key is present and set`);

        const attributed = row.options.attribution != null;
        assert.equal(Object.hasOwn(env, "OTEL_RESOURCE_ATTRIBUTES"), attributed, `${row.launch}: telemetry attribution keys are present exactly when attribution was supplied`);
        assert.equal(Object.hasOwn(env, "CLAUDE_CODE_ENABLE_TELEMETRY"), attributed);

        const heartbeat = row.options.heartbeat != null;
        assert.equal(Object.hasOwn(env, "AOF_RUN_ITEM_DIR"), heartbeat, `${row.launch}: the run item directory and run id are present exactly when a heartbeat was given`);
        assert.equal(Object.hasOwn(env, "AOF_RUN_ID"), heartbeat);

        assert.equal(env.ORDINARY_INHERITED, "rides-through", `${row.launch}: every other inherited key rides through untouched`);
        assert.equal(env.PATH, BASE_ENV.PATH);
        assert.equal(env.HOME, BASE_ENV.HOME);
      }

      // Non-vacuity: the scrubbed keys were actually PRESENT in the env handed in, so the
      // absences above are removals rather than a fixture that never carried them.
      for (const key of [...EDITOR_ATTACHMENT_KEYS, ...PARENT_SESSION_KEYS, "CLAUDE_EFFORT"]) {
        assert.ok(Object.hasOwn(BASE_ENV, key), `${key} is in the launch env before the scrub`);
      }
      assert.ok(ATTENDED.some((row) => row.options.attribution != null) && ATTENDED.some((row) => row.options.attribution == null), "both sides of the attribution condition are driven");
      assert.ok(ATTENDED.some((row) => row.options.heartbeat != null) && ATTENDED.some((row) => row.options.heartbeat == null), "both sides of the heartbeat condition are driven");
    },
  },
  {
    name: "63/02 task02 — no attended launch carries the argument the old rule spelled, or any argument the runtime would reject",
    run: () => {
      for (const row of ATTENDED) {
        const { args } = resolveAttended(row);
        assert.equal(args.includes(RETIRED_ARGUMENT), false, `${row.launch}: the retired spelling is absent`);
        assert.equal(args.some((token) => token.startsWith("--aof-")), false, `${row.launch}: and so is anything shaped like it`);
        const flags = args.filter((token) => token.startsWith("-") && !token.includes("\n"));
        assert.deepEqual(flags.filter((flag) => !KNOWN_FLAGS.includes(flag)), [], `${row.launch}: every flag is one the runtime accepts`);
      }
      assert.equal(RETIRED_ARGUMENT, "--aof-gate-order", "the retired spelling is recorded here, since the declaration no longer carries it");
      assert.equal(bundledFrozenSet().members.some((member) => JSON.stringify(member.rule ?? {}).includes(RETIRED_ARGUMENT)), false, "…and no member declares it any more");
    },
  },
  {
    name: "63/02 task02 — every attended session still carries the instruction that produces the needs-input signal, unchanged",
    run: () => {
      for (const row of ATTENDED) {
        const { args } = resolveAttended(row);
        const at = args.indexOf("--append-system-prompt");
        assert.ok(at >= 0, `${row.launch}: the appended worker instruction is present`);
        const instruction = args[at + 1];
        assert.equal(
          `sha256:${createHash("sha256").update(instruction, "utf8").digest("hex")}`,
          BEFORE_INSTRUCTION,
          `${row.launch}: it is the same instruction it was before the fourth point compiled`,
        );
        assert.ok(instruction.includes("NEEDS_INPUT"), "…and it is the instruction that produces the needs-input signal");
        assert.ok(instruction.includes("AOF_DIRECTIVE_COMPLETE"));
      }
    },
  },
  {
    name: "63/02 task02 — an attended launch is never refused and is never answered with the unattended shape",
    run: async () => tempDir(async (dir) => {
      const { declaredLaunch } = await installedWorkspace(dir);
      for (const row of ATTENDED) {
        const launch = resolveAttended(row, { declaredLaunch });
        assert.equal(launch.refused, undefined, `${row.launch}: none of them is refused`);
        assert.equal(launch.unattended, undefined, `${row.launch}: none is answered with the unattended launch shape`);
        assert.equal(launch.bin, "/stub/bin/claude");
        assert.notEqual(launch.bin, declaredLaunch.program);
        assert.equal(launch.providerId, "claude");
      }
    }),
  },
  {
    name: "63/02 task02 — an attended launch does not move when the declared launch does",
    run: () => {
      const first = compileFrozenSet(withEnvelopeRule({ program: "first-runner", args: ["alpha"] })).unattendedLaunch;
      const second = compileFrozenSet(withEnvelopeRule({ program: "second-runner", args: ["beta"] })).unattendedLaunch;
      assert.notDeepEqual({ ...first }, { ...second }, "the two workspaces really do declare different launches");

      for (const row of ATTENDED) {
        const a = resolveAttended(row, { declaredLaunch: first });
        const b = resolveAttended(row, { declaredLaunch: second });
        assert.deepEqual({ bin: a.bin, args: a.args, env: a.env }, { bin: b.bin, args: b.args, env: b.env }, `${row.launch}: the two answers are identical in program, arguments and environment`);
        for (const named of [first, second]) {
          assert.notEqual(a.bin, named.program, `${row.launch}: neither answer names anything the envelope member declares`);
          for (const token of [named.program, ...named.args]) {
            assert.equal(a.args.includes(token), false);
            assert.equal(Object.values(a.env).includes(token), false);
          }
        }
      }
    },
  },

  // ------------------------------------------------------------------- task 03 ----
  {
    name: "63/02 task03 — the envelope member's rule names a program and the arguments that carry it, and no argument a runtime would reject",
    run: () => {
      const rule = envelopeMemberOf(bundledFrozenSet()).rule;

      assert.equal(typeof rule.program, "string");
      assert.ok(rule.program.length > 0, "it names a program");
      assert.doesNotMatch(rule.program, /[\s/\\]/u, "…a bare executable name a runner can resolve on PATH");
      assert.equal(rule.program.startsWith("-"), false);
      assert.equal(PROVIDER_IDS.includes(rule.program), false, "…and it is not one of the interactive session runtimes: an unattended run is a loop, not a session");

      assert.ok(Array.isArray(rule.args) && rule.args.length > 0, "it names the leading arguments an unattended run may carry");
      for (const token of rule.args) {
        assert.equal(typeof token, "string");
        assert.ok(token.length > 0);
        assert.equal(token.startsWith("-"), false, "the declared arguments are a subcommand path, not flags");
      }
      assert.equal(rule.args.includes(RETIRED_ARGUMENT), false, "it names no argument the runtime would reject");
      assert.equal(Object.hasOwn(rule, "argument"), false, "the referent-free spelling is gone from the declaration");
    },
  },
  {
    name: "63/02 task03 — the re-declaration changes the rule and nothing else about the member's identity",
    run: () => {
      const after = envelopeMemberOf(bundledFrozenSet());

      assert.equal(after.id, PREVIOUS_MEMBER.id, "its id is unchanged");
      assert.equal(after.protects, PREVIOUS_MEMBER.protects, "what it protects is unchanged");
      assert.equal(after.enforcementPoint, PREVIOUS_MEMBER.enforcementPoint, "its enforcement point is unchanged");
      assert.equal(after.aofManaged, PREVIOUS_MEMBER.aofManaged, "its ownership marker is unchanged");

      assert.notDeepEqual(after.rule, PREVIOUS_MEMBER.rule, "its rule is a launch shape in place of a bare argument");
      assert.deepEqual(Object.keys(PREVIOUS_MEMBER.rule), ["argument"], "the previous rule was a bare argument");
      assert.deepEqual(Object.keys(after.rule).sort(), ["args", "program"], "…and the new one is a launch shape");
    },
  },
  {
    name: "63/02 task03 — the declaration a workspace runs is byte-identical to the declaration aof ships",
    run: async () => {
      const [installed, shipped] = await Promise.all([
        readFile(path.join(repoRoot, ...FROZEN_SET_RELPATH.split("/"))),
        readFile(path.join(repoRoot, "src", "bundle", "frozen-set.jsonc")),
      ]);
      assert.deepEqual(installed, shipped, "the two are identical as bytes, line endings included");

      const installedMember = envelopeMemberOf(JSON.parse(installed.toString("utf8").replace(/^\s*\/\/[^\r\n]*(?:\r?\n|$)/u, "")));
      assert.deepEqual(installedMember.rule, envelopeMemberOf(bundledFrozenSet()).rule, "the envelope member's rule is the same rule in both");
    },
  },
  {
    name: "63/02 task03 — a workspace holding the previous declaration carries the re-declared member once the bundle is installed over it",
    run: async () => tempDir(async (dir) => {
      const previous = structuredClone(bundledFrozenSet());
      previous.members[previous.members.findIndex((member) => member.id === ENVELOPE_MEMBER_ID)] = structuredClone(PREVIOUS_MEMBER);
      const { target } = await installedWorkspace(dir, previous, { compile: false });
      assert.deepEqual(envelopeMemberOf(await readFrozenSet(dir)).rule, { argument: RETIRED_ARGUMENT }, "the workspace really does start on the old spelling");

      // The bundle's own asset body, at its own declared target — the bytes the installer
      // writes, taken from the loader rather than re-derived here.
      const asset = loadBundle().assets.find((member) => member.target === FROZEN_SET_RELPATH);
      assert.ok(asset != null, "the declaration ships as a bundle asset with a target under .aof/");
      await writeFile(target, asset.body, "utf8");

      const after = await readFrozenSet(dir);
      assert.deepEqual(envelopeMemberOf(after).rule, envelopeMemberOf(bundledFrozenSet()).rule, "the envelope member in that workspace names the re-declared launch");
      assert.deepEqual(
        after.members.filter((member) => member.id !== ENVELOPE_MEMBER_ID),
        previous.members.filter((member) => member.id !== ENVELOPE_MEMBER_ID),
        "no other member changes",
      );
    }),
  },
  {
    name: "63/02 task03 — the rule is load-bearing: a workspace declaring its own launch resolves that launch and not one fixed in code",
    run: async () => tempDir(async (dir) => {
      const { declaredLaunch } = await installedWorkspace(dir, withEnvelopeRule({ program: "workspace-runner", args: ["its-own", "loop"] }));
      const launch = resolveUnattended(declaredLaunch, unattendedRequest(declaredLaunch));

      assert.deepEqual({ bin: launch.bin, args: launch.args }, { bin: "workspace-runner", args: ["its-own", "loop"] }, "the answer follows what that workspace declares");

      const shipped = compileFrozenSet(bundledFrozenSet()).unattendedLaunch;
      assert.notEqual(launch.bin, shipped.program, "it does not follow a launch fixed anywhere outside the declaration");
      assert.equal(resolveUnattended(declaredLaunch, unattendedRequest(shipped)).refused, true, "…and the shipped launch is refused here, because this workspace does not declare it");
    }),
  },
  {
    name: "63/02 task03 — the member is still a line a reviewer can retract",
    run: () => {
      const full = compileFrozenSet(bundledFrozenSet());
      const retracted = compileFrozenSet(withoutEnvelopeMember());

      assert.equal(retracted.unattendedLaunch, null, "the compiled set produces no unattended launch shape");
      assert.deepEqual(retracted.hooks, full.hooks, "every other enforcement point compiles exactly as it did");
      assert.deepEqual(retracted.permissions, full.permissions);
      assert.deepEqual(retracted.agentScopes, full.agentScopes);
      assert.deepEqual(retracted.deferred, []);
      assert.deepEqual(retracted.installed, full.installed.filter((id) => id !== ENVELOPE_MEMBER_ID));
      assert.ok(full.installed.includes(ENVELOPE_MEMBER_ID), "…and the retraction was non-vacuous");
    },
  },
];
