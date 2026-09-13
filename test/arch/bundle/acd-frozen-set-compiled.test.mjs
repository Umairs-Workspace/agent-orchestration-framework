// FF-5505 / ADR-004: no aof-authored rule exists at any enforcement point without a
// frozen-set member declaring it — and permissions never re-enter the old
// top-level-spread overwrite path.
//
// RE-AIMED AT STORY 85, AND THE RE-AIM IS THE POINT. This control used to assert that
// `compiled.hooks` was non-empty and that `compiled.hooks[0]` carried the id
// `test-isolation`. That is a CENSUS OF WHAT SHIPPED, over-specified beyond the universal
// FF-5505 actually declares — the register says nothing about the set being non-empty, and
// the pinned literal would have gone on asserting one withdrawn id forever. When story 87
// withdrew the only hook-shaped member, the control broke loudly, which was correct.
//
// THE FORBIDDEN REPAIR (the class spike 82 exists to catch) was to relax it to
// `compiled.hooks.every(hook => hook.frozenMember)` — VACUOUSLY TRUE over an empty set. The
// control would report as enforced while holding nothing, which is worse than no control,
// because a register entry says it is armed.
//
// THE REPAIR TAKEN: derive the expectation FROM THE DECLARATION. An enforcement point no
// member names must compile to nothing and be ASSERTED to compile to nothing; a point a
// member does name must produce output carrying that member's id, and every owned member at
// a compiled point must reach the output. The control binds the moment anyone declares a
// hook member again, without anybody remembering to re-arm it.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundledFrozenSet, compileFrozenSet, FROZEN_OWNERSHIP_MARKER } from "../../../src/frozen-set.mjs";
import { loadBundle } from "../../../src/work/bundle.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SETTINGS_SOURCE = path.join(repoRoot, "src", "claude-settings.mjs");
const BUNDLE_DESCRIPTOR = path.join(repoRoot, "src", "bundle", "bundle.json");
const MEMBER_CENSUS_SOURCE = path.join(repoRoot, "test", "bundle", "frozen-set-compiled.test.mjs");
const TREE_CENSUS_SOURCE = path.join(repoRoot, "test", "bundle", "bundle-asset-manifest-complete.test.mjs");

// The FOUR compiled enforcement points and where each one's output lands, with the field that
// carries the declaring member's id.
//
// WIDENED AT 63/02, IN THE BODY RATHER THAN AT THE ASSERTION (63/ADR-010 5, correcting
// ADR-005 4). This map held THREE entries with a comment saying "the worker launch envelope
// is deliberately absent", and `traceProblems` below `continue`s past any member whose
// enforcement point is not a key of it. So editing only the `deferred` deepEqual would have
// armed the fourth enforcement point and BLINDED ITS OWN TRACE in one commit — this control
// green while tracing nothing at the very point the milestone had just armed, which is
// "report as enforced while holding nothing", the thing this file's own header at :5-21 says
// it was re-aimed to refuse. The fourth entry is what makes the fourth point traced rather
// than merely counted, and it is why the map is now derived-shaped: one accessor pair per
// point, with the compiled artifact carrying its declaring member's id exactly as the other
// three do.
const COMPILED_POINTS = {
  "tool-call hook entries": { rules: (compiled) => compiled.hooks ?? [], declaredBy: (rule) => rule?.frozenMember },
  "permission denials": { rules: (compiled) => compiled.permissions ?? [], declaredBy: (rule) => rule?.id },
  "agent tool scope": { rules: (compiled) => Object.values(compiled.agentScopes ?? {}), declaredBy: (rule) => rule?.memberId },
  "the worker launch envelope": { rules: (compiled) => (compiled.unattendedLaunch ? [compiled.unattendedLaunch] : []), declaredBy: (rule) => rule?.memberId },
};

const owned = (member) => member?.[FROZEN_OWNERSHIP_MARKER] === member?.id;

// The report the control answers from: one row per compiled enforcement point, stating who
// declared it and what it produced. A point with no member reads "named by no member" —
// legible, rather than an empty set nobody distinguishes from a satisfied one.
function enforcementPointReport(declaration, compiled) {
  const declaredIds = new Set((declaration?.members ?? []).map((member) => member?.id));
  return Object.entries(COMPILED_POINTS).map(([point, shape]) => {
    const declaredBy = (declaration?.members ?? []).filter((member) => member?.enforcementPoint === point && owned(member)).map((member) => member.id);
    const rules = shape.rules(compiled);
    return {
      point,
      declaredBy,
      produced: rules.length,
      untraced: rules.filter((rule) => !declaredIds.has(shape.declaredBy(rule))).length,
      state: declaredBy.length === 0 ? "named by no member" : "declared by a member",
    };
  });
}

function traceProblems(declaration, compiled) {
  const problems = [];
  for (const row of enforcementPointReport(declaration, compiled)) {
    if (row.untraced > 0 || (row.declaredBy.length === 0 && row.produced > 0)) {
      problems.push(`a rule at the enforcement point "${row.point}" that no member declared`);
    }
    if (row.declaredBy.length > 0 && row.produced === 0) {
      problems.push(`a declared member at "${row.point}" compiled to nothing: ${row.declaredBy.join(", ")}`);
    }
  }
  for (const member of declaration?.members ?? []) {
    if (!Object.hasOwn(COMPILED_POINTS, member?.enforcementPoint) || !owned(member)) continue;
    if (!(compiled.installed ?? []).includes(member.id)) {
      problems.push(`a declared member that reached no enforcement point: ${member.id}`);
    }
  }
  return problems;
}

// The census cross-check: the member-id literal a sibling control pins must be the set the
// declaration actually carries. A literal that drifts silently is a tripwire that has been
// cut without anyone noticing.
// The member census ships in ONE of two forms, and this reader names which:
//   "literal" — the pre-120 shape, `assert.deepEqual(declaration.members.map((member) => member.id), [...])`,
//               a retyped list that CAN disagree with the declaration and is compared to it;
//   "derived" — chore 120's shape (119/ADR-003, `9b64eb32`), `const declared = declaration.members.map(...)`
//               asserted against `compiled.installed`: the census IS the declaration, so it cannot
//               drift from it — the same amendment leg 3 took under TECH_DEBT item 80, when its
//               hand-typed count went red at HEAD for the tenth time. AMENDED 2026-09-12: this
//               reader still parsed only the literal, so the shipped derived census read as
//               "could not be read" and the control was red on `main` — inherited by every story
//               graded on the tier. A control that can only pass on the shape it was written against
//               is the staleness it exists to catch.
function censusForm(source) {
  const literal = /declaration\.members\.map\(\(member\) => member\.id\),\s*(\[[^\]]*\])/.exec(source);
  if (literal != null) return { form: "literal", ids: JSON.parse(literal[1].replaceAll("'", '"')) };
  const derived = /const\s+declared\s*=\s*declaration\.members\.map\(\(member\) => member\.id\);[\s\S]*?assert\.deepEqual\(\s*compiled\.installed,\s*declared\b/.test(source);
  return derived ? { form: "derived", ids: null } : null;
}

function censusProblems(declaration, source) {
  const census = censusForm(source);
  if (census == null) return ["the member-id census could be read in neither form (a retyped literal, or a set derived from the declaration), so the control cannot check it"];
  if (census.form === "derived") return [];
  const declared = (declaration?.members ?? []).map((member) => member?.id);
  return JSON.stringify(census.ids) === JSON.stringify(declared)
    ? []
    : [`the census literal disagrees with the declaration: census ${JSON.stringify(census.ids)} vs declaration ${JSON.stringify(declared)}`];
}

function permissionMergeProblems(source) {
  const problems = [];
  if (!/const\s+\{\s*permissions:\s*configuredPermissions,\s*\.\.\.otherSettings\s*\}\s*=\s*settingsPatch/.test(source)) {
    problems.push("settingsPatch.permissions is not removed before the top-level spread");
  }
  if (/const\s+merged\s*=\s*\{\s*\.\.\.current,\s*\.\.\.settingsPatch\s*\}/.test(source)) {
    problems.push("the destructive top-level settingsPatch spread is present");
  }
  if (!/function\s+splicePermissions\s*\(/.test(source)) problems.push("the array-wise permissions splice is absent");
  return problems;
}

const HOOK_MEMBER = Object.freeze({
  id: "probe-hook",
  protects: "the red probe's hook-shaped subject",
  enforcementPoint: "tool-call hook entries",
  aofManaged: "probe-hook",
  rule: { event: "PreToolUse", matcher: "Bash", command: "node", args: ["${CLAUDE_PROJECT_DIR}/probe.mjs"] },
});

const withHookMember = (declaration) => ({ ...declaration, members: [...declaration.members, structuredClone(HOOK_MEMBER)] });

export const archTests = [
  {
    name: "arch/55 ADR-004 (acd-frozen-set-compiled): every compiled rule traces to the member that declared it, and no rule is produced at a point no member declared",
    run: () => {
      const declaration = bundledFrozenSet();
      const compiled = compileFrozenSet(declaration);
      assert.deepEqual(traceProblems(declaration, compiled), [], "FF-5505: a rule exists at an enforcement point with no member declaring it");
      assert.deepEqual(compiled.deferred, [], "63/ADR-005 1: every declared point compiles, so nothing is left deferred");
      assert.ok(compiled.installed.includes("gate-order"), "…and the member that was deferred for two months is installed");

      const bundle = loadBundle();
      const agents = bundle.resources.filter((resource) => resource.kind === "agent");
      assert.ok(agents.length > 0 && agents.every((agent) => agent.frozenMember && Array.isArray(agent.tools)), "every bundled agent tool scope is compiled from a frozen member");
    },
  },
  {
    name: "arch/55 ADR-004 (acd-frozen-set-compiled): an enforcement point no member names compiles to nothing and is REPORTED as unnamed, never as satisfied",
    run: () => {
      const declaration = bundledFrozenSet();
      const report = enforcementPointReport(declaration, compileFrozenSet(declaration));
      const hooks = report.find((row) => row.point === "tool-call hook entries");
      assert.deepEqual(hooks.declaredBy, [], "no shipped member names the tool-call hook point since story 87");
      assert.equal(hooks.produced, 0, "…so it compiles to nothing");
      assert.equal(hooks.state, "named by no member", "…and the control says so rather than reporting the point satisfied");
      for (const row of report.filter((candidate) => candidate.point !== "tool-call hook entries")) {
        assert.ok(row.declaredBy.length > 0 && row.produced > 0, `${row.point} is named by a member and produces member-traced output`);
        assert.equal(row.state, "declared by a member");
      }
      // 63/02 — the fourth point is in that loop by NAME, asserted positively rather than
      // left to the filter: the widening above is only a widening if this row exists.
      assert.deepEqual(
        report.find((row) => row.point === "the worker launch envelope"),
        { point: "the worker launch envelope", declaredBy: ["gate-order"], produced: 1, untraced: 0, state: "declared by a member" },
      );

      // The binding leg: the control re-arms itself the moment a hook member is declared.
      const withHook = withHookMember(declaration);
      const armed = enforcementPointReport(withHook, compileFrozenSet(withHook)).find((row) => row.point === "tool-call hook entries");
      assert.deepEqual(armed.declaredBy, ["probe-hook"]);
      assert.equal(armed.produced, 1);
      assert.deepEqual(traceProblems(withHook, compileFrozenSet(withHook)), []);
    },
  },
  {
    name: "arch/55 ADR-004 (acd-frozen-set-compiled): the three census controls assert exact sets and exact counts, and each reads the set that ships after the withdrawal",
    run: async () => {
      const memberSource = await readFile(MEMBER_CENSUS_SOURCE, "utf8");
      const treeSource = await readFile(TREE_CENSUS_SOURCE, "utf8");
      const declaration = bundledFrozenSet();
      const compiled = compileFrozenSet(declaration);

      // 1. the member ids, in order — derived from the declaration since chore 120, so they
      //    agree with it by construction; a retyped literal is still compared.
      assert.deepEqual(censusProblems(declaration, memberSource), []);
      // 2. the ids that reached an enforcement point: the SAME derived set, asserted exactly
      //    against `compiled.installed` (a retyped literal, where one ships, is read instead).
      const installedLiteral = /compiled\.installed,\s*(\[[^\]]*\])/.exec(memberSource);
      if (installedLiteral != null) {
        assert.deepEqual(JSON.parse(installedLiteral[1].replaceAll("'", '"')), compiled.installed, "the installed census literal reads the withdrawn set");
      } else {
        assert.equal(censusForm(memberSource)?.form, "derived", "the installed census is the derived member set");
        assert.deepEqual(compiled.installed, declaration.members.map((member) => member.id), "…and the shipped set is what it derives to");
      }
      // 3. the bundle tree.
      //
      // AMENDED (TECH_DEBT item 80, `c1c5e4bd`). This read a hand-typed COUNT literal —
      // `assert.equal(direct.length, 87, …)` — and that literal was red at HEAD for the tenth
      // time, because a number nobody's diff necessarily touches goes stale every time a bundle
      // file is added. The census now compares the tree against `git ls-files src/bundle`: a
      // reader independent of the walker, which the author of a new bundle file necessarily
      // updates by committing it. That is a STRONGER census than the count — a set equality
      // catches a swap the count cannot see — so the leg is amended to assert the census that
      // ships rather than to demand back the one that kept going stale.
      assert.ok(
        /assert\.deepEqual\(direct,\s*indexed,/.test(treeSource),
        "the bundle-tree census is a set equality against git's own index, and it is readable",
      );

      // Each is an EXACT assertion, never a lower bound — moving a literal to the new
      // truth keeps the tripwire; relaxing it to `>=` throws it away.
      assert.ok(
        /assert\.deepEqual\(declaration\.members\.map/.test(memberSource) || censusForm(memberSource)?.form === "derived",
        "the member census is an exact set assertion — a retyped literal, or the declaration's own derived set",
      );
      assert.ok(/assert\.deepEqual\(\s*compiled\.installed/.test(memberSource) || /assert\.deepEqual\(compiled\.installed/.test(memberSource), "the installed census is an exact set assertion");
      assert.ok(!/direct\.length\s*>=/.test(treeSource), "the bundle-tree census is an exact set, not a lower bound");
    },
  },
  {
    name: "arch/55 ADR-004 (acd-frozen-set-compiled): red probe - every way a trace can break is named, including the empty-set vacuity the re-aim exists for",
    run: async () => {
      const declaration = bundledFrozenSet();
      const compiled = compileFrozenSet(declaration);
      const withHook = withHookMember(declaration);
      const hookCompiled = compileFrozenSet(withHook);
      const untraced = /that no member declared/;

      // Row 1 — a compiled hook stripped of its member id.
      const strippedHook = { ...hookCompiled, hooks: hookCompiled.hooks.map((hook) => ({ ...hook, frozenMember: undefined })) };
      assert.ok(traceProblems(withHook, strippedHook).some((problem) => untraced.test(problem) && problem.includes("tool-call hook entries")));

      // Row 2 — a compiled permission denial stripped of its member id.
      const strippedPermission = { ...compiled, permissions: compiled.permissions.map((entry) => ({ ...entry, id: undefined })) };
      assert.ok(traceProblems(declaration, strippedPermission).some((problem) => untraced.test(problem) && problem.includes("permission denials")));

      // Row 3 — a compiled agent tool scope stripped of its member id.
      const strippedScopes = { ...compiled, agentScopes: Object.fromEntries(Object.entries(compiled.agentScopes).map(([id, scope]) => [id, { ...scope, memberId: undefined }])) };
      assert.ok(traceProblems(declaration, strippedScopes).some((problem) => untraced.test(problem) && problem.includes("agent tool scope")));

      // Row 4 — a hook member declared but absent from the compiled output entirely.
      const unreached = { ...hookCompiled, hooks: [], installed: hookCompiled.installed.filter((id) => id !== "probe-hook") };
      assert.ok(traceProblems(withHook, unreached).some((problem) => problem.includes("reached no enforcement point: probe-hook")));

      // Row 5 — THE ANTI-VACUITY LEG: an empty compiled hook set while a member names that
      // point. The relaxed `every(...)` repair is green here; this control is not.
      const vacuous = { ...hookCompiled, hooks: [] };
      assert.ok(vacuous.hooks.every((hook) => hook.frozenMember), "the forbidden `every(...)` repair is vacuously true over the empty set");
      assert.ok(traceProblems(withHook, vacuous).some((problem) => problem.includes('compiled to nothing: probe-hook')), "…and the re-aimed control still fails");

      // Row 5b — 63/02's own two: a compiled unattended launch stripped of its member id, and
      // an envelope member declared but reaching no output. These are the rows that make the
      // fourth map entry above load-bearing: with the entry removed, `traceProblems` skips
      // `gate-order` entirely and BOTH of these go quiet while the suite reports green.
      const strippedLaunch = { ...compiled, unattendedLaunch: { ...compiled.unattendedLaunch, memberId: undefined } };
      assert.ok(traceProblems(declaration, strippedLaunch).some((problem) => untraced.test(problem) && problem.includes("the worker launch envelope")));
      const unreachedLaunch = { ...compiled, unattendedLaunch: null, installed: compiled.installed.filter((id) => id !== "gate-order") };
      assert.ok(traceProblems(declaration, unreachedLaunch).some((problem) => problem.includes('compiled to nothing: gate-order')));
      assert.ok(traceProblems(declaration, unreachedLaunch).some((problem) => problem.includes("reached no enforcement point: gate-order")));

      // Row 6 — a member id added to the declaration and not to a RETYPED census literal. The
      // shipped census is derived and cannot disagree (that is chore 120's point), so the row
      // is driven against a synthetic literal-form source — the detector must still name the
      // drift when a literal ships — and the shipped form is asserted to be the derived one.
      const memberSource = await readFile(MEMBER_CENSUS_SOURCE, "utf8");
      assert.equal(censusForm(memberSource)?.form, "derived", "guard: the shipped member census is derived from the declaration");
      const extra = { ...declaration, members: [...declaration.members, structuredClone(HOOK_MEMBER)] };
      const retyped = `assert.deepEqual(declaration.members.map((member) => member.id), ${JSON.stringify(declaration.members.map((member) => member.id))});`;
      assert.ok(censusProblems(extra, retyped).some((problem) => problem.includes("the census literal disagrees with the declaration")));
      assert.deepEqual(censusProblems(declaration, retyped), [], "…and a literal that agrees passes");
      assert.ok(censusProblems(declaration, "no census here").some((problem) => problem.includes("could be read in neither form")), "…and an absent census is named, never passed");
    },
  },
  {
    name: "arch/55 ADR-004 (acd-frozen-set-compiled): permissions are spliced array-wise and the declaration rides the bundle while the withdrawn guard asset does not",
    run: async () => {
      const source = await readFile(SETTINGS_SOURCE, "utf8");
      assert.deepEqual(permissionMergeProblems(source), [], "the co-authored permissions merge regressed");
      const descriptor = JSON.parse(await readFile(BUNDLE_DESCRIPTOR, "utf8"));
      const byId = new Map(descriptor.members.map((member) => [member.id, member]));
      assert.equal(byId.get("frozen-set-declaration")?.target, ".aof/frozen-set.jsonc");
      assert.equal(byId.has("test-isolation-guard"), false, "story 87: the guard asset left the bundle with the member that declared it");
      assert.equal(
        descriptor.members.some((member) => String(member?.target ?? "").endsWith("guard-test-isolation.mjs")),
        false,
        "…and nothing else installs it into a consumer's hook directory under another id",
      );
    },
  },
  {
    name: "arch/55 ADR-004 (acd-frozen-set-compiled): red probe - restoring the destructive permissions spread is detected",
    run: async () => {
      const source = await readFile(SETTINGS_SOURCE, "utf8");
      const mutated = source.replace(
        "const merged = { ...current, ...otherSettings };",
        "const merged = { ...current, ...settingsPatch };",
      );
      assert.notEqual(mutated, source, "the red probe changed the real merge line");
      assert.ok(permissionMergeProblems(mutated).some((problem) => problem.includes("destructive")), "FF-5505 reports the planted overwrite path");
    },
  },
];
