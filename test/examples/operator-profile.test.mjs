import { defaultApplication as _aofApplication } from "aof/default-application";
// Traceability wiring for milestone 193 / story 02 — the operator says who they are.
//
// Covers EVERY @executable scenario in
//   tasks/00_the-operator-states-a-role-and-a-level-per-domain.feature
//   tasks/01_a-project-overrides-the-machine-wide-default.feature
//   tasks/02_a-domain-nobody-listed-is-new.feature
// except FF-19203's two, which are `test/arch/examples/acd-operator-profile-one-resolver.test.mjs`;
// and, for milestone 193 / story 03, every @executable scenario in
//   tasks/02_the-doctor-says-once-that-no-profile-is-declared.feature
//   tasks/03_the-update-says-it-too.feature
//
// The leaf (`@aof/contracts/operator-profile`) is asked directly. The validator, the workspace load
// and `aof project show` are driven over a fixture project `P` in a fresh temp directory whose
// global home is another fresh temp directory, named through `AOF_GLOBAL_HOME` — so no run reads or
// writes the real `~/.aof`. One test object per @executable scenario, Scenario Outline rows folded
// into one entry. node:assert/strict, `{ name, run }` shape.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  OPERATOR_LEVELS,
  operatorLevel,
  operatorProfileFromConfig,
  resolveOperatorProfile,
} from "@aof/contracts/operator-profile";

const validateConfig = _aofApplication.assets.configInspect.validateConfig;
const loadWorkspace = _aofApplication.loadWorkspace;
const CHECK_GROUPS = _aofApplication.work.doctor.CHECK_GROUPS;
const { examplesGroup, operatorGroup } = _aofApplication.work.doctorExamples;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");
const ABSENT = Symbol("absent");
const ROLE = "I run the build for a lettings agency. I am a developer, not a property manager.";

// A project `P` whose `work.operator` is `project`, and a global home whose config holds
// `work.operator` = `global` (an object), or the raw text `globalText`, or nothing. 193/03 adds the
// project's `work.examples` (`examples`), and `stream`: milestone 193 with stories 193/01 and 193/03.
async function withProfile({ project = ABSENT, global = ABSENT, globalText = null, examples = ABSENT, stream = false } = {}, body) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-operator-profile-"));
  const projectDir = path.join(root, "P");
  const home = path.join(root, "home");
  try {
    await mkdir(path.join(projectDir, ".aof"), { recursive: true });
    await mkdir(home, { recursive: true });
    const configPath = path.join(projectDir, ".aof", "aof.config.json");
    const work = { dir: "./wiki/work", ...(examples === ABSENT ? {} : { examples }), ...(project === ABSENT ? {} : { operator: project }) };
    await writeFile(configPath, JSON.stringify({ name: "fixture", work }, null, 2), "utf8");
    const workDir = path.join(projectDir, "wiki", "work");
    await mkdir(workDir, { recursive: true });
    if (stream) await writeStream(workDir);
    const globalPath = path.join(home, "aof.config.json");
    if (globalText != null) await writeFile(globalPath, globalText, "utf8");
    else if (global !== ABSENT) await writeFile(globalPath, JSON.stringify({ work: { operator: global } }, null, 2), "utf8");
    const env = { ...process.env, AOF_GLOBAL_HOME: home, NODE_NO_WARNINGS: "1" };
    const cli = (...args) => {
      const result = spawnSync(process.execPath, [cliPath, ...args], { cwd: projectDir, encoding: "utf8", env });
      let json = null;
      try { json = JSON.parse(result.stdout); } catch { json = null; }
      return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "", json };
    };
    await body({
      project: projectDir, home, configPath, globalPath, env, cli, workDir,
      validate: () => validateConfig(projectDir, { env }),
      resolved: async () => operatorProfileFromConfig((await loadWorkspace(projectDir, undefined, { env })).config),
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const profileDiagnostics = (diagnostics) => diagnostics.filter((entry) => entry.code?.startsWith("operator-profile-"));
const at = (diagnostics) => profileDiagnostics(diagnostics).map((entry) => [entry.code, entry.path]);
const levelsOf = (profile) => ({ ...profile.expertise });

// ══ 00_the-operator-states-a-role-and-a-level-per-domain.feature ══
const VALIDATOR_ROWS = [
  ["absent", ABSENT, []],
  ["an empty object", {}, []],
  ["a role only", { role: ROLE }, []],
  ["an expertise map only", { expertise: { fraud: "expert" } }, []],
  ["a string", "developer", [["operator-profile-bad-value", "work.operator"]]],
  ["an array", ["developer"], [["operator-profile-bad-value", "work.operator"]]],
  ["a role of 0 characters", { role: "" }, [["operator-profile-bad-value", "work.operator.role"]]],
  ["a role of 500 characters", { role: "r".repeat(500) }, []],
  ["a role of 501 characters", { role: "r".repeat(501) }, [["operator-profile-bad-value", "work.operator.role"]]],
  ["a role that is a number", { role: 7 }, [["operator-profile-bad-value", "work.operator.role"]]],
  ["an expertise that is a list", { expertise: ["fraud"] }, [["operator-profile-bad-value", "work.operator.expertise"]]],
  ["expertise with the domain \"Tenancy Law\"", { expertise: { "Tenancy Law": "new" } }, [["operator-profile-bad-value", "work.operator.expertise"]]],
  ["expertise with the domain \"tenancy_law\"", { expertise: { tenancy_law: "new" } }, [["operator-profile-bad-value", "work.operator.expertise"]]],
  ["expertise with the domain \"tenancy-law\" at \"Expert\"", { expertise: { "tenancy-law": "Expert" } }, [["operator-profile-bad-value", "work.operator.expertise.tenancy-law"]]],
];

const statesTests = [
  {
    name: "examples/193-02 00 E1 · a role and two levels validate clean and resolve as written",
    run: () => withProfile({ project: { role: ROLE, expertise: { "property-management": "working", "tenancy-law": "new" } } }, async (fx) => {
      const validated = fx.cli("project", "validate", "--json");
      assert.deepEqual(profileDiagnostics(validated.json?.diagnostics ?? []), [], validated.stdout || validated.stderr);
      assert.deepEqual(await fx.resolved(), { declared: true, role: ROLE, expertise: { "property-management": "working", "tenancy-law": "new" } });
    }),
  },
  {
    name: "examples/193-02 00 E2 · a level outside the three is refused, and resolves as new",
    run: () => withProfile({ project: { expertise: { "tenancy-law": "beginner" } } }, async (fx) => {
      const [entry, ...rest] = profileDiagnostics(fx.cli("project", "validate", "--json").json?.diagnostics ?? []);
      assert.deepEqual(rest, []);
      assert.deepEqual([entry.code, entry.path, entry.severity], ["operator-profile-bad-value", "work.operator.expertise.tenancy-law", "error"]);
      for (const level of OPERATOR_LEVELS) assert.ok(entry.message.includes(`"${level}"`), `names ${level}: ${entry.message}`);
      assert.equal(operatorLevel(await fx.resolved(), "tenancy-law"), "new");
    }),
  },
  {
    name: "examples/193-02 00 E3 · a misspelt key is refused, not ignored",
    run: () => withProfile({ project: { rol: ROLE } }, async (fx) => {
      const diagnosed = profileDiagnostics(fx.cli("project", "validate", "--json").json?.diagnostics ?? []);
      assert.deepEqual(diagnosed.map((entry) => [entry.code, entry.path]), [["operator-profile-unknown-key", "work.operator.rol"]]);
      assert.ok(diagnosed[0].message.includes("\"role\"") && diagnosed[0].message.includes("\"expertise\""), diagnosed[0].message);
    }),
  },
  {
    name: "examples/193-02 00 the levels are three words, exported once",
    run: () => {
      assert.deepEqual(OPERATOR_LEVELS, ["expert", "working", "new"]);
      assert.ok(Object.isFrozen(OPERATOR_LEVELS));
    },
  },
  {
    name: "examples/193-02 00 what the validator admits (outline: 14 blocks)",
    run: async () => {
      for (const [label, block, expected] of VALIDATOR_ROWS) {
        await withProfile({ project: block }, async (fx) => {
          const diagnostics = await fx.validate();
          assert.deepEqual(at(diagnostics), expected, label);
          for (const entry of profileDiagnostics(diagnostics)) assert.equal(entry.severity, "error", label);
        });
      }
    },
  },
  {
    name: "examples/193-02 00 the resolver never throws, and reads a bad value the safe way (outline: 4 blocks)",
    run: () => {
      const rows = [
        ["a string", "developer", { declared: false, role: null, expertise: {} }],
        ["a role that is a number", { role: 7 }, { declared: false, role: null, expertise: {} }],
        ["expertise \"fraud: expert, law: guru\"", { expertise: { fraud: "expert", law: "guru" } }, { declared: true, role: null, expertise: { fraud: "expert", law: "new" } }],
        ["expertise that is a list", { expertise: ["fraud"] }, { declared: false, role: null, expertise: {} }],
      ];
      for (const [label, block, profile] of rows) {
        assert.doesNotThrow(() => operatorProfileFromConfig({ work: { operator: block } }), label);
        assert.deepEqual(operatorProfileFromConfig({ work: { operator: block } }), profile, label);
      }
      for (const config of [undefined, null, 42, {}, { work: null }, { work: "x" }, { work: { operator: null } }]) {
        assert.deepEqual(operatorProfileFromConfig(config), { declared: false, role: null, expertise: {} }, JSON.stringify(config));
      }
    },
  },
  {
    name: "examples/193-02 00 the schema describes the block the validator admits",
    run: async () => {
      const schema = JSON.parse(await readFile(path.join(repoRoot, "schemas", "aof.schema.json"), "utf8"));
      const operator = schema.$defs.work.properties.operator;
      assert.ok(operator, "$defs.work.properties.operator exists");
      assert.equal(operator.type, "object");
      assert.equal(operator.additionalProperties, false);
      assert.deepEqual(Object.keys(operator.properties), ["role", "expertise"]);
      assert.deepEqual([operator.properties.role.type, operator.properties.role.maxLength], ["string", 500]);
      assert.equal(operator.properties.expertise.type, "object");
      assert.deepEqual(operator.properties.expertise.additionalProperties.enum, ["expert", "working", "new"]);
      assert.match(operator.description, /global config/i, "the description names the machine-wide default");
      assert.match(operator.description, /project overrides it/i, "and that a project overrides it");
    },
  },
  {
    name: "examples/193-02 00 the global file is held to the same rules",
    run: () => withProfile({ global: { expertise: { fraud: "guru" } } }, async (fx) => {
      const validated = fx.cli("assets", "validate", "--global", "--json");
      assert.deepEqual(at(validated.json?.diagnostics ?? []), [["operator-profile-bad-value", "work.operator.expertise.fraud"]], validated.stdout || validated.stderr);
    }),
  },
];

// ══ 01_a-project-overrides-the-machine-wide-default.feature ══
const GLOBAL = Object.freeze({ role: "A", expertise: { fraud: "expert", "tenancy-law": "new" } });

const overridesTests = [
  {
    name: "examples/193-02 01 E4 · a project corrects one level and keeps the rest",
    run: () => withProfile({ global: GLOBAL, project: { expertise: { "tenancy-law": "working" } } }, async (fx) => {
      const profile = await fx.resolved();
      assert.equal(profile.role, "A");
      assert.deepEqual(levelsOf(profile), { fraud: "expert", "tenancy-law": "working" });
    }),
  },
  {
    name: "examples/193-02 01 E5 · a project states its own role and keeps the machine's levels",
    run: () => withProfile({ global: GLOBAL, project: { role: "B" } }, async (fx) => {
      const profile = await fx.resolved();
      assert.equal(profile.role, "B");
      assert.deepEqual(levelsOf(profile), { fraud: "expert", "tenancy-law": "new" });
    }),
  },
  {
    name: "examples/193-02 01 E6 · project show answers the resolved profile and where each value came from",
    run: () => withProfile({ global: GLOBAL, project: { expertise: { "tenancy-law": "working" } } }, async (fx) => {
      const shown = fx.cli("project", "show", "--json");
      assert.deepEqual(shown.json?.operator, {
        declared: true,
        role: "A",
        roleSource: "global",
        expertise: [{ domain: "fraud", level: "expert", source: "global" }, { domain: "tenancy-law", level: "working", source: "project" }],
      }, shown.stdout || shown.stderr);
    }),
  },
  {
    name: "examples/193-02 01 each key is merged on its own (outline: 5 projects)",
    run: async () => {
      const rows = [
        ["absent", ABSENT, "A", { fraud: "expert", "tenancy-law": "new" }],
        ["an empty object", {}, "A", { fraud: "expert", "tenancy-law": "new" }],
        ["the role \"B\" and \"fraud: new\"", { role: "B", expertise: { fraud: "new" } }, "B", { fraud: "new", "tenancy-law": "new" }],
        ["the expertise \"credit-risk: working\"", { expertise: { "credit-risk": "working" } }, "A", { fraud: "expert", "tenancy-law": "new", "credit-risk": "working" }],
        ["an empty expertise map", { expertise: {} }, "A", { fraud: "expert", "tenancy-law": "new" }],
      ];
      for (const [label, project, role, levels] of rows) {
        await withProfile({ global: GLOBAL, project }, async (fx) => {
          const loaded = await fx.resolved();
          assert.deepEqual([loaded.role, levelsOf(loaded)], [role, levels], `${label}: the loaded workspace`);
          const shown = fx.cli("project", "show", "--json").json?.operator;
          assert.deepEqual([shown.role, Object.fromEntries(shown.expertise.map((entry) => [entry.domain, entry.level]))], [role, levels], `${label}: project show agrees`);
        });
      }
    },
  },
  {
    name: "examples/193-02 01 a project with no global file resolves from its own block alone",
    run: () => withProfile({ project: { role: "B" } }, async (fx) => {
      const operator = fx.cli("project", "show", "--json").json?.operator;
      assert.deepEqual([operator.role, operator.roleSource], ["B", "project"]);
    }),
  },
  {
    name: "examples/193-02 01 an unreadable global file never breaks a project",
    run: () => withProfile({ globalText: "{ not json", project: { role: "B" } }, async (fx) => {
      assert.equal((await fx.resolved()).role, "B");
      assert.equal(fx.cli("project", "show", "--json").json?.operator?.role, "B");
    }),
  },
  {
    name: "examples/193-02 01 the merge is in memory and is never written back",
    run: () => withProfile({ global: GLOBAL, project: { expertise: { "tenancy-law": "working" } } }, async (fx) => {
      const before = [await readFile(fx.configPath), await readFile(fx.globalPath)];
      await fx.resolved();
      assert.equal(fx.cli("project", "show", "--json").status, 0);
      const after = [await readFile(fx.configPath), await readFile(fx.globalPath)];
      assert.ok(after[0].equals(before[0]), "the project's config file is byte-for-byte what it was");
      assert.ok(after[1].equals(before[1]), "the global config file is byte-for-byte what it was");
    }),
  },
  {
    name: "examples/193-02 01 project show names the profile in its text face",
    run: async () => {
      await withProfile({ global: GLOBAL, project: { expertise: { "credit-risk": "working" } } }, async (fx) => {
        const lines = fx.cli("project", "show").stdout.split("\n").filter((line) => line.startsWith("operator:"));
        assert.deepEqual(lines, ["operator: declared, 3 domains"]);
      });
      await withProfile({}, async (fx) => {
        assert.deepEqual(fx.cli("project", "show").stdout.split("\n").filter((line) => line.startsWith("operator:")), ["operator: not declared"]);
      });
    },
  },
];

// ══ 02_a-domain-nobody-listed-is-new.feature ══
const unlistedTests = [
  {
    name: "examples/193-02 02 E7 · an unlisted domain is new",
    run: () => {
      const profile = resolveOperatorProfile({ expertise: { fraud: "expert" } });
      assert.equal(operatorLevel(profile, "tenancy-law"), "new");
      assert.equal(operatorLevel(profile, "fraud"), "expert");
    },
  },
  {
    name: "examples/193-02 02 E8 · with no profile anywhere, every domain is new and nothing is refused",
    run: () => withProfile({}, async (fx) => {
      const validated = fx.cli("project", "validate", "--json");
      assert.deepEqual(profileDiagnostics(validated.json?.diagnostics ?? []), []);
      assert.equal(validated.status, 0, validated.stdout || validated.stderr);
      const shown = fx.cli("project", "show", "--json");
      assert.equal(shown.status, 0, shown.stderr);
      assert.deepEqual(shown.json?.operator, { declared: false, role: null, roleSource: null, expertise: [] });
      const profile = await fx.resolved();
      for (const domain of ["fraud", "tenancy-law", "anything-at-all"]) assert.equal(operatorLevel(profile, domain), "new", domain);
    }),
  },
  {
    name: "examples/193-02 02 declared means the profile says something (outline: 6 blocks)",
    run: async () => {
      const rows = [
        ["no block in either file", {}, false],
        ["an empty object", { project: {} }, false],
        ["an empty expertise map only", { project: { expertise: {} } }, false],
        ["a role only", { project: { role: "B" } }, true],
        ["one expertise entry and no role", { project: { expertise: { fraud: "working" } } }, true],
        ["a role only, in the global file", { global: { role: "A" } }, true],
      ];
      for (const [label, files, declared] of rows) {
        await withProfile(files, async (fx) => {
          assert.equal((await fx.resolved()).declared, declared, `${label}: the loaded workspace`);
          assert.equal(fx.cli("project", "show", "--json").json?.operator?.declared, declared, `${label}: project show`);
        });
      }
    },
  },
  {
    name: "examples/193-02 02 a level is looked up by the exact slug (outline: 4 asks)",
    run: () => {
      const profile = resolveOperatorProfile({ expertise: { "tenancy-law": "working" } });
      for (const [asked, level] of [["tenancy-law", "working"], ["Tenancy-Law", "new"], ["tenancy", "new"], ["", "new"]]) {
        assert.equal(operatorLevel(profile, asked), level, JSON.stringify(asked));
      }
      for (const odd of [undefined, null, 42]) assert.equal(operatorLevel(profile, odd), "new", String(odd));
      assert.equal(operatorLevel(undefined, "fraud"), "new", "no profile at all");
    },
  },
];

// ══ 193/03 · 02_the-doctor-says-once-that-no-profile-is-declared.feature ══
const ON = Object.freeze({ enabled: true, operatorAware: true });
const UNDECLARED = "operator-profile-undeclared";
const MILESTONE_DIR = "193_milestone_operator-aware";
const record = (type, number, slug, extra = "") => `---\ntype: ${type}\nnumber: ${number}\nslug: ${slug}\ntitle: ${slug}\n${extra}status: in-progress\ncreated: 2026-11-12\nupdated: 2026-11-15\nschema: 1\n---\n# ${number} · ${slug}\n`;
async function writeStream(workDir) {
  const milestone = path.join(workDir, MILESTONE_DIR);
  await mkdir(milestone, { recursive: true });
  await writeFile(path.join(milestone, "SPEC.md"), record("milestone", "193", "operator-aware"), "utf8");
  for (const [number, slug] of [["01", "the-gate"], ["03", "the-switch"]]) {
    const dir = path.join(milestone, "stories", `${number}_story_${slug}`);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "STORY.md"), record("story", number, slug, "parent: 193\ndepends: []\n"), "utf8");
  }
}
const undeclaredOf = (json) => (json?.findings ?? []).filter((finding) => finding.code === UNDECLARED);
const doctorOf = (fx, ...scope) => {
  const ran = fx.cli("work", "doctor", ...scope, "--json");
  assert.ok(ran.json, `doctor ${scope.join(" ")} answered JSON: ${ran.stdout || ran.stderr}`);
  return ran.json;
};

const doctorTests = [
  {
    name: "examples/193-03 02 E7 · the switch on and no profile: one warning that names the fix",
    run: () => withProfile({ examples: ON, stream: true }, async (fx) => {
      const found = undeclaredOf(doctorOf(fx, "193/03"));
      assert.equal(found.length, 1, JSON.stringify(found));
      assert.deepEqual([found[0].severity, found[0].path], ["warn", "wiki/work"], "a warning anchored at the work directory");
      assert.match(found[0].message, /every domain is being treated as new/);
      assert.ok(found[0].message.includes("aof work init-config --operator-role"), found[0].message);
    }),
  },
  {
    name: "examples/193-03 02 E8 · once a role is declared, the warning is gone",
    run: () => withProfile({ examples: ON, stream: true }, async (fx) => {
      const declared = fx.cli("work", "init-config", "--operator-role", "B");
      assert.equal(declared.status, 0, declared.stdout || declared.stderr);
      assert.deepEqual(undeclaredOf(doctorOf(fx)), []);
    }),
  },
  {
    name: "examples/193-03 02 E9 · with the switch off, there is no warning (outline: 5 settings)",
    run: async () => {
      for (const examples of [ABSENT, { enabled: false }, { enabled: true }, { enabled: true, operatorAware: false }, { enabled: false, operatorAware: true }]) {
        await withProfile({ examples, stream: true }, async (fx) => {
          assert.deepEqual(undeclaredOf(doctorOf(fx)), [], String(examples === ABSENT ? "absent" : JSON.stringify(examples)));
        });
      }
    },
  },
  {
    name: "examples/193-03 02 the warning is reported once, whatever is asked (outline: 5 scopes)",
    run: () => withProfile({ examples: ON, stream: true }, async (fx) => {
      for (const scope of [[], ["193"], ["193/01"], ["193/03"], ["999"]]) {
        assert.equal(undeclaredOf(doctorOf(fx, ...scope)).length, 1, `scope ${scope.join("") || "none"}`);
      }
    }),
  },
  {
    name: "examples/193-03 02 a profile declared anywhere is a profile (outline: 4 declarations)",
    run: async () => {
      const rows = [
        ["the global config holds a role", { global: { role: "A" } }, 0],
        ["the project holds one expertise entry and no role", { project: { expertise: { fraud: "working" } } }, 0],
        ["the project's work.operator is an empty object", { project: {} }, 1],
        ["the project's work.operator is a string", { project: "developer" }, 1],
      ];
      for (const [label, files, reported] of rows) {
        await withProfile({ ...files, examples: ON, stream: true }, async (fx) => {
          assert.equal(undeclaredOf(doctorOf(fx)).length, reported, label);
        });
      }
    },
  },
  {
    name: "examples/193-03 02 the warning does not stop refine's Contract stage",
    run: () => withProfile({ examples: ON, stream: true }, async (fx) => {
      const story = path.join(fx.workDir, MILESTONE_DIR, "stories", "01_story_the-gate");
      await writeFile(path.join(story, "EXAMPLES.md"), "# 193/01 · the map\n## R1 · rule 1\n- E1 · example 1 [proposed]\n", "utf8");
      const json = doctorOf(fx, "193/01");
      assert.equal(undeclaredOf(json).length, 1, "the warning is there");
      assert.deepEqual(json.findings.filter((finding) => finding.code.startsWith("example-") && finding.severity === "error"), []);
      const door = fx.cli("work", "continue", "193/01", "--json");
      assert.ok(!String(door.json?.code ?? "").startsWith("examples-"), `not refused for the map: ${door.stdout || door.stderr}`);
    }),
  },
  {
    name: "examples/193-03 02 the lane is its own check group",
    run: async () => {
      const examplesAt = CHECK_GROUPS.indexOf(examplesGroup);
      assert.ok(examplesAt >= 0, "the examples lane is a check group");
      assert.ok(CHECK_GROUPS.indexOf(operatorGroup) > examplesAt, "the operator lane comes after the examples lane");
      const lane = await readFile(path.join(repoRoot, "packages", "specification-by-example", "src", "doctor-lane.mjs"), "utf8");
      assert.ok(!lane.includes("operator-profile-"), "doctor-lane.mjs names no operator code");
    },
  },
];

// ══ 193/03 · 03_the-update-says-it-too.feature ══
// `aof work update` in a scratch repo `aof work init` rendered, under the fixture's isolated home.
async function withRendered(options, body) {
  return withProfile(options, async (fx) => {
    const config = JSON.parse(await readFile(fx.configPath, "utf8"));
    const rendered = fx.cli("work", "init");
    assert.equal(rendered.status, 0, rendered.stdout || rendered.stderr);
    // `work init` may write the config; the fixture's own keys are put back over whatever it wrote.
    const after = JSON.parse(await readFile(fx.configPath, "utf8"));
    await writeFile(fx.configPath, `${JSON.stringify({ ...after, ...config, work: { ...(after.work ?? {}), ...config.work } }, null, 2)}\n`, "utf8");
    return body(fx);
  });
}
const operatorLines = (text) => text.split("\n").filter((line) => line.includes("operator-profile-"));
async function treeOf(root) {
  const out = {};
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else {
        const info = await stat(full);
        out[path.relative(root, full)] = `${info.size}:${info.mtimeMs}`;
      }
    }
  };
  await walk(root);
  return out;
}

const updateTests = [
  {
    name: "examples/193-03 03 E10 · the update ends with the doctor's line",
    run: () => withRendered({ examples: ON }, async (fx) => {
      const { stdout, status } = fx.cli("work", "update");
      assert.equal(status, 0, stdout);
      const lines = stdout.split("\n");
      const summary = lines.findIndex((line) => line.startsWith("Updated ACD:"));
      assert.ok(summary >= 0, stdout);
      const found = lines.slice(summary + 1).filter((line) => line.includes(UNDECLARED));
      assert.equal(found.length, 1, stdout);
      assert.deepEqual(operatorLines(stdout), found, "nothing names it before the Updated ACD line");
      assert.ok(found[0].includes("aof work init-config --operator-role"), found[0]);
    }),
  },
  {
    name: "examples/193-03 03 the update and the doctor say the same thing",
    run: () => withRendered({ examples: ON }, async (fx) => {
      const updated = fx.cli("work", "update", "--json").json;
      const [finding] = undeclaredOf(doctorOf(fx));
      assert.deepEqual(updated?.operatorProfile?.map(({ code, message }) => ({ code, message })), [{ code: finding.code, message: finding.message }]);
    }),
  },
  {
    name: "examples/193-03 03 the dry run prints the same line and writes nothing",
    run: () => withRendered({ examples: ON }, async (fx) => {
      const before = await treeOf(fx.project);
      const { stdout } = fx.cli("work", "update", "--dry-run");
      assert.equal(operatorLines(stdout).filter((line) => line.includes(UNDECLARED)).length, 1, stdout);
      assert.deepEqual(await treeOf(fx.project), before, "no file is written");
    }),
  },
  {
    name: "examples/193-03 03 nothing to say prints nothing (outline: 4 states)",
    run: async () => {
      const rows = [
        ["discovery is on, the switch is off, and no profile is declared", { examples: { enabled: true } }],
        ["work.examples is absent", {}],
        ["operator-aware discovery is on and the project declares a role", { examples: ON, project: { role: "B" } }],
        ["operator-aware discovery is on and only the global config declares a role", { examples: ON, global: { role: "A" } }],
      ];
      for (const [label, options] of rows) {
        await withRendered(options, async (fx) => {
          assert.deepEqual(fx.cli("work", "update", "--json").json?.operatorProfile, [], label);
          assert.deepEqual(operatorLines(fx.cli("work", "update").stdout), [], label);
        });
      }
    },
  },
  {
    name: "examples/193-03 03 the line follows the test-layout lines, and neither hides the other",
    run: () => withRendered({ examples: ON }, async (fx) => {
      // A pre-190 test declaration over a tracked suite it does not cover owes `test-layout-suites` (190/04).
      const config = JSON.parse(await readFile(fx.configPath, "utf8"));
      config.work.test = { command: "node", args: ["scripts/test.mjs"], selectArgs: ["--only", "{file}"], roots: ["test"], deadlineMs: 60_000, report: { format: "tap" }, gate: { args: ["scripts/test-sharded.mjs"], jobsArgs: ["--jobs", "{jobs}"] } };
      await writeFile(fx.configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
      const suite = "packages/work/test/a.suite.mjs";
      await mkdir(path.join(fx.project, path.dirname(suite)), { recursive: true });
      await writeFile(path.join(fx.project, suite), "// fixture\n", "utf8");
      for (const args of [["init", "-q"], ["add", "--", suite]]) assert.equal(spawnSync("git", args, { cwd: fx.project, encoding: "utf8" }).status, 0);
      const lines = fx.cli("work", "update").stdout.split("\n");
      const layout = lines.findIndex((line) => line.includes("test-layout-suites"));
      const operator = lines.findIndex((line) => line.includes(UNDECLARED));
      assert.ok(layout >= 0, lines.join("\n"));
      assert.ok(operator > layout, "the operator line follows the test-layout lines");
    }),
  },
];

export const operatorProfileTests = [...statesTests, ...overridesTests, ...unlistedTests, ...doctorTests, ...updateTests];
