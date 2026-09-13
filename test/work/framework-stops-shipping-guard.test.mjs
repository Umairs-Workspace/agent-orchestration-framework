// Story 87 / task 00 — a repository's lab hygiene leaves the bundle.
//
// The `test-isolation` member's declaration named its own subject: "the real ~/.aof global
// store from unisolated aof test runs". The store is this machine's, the runs are this
// repository's own suite. A team installing aof to govern their work stream inherited none
// of that hazard and every one of its consequences — a blocked `npm test` and an
// environment variable that does nothing there — with no supported way out, because
// `claudeSettingsPatch` compiles from the declaration inside the aof package rather than
// the copy it installs.
//
// ONE MEMBER IS WITHDRAWN, NOT THE MECHANISM. The frozen set, its compiler, its coded
// refusals, its tamper coding and its five remaining members are untouched.
//
// THE HONEST BOUNDARY: RETRACTED, NOT ERASED. An installed consumer loses the settings
// entry on the next update, so the rule stops firing — that is the harm, and it ends. The
// guard file an earlier version wrote is left where it is, invoked by nothing: the
// installer writes assets and does not prune them, and giving it a retraction path is a
// separate change with its own blast radius. The last outline row asserts that boundary
// rather than leaving an orphan nobody named.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync, readdirSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  bundledFrozenSet,
  compileFrozenSet,
  FROZEN_ENFORCEMENT_POINTS,
  FROZEN_MEMBER_MARKER,
  FrozenSetError,
} from "../../src/frozen-set.mjs";
import { AOF_HOOK_MARKER, applyClaudeSettingsMerge, claudeSettingsPath, isAofEntry } from "../../src/claude-settings.mjs";
import { loadBundle, readDescriptor, renderBundleOutputs } from "../../src/work/bundle.mjs";
import { generateAssetManifest } from "../../scripts/sea-asset-manifest.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const GUARD_TARGET = ".claude/hooks/aof/guard-test-isolation.mjs";
const GUARD_BODY = path.join(repoRoot, "src", "bundle", "hooks", "guard-test-isolation.mjs");

// THE MEMBERS THAT REMAIN ARE READ FROM THE DECLARATION, never retyped here (119/ADR-003,
// chore 120). This file used to carry a `REMAINING` table of `[id, enforcementPoint]` pairs,
// re-measured at 61/01 — a second copy of the declaration, billed to whoever next moved the set
// (TECH_DEBT item 81, discharged). What 87 withdrew stays withdrawn: the rows below assert the
// withdrawn member is absent and that no member protects this repository's own lab hygiene, over
// every member the declaration actually carries.
const WITHDRAWN_ID = "test-isolation";

// The entry the framework used to compile into a consumer's settings, exactly as
// `markedEntry` wrote it — the thing the next update has to retract.
const INSTALLED_ENTRY = Object.freeze({
  type: "command",
  command: "node",
  args: [`\${CLAUDE_PROJECT_DIR}/${GUARD_TARGET}`],
  [AOF_HOOK_MARKER]: "test-isolation",
  [FROZEN_MEMBER_MARKER]: "test-isolation",
});

const OPERATOR_PRE_TOOL_USE = Object.freeze({ matcher: "Read", hooks: [{ type: "command", command: "echo operator-read" }] });
const OPERATOR_SESSION_START = Object.freeze({ matcher: "", hooks: [{ type: "command", command: "echo operator-start" }] });

function listFilesDirect(dir) {
  const out = [];
  (function recurse(current) {
    for (const name of readdirSync(current).sort()) {
      const full = path.join(current, name);
      if (statSync(full).isDirectory()) recurse(full);
      else out.push(path.relative(dir, full).split(path.sep).join("/"));
    }
  })(dir);
  return out.sort();
}

const readSettings = async (file) => JSON.parse(await readFile(file, "utf8"));

const aofEntriesOn = (settings, event) => (settings?.hooks?.[event] ?? [])
  .flatMap((group) => (group?.hooks ?? []).filter(isAofEntry));

async function consumer(body, settings = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-87-consumer-"));
  try {
    await mkdir(path.join(dir, ".claude", "hooks", "aof"), { recursive: true });
    await writeFile(claudeSettingsPath(dir), `${JSON.stringify(settings, null, 2)}\n`, "utf8");
    return await body({ dir, settingsPath: claudeSettingsPath(dir) });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// A consumer that already carries the framework-owned entry, plus operator entries on the
// same event and on another one — the "existing install" subject.
const installedConsumer = () => ({
  hooks: {
    PreToolUse: [structuredClone(OPERATOR_PRE_TOOL_USE), { matcher: "Bash|PowerShell", hooks: [structuredClone(INSTALLED_ENTRY)] }],
    SessionStart: [structuredClone(OPERATOR_SESSION_START)],
  },
  permissions: { deny: ["Read(**/*.pem)"] },
});

export const frameworkStopsShippingGuardTests = [
  {
    name: "87/00 the shipped declaration no longer names the test-isolation guard",
    run: () => {
      const declaration = bundledFrozenSet();
      for (const member of declaration.members) {
        assert.ok(
          !/global store|unisolated/i.test(member.protects),
          `no member protects a global store from unisolated suite invocations — "${member.id}" still does`,
        );
      }
      // DERIVED, NOT RETYPED (119/ADR-003, chore 120): the members are the declaration's own, judged
      // one by one below; the withdrawn member is asserted absent by name, and the set non-empty.
      assert.ok(declaration.members.length > 0, "the declaration was read: it carries members");
      assert.equal(declaration.members.some((member) => member.id === WITHDRAWN_ID), false, `${WITHDRAWN_ID} stays withdrawn`);
      for (const member of declaration.members) {
        assert.ok(member.protects.trim().length > 0, `${member.id} still names what it protects`);
        assert.ok(FROZEN_ENFORCEMENT_POINTS.includes(member.enforcementPoint), `${member.id} still names a known enforcement point`);
      }
      // The mechanism is untouched: a member that names no enforcement point still refuses.
      assert.throws(
        () => compileFrozenSet({ members: [{ id: "no-point", protects: "the refusal probe", aofManaged: "no-point", rule: {} }] }),
        (error) => error instanceof FrozenSetError && error.code === "frozen-set-enforcement-point-missing" && error.memberId === "no-point",
      );
    },
  },
  {
    name: "87/00 the guard is no longer an asset the framework installs, and the asset census matches the smaller tree in both directions",
    run: () => {
      const descriptor = readDescriptor();
      assert.equal(
        descriptor.members.some((member) => String(member?.target ?? "").replaceAll("\\", "/") === GUARD_TARGET),
        false,
        "nothing in the bundle descriptor targets a test-isolation guard in a consumer's hook directory",
      );
      assert.equal(existsSync(GUARD_BODY), false, "the guard body is absent from the bundle's own hook tree");

      const manifest = generateAssetManifest(repoRoot);
      const direct = listFilesDirect(path.join(repoRoot, "src", "bundle"));
      assert.deepEqual(manifest.bundle, direct, "the generated asset census matches the real bundle tree exactly, in both directions");
      assert.equal(direct.includes("hooks/guard-test-isolation.mjs"), false, "…and the withdrawn body is in neither");
    },
  },
  {
    name: "87/00 a fresh consumer install plants no rule over their own build commands",
    run: async () => consumer(async ({ dir, settingsPath }) => {
      const result = await applyClaudeSettingsMerge(dir, { name: "consumer" });
      assert.notEqual(result.action, "refused", `the install refused: ${result.message ?? ""}`);
      const settings = await readSettings(settingsPath);

      // No framework-authored entry judges a command before it runs.
      assert.deepEqual(aofEntriesOn(settings, "PreToolUse"), [], "no framework-authored PreToolUse entry is planted");
      assert.equal(Object.hasOwn(settings.hooks ?? {}, "PreToolUse"), false, "…and the event key is not even created for one");

      // Nothing the bundle renders lands a guard in their hook directory.
      const outputs = renderBundleOutputs(loadBundle(), { runtimes: ["claude"] });
      assert.equal(outputs.some((output) => output.path === GUARD_TARGET), false, "the render plants no test-isolation guard");
      assert.deepEqual(
        outputs.map((output) => output.path).filter((candidate) => candidate.startsWith(".claude/hooks/aof/")).sort(),
        [".claude/hooks/aof/artifact-sync-enqueue.mjs", ".claude/hooks/aof/run-heartbeat-enqueue.mjs"],
        "…only the two enqueue scripts, each installed by its own sibling descriptor",
      );
      assert.equal(existsSync(path.join(dir, ...GUARD_TARGET.split("/"))), false, "their hook directory carries no test-isolation guard");
    }),
  },
  {
    name: "87/00 an existing consumer has the rule retracted on the next update, and nothing else moves",
    run: async () => consumer(async ({ dir, settingsPath }) => {
      const before = await readSettings(settingsPath);
      assert.equal(aofEntriesOn(before, "PreToolUse").length, 1, "the fixture really starts with the framework-owned entry");

      await applyClaudeSettingsMerge(dir, { name: "consumer" });
      const after = await readSettings(settingsPath);

      assert.equal(
        JSON.stringify(after.hooks.PreToolUse).includes("test-isolation"),
        false,
        "the framework-owned test-isolation entry is gone",
      );
      assert.deepEqual(after.hooks.PreToolUse, [OPERATOR_PRE_TOOL_USE], "the operator's own entry survives, in its own position");
      assert.equal(
        JSON.stringify(after.hooks.SessionStart[0]),
        JSON.stringify(OPERATOR_SESSION_START),
        "the operator's entry at another event is byte-identical and still first",
      );

      // No other compiled member's output changed.
      const declaration = bundledFrozenSet();
      const compiled = compileFrozenSet(declaration);
      assert.deepEqual(after.permissions.deny, ["Read(**/*.pem)", ...compiled.permissions.map((entry) => entry.rule)]);
      // DERIVED, NOT RETYPED (119/ADR-003, chore 120): every member the declaration carries is
      // still installed after the withdrawal, in declaration order — the six-id literal this line
      // used to carry stood for exactly that, and was billed to whoever next moved the set
      // (TECH_DEBT item 81, discharged).
      assert.ok(declaration.members.length > 0, "the declaration was read: it carries members");
      assert.deepEqual(compiled.installed, declaration.members.map((member) => member.id), "every declared member is installed after the withdrawal, in declaration order");
    }, installedConsumer()),
  },
  {
    name: "87/00 the withdrawal reaches exactly the surfaces that carried the member, and deliberately stops at the ones that did not",
    run: async () => {
      const declaration = bundledFrozenSet();
      const descriptor = readDescriptor();
      const compiled = compileFrozenSet(declaration);
      const bundleTree = listFilesDirect(path.join(repoRoot, "src", "bundle"));
      const censusSource = await readFile(path.join(repoRoot, "test", "bundle", "bundle-asset-manifest-complete.test.mjs"), "utf8");

      const rows = [
        ["the shipped declaration", () => {
          const ids = declaration.members.map((member) => member.id);
          assert.ok(ids.length > 0, "the declaration was read: it carries members");
          assert.equal(ids.includes(WITHDRAWN_ID), false, `${WITHDRAWN_ID} stays withdrawn`);
          for (const member of declaration.members) {
            assert.ok(FROZEN_ENFORCEMENT_POINTS.includes(member.enforcementPoint), `${member.id} names a known enforcement point`);
            assert.doesNotMatch(String(member.protects), /~\/\.aof|global store|unisolated/u, `${member.id} does not protect this repository's own lab hygiene — that is what 87 withdrew`);
          }
        }],
        ["the bundled asset descriptor", () => {
          const assets = descriptor.members.filter((member) => member.kind === "asset").map((member) => member.id);
          assert.equal(assets.includes("test-isolation-guard"), false, "short the guard asset");
          for (const id of ["artifact-sync-enqueue", "run-heartbeat-enqueue", "frozen-set-declaration"]) {
            assert.ok(assets.includes(id), `every other asset is unmoved — ${id}`);
          }
        }],
        ["the bundle's hook tree", () => {
          const hooks = bundleTree.filter((file) => file.startsWith("hooks/"));
          assert.equal(hooks.includes("hooks/guard-test-isolation.mjs"), false, "short the guard body");
          assert.ok(hooks.includes("hooks/artifact-sync-enqueue.mjs") && hooks.includes("hooks/run-heartbeat-enqueue.mjs"), "its sibling hook bodies are present");
        }],
        ["the asset census that counts the bundle tree", () => {
          // AMENDED (TECH_DEBT item 80, `c1c5e4bd`). This read the census's hand-typed count and
          // asserted it had been re-measured to the smaller tree. That literal was red at HEAD ten
          // times over, because a number is only re-measured by whoever remembers to; the census
          // now compares its walk against `git ls-files src/bundle`, a reader the author of a
          // bundle change necessarily updates by committing.
          //
          // The claim survives and gets stronger. "Re-measured to the smaller tree" was a way of
          // saying the census cannot be left describing a tree that no longer exists; a set
          // equality against git's index says that for every file at once, and catches a swap the
          // count never could. So the leg asserts the census's SHAPE, and the withdrawal itself is
          // asserted directly against `bundleTree` in the row above.
          assert.match(censusSource, /assert\.deepEqual\(direct,\s*indexed,/u, "the census compares its walk against git's own index — a reader that cannot be left stale, not a count");
          assert.equal(/direct\.length\s*>=/u.test(censusSource), false, "…and it is an exact set, never a lower bound");
        }],
        ["a consumer's framework-authored hook entries", () => {
          assert.deepEqual(compiled.hooks, [], "carrying no rule about how a command is invoked");
        }],
        ["a consumer's permission denials", () => {
          // DERIVED from the declaration (119/ADR-003, chore 120): every member that names the
          // permission-denials point compiles each of its declared deny rules, in order, and
          // nothing else compiles there. The six-row literal this stood for was a second copy.
          const denying = declaration.members.filter((member) => member.enforcementPoint === "permission denials");
          assert.ok(denying.length > 0, "the declaration names members at the permission-denials point");
          const expected = denying.flatMap((member) => (member.rule?.deny ?? []).map((rule) => [member.id, rule]));
          assert.ok(expected.length > 0, "…and each declares at least one deny rule");
          assert.deepEqual(compiled.permissions.map((entry) => [entry.id, entry.rule]), expected, "the compiled denials are the declared ones, member by member, in declaration order");
          assert.ok(denying.some((member) => member.id === "anchors"), "the anchors member still compiles there");
          assert.ok(denying.some((member) => member.id === "acceptor-criterion"), "…and 61/01's sixth member compiles beside it at the same point");
          assert.equal(
            compiled.permissions.some((entry) => entry.id === "test-isolation"),
            false,
            "…and nothing the withdrawal removed came back with it",
          );
        }],
        ["a consumer's agent tool scopes", () => {
          assert.deepEqual(
            [...new Set(Object.values(compiled.agentScopes).map((scope) => scope.memberId))].sort(),
            ["litmus", "locked-contract", "tag-vocabulary"],
            "unchanged — the three scope members still compile",
          );
          assert.equal(Object.keys(compiled.agentScopes).length, 8, "…over all eight bundled agents");
        }],
      ];
      for (const [surface, check] of rows) {
        try {
          check();
        } catch (error) {
          error.message = `${surface}: ${error.message}`;
          throw error;
        }
      }

      // The three consumer-side rows need a real merge, so they run against one fixture.
      await consumer(async ({ dir, settingsPath }) => {
        // An entry an operator claimed by removing its marker, and a guard file an earlier
        // version installed, both seeded before the update.
        const claimed = { ...structuredClone(INSTALLED_ENTRY), args: ["operator-owned.mjs"] };
        delete claimed[AOF_HOOK_MARKER];
        const seeded = installedConsumer();
        seeded.hooks.PreToolUse.push({ matcher: "Bash", hooks: [claimed] });
        await writeFile(settingsPath, `${JSON.stringify(seeded, null, 2)}\n`, "utf8");
        const orphan = path.join(dir, ...GUARD_TARGET.split("/"));
        await writeFile(orphan, "// installed by an earlier version\n", "utf8");

        await applyClaudeSettingsMerge(dir, { name: "consumer" });
        const after = await readSettings(settingsPath);

        assert.deepEqual(
          after.hooks.PreToolUse[0],
          OPERATOR_PRE_TOOL_USE,
          "a consumer's operator-authored entries: unchanged, in their own positions",
        );
        const survivor = after.hooks.PreToolUse.flatMap((group) => group.hooks ?? []).filter((entry) => entry.args?.[0] === "operator-owned.mjs");
        assert.equal(survivor.length, 1, "an entry an operator claimed by removing its marker: left alone, as the escape hatch already promises");
        assert.equal(Object.hasOwn(survivor[0], AOF_HOOK_MARKER), false, "…and it is not re-marked");
        assert.deepEqual(aofEntriesOn(after, "PreToolUse"), [], "…while the framework's own marked entry is retracted");

        assert.equal(existsSync(orphan), true, "a guard file an earlier version installed: left on disk");
        assert.equal(
          JSON.stringify(after.hooks).includes(`\${CLAUDE_PROJECT_DIR}/${GUARD_TARGET}`),
          false,
          "…invoked by nothing",
        );
      }, installedConsumer());
    },
  },
];
