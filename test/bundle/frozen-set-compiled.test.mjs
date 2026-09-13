// 55/04's compiler cases. Story 87 withdrew the `test-isolation` member, which was the
// only hook-shaped member the bundle shipped and therefore the only thing exercising the
// compiler's hook branch — its marker, its surgical splice into a co-authored settings
// file, its retraction when the member leaves, and its coded tamper. That branch is now
// exercised through the SYNTHETIC member below, built for the purpose, so the coverage
// stays with the compiler that owns the behaviour rather than with a declaration that may
// change under it. The guard's own predicate cases left with the guard: they are re-homed
// onto the file this repository executes, in `repo-test-isolation-guard.test.mjs`.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyFrozenAgentScopes,
  bundledFrozenSet,
  compileFrozenSet,
  FROZEN_ENFORCEMENT_POINTS,
  FROZEN_MEMBER_MARKER,
  FrozenSetError,
} from "../../src/frozen-set.mjs";
import {
  AOF_HOOK_MARKER,
  applyClaudeSettingsMerge,
  claudeSettingsPath,
  formatClaudeSettingsOutcome,
} from "../../src/claude-settings.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const declarationPath = path.join(repoRoot, "src", "bundle", "frozen-set.jsonc");

// The synthetic hook-shaped member. It is declared HERE and never ships: the compiler's
// hook branch is the subject under test, and holding that branch through whatever member
// the bundle happens to declare is what left it uncovered the moment one was withdrawn.
const SYNTHETIC_HOOK_MEMBER = Object.freeze({
  id: "synthetic-hook",
  protects: "the compiler's hook branch, so it is exercised by a member built for the purpose",
  enforcementPoint: "tool-call hook entries",
  aofManaged: "synthetic-hook",
  rule: {
    event: "PreToolUse",
    matcher: "Bash|PowerShell",
    command: "node",
    args: ["${CLAUDE_PROJECT_DIR}/.claude/hooks/aof/synthetic-hook.mjs"],
  },
});

function withHookMember(declaration) {
  return { ...declaration, members: [...declaration.members, structuredClone(SYNTHETIC_HOOK_MEMBER)] };
}

async function fixture(body, settings = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-frozen-set-"));
  try {
    await mkdir(path.join(dir, ".claude"), { recursive: true });
    await writeFile(claudeSettingsPath(dir), `${JSON.stringify(settings, null, 2)}\n`, "utf8");
    return await body({ dir, settingsPath: claudeSettingsPath(dir) });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const readSettings = async (file) => JSON.parse(await readFile(file, "utf8"));
const frozenEntries = (settings) => Object.entries(settings?.hooks ?? {}).flatMap(([event, groups]) =>
  (groups ?? []).flatMap((group) => (group?.hooks ?? []).filter((entry) => entry[FROZEN_MEMBER_MARKER]).map((entry) => ({ event, entry }))));

function withoutMember(declaration, id) {
  return { ...declaration, members: declaration.members.filter((member) => member.id !== id) };
}

export const frozenSetCompiledTests = [
  {
    name: "frozen-set/00 declaration is reviewable and every member names its subject and enforcement point",
    run: async () => {
      const bytes = await readFile(declarationPath, "utf8");
      const declaration = bundledFrozenSet();
      assert.ok(bytes.includes('"members"'), "the declaration is a readable working-tree file");
      // DERIVED, NOT RETYPED (119/ADR-003, chore 120). This line used to carry the six member ids
      // as a literal, re-measured at 87's withdrawal and again at 61/01's arrival — a second copy
      // of the declaration, which is the policy's one home, and a bill sent to whoever next moved
      // the set (TECH_DEBT item 81, discharged here). What the census stood for is asserted over
      // every member below; the FLOOR is the one declared bound: six members froze at 61/ADR-005
      // §3, and a member leaves only by a withdrawal ceremony (87's), which lowers it. A member
      // arriving needs no edit here and is still judged in full.
      const MEMBER_FLOOR = 6;
      assert.ok(declaration.members.length >= MEMBER_FLOOR, `the declaration carries ${declaration.members.length} members, below the ${MEMBER_FLOOR} that froze at 61/ADR-005 §3 — a member leaves by a withdrawal ceremony that lowers this floor, never quietly`);
      assert.equal(new Set(declaration.members.map((member) => member.id)).size, declaration.members.length, "every member id is unique");
      for (const member of declaration.members) {
        assert.ok(member.protects.length > 0, `${member.id} names what it protects`);
        assert.ok(FROZEN_ENFORCEMENT_POINTS.includes(member.enforcementPoint), `${member.id} names a known enforcement point`);
      }
    },
  },
  {
    name: "frozen-set/00 missing and unknown enforcement points refuse by member id and list the vocabulary",
    run: () => {
      const base = { id: "bad-rule", protects: "the test subject", aofManaged: "bad-rule", rule: {} };
      assert.throws(
        () => compileFrozenSet({ members: [base] }),
        (error) => error instanceof FrozenSetError && error.code === "frozen-set-enforcement-point-missing" && error.memberId === "bad-rule",
      );
      assert.throws(
        () => compileFrozenSet({ members: [{ ...base, enforcementPoint: "an unnamed surface" }] }),
        (error) => error.code === "frozen-set-enforcement-point-unknown"
          && FROZEN_ENFORCEMENT_POINTS.every((point) => error.message.includes(point)),
      );
    },
  },
  {
    name: "frozen-set/00 the compiled points answer to the declaration, an unnamed point compiles to nothing, and the worker launch envelope compiles to the launch its member declares",
    run: () => {
      const compiled = compileFrozenSet(bundledFrozenSet());
      // No shipped member names the tool-call hook point since story 87, so it compiles
      // to nothing — asserted, rather than left as an empty set nobody looks at.
      assert.deepEqual(compiled.hooks, [], "an enforcement point no member names produces no rule");
      assert.ok(compiled.permissions.some((entry) => entry.id === "anchors"));
      assert.equal(compiled.agentScopes["aof-developer"].memberId, "locked-contract");
      // 63/02 (ADR-005 1, ADR-010 5) — the fourth point compiles. `deferred` was
      // `["gate-order"]` from 55 until 2026-09-02: the envelope had a spelling and no
      // enforcement, reported by name, which is the only honest way to carry a gap and also
      // the reason it survived. It is now EMPTY, and empty is asserted as a whole set rather
      // than as the absence of one id, so a fifth point cannot arrive deferred unnoticed.
      assert.deepEqual(compiled.deferred, []);
      assert.ok(compiled.installed.includes("gate-order"), "the envelope member reaches its enforcement point");
      assert.equal(compiled.unattendedLaunch.memberId, "gate-order", "…and the artifact it produced traces back to it");
      assert.deepEqual(
        { program: compiled.unattendedLaunch.program, args: [...compiled.unattendedLaunch.args] },
        (() => { const rule = bundledFrozenSet().members.find((member) => member.id === "gate-order").rule; return { program: rule.program, args: [...rule.args] }; })(),
        "…and it is the launch the declaration names rather than a value fixed in the compiler",
      );

      // …and the branch binds the moment a member DOES name that point.
      const withHook = compileFrozenSet(withHookMember(bundledFrozenSet()));
      assert.deepEqual(withHook.hooks.map((hook) => hook.frozenMember), ["synthetic-hook"]);
      assert.equal(withHook.hooks[0].event, "PreToolUse");
      assert.equal(withHook.hooks[0].claude[FROZEN_MEMBER_MARKER], "synthetic-hook");
    },
  },
  {
    name: "frozen-set/00 a declared hook member compiles marked beside an operator's entry and deleting it retracts only its hook",
    run: async () => fixture(async ({ dir, settingsPath }) => {
      const operator = { matcher: "Read", hooks: [{ type: "command", command: "echo operator" }] };
      await writeFile(settingsPath, `${JSON.stringify({ hooks: { PreToolUse: [operator] } }, null, 2)}\n`);
      await applyClaudeSettingsMerge(dir, { name: "fixture" }, { bundleHooks: [], frozenSet: withHookMember(bundledFrozenSet()) });
      let settings = await readSettings(settingsPath);
      assert.equal(frozenEntries(settings).length, 1, "exactly one hook entry appears");
      assert.equal(frozenEntries(settings)[0].entry[FROZEN_MEMBER_MARKER], "synthetic-hook");

      await applyClaudeSettingsMerge(dir, { name: "fixture" }, { bundleHooks: [], frozenSet: bundledFrozenSet() });
      settings = await readSettings(settingsPath);
      assert.deepEqual(settings.hooks.PreToolUse, [operator], "the operator's entry survives in its own position");
      assert.ok(settings.permissions.deny.includes("Edit(.aof/loops/**)"), "the other compiled member is unchanged");
    }),
  },
  {
    name: "frozen-set/01 permission arrays merge surgically, preserve operator order and expose declaration ownership",
    run: async () => fixture(async ({ dir, settingsPath }) => {
      const settings = {
        model: "operator-model",
        permissions: { allow: ["Bash(git status)"], deny: ["Read(**/*.pem)", "Read(**/*.key)"] },
      };
      await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
      const result = await applyClaudeSettingsMerge(dir, { name: "fixture" }, { bundleHooks: [], frozenSet: bundledFrozenSet() });
      const after = await readSettings(settingsPath);
      assert.deepEqual(after.permissions.allow, settings.permissions.allow);
      assert.deepEqual(after.permissions.deny.slice(0, 2), settings.permissions.deny, "operator entries and their relative positions survive");
      assert.deepEqual(after.permissions.deny.slice(2), [
        "Edit(.aof/loops/**)",
        "Write(.aof/loops/**)",
        "Edit(.aof/acceptor-criterion.jsonc)",
        "Write(.aof/acceptor-criterion.jsonc)",
        "Edit(.aof/acceptor-ledger.jsonl)",
        "Write(.aof/acceptor-ledger.jsonl)",
      ]);
      const owners = new Map(compileFrozenSet(bundledFrozenSet()).permissions.map((entry) => [entry.rule, entry.id]));
      assert.equal(owners.get(after.permissions.deny[2]), "anchors", "aof's string entry is identifiable through its marked declaration member");
      assert.equal(owners.get(after.permissions.deny[4]), "acceptor-criterion", "…and so is the sixth member's, which arrived at the same point with no new compile target");
      assert.deepEqual(after.model, settings.model);
      assert.ok(result.installed.includes("anchors"));
    }),
  },
  {
    name: "frozen-set/01 retraction and the ownership escape hatch affect only aof's permission rules",
    run: async () => fixture(async ({ dir, settingsPath }) => {
      const operator = ["Read(**/*.pem)", "Read(**/*.key)"];
      await writeFile(settingsPath, `${JSON.stringify({ permissions: { deny: operator } }, null, 2)}\n`);
      await applyClaudeSettingsMerge(dir, {}, { bundleHooks: [], frozenSet: bundledFrozenSet() });

      // The rules the OTHER compiled permission member owns, derived rather than spelled a
      // second time here: the sixth member arriving is exactly the event that reddened this
      // literal once, and a list derived from the declaration cannot go stale that way.
      const acceptorRules = compileFrozenSet(bundledFrozenSet()).permissions.filter((entry) => entry.id === "acceptor-criterion").map((entry) => entry.rule);
      assert.equal(acceptorRules.length, 4, "the sibling member really does compile rules of its own");

      const escaped = structuredClone(bundledFrozenSet());
      delete escaped.members.find((member) => member.id === "anchors")[AOF_HOOK_MARKER];
      await applyClaudeSettingsMerge(dir, {}, { bundleHooks: [], frozenSet: escaped });
      assert.deepEqual((await readSettings(settingsPath)).permissions.deny, [...operator, "Edit(.aof/loops/**)", "Write(.aof/loops/**)", ...acceptorRules], "unmarking hands the rules to the operator");

      await applyClaudeSettingsMerge(dir, {}, { bundleHooks: [], frozenSet: withoutMember(bundledFrozenSet(), "anchors") });
      assert.deepEqual((await readSettings(settingsPath)).permissions.deny, [...operator, ...acceptorRules], "deleting a managed member retracts exactly its rules");
    }),
  },
  {
    name: "frozen-set/01 an unchanged compile writes nothing, while an unparseable document refuses unchanged",
    run: async () => fixture(async ({ dir, settingsPath }) => {
      await applyClaudeSettingsMerge(dir, {}, { bundleHooks: [], frozenSet: bundledFrozenSet() });
      const before = await readFile(settingsPath, "utf8");
      const beforeMtime = (await stat(settingsPath)).mtimeMs;
      await new Promise((resolve) => setTimeout(resolve, 25));
      const skipped = await applyClaudeSettingsMerge(dir, {}, { bundleHooks: [], frozenSet: bundledFrozenSet() });
      assert.equal(skipped.action, "skipped");
      assert.equal((await stat(settingsPath)).mtimeMs, beforeMtime);

      await writeFile(settingsPath, "{ torn", "utf8");
      const refused = await applyClaudeSettingsMerge(dir, {}, { bundleHooks: [], frozenSet: bundledFrozenSet() });
      assert.equal(refused.code, "claude-settings-unparseable");
      assert.equal(refused.written, false);
      assert.equal(await readFile(settingsPath, "utf8"), "{ torn");
      assert.notEqual(before, "{ torn");
    }),
  },
  {
    name: "frozen-set/02 a member that cannot reach its agent scope refuses by id before any resource changes",
    run: () => {
      const resources = [{ id: "operator", kind: "agent", tools: ["Read"] }];
      const before = structuredClone(resources);
      const compiled = { agentScopes: { missing: { memberId: "locked-contract", tools: ["Read"] } } };
      assert.throws(
        () => applyFrozenAgentScopes(resources, compiled),
        (error) => error.code === "frozen-set-compile-refused" && error.memberId === "locked-contract",
      );
      assert.deepEqual(resources, before, "the refused preflight wrote no member scope");
    },
  },
  {
    name: "frozen-set/02 an invalid member refuses the settings compile without partially applying valid siblings",
    run: async () => fixture(async ({ dir, settingsPath }) => {
      const before = await readFile(settingsPath, "utf8");
      const declaration = structuredClone(bundledFrozenSet());
      declaration.members.push({
        id: "cannot-compile",
        protects: "the refusal probe",
        enforcementPoint: "permission denials",
        aofManaged: "cannot-compile",
        rule: { deny: [] },
      });
      const result = await applyClaudeSettingsMerge(dir, {}, { bundleHooks: [], frozenSet: declaration });
      assert.equal(result.code, "frozen-set-member-invalid");
      assert.equal(result.memberId, "cannot-compile");
      assert.equal(result.written, false);
      assert.equal(await readFile(settingsPath, "utf8"), before, "no valid sibling was written before the refusal");
    }),
  },
  {
    name: "frozen-set/02 successful compile reports installed ids, an exact set that moved with the withdrawal",
    run: () => {
      const declaration = bundledFrozenSet();
      const compiled = compileFrozenSet(declaration);
      // DERIVED, NOT RETYPED (119/ADR-003, chore 120): the installed set IS the declaration's
      // member set, in declaration order — every declared member reaches its enforcement point,
      // none deferred, none escaped — which is what the six-id literal this line used to carry
      // stood for. `gate-order` joined at 63/02 when the fourth point started compiling to the
      // unattended launch shape (63/ADR-005 §1); the declaration's floor lives in frozen-set/00.
      const declared = declaration.members.map((member) => member.id);
      assert.ok(declared.length > 0, "the declaration was read: it carries members");
      assert.deepEqual(compiled.installed, declared, "every declared member is installed, in declaration order");
      assert.deepEqual(compiled.deferred, [], "…none is deferred to a point that does not compile");
      assert.deepEqual(compiled.escaped, [], "…and none escaped as unowned");
      assert.deepEqual(
        compileFrozenSet(withHookMember(declaration)).installed,
        [...declared, "synthetic-hook"],
        "a declared hook member reaches an enforcement point and is reported installed",
      );
    },
  },
  {
    name: "frozen-set/03 frozen tamper is coded and restored while ordinary aof drift remains drift",
    run: async () => fixture(async ({ dir, settingsPath }) => {
      const ordinary = {
        id: "ordinary-hook", event: "PostToolUse", matcher: "Write", type: "command", command: "node", runtimes: ["claude"], claude: { args: ["ordinary.mjs"] },
      };
      const declaration = withHookMember(bundledFrozenSet());
      await applyClaudeSettingsMerge(dir, { hooks: [ordinary] }, { bundleHooks: [], frozenSet: declaration });
      const edited = await readSettings(settingsPath);
      const frozen = frozenEntries(edited)[0].entry;
      frozen.args = ["edited-frozen.mjs"];
      const normal = edited.hooks.PostToolUse.flatMap((group) => group.hooks).find((entry) => entry[AOF_HOOK_MARKER] === "ordinary-hook");
      normal.args = ["edited-ordinary.mjs"];
      await writeFile(settingsPath, `${JSON.stringify(edited, null, 2)}\n`);

      const result = await applyClaudeSettingsMerge(dir, { hooks: [ordinary] }, { bundleHooks: [], frozenSet: declaration });
      assert.deepEqual(result.tamper.map((entry) => [entry.code, entry.memberId]), [["frozen-set-tamper", "synthetic-hook"]]);
      assert.deepEqual(result.drift.map((entry) => entry.id), ["ordinary-hook"]);
      assert.equal(frozenEntries(await readSettings(settingsPath))[0].entry.args[0].endsWith("synthetic-hook.mjs"), true);
      const report = formatClaudeSettingsOutcome(result, { targetDir: dir });
      assert.match(report, /tamper\[frozen-set-tamper\]/);
      assert.match(report, /remove the "aofManaged" key/);
    }),
  },
  {
    name: "frozen-set/03 removing the ownership marker preserves an edited frozen entry without tamper, retraction or re-marking",
    run: async () => fixture(async ({ dir, settingsPath }) => {
      const declaration = withHookMember(bundledFrozenSet());
      await applyClaudeSettingsMerge(dir, {}, { bundleHooks: [], frozenSet: declaration });
      const taken = await readSettings(settingsPath);
      const entry = frozenEntries(taken)[0].entry;
      delete entry[AOF_HOOK_MARKER];
      entry.args = ["operator-owned.mjs"];
      await writeFile(settingsPath, `${JSON.stringify(taken, null, 2)}\n`);

      const result = await applyClaudeSettingsMerge(dir, {}, { bundleHooks: [], frozenSet: declaration });
      const after = await readSettings(settingsPath);
      const claimed = frozenEntries(after).filter((candidate) => candidate.entry[FROZEN_MEMBER_MARKER] === "synthetic-hook");
      assert.equal(claimed.length, 1);
      assert.equal(claimed[0].entry.args[0], "operator-owned.mjs");
      assert.equal(Object.hasOwn(claimed[0].entry, AOF_HOOK_MARKER), false);
      assert.deepEqual(result.tamper, []);

      await applyClaudeSettingsMerge(dir, {}, { bundleHooks: [], frozenSet: withoutMember(declaration, "synthetic-hook") });
      assert.equal(frozenEntries(await readSettings(settingsPath)).some((candidate) => candidate.entry.args[0] === "operator-owned.mjs"), true);
    }),
  },
];
